import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';

export default class TextureOpBoxBlur extends TextureOp {
    radiusY = 1;
    radiusX = 1;

    constructor() {
        super(1, false);
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.radiusY + this.radiusY + 1;
            const var4 = (65536 / var3) | 0;
            const var5 = this.radiusX + this.radiusX + 1;
            const var6 = new Array<Int32Array>(var3);
            const var7 = (65536 / var5) | 0;
            for (let var8 = arg0 - this.radiusY; var8 <= arg0 + this.radiusY; var8++) {
                const var9 = this.getInputMono(Texture.heightMask & var8, 0);
                const var10 = new Int32Array(Texture.width);
                let var11 = 0;
                for (let var12 = -this.radiusX; var12 <= this.radiusX; var12++) {
                    var11 += var9[Texture.widthMask & var12];
                }
                let var13 = 0;
                while (Texture.width > var13) {
                    var10[var13] = (var7 * var11) >> 16;
                    const var14 = var11 - var9[(var13 - this.radiusX) & Texture.widthMask];
                    var13++;
                    var11 = var14 + var9[Texture.widthMask & (var13 + this.radiusX)];
                }
                var6[this.radiusY + var8 - arg0] = var10;
            }
            for (let var15 = 0; var15 < Texture.width; var15++) {
                let var16 = 0;
                for (let var17 = 0; var17 < var3; var17++) {
                    var16 += var6[var17][var15];
                }
                var2[var15] = (var16 * var4) >> 16;
            }
        }
        return var2;
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.radiusX = arg0.g1();
        } else if (arg1 === 1) {
            this.radiusY = arg0.g1();
        } else if (arg1 === 2) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = this.radiusY + this.radiusY + 1;
            const var4 = (65536 / var3) | 0;
            const var5 = this.radiusX + this.radiusX + 1;
            const var6 = new Array<[Int32Array, Int32Array, Int32Array]>(var3);
            const var7 = (65536 / var5) | 0;
            for (let var8 = arg0 - this.radiusY; var8 <= arg0 + this.radiusY; var8++) {
                let var9 = 0;
                let var10 = 0;
                const var11 = this.getInputColour(0, Texture.heightMask & var8);
                let var12 = 0;
                const var13 = [new Int32Array(Texture.width), new Int32Array(Texture.width), new Int32Array(Texture.width)] as [Int32Array, Int32Array, Int32Array];
                const var14 = var11[0];
                const var15 = var11[1];
                const var16 = var11[2];
                for (let var17 = -this.radiusX; var17 <= this.radiusX; var17++) {
                    const var18 = var17 & Texture.widthMask;
                    var10 += var16[var18];
                    var12 += var14[var18];
                    var9 += var15[var18];
                }
                const var19 = var13[1];
                const var20 = var13[0];
                const var21 = var13[2];
                let var22 = 0;
                while (Texture.width > var22) {
                    var20[var22] = (var12 * var7) >> 16;
                    var19[var22] = (var7 * var9) >> 16;
                    var21[var22] = (var7 * var10) >> 16;
                    const var23 = (var22 - this.radiusX) & Texture.widthMask;
                    const var24 = var12 - var14[var23];
                    const var25 = var9 - var15[var23];
                    const var26 = var10 - var16[var23];
                    var22++;
                    const var27 = Texture.widthMask & (this.radiusX + var22);
                    var10 = var26 + var16[var27];
                    var12 = var24 + var14[var27];
                    var9 = var25 + var15[var27];
                }
                var6[var8 + this.radiusY - arg0] = var13;
            }
            const var28 = var2[0];
            const var29 = var2[1];
            const var30 = var2[2];
            for (let var31 = 0; var31 < Texture.width; var31++) {
                let var32 = 0;
                let var33 = 0;
                let var34 = 0;
                for (let var35 = 0; var35 < var3; var35++) {
                    const var36 = var6[var35];
                    var33 += var36[1][var31];
                    var34 += var36[2][var31];
                    var32 += var36[0][var31];
                }
                var28[var31] = (var32 * var4) >> 16;
                var29[var31] = (var4 * var33) >> 16;
                var30[var31] = (var34 * var4) >> 16;
            }
        }
        return var2;
    }
}
