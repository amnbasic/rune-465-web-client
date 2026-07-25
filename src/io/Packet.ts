import Linkable from '#/datastruct/Linkable.js';

import ByteArrayPool from '#/io/ByteArrayPool.js';

export default class Packet extends Linkable {
    static readonly crctable: Int32Array = new Int32Array(256);
    static readonly crctable64: bigint[] = new Array(256);

    static {
        for (let var0: number = 0; var0 < 256; var0++) {
            let var1: number = var0;
            for (let var2: number = 0; var2 < 8; var2++) {
                if ((var1 & 0x1) === 1) {
                    var1 = (var1 >>> 1) ^ 0xedb88320;
                } else {
                    var1 >>>= 0x1;
                }
            }
            Packet.crctable[var0] = var1;
        }
    }

    static {
        for (let var0: number = 0; var0 < 256; var0++) {
            let var1: bigint = BigInt(var0);
            for (let var3: number = 0; var3 < 8; var3++) {
                if ((var1 & 0x1n) === 1n) {
                    var1 = BigInt.asUintN(64, var1 >> 1n) ^ 0xc96c5795d7870f42n;
                } else {
                    var1 = BigInt.asUintN(64, var1 >> 0x1n);
                }
            }
            Packet.crctable64[var0] = var1;
        }
    }

    data: Uint8Array;

    pos: number = 0;

    constructor(arg0: number);
    constructor(arg0: Uint8Array);
    constructor(arg0: Uint8Array | number) {
        super();

        if (typeof arg0 === 'number') {
            this.data = ByteArrayPool.alloc(arg0);
            this.pos = 0;
        } else {
            this.pos = 0;
            this.data = arg0;
        }
    }

    static getcrc(arg0: number, arg1: Uint8Array, arg2: number): number {
        let var3 = -1;
        for (let var4 = arg0; var4 < arg2; var4++) {
            var3 = (var3 >>> 8) ^ Packet.crctable[(var3 ^ arg1[var4]) & 0xff];
        }
        return ~var3;
    }

    static pjstrlen(arg0: string): number {
        return arg0.length + 1;
    }

    static method541(arg0: Uint8Array, arg1: number): number {
        return Packet.getcrc(0, arg0, arg1);
    }

    g1_alt2(): number {
        return -this.data[this.pos++] & 0xff;
    }

    p8_alt3(arg0: bigint | number): void {
        const var1 = BigInt(arg0);
        this.p4_alt3(Number((var1 >> 32n) & 0xffffffffn));
        this.p4_alt3(Number(var1 & 0xffffffffn));
    }

    p1_alt2(arg0: number): void {
        this.data[this.pos++] = -arg0;
    }

    gjstr(): string {
        let str: string = '';
        let b: number;
        while ((b = this.data[this.pos++]) !== 0) {
            str += String.fromCharCode(b);
        }
        return str;
    }

    g4_alt1(): number {
        this.pos += 4;
        return ((this.data[this.pos - 3] & 0xff) << 8) + ((this.data[this.pos - 1] & 0xff) << 24) + ((this.data[this.pos - 2] & 0xff) << 16) + (this.data[this.pos - 4] & 0xff);
    }

    // 464 "int1" middle-endian int: wire bytes [b15-8, b7-0, b31-24, b23-16] (server Packet.putInt1).
    g4_int1(): number {
        this.pos += 4;
        return ((this.data[this.pos - 2] & 0xff) << 24) + ((this.data[this.pos - 1] & 0xff) << 16) + ((this.data[this.pos - 4] & 0xff) << 8) + (this.data[this.pos - 3] & 0xff);
    }

    gVarLong(arg0: number): bigint {
        const var5 = arg0 - 1;
        if (var5 < 0 || var5 > 7) {
            throw new Error();
        }
        let var2 = var5 * 8;
        let var3 = 0n;
        while (var2 >= 0) {
            var3 |= BigInt(this.data[this.pos++] & 0xff) << BigInt(var2);
            var2 -= 8;
        }
        return BigInt.asIntN(64, var3);
    }

