import test from 'node:test';
import assert from 'node:assert/strict';
import { peakShipDay } from './ship-days.js';

test('selects the day with the greatest combined blocks and resolves ties by earliest date', () => {
  const days = [
    { date: '2026-03-03', ships: [{ blocks: 40 }, { blocks: 60 }] },
    { date: '2026-03-02', ships: [{ blocks: 100 }] },
    { date: '2026-03-01', ships: [{ blocks: 99 }] },
  ];

  assert.deepEqual(peakShipDay(days), { date: '2026-03-02', ships: [{ blocks: 100 }], blocks: 100 });
});

test('returns null when there are no recorded ship days', () => {
  assert.equal(peakShipDay([]), null);
});
