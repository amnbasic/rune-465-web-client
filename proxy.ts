// @ts-nocheck
import type { ServerWebSocket } from 'bun';
import { stat, appendFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Bind on every interface so other devices on the LAN — a phone on the same Wi-Fi — can
// reach the client. Loopback-only was the default and meant the page was unreachable from
// anything but this machine, which is not a useful default for a server you are testing.
//
// Only the proxy's own port is exposed by this. The upstreams below stay on 127.0.0.1: the
// proxy reaches the game server locally, so the raw TCP gateway (43594) and the JS5 HTTP
// port are not opened to the network by this change.
//
// Access is gated at the firewall rather than here — the inbound rule for this port is
// scoped to LocalSubnet, so it is the LAN and nothing beyond it. Set LISTEN_HOST=127.0.0.1
// to go back to loopback-only.
const listenHost = Bun.env.LISTEN_HOST ?? '0.0.0.0';
const listenPort = readPort('LISTEN_PORT', 8080);
// World 2 origin. Set LISTEN_PORT_2=0 to disable. Default 8081 so a bare
// `bun proxy.ts` still accepts the slr2 host jagstr.
const listenPort2 = Bun.env.LISTEN_PORT_2 === '0' ? null : readPort('LISTEN_PORT_2', 8081);
const upstreamHost = Bun.env.UPSTREAM_HOST ?? '127.0.0.1';
const httpUpstreamHost = Bun.env.HTTP_UPSTREAM_HOST ?? upstreamHost;
const httpUpstreamPort = readPort('HTTP_UPSTREAM_PORT', 80);
const tcpUpstreamHost = Bun.env.TCP_UPSTREAM_HOST ?? upstreamHost;
const tcpUpstreamPort = readPort('TCP_UPSTREAM_PORT', 43594);
const tcpUpstreamPort2 = readPort('TCP_UPSTREAM_PORT_2', 43596);
const publicRoot = resolve(import.meta.dir, 'public');

type WsMessage = string | Uint8Array | ArrayBuffer;

type WebSocketData = {
    tcp?: Bun.Socket<TcpData>;
    queue: WsMessage[];
    closing: boolean;
    tcpPort: number;
};

type TcpData = {
    ws: ServerWebSocket<WebSocketData>;
};

function readPort(name: string, fallback: number): number {
    const value = Bun.env[name];
    if (!value) {
        return fallback;
    }

    const port = Number(value);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`${name} must be a TCP port between 1 and 65535`);
    }

    return port;
}

function isWebSocketRequest(req: Request): boolean {
    return req.headers.get('upgrade')?.toLowerCase() === 'websocket';
}

function createWebSocketData(tcpPort: number): WebSocketData {
    return {
        queue: [],
        closing: false,
        tcpPort
    };
}

function writeToTcp(ws: ServerWebSocket<WebSocketData>, message: WsMessage): void {
    const tcp = ws.data.tcp;
    if (!tcp || tcp.readyState !== 1) {
        ws.data.queue.push(message);
        return;
    }

    tcp.write(message);
}

function closeWebSocket(ws: ServerWebSocket<WebSocketData>, code = 1011, reason = 'TCP connection closed'): void {
    if (ws.data.closing) {
        return;
    }

    ws.data.closing = true;
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(code, reason);
    }
}

function closeTcp(ws: ServerWebSocket<WebSocketData>): void {
    const tcp = ws.data.tcp;
    ws.data.tcp = undefined;

    if (tcp && tcp.readyState > 0) {
        tcp.end();
    }
}

async function openTcpConnection(ws: ServerWebSocket<WebSocketData>): Promise<void> {
    try {
        const tcp = await Bun.connect<TcpData>({
            hostname: tcpUpstreamHost,
            port: ws.data.tcpPort,
            data: { ws },
            socket: {
                binaryType: 'buffer',
                data(socket, data) {
                    const ws = socket.data.ws;
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(data);
                    }
                },
                close(socket) {
                    const ws = socket.data.ws;
                    ws.data.tcp = undefined;
                    closeWebSocket(ws);
                },
                end(socket) {
                    const ws = socket.data.ws;
                    ws.data.tcp = undefined;
                    closeWebSocket(ws);
                },
                error(socket, error) {
                    console.error(`TCP proxy error: ${error.message}`);
                    const ws = socket.data.ws;
                    ws.data.tcp = undefined;
                    closeWebSocket(ws);
                },
                connectError(socket, error) {
                    console.error(`TCP connect error: ${error.message}`);
                    closeWebSocket(socket.data.ws, 1011, 'TCP connection failed');
                }
            }
        });

        if (ws.data.closing || ws.readyState !== WebSocket.OPEN) {
            tcp.end();
            return;
        }

        ws.data.tcp = tcp;
        for (const message of ws.data.queue.splice(0)) {
            tcp.write(message);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`TCP connect failed: ${message}`);
        closeWebSocket(ws, 1011, 'TCP connection failed');
    }
}

