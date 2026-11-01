import {
  MIN_RATE_EVENTS,
  buildChatMessageRanking,
  buildPeakShipDayRanking,
  createRanking,
  dailyLevelGains,
  killDeathRatio,
  rankOf,
} from './ranking.js';
import { peakShipDay } from './ship-days.js';
import { buildShipTypeBreakdown, shipTypeIcon, sortShipTypeBreakdown } from './ship-types.js';

const form = document.querySelector('#lookup-form');
const input = document.querySelector('#pilot-input');
const status = document.querySelector('#status');
const results = document.querySelector('#results');
let pilots = new Map();
let rankings = { combinedSinks: [], blocksFromSinks: [], groundKills: [], shipRatios: [], levelGains: [], chatMessages: [], bestDayBlocks: [], worstDayBlocks: [] };
let shipTypeRows = [];
let shipTypeSort = null;

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let starPointer = null;
let starFrame = 0;

window.addEventListener('pointermove', (event) => {
  if (prefersReducedMotion.matches || event.pointerType === 'touch') return;
  starPointer = { x: event.clientX, y: event.clientY };
  if (starFrame) return;
  starFrame = window.requestAnimationFrame(() => {
    starFrame = 0;
    const horizontal = starPointer.x / window.innerWidth - 0.5;
    const vertical = starPointer.y / window.innerHeight - 0.5;
    const root = document.documentElement;
    root.style.setProperty('--stars-near-x', `${horizontal * -12}px`);
    root.style.setProperty('--stars-near-y', `${vertical * -12}px`);
    root.style.setProperty('--stars-far-x', `${horizontal * 5}px`);
    root.style.setProperty('--stars-far-y', `${vertical * 5}px`);
  });
}, { passive: true });

function combinedSinksOf(pilot) {
  return pilot.playersKilled.reduce((total, entry) => total + entry.kills, 0);
}

function buildRankings(list) {
  const pools = { combinedSinks: [], blocksFromSinks: [], groundKills: [], shipRatios: [], levelGains: [] };
  for (const pilot of list) {
    if (combinedSinksOf(pilot) > 0) pools.combinedSinks.push(combinedSinksOf(pilot));
    if (pilot.shipsSunk.blocks > 0) pools.blocksFromSinks.push(pilot.shipsSunk.blocks);
    if (pilot.groundPvP.kills > 0) pools.groundKills.push(pilot.groundPvP.kills);
    pools.levelGains.push(...dailyLevelGains(pilot.levels).values());
    for (const ship of pilot.shipsUsed) {
      if (ship.kills + ship.deaths >= MIN_RATE_EVENTS) pools.shipRatios.push(killDeathRatio(ship));
    }
  }
  const rankedPools = Object.fromEntries(Object.entries(pools).map(([name, values]) => [name, createRanking(values)]));
  rankedPools.chatMessages = buildChatMessageRanking(list);
  rankedPools.bestDayBlocks = buildPeakShipDayRanking(list, 'shipsSunk');
  rankedPools.worstDayBlocks = buildPeakShipDayRanking(list, 'shipsLost');
  return rankedPools;
}

function normalize(value) {
  return value.trim().toLocaleLowerCase('en-US');
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('en-US');
}

function renderStat(label, value, detail, rank) {
  const item = makeElement('div', 'summary-stat');
  const displayValue = typeof value === 'string' ? value : formatNumber(value);
  item.append(makeElement('p', 'eyebrow', label), makeElement('strong', rank ? `tier-${rank.tier}` : '', displayValue));
  if (rank) {
    const badge = makeElement('small', `tier-${rank.tier}`, rank.label);
    badge.title = `Rank ${formatNumber(rank.rank)} of ${formatNumber(rank.total)} pilots`;
    item.append(badge);
  }
  if (detail) item.append(makeElement('span', '', detail));
  return item;
}

