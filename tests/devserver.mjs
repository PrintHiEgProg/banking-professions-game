// Локальный сервер «как на Vercel»: раздаёт игру и запускает функцию api/events.
// DATABASE_URL=postgres://postgres@127.0.0.1:5433/bank_stats node tests/devserver.mjs [порт]
// В игре включить отправку: localStorage['bank.analytics.endpoint'] = 'http://localhost:8790/api/events'
import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import handler from '../api/events.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PORT = Number(process.argv[2] || 8790);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/events') {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      req.body = /json/.test(req.headers['content-type'] || '') ? (() => { try { return JSON.parse(raw); } catch { return raw; } })() : raw;
      res.status = (c) => ((res.statusCode = c), res);
      res.json = (o) => (res.setHeader('Content-Type', 'application/json'), res.end(JSON.stringify(o)));
      return handler(req, res);
    }
    const file = normalize(join(ROOT, url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname)));
    if (!file.startsWith(ROOT)) return res.writeHead(403).end();
    try {
      if (!(await stat(file)).isFile()) throw new Error('dir');
      res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404).end('not found');
    }
  })
  .listen(PORT, () => console.log(`http://localhost:${PORT}`));