    g2(): number {
        this.pos += 2;
        return (this.data[this.pos - 1] & 0xff) + ((this.data[this.pos - 2] & 0xff) << 8);
    }

    g2_alt3(): number {
        this.pos += 2;
        return ((this.data[this.pos - 2] - 128) & 0xff) + ((this.data[this.pos - 1] & 0xff) << 8);
    }

    g1b_alt1(): number {
        return ((this.data[this.pos++] - 128) << 24) >> 24;
    }

    g3(): number {
        this.pos += 3;
        return ((this.data[this.pos - 2] & 0xff) << 8) + ((this.data[this.pos - 3] & 0xff) << 16) + (this.data[this.pos - 1] & 0xff);
    }

    p2(arg0: number): void {
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0;
    }

    pVarLong(arg0: number, arg1: bigint | number): void {
        const var5 = arg0 - 1;
        if (var5 < 0 || var5 > 7) {
            throw new Error();
        }
        const var1 = BigInt(arg1);
        for (let var4 = var5 * 8; var4 >= 0; var4 -= 8) {
            this.data[this.pos++] = Number((var1 >> BigInt(var4)) & 0xffn);
        }
    }

    gdata(arg0: number, arg1: Uint8Array | Int8Array): void {
        for (let var3 = 0; var3 < arg0; var3++) {
            arg1[var3] = this.data[this.pos++];
        }
    }

    psmart(arg0: number): void {
        if (arg0 >= 0 && arg0 < 128) {
            this.p1(arg0);
        } else if (arg0 >= 0 && arg0 < 32768) {
            this.p2(arg0 + 32768);
        } else {
            throw new Error();
        }
    }

    rsaenc(arg0: bigint, arg1: bigint): void {
        const var3 = this.pos;
        const var4 = new Uint8Array(var3);
        this.pos = 0;
        this.gdata(var3, var4);
        let var5 = 0n;
        for (let i = 0; i < var4.length; i++) {
            var5 = (var5 << 8n) | BigInt(var4[i]);
        }
        if (var4.length > 0 && (var4[0] & 0x80) !== 0) {
            var5 -= 1n << BigInt(var4.length * 8);
        }
        let var6 = 1n;
        let var7 = ((var5 % arg1) + arg1) % arg1;
        let var8 = arg0;
        while (var8 > 0n) {
            if ((var8 & 0x1n) === 1n) {
                var6 = (var6 * var7) % arg1;
            }
            var7 = (var7 * var7) % arg1;
            var8 >>= 1n;
        }
        let var9: Uint8Array;
        if (var6 === 0n) {
            var9 = new Uint8Array([0]);
        } else {
            const var10: number[] = [];
            while (var6 > 0n) {
                var10.unshift(Number(var6 & 0xffn));
                var6 >>= 8n;
            }
            if ((var10[0] & 0x80) !== 0) {
                var10.unshift(0);
            }
            var9 = new Uint8Array(var10);
        }
        this.pos = 0;
        this.p1(var9.length);
        this.pdata(var9.length, var9);
    }

    g2b_alt3(): number {
        this.pos += 2;
        let var1 = ((this.data[this.pos - 1] & 0xff) << 8) + ((this.data[this.pos - 2] - 128) & 0xff);
        if (var1 > 32767) {
            var1 -= 65536;
        }
        return var1;
    }

    g4_alt3(): number {
        this.pos += 4;
        return (this.data[this.pos - 2] & 0xff) + ((this.data[this.pos - 1] & 0xff) << 8) + ((this.data[this.pos - 4] & 0xff) << 16) + ((this.data[this.pos - 3] & 0xff) << 24);
    }

    p2_alt1(arg0: number): void {
        this.data[this.pos++] = arg0;
        this.data[this.pos++] = arg0 >> 8;
    }