function renderTable(container, headings, rows, emptyMessage) {
  const pageSize = 15;
  container.replaceChildren();
  if (!rows.length) {
    container.append(makeElement('p', 'empty-note', emptyMessage));
    return;
  }
  const table = makeElement('table', 'data-table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  for (const heading of headings) headerRow.append(makeElement('th', '', heading));
  head.append(headerRow);
  const body = document.createElement('tbody');
  table.append(head, body);
  container.append(table);

  const pageCount = Math.ceil(rows.length / pageSize);
  let currentPage = 0;
  let range;
  let previous;
  let next;

  function renderPage() {
    const start = currentPage * pageSize;
    const pageRows = rows.slice(start, start + pageSize);
    body.replaceChildren();
    for (const row of pageRows) {
      const tableRow = document.createElement('tr');
      for (const value of row) tableRow.append(makeElement('td', '', String(value ?? '')));
      body.append(tableRow);
    }
    if (range) range.textContent = `Showing ${formatNumber(start + 1)}-${formatNumber(start + pageRows.length)} of ${formatNumber(rows.length)}`;
    if (previous) previous.disabled = currentPage === 0;
    if (next) next.disabled = currentPage === pageCount - 1;
  }

  if (pageCount > 1) {
    const pagination = makeElement('nav', 'table-pagination');
    pagination.setAttribute('aria-label', 'Table pages');
    range = makeElement('span', 'pagination-range');
    range.setAttribute('role', 'status');
    previous = makeElement('button', 'pagination-button', 'Previous');
    previous.type = 'button';
    previous.addEventListener('click', () => {
      if (currentPage > 0) currentPage -= 1;
      renderPage();
    });
    next = makeElement('button', 'pagination-button', 'Next');
    next.type = 'button';
    next.addEventListener('click', () => {
      if (currentPage < pageCount - 1) currentPage += 1;
      renderPage();
    });
    const buttons = makeElement('div', 'pagination-buttons');
    buttons.append(previous, next);
    pagination.append(range, buttons);
    container.append(pagination);
  }

  renderPage();
}

function renderShipTypes(pilot) {
  shipTypeRows = buildShipTypeBreakdown(pilot.shipsSunk.byShip, pilot.shipsLost.byShip);
  renderShipTypeRows();
}

function renderShipTypeMeasure(value, maximumBlocks, metric) {
  const measure = makeElement('div', `ship-type-measure ship-type-measure-${metric}`);
  const count = makeElement('span', `ship-type-count ship-type-${metric}`, formatNumber(value));
  const track = makeElement('span', 'ship-type-bar-track');
  const fill = makeElement('span', 'ship-type-bar-fill');
  fill.setAttribute('aria-hidden', 'true');
  fill.style.width = `${Math.max(0, value) / maximumBlocks * 100}%`;
  if (metric === 'sunk') track.append(count, fill);
  else track.append(fill, count);
  measure.append(track);
  return measure;
}

function renderShipTypeRows() {
  const list = document.getElementById('ship-type-list');
  const rows = shipTypeSort
    ? sortShipTypeBreakdown(shipTypeRows, shipTypeSort.key, shipTypeSort.direction)
    : shipTypeRows;
  const maximumSunkBlocks = Math.max(1, ...rows.map((row) => row.sunkBlocks));
  const maximumLostBlocks = Math.max(1, ...rows.map((row) => row.lostBlocks));
  list.replaceChildren();
  for (const button of document.querySelectorAll('.ship-type-sort')) {
    const active = shipTypeSort?.key === button.dataset.sortKey;
    button.setAttribute('aria-pressed', String(active));
    if (active) {
      button.dataset.sortDirection = shipTypeSort.direction;
      button.setAttribute('aria-label', `Sort by ${button.textContent}, currently ${shipTypeSort.direction}ending. Click to reverse.`);
    } else {
      delete button.dataset.sortDirection;
      button.removeAttribute('aria-label');
    }
  }
  if (!rows.length) {
    list.append(makeElement('li', 'empty-note', 'No ship type records found.'));
    return;
  }

  for (const row of rows) {
    const item = makeElement('li', 'ship-type-row');
    item.setAttribute('aria-label', `${row.type}: ${formatNumber(row.sunkBlocks)} blocks sunk, ${formatNumber(row.lostBlocks)} blocks lost`);
    const sunk = renderShipTypeMeasure(row.sunkBlocks, maximumSunkBlocks, 'sunk');
    const identity = makeElement('div', 'ship-type-identity');
    const icon = makeElement('img');
    icon.src = shipTypeIcon(row.type);
    icon.alt = '';
    icon.width = 40;
    icon.height = 40;
    icon.loading = 'lazy';
    icon.decoding = 'async';
    identity.append(icon, makeElement('span', '', row.type));
    const lost = renderShipTypeMeasure(row.lostBlocks, maximumLostBlocks, 'lost');
    item.append(sunk, identity, lost);
    list.append(item);
  }
}

document.getElementById('ship-type-labels').addEventListener('click', (event) => {
  const button = event.target.closest('.ship-type-sort');
  if (!button) return;
  const key = button.dataset.sortKey;
  const direction = shipTypeSort?.key === key
    ? shipTypeSort.direction === 'asc' ? 'desc' : 'asc'
    : key === 'type' ? 'asc' : 'desc';
  shipTypeSort = { key, direction };
  renderShipTypeRows();
});

function renderOpponents(pilot) {
  renderTable(
    document.getElementById('killed-table'),
    ['Pilot', 'Final', 'Assist', 'Combined'],
    pilot.playersKilled.map((entry) => [entry.name, formatNumber(entry.finalKills), formatNumber(entry.assists), formatNumber(entry.kills)]),
    'No combined player sinks found.',
  );
  renderTable(
    document.getElementById('killed-by-table'),
    ['Pilot', 'Final', 'Assist', 'Combined'],
    pilot.killedBy.map((entry) => [entry.name, formatNumber(entry.finalKills), formatNumber(entry.assists), formatNumber(entry.kills)]),
    'No player sink losses found.',
  );
}

function renderLevels(pilot) {
  const totalGained = [...dailyLevelGains(pilot.levels).values()].reduce((total, gain) => total + gain, 0);
  document.getElementById('level-total').textContent = `${formatNumber(totalGained)} levels gained`;
  const year = 2026;
  const monthsWithData = 10;
  const gainsByDay = dailyLevelGains(pilot.levels);
  const calendar = document.getElementById('level-calendar');
  calendar.replaceChildren();

  for (let month = 0; month < monthsWithData; month += 1) {
    const monthElement = makeElement('section', 'calendar-month');
    monthElement.setAttribute('aria-label', new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }));
    const monthTitle = makeElement('h4', '', new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }));
    const grid = makeElement('div', 'calendar-grid');
    grid.setAttribute('role', 'grid');
    grid.setAttribute('aria-label', monthElement.getAttribute('aria-label'));

    for (const weekday of ['M', 'T', 'W', 'T', 'F', 'S', 'S']) {
      const label = makeElement('span', 'calendar-weekday', weekday);
      label.setAttribute('aria-hidden', 'true');
      grid.append(label);
    }

    const firstWeekday = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
    for (let blank = 0; blank < firstWeekday; blank += 1) {
      const empty = makeElement('span', 'calendar-day calendar-empty');
      empty.setAttribute('aria-hidden', 'true');
      grid.append(empty);
    }

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(Date.UTC(year, month, day));
      const key = date.toISOString().slice(0, 10);
      const gain = gainsByDay.get(key) ?? 0;
      const rank = gain > 0 ? rankOf(rankings.levelGains, gain) : null;
      const cell = makeElement('span', `calendar-day${rank ? ` tier-${rank.tier}` : ''}`, String(day));
      const rankDetail = rank ? `; ${rank.label}, rank ${formatNumber(rank.rank)} of ${formatNumber(rank.total)} growth days` : '';
      const label = `${date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' })}: ${formatNumber(gain)} level${gain === 1 ? '' : 's'} gained${rankDetail}`;
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('aria-label', label);
      cell.title = label;
      grid.append(cell);
    }

    monthElement.append(monthTitle, grid);
    calendar.append(monthElement);
  }
}

