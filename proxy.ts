// @ts-nocheck
import type { ServerWebSocket } from 'bun';
import { stat, appendFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const listenHost = Bun.env.LISTEN_HOST ?? '127.0.0.1';
const listenPort = readPort('LISTEN_PORT', 8080);
const upstreamHost = Bun.env.UPSTREAM_HOST ?? '127.0.0.1';
const httpUpstreamHost = Bun.env.HTTP_UPSTREAM_HOST ?? upstreamHost;
const httpUpstreamPort = readPort('HTTP_UPSTREAM_PORT', 80);
const tcpUpstreamHost = Bun.env.TCP_UPSTREAM_HOST ?? upstreamHost;
const tcpUpstreamPort = readPort('TCP_UPSTREAM_PORT', 43594);
const publicRoot = resolve(import.meta.dir, 'public');

type WsMessage = string | Uint8Array | ArrayBuffer;

type WebSocketData = {
    tcp?: Bun.Socket<TcpData>;
    queue: WsMessage[];
    closing: boolean;
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

function createWebSocketData(): WebSocketData {
    return {
        queue: [],
        closing: false
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
            port: tcpUpstreamPort,
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

function serveServerList(req: Request): Response | undefined {
    const url = new URL(req.url);
    if ((req.method !== 'GET' && req.method !== 'HEAD') || !/^\/l=\d+\/slr2\.ws$/.test(url.pathname)) {
        return undefined;
    }

    const host = url.host;
    const payload = new Uint8Array(2 + 2 + host.length + 1 + 2 + 2);
    let pos = 0;
    const p2 = (value: number): void => {
        payload[pos++] = value >> 8;
        payload[pos++] = value;
    };

    p2(1);
    p2(0x8001);
    for (let i = 0; i < host.length; i++) {
        payload[pos++] = host.charCodeAt(i);
    }
    payload[pos++] = 0;
    p2(0);
    p2(0);

    const data = new Uint8Array(4 + payload.length);
    data[0] = payload.length >> 24;
    data[1] = payload.length >> 16;
    data[2] = payload.length >> 8;
    data[3] = payload.length;
    data.set(payload, 4);

    return new Response(req.method === 'HEAD' ? undefined : data, {
        headers: {
            'cache-control': 'no-store',
            'content-type': 'application/octet-stream'
        }
    });
}

function isWorldClientPath(pathname: string): boolean {
    return /^\/l=\d+\/[^/]+$/.test(pathname) && !pathname.endsWith('.ws');
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
        const headers: Record<string, string> = {
            'cache-control': 'no-store'
        };
        if (filePath.toLowerCase().endsWith('.ws')) {
            headers['content-type'] = 'text/html; charset=utf-8';
        }
        const responseInit = { headers };
        return new Response(req.method === 'HEAD' ? undefined : file, responseInit);
    } catch {
        return undefined;
    }
}

let server: Bun.Server;

try {
    server = Bun.serve({
        hostname: listenHost,
        port: listenPort,
        async fetch(req, server) {
            if (isWebSocketRequest(req)) {
                const url = new URL(req.url);
                if (url.pathname !== '/') {
                    return new Response('WebSocket proxy only supports /', { status: 404 });
                }

                return server.upgrade(req, { data: createWebSocketData() }) ? undefined : new Response('WebSocket upgrade failed', { status: 400 });
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
                const serverListResponse = serveServerList(req);
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
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Failed to start: ${message}`);
    process.exit(1);
}

console.log(`proxy listening on http://${server.hostname}:${server.port} ` + `(HTTP -> ${httpUpstreamHost}:${httpUpstreamPort}, WS / -> ${tcpUpstreamHost}:${tcpUpstreamPort})`);
