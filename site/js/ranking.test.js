import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBestClassRankings,
  buildChatMessageRanking,
  buildPeakShipDayRanking,
  rankOfBestClassMetric,
  rankOf,
} from './ranking.js';

test('shows zero best-class metrics as gray 0% and keeps the maximum gold', () => {
  const ranking = [0, 0, 100, 500];

  assert.deepEqual(rankOfBestClassMetric(ranking, 0), {
    tier: 'gray',
    rank: 3,
    total: 4,
    label: 'TOP 0%',
  });
  assert.deepEqual(rankOfBestClassMetric(ranking, 500), {
    tier: 'gold',
    rank: 1,
    total: 4,
    label: 'RANK #1',
  });
});

test('ranks best-class metrics across ship classes and excludes low-sample K+A/death values', () => {
  const pilots = [
    {
      shipsSunk: { byShip: [{ type: 'Gunship', blocks: 100 }, { type: 'Frigate', blocks: 99 }] },
      shipsUsed: [
        { type: 'Gunship', finalKills: 3, assists: 1, deaths: 1 },
        { type: 'Frigate', finalKills: 20, assists: 0, deaths: 0 },
      ],
      shipsLost: { byShip: [{ type: 'Gunship', blocks: 10 }] },
    },
    {
      shipsSunk: { byShip: [{ type: 'Cruiser', blocks: 200 }] },
      shipsUsed: [{ type: 'Cruiser', finalKills: 2, assists: 3, deaths: 0 }],
      shipsLost: { byShip: [{ type: 'Cruiser', blocks: 20 }] },
    },
    {
      shipsSunk: { byShip: [{ type: 'Destroyer', blocks: 300 }] },
      shipsUsed: [{ type: 'Destroyer', finalKills: 2, assists: 1, deaths: 1 }],
      shipsLost: { byShip: [] },
    },
  ];
  const rankings = buildBestClassRankings(pilots);

  assert.deepEqual(rankings.bestClassRatios, [4, 5]);
  assert.deepEqual(rankings.bestClassFinalKills, [2, 2, 3]);
  assert.deepEqual(rankings.bestClassAssists, [1, 1, 3]);
  assert.deepEqual(rankings.bestClassSunkBlocks, [100, 200, 300]);
  assert.deepEqual(rankings.bestClassLostBlocks, [0, 10, 20]);
  assert.equal(rankOf(rankings.bestClassRatios, 5).rank, 1);
  assert.equal(rankOf(rankings.bestClassFinalKills, 3).rank, 1);
  assert.equal(rankOf(rankings.bestClassAssists, 3).rank, 1);
  assert.equal(rankOf(rankings.bestClassSunkBlocks, 300).rank, 1);
  assert.equal(rankOf(rankings.bestClassLostBlocks, 0).rank, 3);
});

test('ranks relayed chat counts against all pilots, including pilots with zero messages', () => {
  const ranking = buildChatMessageRanking([
    { gameChatMessages: 0 },
    { gameChatMessages: 4 },
    { gameChatMessages: 9 },
  ]);

  assert.deepEqual(ranking, [0, 4, 9]);
  assert.deepEqual(rankOf(ranking, 9), { tier: 'gold', rank: 1, total: 3, label: 'RANK #1' });
  assert.deepEqual(rankOf(ranking, 4), { tier: 'green', rank: 2, total: 3, label: 'TOP 67%' });
});

test('ranks peak ship days across pilots with more blocks lost earning a higher rank', () => {
  const pilots = [
    { shipsLost: { byDay: [{ date: '2026-03-01', ships: [{ blocks: 40 }] }, { date: '2026-03-02', ships: [{ blocks: 60 }] }] } },
    { shipsLost: { byDay: [{ date: '2026-03-01', ships: [{ blocks: 100 }] }] } },
    { shipsLost: { byDay: [] } },
  ];
  const ranking = buildPeakShipDayRanking(pilots, 'shipsLost');

  assert.deepEqual(ranking, [60, 100]);
  assert.deepEqual(rankOf(ranking, 100), { tier: 'gold', rank: 1, total: 2, label: 'RANK #1' });
  assert.equal(rankOf(ranking, 60).rank, 2);
});