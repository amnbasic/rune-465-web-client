export default class ClientStream {
    writer: unknown = null;
    readonly signlink: unknown = null;
    dummy: boolean = false;
    readonly out: WebSocketWriter;
    tcyl: number = 0;
    readonly in: WebSocketReader;
    tnum: number = 0;
    ioerror: boolean = false;
    buf: Uint8Array | null = null;
    readonly socket: WebSocket;

    private readonly wsin: WebSocketReader;
    private readonly wsout: WebSocketWriter;
    private remoteClosed: boolean = false;

    // True once the peer has closed/errored the socket. loginPoll uses this to abandon a dead
    // login attempt immediately instead of idling on it for the full 2000-tick timeout.
    get closed(): boolean {
        return this.remoteClosed;
    }

    constructor(arg0: WebSocket);
    constructor(arg0: WebSocket, arg1: unknown);
    constructor(arg0: WebSocket, arg1: unknown = null) {
        this.signlink = arg1;
        arg0.onclose = this.onclose;
        arg0.onerror = this.onerror;
        this.wsin = new WebSocketReader(arg0, 30000);
        this.wsout = new WebSocketWriter(arg0, 5000);
        this.in = this.wsin;
        this.out = this.wsout;
        this.socket = arg0;
    }

    // note: Java throws IOException on failure
    available(): number {
        if (this.dummy || this.remoteClosed) {
            return 0;
        }

        return this.wsin.available;
    }

    // note: Java throws IOException on failure
    write(arg0: number, arg1: Uint8Array): void {
        if (this.dummy || this.remoteClosed) {
            return;
        }
        if (this.ioerror) {
            this.ioerror = false;
            throw this.socket;
        }

        if (this.buf === null) {
            this.buf = new Uint8Array(5000);
        }
        for (let var4 = 0; var4 < arg0; var4++) {
            this.buf[this.tnum] = arg1[var4];
            this.tnum = (this.tnum + 1) % 5000;
            if (this.tnum === (this.tcyl + 4900) % 5000) {
                throw this.socket;
            }
        }
        if (this.writer === null) {
            this.writer = { status: 1, result: null };
        }
        this.run();
    }

    // note: Java throws IOException on failure
    async read(): Promise<number>;
    async read(off: number, dst: Uint8Array, len: number): Promise<void>;
    async read(off?: number, dst?: Uint8Array, len?: number): Promise<number | void> {
        if (off !== undefined && dst !== undefined && len !== undefined) {
            await this.readBytes(dst, off, len);
            return;
        }
        if (this.dummy) {
            return 0;
        }
        if (this.remoteClosed) {
            return -1;
        }

        return await this.wsin.read();
    }

    run(): void {
        try {
            while (this.buf !== null && this.tcyl !== this.tnum) {
                const off = this.tcyl;
                const len = this.tcyl <= this.tnum ? this.tnum - this.tcyl : 5000 - this.tcyl;
                if (len <= 0) {
                    continue;
                }
                try {
                    this.wsout.write(this.buf.subarray(off, off + len), len);
                } catch {
                    this.ioerror = true;
                }
                this.tcyl = (this.tcyl + len) % 5000;
            }
            if (this.dummy) {
                this.buf = null;
            }
        } catch {
            this.ioerror = true;
        }
    }

    finalize(): void {
        this.close();
    }

    // note: Java throws IOException on failure
    async readBytes(dst: Uint8Array, off: number, len: number): Promise<void> {
        if (this.dummy) {
            return;
        }
        if (this.remoteClosed) {
            throw this.socket;
        }

        await this.wsin.readBytes(dst, off, len);
    }

    close(): void {
        if (this.dummy) {
            return;
        }

        this.dummy = true;
        this.socket.close();
        this.wsin.close();
        this.wsout.close();
        this.buf = null;
        this.writer = null;
    }

    private onclose = (_event: CloseEvent): void => {
        if (this.dummy) {
            return;
        }

        this.remoteClosed = true;
        this.wsin.close();
        this.wsout.close();
    };

    private onerror = (_event: Event): void => {
        if (this.dummy) {
            return;
        }

        this.remoteClosed = true;
        this.wsin.close();
        this.wsout.close();
    };
}

class WebSocketWriter {
    private readonly socket: WebSocket;
    private readonly limit: number;

    private closed: boolean = false;
    private ioerror: boolean = false;

    constructor(socket: WebSocket, limit: number) {
        this.socket = socket;
        this.limit = limit;
    }

    write(src: Uint8Array, len: number): void {
        if (this.closed) {
            return;
        }
        if (this.ioerror) {
            this.ioerror = false;
            throw this.socket;
        }
        if (len > this.limit - 100) {
            throw this.socket;
        }
        if (this.socket.readyState !== WebSocket.OPEN) {
            return;
        }
        try {
            this.socket.send(src.slice(0, len));
        } catch {
            this.ioerror = true;
        }
    }

    close(): void {
        this.closed = true;
    }
}

