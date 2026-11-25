export type OriginId = 'bitcoin' | 'ethereum' | 'solana' | 'kaspa';

export type GamePhase = 'title' | 'birth' | 'playing' | 'paused';

export type WeatherType = 'clear' | 'overcast' | 'light_rain' | 'golden_mist';

export type SkillKey =
  | 'knowledge'
  | 'environmental'
  | 'social'
  | 'engineering'
  | 'economic'
  | 'creativity'
  | 'coordination'
  | 'strategy'
  | 'parallel';

export type MemoryCategory =
  | 'short_term'
  | 'episodic'
  | 'factual'
  | 'relationship'
  | 'emotional';

export type NpcMood =
  | 'warm'
  | 'curious'
  | 'focused'
  | 'amused'
  | 'tired'
  | 'guarded'
  | 'irritated'
  | 'neutral';

export type NpcGesture = 'idle' | 'nod' | 'wave' | 'shrug' | 'explain' | 'laugh' | 'dismiss';

export type FlowStage =
  | 'IDLE'
  | 'OBSERVE'
  | 'UNDERSTAND'
  | 'PLAN'
  | 'ACT'
  | 'EVALUATE'
  | 'ADAPT';

export interface OriginDefinition {
  id: OriginId;
  name: string;
  title: string;
  accentHex: string;
  secondaryHex: string;
  trimHex: number;
  summary: string;
  strengths: string[];
  tradeOff: string;
  moveSpeedMultiplier: number;
  energyDrainMultiplier: number;
  workPayoutMultiplier: number;
  maxParallelAgents: number;
  startingSkills: Record<SkillKey, number>;
}

export interface Vec2 {
  x: number;
  z: number;
}

export interface AABBCollider {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  height: number;
}

export interface BuildingDef {
  id: string;
  name: string;
  category: 'coffee_shop' | 'workplace' | 'residential' | 'market' | 'clinic' | 'school' | 'research' | 'park';
  x: number;
  z: number;
  width: number;
  depth: number;
  floors: number;
  wallColor: number;
  trimColor: number;
  roofColor: number;
  accentColor: number;
  entrance: Vec2;
  openHour: number;
  closeHour: number;
  interactable: boolean;
  description: string;
}

export interface ScheduleBlock {
  startHour: number;
  endHour: number;
  locationId: string;
  activity: string;
  anchorOffset: Vec2;
}

export interface MemoryRecord {
  id: string;
  category: MemoryCategory;
  participants: string[];
  event: string;
  location: string;
  day: number;
  minuteOfDay: number;
  emotionalSignificance: number; // 0..1
  confidence: number; // 0..1
  relationshipImpact: number; // -20..+20
}

export interface NpcAppearance {
  skinHex: number;
  hairHex: number;
  jacketHex: number;
  pantsHex: number;
  accentHex: number;
  heightScale: number;
  accessory: 'none' | 'apron' | 'satchel' | 'coat' | 'badge';
}

export interface NpcTraits {
  openness: number;
  warmth: number;
  ambition: number;
  skepticism: number;
  patience: number;
}

export interface NpcRelationship {
  trust: number; // 0..100
  familiarity: number; // 0..100
  interactionsCount: number;
  lastMetDay: number;
}

export interface NpcData {
  id: string;
  name: string;
  age: number;
  occupation: string;
  education: string;
  homeId: string;
  workplaceId: string;
  familyIds: string[];
  friendIds: string[];
  appearance: NpcAppearance;
  traits: NpcTraits;
  balance: number;
  goals: string[];
  beliefs: string[];
  knowledge: string[];
  reputation: number;
  needs: {
    energy: number;
    hunger: number;
    social: number;
    focus: number;
  };
  mood: NpcMood;
  gesture: NpcGesture;
  schedule: ScheduleBlock[];
  memories: MemoryRecord[];
  relationship: NpcRelationship;
  // Live spatial simulation state
  x: number;
  z: number;
  yaw: number;
  targetX: number;
  targetZ: number;
  speed: number;
  currentLocationId: string;
  currentActivity: string;
  inConversation: boolean;
}

