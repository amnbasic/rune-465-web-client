import ClientStream from '#/io/ClientStream.js';
import Packet from '#/io/Packet.js';
import type Js5Loader from '#/js5/Js5Loader.js';

type Js5NetRequest = {
    archive: number;
    group: number;
    urgent: boolean;
    expectedCrc?: number;
    padding?: number;
};

type QueuedJs5NetRequest = Js5NetRequest & {
    key: number;
    resolve: (data: Uint8Array) => void;
};

export default class Js5Net {
    static crcErrorCount: number = 0;
    static ioErrorCount: number = 0;
    private static active: Js5Net | null = null;

    private prefetchQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private pendingUrgentQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private urgentQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private pendingPrefetchQueue: Map<number, QueuedJs5NetRequest> = new Map();
    private requestQueue: QueuedJs5NetRequest[] = [];
    private stream: ClientStream | null = null;
    private lastTickMs: number = performance.now();
    private timeoutMs: number = 0;
    private incomingRequest: QueuedJs5NetRequest | null = null;
    private incomingUrgentRequest: boolean = false;
    private incomingChunkPos: number = 0;
    private incomingGroupBuffer: Packet | null = null;
    private xorKey: number = 0;
    private masterIndexBuffer: Packet | null = null;
    private header: Packet = new Packet(new Uint8Array(8));
    private archives: (Js5Loader | null)[] = new Array(256).fill(null);

    constructor() {
        Js5Net.active = this;
    }

    static sendLoginLogoutPacket(ingame: boolean): void {
        Js5Net.active?.sendLoginLogoutPacket(ingame);
    }

    static close(): void {
        Js5Net.active?.stream?.close();
    }

    init(stream: ClientStream, ingame: boolean): void {
        this.stream?.close();
        this.stream = null;
        this.stream = stream;
        this.sendLoginLogoutPacket(ingame);

        this.header.pos = 0;
        this.incomingGroupBuffer = null;
        this.incomingChunkPos = 0;
        this.incomingRequest = null;

        for (const request of this.urgentQueue.values()) {
            this.pendingUrgentQueue.set(request.key, request);
        }
        this.urgentQueue.clear();

        for (const request of this.prefetchQueue.values()) {
            this.requestQueue.unshift(request);
            this.pendingPrefetchQueue.set(request.key, request);
        }
        this.prefetchQueue.clear();

        if (this.xorKey !== 0) {
            try {
                const packet = new Packet(new Uint8Array(4));
                packet.p1(4);
                packet.p1(this.xorKey);
                packet.p2(0);
                stream.write(4, packet.data);
            } catch {
                this.stream?.close();
                this.stream = null;
                Js5Net.ioErrorCount++;
            }
        }

        this.timeoutMs = 0;
        this.lastTickMs = performance.now();
    }

    sendLoginLogoutPacket(ingame: boolean): void {
        if (!this.stream) {
            return;
        }

        try {
            const packet = new Packet(new Uint8Array(4));
            packet.p1(ingame ? 2 : 3);
            packet.p3(0);
            this.stream.write(4, packet.data);
        } catch {
            this.stream?.close();
            this.stream = null;
            Js5Net.ioErrorCount++;
        }
    }

    urgentQueueSize(): number {
        return this.urgentQueue.size + this.pendingUrgentQueue.size;
    }

    transferProgress(archive: number, group: number): number {
        const key = group + (archive << 16);
        if (!this.incomingRequest || this.incomingRequest.key !== key) {
            return 0;
        }

        return ((this.incomingGroupBuffer!.pos * 99) / (this.incomingGroupBuffer!.data.length - this.incomingRequest.padding!) + 1) | 0;
    }

    updateCacheHint(archive: number, group: number): void {
        const key = group + (archive << 16);
        const request = this.pendingPrefetchQueue.get(key);
        if (!request) {
            return;
        }

        this.requestQueue = this.requestQueue.filter(queued => queued.key !== key);
        this.requestQueue.unshift(request);
    }

