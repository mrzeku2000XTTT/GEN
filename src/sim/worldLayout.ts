import { AABBCollider, BuildingDef, JobDef, LandParcel, ShopItemDef, Vec2 } from './types';

export const WORLD_HALF_EXTENT = 54;

export const PLAYER_SPAWN: { x: number; z: number; yaw: number } = {
  x: 0,
  z: 16,
  yaw: 0, // Faces -Z directly toward Central Park Fountain & Clock Spire landmark
};

export const BUILDINGS: BuildingDef[] = [
  {
    id: 'hearth_coffee',
    name: 'Hearth & Grain Coffee',
    category: 'coffee_shop',
    x: 22,
    z: 6,
    width: 14,
    depth: 12,
    floors: 2,
    wallColor: 0x8e563f,
    trimColor: 0x2f2521,
    roofColor: 0x3b3532,
    accentColor: 0xd98a3c,
    entrance: { x: 13.8, z: 6 },
    openHour: 6,
    closeHour: 21,
    interactable: true,
    description: 'Neighborhood espresso bar and bakery where locals start their mornings and trade neighborhood news.',
  },
  {
    id: 'meridian_studio',
    name: 'Meridian Civic Studio',
    category: 'workplace',
    x: -24,
    z: -12,
    width: 18,
    depth: 14,
    floors: 4,
    wallColor: 0x4b5869,
    trimColor: 0x1e2530,
    roofColor: 0x262e3a,
    accentColor: 0x4ca6c8,
    entrance: { x: -13.8, z: -12 },
    openHour: 7,
    closeHour: 20,
    interactable: true,
    description: 'Co-working studio, civil engineering hub, and local contract employment board.',
  },
  {
    id: 'alder_market',
    name: 'Alder Corner Market',
    category: 'market',
    x: 24,
    z: -18,
    width: 15,
    depth: 12,
    floors: 2,
    wallColor: 0xc2b59f,
    trimColor: 0x354739,
    roofColor: 0x464a4d,
    accentColor: 0x3f8f63,
    entrance: { x: 15.2, z: -18 },
    openHour: 7,
    closeHour: 22,
    interactable: true,
    description: 'Fresh grocer, hardware counter, and household supply exchange with dynamic local prices.',
  },
  {
    id: 'cedar_apt_north',
    name: 'Cedar Row North',
    category: 'residential',
    x: -24,
    z: 18,
    width: 16,
    depth: 12,
    floors: 3,
    wallColor: 0xb78b73,
    trimColor: 0x3c3430,
    roofColor: 0x3f3c3a,
    accentColor: 0xc9a679,
    entrance: { x: -14.8, z: 18 },
    openHour: 0,
    closeHour: 24,
    interactable: true,
    description: 'Warm brick neighborhood residences. Rest here to advance cleanly to the next morning.',
  },
  {
    id: 'cedar_apt_south',
    name: 'Elm Terrace Flats',
    category: 'residential',
    x: 24,
    z: 28,
    width: 16,
    depth: 12,
    floors: 3,
    wallColor: 0x9aa39c,
    trimColor: 0x2c3330,
    roofColor: 0x363b3e,
    accentColor: 0x879c8e,
    entrance: { x: 14.8, z: 28 },
    openHour: 0,
    closeHour: 24,
    interactable: true,
    description: 'Quiet garden-facing apartment block housing teachers, nurses, and local tradespeople.',
  },
  {
    id: 'civic_clinic',
    name: 'Alder Health Clinic',
    category: 'clinic',
    x: -2,
    z: -34,
    width: 18,
    depth: 11,
    floors: 2,
    wallColor: 0xdce2e6,
    trimColor: 0x334756,
    roofColor: 0x4a5562,
    accentColor: 0x2f9e8f,
    entrance: { x: -2, z: -27.2 },
    openHour: 6,
    closeHour: 22,
    interactable: true,
    description: 'Community medical clinic and wellness center open to neighborhood residents.',
  },
  {
    id: 'alder_school',
    name: 'Oakridge Academy',
    category: 'school',
    x: -26,
    z: -34,
    width: 16,
    depth: 11,
    floors: 2,
    wallColor: 0xa6674c,
    trimColor: 0xe2d8c7,
    roofColor: 0x443b38,
    accentColor: 0xc58a4b,
    entrance: { x: -26, z: -27.2 },
    openHour: 7,
    closeHour: 17,
    interactable: false,
    description: 'Public neighborhood school and evening adult study hall.',
  },
  {
    id: 'research_annex',
    name: 'Northlight Research Annex',
    category: 'research',
    x: 24,
    z: -36,
    width: 15,
    depth: 11,
    floors: 3,
    wallColor: 0x5c6470,
    trimColor: 0x222933,
    roofColor: 0x2a323e,
    accentColor: 0x7398d6,
    entrance: { x: 24, z: -29.2 },
    openHour: 8,
    closeHour: 20,
    interactable: true,
    description: 'Applied urban robotics, environmental sensing, and open-data research lab.',
  },
];