export interface ChatLine {
  id: string;
  speaker: 'player' | 'npc' | 'system';
  text: string;
  day: number;
  timeFormatted: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: 'food' | 'tool' | 'book' | 'asset';
  quantity: number;
  description: string;
}

export interface ShopItemDef {
  id: string;
  placeId: string;
  name: string;
  basePrice: number;
  category: 'food' | 'tool' | 'book';
  energyRestore: number;
  skillBoost?: { skill: SkillKey; amount: number };
  description: string;
}

export interface JobDef {
  id: string;
  placeId: string;
  title: string;
  employer: string;
  basePay: number;
  durationMinutes: number;
  energyCost: number;
  skillTrained: SkillKey;
  skillGain: number;
  description: string;
}

export interface DeployedAgent {
  id: string;
  name: string;
  role: 'market_scout' | 'coffee_courier' | 'research_indexer' | 'civic_mapper';
  status: 'active' | 'paused';
  earningsPerHour: number;
  skillGenerated: SkillKey;
  totalEarned: number;
  tasksCompleted: number;
}

export interface AutonomousFlowState {
  active: boolean;
  objectiveId: string;
  objectiveLabel: string;
  stage: FlowStage;
  targetBuildingId: string | null;
  targetNpcId: string | null;
  targetX: number;
  targetZ: number;
  log: string[];
  stageTimer: number;
}

export interface KaspaTestnetState {
  connected: boolean;
  network: 'kaspa-testnet-11';
  address: string;
  simulatedTestnetBalance: number;
  txLog: Array<{
    id: string;
    label: string;
    amountTkas: number;
    timestamp: string;
    status: 'simulated_local_receipt';
  }>;
}

export interface LandParcel {
  id: string;
  name: string;
  district: string;
  price: number;
  owned: boolean;
  structure: string | null;
  dailyYield: number;
}

export interface PlayerState {
  origin: OriginId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  balance: number; // Simulated game credits ₵
  energy: number; // 0..100
  skills: Record<SkillKey, number>;
  inventory: InventoryItem[];
  jobsCompleted: number;
  discoveredJobLeads: string[];
  currentObjective: string;
  completedMilestones: string[];
  deployedAgents: DeployedAgent[];
  kaspaTestnet: KaspaTestnetState;
  landParcels: LandParcel[];
  autonomousFlow: AutonomousFlowState;
}

export interface WorldSettings {
  cameraMode: 'third' | 'first';
  fov: number;
  mouseSensitivity: number;
  timeScale: number; // simulation minutes per real second (default 1.5)
  muted: boolean;
  voiceOutput: boolean;
}

export interface WorldEvent {
  id: string;
  day: number;
  timeFormatted: string;
  text: string;
}

export interface WorldState {
  version: number;
  day: number;
  minuteOfDay: number; // 0..1439 (e.g., 495 = 08:15 AM)
  weather: WeatherType;
  economyDemandIndex: number; // 0.85..1.35 dynamic multiplier
  player: PlayerState;
  npcs: NpcData[];
  conversations: Record<string, ChatLine[]>;
  events: WorldEvent[];
  settings: WorldSettings;
  savedAtRealMs: number;
}

export interface HudSnapshot {
  day: number;
  timeFormatted: string;
  locationName: string;
  weather: WeatherType;
  balance: number;
  energy: number;
  origin: OriginId;
  currentObjective: string;
  cameraMode: 'third' | 'first';
  playerX: number;
  playerZ: number;
  playerYaw: number;
  nearbyPrompt: {
    type: 'npc' | 'building';
    id: string;
    title: string;
    subtitle: string;
    distance: number;
  } | null;
  autonomousFlow: {
    active: boolean;
    stage: FlowStage;
    objectiveLabel: string;
    latestLog: string;
  };
  minimapNpcs: Array<{ id: string; x: number; z: number; familiar: boolean }>;
  fps: number;
}

