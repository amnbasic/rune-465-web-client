import JagVorbis from '#/sound/JagVorbis.js';
import MathTool from '#/util/MathTool.js';

// jag::oldscape::sound::CodeBook
export default class CodeBook {
    readonly dimensions: number;
    readonly entries: number;
    readonly lengths: Int32Array;
    multiplicands: Int32Array | null = null;
    vqLookup: number[][] | null = null;
    huffmanTree: Int32Array | null = null;

    // jag::oldscape::sound::CodeBook::Lookup1Values
    static lookup1Values(arg0: number, arg1: number): number {
        let var2;
        const var2Pow = Math.pow(arg0, 1.0 / arg1);
        for (var2 = ((Number.isNaN(var2Pow) ? 0 : var2Pow > 2147483647 ? 2147483647 : var2Pow < -2147483648 ? -2147483648 : Math.trunc(var2Pow)) + 1) | 0; CodeBook.method534(var2, arg1) > arg0; var2--) {}
        return var2;
    }

    constructor() {
        JagVorbis.readBits(24);
        this.dimensions = JagVorbis.readBits(16);
        this.entries = JagVorbis.readBits(24);
        this.lengths = new Int32Array(this.entries);
        const var1 = JagVorbis.readBit() !== 0;
        if (var1) {
            let var2 = 0;
            let var3 = JagVorbis.readBits(5) + 1;
            while (var2 < this.entries) {
                const var4 = JagVorbis.readBits(MathTool.bitsRequired(this.entries - var2));
                for (let var5 = 0; var5 < var4; var5++) {
                    this.lengths[var2++] = var3;
                }
                var3++;
            }
        } else {
            const var6 = JagVorbis.readBit() !== 0;
            for (let var7 = 0; var7 < this.entries; var7++) {
                if (var6 && JagVorbis.readBit() === 0) {
                    this.lengths[var7] = 0;
                } else {
                    this.lengths[var7] = JagVorbis.readBits(5) + 1;
                }
            }
        }
        this.prepareHuffman();
        const var8 = JagVorbis.readBits(4);
        if (var8 > 0) {
            const var9 = JagVorbis.float32Unpack(JagVorbis.readBits(32));
            const var10 = JagVorbis.float32Unpack(JagVorbis.readBits(32));
            const var11 = JagVorbis.readBits(4) + 1;
            const var12 = JagVorbis.readBit() !== 0;
            let var13;
            if (var8 === 1) {
                var13 = CodeBook.lookup1Values(this.entries, this.dimensions);
            } else {
                var13 = this.entries * this.dimensions;
            }
            this.multiplicands = new Int32Array(var13);
            for (let var14 = 0; var14 < var13; var14++) {
                this.multiplicands[var14] = JagVorbis.readBits(var11);
            }
            this.vqLookup = Array.from({ length: this.entries }, () => new Array(this.dimensions).fill(0));
            if (var8 === 1) {
                for (let var15 = 0; var15 < this.entries; var15++) {
                    let var16 = 0.0;
                    let var17 = 1;
                    for (let var18 = 0; var18 < this.dimensions; var18++) {
                        const var19 = ((var15 / var17) | 0) % var13;
                        const var20 = this.multiplicands[var19] * var10 + var9 + var16;
                        this.vqLookup![var15][var18] = var20;
                        if (var12) {
                            var16 = var20;
                        }
                        var17 *= var13;
                    }
                }
                return;
            }
            for (let var21 = 0; var21 < this.entries; var21++) {
                let var22 = 0.0;
                let var23 = var21 * this.dimensions;
                for (let var24 = 0; var24 < this.dimensions; var24++) {
                    const var25 = this.multiplicands[var23] * var10 + var9 + var22;
                    this.vqLookup![var21][var24] = var25;
                    if (var12) {
                        var22 = var25;
                    }
                    var23++;
                }
            }
        }
    }

    // jag::oldscape::sound::CodeBook::PrepareHuffman
    prepareHuffman(): void {
        const var1 = new Int32Array(this.entries);
        const var2 = new Int32Array(33);
        for (let var3 = 0; var3 < this.entries; var3++) {
            const var4 = this.lengths[var3];
            if (var4 !== 0) {
                const var5 = 0x1 << (32 - var4);
                const var6 = var2[var4];
                var1[var3] = var6;
                let var7;
                if ((var6 & var5) === 0) {
                    var7 = var6 | var5;
                    for (let var8 = var4 - 1; var8 >= 1; var8--) {
                        const var9 = var2[var8];
                        if (var9 !== var6) {
                            break;
                        }
                        const var10 = 0x1 << (32 - var8);
                        if ((var9 & var10) !== 0) {
                            var2[var8] = var2[var8 - 1];
                            break;
                        }
                        var2[var8] = var9 | var10;
                    }
                } else {
                    var7 = var2[var4 - 1];
                }
                var2[var4] = var7;
                for (let var11 = var4 + 1; var11 <= 32; var11++) {
                    const var12 = var2[var11];
                    if (var12 === var6) {
                        var2[var11] = var7;
                    }
                }
            }
        }
        this.huffmanTree = new Int32Array(8);
        let var13 = 0;
        for (let var14 = 0; var14 < this.entries; var14++) {
            const var15 = this.lengths[var14];
            if (var15 !== 0) {
                const var16 = var1[var14];
                let var17 = 0;
                for (let var18 = 0; var18 < var15; var18++) {
                    const var19 = -2147483648 >>> var18;
                    if ((var16 & var19) === 0) {
                        var17++;
                    } else {
                        if (this.huffmanTree![var17] === 0) {
                            this.huffmanTree![var17] = var13;
                        }
                        var17 = this.huffmanTree![var17];
                    }
                    if (var17 >= this.huffmanTree!.length) {
                        const var20: Int32Array = new Int32Array(this.huffmanTree!.length * 2);
                        for (let var21 = 0; var21 < this.huffmanTree!.length; var21++) {
                            var20[var21] = this.huffmanTree![var21];
                        }
                        this.huffmanTree = var20;
                    }
                }
                this.huffmanTree![var17] = ~var14;
                if (var17 >= var13) {
                    var13 = var17 + 1;
                }
            }
        }
    }

    // todo: identify
    static method534(arg0: number, arg1: number): number {
        let var2 = 1;
        while (arg1 > 1) {
            if ((arg1 & 0x1) !== 0) {
                var2 = Math.imul(var2, arg0);
            }
            arg0 = Math.imul(arg0, arg0);
            arg1 >>= 1;
        }
        if (arg1 === 1) {
            return Math.imul(arg0, var2);
        } else {
            return var2;
        }
    }

    // jag::oldscape::sound::CodeBook::DecodeScalar
    decodeScalar(): number {
        let var1;
        for (var1 = 0; this.huffmanTree![var1] >= 0; var1 = JagVorbis.readBit() === 0 ? var1 + 1 : this.huffmanTree![var1]) {}
        return ~this.huffmanTree![var1];
    }

    // jag::oldscape::sound::CodeBook::DecodeVQ
    decodeVQ(): number[] {
        return this.vqLookup![this.decodeScalar()];
    }
}
