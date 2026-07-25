import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';
import ArrayUtil from '#/util/ArrayUtil.js';
import JavaRandom from '#/util/JavaRandom.js';

export default class TextureOpWood extends TextureOp {
    opacity2: number = 0;
    minBandHeight: number = 409;
    maxBandWidth: number = 2048;
    minBandWidth: number = 1024;
    seed: number = 0;
    maxBandHeight: number = 819;
    featherMode: number = 0;
    brightness: number = 1024;
    variance: number = 1024;
    feather: number = 1024;

    constructor() {
        super(0, true);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (!this.monoCache.field3098) {
            return var2;
        }
        const var3 = this.monoCache.getAllFrames();
        let var4 = 0;
        let var5 = 0;
        let var6 = 0;
        let var7 = 0;
        let var8 = 0;
        let var9 = true;
        let var10 = true;
        let var11 = 0;
        const var12 = Math.imul(this.minBandWidth, Texture.width) >> 12;
        let var13 = 0;
        const var14 = Math.imul(this.maxBandWidth, Texture.width) >> 12;
        const var15 = Math.imul(Texture.height, this.minBandHeight) >> 12;
        const var16 = Math.imul(Texture.height, this.maxBandHeight) >> 12;
        if (var16 <= 1) {
            return var3[arg0];
        }
        this.opacity2 = Math.imul(this.feather, (Texture.width / 8) | 0) >> 12;
        if (var12 === 0) {
            throw new Error();
        }
        const var17 = ((Texture.width / var12) | 0) + 1;
        let var18 = Array.from({ length: var17 }, () => new Int32Array(3));
        const var19 = new JavaRandom(this.seed);
        let var20 = Array.from({ length: var17 }, () => new Int32Array(3));
        while (true) {
            while (true) {
                let var21 = var12 + Statics.method812(var14 - var12, var19);
                let var22 = var21 + var7;
                let var23 = var15 + Statics.method812(var16 - var15, var19);
                if (var22 > Texture.width) {
                    var22 = Texture.width;
                    var21 = Texture.width - var7;
                }
                let var27: number;
                if (var10) {
                    var27 = 0;
                } else {
                    let var24 = var8;
                    const var25 = var20[var8];
                    let var26 = 0;
                    var27 = var25[2];
                    let var28 = var22 + var4;
                    if (var28 < 0) {
                        var28 += Texture.width;
                    }
                    if (Texture.width < var28) {
                        var28 -= Texture.width;
                    }
                    while (true) {
                        const var29 = var20[var24];
                        if (var28 >= var29[0] && var28 <= var29[1]) {
                            if (var8 !== var24) {
                                let var30 = var4 + var7;
                                if (var30 < 0) {
                                    var30 += Texture.width;
                                }
                                if (var30 > Texture.width) {
                                    var30 -= Texture.width;
                                }
                                for (let var31 = 1; var31 <= var26; var31++) {
                                    const var32 = var20[(var31 + var8) % var13];
                                    var27 = Math.max(var27, var32[2]);
                                }
                                for (let var33 = 0; var33 <= var26; var33++) {
                                    const var34 = var20[(var8 + var33) % var13];
                                    const var35 = var34[2];
                                    if (var35 !== var27) {
                                        const var36 = var34[1];
                                        const var37 = var34[0];
                                        let var38: number;
                                        let var39: number;
                                        if (var28 > var30) {
                                            var39 = Math.max(var30, var37);
                                            var38 = Math.min(var28, var36);
                                        } else if (var37 === 0) {
                                            var38 = Math.min(var28, var36);
                                            var39 = 0;
                                        } else {
                                            var39 = Math.max(var30, var37);
                                            var38 = Texture.width;
                                        }
                                        this.drawBand(var19, var3, var6 + var39, var35, var38 - var39, var27 - var35);
                                    }
                                }
                            }
                            var8 = var24;
                            break;
                        }
                        var24++;
                        if (var24 >= var13) {
                            var24 = 0;
                        }
                        var26++;
                    }
                }
                if (var23 + var27 <= Texture.height) {
                    var9 = false;
                } else {
                    var23 = Texture.height - var27;
                }
                if (Texture.width === var22) {
                    this.drawBand(var19, var3, var7 + var5, var27, var21, var23);
                    if (var9) {
                        return var2;
                    }
                    var9 = true;
                    var8 = 0;
                    var10 = false;
                    const var40 = var18[var11++];
                    var40[2] = var27 + var23;
                    const var41 = var20;
                    var13 = var11;
                    var40[0] = var7;
                    var7 = 0;
                    var20 = var18;
                    var6 = var5;
                    var11 = 0;
                    var40[1] = var22;
                    var18 = var41;
                    var5 = Statics.method812(Texture.width, var19);
                    var4 = var5 - var6;
                    let var42 = var4;
                    if (var4 < 0) {
                        var42 = var4 + Texture.width;
                    }
                    if (var42 > Texture.width) {
                        var42 -= Texture.width;
                    }
                    while (true) {
                        const var43 = var20[var8];
                        if (var42 >= var43[0] && var43[1] >= var42) {
                            break;
                        }
                        var8++;
                        if (var8 >= var13) {
                            var8 = 0;
                        }
                    }
                } else {
                    const var44 = var18[var11++];
                    var44[0] = var7;
                    var44[2] = var23 + var27;
                    var44[1] = var22;
                    this.drawBand(var19, var3, var7 + var5, var27, var21, var23);
                    var7 = var22;
                }
            }
        }
    }

