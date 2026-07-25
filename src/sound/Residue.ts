import JagVorbis from '#/sound/JagVorbis.js';

// jag::oldscape::sound::Residue
export default class Residue {
    readonly type = JagVorbis.readBits(16);
    readonly begin = JagVorbis.readBits(24);
    readonly end = JagVorbis.readBits(24);
    readonly partition_size = JagVorbis.readBits(24) + 1;
    readonly classifications = JagVorbis.readBits(6) + 1;
    readonly classbook = JagVorbis.readBits(8);
    readonly residue_books: Int32Array;

    constructor() {
        const var1 = new Int32Array(this.classifications);
        for (let var2 = 0; var2 < this.classifications; var2++) {
            let var3 = 0;
            const var4 = JagVorbis.readBits(3);
            const var5 = JagVorbis.readBit() !== 0;
            if (var5) {
                var3 = JagVorbis.readBits(5);
            }
            var1[var2] = (var3 << 3) | var4;
        }
        this.residue_books = new Int32Array(this.classifications * 8);
        for (let var6 = 0; var6 < this.classifications * 8; var6++) {
            this.residue_books[var6] = (var1[var6 >> 3] & (0x1 << (var6 & 0x7))) === 0 ? -1 : JagVorbis.readBits(8);
        }
    }

    // jag::oldscape::sound::Residue::PacketDecode
    packetDecode(arg0: Float32Array | number[], arg1: number, arg2: boolean): void {
        for (let var4 = 0; var4 < arg1; var4++) {
            arg0[var4] = 0.0;
        }
        if (arg2) {
            return;
        }
        const var5 = JagVorbis.codebooks[this.classbook].dimensions;
        const var6 = this.end - this.begin;
        const var7 = (var6 / this.partition_size) | 0;
        const var8 = new Int32Array(var7);
        for (let var9 = 0; var9 < 8; var9++) {
            let var10 = 0;
            while (var10 < var7) {
                if (var9 === 0) {
                    let var11 = JagVorbis.codebooks[this.classbook].decodeScalar();
                    for (let var12 = var5 - 1; var12 >= 0; var12--) {
                        if (var10 + var12 < var7) {
                            var8[var10 + var12] = var11 % this.classifications;
                        }
                        var11 = (var11 / this.classifications) | 0;
                    }
                }
                for (let var13 = 0; var13 < var5; var13++) {
                    const var14 = var8[var10];
                    const var15 = this.residue_books[Math.imul(var14, 8) + var9];
                    if (var15 >= 0) {
                        const var16 = this.begin + Math.imul(var10, this.partition_size);
                        const var17 = JagVorbis.codebooks[var15];
                        if (this.type === 0) {
                            if (var17.dimensions === 0) {
                                throw new Error();
                            }
                            const var18 = (this.partition_size / var17.dimensions) | 0;
                            for (let var19 = 0; var19 < var18; var19++) {
                                const var20 = var17.decodeVQ();
                                for (let var21 = 0; var21 < var17.dimensions; var21++) {
                                    arg0[var16 + var19 + Math.imul(var21, var18)] += var20[var21];
                                }
                            }
                        } else {
                            let var22 = 0;
                            while (var22 < this.partition_size) {
                                const var23 = var17.decodeVQ();
                                for (let var24 = 0; var24 < var17.dimensions; var24++) {
                                    arg0[var16 + var22] += var23[var24];
                                    var22++;
                                }
                            }
                        }
                    }
                    var10++;
                    if (var10 >= var7) {
                        break;
                    }
                }
            }
        }
    }
}
