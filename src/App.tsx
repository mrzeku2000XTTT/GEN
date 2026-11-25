/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from './engine/GameEngine';
import { BIRTH_STEPS, BirthSceneStep } from './engine/birthSequence';
import {
  applyConversationOutcome,
  applyOfflineCatchUp,
  cancelAutonomousObjective,
  completeJobShift,
  createInitialWorldState,
  deployHelperAgent,
  formatSimTime,
  purchaseLandParcel,
  purchaseShopItem,
  restUntilNextMorning,
  retrieveRelevantMemories,
  startAutonomousObjective,
} from './sim/behaviorEngine';
import { clearSavedWorldState, loadWorldState, saveWorldState } from './sim/persistence';
import { GamePhase, HudSnapshot, ORIGINS, OriginId, WorldState } from './sim/types';
import { getBuildingById, getLocationNameAt } from './sim/worldLayout';
import { TitleOverlay } from './components/TitleOverlay';
import { BirthOverlay } from './components/BirthOverlay';
import { PlayingHud } from './components/PlayingHud';
import { ConversationModal } from './components/ConversationModal';
import { PlaceModal } from './components/PlaceModal';
import { SystemsModal } from './components/SystemsModal';
import { PauseModal } from './components/PauseModal';

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const worldRef = useRef<WorldState>(createInitialWorldState('kaspa'));

  const [phase, setPhase] = useState<GamePhase>('title');
  const [selectedOrigin, setSelectedOrigin] = useState<OriginId>('kaspa');
  const [hasSavedWorld, setHasSavedWorld] = useState(false);
  const [savedWorldSummary, setSavedWorldSummary] = useState<string | null>(null);

  const [birthStep, setBirthStep] = useState<BirthSceneStep>(BIRTH_STEPS[0]);
  const [birthProgress, setBirthProgress] = useState(0);

  const [hud, setHud] = useState<HudSnapshot>(() => ({
    day: 1,
    timeFormatted: '08:15 AM',
    locationName: 'Alder Creek Central Park',
    weather: 'clear',
    balance: 60,
    energy: 100,
    origin: 'kaspa',
    currentObjective: worldRef.current.player.currentObjective,
    cameraMode: 'third',
    playerX: 0,
    playerZ: 16,
    playerYaw: 0,
    nearbyPrompt: null,
    autonomousFlow: { active: false, stage: 'IDLE', objectiveLabel: '', latestLog: '' },
    minimapNpcs: [],
    fps: 60,
  }));

  // Active modals & UI revision counter for React views inspecting worldRef
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [activeBuildingId, setActiveBuildingId] = useState<string | null>(null);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [uiTick, setUiTick] = useState(0);

  const [isChatSending, setIsChatSending] = useState(false);
  const [pendingPlayerMessage, setPendingPlayerMessage] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatAbortRef = useRef<AbortController | null>(null);
  const [placeFeedback, setPlaceFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [systemsBanner, setSystemsBanner] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const toastTimerRef = useRef<number | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMessage(null), 4200);
  }, []);

  const bumpUi = useCallback(() => setUiTick((t) => t + 1), []);

  // Mirror game phase to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  // Keep engine informed of modal open state
  useEffect(() => {
    const anyModal = Boolean(activeNpcId || activeBuildingId || systemsOpen);
    engineRef.current?.setModalOpen(anyModal);
  }, [activeNpcId, activeBuildingId, systemsOpen]);

  // Ref-wrapped callbacks so GameEngine mounts ONCE and never resets on HUD updates
  const callbacksRef = useRef({
    onHudUpdate: (snapshot: HudSnapshot) => setHud(snapshot),
    onBirthStep: (step: BirthSceneStep, progress: number) => {
      setBirthStep(step);
      setBirthProgress(progress);
    },
    onBirthComplete: () => {
      setPhase('playing');
      engineRef.current?.setPhase('playing');
      showToast('Sensory presence online. Explore Alder Creek or press E near a resident.');
    },
    onInteract: (target: { type: 'npc' | 'building'; id: string }) => {
      if (target.type === 'npc') {
        const npc = worldRef.current.npcs.find((n) => n.id === target.id);
        if (npc) {
          chatAbortRef.current?.abort();
          npc.inConversation = true;
          setChatError(null);
          setPendingPlayerMessage(null);
          setLastFailedMessage(null);
          setIsChatSending(false);
          setActiveBuildingId(null);
          setSystemsOpen(false);
          setActiveNpcId(npc.id);
          bumpUi();
        }
      } else {
        setPlaceFeedback(null);
        setActiveNpcId(null);
        setSystemsOpen(false);
        setActiveBuildingId(target.id);
        bumpUi();
      }
    },
    onToggleSystems: () => {
      setActiveNpcId(null);
      setActiveBuildingId(null);
      setSystemsBanner(null);
      setSystemsOpen((prev) => !prev);
      bumpUi();
    },
    onTogglePause: () => {
      setPhase((prev) => {
        const next: GamePhase = prev === 'playing' ? 'paused' : 'playing';
        engineRef.current?.setPhase(next);
        return next;
      });
    },
    onCameraModeChanged: (mode: 'third' | 'first') => {
      showToast(mode === 'first' ? 'First-person perspective' : 'Third-person perspective');
      bumpUi();
    },
  });

  // Mount Three.js engine once + check saved world & ?autostart=1
  useEffect(() => {
    const mountEl = canvasMountRef.current;
    if (!mountEl) return;

    const engine = new GameEngine(mountEl, worldRef.current, {
      onHudUpdate: (s) => callbacksRef.current.onHudUpdate(s),
      onBirthStep: (step, prog) => callbacksRef.current.onBirthStep(step, prog),
      onBirthComplete: () => callbacksRef.current.onBirthComplete(),
      onInteract: (t) => callbacksRef.current.onInteract(t),
      onToggleSystems: () => callbacksRef.current.onToggleSystems(),
      onTogglePause: () => callbacksRef.current.onTogglePause(),
      onCameraModeChanged: (m) => callbacksRef.current.onCameraModeChanged(m),
    });
    engineRef.current = engine;

    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart') === '1';

    loadWorldState().then((saved) => {
      if (saved) {
        setHasSavedWorld(true);
        setSavedWorldSummary(
          `Saved: ${ORIGINS[saved.player.origin].name} · Day ${saved.day}, ${formatSimTime(
            saved.minuteOfDay
          )} · ₵${Math.round(saved.player.balance)}`
        );
      }

      if (autostart) {
        if (saved) {
          const catchUp = applyOfflineCatchUp(saved, Date.now());
          worldRef.current = saved;
          engine.setWorldState(saved);
          if (catchUp) showToast(catchUp);
        }
        setPhase('playing');
        engine.setPhase('playing');
        bumpUi();
      }
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [bumpUi, showToast]);

  // Handlers
  const handleSelectOrigin = useCallback((origin: OriginId) => {
    setSelectedOrigin(origin);
    engineRef.current?.setOriginPreview(origin);
  }, []);

  const handleStartNew = useCallback(
    (skipBirth: boolean) => {
      const fresh = createInitialWorldState(selectedOrigin);
      worldRef.current = fresh;
      engineRef.current?.setWorldState(fresh);
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      if (skipBirth) {
        setPhase('playing');
        engineRef.current?.setPhase('playing');
      } else {
        setBirthStep(BIRTH_STEPS[0]);
        setBirthProgress(0);
        setPhase('birth');
        engineRef.current?.setPhase('birth');
      }
      bumpUi();
    },
    [selectedOrigin, bumpUi]
  );

  const handleContinueSaved = useCallback(async () => {
    const saved = await loadWorldState();
    if (!saved) {
      handleStartNew(true);
      return;
    }
    const catchUp = applyOfflineCatchUp(saved, Date.now());
    worldRef.current = saved;
    setSelectedOrigin(saved.player.origin);
    engineRef.current?.setWorldState(saved);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setPhase('playing');
    engineRef.current?.setPhase('playing');
    bumpUi();
    showToast(catchUp ?? `Recovered saved world — Day ${saved.day}.`);
  }, [bumpUi, handleStartNew, showToast]);

  const handleSkipBirth = useCallback(() => {
    setPhase('playing');
    engineRef.current?.setPhase('playing');
    showToast('Awakened in Alder Creek Plaza. Approach Maya Lin and press E.');
  }, [showToast]);

  const handleCloseNpcModal = useCallback(() => {
    chatAbortRef.current?.abort();
    chatAbortRef.current = null;
    if (activeNpcId) {
      const npc = worldRef.current.npcs.find((n) => n.id === activeNpcId);
      if (npc) npc.inConversation = false;
    }
    engineRef.current?.setSpeakingNpc(null);
    setActiveNpcId(null);
    setIsChatSending(false);
    setPendingPlayerMessage(null);
    setLastFailedMessage(null);
    setChatError(null);
    bumpUi();
  }, [activeNpcId, bumpUi]);

  const handleSendNpcMessage = useCallback(
    async (text: string) => {
      if (!activeNpcId) return;
      const world = worldRef.current;
      const npc = world.npcs.find((n) => n.id === activeNpcId);
      if (!npc) return;

      chatAbortRef.current?.abort();
      const controller = new AbortController();
      chatAbortRef.current = controller;
      let timedOut = false;
      const timeoutId = window.setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, 35000);

      setIsChatSending(true);
      setPendingPlayerMessage(text);
      setLastFailedMessage(null);
      setChatError(null);
      engineRef.current?.setSpeakingNpc(npc.id);

      const relevantMemories = retrieveRelevantMemories(npc, text, world.day, 6);
      const history = (world.conversations[npc.id] ?? []).slice(-8).map((line) => ({
        speaker: line.speaker,
        text: line.text,
      }));

      const payload = JSON.stringify({
        playerMessage: text,
        npc: {
          name: npc.name,
          age: npc.age,
          occupation: npc.occupation,
          mood: npc.mood,
          currentActivity: npc.currentActivity,
          location: getLocationNameAt(npc.x, npc.z),
          goals: npc.goals,
          beliefs: npc.beliefs,
          traits: npc.traits,
          relationship: npc.relationship,
        },
        context: {
          day: world.day,
          timeFormatted: formatSimTime(world.minuteOfDay),
          weather: world.weather,
        },
        memories: relevantMemories.map((m) => ({
          event: m.event,
          day: m.day,
          location: m.location,
          significance: m.emotionalSignificance,
        })),
        history,
      });

      const postChatOnce = async () => {
        const res = await fetch('/api/npc/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          signal: controller.signal,
          body: payload,
        });
        const contentType = res.headers.get('content-type') || '';
        const rawBody = await res.text();
        let parsed: Record<string, unknown> | null = null;
        if (contentType.includes('application/json') || rawBody.trim().startsWith('{')) {
          try {
            parsed = JSON.parse(rawBody) as Record<string, unknown>;
          } catch {
            parsed = null;
          }
        }
        return { res, parsed, isHtml: rawBody.trim().toLowerCase().startsWith('<!doctype') || rawBody.trim().startsWith('<html') };
      };

      try {
        let attempt = await postChatOnce();

        // If a proxy/gateway returned a transient HTML page or 502/503/504, retry once cleanly.
        const isTransientProxy =
          !attempt.parsed ||
          attempt.isHtml ||
          attempt.res.status === 502 ||
          attempt.res.status === 503 ||
          attempt.res.status === 504;

        if (isTransientProxy && !controller.signal.aborted) {
          await new Promise((r) => window.setTimeout(r, 700));
          if (!controller.signal.aborted) {
            attempt = await postChatOnce();
          }
        }

        if (!attempt.parsed) {
          throw new Error(
            'The dialogue server was momentarily reconnecting. Click Retry to send your message.'
          );
        }

        const data = attempt.parsed;
        if (!attempt.res.ok) {
          throw new Error(
            typeof data.error === 'string' && data.error.trim()
              ? data.error
              : `Conversation service returned status ${attempt.res.status}.`
          );
        }

        const savedMem = applyConversationOutcome(world, npc.id, text, {
          reply: String(data.reply ?? ''),
          mood: String(data.mood ?? npc.mood),
          trustDelta: Number(data.trustDelta ?? 2),
          memorySummary: String(data.memorySummary ?? ''),
          emotionalSignificance: Number(data.emotionalSignificance ?? 0.45),
          gesture: String(data.gesture ?? 'nod'),
          jobHint: String(data.jobHint ?? ''),
        });

        engineRef.current?.playUiChime(580);
        engineRef.current?.speakNpc(String(data.reply ?? ''));
        saveWorldState(world);
        bumpUi();

        if (savedMem) {
          showToast(`${npc.name} formed a persistent memory of this conversation.`);
        }
        if (Boolean(data.endedConversation)) {
          showToast(`${npc.name} wrapped up the conversation to continue their day.`);
        }
      } catch (err) {
        if (controller.signal.aborted && !timedOut) {
          return;
        }
        setLastFailedMessage(text);
        setChatError(
          timedOut
            ? `${npc.name} took too long to respond. Click Retry to send your message again.`
            : err instanceof Error
              ? err.message
              : 'Unable to reach NPC dialogue service. Please try again.'
        );
      } finally {
        window.clearTimeout(timeoutId);
        if (chatAbortRef.current === controller) {
          chatAbortRef.current = null;
          setIsChatSending(false);
          setPendingPlayerMessage(null);
          window.setTimeout(() => engineRef.current?.setSpeakingNpc(null), 1600);
        }
      }
    },
    [activeNpcId, bumpUi, showToast]
  );

  const handleWorkJob = useCallback(
    (jobId: string) => {
      const res = completeJobShift(worldRef.current, jobId);
      setPlaceFeedback({ ok: res.ok, text: res.message });
      if (res.ok) {
        engineRef.current?.playUiChime(660);
        saveWorldState(worldRef.current);
      }
      bumpUi();
    },
    [bumpUi]
  );

  const handleBuyItem = useCallback(
    (itemId: string) => {
      const res = purchaseShopItem(worldRef.current, itemId);
      setPlaceFeedback({ ok: res.ok, text: res.message });
      if (res.ok) {
        engineRef.current?.playUiChime(540);
        saveWorldState(worldRef.current);
      }
      bumpUi();
    },
    [bumpUi]
  );

  const handleRestNextMorning = useCallback(() => {
    const res = restUntilNextMorning(worldRef.current);
    setPlaceFeedback({ ok: res.ok, text: res.message });
    setSystemsBanner(res.message);
    engineRef.current?.playUiChime(440);
    saveWorldState(worldRef.current);
    showToast(res.message);
    bumpUi();
  }, [bumpUi, showToast]);

  const handleClinicRecharge = useCallback(() => {
    const w = worldRef.current;
    if (w.player.balance < 15) {
      setPlaceFeedback({ ok: false, text: 'Need ₵15 simulated credits for clinic restoration.' });
      return;
    }
    w.player.balance -= 15;
    w.player.energy = 100;
    setPlaceFeedback({ ok: true, text: 'Avatar stamina restored to 100% (-₵15).' });
    engineRef.current?.playUiChime(600);
    saveWorldState(w);
    bumpUi();
  }, [bumpUi]);

  const handleQuickSave = useCallback(async () => {
    const ok = await saveWorldState(worldRef.current);
    if (ok) {
      setHasSavedWorld(true);
      setSavedWorldSummary(
        `Saved: ${ORIGINS[worldRef.current.player.origin].name} · Day ${
          worldRef.current.day
        }, ${formatSimTime(worldRef.current.minuteOfDay)} · ₵${Math.round(
          worldRef.current.player.balance
        )}`
      );
      engineRef.current?.playUiChime(560);
      showToast('World state saved locally (IndexedDB).');
      setSystemsBanner('World state saved cleanly.');
    } else {
      showToast('Unable to save world state in browser storage.');
    }
  }, [showToast]);

  const handleStartAutonomous = useCallback(
    (objectiveId: string) => {
      const ok = startAutonomousObjective(worldRef.current, objectiveId);
      if (ok) {
        setSystemsOpen(false);
        showToast('Autonomous Computational Flow engaged. Press WASD anytime to take over.');
        bumpUi();
      }
    },
    [bumpUi, showToast]
  );

  const handleNavigateToNpc = useCallback(
    (npcId: string) => {
      const npc = worldRef.current.npcs.find((n) => n.id === npcId);
      if (!npc) return;
      worldRef.current.player.autonomousFlow = {
        active: true,
        objectiveId: 'auto_meet_npc_dynamic',
        objectiveLabel: `Locate and approach ${npc.name}`,
        stage: 'OBSERVE',
        targetBuildingId: null,
        targetNpcId: npc.id,
        targetX: npc.x,
        targetZ: npc.z,
        log: [`[OBSERVE] Plotting path to ${npc.name} (${npc.currentActivity}).`],
        stageTimer: 0,
      };
      setSystemsOpen(false);
      showToast(`Navigating autonomously to ${npc.name}.`);
      bumpUi();
    },
    [bumpUi, showToast]
  );

  const handleCancelAutonomous = useCallback(() => {
    cancelAutonomousObjective(worldRef.current, 'Cancelled by player.');
    showToast('Autonomous objective cancelled.');
    bumpUi();
  }, [bumpUi, showToast]);

  const handleDeployAgent = useCallback(
    (templateId: string) => {
      const res = deployHelperAgent(worldRef.current, templateId);
      setSystemsBanner(res.message);
      if (res.ok) {
        engineRef.current?.playUiChime(640);
        saveWorldState(worldRef.current);
      }
      bumpUi();
    },
    [bumpUi]
  );

  const handleToggleAgentStatus = useCallback(
    (agentId: string) => {
      const agent = worldRef.current.player.deployedAgents.find((a) => a.id === agentId);
      if (!agent) return;
      agent.status = agent.status === 'active' ? 'paused' : 'active';
      saveWorldState(worldRef.current);
      bumpUi();
    },
    [bumpUi]
  );

  const handlePurchaseLand = useCallback(
    (parcelId: string) => {
      const res = purchaseLandParcel(worldRef.current, parcelId);
      setSystemsBanner(res.message);
      if (res.ok) {
        engineRef.current?.playUiChime(680);
        saveWorldState(worldRef.current);
      }
      bumpUi();
    },
    [bumpUi]
  );

  const handleConnectKaspaTestnet = useCallback(
    (address: string) => {
      if (!address.startsWith('kaspatest:') || address.length < 20) {
        setSystemsBanner(
          'Enter a valid public Kaspa Testnet address starting with "kaspatest:" (never enter private keys or seed phrases).'
        );
        return;
      }
      worldRef.current.player.kaspaTestnet.connected = true;
      worldRef.current.player.kaspaTestnet.address = address;
      setSystemsBanner('Kaspa Testnet-11 public address verified for simulated receipts.');
      saveWorldState(worldRef.current);
      bumpUi();
    },
    [bumpUi]
  );

  const handleRecordKaspaReceipt = useCallback(
    (label: string, amountTkas: number) => {
      const k = worldRef.current.player.kaspaTestnet;
      if (k.simulatedTestnetBalance < amountTkas) {
        setSystemsBanner('Insufficient simulated testnet tKAS balance.');
        return;
      }
      k.simulatedTestnetBalance = Math.round((k.simulatedTestnetBalance - amountTkas) * 100) / 100;
      k.txLog.unshift({
        id: `tx_${Date.now()}`,
        label,
        amountTkas,
        timestamp: `Day ${worldRef.current.day} ${formatSimTime(worldRef.current.minuteOfDay)}`,
        status: 'simulated_local_receipt',
      });
      setSystemsBanner(`Logged local testnet simulation receipt (${amountTkas} tKAS).`);
      saveWorldState(worldRef.current);
      bumpUi();
    },
    [bumpUi]
  );

  const handleUpdateSettings = useCallback(
    (patch: Partial<WorldState['settings']>) => {
      worldRef.current.settings = { ...worldRef.current.settings, ...patch };
      engineRef.current?.applySettings();
      bumpUi();
    },
    [bumpUi]
  );

  const handleResetWorld = useCallback(async () => {
    await clearSavedWorldState();
    setHasSavedWorld(false);
    setSavedWorldSummary(null);
    setSystemsOpen(false);
    setActiveNpcId(null);
    setActiveBuildingId(null);
    const fresh = createInitialWorldState(selectedOrigin);
    worldRef.current = fresh;
    engineRef.current?.setWorldState(fresh);
    setPhase('title');
    engineRef.current?.setPhase('title');
    bumpUi();
  }, [bumpUi, selectedOrigin]);

  // Read live references for open modals (triggered cleanly by uiTick)
  void uiTick;
  const activeNpc = activeNpcId
    ? worldRef.current.npcs.find((n) => n.id === activeNpcId) ?? null
    : null;
  const activeBuilding = activeBuildingId ? getBuildingById(activeBuildingId) ?? null : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-neutral-950">
      {/* Isolated WebGL Canvas Mount — never unmounted on React HUD updates */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {phase === 'title' && (
        <TitleOverlay
          selectedOrigin={selectedOrigin}
          hasSavedWorld={hasSavedWorld}
          savedWorldSummary={savedWorldSummary}
          onSelectOrigin={handleSelectOrigin}
          onStartNew={handleStartNew}
          onContinueSaved={handleContinueSaved}
        />
      )}

      {phase === 'birth' && (
        <BirthOverlay
          step={birthStep}
          progress={birthProgress}
          origin={worldRef.current.player.origin}
          onSkip={handleSkipBirth}
        />
      )}

      {phase === 'playing' && (
        <PlayingHud
          hud={hud}
          muted={worldRef.current.settings.muted}
          toastMessage={toastMessage}
          onToggleCamera={() => engineRef.current?.toggleCameraMode()}
          onOpenSystems={() => {
            setSystemsBanner(null);
            setSystemsOpen(true);
            bumpUi();
          }}
          onQuickSave={handleQuickSave}
          onToggleMute={() =>
            handleUpdateSettings({ muted: !worldRef.current.settings.muted })
          }
          onPause={() => {
            setPhase('paused');
            engineRef.current?.setPhase('paused');
          }}
          onInteractClick={() => engineRef.current?.triggerInteract()}
          onCancelAutonomous={handleCancelAutonomous}
        />
      )}

      {phase === 'playing' && activeNpc && (
        <ConversationModal
          npc={activeNpc}
          origin={worldRef.current.player.origin}
          day={worldRef.current.day}
          timeFormatted={formatSimTime(worldRef.current.minuteOfDay)}
          history={worldRef.current.conversations[activeNpc.id] ?? []}
          recalledMemories={retrieveRelevantMemories(activeNpc, '', worldRef.current.day, 4)}
          voiceOutput={worldRef.current.settings.voiceOutput}
          isSending={isChatSending}
          pendingPlayerMessage={pendingPlayerMessage}
          errorMsg={chatError}
          onRetryLast={lastFailedMessage ? () => handleSendNpcMessage(lastFailedMessage) : null}
          onSendMessage={handleSendNpcMessage}
          onToggleVoiceOutput={() =>
            handleUpdateSettings({ voiceOutput: !worldRef.current.settings.voiceOutput })
          }
          onClose={handleCloseNpcModal}
        />
      )}

      {phase === 'playing' && activeBuilding && (
        <PlaceModal
          building={activeBuilding}
          world={worldRef.current}
          feedback={placeFeedback}
          onWorkJob={handleWorkJob}
          onBuyItem={handleBuyItem}
          onRestNextMorning={handleRestNextMorning}
          onClinicRecharge={handleClinicRecharge}
          onClose={() => {
            setActiveBuildingId(null);
            setPlaceFeedback(null);
          }}
        />
      )}

      {phase === 'playing' && systemsOpen && (
        <SystemsModal
          world={worldRef.current}
          statusBanner={systemsBanner}
          onStartAutonomous={handleStartAutonomous}
          onCancelAutonomous={handleCancelAutonomous}
          onDeployAgent={handleDeployAgent}
          onToggleAgentStatus={handleToggleAgentStatus}
          onPurchaseLand={handlePurchaseLand}
          onConnectKaspaTestnet={handleConnectKaspaTestnet}
          onRecordKaspaTestnetReceipt={handleRecordKaspaReceipt}
          onUpdateSettings={handleUpdateSettings}
          onRestNextMorning={handleRestNextMorning}
          onSaveWorld={handleQuickSave}
          onResetWorld={handleResetWorld}
          onNavigateToNpc={handleNavigateToNpc}
          onClose={() => setSystemsOpen(false)}
        />
      )}

      {phase === 'paused' && (
        <PauseModal
          world={worldRef.current}
          onResume={() => {
            setPhase('playing');
            engineRef.current?.setPhase('playing');
          }}
          onSaveAndNotify={handleQuickSave}
          onReturnToTitle={() => {
            setActiveNpcId(null);
            setActiveBuildingId(null);
            setSystemsOpen(false);
            setPhase('title');
            engineRef.current?.setPhase('title');
          }}
        />
      )}
    </div>
  );
}
