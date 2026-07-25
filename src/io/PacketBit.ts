import Isaac from '#/io/Isaac.js';
import Packet from '#/io/Packet.js';

export default class PacketBit extends Packet {
    static readonly BITMASK: Int32Array = Int32Array.from([
        0, 1, 3, 7, 15, 31, 63, 127, 255, 511, 1023, 2047, 4095, 8191, 16383, 32767, 65535, 131071, 262143, 524287, 1048575, 2097151, 4194303, 8388607, 16777215, 33554431, 67108863, 134217727, 268435455, 536870911, 1073741823, 2147483647, -1
    ]);

    random: Isaac | null = null;

    bitPos: number = 0;

    constructor(arg0: number) {
        super(arg0);
    }

    gBit(arg0: number): number {
        let var2 = this.bitPos >> 3;
        let var3 = 8 - (this.bitPos & 0x7);
        this.bitPos += arg0;
        let var4 = 0;
        while (var3 < arg0) {
            var4 += (PacketBit.BITMASK[var3] & this.data[var2++]) << (arg0 - var3);
            arg0 -= var3;
            var3 = 8;
        }
        let var5: number;
        if (arg0 === var3) {
            var5 = var4 + (this.data[var2] & PacketBit.BITMASK[var3]);
        } else {
            var5 = var4 + ((this.data[var2] >> (var3 - arg0)) & PacketBit.BITMASK[arg0]);
        }
        return var5;
    }

    gIsaacArrayBuffer(arg0: number, arg1: Uint8Array | Int8Array): void {
        for (let var3 = 0; var3 < arg0; var3++) {
            arg1[var3] = this.data[this.pos++] - this.random!.takeNextValue();
        }
    }

    p1Enc(arg0: number): void {
        this.data[this.pos++] = arg0 + this.random!.takeNextValue();
    }

    bitsLeft(arg0: number): number {
        return arg0 * 8 - this.bitPos;
    }

    g1Enc(): number {
        return (this.data[this.pos++] - this.random!.takeNextValue()) & 0xff;
    }

    gBitStart(): void {
        this.bitPos = this.pos * 8;
    }

    gBitEnd(): void {
        this.pos = ((this.bitPos + 7) / 8) | 0;
    }

    seed(arg0: ArrayLike<number>): void {
        this.random = new Isaac(arg0);
    }
}