    gdata_alt1(arg0: Uint8Array, arg1: number): void {
        for (let var3 = arg1 - 1; var3 >= 0; var3--) {
            arg0[var3] = this.data[this.pos++];
        }
    }

    p4_alt3(arg0: number): void {
        this.data[this.pos++] = arg0 >> 16;
        this.data[this.pos++] = arg0 >> 24;
        this.data[this.pos++] = arg0;
        this.data[this.pos++] = arg0 >> 8;
    }

    gMidiVarLen(): number {
        let var1 = this.data[this.pos++];
        let var2 = 0;
        while ((var1 << 24) >> 24 < 0) {
            var2 = (var2 | (var1 & 0x7f)) << 7;
            var1 = this.data[this.pos++];
        }
        return var2 | var1;
    }

    g1_alt1(): number {
        return (this.data[this.pos++] - 128) & 0xff;
    }

    g4_alt2(): number {
        this.pos += 4;
        return ((this.data[this.pos - 4] & 0xff) << 8) + ((this.data[this.pos - 1] & 0xff) << 16) + ((this.data[this.pos - 2] & 0xff) << 24) + (this.data[this.pos - 3] & 0xff);
    }

    g8(): bigint {
        const var1 = BigInt(this.g4() >>> 0);
        const var3 = BigInt(this.g4() >>> 0);
        return BigInt.asIntN(64, var3 + (var1 << 32n));
    }

    tinydec(arg0: number, arg1: ArrayLike<number>): void {
        const var3 = ((arg0 - 5) / 8) | 0;
        const var4 = this.pos;
        this.pos = 5;
        for (let var5 = 0; var5 < var3; var5++) {
            let var6 = this.g4();
            let var7 = this.g4();
            let var8 = -957401312;
            let var9 = 32;
            while (var9-- > 0) {
                var7 = (var7 - ((var8 + arg1[(var8 >>> 11) & 0x3]) ^ (((var6 >>> 5) ^ (var6 << 4)) - -var6))) | 0;
                var8 = (var8 - -1640531527) | 0;
                var6 = (var6 - ((var7 + ((var7 >>> 5) ^ (var7 << 4))) ^ (arg1[var8 & 0x3] + var8))) | 0;
            }
            this.pos -= 8;
            this.p4(var6);
            this.p4(var7);
        }
        this.pos = var4;
    }

    g4(): number {
        this.pos += 4;
        return (this.data[this.pos - 1] & 0xff) + ((this.data[this.pos - 2] & 0xff) << 8) + ((this.data[this.pos - 4] & 0xff) << 24) + ((this.data[this.pos - 3] & 0xff) << 16);
    }

    g1b(): number {
        const value = this.data[this.pos++];
        return value > 127 ? value - 256 : value;
    }

    pdata(arg0: number, arg1: Uint8Array): void {
        for (let var3 = 0; var3 < arg0; var3++) {
            this.data[this.pos++] = arg1[var3];
        }
    }

    p4_alt2(arg0: number): void {
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0;
        this.data[this.pos++] = arg0 >> 24;
        this.data[this.pos++] = arg0 >> 16;
    }

    p1_alt3(arg0: number): void {
        this.data[this.pos++] = 128 - arg0;
    }

    p8(arg0: bigint | number): void {
        const var1 = BigInt(arg0);
        this.data[this.pos++] = Number((var1 >> 56n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 48n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 40n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 32n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 24n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 16n) & 0xffn);
        this.data[this.pos++] = Number((var1 >> 8n) & 0xffn);
        this.data[this.pos++] = Number(var1 & 0xffn);
    }

    pMidiVarLen(arg0: number): void {
        if ((arg0 & 0xffffff80) !== 0) {
            if ((arg0 & 0xffffc000) !== 0) {
                if ((arg0 & 0xffe00000) !== 0) {
                    if ((arg0 & 0xf0000000) !== 0) {
                        this.p1((arg0 >>> 28) | 0x80);
                    }
                    this.p1((arg0 >>> 21) | 0x80);
                }
                this.p1((arg0 >>> 14) | 0x80);
            }
            this.p1((arg0 >>> 7) | 0x80);
        }
        this.p1(arg0 & 0x7f);
    }

