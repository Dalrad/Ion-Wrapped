const SCALE = 2;
const WIDTH = 1240;
const PAD = 32;
const DISPLAY = '"Bahnschrift", "Franklin Gothic Medium", "Arial Narrow", sans-serif';
const BODY = '"Segoe UI Variable", "Segoe UI", "Verdana", sans-serif';
const COLORS = { ink: '#cccccc', muted: '#9d9d9d', paper: '#1e1e1e', panel: '#252526', line: '#3c3c3c', accent: '#007acc', blue: '#3794ff', lime: '#75beff' };

function drawText(ctx, value, x, y, { size, weight = 900, family = DISPLAY, color = COLORS.ink, align = 'left', spacing = 0 }) {
  ctx.font = `${weight} ${size}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(value, x, y);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
}

function measure(ctx, value, size, weight = 900, family = DISPLAY) {
  ctx.font = `${weight} ${size}px ${family}`;
  return ctx.measureText(value).width;
}

function wrap(ctx, value, maxWidth, size) {
  const lines = [];
  let line = '';
  for (const word of String(value).split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (line && measure(ctx, candidate, size, 400, BODY) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Returns the baseline of the last line drawn. stat = { label, value, valueColor, badge, badgeColor, detail }.
function drawStat(ctx, stat, x, y, width, { valueSize, align = 'left', labelColor = COLORS.muted }) {
  const anchor = align === 'center' ? x + width / 2 : x;
  drawText(ctx, stat.label, anchor, y, { size: 12, color: labelColor, align, spacing: 1 });
  let baseline = y + 8 + valueSize;
  drawText(ctx, stat.value, anchor, baseline, { size: valueSize, color: stat.valueColor, align });
  if (stat.badge) {
    baseline += 20;
    drawText(ctx, stat.badge, anchor, baseline, { size: 11, color: stat.badgeColor, align, spacing: 0.66 });
  }
  if (stat.detail) {
    for (const line of wrap(ctx, stat.detail, width, 12)) {
      baseline += 17;
      drawText(ctx, line, anchor, baseline, { size: 12, weight: 400, family: BODY, color: COLORS.muted, align });
    }
  }
  return baseline;
}

// Returns where the best-class panel ends; panelBottom lets its background be painted under the text.
function drawCard(ctx, model, height, panelBottom) {
  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, '#1d2733');
  background.addColorStop(0.45, COLORS.paper);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, WIDTH, height);

  const innerWidth = WIDTH - PAD * 2;
  drawText(ctx, 'PILOT RECORD / 2026', PAD, PAD + 12, { size: 12, color: COLORS.muted, spacing: 1 });

  const markWidth = measure(ctx, 'FLIGHT LOG 26', 16);
  let nameSize = 56;
  while (nameSize > 24 && measure(ctx, model.name, nameSize) > innerWidth - markWidth - 32) nameSize -= 2;
  const nameBaseline = PAD + 12 + 8 + nameSize * 0.8;
  drawText(ctx, model.name, PAD, nameBaseline, { size: nameSize });
  drawText(ctx, '26', WIDTH - PAD, nameBaseline, { size: 16, color: COLORS.blue, align: 'right' });
  drawText(ctx, 'FLIGHT LOG ', WIDTH - PAD - measure(ctx, '26', 16), nameBaseline, { size: 16, align: 'right' });

  const summaryTop = nameBaseline + 28;
  const summaryHeight = 132;
  ctx.fillStyle = COLORS.panel;
  ctx.fillRect(PAD, summaryTop, innerWidth, summaryHeight);
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(PAD + 0.5, summaryTop + 0.5, innerWidth - 1, summaryHeight - 1);
  const cellWidth = innerWidth / model.summary.length;
  model.summary.forEach((stat, index) => {
    const left = PAD + cellWidth * index;
    if (index > 0) {
      ctx.fillStyle = COLORS.line;
      ctx.fillRect(left, summaryTop, 1, summaryHeight);
    }
    drawStat(ctx, stat, left + 22, summaryTop + 35, cellWidth - 44, { valueSize: 39 });
  });

  const bestTop = summaryTop + summaryHeight + 36;
  if (panelBottom) {
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(PAD, bestTop, innerWidth, panelBottom - bestTop);
    ctx.fillStyle = COLORS.accent;
    ctx.fillRect(PAD, bestTop, 3, panelBottom - bestTop);
  }

  const bestLeft = PAD + 32;
  const halfWidth = (innerWidth - 64 - 32) / 2;
  const ratioLeft = bestLeft + halfWidth + 32 + 24;
  drawText(ctx, 'YOUR BEST CLASS', bestLeft, bestTop + 40, { size: 12, color: '#a0a0a0', spacing: 1 });
  drawText(ctx, model.bestClass.toUpperCase(), bestLeft, bestTop + 82, { size: 30, color: COLORS.lime });

  let overviewBottom = bestTop + 100;
  if (model.ratio) {
    overviewBottom = Math.max(overviewBottom, drawStat(ctx, model.ratio, ratioLeft, bestTop + 40, halfWidth - 24, { valueSize: 30 }) + 6);
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(ratioLeft - 24, bestTop + 28, 1, overviewBottom - bestTop - 28);
  }

  let bestBottom = overviewBottom + 20;
  if (model.bestStats.length) {
    const separator = overviewBottom + 16;
    const boxTop = separator + 16;
    const boxHeight = 104;
    const gap = 8;
    const boxWidth = (innerWidth - 64 - gap * (model.bestStats.length - 1)) / model.bestStats.length;
    ctx.fillStyle = COLORS.line;
    ctx.fillRect(bestLeft, separator, innerWidth - 64, 1);
    model.bestStats.forEach((stat, index) => {
      const left = bestLeft + (boxWidth + gap) * index;
      ctx.fillStyle = COLORS.panel;
      ctx.fillRect(left, boxTop, boxWidth, boxHeight);
      ctx.strokeStyle = COLORS.line;
      ctx.strokeRect(left + 0.5, boxTop + 0.5, boxWidth - 1, boxHeight - 1);
      drawStat(ctx, stat, left, boxTop + 29, boxWidth, { valueSize: 24, align: 'center', labelColor: COLORS.ink });
    });
    bestBottom = boxTop + boxHeight + 28;
  }
  return bestBottom;
}

export async function createShareCardBlob(model) {
  if (document.fonts?.ready) await document.fonts.ready;

  // The first pass on a scratch canvas only measures the layout height.
  const scratch = document.createElement('canvas').getContext('2d');
  const panelBottom = drawCard(scratch, model, 0, 0);
  const footerBaseline = panelBottom + 34;
  const height = Math.ceil(footerBaseline + PAD);

  const canvas = document.createElement('canvas');
  canvas.width = WIDTH * SCALE;
  canvas.height = height * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  drawCard(ctx, model, height, panelBottom);
  drawText(ctx, location.host || 'Pilot Recap 2026', WIDTH - PAD, footerBaseline, { size: 12, weight: 400, family: BODY, color: COLORS.muted, align: 'right' });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not create image.'))), 'image/png');
  });
}
