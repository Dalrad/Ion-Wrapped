import { readFile } from 'node:fs/promises';

const path = new URL('../site/data/wrapped-2026.json', import.meta.url);
const data = JSON.parse(await readFile(path, 'utf8'));

if (!Array.isArray(data.pilots) || data.pilots.length === 0) {
  throw new Error('Dataset has no pilots.');
}
const forbidden = /discord(app)?\.com|"(authorId|rawMessage|attachments|token)"/i;
if (forbidden.test(JSON.stringify(data))) {
  throw new Error('Dataset appears to contain Discord URLs or raw message fields.');
}
console.log(`Dataset OK: ${data.pilots.length} pilots, generated ${data.generatedAt}.`);
