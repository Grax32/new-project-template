import config from './config';

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { sseRoutes, serviceGroupParamRoutes } from '../routes';

const PUBLIC_DIR = join(config.solutionRoot, 'html');
const HOME = join(PUBLIC_DIR, 'index.html');

if (!existsSync(HOME)) {
    console.error(`Error: Public directory not found at ${PUBLIC_DIR}`);
    process.exit(1);
}

const MIME_TYPES: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
};

type RouteHandler = (
    req: IncomingMessage,
    res: ServerResponse,
    params?: Record<string, string>,
) => Promise<void> | void;

// Combine all routes
const routes: Record<string, RouteHandler> = { ...sseRoutes };

// Routes with parameters (e.g., /api/logs/:id)
const paramRoutes: Record<string, RouteHandler> = { ...serviceGroupParamRoutes };

function serveStatic(res: ServerResponse, filePath: string): boolean {
    if (!existsSync(filePath)) return false;
    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(readFileSync(filePath));
    return true;
}

function matchParamRoute(
    method: string,
    pathname: string,
): { handler: RouteHandler; params: Record<string, string> } | null {
    for (const [pattern, handler] of Object.entries(paramRoutes)) {
        const [routeMethod, routePath] = pattern.split(' ');

        if (routeMethod !== method) continue;

        const routeParts = routePath.split('/');
        const pathParts = pathname.split('/');

        if (routeParts.length !== pathParts.length) continue;

        const params: Record<string, string> = {};
        let match = true;

        for (let i = 0; i < routeParts.length; i++) {
            if (routeParts[i].startsWith(':')) {
                params[routeParts[i].slice(1)] = decodeURIComponent(pathParts[i]);
            } else if (routeParts[i] !== pathParts[i]) {
                match = false;
                break;
            }
        }

        if (match) return { handler, params };
    }
    return null;
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

    // Strip query string for routing
    const pathname = url.split('?')[0];
    const routeKey = `${method} ${pathname}`;

    // Try exact route match
    if (routes[routeKey]) {
        return routes[routeKey](req, res);
    }

    // Try parameterized route match
    const paramMatch = matchParamRoute(method, pathname);
    if (paramMatch) {
        return paramMatch.handler(req, res, paramMatch.params);
    }

    // Serve static files
    const filePath = pathname === '/' ? HOME : join(PUBLIC_DIR, pathname);
    if (serveStatic(res, filePath)) return;

    res.writeHead(404);
    res.end('Not Found');
});

export function startServer() {
    server.listen(config.port, () => {
        console.log(`\n Dev Dashboard: http://localhost:${config.port}\n`);
    });
}
