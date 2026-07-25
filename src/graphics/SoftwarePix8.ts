import Pix8 from '#/graphics/Pix8.js';
import Pix2D from '#/graphics/Pix2D.js';

export default class SoftwarePix8 extends Pix8 {
    declare data: Int8Array;
    declare bpal: Int32Array;

    static plotScale(arg0: Int32Array, arg1: Int8Array, arg2: Int32Array, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: number, arg11: number): void {
        const var12 = arg3;
        for (let var13 = -arg8; var13 < 0; var13++) {
            const var14 = (arg4 >> 16) * arg11;
            for (let var15 = -arg7; var15 < 0; var15++) {
                const var16 = arg1[(arg3 >> 16) + var14];
                if (var16 === 0) {
                    arg5++;
                } else {
                    arg0[arg5++] = arg2[var16 & 0xff];
                }
                arg3 += arg9;
            }
            arg4 += arg10;
            arg3 = var12;
            arg5 += arg6;
        }
    }

    static tranSprite(arg0: Int32Array, arg1: Int8Array, arg2: Int32Array, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number): void {
        const var10 = 256 - arg9;
        for (let var11 = -arg6; var11 < 0; var11++) {
            for (let var12 = -arg5; var12 < 0; var12++) {
                const var13 = arg1[arg3++];
                if (var13 === 0) {
                    arg4++;
                } else {
                    const var14 = arg2[var13 & 0xff];
                    const var15 = arg0[arg4];
                    arg0[arg4++] = ((((var14 & 0xff00ff) * arg9 + (var15 & 0xff00ff) * var10) & 0xff00ff00) + (((var14 & 0xff00) * arg9 + (var15 & 0xff00) * var10) & 0xff0000)) >> 8;
                }
            }
            arg4 += arg7;
            arg3 += arg8;
        }
    }