function renderShipDayHighlight(title, measure, day, listLabel, rank) {
  const card = makeElement('article', `ship-day-card ${title === 'Best day' ? 'ship-day-best' : 'ship-day-worst'}`);
  card.append(makeElement('p', 'eyebrow', measure), makeElement('h3', '', title));
  if (!day) {
    card.append(makeElement('p', 'empty-note', `No ships ${listLabel} were recorded.`));
    return card;
  }

  const date = new Date(`${day.date}T00:00:00Z`);
  card.append(
    makeElement('p', 'ship-day-date', date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })),
    makeElement('p', 'ship-day-total', `${formatNumber(day.blocks)} blocks`),
  );
  if (rank) {
    const badge = makeElement('small', `ship-day-rank tier-${rank.tier}`, rank.label);
    badge.title = `Rank ${formatNumber(rank.rank)} of ${formatNumber(rank.total)} pilots`;
    card.append(badge);
  }
  const list = makeElement('ul', 'ship-day-list');
  for (const event of day.events ?? []) {
    const item = makeElement('li', 'ship-day-item');
    const header = makeElement('div', 'ship-day-event-head');
    const shipName = event.name === event.type ? event.name : `${event.name} (${event.type})`;
    const attackers = event.attackers
      .map(({ name, role }) => `${name} (${role === 'killer' ? 'final killer' : 'assist'})`)
      .join(', ');
    header.append(
      makeElement('span', 'ship-day-name', shipName),
      makeElement('span', 'ship-day-detail', `${formatNumber(event.blocks)} blocks`),
    );
    item.append(
      header,
      makeElement('p', 'ship-day-context', `Victim: ${event.victim}`),
      makeElement('p', 'ship-day-context', `Attackers: ${attackers || 'Unknown'}`),
    );
    list.append(item);
  }
  if (!day.events?.length) list.append(makeElement('li', 'empty-note', 'No sink details recorded for this day.'));
  list.setAttribute('aria-label', listLabel);
  card.append(list);
  return card;
}

