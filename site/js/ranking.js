import { peakShipDay } from './ship-days.js';
import { buildBestShipClass } from './ship-types.js';

export const MIN_RATE_EVENTS = 5;

const TIERS = [
  { name: 'pink', maxTop: 0.01 },
  { name: 'orange', maxTop: 0.05 },
  { name: 'purple', maxTop: 0.25 },
  { name: 'blue', maxTop: 0.5 },
  { name: 'green', maxTop: 0.75 },
];

export function killDeathRatio({ finalKills, assists, deaths }) {
  return (finalKills + assists) / Math.max(deaths, 1);
}

export function createRanking(values) {
  return values.filter(Number.isFinite).sort((left, right) => left - right);
}

export function buildChatMessageRanking(pilots) {
  return createRanking(pilots.map((pilot) => pilot.gameChatMessages).filter((value) => Number.isFinite(value) && value >= 0));
}

export function buildPeakShipDayRanking(pilots, recordKey) {
  return createRanking(pilots.flatMap((pilot) => {
    const peak = peakShipDay(pilot[recordKey]?.byDay ?? []);
    return peak ? [peak.blocks] : [];
  }));
}

export function buildBestClassRankings(pilots) {
  const pools = {
    bestClassRatios: [],
    bestClassFinalKills: [],
    bestClassAssists: [],
    bestClassSunkBlocks: [],
    bestClassLostBlocks: [],
  };
  for (const pilot of pilots) {
    const bestClass = buildBestShipClass(
      pilot.shipsSunk?.byShip ?? [],
      pilot.shipsUsed ?? [],
      pilot.shipsLost?.byShip ?? [],
    );
    if (!bestClass) continue;
    pools.bestClassFinalKills.push(bestClass.finalKills);
    pools.bestClassAssists.push(bestClass.assists);
    pools.bestClassSunkBlocks.push(bestClass.sunkBlocks);
    pools.bestClassLostBlocks.push(bestClass.lostBlocks);
    if (bestClass.finalKills + bestClass.assists + bestClass.deaths >= MIN_RATE_EVENTS) {
      pools.bestClassRatios.push(killDeathRatio(bestClass));
    }
  }
  return Object.fromEntries(
    Object.entries(pools).map(([name, values]) => [name, createRanking(values)]),
  );
}

export function dailyLevelGains(events) {
  const orderedEvents = events
    .filter((event) => Number.isFinite(event.level) && Number.isFinite(Date.parse(event.at)))
    .slice()
    .sort((left, right) => Date.parse(left.at) - Date.parse(right.at));
  const gainsByDay = new Map();
  let previousLevel = null;

  for (const event of orderedEvents) {
    if (previousLevel !== null && event.level > previousLevel) {
      const day = new Date(event.at).toISOString().slice(0, 10);
      gainsByDay.set(day, (gainsByDay.get(day) ?? 0) + event.level - previousLevel);
    }
    previousLevel = event.level;
  }

  return gainsByDay;
}

// Ties share the best rank, so equal values always land in the same tier.
export function rankOf(sortedValues, value) {
  const total = sortedValues.length;
  if (!total || !Number.isFinite(value)) return null;
  let low = 0;
  let high = total;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (sortedValues[middle] > value) high = middle;
    else low = middle + 1;
  }
  const rank = total - low + 1;
  const top = rank / total;
  if (rank === 1) return { tier: 'gold', rank, total, label: 'RANK #1' };
  const tier = TIERS.find((candidate) => top <= candidate.maxTop)?.name ?? 'gray';
  const label = tier === 'gray' ? 'BOTTOM 25%' : `TOP ${Math.max(1, Math.ceil(top * 100))}%`;
  return { tier, rank, total, label };
}

export function rankOfBestClassMetric(sortedValues, value) {
  const rank = rankOf(sortedValues, value);
  return value === 0 && rank ? { ...rank, tier: 'gray', label: 'TOP 0%' } : rank;
}
