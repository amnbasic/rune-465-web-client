import TextureNoiseTable from '#/dash3d/TextureNoiseTable.js';
import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpSineWaves extends TextureOp {
    static readonly field1720: Int32Array = new Int32Array(4096);

    static {
        for (let var0 = 0; var0 < 4096; var0++) {
            TextureOpSineWaves.field1720[var0] = TextureOpSineWaves.method394(var0);
        }
    }

    decay: number = 1638;
    amplitudes: Int16Array | null = null;
    flagCenter: boolean = true;
    permTable: Int8Array = new Int8Array(512);
    freqX: number = 4;
    octaves: number = 4;
    seed: number = 0;
    freqY: number = 4;
    freqMultipliers: Int16Array | null = null;

    constructor() {
        super(0, true);
    }

    static method394(arg0: number): number {
        const var1 = arg0 * 6 - 61440;
        const var2 = ((var1 * arg0) >> 12) + 40960;
        const var3 = (((arg0 * arg0) >> 12) * arg0) >> 12;
        return (var2 * var3) >> 12;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.flagCenter = arg0.g1() === 1;
        } else if (arg1 === 1) {
            this.octaves = arg0.g1();
        } else if (arg1 === 2) {
            this.decay = arg0.g2b();
            if (this.decay < 0) {
                this.amplitudes = new Int16Array(this.octaves);
                for (let i = 0; i < this.octaves; i++) {
                    this.amplitudes[i] = arg0.g2b();
                }
            }
        } else if (arg1 === 3) {
            this.freqX = this.freqY = arg0.g1();
        } else if (arg1 === 4) {
            this.seed = arg0.g1();
        } else if (arg1 === 5) {
            this.freqX = arg0.g1();
        } else if (arg1 === 6) {
            this.freqY = arg0.g1();
        }
    }

    cosInterpolate(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): number {
        const var7 = arg0 - 4096;
        const var8 = arg1 >> 12;
        const var9 = arg1 & 0xfff;
        const var10 = var9 - 4096;
        const var11 = TextureOpSineWaves.field1720[var9];
        let var12 = var8 + 1;
        const var13 = var8 & 0xff;
        if (var12 >= arg4) {
            var12 = 0;
        }
        const var14 = var12 & 0xff;
        const var15 = this.permTable[var13 + arg2] & 0x3;
        let var16;
        if (var15 > 1) {
            var16 = var15 === 2 ? var9 - arg0 : -arg0 + -var9;
        } else {
            var16 = var15 === 0 ? var9 + arg0 : arg0 + -var9;
        }
        const var17 = this.permTable[arg2 + var14] & 0x3;
        let var18;
        if (var17 <= 1) {
            var18 = var17 === 0 ? var10 + arg0 : arg0 + -var10;
        } else {
            var18 = var17 === 2 ? var10 - arg0 : -arg0 + -var10;
        }
        const var19 = this.permTable[var13 + arg3] & 0x3;
        const var20 = (((var18 - var16) * var11) >> 12) + var16;
        let var21;
        if (var19 <= 1) {
            var21 = var19 === 0 ? var7 + var9 : -var9 + var7;
        } else {
            var21 = var19 === 2 ? var9 - var7 : -var9 - var7;
        }
        const var22 = this.permTable[arg3 + var14] & 0x3;
        let var23;
        if (var22 > 1) {
            var23 = var22 === 2 ? var10 - var7 : -var10 - var7;
        } else {
            var23 = var22 === 0 ? var7 + var10 : var7 + -var10;
        }
        const var24 = var21 + ((var11 * (var23 - var21)) >> 12);
        return (((var24 - var20) * arg5) >> 12) + var20;
    }

    generateWaves(arg0: number, arg1: Int32Array): void {
        const var3 = Texture.rowLut[arg0] * this.freqY;
        if (this.octaves === 1) {
            const var4 = this.freqMultipliers![0] << 12;
            const var5 = (var3 * var4) >> 12;
            const var6 = (var4 * this.freqX) >> 12;
            const var7 = this.amplitudes![0];
            const var8 = (var4 * this.freqY) >> 12;
            const var9 = var5 >> 12;
            const var10 = var5 & 0xfff;
            const var11 = TextureOpSineWaves.field1720[var10];
            let var12 = var9 + 1;
            if (var8 <= var12) {
                var12 = 0;
            }
            const var13 = this.permTable[var9 & 0xff] & 0xff;
            const var14 = this.permTable[var12 & 0xff] & 0xff;
            if (this.flagCenter) {
                for (let var18 = 0; var18 < Texture.width; var18++) {
                    const var19 = this.freqX * Texture.columnLut[var18];
                    const var20 = this.cosInterpolate(var10, (var19 * var4) >> 12, var13, var14, var6, var11);
                    const var21 = (var7 * var20) >> 12;
                    arg1[var18] = (var21 >> 1) + 2048;
                }
            } else {
                for (let var15 = 0; var15 < Texture.width; var15++) {
                    const var16 = this.freqX * Texture.columnLut[var15];
                    const var17 = this.cosInterpolate(var10, (var4 * var16) >> 12, var13, var14, var6, var11);
                    arg1[var15] = (var17 * var7) >> 12;
                }
            }
            return;
        }

        const var22 = this.amplitudes![0];
        if (var22 > 8 || var22 < -8) {
            const var23 = this.freqMultipliers![0] << 12;
            const var24 = (this.freqY * var23) >> 12;
            const var25 = (var3 * var23) >> 12;
            const var26 = var25 >> 12;
            const var27 = this.permTable[var26 & 0xff] & 0xff;
            const var28 = (this.freqX * var23) >> 12;
            let var29 = var26 + 1;
            if (var29 >= var24) {
                var29 = 0;
            }
            const var30 = var25 & 0xfff;
            const var31 = this.permTable[var29 & 0xff] & 0xff;
            const var32 = TextureOpSineWaves.field1720[var30];
            for (let var33 = 0; var33 < Texture.width; var33++) {
                const var34 = Texture.columnLut[var33] * this.freqX;
                const var35 = this.cosInterpolate(var30, (var34 * var23) >> 12, var27, var31, var28, var32);
                arg1[var33] = (var35 * var22) >> 12;
            }
        }

        for (let var36 = 1; var36 < this.octaves; var36++) {
            const var37 = this.amplitudes![var36];
            if (var37 > 8 || var37 < -8) {
                const var38 = this.freqMultipliers![var36] << 12;
                const var39 = (this.freqX * var38) >> 12;
                const var40 = (this.freqY * var38) >> 12;
                const var41 = (var3 * var38) >> 12;
                const var42 = var41 >> 12;
                let var43 = var42 + 1;
                const var44 = this.permTable[var42 & 0xff] & 0xff;
                const var45 = var41 & 0xfff;
                if (var40 <= var43) {
                    var43 = 0;
                }
                const var46 = this.permTable[var43 & 0xff] & 0xff;
                const var47 = TextureOpSineWaves.field1720[var45];
                if (this.flagCenter && var36 === this.octaves - 1) {
                    for (let var51 = 0; var51 < Texture.width; var51++) {
                        const var52 = this.freqX * Texture.columnLut[var51];
                        const var53 = this.cosInterpolate(var45, (var38 * var52) >> 12, var44, var46, var39, var47);
                        const var54 = arg1[var51] + ((var37 * var53) >> 12);
                        arg1[var51] = (var54 >> 1) + 2048;
                    }
                } else {
                    for (let var48 = 0; var48 < Texture.width; var48++) {
                        const var49 = Texture.columnLut[var48] * this.freqX;
                        const var50 = this.cosInterpolate(var45, (var49 * var38) >> 12, var44, var46, var39, var47);
                        arg1[var48] += (var50 * var37) >> 12;
                    }
                }
            }
        }
    }

    override postDecode(): void {
        this.permTable = TextureNoiseTable.get(this.seed);
        this.computeHarmonics();
        for (let var1 = this.octaves - 1; var1 >= 1; var1--) {
            const var2 = this.amplitudes![var1];
            if (var2 > 8 || var2 < -8) {
                return;
            }
            this.octaves--;
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            this.generateWaves(arg0, var2);
        }
        return var2;
    }

    computeHarmonics(): void {
        if (this.decay > 0) {
            this.amplitudes = new Int16Array(this.octaves);
            this.freqMultipliers = new Int16Array(this.octaves);
            for (let var2 = 0; var2 < this.octaves; var2++) {
                this.amplitudes[var2] = (Math.pow(this.decay / 4096.0, var2) * 4096.0) | 0;
                this.freqMultipliers[var2] = Math.pow(2.0, var2) | 0;
            }
        } else if (this.amplitudes !== null && this.octaves === this.amplitudes.length) {
            this.freqMultipliers = new Int16Array(this.octaves);
            for (let var1 = 0; var1 < this.octaves; var1++) {
                this.freqMultipliers[var1] = Math.pow(2.0, var1) | 0;
            }
        }
    }
}