    async loop(): Promise<boolean> {
        const now = performance.now();
        let delta = (now - this.lastTickMs) | 0;
        this.lastTickMs = now;
        if (delta > 200) {
            delta = 200;
        }
        this.timeoutMs += delta;

        if (this.prefetchQueue.size === 0 && this.urgentQueue.size === 0 && this.pendingPrefetchQueue.size === 0 && this.pendingUrgentQueue.size === 0) {
            return true;
        }
        if (!this.stream) {
            return false;
        }

        try {
            if (this.timeoutMs > 30000) {
                throw new Error('JS5 timeout');
            }

            while (this.urgentQueue.size < 20 && this.pendingUrgentQueue.size > 0) {
                const request = this.pendingUrgentQueue.values().next().value as QueuedJs5NetRequest;
                const packet = new Packet(new Uint8Array(4));
                packet.p1(1);
                packet.p3(request.key);
                this.stream.write(4, packet.data);
                this.pendingUrgentQueue.delete(request.key);
                this.urgentQueue.set(request.key, request);
            }

            while (this.prefetchQueue.size < 20 && this.pendingPrefetchQueue.size > 0) {
                let request: QueuedJs5NetRequest | null = null;
                while (this.requestQueue.length > 0) {
                    const queued = this.requestQueue.shift()!;
                    if (this.pendingPrefetchQueue.get(queued.key) === queued) {
                        request = queued;
                        break;
                    }
                }
                if (!request) {
                    break;
                }

                const packet = new Packet(new Uint8Array(4));
                packet.p1(0);
                packet.p3(request.key);
                this.stream.write(4, packet.data);
                this.pendingPrefetchQueue.delete(request.key);
                this.prefetchQueue.set(request.key, request);
            }

            for (let i = 0; i < 100; i++) {
                let available = this.stream.available();
                if (available < 0) {
                    throw new Error('JS5 stream closed');
                }
                if (available === 0) {
                    break;
                }

                this.timeoutMs = 0;
                const headerSize = this.incomingRequest === null ? 8 : this.incomingChunkPos === 0 ? 1 : 0;
                if (headerSize <= 0) {
                    if (!this.incomingRequest || !this.incomingGroupBuffer) {
                        throw new Error('Invalid JS5 receive state');
                    }

                    const payloadEnd = this.incomingGroupBuffer.data.length - this.incomingRequest.padding!;
                    let count = 512 - this.incomingChunkPos;
                    if (payloadEnd - this.incomingGroupBuffer.pos < count) {
                        count = payloadEnd - this.incomingGroupBuffer.pos;
                    }
                    if (count > available) {
                        count = available;
                    }

                    await this.stream.readBytes(this.incomingGroupBuffer.data, this.incomingGroupBuffer.pos, count);
                    if (this.xorKey !== 0) {
                        for (let i = 0; i < count; i++) {
                            this.incomingGroupBuffer.data[this.incomingGroupBuffer.pos + i] ^= this.xorKey;
                        }
                    }
                    this.incomingGroupBuffer.pos += count;
                    this.incomingChunkPos += count;

                    if (this.incomingGroupBuffer.pos === payloadEnd) {
                        const request = this.incomingRequest;
                        const data = this.incomingGroupBuffer.data;

                        if (request.key === 255 + (255 << 16)) {
                            this.masterIndexBuffer = this.incomingGroupBuffer;
                            for (let archive = 0; archive < this.archives.length; archive++) {
                                const loader = this.archives[archive];
                                if (loader) {
                                    this.masterIndexBuffer.pos = archive * 8 + 5;
                                    void loader.requestIndex(this.masterIndexBuffer.g4(), this.masterIndexBuffer.g4());
                                }
                            }
                            if (this.incomingUrgentRequest) {
                                this.urgentQueue.delete(request.key);
                            } else {
                                this.prefetchQueue.delete(request.key);
                            }
                            this.incomingRequest = null;
                            this.incomingGroupBuffer = null;
                            this.incomingChunkPos = 0;
                        } else {
                            if (typeof request.expectedCrc === 'number') {
                                const crc = Packet.getcrc(0, data, payloadEnd);
                                if (crc !== request.expectedCrc) {
                                    this.stream?.close();
                                    this.stream = null;
                                    this.xorKey = ((Math.random() * 255.0) | 0) + 1;
                                    Js5Net.crcErrorCount++;
                                    this.incomingRequest = null;
                                    this.incomingGroupBuffer = null;
                                    this.incomingChunkPos = 0;
                                    this.header.pos = 0;
                                    return false;
                                }
                            }

                            Js5Net.ioErrorCount = 0;
                            Js5Net.crcErrorCount = 0;
                            request.resolve(data);
                            if (this.incomingUrgentRequest) {
                                this.urgentQueue.delete(request.key);
                            } else {
                                this.prefetchQueue.delete(request.key);
                            }
                            this.incomingRequest = null;
                            this.incomingGroupBuffer = null;
                            this.incomingChunkPos = 0;
                        }
                    } else {
                        if (this.incomingChunkPos !== 512) {
                            break;
                        }
                        this.incomingChunkPos = 0;
                    }
                } else {
                    let count = headerSize - this.header.pos;
                    if (count > available) {
                        count = available;
                    }

                    await this.stream.readBytes(this.header.data, this.header.pos, count);
                    if (this.xorKey !== 0) {
                        for (let i = 0; i < count; i++) {
                            this.header.data[this.header.pos + i] ^= this.xorKey;
                        }
                    }
                    this.header.pos += count;

                    if (headerSize > this.header.pos) {
                        break;
                    }

                    if (this.incomingRequest === null) {
                        this.header.pos = 0;
                        const archive = this.header.g1();
                        const group = this.header.g2();
                        const compression = this.header.g1();
                        const packedSize = this.header.g4();
                        const key = group + (archive << 16);

                        let request = this.urgentQueue.get(key);
                        this.incomingUrgentRequest = true;
                        if (!request) {
                            request = this.prefetchQueue.get(key);
                            this.incomingUrgentRequest = false;
                        }
                        if (!request) {
                            throw new Error(`Unexpected JS5 response ${archive}.${group}`);
                        }

                        this.incomingRequest = request;
                        const js5HeaderSize = compression === 0 ? 5 : 9;
                        this.incomingGroupBuffer = new Packet(new Uint8Array(request.padding! + js5HeaderSize + packedSize));
                        this.incomingGroupBuffer.p1(compression);
                        this.incomingGroupBuffer.p4(packedSize);
                        this.incomingChunkPos = 8;
                        this.header.pos = 0;
                    } else if (this.incomingChunkPos === 0) {
                        if (this.header.data[0] === 0xff) {
                            this.header.pos = 0;
                            this.incomingChunkPos = 1;
                        } else {
                            this.incomingRequest = null;
                        }
                    }
                }
            }

            return true;
        } catch (e) {
            this.stream?.close();
            this.stream = null;
            Js5Net.ioErrorCount++;
            this.incomingRequest = null;
            this.incomingGroupBuffer = null;
            this.incomingChunkPos = 0;
            this.header.pos = 0;
            return false;
        }
    }

