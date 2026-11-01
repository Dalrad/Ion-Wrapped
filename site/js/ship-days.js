export function peakShipDay(days) {
  let peak = null;
  for (const day of days) {
    const blocks = day.ships.reduce((total, ship) => total + ship.blocks, 0);
    if (!peak || blocks > peak.blocks || (blocks === peak.blocks && day.date < peak.date)) {
      peak = { ...day, blocks };
    }
  }
  return peak;
}
