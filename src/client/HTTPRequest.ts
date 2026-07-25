import Packet from '#/io/Packet.js';
import MonotonicTime from '#/util/MonotonicTime.js';

type BrowserDataInputStream = {
    available(): number;
    read(dst: Uint8Array, off: number, len: number): number;
};

type HTTPRequestState = {
    result: BrowserDataInputStream | null;
    status: number;
};

// jag::http::HTTPRequest::HTTPRequest
export default class HTTPRequest {
    stage = 0;
    readonly req: HTTPRequestState = { result: null, status: 0 };
    stream: BrowserDataInputStream | null = null;
    readonly temp = new Uint8Array(4);
    read1 = 0;
    data: Uint8Array | null = null;
    read2 = 0;
    readonly timeout: number;

    constructor(url: URL | string) {
        this.stage = 0;
        this.timeout = MonotonicTime.currentTime() + 30000;
        void this.load(url);
    }

    private async load(url: URL | string): Promise<void> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('fds');
            }

            const data = new Uint8Array(await response.arrayBuffer());
            let pos = 0;
            this.req.result = {
                available: () => data.length - pos,
                read: (dst: Uint8Array, off: number, len: number) => {
                    const n = Math.min(len, data.length - pos);
                    dst.set(data.subarray(pos, pos + n), off);
                    pos += n;
                    return n;
                }
            };
            this.req.status = 1;
        } catch {
            this.req.status = 2;
        }
    }

    // jag::http::HTTPRequest::GetData
    getData(): Uint8Array | null {
        if (this.timeout < MonotonicTime.currentTime()) {
            throw new Error('fdt');
        }
        if (this.stage === 0) {
            if (this.req.status === 2) {
                throw new Error('fds');
            }
            if (this.req.status === 1) {
                this.stage = 1;
                this.stream = this.req.result as BrowserDataInputStream;
            }
        }
        if (this.stage === 1) {
            const stream = this.stream!;
            let available = stream.available();
            if (available > 0) {
                if (available + this.read1 > 4) {
                    available = 4 - this.read1;
                }
                this.read1 += stream.read(this.temp, this.read1, available);
                if (this.read1 === 4) {
                    const size = new Packet(this.temp).g4();
                    this.stage = 2;
                    this.data = new Uint8Array(size);
                }
            }
        }
        if (this.stage === 2) {
            const stream = this.stream!;
            const data = this.data!;
            let available = stream.available();
            if (available > 0) {
                if (data.length < this.read2 + available) {
                    available = data.length - this.read2;
                }
                this.read2 += stream.read(data, this.read2, available);
                if (this.read2 === data.length) {
                    return data;
                }
            }
        }
        return null;
    }
}
