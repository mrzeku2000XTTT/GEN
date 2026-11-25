import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { ORIGINS, SKILL_LABELS, SkillKey, WorldState } from '../sim/types';
import {
  AGENT_MARKETPLACE,
  AUTONOMOUS_OBJECTIVES,
  formatSimTime,
  getRelationshipTier,
} from '../sim/behaviorEngine';
import { getLocationNameAt } from '../sim/worldLayout';

interface SystemsModalProps {
  world: WorldState;
  statusBanner: string | null;
  onStartAutonomous: (objectiveId: string) => void;
  onCancelAutonomous: () => void;
  onDeployAgent: (templateId: string) => void;
  onToggleAgentStatus: (agentId: string) => void;
  onPurchaseLand: (parcelId: string) => void;
  onConnectKaspaTestnet: (address: string) => void;
  onRecordKaspaTestnetReceipt: (label: string, amountTkas: number) => void;
  onUpdateSettings: (patch: Partial<WorldState['settings']>) => void;
  onRestNextMorning: () => void;
  onSaveWorld: () => void;
  onResetWorld: () => void;
  onNavigateToNpc: (npcId: string) => void;
  onClose: () => void;
}

type TabKey = 'intelligence' | 'residents' | 'agents' | 'economy' | 'settings';

const MILESTONE_LIST = [
  { id: 'met_human', label: 'Meet a human resident and hold an unscripted conversation' },
  { id: 'earned_wages', label: 'Complete a simulated job shift to earn credits (₵)' },
  { id: 'made_purchase', label: 'Purchase coffee, supplies, or a tool in the local economy' },
  { id: 'remembered_next_day', label: 'Return on Day 2 and speak again with someone who remembers you' },
];