class WebSocketEvent {
    private readonly bytes: Uint8Array;
    private position: number;

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
        this.position = 0;
    }

    get available(): number {
        return this.bytes.length - this.position;
    }

    get read(): number {
        return this.bytes[this.position++];
    }

    readBytes(dst: Uint8Array, off: number, len: number): number {
        const count = Math.min(len, this.available);
        dst.set(this.bytes.subarray(this.position, this.position + count), off);
        this.position += count;
        return count;
    }
}

class WebSocketReader {
    private readonly timeoutMs: number;

    private queue: WebSocketEvent[] = [];
    private queueRead: number = 0;
    private event: WebSocketEvent | null = null;
    private callback: ((data: WebSocketEvent) => void) | null = null;
    private timeout: ReturnType<typeof setTimeout> | null = null;
    private rejectRead: (() => void) | null = null;
    private closed: boolean = false;
    private total: number = 0;

    constructor(socket: WebSocket, timeoutMs: number) {
        this.socket = socket;
        this.timeoutMs = timeoutMs;
        socket.binaryType = 'arraybuffer';
        socket.onmessage = this.onmessage;
    }

    private readonly socket: WebSocket;

    get available(): number {
        // Compute from actually-buffered events, NOT the `total` counter. `total` can drift and
        // over-count (a partially-read event whose leftover was dropped), which made
        // readBytes(count <= available) deadlock in waitForEvent waiting for bytes that were never
        // really buffered. Summing live events guarantees a caller never requests more than exists.
        let n = this.event ? this.event.available : 0;
        for (let i = this.queueRead; i < this.queue.length; i++) {
            n += this.queue[i].available;
        }
        return n;
    }

    private onmessage = (e: MessageEvent): void => {
        if (this.closed) {
            return;
        }

        const event: WebSocketEvent = new WebSocketEvent(new Uint8Array(e.data));

        this.total += event.available;

        if (this.callback) {
            const cb = this.callback;
            this.callback = null;
            cb(event);
        } else {
            this.queue.push(event);
        }
    };

    async read(): Promise<number> {
        if (this.closed) {
            throw this.socket;
        }

        let event = this.nextEvent();
        if (event === null) {
            event = await this.waitForEvent();
            this.event = event; // BUGFIX: retain the freshly-received event so its remaining bytes
            // are readable next call. Without this, a partially-read waitForEvent event was dropped
            // while `total` still counted its bytes -> the next read deadlocked in waitForEvent.
        }
        this.total--;
        return event.read;
    }

    async readBytes(dst: Uint8Array, off: number, len: number): Promise<Uint8Array> {
        if (this.closed) {
            throw this.socket;
        }

        let remaining = len;
        let dstPos = off;

        while (remaining > 0) {
            let event = this.nextEvent();
            if (event === null) {
                event = await this.waitForEvent();
                this.event = event; // BUGFIX: retain a partially-read waitForEvent event (see read()).
            }
            const count = event.readBytes(dst, dstPos, remaining);
            this.total -= count;
            dstPos += count;
            remaining -= count;
        }

        return dst;
    }

    close(): void {
        this.closed = true;
        this.callback = null;
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
        this.rejectRead?.();
        this.rejectRead = null;
        this.event = null;
        this.queue = [];
        this.queueRead = 0;
    }

    private nextEvent(): WebSocketEvent | null {
        if (this.event && this.event.available > 0) {
            return this.event;
        }

        this.event = null;

        while (this.queueRead < this.queue.length) {
            const event = this.queue[this.queueRead++];
            if (event.available > 0) {
                this.event = event;
                if (this.queueRead > 32 && this.queueRead * 2 > this.queue.length) {
                    this.queue = this.queue.slice(this.queueRead);
                    this.queueRead = 0;
                } else if (this.queueRead === this.queue.length) {
                    this.queue = [];
                    this.queueRead = 0;
                }
                return event;
            }
        }

        if (this.queueRead > 32 && this.queueRead * 2 > this.queue.length) {
            this.queue = this.queue.slice(this.queueRead);
            this.queueRead = 0;
        } else if (this.queueRead === this.queue.length) {
            this.queue = [];
            this.queueRead = 0;
        }
        return null;
    }

    private async waitForEvent(): Promise<WebSocketEvent> {
        if (this.callback) {
            throw new Error();
        }

        return await new Promise<WebSocketEvent>((resolve, reject): void => {
            this.rejectRead = (): void => {
                this.callback = null;
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = null;
                }
                reject(this.socket);
            };

            this.timeout = setTimeout((): void => {
                this.callback = null;
                this.timeout = null;
                this.rejectRead = null;
                reject(this.socket);
            }, this.timeoutMs);

            this.callback = (event: WebSocketEvent): void => {
                if (this.timeout) {
                    clearTimeout(this.timeout);
                    this.timeout = null;
                }
                this.rejectRead = null;
                this.event = event;
                resolve(event);
            };
        });
    }
}