const if3EditorPort = readPort('IF3_EDITOR_PORT', 8799);
const if3EditorHost = Bun.env.IF3_EDITOR_HOST ?? '127.0.0.1';

/** /if3 and /if3/ open the client studio (drawLayer editor). /if3/api/* still hits :8799. */
async function proxyIf3Editor(req: Request): Promise<Response | undefined> {
    const url = new URL(req.url);
    if (req.method === 'GET' && (url.pathname === '/if3' || url.pathname === '/if3/')) {
        return Response.redirect(new URL('/studio', url.origin).toString(), 302);
    }
    if (!url.pathname.startsWith('/if3/')) {
        return undefined;
    }

    const rest = url.pathname.slice('/if3'.length) || '/';
    const target = `http://${if3EditorHost}:${if3EditorPort}${rest}${url.search}`;
    const headers = new Headers(req.headers);
    headers.set('host', `${if3EditorHost}:${if3EditorPort}`);
    headers.delete('connection');
    headers.delete('upgrade');

    try {
        const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.arrayBuffer();
        const upstream = await fetch(target, {
            method: req.method,
            headers,
            body,
            redirect: 'manual'
        });
        const outHeaders = new Headers(upstream.headers);
        return new Response(req.method === 'HEAD' ? undefined : upstream.body, {
            status: upstream.status,
            headers: outHeaders
        });
    } catch {
        return new Response(
            'IF3 editor is not running.\nIn the game server repo:  cd server ; bun tools/if3-editor.ts\n',
            { status: 502, headers: { 'content-type': 'text/plain; charset=utf-8' } }
        );
    }
}

async function proxyHttp(req: Request): Promise<Response> {
    const sourceUrl = new URL(req.url);
    const targetUrl = new URL(`${sourceUrl.pathname}${sourceUrl.search}`, `http://${httpUpstreamHost}:${httpUpstreamPort}`);

    const headers = new Headers(req.headers);
    headers.set('host', httpUpstreamPort === 80 ? httpUpstreamHost : `${httpUpstreamHost}:${httpUpstreamPort}`);
    headers.delete('connection');
    headers.delete('upgrade');

    return fetch(targetUrl, {
        method: req.method,
        headers,
        body: req.method === 'GET' || req.method === 'HEAD' ? undefined : req.body,
        redirect: 'manual'
    });
}

/**
 * Title-screen list is owned by the game HTTP encoder (worlds.json → slr2).
 * This client fetches page origin, so we forward /l=<world>/slr2.ws and do not
 * keep a second hardcoded list here.
 */
async function proxyServerList(req: Request): Promise<Response | undefined> {
    const url = new URL(req.url);
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !/^\/l=\d+\/slr2\.ws$/.test(url.pathname)) {
        return undefined;
    }

    const targetUrl = new URL(`${url.pathname}${url.search}`, `http://${httpUpstreamHost}:${httpUpstreamPort}`);
    const headers = new Headers(req.headers);
    headers.set('x-forwarded-host', url.host);
    headers.set('host', url.host);
    headers.delete('connection');
    headers.delete('upgrade');

    const upstream = await fetch(targetUrl, {
        method: req.method,
        headers,
        redirect: 'manual'
    });

    const outHeaders = new Headers(upstream.headers);
    outHeaders.set('cache-control', 'no-store');
    if (!outHeaders.has('content-type')) {
        outHeaders.set('content-type', 'application/octet-stream');
    }

    return new Response(req.method === 'HEAD' ? undefined : upstream.body, {
        status: upstream.status,
        headers: outHeaders
    });
}

function isWorldClientPath(pathname: string): boolean {
    return /^\/l=\d+\/[^/]+$/.test(pathname) && !pathname.endsWith('.ws');
}

function isStudioClientPath(pathname: string): boolean {
    return pathname === '/studio' || pathname === '/studio/';
}

