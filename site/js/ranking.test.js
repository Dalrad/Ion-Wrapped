import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildChatMessageRanking,
  buildPeakShipDayRanking,
  rankOf,
} from './ranking.js';

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