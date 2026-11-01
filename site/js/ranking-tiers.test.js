import test from 'node:test';
import assert from 'node:assert/strict';
import { createRanking, dailyLevelGains, killDeathRatio, rankOf } from './ranking.js';

test('aggregates positive level increases by the increase event UTC date', () => {
  const gains = dailyLevelGains([
    { level: 8, at: '2026-03-03T12:00:00.000Z' },
    { level: 7, at: '2026-03-02T09:00:00.000Z' },
    { level: 9, at: '2026-03-02T18:00:00.000Z' },
    { level: 4, at: '2026-03-01T23:30:00.000Z' },
    { level: 6, at: '2026-03-03T00:30:00.000Z' },
    { level: 7, at: '2026-03-02T02:30:00.000+02:00' },
  ]);

  assert.deepEqual([...gains], [['2026-03-02', 5], ['2026-03-03', 2]]);
});

test('assigns tiers by rank within the pool, with gold for rank one', () => {
  const pool = createRanking(Array.from({ length: 200 }, (_, index) => index + 1));
  const tier = (value) => rankOf(pool, value).tier;
  assert.equal(tier(200), 'gold');
  assert.equal(tier(199), 'pink');
  assert.equal(tier(191), 'orange');
  assert.equal(tier(151), 'purple');
  assert.equal(tier(101), 'blue');
  assert.equal(tier(51), 'green');
  assert.equal(tier(50), 'gray');
  assert.equal(rankOf(pool, 191).label, 'TOP 5%');
  assert.equal(rankOf(pool, 10).label, 'BOTTOM 25%');
});

test('ties share the best rank and empty pools are unranked', () => {
  const pool = createRanking([5, 5, 3, 1]);
  assert.equal(rankOf(pool, 5).tier, 'gold');
  assert.equal(rankOf(pool, 3).rank, 3);
  assert.equal(rankOf([], 1), null);
  assert.equal(rankOf(pool, Number.NaN), null);
});

test('kill death ratio combines kills and assists and treats zero deaths as one', () => {
  assert.equal(killDeathRatio({ finalKills: 6, assists: 2, deaths: 4 }), 2);
  assert.equal(killDeathRatio({ finalKills: 3, assists: 1, deaths: 0 }), 4);
});
