// Minimal static dev-server for the LC500 web client (S0).
// Serves public/ with correct ES-module MIME types. No cache, no fanciness.
//   bun run serve.ts   ->   http://localhost:8899/
import { resolve, normalize, sep } from 'node:path';

const ROOT = resolve(import.meta.dir, 'public');
const PORT = Number(Bun.env.WEBCLIENT_PORT ?? 8899);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let pathname = decodeURIComponent(url.pathname);
        if (pathname === '/') pathname = '/index.html';

        // Contain to ROOT (no path traversal).
        const abs = normalize(resolve(ROOT, '.' + pathname));
        if (abs !== ROOT && !abs.startsWith(ROOT + sep)) {
            return new Response('403', { status: 403 });
        }

        const file = Bun.file(abs);
        if (!(await file.exists())) {
            return new Response('404 ' + pathname, { status: 404 });
        }
        return new Response(file, {
            headers: { 'Cache-Control': 'no-store' },
        });
    },
});

console.log(`[web-client] serving ${ROOT} at http://localhost:${server.port}/`);
