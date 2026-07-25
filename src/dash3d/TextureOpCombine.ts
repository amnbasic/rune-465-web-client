import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpCombine extends TextureOp {
    blendMode: number = 6;

    constructor() {
        super(2, false);
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = this.getInputColour(0, arg0);
            const var4 = this.getInputColour(1, arg0);
            const var5 = var3[0];
            const var6 = var2[1];
            const var7 = var2[2];
            const var8 = var2[0];
            const var9 = var3[1];
            const var10 = var3[2];
            const var11 = var4[1];
            const var12 = var4[0];
            const var13 = var4[2];
            const var14 = this.blendMode;
            if (var14 === 1) {
                for (let var15 = 0; var15 < Texture.width; var15++) {
                    var8[var15] = var5[var15] + var12[var15];
                    var6[var15] = var11[var15] + var9[var15];
                    var7[var15] = var10[var15] + var13[var15];
                }
            } else if (var14 === 2) {
                for (let var16 = 0; var16 < Texture.width; var16++) {
                    var8[var16] = var5[var16] - var12[var16];
                    var6[var16] = var9[var16] - var11[var16];
                    var7[var16] = var10[var16] - var13[var16];
                }
            } else if (var14 === 3) {
                for (let var17 = 0; var17 < Texture.width; var17++) {
                    var8[var17] = (var12[var17] * var5[var17]) >> 12;
                    var6[var17] = (var9[var17] * var11[var17]) >> 12;
                    var7[var17] = (var10[var17] * var13[var17]) >> 12;
                }
            } else if (var14 === 4) {
                for (let var18 = 0; var18 < Texture.width; var18++) {
                    const var19 = var13[var18];
                    const var20 = var11[var18];
                    const var21 = var12[var18];
                    var8[var18] = var21 === 0 ? 4096 : ((var5[var18] << 12) / var21) | 0;
                    var6[var18] = var20 === 0 ? 4096 : ((var9[var18] << 12) / var20) | 0;
                    var7[var18] = var19 === 0 ? 4096 : ((var10[var18] << 12) / var19) | 0;
                }
            } else if (var14 === 5) {
                for (let var22 = 0; var22 < Texture.width; var22++) {
                    var8[var22] = 4096 - (((4096 - var5[var22]) * (4096 - var12[var22])) >> 12);
                    var6[var22] = 4096 - (((4096 - var9[var22]) * (-var11[var22] + 4096)) >> 12);
                    var7[var22] = 4096 - (((4096 - var13[var22]) * (-var10[var22] + 4096)) >> 12);
                }
            } else if (var14 === 6) {
                for (let var23 = 0; var23 < Texture.width; var23++) {
                    const var24 = var11[var23];
                    const var25 = var13[var23];
                    const var26 = var12[var23];
                    var8[var23] = var26 >= 2048 ? 4096 - (((4096 - var5[var23]) * (-var26 + 4096)) >> 11) : (var5[var23] * var26) >> 11;
                    var6[var23] = var24 >= 2048 ? 4096 - (((4096 - var9[var23]) * (-var24 + 4096)) >> 11) : (var9[var23] * var24) >> 11;
                    var7[var23] = var25 >= 2048 ? 4096 - (((4096 - var25) * (-var10[var23] + 4096)) >> 11) : (var10[var23] * var25) >> 11;
                }
            } else if (var14 === 7) {
                for (let var27 = 0; var27 < Texture.width; var27++) {
                    const var28 = var5[var27];
                    const var29 = var10[var27];
                    const var30 = var9[var27];
                    var8[var27] = var28 === 4096 ? 4096 : ((var12[var27] << 12) / (4096 - var28)) | 0;
                    var6[var27] = var30 === 4096 ? 4096 : ((var11[var27] << 12) / (4096 - var30)) | 0;
                    var7[var27] = var29 === 4096 ? 4096 : ((var13[var27] << 12) / (4096 - var29)) | 0;
                }
            } else if (var14 === 8) {
                for (let var31 = 0; var31 < Texture.width; var31++) {
                    const var32 = var10[var31];
                    const var33 = var5[var31];
                    const var34 = var9[var31];
                    var8[var31] = var33 === 0 ? 0 : 4096 - ((((4096 - var12[var31]) << 12) / var33) | 0);
                    var6[var31] = var34 === 0 ? 0 : 4096 - ((((4096 - var11[var31]) << 12) / var34) | 0);
                    var7[var31] = var32 === 0 ? 0 : 4096 - ((((4096 - var13[var31]) << 12) / var32) | 0);
                }
            } else if (var14 === 9) {
                for (let var35 = 0; var35 < Texture.width; var35++) {
                    const var36 = var10[var35];
                    const var37 = var5[var35];
                    const var38 = var9[var35];
                    const var39 = var13[var35];
                    const var40 = var11[var35];
                    const var41 = var12[var35];
                    var8[var35] = var41 > var37 ? var37 : var41;
                    var6[var35] = var40 > var38 ? var38 : var40;
                    var7[var35] = var39 <= var36 ? var39 : var36;
                }
            } else if (var14 === 10) {
                for (let var42 = 0; var42 < Texture.width; var42++) {
                    const var43 = var12[var42];
                    const var44 = var13[var42];
                    const var45 = var9[var42];
                    const var46 = var10[var42];
                    const var47 = var5[var42];
                    const var48 = var11[var42];
                    var8[var42] = var47 > var43 ? var47 : var43;
                    var6[var42] = var45 <= var48 ? var48 : var45;
                    var7[var42] = var44 >= var46 ? var44 : var46;
                }
            } else if (var14 === 11) {
                for (let var49 = 0; var49 < Texture.width; var49++) {
                    const var50 = var9[var49];
                    const var51 = var11[var49];
                    const var52 = var13[var49];
                    const var53 = var5[var49];
                    const var54 = var12[var49];
                    const var55 = var10[var49];
                    var8[var49] = var53 > var54 ? var53 - var54 : -var53 + var54;
                    var6[var49] = var51 >= var50 ? var51 - var50 : -var51 + var50;
                    var7[var49] = var55 <= var52 ? var52 - var55 : var55 + -var52;
                }
            } else if (var14 === 12) {
                for (let var56 = 0; var56 < Texture.width; var56++) {
                    const var57 = var11[var56];
                    const var58 = var12[var56];
                    const var59 = var5[var56];
                    const var60 = var9[var56];
                    const var61 = var13[var56];
                    const var62 = var10[var56];
                    var8[var56] = var58 + var59 - ((var58 * var59) >> 11);
                    var6[var56] = var60 + var57 - ((var60 * var57) >> 11);
                    var7[var56] = var62 + var61 - ((var61 * var62) >> 11);
                }
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.blendMode = arg0.g1();
        } else if (arg1 === 1) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.getInputMono(arg0, 0);
            const var4 = this.getInputMono(arg0, 1);
            const var5 = this.blendMode;
            if (var5 === 1) {
                for (let var6 = 0; var6 < Texture.width; var6++) {
                    var2[var6] = var3[var6] + var4[var6];
                }
            } else if (var5 === 2) {
                for (let var7 = 0; var7 < Texture.width; var7++) {
                    var2[var7] = var3[var7] - var4[var7];
                }
            } else if (var5 === 3) {
                for (let var8 = 0; var8 < Texture.width; var8++) {
                    var2[var8] = (var3[var8] * var4[var8]) >> 12;
                }
            } else if (var5 === 4) {
                for (let var9 = 0; var9 < Texture.width; var9++) {
                    const var10 = var4[var9];
                    var2[var9] = var10 === 0 ? 4096 : ((var3[var9] << 12) / var10) | 0;
                }
            } else if (var5 === 5) {
                for (let var11 = 0; var11 < Texture.width; var11++) {
                    var2[var11] = 4096 - (((4096 - var3[var11]) * (-var4[var11] + 4096)) >> 12);
                }
            } else if (var5 === 6) {
                for (let var12 = 0; var12 < Texture.width; var12++) {
                    const var13 = var4[var12];
                    var2[var12] = var13 < 2048 ? (var3[var12] * var13) >> 11 : 4096 - (((4096 - var13) * (-var3[var12] + 4096)) >> 11);
                }
            } else if (var5 === 7) {
                for (let var14 = 0; var14 < Texture.width; var14++) {
                    const var15 = var3[var14];
                    var2[var14] = var15 === 4096 ? 4096 : ((var4[var14] << 12) / (4096 - var15)) | 0;
                }
            } else if (var5 === 8) {
                for (let var16 = 0; var16 < Texture.width; var16++) {
                    const var17 = var3[var16];
                    var2[var16] = var17 === 0 ? 0 : 4096 - ((((4096 - var4[var16]) << 12) / var17) | 0);
                }
            } else if (var5 === 9) {
                for (let var18 = 0; var18 < Texture.width; var18++) {
                    const var19 = var3[var18];
                    const var20 = var4[var18];
                    var2[var18] = var20 > var19 ? var19 : var20;
                }
            } else if (var5 === 10) {
                for (let var21 = 0; var21 < Texture.width; var21++) {
                    const var22 = var4[var21];
                    const var23 = var3[var21];
                    var2[var21] = var22 < var23 ? var23 : var22;
                }
            } else if (var5 === 11) {
                for (let var24 = 0; var24 < Texture.width; var24++) {
                    const var25 = var4[var24];
                    const var26 = var3[var24];
                    var2[var24] = var26 > var25 ? var26 - var25 : var25 - var26;
                }
            } else if (var5 === 12) {
                for (let var27 = 0; var27 < Texture.width; var27++) {
                    const var28 = var3[var27];
                    const var29 = var4[var27];
                    var2[var27] = var29 + var28 - ((var28 * var29) >> 11);
                }
            }
        }
        return var2;
    }
}
