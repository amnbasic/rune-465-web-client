import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';
import JavaRandom from '#/util/JavaRandom.js';

export default class TextureOpSparkle extends TextureOp {
    count: number = 2000;
    variance: number = 4096;
    brightness: number = 0;
    length: number = 16;
    seed: number = 0;

    constructor() {
        super(0, true);
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.seed = arg0.g1();
        } else if (arg1 === 1) {
            this.count = arg0.g2();
        } else if (arg1 === 2) {
            this.length = arg0.g1();
        } else if (arg1 === 3) {
            this.brightness = arg0.g2();
        } else if (arg1 === 4) {
            this.variance = arg0.g2();
        }
    }

    override postDecode(): void {
        Statics.method740();
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.variance >> 1;
            const var4 = this.monoCache.getAllFrames();
            const var5 = new JavaRandom(this.seed);
            for (let var6 = 0; var6 < this.count; var6++) {
                const var7 = this.variance > 0 ? (this.brightness + Statics.method812(this.variance, var5) - var3) | 0 : this.brightness;
                const var8 = (var7 >> 4) & 0xff;
                let var9 = Statics.method812(Texture.width, var5);
                let var10 = Statics.method812(Texture.height, var5);
                let var11 = (var10 + (Math.imul(this.length, Statics.field1734![var8]) >> 12)) | 0;
                let var12 = ((Math.imul(Statics.field2920![var8], this.length) >> 12) + var9) | 0;
                let var13 = var12 - var9;
                let var14 = var11 - var10;
                if (var13 !== 0 || var14 !== 0) {
                    if (var14 < 0) {
                        var14 = -var14;
                    }
                    if (var13 < 0) {
                        var13 = -var13;
                    }
                    const var15 = var14 > var13;
                    if (var15) {
                        const var16 = var12;
                        const var17 = var9;
                        var12 = var11;
                        var9 = var10;
                        var11 = var16;
                        var10 = var17;
                    }
                    if (var12 < var9) {
                        const var18 = var9;
                        const var19 = var10;
                        var9 = var12;
                        var10 = var11;
                        var11 = var19;
                        var12 = var18;
                    }
                    let var20 = var10;
                    const var21 = var12 - var9;
                    let var22 = var11 - var10;
                    if (var21 === 0) {
                        throw new Error();
                    }
                    const var23 = (2048 / var21) | 0;
                    let var24 = (-var21 / 2) | 0;
                    const var25 = var11 <= var10 ? -1 : 1;
                    if (var22 < 0) {
                        var22 = -var22;
                    }
                    const var26 = 1024 - (Statics.method812(4096, var5) >> 2);
                    for (let var27 = var9; var27 < var12; var27++) {
                        const var28 = Texture.widthMask & var27;
                        var24 = (var24 + var22) | 0;
                        const var29 = (var26 + Math.imul(var23, var27 - var9) + 1024) | 0;
                        const var30 = var20 & Texture.heightMask;
                        if (var24 > 0) {
                            var24 = (var24 + -var21) | 0;
                            var20 = (var20 + var25) | 0;
                        }
                        if (var15) {
                            var4[var30][var28] = var29;
                        } else {
                            var4[var28][var30] = var29;
                        }
                    }
                }
            }
        }
        return var2;
    }
}
