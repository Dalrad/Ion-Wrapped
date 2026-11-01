import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../site', import.meta.url)));
const port = Number(process.argv[2] ?? process.env.PORT ?? 8080);
// Mimic a project Pages URL such as /pilot-recap/ when a base path is given.
const base = (process.argv[3] ?? '').replace(/\/+$/, '');
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
};

createServer(async (request, response) => {
  let pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  if (base) {
    if (pathname !== base && !pathname.startsWith(`${base}/`)) {
      response.writeHead(404).end('Not found');
      return;
    }
    pathname = pathname.slice(base.length) || '/';
  }
  const file = normalize(join(root, pathname.endsWith('/') ? `${pathname}index.html` : pathname));
  if (file !== root && !file.startsWith(root + sep)) {
    response.writeHead(403).end('Forbidden');
    return;
  }
  try {
    if (!(await stat(file)).isFile()) throw new Error('not a file');
    response.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
    createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end('Not found');
  }
}).listen(port, () => console.log(`Serving site/ at http://127.0.0.1:${port}${base || ''}/`));