    static plotSprite(arg0: Int32Array, arg1: Int8Array, arg2: Int32Array, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void {
        const var9 = -(arg5 >> 2);
        const var10 = -(arg5 & 0x3);
        for (let var11 = -arg6; var11 < 0; var11++) {
            for (let var12 = var9; var12 < 0; var12++) {
                const var13 = arg1[arg3++];
                if (var13 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = arg2[var13 & 0xff];
                }
                const var14 = arg1[arg3++];
                if (var14 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = arg2[var14 & 0xff];
                }
                const var15 = arg1[arg3++];
                if (var15 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = arg2[var15 & 0xff];
                }
                const var16 = arg1[arg3++];
                if (var16 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = arg2[var16 & 0xff];
                }
            }
            for (let var17 = var10; var17 < 0; var17++) {
                const var18 = arg1[arg3++];
                if (var18 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = arg2[var18 & 0xff];
                }
            }
            arg4 += arg7;
            arg3 += arg8;
        }
    }

    constructor(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: Int8Array, arg7: Int32Array) {
        super();
        this.owi = arg0;
        this.ohi = arg1;
        this.xof = arg2;
        this.yof = arg3;
        this.wi = arg4;
        this.hi = arg5;
        this.data = arg6;
        this.bpal = arg7;
    }

    rgbAdjust(arg0: number, arg1: number, arg2: number): void {
        for (let var4 = 0; var4 < this.bpal.length; var4++) {
            let var5 = (this.bpal[var4] >> 16) & 0xff;
            let var6 = var5 + arg0;
            if (var6 < 0) {
                var6 = 0;
            } else if (var6 > 255) {
                var6 = 255;
            }
            let var7 = (this.bpal[var4] >> 8) & 0xff;
            let var8 = var7 + arg1;
            if (var8 < 0) {
                var8 = 0;
            } else if (var8 > 255) {
                var8 = 255;
            }
            let var9 = this.bpal[var4] & 0xff;
            let var10 = var9 + arg2;
            if (var10 < 0) {
                var10 = 0;
            } else if (var10 > 255) {
                var10 = 255;
            }
            this.bpal[var4] = (var6 << 16) + (var8 << 8) + var10;
        }
    }

    trim(): void {
        if (this.wi === this.owi && this.hi === this.ohi) {
            return;
        }
        const var1 = new Int8Array(this.owi * this.ohi);
        let var2 = 0;
        for (let var3 = 0; var3 < this.hi; var3++) {
            for (let var4 = 0; var4 < this.wi; var4++) {
                var1[var4 + this.xof + (var3 + this.yof) * this.owi] = this.data[var2++];
            }
        }
        this.data = var1;
        this.wi = this.owi;
        this.hi = this.ohi;
        this.xof = 0;
        this.yof = 0;
    }

    override transPlotSprite(arg0: number, arg1: number, arg2: number): void {
        let var4 = arg0 + this.xof;
        let var5 = arg1 + this.yof;
        let var6 = var4 + var5 * Pix2D.width;
        let var7 = 0;
        let var8 = this.hi;
        let var9 = this.wi;
        let var10 = Pix2D.width - var9;
        let var11 = 0;
        if (var5 < Pix2D.clipMinY) {
            const var12 = Pix2D.clipMinY - var5;
            var8 -= var12;
            var5 = Pix2D.clipMinY;
            var7 = var12 * var9;
            var6 += var12 * Pix2D.width;
        }
        if (var5 + var8 > Pix2D.clipMaxY) {
            var8 -= var5 + var8 - Pix2D.clipMaxY;
        }
        if (var4 < Pix2D.clipMinX) {
            const var13 = Pix2D.clipMinX - var4;
            var9 -= var13;
            var4 = Pix2D.clipMinX;
            var7 += var13;
            var6 += var13;
            var11 = var13;
            var10 += var13;
        }
        if (var4 + var9 > Pix2D.clipMaxX) {
            const var14 = var4 + var9 - Pix2D.clipMaxX;
            var9 -= var14;
            var11 += var14;
            var10 += var14;
        }
        if (var9 > 0 && var8 > 0) {
            SoftwarePix8.tranSprite(Pix2D.pixels, this.data, this.bpal, var7, var6, var9, var8, var10, var11, arg2);
        }
    }

    scalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number): void {
        const var5 = this.wi;
        const var6 = this.hi;
        let var7 = 0;
        let var8 = 0;
        const var9 = this.owi;
        const var10 = this.ohi;
        if (arg2 === 0) {
            throw new Error();
        }
        const var11 = ((var9 << 16) / arg2) | 0;
        if (arg3 === 0) {
            throw new Error();
        }
        const var12 = ((var10 << 16) / arg3) | 0;
        if (this.xof > 0) {
            if (var11 === 0) {
                throw new Error();
            }
            const var13 = (((this.xof << 16) + var11 - 1) / var11) | 0;
            arg0 += var13;
            var7 = Math.imul(var13, var11) - (this.xof << 16);
        }
        if (this.yof > 0) {
            if (var12 === 0) {
                throw new Error();
            }
            const var14 = (((this.yof << 16) + var12 - 1) / var12) | 0;
            arg1 += var14;
            var8 = Math.imul(var14, var12) - (this.yof << 16);
        }
        if (var5 < var9) {
            if (var11 === 0) {
                throw new Error();
            }
            arg2 = (((var5 << 16) + var11 - var7 - 1) / var11) | 0;
        }
        if (var6 < var10) {
            if (var12 === 0) {
                throw new Error();
            }
            arg3 = (((var6 << 16) + var12 - var8 - 1) / var12) | 0;
        }
        let var15 = arg0 + Math.imul(arg1, Pix2D.width);
        let var16 = Pix2D.width - arg2;
        if (arg1 + arg3 > Pix2D.clipMaxY) {
            arg3 -= arg1 + arg3 - Pix2D.clipMaxY;
        }
        if (arg1 < Pix2D.clipMinY) {
            const var17 = Pix2D.clipMinY - arg1;
            arg3 -= var17;
            var15 += Math.imul(var17, Pix2D.width);
            var8 += Math.imul(var12, var17);
        }
        if (arg0 + arg2 > Pix2D.clipMaxX) {
            const var18 = arg0 + arg2 - Pix2D.clipMaxX;
            arg2 -= var18;
            var16 += var18;
        }
        if (arg0 < Pix2D.clipMinX) {
            const var19 = Pix2D.clipMinX - arg0;
            arg2 -= var19;
            var15 += var19;
            var7 += Math.imul(var11, var19);
            var16 += var19;
        }
        SoftwarePix8.plotScale(Pix2D.pixels, this.data, this.bpal, var7, var8, var15, var16, arg2, arg3, var11, var12, var5);
    }

    override plotSprite(arg0: number, arg1: number): void {
        let var3 = arg0 + this.xof;
        let var4 = arg1 + this.yof;
        let var5 = var3 + var4 * Pix2D.width;
        let var6 = 0;
        let var7 = this.hi;
        let var8 = this.wi;
        let var9 = Pix2D.width - var8;
        let var10 = 0;
        if (var4 < Pix2D.clipMinY) {
            const var11 = Pix2D.clipMinY - var4;
            var7 -= var11;
            var4 = Pix2D.clipMinY;
            var6 = var11 * var8;
            var5 += var11 * Pix2D.width;
        }
        if (var4 + var7 > Pix2D.clipMaxY) {
            var7 -= var4 + var7 - Pix2D.clipMaxY;
        }
        if (var3 < Pix2D.clipMinX) {
            const var12 = Pix2D.clipMinX - var3;
            var8 -= var12;
            var3 = Pix2D.clipMinX;
            var6 += var12;
            var5 += var12;
            var10 = var12;
            var9 += var12;
        }
        if (var3 + var8 > Pix2D.clipMaxX) {
            const var13 = var3 + var8 - Pix2D.clipMaxX;
            var8 -= var13;
            var10 += var13;
            var9 += var13;
        }
        if (var8 > 0 && var7 > 0) {
            SoftwarePix8.plotSprite(Pix2D.pixels, this.data, this.bpal, var6, var5, var8, var7, var9, var10);
        }
    }
}