function renderShipDayHighlights(pilot) {
  const container = document.getElementById('ship-day-highlights');
  const bestDay = peakShipDay(pilot.shipsSunk.byDay ?? []);
  const worstDay = peakShipDay(pilot.shipsLost.byDay ?? []);
  container.replaceChildren(
    renderShipDayHighlight('Best day', 'MOST BLOCKS SUNK (INCLUDING ASSISTS)', bestDay, 'sunk', bestDay && rankOf(rankings.bestDayBlocks, bestDay.blocks)),
    renderShipDayHighlight('Worst day', 'MOST BLOCKS LOST', worstDay, 'lost', worstDay && rankOf(rankings.worstDayBlocks, worstDay.blocks)),
  );
}

function renderGround(pilot) {
  const ground = pilot.groundPvP;
  const stats = document.getElementById('ground-stats');
  stats.replaceChildren(
    renderStat('KILLS', ground.kills, undefined, ground.kills > 0 ? rankOf(rankings.groundKills, ground.kills) : null),
    renderStat('DEATHS', ground.deaths),
  );
  renderTable(document.getElementById('ground-opponents'), ['Pilot', 'Events'], ground.killed.map((entry) => [entry.name, formatNumber(entry.count)]), 'No opponents recorded.');
  renderTable(document.getElementById('ground-weapons'), ['Weapon', 'Uses'], ground.weapons.map((entry) => [entry.name, formatNumber(entry.count)]), 'No weapon details recorded.');
}

