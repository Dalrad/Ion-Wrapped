const iconByType = {
  'assault corvette': 'corvette',
  'assault destroyer': 'destroyer',
  'assault frigate': 'frigate',
  'assault gunship': 'gunship',
  barge: 'barge',
  battlecruiser: 'battlecruiser',
  'black ops frigate': 'frigate',
  'blockade runner': 'light_freighter',
  corvette: 'corvette',
  cruiser: 'cruiser',
  destroyer: 'destroyer',
  frigate: 'frigate',
  gunship: 'gunship',
  'heavy freighter': 'heavy_freighter',
  'industrial command ship': 'barge',
  interceptor: 'starfighter',
  'interdictor corvette': 'corvette',
  'interdictor destroyer': 'destroyer',
  'interdictor gunship': 'gunship',
  'jump freighter': 'barge',
  lancer: 'battlecruiser',
  'light freighter': 'light_freighter',
  'logistics corvette': 'corvette',
  'logistics cruiser': 'cruiser',
  'medium freighter': 'medium_freighter',
  'missile cruiser': 'cruiser',
  'missile frigate': 'frigate',
  'recon craft': 'starfighter',
  'recon fighter': 'starfighter',
  scrambler: 'starfighter',
  shuttle: 'shuttle',
  speeder: 'starfighter',
  starfighter: 'starfighter',
  'stasis corvette': 'corvette',
  transport: 'transport',
};

const maxSizeByType = {
  speeder: 100,
  interceptor: 350,
  starfighter: 500,
  scrambler: 500,
  shuttle: 1000,
  'recon craft': 1000,
  'recon fighter': 1000,
  gunship: 2000,
  transport: 2000,
  'assault gunship': 2500,
  'interdictor gunship': 2500,
  corvette: 4000,
  'light freighter': 4000,
  'assault corvette': 4500,
  'blockade runner': 4500,
  'logistics corvette': 4500,
  'stasis corvette': 4500,
  frigate: 8000,
  'medium freighter': 8000,
  'assault frigate': 8500,
  'black ops frigate': 8500,
  'missile frigate': 8500,
  destroyer: 12000,
  'heavy freighter': 12000,
  'assault destroyer': 12500,
  'interdictor destroyer': 12500,
  cruiser: 16000,
  'logistics cruiser': 16500,
  'missile cruiser': 16500,
  barge: 20000,
  battlecruiser: 20000,
  lancer: 32000,
  'jump freighter': 32000,
  'industrial command ship': 32000,
  platform: 2000000,
};

export function shipTypeIcon(type) {
  const key = String(type ?? '').trim().toLocaleLowerCase('en-US');
  return `./assets/ships/${iconByType[key] ?? 'generic_starship'}.png`;
}

function maxSizeOf(type) {
  const key = String(type ?? '').trim().toLocaleLowerCase('en-US');
  return maxSizeByType[key] ?? Number.POSITIVE_INFINITY;
}

export function sortShipTypeBreakdown(rows, key, direction = 'asc') {
  if (!['type', 'sunkBlocks', 'lostBlocks'].includes(key)) return [...rows];
  const multiplier = direction === 'desc' ? -1 : 1;
  return [...rows].sort((left, right) => {
    const comparison = key === 'type'
      ? maxSizeOf(left.type) - maxSizeOf(right.type)
      : Number(left[key] ?? 0) - Number(right[key] ?? 0);
    return comparison * multiplier || left.type.localeCompare(right.type, 'en-US');
  });
}

export function buildShipTypeBreakdown(sunkShips = [], lostShips = []) {
  const totals = new Map();
  for (const [ships, metric] of [[sunkShips, 'sunkBlocks'], [lostShips, 'lostBlocks']]) {
    for (const ship of ships) {
      const type = ship.type?.trim() || 'Unknown type';
      const total = totals.get(type) ?? { type, sunkBlocks: 0, lostBlocks: 0 };
      const blocks = Number(ship.blocks);
      total[metric] += Number.isFinite(blocks) ? blocks : 0;
      totals.set(type, total);
    }
  }
  return [...totals.values()].sort((left, right) =>
    maxSizeOf(left.type) - maxSizeOf(right.type)
    || left.type.localeCompare(right.type, 'en-US'));
}