export const PARK_WAYPOINTS: Record<string, Vec2> = {
  central_park: { x: 0, z: -2 },
  plaza_south: { x: 0, z: 10 },
  fountain_east: { x: 6.5, z: -1 },
  fountain_west: { x: -6.5, z: -1 },
  north_promenade: { x: 0, z: -18 },
  transit_stop: { x: 0, z: 30 },
};

export const BUILDING_COLLIDERS: AABBCollider[] = [
  ...BUILDINGS.map((b) => ({
    id: b.id,
    minX: b.x - b.width / 2 - 0.35,
    maxX: b.x + b.width / 2 + 0.35,
    minZ: b.z - b.depth / 2 - 0.35,
    maxZ: b.z + b.depth / 2 + 0.35,
    height: b.floors * 3.8 + 1.5,
  })),
  // Central Park Fountain basin collider
  {
    id: 'central_fountain',
    minX: -2.9,
    maxX: 2.9,
    minZ: -5.4,
    maxZ: 0.4,
    height: 2.0,
  },
  // Clock Spire monument base at north end of park
  {
    id: 'clock_spire',
    minX: -2.3,
    maxX: 2.3,
    minZ: -17.3,
    maxZ: -12.7,
    height: 16,
  },
];

export const SHOP_ITEMS: ShopItemDef[] = [
  {
    id: 'single_origin_espresso',
    placeId: 'hearth_coffee',
    name: 'Single-Origin Espresso',
    basePrice: 6,
    category: 'food',
    energyRestore: 18,
    skillBoost: { skill: 'environmental', amount: 2 },
    description: 'Freshly pulled roast from Hearth & Grain. Sharpens sensory clarity and restores energy.',
  },
  {
    id: 'cardamom_croissant',
    placeId: 'hearth_coffee',
    name: 'Cardamom Croissant',
    basePrice: 8,
    category: 'food',
    energyRestore: 28,
    skillBoost: { skill: 'social', amount: 1 },
    description: 'Warm pastry baked at dawn. A favorite conversation starter at the outdoor tables.',
  },
  {
    id: 'urban_field_notebook',
    placeId: 'hearth_coffee',
    name: 'Neighborhood Field Notebook',
    basePrice: 18,
    category: 'book',
    energyRestore: 0,
    skillBoost: { skill: 'knowledge', amount: 6 },
    description: 'Hand-bound notebook for logging human routines, idioms, and civic patterns.',
  },
  {
    id: 'fresh_provisions',
    placeId: 'alder_market',
    name: 'Market Provisions Pack',
    basePrice: 14,
    category: 'food',
    energyRestore: 45,
    description: 'Balanced groceries that sustain physical avatar operations through a full workday.',
  },
  {
    id: 'diagnostic_multimeter',
    placeId: 'alder_market',
    name: 'Precision Multimeter',
    basePrice: 38,
    category: 'tool',
    energyRestore: 0,
    skillBoost: { skill: 'engineering', amount: 8 },
    description: 'Calibrated diagnostic tool useful for electronics repair and civic sensor work.',
  },
  {
    id: 'civic_economics_primer',
    placeId: 'research_annex',
    name: 'Local Economy & Systems Primer',
    basePrice: 32,
    category: 'book',
    energyRestore: 0,
    skillBoost: { skill: 'economic', amount: 9 },
    description: 'Monograph on supply chains, municipal infrastructure, and cooperative enterprise.',
  },
  {
    id: 'parallel_scheduler_module',
    placeId: 'research_annex',
    name: 'Parallel Task Scheduler Guide',
    basePrice: 45,
    category: 'tool',
    energyRestore: 0,
    skillBoost: { skill: 'parallel', amount: 10 },
    description: 'Architectural notes on coordinating concurrent autonomous sub-agents.',
  },
];

