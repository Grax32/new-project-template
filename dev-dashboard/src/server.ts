import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import config from './config';
import { dockerPs, dockerCmd, dockerLogs } from './docker';
import { startProgram, stopProgram, getProgramStatus, events } from './programs';
import { readLogs, clearLogs } from './logs';

const PUBLIC_DIR = join(__dirname, 'public');

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function serveStatic(res: ServerResponse, filePath: string): boolean {
  if (!existsSync(filePath)) return false;
  const ext = extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(readFileSync(filePath));
  return true;
}

function json(res: ServerResponse, data: unknown, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
  res.end(JSON.stringify(data));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch {
        resolve({});
      }
    });
  });
}

const server = createServer(async (req, res) => {
  const url = req.url || '/';
  const method = req.method || 'GET';

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }

  // ── API Routes ─────────────────────────────────────────────────────────────
  if (url === '/api/docker' && method === 'GET') {
    return json(res, dockerPs());
  }

  if (url === '/api/docker' && method === 'POST') {
    const { action, service } = await parseBody(req);
    const out = dockerCmd(action, service);
    return json(res, { ok: true, output: out });
  }

  // Start/stop all docker services
  if (url === '/api/docker/all' && method === 'POST') {
    const { action } = await parseBody(req);
    const out = dockerCmd(action === 'start' ? 'up' : 'down');
    return json(res, { ok: true, output: out });
  }

  // Docker logs: GET /api/docker/logs/:service
  if (url.startsWith('/api/docker/logs/') && method === 'GET') {
    const service = decodeURIComponent(url.split('/')[4]);
    return json(res, dockerLogs(service));
  }

  if (url === '/api/programs' && method === 'GET') {
    return json(res, getProgramStatus());
  }

  if (url === '/api/programs' && method === 'POST') {
    const { id, action } = await parseBody(req);
    if (action === 'start') startProgram(id);
    else if (action === 'stop') stopProgram(id);
    return json(res, getProgramStatus());
  }

  // Start/stop all programs
  if (url === '/api/programs/all' && method === 'POST') {
    const { action } = await parseBody(req);
    const statuses = getProgramStatus();
    for (const p of statuses) {
      if (action === 'start' && p.status !== 'running') startProgram(p.id);
      else if (action === 'stop' && p.status === 'running') stopProgram(p.id);
    }
    return json(res, getProgramStatus());
  }

  if (url.startsWith('/api/logs/') && method === 'GET') {
    const id = decodeURIComponent(url.split('/')[3]);
    return json(res, readLogs(id));
  }

  // Clear program logs: DELETE /api/logs/:id
  if (url.startsWith('/api/logs/') && method === 'DELETE') {
    const id = decodeURIComponent(url.split('/')[3]);
    clearLogs(id);
    return json(res, { ok: true });
  }

  // ── SSE for real-time updates ──────────────────────────────────────────────
  if (url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    const send = () => res.write(`data: ${JSON.stringify({ programs: getProgramStatus(), docker: dockerPs() })}\n\n`);
    send();
    const interval = setInterval(send, 3000);
    const onUpdate = () => send();
    events.on('status', onUpdate);
    events.on('log', onUpdate);
    req.on('close', () => {
      clearInterval(interval);
      events.off('status', onUpdate);
      events.off('log', onUpdate);
    });
    return;
  }

  // ── Static Files ───────────────────────────────────────────────────────────
  const pathname = url.split('?')[0]; // strip query string
  const filePath = join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (serveStatic(res, filePath)) return;

  res.writeHead(404);
  res.end('Not Found');
});

export function startServer() {

  server.listen(config.port, () => {
    console.log(`\n  🚀 Dev Dashboard: http://localhost:${config.port}\n`);
  });
}