    p2_alt2(arg0: number): void {
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0 + 128;
    }

    gVarSmart(): number {
        let var1 = 0;
        let var2;
        for (var2 = this.gsmart(); var2 === 32767; var2 = this.gsmart()) {
            var1 += 32767;
        }
        return var1 + var2;
    }

    psize4(arg0: number): void {
        this.data[this.pos - arg0 - 4] = arg0 >> 24;
        this.data[this.pos - arg0 - 3] = arg0 >> 16;
        this.data[this.pos - arg0 - 2] = arg0 >> 8;
        this.data[this.pos - arg0 - 1] = arg0;
    }

    g2b(): number {
        this.pos += 2;
        let value = (this.data[this.pos - 1] & 0xff) + ((this.data[this.pos - 2] & 0xff) << 8);
        if (value > 32767) {
            value -= 65536;
        }
        return value;
    }

    g1b_alt2(): number {
        return (-this.data[this.pos++] << 24) >> 24;
    }

    pjstr(arg0: string): void {
        const var1 = arg0.length;
        for (let var2 = 0; var2 < var1; var2++) {
            this.data[this.pos++] = arg0.charCodeAt(var2);
        }
        this.data[this.pos++] = 0;
    }

    p3(arg0: number): void {
        this.data[this.pos++] = arg0 >> 16;
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0;
    }

    p4(arg0: number): void {
        this.data[this.pos++] = arg0 >> 24;
        this.data[this.pos++] = arg0 >> 16;
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0;
    }

    g2b_alt2(): number {
        this.pos += 2;
        let var1 = ((this.data[this.pos - 1] - 128) & 0xff) + ((this.data[this.pos - 2] & 0xff) << 8);
        if (var1 > 32767) {
            var1 -= 65536;
        }
        return var1;
    }

    method340(): number {
        this.pos += 3;
        return (this.data[this.pos - 1] & 0xff) + ((this.data[this.pos - 2] & 0xff) << 16) + ((this.data[this.pos - 3] & 0xff) << 8);
    }

    psize1(arg0: number): void {
        this.data[this.pos - arg0 - 1] = arg0;
    }

    method342(): number {
        const var1 = this.data[this.pos] & 0xff;
        return var1 < 128 ? this.g1() - 64 : this.g2() + -49152;
    }

    g2_alt1(): number {
        this.pos += 2;
        return ((this.data[this.pos - 1] & 0xff) << 8) + (this.data[this.pos - 2] & 0xff);
    }

    p2_alt3(arg0: number): void {
        this.data[this.pos++] = arg0 + 128;
        this.data[this.pos++] = arg0 >> 8;
    }

    addcrc(arg0: number): number {
        const var2 = Packet.getcrc(arg0, this.data, this.pos);
        this.p4(var2);
        return var2;
    }

    p1(arg0: number): void {
        this.data[this.pos++] = arg0;
    }

    g1(): number {
        return this.data[this.pos++] & 0xff;
    }

    g2_alt2(): number {
        this.pos += 2;
        return ((this.data[this.pos - 1] - 128) & 0xff) + ((this.data[this.pos - 2] & 0xff) << 8);
    }

    gsmart(): number {
        const var1 = this.data[this.pos] & 0xff;
        return var1 < 128 ? this.g1() : this.g2() - 32768;
    }

    p4_alt1(arg0: number): void {
        this.data[this.pos++] = arg0;
        this.data[this.pos++] = arg0 >> 8;
        this.data[this.pos++] = arg0 >> 16;
        this.data[this.pos++] = arg0 >> 24;
    }

    g1_alt3(): number {
        return (128 - this.data[this.pos++]) & 0xff;
    }

    fastgstr(): string | null {
        if (this.data[this.pos] === 0) {
            this.pos++;
            return null;
        } else {
            return this.gjstr();
        }
    }
}
