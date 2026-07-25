import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import Packet from '#/io/Packet.js';
import Statics from '#/deob/Statics.js';

export default class TextureOpCurve extends TextureOp {
    controlPoints: Int32Array[] | null = null;
    postControl: Int32Array | null = null;
    readonly lookupTable: Int16Array = new Int16Array(257);
    curveType: number = 0;
    preControl: Int32Array | null = null;

    constructor() {
        super(1, true);
    }

    override postDecode(): void {
        if (this.controlPoints === null) {
            this.controlPoints = [new Int32Array(2), Int32Array.from([4096, 4096])];
        }
        if (this.controlPoints.length < 2) {
            throw new Error('Curve operation requires at least two markers');
        }
        if (this.curveType === 2) {
            this.computeExtrapolation();
        }
        Statics.method740();
        this.buildCurve();
    }

    getControlPoint(arg0: number): Int32Array {
        if (arg0 < 0) {
            return this.preControl!;
        } else if (this.controlPoints!.length <= arg0) {
            return this.postControl!;
        } else {
            return this.controlPoints![arg0];
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            const var3 = this.getInputMono(arg0, 0);
            for (let var4 = 0; var4 < Texture.width; var4++) {
                let var5 = var3[var4] >> 4;
                if (var5 < 0) {
                    var5 = 0;
                }
                if (var5 > 256) {
                    var5 = 256;
                }
                var2[var4] = this.lookupTable[var5];
            }
        }
        return var2;
    }

    computeExtrapolation(): void {
        const var1 = this.controlPoints![0];
        const var2 = this.controlPoints![1];
        const var3 = this.controlPoints![this.controlPoints!.length - 1];
        const var4 = this.controlPoints![this.controlPoints!.length - 2];
        this.preControl = Int32Array.from([var1[0] + var1[0] - var2[0], var1[1] - var2[1] - -var1[1]]);
        this.postControl = Int32Array.from([var4[0] + var4[0] - var3[0], var4[1] - (var3[1] - var4[1])]);
    }

    buildCurve(): void {
        const var1 = this.curveType;
        if (var1 === 2) {
            for (let var2 = 0; var2 < 257; var2++) {
                const var3 = var2 << 4;
                let var4;
                for (var4 = 1; var4 < this.controlPoints!.length - 1 && var3 >= this.controlPoints![var4][0]; var4++) {}
                const var5 = this.controlPoints![var4 - 1];
                const var6 = this.controlPoints![var4];
                const var7 = this.getControlPoint(var4 - 2)[1];
                const var8 = var5[1];
                const var9 = var6[1];
                const var10 = this.getControlPoint(var4 + 1)[1];
                const var11 = (((var3 - var5[0]) << 12) / (var6[0] - var5[0])) | 0;
                const var12 = (var11 * var11) >> 12;
                const var13 = var8 + var10 - var9 - var7;
                const var14 = (((var11 * var13) >> 12) * var12) >> 12;
                const var15 = var9 - var7;
                const var16 = var7 - var13 - var8;
                const var17 = (var16 * var12) >> 12;
                const var18 = (var11 * var15) >> 12;
                let var19 = var8 + var18 + var17 + var14;
                if (var19 <= -32768) {
                    var19 = -32767;
                }
                if (var19 >= 32768) {
                    var19 = 32767;
                }
                this.lookupTable[var2] = var19;
            }
        } else if (var1 === 1) {
            for (let var20 = 0; var20 < 257; var20++) {
                const var21 = var20 << 4;
                let var22;
                for (var22 = 1; var22 < this.controlPoints!.length - 1 && var21 >= this.controlPoints![var22][0]; var22++) {}
                const var23 = this.controlPoints![var22 - 1];
                const var24 = this.controlPoints![var22];
                const var25 = (((var21 - var23[0]) << 12) / (var24[0] - var23[0])) | 0;
                const var26 = (4096 - Statics.field2920![(var25 >> 5) & 0xff]) >> 1;
                const var27 = 4096 - var26;
                let var28 = (var27 * var23[1] + var26 * var24[1]) >> 12;
                if (var28 <= -32768) {
                    var28 = -32767;
                }
                if (var28 >= 32768) {
                    var28 = 32767;
                }
                this.lookupTable[var20] = var28;
            }
        } else {
            for (let var29 = 0; var29 < 257; var29++) {
                const var30 = var29 << 4;
                let var31;
                for (var31 = 1; var31 < this.controlPoints!.length - 1 && var30 >= this.controlPoints![var31][0]; var31++) {}
                const var32 = this.controlPoints![var31];
                const var33 = this.controlPoints![var31 - 1];
                const var34 = (((var30 - var33[0]) << 12) / (var32[0] - var33[0])) | 0;
                const var35 = 4096 - var34;
                let var36 = (var33[1] * var35 + var34 * var32[1]) >> 12;
                if (var36 <= -32768) {
                    var36 = -32767;
                }
                if (var36 >= 32768) {
                    var36 = 32767;
                }
                this.lookupTable[var29] = var36;
            }
        }
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 !== 0) {
            return;
        }
        this.curveType = arg0.g1();
        this.controlPoints = Array.from({ length: arg0.g1() }, () => new Int32Array(2));
        for (let var3 = 0; var3 < this.controlPoints.length; var3++) {
            this.controlPoints[var3][0] = arg0.g2();
            this.controlPoints[var3][1] = arg0.g2();
        }
    }
}
