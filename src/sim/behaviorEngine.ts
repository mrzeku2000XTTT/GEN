import {
  AutonomousFlowState,
  DeployedAgent,
  JobDef,
  MemoryRecord,
  NpcData,
  NpcGesture,
  NpcMood,
  ORIGINS,
  OriginId,
  ShopItemDef,
  SkillKey,
  WeatherType,
  WorldState,
} from './types';
import { createInitialNpcs } from './npcCatalog';
import {
  BUILDINGS,
  INITIAL_LAND_PARCELS,
  JOBS,
  PLAYER_SPAWN,
  SHOP_ITEMS,
  getBuildingById,
  getLocationNameAt,
  getLocationPoint,
  resolvePlayerCollision,
} from './worldLayout';

export const WORLD_SCHEMA_VERSION = 1;

export interface AgentTemplate {
  id: string;
  name: string;
  role: DeployedAgent['role'];
  cost: number;
  earningsPerHour: number;
  skillGenerated: SkillKey;
  description: string;
}

export const AGENT_MARKETPLACE: AgentTemplate[] = [
  {
    id: 'agent_market_scout',
    name: 'Alder Price Scout',
    role: 'market_scout',
    cost: 65,
    earningsPerHour: 6,
    skillGenerated: 'economic',
    description: 'Tracks neighborhood shop inventory spreads and generates small brokerage fees.',
  },
  {
    id: 'agent_coffee_courier',
    name: 'Morning Roastery Runner',
    role: 'coffee_courier',
    cost: 80,
    earningsPerHour: 8,
    skillGenerated: 'coordination',
    description: 'Coordinates pre-orders between Hearth & Grain and Meridian Studio desks.',
  },
  {
    id: 'agent_research_indexer',
    name: 'Northlight Data Indexer',
    role: 'research_indexer',
    cost: 120,
    earningsPerHour: 12,
    skillGenerated: 'knowledge',
    description: 'Organizes environmental sensor logs for Northlight Research Annex grants.',
  },
  {
    id: 'agent_civic_mapper',
    name: 'Civic Flow Coordinator',
    role: 'civic_mapper',
    cost: 160,
    earningsPerHour: 16,
    skillGenerated: 'parallel',
    description: 'Synchronizes pedestrian, transit, and microgrid schedules across Alder Creek.',
  },
];

export interface AutonomousObjectivePreset {
  id: string;
  label: string;
  targetBuildingId: string | null;
  targetNpcId: string | null;
  actionType: 'work' | 'buy_coffee' | 'meet_npc' | 'rest';
  jobId?: string;
  itemId?: string;
}

export const AUTONOMOUS_OBJECTIVES: AutonomousObjectivePreset[] = [
  {
    id: 'auto_work_meridian',
    label: 'Work a shift at Meridian Civic Studio',
    targetBuildingId: 'meridian_studio',
    targetNpcId: null,
    actionType: 'work',
    jobId: 'sensor_calibration',
  },
  {
    id: 'auto_buy_coffee',
    label: 'Purchase espresso at Hearth & Grain Coffee',
    targetBuildingId: 'hearth_coffee',
    targetNpcId: null,
    actionType: 'buy_coffee',
    itemId: 'single_origin_espresso',
  },
  {
    id: 'auto_meet_maya',
    label: 'Locate and approach Maya Lin',
    targetBuildingId: null,
    targetNpcId: 'npc_maya',
    actionType: 'meet_npc',
  },
  {
    id: 'auto_rest_home',
    label: 'Return to Cedar Row North and rest until dawn',
    targetBuildingId: 'cedar_apt_north',
    targetNpcId: null,
    actionType: 'rest',
  },
];