export const SystemsModal: React.FC<SystemsModalProps> = ({
  world,
  statusBanner,
  onStartAutonomous,
  onCancelAutonomous,
  onDeployAgent,
  onToggleAgentStatus,
  onPurchaseLand,
  onConnectKaspaTestnet,
  onRecordKaspaTestnetReceipt,
  onUpdateSettings,
  onRestNextMorning,
  onSaveWorld,
  onResetWorld,
  onNavigateToNpc,
  onClose,
}) => {
  const [tab, setTab] = useState<TabKey>('intelligence');
  const [searchNpc, setSearchNpc] = useState('');
  const [kaspaAddrInput, setKaspaAddrInput] = useState(
    world.player.kaspaTestnet.address || 'kaspatest:qz8a9v4e2x7m3k0p6r5w1n8c4t2y9u0l7h5j3d'
  );
  const accent = ORIGINS[world.player.origin].accentHex;
  const originDef = ORIGINS[world.player.origin];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Tab') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filteredNpcs = world.npcs.filter(
    (n) =>
      n.name.toLowerCase().includes(searchNpc.toLowerCase()) ||
      n.occupation.toLowerCase().includes(searchNpc.toLowerCase())
  );

  return (
    <div
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(6, 8, 12, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-label="AI Mind and Civilization Systems"
    >
      <div
        className="w-full max-w-4xl rounded-lg border flex flex-col max-h-[88vh] overflow-hidden"
        style={{
          backgroundColor: '#10141c',
          borderColor: 'rgba(148, 163, 184, 0.25)',
        }}
      >
        {/* Top Bar & Tab Selector */}
        <div className="px-5 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              AI Mind & Alder Creek Systems
            </h2>
            <div className="text-xs text-neutral-400 font-mono-tabular mt-0.5">
              {originDef.name} Core · Day {world.day}, {formatSimTime(world.minuteOfDay)} · ₵
              {Math.round(world.player.balance)} Credits
            </div>
          </div>

          <button
            type="button"
            aria-label="Close Systems panel"
            onClick={onClose}
            className="w-8 h-8 rounded border border-neutral-700 hover:border-neutral-400 text-neutral-300 hover:text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean Segmented Navigation Tabs */}
        <div
          className="px-5 py-2.5 border-b border-neutral-800 flex items-center gap-1.5 overflow-x-auto"
          role="tablist"
          aria-label="System sections"
        >
          {(
            [
              ['intelligence', 'Intelligence & Skills'],
              ['residents', `Residents (${world.npcs.length})`],
              ['agents', 'Computational Flow & Agents'],
              ['economy', 'Economy & Kaspa Testnet'],
              ['settings', 'World & Settings'],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(key)}
                className="px-3.5 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  backgroundColor: active ? accent : 'transparent',
                  color: active ? '#090b0f' : '#cbd5e1',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {statusBanner && (
          <div
            role="status"
            className="px-5 py-2 text-xs text-emerald-200 border-b border-emerald-500/30 bg-emerald-950/35"
          >
            {statusBanner}
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: INTELLIGENCE & SKILLS */}
          {tab === 'intelligence' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold text-white">
                  Cognitive & Physical Progression
                </h3>
                <div className="space-y-3">
                  {(Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => {
                    const val = Math.round(world.player.skills[key] ?? 0);
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-neutral-300">{SKILL_LABELS[key]}</span>
                          <span className="font-mono-tabular text-neutral-200">{val} / 100</span>
                        </div>
                        <div className="h-1.5 w-full bg-neutral-800 rounded-xs overflow-hidden">
                          <div
                            className="h-full"
                            style={{ width: `${val}%`, backgroundColor: accent }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <h3 className="font-display text-sm font-semibold text-white mb-2.5">
                    Genesis Loop Milestones
                  </h3>
                  <ul className="space-y-2 text-xs">
                    {MILESTONE_LIST.map((m) => {
                      const done = world.player.completedMilestones.includes(m.id);
                      return (
                        <li
                          key={m.id}
                          className="flex items-start gap-2.5 p-2.5 rounded border border-neutral-800"
                          style={{ backgroundColor: '#151a24' }}
                        >
                          <span
                            className="font-mono-tabular font-semibold shrink-0"
                            style={{ color: done ? accent : '#64748b' }}
                          >
                            {done ? '[DONE]' : '[OPEN]'}
                          </span>
                          <span className={done ? 'text-neutral-200' : 'text-neutral-400'}>
                            {m.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display text-sm font-semibold text-white mb-2">
                    Inventory ({world.player.inventory.length})
                  </h3>
                  {world.player.inventory.length === 0 ? (
                    <p className="text-xs text-neutral-400">
                      No items acquired yet. Visit Hearth & Grain Coffee, Alder Corner Market, or
                      Northlight Research Annex.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {world.player.inventory.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between text-xs p-2.5 rounded border border-neutral-800"
                          style={{ backgroundColor: '#151a24' }}
                        >
                          <span className="text-neutral-200 font-medium">{item.name}</span>
                          <span className="font-mono-tabular text-neutral-400">
                            Qty {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="font-display text-sm font-semibold text-white mb-2">
                    Recent World Log
                  </h3>
                  <ul className="space-y-1 text-xs text-neutral-400">
                    {world.events.slice(0, 6).map((ev) => (
                      <li key={ev.id}>
                        <span className="font-mono-tabular text-neutral-500 mr-1.5">
                          D{ev.day} {ev.timeFormatted}
                        </span>
                        {ev.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESIDENTS & MEMORIES (20 NPCs) */}
          {tab === 'residents' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-neutral-400">
                  Every resident follows an independent 24-hour schedule, manages personal finances,
                  and retains episodic memories of conversations with you.
                </p>
                <input
                  type="search"
                  aria-label="Filter residents by name or occupation"
                  placeholder="Filter by name or occupation..."
                  value={searchNpc}
                  onChange={(e) => setSearchNpc(e.target.value)}
                  className="px-3 py-1.5 text-xs rounded border border-neutral-700 text-white placeholder:text-neutral-500 w-60"
                  style={{ backgroundColor: '#0b0e14' }}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredNpcs.map((npc) => {
                  const tier = getRelationshipTier(
                    npc.relationship.trust,
                    npc.relationship.familiarity
                  );
                  const episodicMemories = npc.memories.filter((m) => m.category === 'episodic');
                  return (
                    <div
                      key={npc.id}
                      className="p-3.5 rounded-md border border-neutral-800 space-y-2"
                      style={{ backgroundColor: '#151a24' }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display text-sm font-semibold text-white">
                            {npc.name}{' '}
                            <span className="text-xs font-normal text-neutral-400">
                              · {npc.age}
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400">{npc.occupation}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onNavigateToNpc(npc.id)}
                          className="px-2.5 py-1 text-xs rounded border border-neutral-700 hover:border-white text-neutral-200 cursor-pointer shrink-0"
                        >
                          Locate
                        </button>
                      </div>

                      <div className="text-xs text-neutral-300">
                        {npc.currentActivity} ·{' '}
                        <span className="text-neutral-400">
                          {getLocationNameAt(npc.x, npc.z)}
                        </span>
                      </div>

                      <div className="text-[11px] font-mono-tabular text-neutral-400 flex flex-wrap gap-x-3">
                        <span style={{ color: npc.relationship.interactionsCount > 0 ? accent : undefined }}>
                          {tier}
                        </span>
                        <span>Trust {npc.relationship.trust}</span>
                        <span>Mood: {npc.mood}</span>
                        <span>Memories: {npc.memories.length}</span>
                      </div>

                      {episodicMemories.length > 0 && (
                        <div className="pt-1.5 border-t border-neutral-800 text-[11px] text-neutral-300">
                          Latest memory (Day {episodicMemories[0].day}): {episodicMemories[0].event}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: COMPUTATIONAL FLOW & AGENT INTERNET */}
          {tab === 'agents' && (
            <div className="space-y-6">
              {/* Blueprint 10: Autonomous Computational Flow */}
              <section>
                <div className="flex items-center justify-between gap-4 mb-2">
                  <div>
                    <h3 className="font-display text-sm font-semibold text-white">
                      Computational Flow (Autonomous Avatar Mode)
                    </h3>
                    <p className="text-xs text-neutral-400 mt-0.5">
                      OBSERVE → UNDERSTAND → PLAN → ACT → EVALUATE → ADAPT. Interrupt anytime by
                      pressing WASD or Cancel.
                    </p>
                  </div>
                  {world.player.autonomousFlow.active && (
                    <button
                      type="button"
                      onClick={onCancelAutonomous}
                      className="px-3 py-1.5 text-xs rounded border border-red-500/50 text-red-200 hover:bg-red-950/40 cursor-pointer"
                    >
                      Cancel Active Flow
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
                  {AUTONOMOUS_OBJECTIVES.map((obj) => (
                    <button
                      key={obj.id}
                      type="button"
                      onClick={() => onStartAutonomous(obj.id)}
                      className="p-3 rounded-md border border-neutral-800 hover:border-neutral-500 text-left cursor-pointer transition-colors"
                      style={{ backgroundColor: '#151a24' }}
                    >
                      <div className="font-display text-xs font-semibold text-white">
                        {obj.label}
                      </div>
                      <div className="text-[11px] text-neutral-400 mt-0.5">
                        Autonomous in-world navigation & execution
                      </div>
                    </button>
                  ))}
                </div>

                {world.player.autonomousFlow.log.length > 0 && (
                  <div
                    className="mt-3 p-3 rounded border border-neutral-800 font-mono-tabular text-[11px] text-neutral-300 space-y-1 max-h-28 overflow-y-auto"
                    style={{ backgroundColor: '#0b0e14' }}
                  >
                    {world.player.autonomousFlow.log.slice(-6).map((entry, idx) => (
                      <div key={idx}>{entry}</div>
                    ))}
                  </div>
                )}
              </section>

              {/* Blueprint 13: Agent Marketplace & Deployed Agents */}
              <section className="pt-4 border-t border-neutral-800">
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Agent Internet & Virtual Marketplace
                  </h3>
                  <span className="font-mono-tabular text-xs text-neutral-400">
                    Active Slots: {world.player.deployedAgents.length} /{' '}
                    {originDef.maxParallelAgents} ({originDef.name})
                  </span>
                </div>

                {world.player.deployedAgents.length > 0 && (
                  <div className="mb-4 space-y-2">
                    {world.player.deployedAgents.map((agent) => (
                      <div
                        key={agent.id}
                        className="p-3 rounded border border-neutral-800 flex items-center justify-between gap-3"
                        style={{ backgroundColor: '#141a24' }}
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{agent.name}</div>
                          <div className="text-[11px] font-mono-tabular text-neutral-400">
                            ₵{agent.earningsPerHour}/sim-hr · Earned ₵
                            {Math.round(agent.totalEarned)} · Tasks {agent.tasksCompleted}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onToggleAgentStatus(agent.id)}
                          className="px-3 py-1 text-xs rounded border border-neutral-700 hover:border-neutral-400 text-neutral-200 cursor-pointer"
                        >
                          {agent.status === 'active' ? 'Pause' : 'Resume'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {AGENT_MARKETPLACE.map((tpl) => (
                    <div
                      key={tpl.id}
                      className="p-3.5 rounded-md border border-neutral-800 flex flex-col justify-between gap-3"
                      style={{ backgroundColor: '#151a24' }}
                    >
                      <div>
                        <div className="font-display text-sm font-semibold text-white">
                          {tpl.name}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1">{tpl.description}</p>
                        <div className="mt-2 text-xs font-mono-tabular text-neutral-300">
                          Yield: ₵{tpl.earningsPerHour}/sim-hr · Trains {tpl.skillGenerated}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onDeployAgent(tpl.id)}
                        className="self-start px-3.5 py-1.5 rounded text-xs font-semibold text-neutral-950 cursor-pointer"
                        style={{ backgroundColor: accent }}
                      >
                        Deploy for ₵{tpl.cost}
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {/* TAB 4: ECONOMY, LAND & KASPA TESTNET */}
          {tab === 'economy' && (
            <div className="space-y-6">
              <section>
                <div className="flex items-baseline justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-white">
                    Territory & Property Development
                  </h3>
                  <span className="font-mono-tabular text-xs text-neutral-400">
                    Simulated Credits: ₵{Math.round(world.player.balance)} · Jobs Completed:{' '}
                    {world.player.jobsCompleted}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {world.player.landParcels.map((parcel) => (
                    <div
                      key={parcel.id}
                      className="p-3.5 rounded-md border border-neutral-800 flex flex-col justify-between gap-3"
                      style={{ backgroundColor: '#151a24' }}
                    >
                      <div>
                        <div className="font-display text-sm font-semibold text-white">
                          {parcel.name}
                        </div>
                        <div className="text-xs text-neutral-400 mt-0.5">{parcel.district}</div>
                        <div className="mt-2 text-xs font-mono-tabular text-neutral-300">
                          Daily Yield: ₵{parcel.dailyYield}/day
                        </div>
                      </div>
                      {parcel.owned ? (
                        <div
                          className="text-xs font-mono-tabular font-semibold"
                          style={{ color: accent }}
                        >
                          Owned · {parcel.structure}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onPurchaseLand(parcel.id)}
                          className="px-3 py-1.5 rounded text-xs font-semibold text-white border border-neutral-600 hover:border-white cursor-pointer"
                          style={{ backgroundColor: '#1d2432' }}
                        >
                          Acquire ₵{parcel.price}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {/* Blueprint 12: Optional Kaspa Testnet Wallet Interface (never asks for seed phrases) */}
              <section className="pt-4 border-t border-neutral-800 space-y-3">
                <div>
                  <h3 className="font-display text-sm font-semibold text-white">
                    Optional Kaspa Testnet Interface (Simulated Prototype)
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Simulated in-game credits (₵) are completely separate from real cryptocurrency.
                    Never enter private keys or seed phrases — only public testnet addresses for
                    external wallet verification testing.
                  </p>
                </div>

                {!world.player.kaspaTestnet.connected ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor="kaspa-testnet-addr" className="sr-only">
                      Public Kaspa Testnet-11 address
                    </label>
                    <input
                      id="kaspa-testnet-addr"
                      type="text"
                      value={kaspaAddrInput}
                      onChange={(e) => setKaspaAddrInput(e.target.value)}
                      className="flex-1 min-w-[260px] px-3 py-2 text-xs font-mono-tabular rounded border border-neutral-700 text-neutral-100"
                      style={{ backgroundColor: '#0b0e14' }}
                    />
                    <button
                      type="button"
                      onClick={() => onConnectKaspaTestnet(kaspaAddrInput.trim())}
                      className="px-4 py-2 rounded text-xs font-semibold text-neutral-950 cursor-pointer"
                      style={{ backgroundColor: accent }}
                    >
                      Verify Testnet Address
                    </button>
                  </div>
                ) : (
                  <div
                    className="p-3.5 rounded border border-neutral-800 space-y-2.5"
                    style={{ backgroundColor: '#151a24' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-tabular">
                      <span className="text-neutral-300 truncate max-w-md">
                        Connected ({world.player.kaspaTestnet.network}):{' '}
                        {world.player.kaspaTestnet.address}
                      </span>
                      <span style={{ color: accent }}>
                        Testnet Sim: {world.player.kaspaTestnet.simulatedTestnetBalance.toFixed(1)}{' '}
                        tKAS
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onRecordKaspaTestnetReceipt('Simulated Creator Tip (Testnet)', 2.5)
                        }
                        className="px-3 py-1.5 text-xs rounded border border-neutral-700 hover:border-white text-neutral-200 cursor-pointer"
                      >
                        Log Simulated 2.5 tKAS Receipt
                      </button>
                    </div>
                    {world.player.kaspaTestnet.txLog.length > 0 && (
                      <ul className="text-[11px] font-mono-tabular text-neutral-400 space-y-1 pt-2 border-t border-neutral-800">
                        {world.player.kaspaTestnet.txLog.slice(0, 4).map((tx) => (
                          <li key={tx.id}>
                            {tx.timestamp} · {tx.label} ({tx.amountTkas} tKAS · local simulation)
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              {/* Blueprint 24: Honest Implementation Status Disclosure */}
              <section className="pt-4 border-t border-neutral-800">
                <h3 className="font-display text-sm font-semibold text-white mb-2">
                  Prototype Architecture Transparency
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#141923' }}>
                    <div className="font-semibold text-emerald-300 mb-1">Implemented</div>
                    <p className="text-neutral-400 leading-relaxed">
                      3D Alder Creek neighborhood, 1st/3rd person controls, 20 scheduled NPCs, live
                      Gemini conversations, persistent episodic memory, jobs, economy, IndexedDB
                      saves.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#141923' }}>
                    <div className="font-semibold text-amber-300 mb-1">Simulated</div>
                    <p className="text-neutral-400 leading-relaxed">
                      Offline catch-up progression, procedural articulated 3D human rigs, agent
                      yields, and local Kaspa testnet wallet receipt verification.
                    </p>
                  </div>
                  <div className="p-3 rounded border border-neutral-800" style={{ backgroundColor: '#141923' }}>
                    <div className="font-semibold text-neutral-300 mb-1">Planned</div>
                    <p className="text-neutral-400 leading-relaxed">
                      Multi-district city expansion, external glTF character streaming, live
                      server-authoritative multiplayer, and live testnet RPC signing.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* TAB 5: WORLD & SETTINGS */}
          {tab === 'settings' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold text-white">
                  Camera & Simulation Controls
                </h3>

                <div>
                  <label htmlFor="fov-slider" className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Field of View</span>
                    <span className="font-mono-tabular">{world.settings.fov}°</span>
                  </label>
                  <input
                    id="fov-slider"
                    type="range"
                    min={50}
                    max={85}
                    value={world.settings.fov}
                    onChange={(e) => onUpdateSettings({ fov: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                </div>

                <div>
                  <label htmlFor="sens-slider" className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Mouse Look Sensitivity</span>
                    <span className="font-mono-tabular">{world.settings.mouseSensitivity.toFixed(1)}x</span>
                  </label>
                  <input
                    id="sens-slider"
                    type="range"
                    min={0.4}
                    max={2.2}
                    step={0.1}
                    value={world.settings.mouseSensitivity}
                    onChange={(e) =>
                      onUpdateSettings({ mouseSensitivity: Number(e.target.value) })
                    }
                    className="w-full accent-white"
                  />
                </div>

                <div>
                  <label htmlFor="timescale-slider" className="flex justify-between text-xs text-neutral-300 mb-1">
                    <span>Simulation Clock Speed</span>
                    <span className="font-mono-tabular">
                      {world.settings.timeScale.toFixed(1)} min/s
                    </span>
                  </label>
                  <input
                    id="timescale-slider"
                    type="range"
                    min={0.5}
                    max={8}
                    step={0.5}
                    value={world.settings.timeScale}
                    onChange={(e) => onUpdateSettings({ timeScale: Number(e.target.value) })}
                    className="w-full accent-white"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-neutral-300">Camera Perspective</span>
                  <div className="flex gap-1.5">
                    {(['third', 'first'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => onUpdateSettings({ cameraMode: mode })}
                        className="px-3 py-1.5 text-xs rounded border cursor-pointer"
                        style={{
                          backgroundColor:
                            world.settings.cameraMode === mode ? accent : '#151a24',
                          borderColor:
                            world.settings.cameraMode === mode ? accent : '#334155',
                          color: world.settings.cameraMode === mode ? '#090b0f' : '#e2e8f0',
                        }}
                      >
                        {mode === 'third' ? 'Third-Person' : 'First-Person'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-display text-sm font-semibold text-white">
                  Persistence & Time Progression
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  World state is stored locally in IndexedDB (with localStorage mirror), preserving
                  player skills, inventory, finances, and every resident&apos;s episodic memories.
                </p>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={onSaveWorld}
                    className="px-4 py-2 rounded text-xs font-semibold text-neutral-950 cursor-pointer"
                    style={{ backgroundColor: accent }}
                  >
                    Save World Now
                  </button>
                  <button
                    type="button"
                    onClick={onRestNextMorning}
                    className="px-4 py-2 rounded text-xs font-medium text-neutral-100 border border-neutral-600 hover:border-white cursor-pointer"
                    style={{ backgroundColor: '#171d28' }}
                  >
                    Advance to Day {world.day + 1} Morning
                  </button>
                </div>

                <div className="pt-4 border-t border-neutral-800">
                  <button
                    type="button"
                    onClick={onResetWorld}
                    className="px-4 py-2 rounded text-xs font-medium text-red-300 border border-red-500/40 hover:bg-red-950/40 cursor-pointer"
                  >
                    Reset Saved World & Return to Title
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