export const JOBS: JobDef[] = [
  {
    id: 'barista_assist',
    placeId: 'hearth_coffee',
    title: 'Morning Counter & Roastery Assist',
    employer: 'Hearth & Grain Coffee',
    basePay: 28,
    durationMinutes: 90,
    energyCost: 16,
    skillTrained: 'social',
    skillGain: 5,
    description: 'Assist Maya with espresso prep, greet morning regulars, and restock beans.',
  },
  {
    id: 'sensor_calibration',
    placeId: 'meridian_studio',
    title: 'Urban Traffic Sensor Calibration',
    employer: 'Meridian Civic Studio',
    basePay: 48,
    durationMinutes: 120,
    energyCost: 22,
    skillTrained: 'engineering',
    skillGain: 7,
    description: 'Audit municipal traffic intersection telemetry and verify signal timing schedules.',
  },
  {
    id: 'market_inventory',
    placeId: 'alder_market',
    title: 'Supply Ledger & Stock Audit',
    employer: 'Alder Corner Market',
    basePay: 34,
    durationMinutes: 90,
    energyCost: 18,
    skillTrained: 'economic',
    skillGain: 6,
    description: 'Reconcile morning produce deliveries with Dev Patel and update shelf pricing.',
  },
  {
    id: 'climate_dataset_review',
    placeId: 'research_annex',
    title: 'Microclimate Dataset Synthesis',
    employer: 'Northlight Research Annex',
    basePay: 62,
    durationMinutes: 150,
    energyCost: 26,
    skillTrained: 'knowledge',
    skillGain: 9,
    description: 'Clean neighborhood air-quality logs and draft anomaly summaries for researchers.',
  },
];

export const INITIAL_LAND_PARCELS: LandParcel[] = [
  {
    id: 'parcel_east_kiosk',
    name: 'East Plaza Micro-Kiosk Lot',
    district: 'Alder Creek Plaza',
    price: 240,
    owned: false,
    structure: null,
    dailyYield: 24,
  },
  {
    id: 'parcel_studio_loft',
    name: 'Cedar Row Workshop Loft',
    district: 'Cedar Row',
    price: 480,
    owned: false,
    structure: null,
    dailyYield: 52,
  },
  {
    id: 'parcel_solar_node',
    name: 'Northlight Microgrid Plot',
    district: 'Research Corridor',
    price: 820,
    owned: false,
    structure: null,
    dailyYield: 95,
  },
];

export function resolvePlayerCollision(
  currentX: number,
  currentZ: number,
  nextX: number,
  nextZ: number,
  radius: number,
  colliders: AABBCollider[] = BUILDING_COLLIDERS
): { x: number; z: number; collided: boolean } {
  const limit = WORLD_HALF_EXTENT - radius;
  let x = Math.max(-limit, Math.min(limit, nextX));
  let z = Math.max(-limit, Math.min(limit, nextZ));
  let collided = x !== nextX || z !== nextZ;

  // Resolve X and Z independently for smooth wall sliding
  for (const box of colliders) {
    const insideX = x + radius > box.minX && x - radius < box.maxX;
    const insideZ = z + radius > box.minZ && z - radius < box.maxZ;
    if (insideX && insideZ) {
      collided = true;
      const overlapLeft = Math.abs(x + radius - box.minX);
      const overlapRight = Math.abs(box.maxX - (x - radius));
      const overlapTop = Math.abs(z + radius - box.minZ);
      const overlapBottom = Math.abs(box.maxZ - (z - radius));
      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

      if (minOverlap === overlapLeft) {
        x = box.minX - radius;
      } else if (minOverlap === overlapRight) {
        x = box.maxX + radius;
      } else if (minOverlap === overlapTop) {
        z = box.minZ - radius;
      } else {
        z = box.maxZ + radius;
      }
    }
  }

  // Fallback guard if still embedded inside a collider corner
  for (const box of colliders) {
    if (x + radius > box.minX && x - radius < box.maxX && z + radius > box.minZ && z - radius < box.maxZ) {
      return { x: currentX, z: currentZ, collided: true };
    }
  }

  return { x, z, collided };
}

export function getBuildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}

export function getLocationPoint(locationId: string): Vec2 {
  const b = getBuildingById(locationId);
  if (b) return b.entrance;
  return PARK_WAYPOINTS[locationId] ?? PARK_WAYPOINTS.central_park;
}

export function getLocationNameAt(x: number, z: number): string {
  for (const b of BUILDINGS) {
    const dx = x - b.entrance.x;
    const dz = z - b.entrance.z;
    if (dx * dx + dz * dz < 81) {
      return b.name;
    }
  }
  if (Math.abs(x) < 12 && z > -22 && z < 16) {
    return 'Alder Creek Central Park';
  }
  if (z >= 16) {
    return 'Cedar Row Promenade';
  }
  if (z <= -22) {
    return 'Northlight Civic Avenue';
  }
  return 'Alder Creek Boulevard';
}