function renderPilot(pilot) {
  results.hidden = false;
  document.getElementById('pilot-name').textContent = pilot.name;
  const combinedSinks = combinedSinksOf(pilot);
  document.getElementById('summary-stats').replaceChildren(
    renderStat('COMBINED SINKS', combinedSinks, 'final kills + assists', combinedSinks > 0 ? rankOf(rankings.combinedSinks, combinedSinks) : null),
    renderStat('BLOCKS FROM SINKS', pilot.shipsSunk.blocks, 'total across combined sinks', pilot.shipsSunk.blocks > 0 ? rankOf(rankings.blocksFromSinks, pilot.shipsSunk.blocks) : null),
    renderStat('SHIPS LOST', pilot.shipsLost.ships, `${formatNumber(pilot.shipsLost.blocks)} blocks`),
    renderStat('LEVELS GAINED', [...dailyLevelGains(pilot.levels).values()].reduce((total, gain) => total + gain, 0)),
  );
  const messageCount = pilot.gameChatMessages;
  const chatRank = messageCount > 0 ? rankOf(rankings.chatMessages, messageCount) : null;
  document.getElementById('yapper-count').textContent = formatNumber(messageCount);
  const percentile = document.getElementById('yapper-percentile');
  const topPercent = chatRank ? (chatRank.rank / chatRank.total) * 100 : null;
  const formattedTopPercent = topPercent === null
    ? null
    : topPercent < 0.01
      ? '<0.01'
      : topPercent < 10
        ? topPercent.toFixed(2)
        : topPercent.toFixed(1);
  percentile.textContent = topPercent === null
    ? 'NO MESSAGES TO RANK'
    : `TOP ${formattedTopPercent}%`;
  percentile.className = chatRank ? `tier-${chatRank.tier}` : '';
  document.getElementById('yapper-standing').textContent = chatRank
    ? `Rank ${formatNumber(chatRank.rank)} of ${formatNumber(chatRank.total)} pilots`
    : 'No relayed in-game messages recorded.';

  const best = pilot.bestShip;
  document.getElementById('best-ship-type').textContent = best?.type ?? 'NO PLAYER SINKS';
  document.getElementById('best-ship-name').textContent = best?.name ?? 'NO PLAYER SINKS RECORDED';
  const bestStats = document.getElementById('best-ship-stats');
  bestStats.replaceChildren();
  if (best) {
    const ratio = killDeathRatio(best);
    const ranked = best.kills + best.deaths >= MIN_RATE_EVENTS;
    bestStats.append(
      renderStat(
        'K+A / DEATH',
        best.deaths === 0 ? 'Perfect' : `${ratio.toFixed(2)}:1`,
        `${formatNumber(best.kills)} kills & assists / ${formatNumber(best.deaths)} deaths${ranked ? '' : ' (too few events to rank)'}`,
        ranked ? rankOf(rankings.shipRatios, ratio) : null,
      ),
      renderStat('FINAL KILLS', best.finalKills),
      renderStat('ASSISTS', best.assists),
      renderStat('VICTIM BLOCKS SUNK', best.victimBlocks),
    );
  }

  renderShipTypes(pilot);
  renderOpponents(pilot);
  renderLevels(pilot);
  renderShipDayHighlights(pilot);
  renderGround(pilot);
  results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = normalize(input.value);
  if (!query) return;
  const pilot = pilots.get(query);
  if (!pilot) {
    results.hidden = true;
    status.textContent = 'No pilot found in the recorded 2026 events.';
    return;
  }
  status.textContent = '';
  renderPilot(pilot);
});

document.querySelector('#new-search').addEventListener('click', () => {
  results.hidden = true;
  input.value = '';
  status.textContent = '';
  input.focus();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

try {
  const response = await fetch('./data/wrapped-2026.json');
  if (!response.ok) throw new Error('The pilot archive could not be loaded.');
  const data = await response.json();
  pilots = new Map(data.pilots.map((pilot) => [normalize(pilot.name), pilot]));
  rankings = buildRankings(data.pilots);
  const staleAfter = document.getElementById('data-stale-after');
  if (data.latestMessageAt) {
    const cutoff = new Date(data.latestMessageAt);
    staleAfter.dateTime = data.latestMessageAt;
    staleAfter.textContent = `${cutoff.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })} at ${cutoff.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short' })}`;
  } else {
    staleAfter.textContent = 'an unknown date';
  }
  status.textContent = `${formatNumber(data.pilots.length)} pilot records ready.`;
  form.querySelector('button').disabled = false;
} catch {
  status.textContent = 'The pilot archive is not available. Please try again later.';
  form.querySelector('button').disabled = true;
}