export function formatSimTime(minuteOfDay: number): string {
  const normalized = ((Math.floor(minuteOfDay) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${suffix}`;
}

export function getRelationshipTier(trust: number, familiarity: number): string {
  const score = trust * 0.6 + familiarity * 0.4;
  if (score >= 72) return 'Trusted Confidant';
  if (score >= 48) return 'Neighborhood Friend';
  if (score >= 22) return 'Familiar Acquaintance';
  if (familiarity > 0) return 'Recently Met';
  return 'Stranger';
}

export function createIdleAutonomousFlow(): AutonomousFlowState {
  return {
    active: false,
    objectiveId: '',
    objectiveLabel: '',
    stage: 'IDLE',
    targetBuildingId: null,
    targetNpcId: null,
    targetX: 0,
    targetZ: 0,
    log: [],
    stageTimer: 0,
  };
}

export function createInitialWorldState(origin: OriginId): WorldState {
  const originDef = ORIGINS[origin];
  const startMinute = 8 * 60 + 15; // 08:15 AM
  const npcs = createInitialNpcs(8);

  return {
    version: WORLD_SCHEMA_VERSION,
    day: 1,
    minuteOfDay: startMinute,
    weather: 'clear',
    economyDemandIndex: 1.0,
    player: {
      origin,
      x: PLAYER_SPAWN.x,
      y: 0,
      z: PLAYER_SPAWN.z,
      yaw: PLAYER_SPAWN.yaw,
      pitch: 0,
      balance: 60,
      energy: 100,
      skills: { ...originDef.startingSkills },
      inventory: [],
      jobsCompleted: 0,
      discoveredJobLeads: [],
      currentObjective: 'Approach a resident in Alder Creek Plaza and start a conversation.',
      completedMilestones: [],
      deployedAgents: [],
      kaspaTestnet: {
        connected: false,
        network: 'kaspa-testnet-11',
        address: '',
        simulatedTestnetBalance: 125.0,
        txLog: [],
      },
      landParcels: INITIAL_LAND_PARCELS.map((p) => ({ ...p })),
      autonomousFlow: createIdleAutonomousFlow(),
    },
    npcs,
    conversations: {},
    events: [
      {
        id: 'evt_awakening',
        day: 1,
        timeFormatted: formatSimTime(startMinute),
        text: `Awakened in Alder Creek District with ${originDef.name} (${originDef.title}) architecture.`,
      },
    ],
    settings: {
      cameraMode: 'third',
      fov: 62,
      mouseSensitivity: 1.0,
      timeScale: 1.2, // ~1.2 sim minutes per real second
      muted: false,
      voiceOutput: false,
    },
    savedAtRealMs: Date.now(),
  };
}

export function addWorldEvent(world: WorldState, text: string): void {
  world.events.unshift({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    day: world.day,
    timeFormatted: formatSimTime(world.minuteOfDay),
    text,
  });
  if (world.events.length > 40) {
    world.events.length = 40;
  }
}

export function grantSkillXp(world: WorldState, skill: SkillKey, amount: number): void {
  const current = world.player.skills[skill] ?? 0;
  world.player.skills[skill] = Math.min(100, Math.round((current + amount) * 10) / 10);
}

export function getAdjustedItemPrice(item: ShopItemDef, demandIndex: number): number {
  return Math.max(2, Math.round(item.basePrice * demandIndex));
}

export function getScheduleBlockForHour(npc: NpcData, hour: number) {
  const h = ((Math.floor(hour) % 24) + 24) % 24;
  return npc.schedule.find((s) => h >= s.startHour && h < s.endHour) ?? npc.schedule[0];
}

export function retrieveRelevantMemories(
  npc: NpcData,
  queryText: string,
  currentDay: number,
  maxCount = 6
): MemoryRecord[] {
  const tokens = queryText
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 3);

  const scored = npc.memories.map((mem) => {
    const lowerEvent = mem.event.toLowerCase();
    let keywordScore = 0;
    for (const token of tokens) {
      if (lowerEvent.includes(token)) {
        keywordScore += 1.4;
      }
    }
    const ageDays = Math.max(0, currentDay - mem.day);
    const recencyScore = 1 / (1 + ageDays * 0.45);
    const categoryBonus =
      mem.category === 'episodic' || mem.category === 'relationship' ? 0.8 : 0.2;
    const score =
      keywordScore +
      mem.emotionalSignificance * 1.6 +
      recencyScore * 1.1 +
      categoryBonus * mem.confidence;
    return { mem, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxCount).map((s) => s.mem);
}

export function recordNpcMemory(npc: NpcData, record: Omit<MemoryRecord, 'id'>): MemoryRecord {
  const fullRecord: MemoryRecord = {
    ...record,
    id: `mem_${npc.id}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  };
  npc.memories.unshift(fullRecord);
  if (npc.memories.length > 32) {
    // Retain highest significance + recent memories
    npc.memories.sort((a, b) => {
      const scoreA = a.day * 0.25 + a.emotionalSignificance * 2;
      const scoreB = b.day * 0.25 + b.emotionalSignificance * 2;
      return scoreB - scoreA;
    });
    npc.memories.length = 32;
  }
  return fullRecord;
}

export function updateMilestoneProgress(world: WorldState): void {
  const p = world.player;
  const hasMetSomeone = world.npcs.some((n) => n.relationship.interactionsCount > 0);
  const hasWorked = p.jobsCompleted > 0;
  const hasBought = p.inventory.length > 0;
  const returnedNextDay =
    world.day >= 2 &&
    world.npcs.some((n) => n.relationship.lastMetDay >= 2 && n.relationship.interactionsCount >= 2);

  const mark = (id: string) => {
    if (!p.completedMilestones.includes(id)) {
      p.completedMilestones.push(id);
    }
  };

  if (hasMetSomeone) mark('met_human');
  if (hasWorked) mark('earned_wages');
  if (hasBought) mark('made_purchase');
  if (returnedNextDay) mark('remembered_next_day');

  if (!hasMetSomeone) {
    p.currentObjective = 'Meet a local human in Alder Creek Plaza (approach Maya Lin and press E).';
  } else if (!hasWorked) {
    p.currentObjective = 'Earn simulated credits (₵) by completing a shift at Meridian Studio or Hearth & Grain.';
  } else if (!hasBought) {
    p.currentObjective = 'Purchase coffee, provisions, or tools at Hearth & Grain or Alder Market.';
  } else if (world.day < 2) {
    p.currentObjective = 'Rest at Cedar Row North until Day 2, then speak again with someone you met.';
  } else if (!returnedNextDay) {
    p.currentObjective = 'Speak again with a resident you met on Day 1 to see what they remember.';
  } else {
    p.currentObjective = 'Expand your intelligence: deploy AI agents, grow relationships, or acquire land parcels.';
  }
}

export function applyConversationOutcome(
  world: WorldState,
  npcId: string,
  playerText: string,
  outcome: {
    reply: string;
    mood: string;
    trustDelta: number;
    memorySummary: string;
    emotionalSignificance: number;
    gesture: string;
    jobHint?: string;
  }
): MemoryRecord | null {
  const npc = world.npcs.find((n) => n.id === npcId);
  if (!npc) return null;

  const validMoods: NpcMood[] = [
    'warm',
    'curious',
    'focused',
    'amused',
    'tired',
    'guarded',
    'irritated',
    'neutral',
  ];
  if (validMoods.includes(outcome.mood as NpcMood)) {
    npc.mood = outcome.mood as NpcMood;
  }

  const validGestures: NpcGesture[] = ['idle', 'nod', 'wave', 'shrug', 'explain', 'laugh', 'dismiss'];
  if (validGestures.includes(outcome.gesture as NpcGesture)) {
    npc.gesture = outcome.gesture as NpcGesture;
  }

  npc.relationship.trust = Math.max(0, Math.min(100, npc.relationship.trust + outcome.trustDelta));
  npc.relationship.familiarity = Math.min(100, npc.relationship.familiarity + 8);
  npc.relationship.interactionsCount += 1;
  npc.relationship.lastMetDay = world.day;
  npc.needs.social = Math.min(100, npc.needs.social + 12);

  const timeFormatted = formatSimTime(world.minuteOfDay);
  if (!world.conversations[npcId]) {
    world.conversations[npcId] = [];
  }
  world.conversations[npcId].push(
    {
      id: `msg_p_${Date.now()}`,
      speaker: 'player',
      text: playerText,
      day: world.day,
      timeFormatted,
    },
    {
      id: `msg_n_${Date.now() + 1}`,
      speaker: 'npc',
      text: outcome.reply,
      day: world.day,
      timeFormatted,
    }
  );
  if (world.conversations[npcId].length > 30) {
    world.conversations[npcId] = world.conversations[npcId].slice(-30);
  }

  let savedMemory: MemoryRecord | null = null;
  if (outcome.memorySummary && outcome.memorySummary.trim().length > 4) {
    savedMemory = recordNpcMemory(npc, {
      category: 'episodic',
      participants: ['You', npc.name],
      event: outcome.memorySummary.trim(),
      location: getLocationNameAt(npc.x, npc.z),
      day: world.day,
      minuteOfDay: world.minuteOfDay,
      emotionalSignificance: outcome.emotionalSignificance,
      confidence: 0.92,
      relationshipImpact: outcome.trustDelta,
    });
  }

  if (outcome.jobHint && !world.player.discoveredJobLeads.includes(outcome.jobHint)) {
    world.player.discoveredJobLeads.push(outcome.jobHint);
    addWorldEvent(world, `${npc.name} mentioned a local work lead (${outcome.jobHint.replace(/_/g, ' ')}).`);
  }

  grantSkillXp(world, 'social', 2.5);
  grantSkillXp(world, 'knowledge', 1.0);
  updateMilestoneProgress(world);
  return savedMemory;
}

export function purchaseShopItem(
  world: WorldState,
  itemId: string
): { ok: boolean; message: string; pricePaid?: number } {
  const item = SHOP_ITEMS.find((i) => i.id === itemId);
  if (!item) return { ok: false, message: 'Item not found.' };

  const price = getAdjustedItemPrice(item, world.economyDemandIndex);
  if (world.player.balance < price) {
    return {
      ok: false,
      message: `Insufficient simulated credits (need ₵${price}, have ₵${Math.round(world.player.balance)}).`,
    };
  }

  world.player.balance = Math.round((world.player.balance - price) * 100) / 100;
  if (item.energyRestore > 0) {
    world.player.energy = Math.min(100, world.player.energy + item.energyRestore);
  }
  if (item.skillBoost) {
    grantSkillXp(world, item.skillBoost.skill, item.skillBoost.amount);
  }
  grantSkillXp(world, 'economic', 1.5);

  const existing = world.player.inventory.find((inv) => inv.id === item.id);
  if (existing) {
    existing.quantity += 1;
  } else {
    world.player.inventory.push({
      id: item.id,
      name: item.name,
      category: item.category,
      quantity: 1,
      description: item.description,
    });
  }

  // Simulated local demand reacts gently to purchases
  world.economyDemandIndex = Math.min(1.3, Math.round((world.economyDemandIndex + 0.02) * 100) / 100);

  const building = getBuildingById(item.placeId);
  addWorldEvent(world, `Purchased ${item.name} at ${building?.name ?? 'local shop'} for ₵${price}.`);
  updateMilestoneProgress(world);
  return { ok: true, message: `Purchased ${item.name} for ₵${price}.`, pricePaid: price };
}

export function completeJobShift(
  world: WorldState,
  jobId: string
): { ok: boolean; message: string; earned?: number } {
  const job: JobDef | undefined = JOBS.find((j) => j.id === jobId);
  if (!job) return { ok: false, message: 'Job listing not found.' };

  const originDef = ORIGINS[world.player.origin];
  const adjustedEnergyCost = Math.round(job.energyCost * originDef.energyDrainMultiplier);
  if (world.player.energy < adjustedEnergyCost) {
    return {
      ok: false,
      message: `Energy too low (${Math.round(world.player.energy)}%). Grab coffee or rest at Cedar Row North first.`,
    };
  }

  const skillBonus = 1 + (world.player.skills[job.skillTrained] ?? 10) * 0.006;
  const payout = Math.round(job.basePay * originDef.workPayoutMultiplier * skillBonus);

  world.player.balance = Math.round((world.player.balance + payout) * 100) / 100;
  world.player.energy = Math.max(5, world.player.energy - adjustedEnergyCost);
  world.player.jobsCompleted += 1;

  grantSkillXp(world, job.skillTrained, job.skillGain);
  grantSkillXp(world, 'economic', 2.5);

  // Advance simulation clock by shift duration
  advanceSimClock(world, job.durationMinutes);
  addWorldEvent(world, `Completed "${job.title}" at ${job.employer} (+₵${payout}).`);
  updateMilestoneProgress(world);

  return { ok: true, message: `Shift complete! Earned ₵${payout} and +${job.skillGain} skill experience.`, earned: payout };
}

export function advanceSimClock(world: WorldState, deltaMinutes: number): void {
  const totalMinutes = world.minuteOfDay + deltaMinutes;
  const daysCrossed = Math.floor(totalMinutes / 1440);
  world.minuteOfDay = ((totalMinutes % 1440) + 1440) % 1440;

  if (daysCrossed > 0) {
    for (let d = 0; d < daysCrossed; d++) {
      world.day += 1;
      onNewDayTransition(world);
    }
  }
}

function onNewDayTransition(world: WorldState): void {
  // Deterministic weather cycle per day
  const weatherOrder: WeatherType[] = ['clear', 'golden_mist', 'overcast', 'clear', 'light_rain'];
  world.weather = weatherOrder[(world.day - 1) % weatherOrder.length];

  // Mean-revert economy demand slightly each morning
  world.economyDemandIndex = Math.round((world.economyDemandIndex * 0.65 + 1.0 * 0.35) * 100) / 100;

  // NPCs earn daily wages & pay modest living expenses
  for (const npc of world.npcs) {
    const dailyWage = 65 + (npc.age % 7) * 14;
    const dailyLiving = 48;
    npc.balance = Math.max(50, Math.round(npc.balance + dailyWage - dailyLiving));
    npc.needs.energy = 95;
    npc.needs.hunger = 15;
    npc.gesture = 'idle';
  }

  // Owned land parcels produce daily simulated yield
  const parcelYield = world.player.landParcels
    .filter((p) => p.owned)
    .reduce((sum, p) => sum + p.dailyYield, 0);
  if (parcelYield > 0) {
    const originMult = world.player.origin === 'bitcoin' ? 1.15 : 1.0;
    const finalYield = Math.round(parcelYield * originMult);
    world.player.balance += finalYield;
    addWorldEvent(world, `Day ${world.day} property yields deposited (+₵${finalYield}).`);
  }

  updateMilestoneProgress(world);
}

export function restUntilNextMorning(world: WorldState): { ok: boolean; message: string } {
  const targetMorningMinute = 7 * 60 + 30; // 07:30 AM
  const minutesUntilMorning =
    world.minuteOfDay < targetMorningMinute
      ? targetMorningMinute - world.minuteOfDay + 1440
      : 1440 - world.minuteOfDay + targetMorningMinute;

  advanceSimClock(world, minutesUntilMorning);
  world.player.energy = 100;

  // Reposition NPCs to their 07:30 AM schedule anchors cleanly
  const hour = world.minuteOfDay / 60;
  for (const npc of world.npcs) {
    const block = getScheduleBlockForHour(npc, hour);
    const base = getLocationPoint(block.locationId);
    npc.x = base.x + block.anchorOffset.x;
    npc.z = base.z + block.anchorOffset.z;
    npc.targetX = npc.x;
    npc.targetZ = npc.z;
    npc.currentLocationId = block.locationId;
    npc.currentActivity = block.activity;
  }

  addWorldEvent(world, `Rested until Day ${world.day}, 07:30 AM. Energy restored to 100%.`);
  updateMilestoneProgress(world);
  return {
    ok: true,
    message: `Dawn of Day ${world.day} (07:30 AM). Residents have started their new daily routines.`,
  };
}

export function purchaseLandParcel(
  world: WorldState,
  parcelId: string
): { ok: boolean; message: string } {
  const parcel = world.player.landParcels.find((p) => p.id === parcelId);
  if (!parcel) return { ok: false, message: 'Parcel not found.' };
  if (parcel.owned) return { ok: false, message: 'You already own this parcel.' };
  if (world.player.balance < parcel.price) {
    return {
      ok: false,
      message: `Need ₵${parcel.price} simulated credits to acquire ${parcel.name}.`,
    };
  }

  world.player.balance -= parcel.price;
  parcel.owned = true;
  parcel.structure = 'Community Micro-Node';
  grantSkillXp(world, 'strategy', 8);
  grantSkillXp(world, 'economic', 8);
  addWorldEvent(world, `Acquired ${parcel.name} in ${parcel.district} for ₵${parcel.price}.`);
  return { ok: true, message: `Acquired ${parcel.name}! Generates ₵${parcel.dailyYield}/day.` };
}

export function deployHelperAgent(
  world: WorldState,
  templateId: string
): { ok: boolean; message: string } {
  const tpl = AGENT_MARKETPLACE.find((a) => a.id === templateId);
  if (!tpl) return { ok: false, message: 'Agent blueprint not found.' };

  const originDef = ORIGINS[world.player.origin];
  if (world.player.deployedAgents.length >= originDef.maxParallelAgents) {
    return {
      ok: false,
      message: `Current ${originDef.name} architecture supports up to ${originDef.maxParallelAgents} concurrent agents.`,
    };
  }
  if (world.player.balance < tpl.cost) {
    return { ok: false, message: `Need ₵${tpl.cost} to deploy ${tpl.name}.` };
  }

  world.player.balance -= tpl.cost;
  const newAgent: DeployedAgent = {
    id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name: tpl.name,
    role: tpl.role,
    status: 'active',
    earningsPerHour: tpl.earningsPerHour,
    skillGenerated: tpl.skillGenerated,
    totalEarned: 0,
    tasksCompleted: 0,
  };
  world.player.deployedAgents.push(newAgent);
  grantSkillXp(world, 'parallel', 6);
  addWorldEvent(world, `Deployed autonomous agent "${tpl.name}" into Alder Creek.`);
  return { ok: true, message: `${tpl.name} deployed and executing in-world tasks.` };
}

export function startAutonomousObjective(world: WorldState, objectiveId: string): boolean {
  const preset = AUTONOMOUS_OBJECTIVES.find((o) => o.id === objectiveId);
  if (!preset) return false;

  let tx = 0;
  let tz = 0;
  if (preset.targetBuildingId) {
    const pt = getLocationPoint(preset.targetBuildingId);
    tx = pt.x;
    tz = pt.z;
  } else if (preset.targetNpcId) {
    const npc = world.npcs.find((n) => n.id === preset.targetNpcId);
    if (npc) {
      tx = npc.x;
      tz = npc.z;
    }
  }

  world.player.autonomousFlow = {
    active: true,
    objectiveId: preset.id,
    objectiveLabel: preset.label,
    stage: 'OBSERVE',
    targetBuildingId: preset.targetBuildingId,
    targetNpcId: preset.targetNpcId,
    targetX: tx,
    targetZ: tz,
    log: [`[OBSERVE] Scanning Alder Creek state for: ${preset.label}`],
    stageTimer: 0,
  };
  return true;
}

export function cancelAutonomousObjective(world: WorldState, reason = 'Interrupted by manual player control.'): void {
  if (!world.player.autonomousFlow.active) return;
  world.player.autonomousFlow.active = false;
  world.player.autonomousFlow.stage = 'IDLE';
  world.player.autonomousFlow.log.push(`[HALT] ${reason}`);
}

export function stepWorldSimulation(world: WorldState, dtSeconds: number): {
  autonomousReachedNpcId: string | null;
} {
  const clampedDt = Math.min(dtSeconds, 0.1);
  const deltaSimMinutes = clampedDt * world.settings.timeScale;
  advanceSimClock(world, deltaSimMinutes);

  const currentHour = world.minuteOfDay / 60;
  const px = world.player.x;
  const pz = world.player.z;

  // Step all 20 NPCs using schedule + utility AI + LOD distance tiers
  for (const npc of world.npcs) {
    if (npc.inConversation) {
      // Face player politely while conversing
      npc.yaw = Math.atan2(px - npc.x, pz - npc.z);
      continue;
    }

    const block = getScheduleBlockForHour(npc, currentHour);
    const base = getLocationPoint(block.locationId);
    npc.targetX = base.x + block.anchorOffset.x;
    npc.targetZ = base.z + block.anchorOffset.z;
    npc.currentLocationId = block.locationId;
    npc.currentActivity = block.activity;

    const dx = npc.targetX - npc.x;
    const dz = npc.targetZ - npc.z;
    const dist = Math.hypot(dx, dz);

    // LOD: nearby NPCs (< 36m) smoothly navigate & collide; distant NPCs simplify directly
    const distToPlayer = Math.hypot(npc.x - px, npc.z - pz);
    if (dist > 0.25) {
      const step = Math.min(dist, npc.speed * clampedDt);
      const nextX = npc.x + (dx / dist) * step;
      const nextZ = npc.z + (dz / dist) * step;

      if (distToPlayer < 38) {
        const resolved = resolvePlayerCollision(npc.x, npc.z, nextX, nextZ, 0.35);
        npc.x = resolved.x;
        npc.z = resolved.z;
      } else {
        npc.x = nextX;
        npc.z = nextZ;
      }
      npc.yaw = Math.atan2(dx, dz);
    }

    // Subtle need drift
    npc.needs.hunger = Math.min(100, npc.needs.hunger + deltaSimMinutes * 0.03);
    npc.needs.energy = Math.max(10, npc.needs.energy - deltaSimMinutes * 0.02);
  }

  // Step deployed AI helper agents (Blueprint 13)
  const simHours = deltaSimMinutes / 60;
  for (const agent of world.player.deployedAgents) {
    if (agent.status !== 'active') continue;
    const earned = agent.earningsPerHour * simHours;
    agent.totalEarned += earned;
    world.player.balance += earned;
    const prevTasks = agent.tasksCompleted;
    const nextTasks = Math.floor(agent.totalEarned / 10);
    if (nextTasks > prevTasks) {
      agent.tasksCompleted = nextTasks;
      grantSkillXp(world, agent.skillGenerated, 0.5);
    }
  }

  // Step Blueprint 10 Autonomous Computational Flow
  let autonomousReachedNpcId: string | null = null;
  const flow = world.player.autonomousFlow;
  if (flow.active) {
    flow.stageTimer += clampedDt;
    const preset = AUTONOMOUS_OBJECTIVES.find((o) => o.id === flow.objectiveId);

    if (flow.stage === 'OBSERVE' && flow.stageTimer >= 0.6) {
      flow.stage = 'UNDERSTAND';
      flow.stageTimer = 0;
      flow.log.push(`[UNDERSTAND] Current energy ${Math.round(world.player.energy)}%, credits ₵${Math.round(world.player.balance)}.`);
    } else if (flow.stage === 'UNDERSTAND' && flow.stageTimer >= 0.6) {
      flow.stage = 'PLAN';
      flow.stageTimer = 0;
      if (flow.targetNpcId) {
        const targetNpc = world.npcs.find((n) => n.id === flow.targetNpcId);
        if (targetNpc) {
          flow.targetX = targetNpc.x;
          flow.targetZ = targetNpc.z;
        }
      }
      flow.log.push(`[PLAN] Navigating toward (${flow.targetX.toFixed(1)}, ${flow.targetZ.toFixed(1)}).`);
    } else if (flow.stage === 'PLAN' && flow.stageTimer >= 0.5) {
      flow.stage = 'ACT';
      flow.stageTimer = 0;
      flow.log.push(`[ACT] Executing movement along Alder Creek walkways.`);
    } else if (flow.stage === 'ACT') {
      if (flow.targetNpcId) {
        const targetNpc = world.npcs.find((n) => n.id === flow.targetNpcId);
        if (targetNpc) {
          flow.targetX = targetNpc.x;
          flow.targetZ = targetNpc.z;
        }
      }
      const dx = flow.targetX - world.player.x;
      const dz = flow.targetZ - world.player.z;
      const dist = Math.hypot(dx, dz);

      if (dist > 2.2) {
        const moveSpeed = 5.4 * ORIGINS[world.player.origin].moveSpeedMultiplier;
        const step = Math.min(dist, moveSpeed * clampedDt);
        const res = resolvePlayerCollision(
          world.player.x,
          world.player.z,
          world.player.x + (dx / dist) * step,
          world.player.z + (dz / dist) * step,
          0.42
        );
        world.player.x = res.x;
        world.player.z = res.z;
        world.player.yaw = Math.atan2(-dx, -dz);
      } else {
        flow.stage = 'EVALUATE';
        flow.stageTimer = 0;
        if (preset?.actionType === 'work' && preset.jobId) {
          const result = completeJobShift(world, preset.jobId);
          flow.log.push(`[EVALUATE] ${result.message}`);
        } else if (preset?.actionType === 'buy_coffee' && preset.itemId) {
          const result = purchaseShopItem(world, preset.itemId);
          flow.log.push(`[EVALUATE] ${result.message}`);
        } else if (preset?.actionType === 'rest') {
          const result = restUntilNextMorning(world);
          flow.log.push(`[EVALUATE] ${result.message}`);
        } else if (preset?.actionType === 'meet_npc' && preset.targetNpcId) {
          autonomousReachedNpcId = preset.targetNpcId;
          flow.log.push(`[EVALUATE] Reached resident. Opening natural interaction.`);
        }
      }
    } else if (flow.stage === 'EVALUATE' && flow.stageTimer >= 0.7) {
      flow.stage = 'ADAPT';
      flow.stageTimer = 0;
      grantSkillXp(world, 'strategy', 1.5);
      flow.log.push(`[ADAPT] Objective cycle logged. Ready for next directive.`);
    } else if (flow.stage === 'ADAPT' && flow.stageTimer >= 0.8) {
      flow.active = false;
      flow.stage = 'IDLE';
    }
  }

  return { autonomousReachedNpcId };
}

export function applyOfflineCatchUp(world: WorldState, nowRealMs: number): string | null {
  const elapsedSeconds = Math.max(0, (nowRealMs - (world.savedAtRealMs || nowRealMs)) / 1000);
  if (elapsedSeconds < 45) return null;

  // Deterministic offline catch-up capped at 12 simulated hours so returning feels grounded & honest
  const simMinutesElapsed = Math.min(720, Math.round((elapsedSeconds / 60) * 12));
  if (simMinutesElapsed < 10) return null;

  advanceSimClock(world, simMinutesElapsed);

  const simHours = simMinutesElapsed / 60;
  let agentEarnings = 0;
  for (const agent of world.player.deployedAgents) {
    if (agent.status === 'active') {
      const gain = Math.round(agent.earningsPerHour * simHours * 10) / 10;
      agent.totalEarned += gain;
      agentEarnings += gain;
    }
  }
  if (agentEarnings > 0) {
    world.player.balance = Math.round((world.player.balance + agentEarnings) * 100) / 100;
  }

  // Reposition NPCs to match new simulation hour
  const hour = world.minuteOfDay / 60;
  for (const npc of world.npcs) {
    const block = getScheduleBlockForHour(npc, hour);
    const pt = getLocationPoint(block.locationId);
    npc.x = pt.x + block.anchorOffset.x;
    npc.z = pt.z + block.anchorOffset.z;
    npc.currentLocationId = block.locationId;
    npc.currentActivity = block.activity;
  }

  const hoursLabel = (simMinutesElapsed / 60).toFixed(1);
  const summary = `Offline catch-up simulated ${hoursLabel} in-world hours${
    agentEarnings > 0 ? ` · Agents earned +₵${Math.round(agentEarnings)}` : ''
  }.`;
  addWorldEvent(world, summary);
  return summary;
}

export function getNearbyInteraction(world: WorldState): {
  type: 'npc' | 'building';
  id: string;
  title: string;
  subtitle: string;
  distance: number;
} | null {
  const px = world.player.x;
  const pz = world.player.z;

  let bestNpc: { npc: NpcData; dist: number } | null = null;
  for (const npc of world.npcs) {
    const d = Math.hypot(npc.x - px, npc.z - pz);
    if (d < 4.2 && (!bestNpc || d < bestNpc.dist)) {
      bestNpc = { npc, dist: d };
    }
  }

  let bestBuilding: { id: string; name: string; subtitle: string; dist: number } | null = null;
  for (const b of BUILDINGS) {
    if (!b.interactable) continue;
    const d = Math.hypot(b.entrance.x - px, b.entrance.z - pz);
    if (d < 4.8 && (!bestBuilding || d < bestBuilding.dist)) {
      const hour = world.minuteOfDay / 60;
      const isOpen = hour >= b.openHour && hour < b.closeHour;
      bestBuilding = {
        id: b.id,
        name: b.name,
        subtitle: isOpen ? b.category.replace('_', ' ') : `Opens ${b.openHour}:00`,
        dist: d,
      };
    }
  }

  if (bestNpc && (!bestBuilding || bestNpc.dist <= bestBuilding.dist + 0.6)) {
    return {
      type: 'npc',
      id: bestNpc.npc.id,
      title: `Speak with ${bestNpc.npc.name}`,
      subtitle: `${bestNpc.npc.occupation} · ${getRelationshipTier(
        bestNpc.npc.relationship.trust,
        bestNpc.npc.relationship.familiarity
      )}`,
      distance: bestNpc.dist,
    };
  }

  if (bestBuilding) {
    return {
      type: 'building',
      id: bestBuilding.id,
      title: `Enter ${bestBuilding.name}`,
      subtitle: bestBuilding.subtitle,
      distance: bestBuilding.dist,
    };
  }

  return null;
}