    queueRequest(provider: Js5Loader | null, group: number, archive: number, padding: number, expectedCrc: number, urgent: boolean): void {
        const key = group + (archive << 16);
        if (this.pendingUrgentQueue.has(key) || this.urgentQueue.has(key)) {
            return;
        }

        const pendingPrefetch = this.pendingPrefetchQueue.get(key);
        if (pendingPrefetch) {
            if (urgent) {
                this.pendingPrefetchQueue.delete(key);
                this.requestQueue = this.requestQueue.filter(queued => queued.key !== key);
                pendingPrefetch.urgent = true;
                this.pendingUrgentQueue.set(key, pendingPrefetch);
            }
            return;
        }

        if (!urgent && this.prefetchQueue.has(key)) {
            return;
        }

        const queued: QueuedJs5NetRequest = {
            archive,
            group,
            urgent,
            expectedCrc,
            padding,
            key,
            resolve: data => provider?.write(group, data, urgent, archive === 255)
        };

        if (urgent) {
            this.pendingUrgentQueue.set(key, queued);
        } else {
            this.requestQueue.push(queued);
            this.pendingPrefetchQueue.set(key, queued);
        }
    }

    registerProvider(archive: number, loader: Js5Loader): void {
        if (!this.masterIndexBuffer) {
            this.queueRequest(null, 255, 255, 0, 0, true);
            this.archives[archive] = loader;
            return;
        }

        this.masterIndexBuffer.pos = archive * 8 + 5;
        void loader.requestIndex(this.masterIndexBuffer.g4(), this.masterIndexBuffer.g4());
    }
}