async function serveStatic(req: Request): Promise<Response | undefined> {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        return undefined;
    }

    let pathname: string;
    try {
        pathname = decodeURIComponent(new URL(req.url).pathname);
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    if (pathname.includes('\0')) {
        return new Response('Bad Request', { status: 400 });
    }

    if (isWorldClientPath(pathname)) {
        pathname = '/';
    }
    if (isStudioClientPath(pathname)) {
        pathname = '/studio.html';
    }

    let filePath = resolve(publicRoot, `.${pathname}`);
    if (filePath !== publicRoot && !filePath.startsWith(`${publicRoot}${sep}`)) {
        return undefined;
    }

    try {
        const fileStat = await stat(filePath);
        if (fileStat.isDirectory()) {
            filePath = resolve(filePath, 'index.html');
        } else if (!fileStat.isFile()) {
            return undefined;
        }
    } catch {
        return undefined;
    }

    try {
        const fileStat = await stat(filePath);
        if (!fileStat.isFile()) {
            return undefined;
        }

        const file = Bun.file(filePath);
        const lower = filePath.toLowerCase();
        const headers: Record<string, string> = {};

        if (lower.endsWith('.ws')) {
            // Synthetic server-list documents: always fresh, never stored.
            headers['content-type'] = 'text/html; charset=utf-8';
            headers['cache-control'] = 'no-store';
        } else if (lower.endsWith('index.html') || lower.endsWith('studio.html')) {
            // The entry document. Tiny, and the one thing that must never be stale.
            headers['cache-control'] = 'no-store';
        } else {
            // Everything else — above all public/client/client.js, which is 1.7 MB — was also
            // `no-store`, so the whole bundle was re-downloaded on every single launch. That is
            // paid on mobile data, and it makes a home-screen app's cold start miserable.
            //
            // `no-cache` rather than a long `immutable`: the browser still asks on every load, but
            // an unchanged file answers 304 with no body. Same saving as immutable caching without
            // its trap — a standalone home-screen app has no reload button and no URL bar, so a
            // bad bundle pinned as immutable would be unrecoverable short of deleting and
            // reinstalling the app. Validated caching cannot get stuck.
            headers['cache-control'] = 'no-cache';
            headers['etag'] = `W/"${fileStat.size.toString(16)}-${Math.trunc(fileStat.mtimeMs).toString(16)}"`;
        }

        const etag = headers['etag'];
        if (etag !== undefined && req.headers.get('if-none-match') === etag) {
            return new Response(undefined, { status: 304, headers });
        }
        return new Response(req.method === 'HEAD' ? undefined : file, { headers });
    } catch {
        return undefined;
    }
}

function listenProxy(bindPort: number, tcpPort: number): Bun.Server {
    return Bun.serve({
        hostname: listenHost,
        port: bindPort,
        async fetch(req, server) {
            if (isWebSocketRequest(req)) {
                const url = new URL(req.url);
                if (url.pathname !== '/') {
                    return new Response('WebSocket proxy only supports /', { status: 404 });
                }

                return server.upgrade(req, { data: createWebSocketData(tcpPort) }) ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
            }

            const if3Response = await proxyIf3Editor(req);
            if (if3Response) {
                return if3Response;
            }

            // DEV: client streams its console/errors here so logs survive a browser crash. -> dbg.log
            if (req.method === 'POST' && new URL(req.url).pathname === '/dbg') {
                try {
                    await appendFile('dbg.log', await req.text());
                } catch {
                    /* ignore */
                }
                return new Response('ok');
            }

            try {
                const serverListResponse = await proxyServerList(req);
                if (serverListResponse) {
                    return serverListResponse;
                }

                if (new URL(req.url).pathname === '/clienterror.ws') {
                    return new Response(null, { status: 204 });
                }

                const staticResponse = await serveStatic(req);
                if (staticResponse) {
                    return staticResponse;
                }

                return await proxyHttp(req);
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`${new URL(req.url).pathname} HTTP proxy error: ${message}`);
                return new Response('Bad Gateway', { status: 502 });
            }
        },
        websocket: {
            open(ws) {
                void openTcpConnection(ws);
            },
            message(ws, message) {
                writeToTcp(ws, message);
            },
            close(ws) {
                ws.data.closing = true;
                closeTcp(ws);
            }
        }
    });
}

let server: Bun.Server;
let server2: Bun.Server | undefined;

try {
    server = listenProxy(listenPort, tcpUpstreamPort);
    if (listenPort2 !== null) {
        server2 = listenProxy(listenPort2, tcpUpstreamPort2);
    }
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start: ${message}`);
    process.exit(1);
}

console.log(`proxy listening on http://${server.hostname}:${server.port} ` + `(HTTP -> ${httpUpstreamHost}:${httpUpstreamPort}, WS / -> ${tcpUpstreamHost}:${tcpUpstreamPort}, /if3/ -> ${if3EditorHost}:${if3EditorPort})`);
if (server2) {
    console.log(`proxy world 2 on http://${server2.hostname}:${server2.port} WS / -> ${tcpUpstreamHost}:${tcpUpstreamPort2}`);
}