export const ORIGINS: Record<OriginId, OriginDefinition> = {
  bitcoin: {
    id: 'bitcoin',
    name: 'Bitcoin',
    title: 'Resilient Core',
    accentHex: '#F7931A',
    secondaryHex: '#18181B',
    trimHex: 0xf7931a,
    summary: 'Built for endurance, resource conservation, and long-horizon stability.',
    strengths: ['25% lower energy drain', '+15% savings & asset yield', 'High strategic resilience'],
    tradeOff: 'Slower initial sprint acceleration',
    moveSpeedMultiplier: 0.96,
    energyDrainMultiplier: 0.75,
    workPayoutMultiplier: 1.08,
    maxParallelAgents: 2,
    startingSkills: {
      knowledge: 14,
      environmental: 16,
      social: 10,
      engineering: 12,
      economic: 20,
      creativity: 10,
      coordination: 16,
      strategy: 22,
      parallel: 10,
    },
  },
  ethereum: {
    id: 'ethereum',
    name: 'Ethereum',
    title: 'Programmable Architect',
    accentHex: '#8B7CF6',
    secondaryHex: '#CBD5E1',
    trimHex: 0x8b7cf6,
    summary: 'Engineered for invention, complex systems design, and technical mastery.',
    strengths: ['+20% technical & engineering pay', 'Faster skill synthesis', 'Advanced builder traits'],
    tradeOff: 'Higher energy cost during sustained physical work',
    moveSpeedMultiplier: 1.0,
    energyDrainMultiplier: 1.08,
    workPayoutMultiplier: 1.18,
    maxParallelAgents: 3,
    startingSkills: {
      knowledge: 20,
      environmental: 12,
      social: 12,
      engineering: 24,
      economic: 14,
      creativity: 20,
      coordination: 10,
      strategy: 16,
      parallel: 14,
    },
  },
  solana: {
    id: 'solana',
    name: 'Solana',
    title: 'Kinetic Executor',
    accentHex: '#14F195',
    secondaryHex: '#9945FF',
    trimHex: 0x14f195,
    summary: 'Tuned for rapid movement, swift urban navigation, and fast interactions.',
    strengths: ['+20% traversal & sprint speed', 'Quick task completion', 'Agile physical coordination'],
    tradeOff: 'Narrower parallel agent capacity early on',
    moveSpeedMultiplier: 1.2,
    energyDrainMultiplier: 1.0,
    workPayoutMultiplier: 1.04,
    maxParallelAgents: 2,
    startingSkills: {
      knowledge: 12,
      environmental: 20,
      social: 18,
      engineering: 14,
      economic: 14,
      creativity: 14,
      coordination: 24,
      strategy: 12,
      parallel: 14,
    },
  },
  kaspa: {
    id: 'kaspa',
    name: 'Kaspa',
    title: 'Parallel Coordinator',
    accentHex: '#49EACB',
    secondaryHex: '#F8FAFC',
    trimHex: 0x49eacb,
    summary: 'Architected for simultaneous task execution, coordination, and distributed agents.',
    strengths: ['Up to 4 parallel AI agents', 'Fast social & civic coordination', 'Balanced mobility'],
    tradeOff: 'Requires active delegation to maximize income',
    moveSpeedMultiplier: 1.06,
    energyDrainMultiplier: 0.94,
    workPayoutMultiplier: 1.02,
    maxParallelAgents: 4,
    startingSkills: {
      knowledge: 16,
      environmental: 16,
      social: 18,
      engineering: 16,
      economic: 16,
      creativity: 14,
      coordination: 16,
      strategy: 16,
      parallel: 26,
    },
  },
};

export const SKILL_LABELS: Record<SkillKey, string> = {
  knowledge: 'Knowledge Acquisition',
  environmental: 'Environmental Awareness',
  social: 'Social Intelligence',
  engineering: 'Systems Engineering',
  economic: 'Economic Literacy',
  creativity: 'Creative Synthesis',
  coordination: 'Physical Coordination',
  strategy: 'Strategic Planning',
  parallel: 'Parallel Processing',
};