    drawBand(arg0: JavaRandom, arg1: Int32Array[], arg2: number, arg3: number, arg4: number, arg5: number): void {
        const var7 = this.variance <= 0 ? 4096 : 4096 - Statics.method812(this.variance, arg0);
        const var8 = Math.imul(this.brightness, this.opacity2) >> 12;
        const var9 = this.opacity2 - (var8 <= 0 ? 0 : Statics.method812(var8, arg0));
        if (Texture.width <= arg2) {
            arg2 -= Texture.width;
        }
        if (var9 > 0) {
            if (arg5 <= 0 || arg4 <= 0) {
                return;
            }
            const var14 = (arg4 / 2) | 0;
            const var15 = (arg5 / 2) | 0;
            const var16 = var15 >= var9 ? var9 : var15;
            const var17 = var14 >= var9 ? var9 : var14;
            const var18 = var17 + arg2;
            const var19 = (arg4 - Math.imul(var17, 2)) | 0;
            for (let var20 = 0; var20 < arg5; var20++) {
                const var21 = arg1[arg3 + var20];
                if (var16 > var20) {
                    const var22 = (Math.imul(var7, var20) / var16) | 0;
                    if (this.featherMode === 0) {
                        for (let var25 = 0; var25 < var17; var25++) {
                            const var26 = (Math.imul(var7, var25) / var17) | 0;
                            var21[(arg2 + var25) & Texture.widthMask] = var21[(arg4 + arg2 - var25 - 1) & Texture.widthMask] = Math.imul(var22, var26) >> 12;
                        }
                    } else {
                        for (let var23 = 0; var23 < var17; var23++) {
                            const var24 = (Math.imul(var23, var7) / var17) | 0;
                            var21[(var23 + arg2) & Texture.widthMask] = var21[(arg2 + arg4 - var23 - 1) & Texture.widthMask] = var22 <= var24 ? var22 : var24;
                        }
                    }
                    if (Texture.width < var19 + var18) {
                        const var27 = Texture.width - var18;
                        ArrayUtil.method837(var21, var18, var27, var22);
                        ArrayUtil.method837(var21, 0, var19 - var27, var22);
                    } else {
                        ArrayUtil.method837(var21, var18, var19, var22);
                    }
                } else {
                    const var28 = arg5 - var20 - 1;
                    if (var16 > var28) {
                        const var29 = (Math.imul(var28, var7) / var16) | 0;
                        if (this.featherMode === 0) {
                            for (let var32 = 0; var32 < var17; var32++) {
                                const var33 = (Math.imul(var7, var32) / var17) | 0;
                                var21[Texture.widthMask & (var32 + arg2)] = var21[Texture.widthMask & (arg2 + arg4 - var32 - 1)] = Math.imul(var33, var29) >> 12;
                            }
                        } else {
                            for (let var30 = 0; var30 < var17; var30++) {
                                const var31 = (Math.imul(var30, var7) / var17) | 0;
                                var21[Texture.widthMask & (var30 + arg2)] = var21[Texture.widthMask & (arg2 + arg4 - var30 - 1)] = var29 <= var31 ? var29 : var31;
                            }
                        }
                        if (Texture.width >= var18 + var19) {
                            ArrayUtil.method837(var21, var18, var19, var29);
                        } else {
                            const var34 = Texture.width - var18;
                            ArrayUtil.method837(var21, var18, var34, var29);
                            ArrayUtil.method837(var21, 0, var19 - var34, var29);
                        }
                    } else {
                        for (let var35 = 0; var35 < var17; var35++) {
                            var21[(var35 + arg2) & Texture.widthMask] = var21[Texture.widthMask & (arg4 + arg2 - var35 - 1)] = (Math.imul(var7, var35) / var17) | 0;
                        }
                        if (var19 + var18 <= Texture.width) {
                            ArrayUtil.method837(var21, var18, var19, var7);
                        } else {
                            const var36 = Texture.width - var18;
                            ArrayUtil.method837(var21, var18, var36, var7);
                            ArrayUtil.method837(var21, 0, var19 - var36, var7);
                        }
                    }
                }
            }
        } else if (arg4 + arg2 > Texture.width) {
            const var10 = Texture.width - arg2;
            for (let var11 = 0; var11 < arg5; var11++) {
                const var12 = arg1[arg3 + var11];
                ArrayUtil.method837(var12, arg2, var10, var7);
                ArrayUtil.method837(var12, 0, arg4 - var10, var7);
            }
        } else {
            for (let var13 = 0; var13 < arg5; var13++) {
                ArrayUtil.method837(arg1[var13 + arg3], arg2, arg4, var7);
            }
        }
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.seed = arg0.g1();
        } else if (arg1 === 1) {
            this.minBandWidth = arg0.g2();
        } else if (arg1 === 2) {
            this.maxBandWidth = arg0.g2();
        } else if (arg1 === 3) {
            this.minBandHeight = arg0.g2();
        } else if (arg1 === 4) {
            this.maxBandHeight = arg0.g2();
        } else if (arg1 === 5) {
            this.feather = arg0.g2();
        } else if (arg1 === 6) {
            this.featherMode = arg0.g1();
        } else if (arg1 === 7) {
            this.brightness = arg0.g2();
        } else if (arg1 === 8) {
            this.variance = arg0.g2();
        }
    }

    override postDecode(): void {}
}
