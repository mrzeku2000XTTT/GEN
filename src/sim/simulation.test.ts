import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyConversationOutcome,
  applyOfflineCatchUp,
  completeJobShift,
  createInitialWorldState,
  deployHelperAgent,
  purchaseLandParcel,
  purchaseShopItem,
  restUntilNextMorning,
  retrieveRelevantMemories,
  startAutonomousObjective,
  stepWorldSimulation,
} from './behaviorEngine';
import { BUILDING_COLLIDERS, PLAYER_SPAWN, resolvePlayerCollision } from './worldLayout';

test('initial world spawns 20 unique NPCs and valid clear player spawn', () => {
  const world = createInitialWorldState('kaspa');
  assert.equal(world.npcs.length, 20);
  const ids = new Set(world.npcs.map((n) => n.id));
  assert.equal(ids.size, 20);

  const spawnCheck = resolvePlayerCollision(
    PLAYER_SPAWN.x,
    PLAYER_SPAWN.z,
    PLAYER_SPAWN.x,
    PLAYER_SPAWN.z,
    0.45,
    BUILDING_COLLIDERS
  );
  assert.equal(spawnCheck.collided, false);
});

test('collision resolution prevents entering building volumes and slides cleanly', () => {
  // Attempt to walk into Hearth & Grain Coffee (x: 22, width: 14 => minX = 14.65)
  const res = resolvePlayerCollision(13.5, 6, 16.0, 6.2, 0.45, BUILDING_COLLIDERS);
  assert.equal(res.collided, true);
  assert.ok(res.x <= 14.21, `Expected player X to be pushed outside building, got ${res.x}`);
});

test('conversation records episodic memories that persist and are retrieved on Day 2', () => {
  const world = createInitialWorldState('ethereum');
  const maya = world.npcs.find((n) => n.id === 'npc_maya');
  assert.ok(maya);

  const mem = applyConversationOutcome(world, 'npc_maya', 'Hi Maya, do you recommend the espresso?', {
    reply: 'Always try our morning single-origin roast!',
    mood: 'warm',
    trustDelta: 8,
    memorySummary: 'The newcomer asked about the single-origin espresso at Hearth & Grain.',
    emotionalSignificance: 0.75,
    gesture: 'wave',
    jobHint: 'barista_assist',
  });

  assert.ok(mem);
  assert.equal(maya.relationship.interactionsCount, 1);
  assert.ok(world.player.discoveredJobLeads.includes('barista_assist'));

  // Advance to Day 2 morning
  const rest = restUntilNextMorning(world);
  assert.equal(rest.ok, true);
  assert.equal(world.day, 2);

  // Retrieve relevant memories about coffee/espresso on Day 2
  const recalled = retrieveRelevantMemories(maya, 'espresso coffee morning', world.day, 4);
  assert.ok(
    recalled.some((m) => m.event.toLowerCase().includes('single-origin espresso')),
    'Expected Maya to recall the Day 1 espresso conversation on Day 2'
  );
});

test('economy loop supports earning wages, purchasing items, deploying agents, and acquiring land', () => {
  const world = createInitialWorldState('bitcoin');
  const initialBalance = world.player.balance;

  const jobRes = completeJobShift(world, 'sensor_calibration');
  assert.equal(jobRes.ok, true);
  assert.ok(world.player.balance > initialBalance);
  assert.equal(world.player.jobsCompleted, 1);

  const buyRes = purchaseShopItem(world, 'single_origin_espresso');
  assert.equal(buyRes.ok, true);
  assert.equal(world.player.inventory.length, 1);

  // Give credits to test agent & land purchase
  world.player.balance = 500;
  const agentRes = deployHelperAgent(world, 'agent_market_scout');
  assert.equal(agentRes.ok, true);
  assert.equal(world.player.deployedAgents.length, 1);

  const landRes = purchaseLandParcel(world, 'parcel_east_kiosk');
  assert.equal(landRes.ok, true);
  assert.equal(world.player.landParcels[0].owned, true);
});

test('offline catch-up advances world deterministically and credits active agents', () => {
  const world = createInitialWorldState('kaspa');
  world.player.balance = 200;
  deployHelperAgent(world, 'agent_coffee_courier');
  const balanceAfterDeploy = world.player.balance;

  // Simulate 15 real minutes elapsed
  const futureMs = world.savedAtRealMs + 15 * 60 * 1000;
  const summary = applyOfflineCatchUp(world, futureMs);
  assert.ok(summary);
  assert.ok(world.player.balance > balanceAfterDeploy);
});

test('autonomous computational flow progresses through OBSERVE -> UNDERSTAND -> PLAN -> ACT', () => {
  const world = createInitialWorldState('solana');
  const started = startAutonomousObjective(world, 'auto_buy_coffee');
  assert.equal(started, true);
  assert.equal(world.player.autonomousFlow.stage, 'OBSERVE');

  for (let i = 0; i < 30; i++) {
    stepWorldSimulation(world, 0.1);
  }
  assert.equal(world.player.autonomousFlow.stage, 'ACT');
});
