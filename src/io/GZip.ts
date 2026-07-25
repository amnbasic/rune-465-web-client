import { inflateSync } from 'fflate';

import Packet from '#/io/Packet.js';

export default class GZip {
    inflater: unknown = null;

    constructor();
    constructor(arg0: number, arg1: number, arg2: number);
    constructor(arg0: number = -1, arg1: number = 1000000, arg2: number = 1000000) {}

    decompress(arg0: Packet, arg1: Uint8Array | Int8Array): void {
        if (arg0.data[arg0.pos] !== 31 || (arg0.data[arg0.pos + 1] << 24) >> 24 !== -117) {
            throw new Error('Invalid GZIP header!');
        }
        if (this.inflater === null) {
            this.inflater = {};
        }
        try {
            const var3 = inflateSync(arg0.data.subarray(arg0.pos + 10, arg0.data.length - 8));
            arg1.set(var3.subarray(0, arg1.length));
        } catch (var3) {
            this.inflater = {};
            throw new Error('Invalid GZIP compressed data!');
        }
        this.inflater = {};
    }
}
