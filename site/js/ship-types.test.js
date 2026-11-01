import test from 'node:test';
import assert from 'node:assert/strict';
import { buildShipTypeBreakdown, shipTypeIcon, sortShipTypeBreakdown } from './ship-types.js';

test('aggregates sunk and lost blocks independently by ship type', () => {
  assert.deepEqual(buildShipTypeBreakdown(
    [
      { type: 'Frigate', blocks: 8000 },
      { type: 'Frigate', blocks: 4500 },
      { type: 'Corvette', blocks: 3000 },
    ],
    [
      { type: 'Frigate', blocks: 6500 },
      { type: 'Destroyer', blocks: 10000 },
    ],
  ), [
    { type: 'Corvette', sunkBlocks: 3000, lostBlocks: 0 },
    { type: 'Frigate', sunkBlocks: 12500, lostBlocks: 6500 },
    { type: 'Destroyer', sunkBlocks: 0, lostBlocks: 10000 },
  ]);
});

test('orders ship variants by their maximum block size, then alphabetically', () => {
  const rows = buildShipTypeBreakdown([
    ...['Platform', 'Battlecruiser', 'Corvette', 'Speeder', 'Assault Corvette', 'Interceptor', 'Barge']
      .map((type) => ({ type, blocks: 1 })),
  ]);
  assert.deepEqual(rows.map((row) => row.type), [
    'Speeder', 'Interceptor', 'Corvette', 'Assault Corvette', 'Barge', 'Battlecruiser', 'Platform',
  ]);
});

test('sorts ship types by maximum size and block counts in either direction', () => {
  const rows = [
    { type: 'Frigate', sunkBlocks: 120, lostBlocks: 10 },
    { type: 'Corvette', sunkBlocks: 400, lostBlocks: 80 },
    { type: 'Destroyer', sunkBlocks: 250, lostBlocks: 30 },
    { type: 'Battlecruiser', sunkBlocks: 500, lostBlocks: 50 },
    { type: 'Barge', sunkBlocks: 600, lostBlocks: 60 },
  ];

  assert.deepEqual(sortShipTypeBreakdown(rows, 'type', 'asc').map((row) => row.type), [
    'Corvette', 'Frigate', 'Destroyer', 'Barge', 'Battlecruiser',
  ]);
  assert.deepEqual(sortShipTypeBreakdown(rows, 'type', 'desc').map((row) => row.type), [
    'Barge', 'Battlecruiser', 'Destroyer', 'Frigate', 'Corvette',
  ]);
  assert.deepEqual(sortShipTypeBreakdown(rows, 'sunkBlocks', 'desc').map((row) => row.type), [
    'Barge', 'Battlecruiser', 'Corvette', 'Destroyer', 'Frigate',
  ]);
  assert.deepEqual(sortShipTypeBreakdown(rows, 'lostBlocks', 'asc').map((row) => row.type), [
    'Frigate', 'Destroyer', 'Battlecruiser', 'Barge', 'Corvette',
  ]);
});

test('uses Ion hull icons for specialized ship variants and a generic fallback', () => {
  assert.equal(shipTypeIcon('Blockade Runner'), './assets/ships/light_freighter.png');
  assert.equal(shipTypeIcon('Assault Frigate'), './assets/ships/frigate.png');
  assert.equal(shipTypeIcon('Industrial Command Ship'), './assets/ships/barge.png');
  assert.equal(shipTypeIcon('Platform'), './assets/ships/generic_starship.png');
});