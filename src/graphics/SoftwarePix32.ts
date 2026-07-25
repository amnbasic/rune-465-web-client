import Pix32 from '#/graphics/Pix32.js';
import Pix2D from '#/graphics/Pix2D.js';

export default class SoftwarePix32 extends Pix32 {
    declare data: Int32Array;

    static tranSprite(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void {
        const var9 = 256 - arg8;
        for (let var10 = -arg5; var10 < 0; var10++) {
            for (let var11 = -arg4; var11 < 0; var11++) {
                const var12 = arg1[arg2++];
                if (var12 === 0) {
                    arg3++;
                } else {
                    const var13 = arg0[arg3];
                    arg0[arg3++] = ((((var12 & 0xff00ff) * arg8 + (var13 & 0xff00ff) * var9) & 0xff00ff00) + (((var12 & 0xff00) * arg8 + (var13 & 0xff00) * var9) & 0xff0000)) >> 8;
                }
            }
            arg3 += arg6;
            arg2 += arg7;
        }
    }

    static plotScale(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: number): void {
        const var11 = arg2;
        for (let var12 = -arg7; var12 < 0; var12++) {
            const var13 = (arg3 >> 16) * arg10;
            for (let var14 = -arg6; var14 < 0; var14++) {
                const var15 = arg1[(arg2 >> 16) + var13];
                if (var15 === 0) {
                    arg4++;
                } else {
                    arg0[arg4++] = var15;
                }
                arg2 += arg8;
            }
            arg3 += arg9;
            arg2 = var11;
            arg4 += arg5;
        }
    }

    static litSprite(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void {
        for (let var8 = -arg5; var8 < 0; var8++) {
            for (let var9 = -arg4; var9 < 0; var9++) {
                const var10 = arg1[arg2++];
                if (var10 === 0) {
                    arg3++;
                } else {
                    const var11 = ((var10 & 0xff00ff) * 128) & 0xff00ff00;
                    const var12 = ((var10 & 0xff00) * 128) & 0xff0000;
                    arg0[arg3++] = ((var11 | var12) >>> 8) + 8355711;
                }
            }
            arg3 += arg6;
            arg2 += arg7;
        }
    }

    static tranScale(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: number, arg11: number): void {
        const var12 = 256 - arg11;
        const var13 = arg2;
        for (let var14 = -arg7; var14 < 0; var14++) {
            const var15 = (arg3 >> 16) * arg10;
            for (let var16 = -arg6; var16 < 0; var16++) {
                const var17 = arg1[(arg2 >> 16) + var15];
                if (var17 === 0) {
                    arg4++;
                } else {
                    const var18 = arg0[arg4];
                    arg0[arg4++] = ((((var17 & 0xff00ff) * arg11 + (var18 & 0xff00ff) * var12) & 0xff00ff00) + (((var17 & 0xff00) * arg11 + (var18 & 0xff00) * var12) & 0xff0000)) >> 8;
                }
                arg2 += arg8;
            }
            arg3 += arg9;
            arg2 = var13;
            arg4 += arg5;
        }
    }

    static plotSprite(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void {
        const var8 = -(arg4 >> 2);
        const var9 = -(arg4 & 0x3);
        for (let var10 = -arg5; var10 < 0; var10++) {
            for (let var11 = var8; var11 < 0; var11++) {
                const var12 = arg1[arg2++];
                if (var12 === 0) {
                    arg3++;
                } else {
                    arg0[arg3++] = var12;
                }
                const var13 = arg1[arg2++];
                if (var13 === 0) {
                    arg3++;
                } else {
                    arg0[arg3++] = var13;
                }
                const var14 = arg1[arg2++];
                if (var14 === 0) {
                    arg3++;
                } else {
                    arg0[arg3++] = var14;
                }
                const var15 = arg1[arg2++];
                if (var15 === 0) {
                    arg3++;
                } else {
                    arg0[arg3++] = var15;
                }
            }
            for (let var16 = var9; var16 < 0; var16++) {
                const var17 = arg1[arg2++];
                if (var17 === 0) {
                    arg3++;
                } else {
                    arg0[arg3++] = var17;
                }
            }
            arg3 += arg6;
            arg2 += arg7;
        }
    }

    static plotQuick(arg0: Int32Array, arg1: Int32Array, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number): void {
        for (let var8 = -arg5; var8 < 0; var8++) {
            let var9 = arg3 + arg4 - 3;
            while (arg3 < var9) {
                arg0[arg3++] = arg1[arg2++];
                arg0[arg3++] = arg1[arg2++];
                arg0[arg3++] = arg1[arg2++];
                arg0[arg3++] = arg1[arg2++];
            }
            var9 += 3;
            while (arg3 < var9) {
                arg0[arg3++] = arg1[arg2++];
            }
            arg3 += arg6;
            arg2 += arg7;
        }
    }

    constructor(arg0 = 0, arg1 = 0, arg2 = 0, arg3 = 0, arg4?: number, arg5?: number, arg6?: Int32Array | number[]) {
        super();
        if (typeof arg4 === 'number' && typeof arg5 === 'number' && arg6) {
            this.owi = arg0;
            this.ohi = arg1;
            this.xof = arg2;
            this.yof = arg3;
            this.wi = arg4;
            this.hi = arg5;
            this.data = arg6 instanceof Int32Array ? arg6 : Int32Array.from(arg6);
        } else {
            this.data = new Int32Array(arg0 * arg1);
            this.wi = this.owi = arg0;
            this.hi = this.ohi = arg1;
            this.xof = this.yof = 0;
        }
    }

    static async fromJpeg(dat: Uint8Array): Promise<SoftwarePix32> {
        if (dat[0] !== 0xff) {
            dat[0] = 0xff;
        }

        const canvas = document.createElement('canvas');
        const imageElement = document.createElement('img');
        const ctx = canvas.getContext('2d', {
            willReadFrequently: true
        })!;
        imageElement.src = URL.createObjectURL(new Blob([dat as BlobPart], { type: 'image/jpeg' }));
        await new Promise<void>((resolve): (() => void) => (imageElement.onload = (): void => resolve()));

        const width = imageElement.naturalWidth;
        const height = imageElement.naturalHeight;
        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(imageElement, 0, 0);
        URL.revokeObjectURL(imageElement.src);

        const jpeg = ctx.getImageData(0, 0, width, height);
        const image = new SoftwarePix32(jpeg.width, jpeg.height);
        const data = new Uint32Array(jpeg.data.buffer);
        for (let i = 0; i < image.data.length; i++) {
            const pixel = data[i];
            image.data[i] = (((pixel >> 24) & 0xff) << 24) | ((pixel & 0xff) << 16) | (((pixel >> 8) & 0xff) << 8) | ((pixel >> 16) & 0xff);
        }
        return image;
    }

    addShadow(arg0: number): void {
        for (let var2 = this.hi - 1; var2 > 0; var2--) {
            const var3 = var2 * this.wi;
            for (let var4 = this.wi - 1; var4 > 0; var4--) {
                if (this.data[var4 + var3] === 0 && this.data[var4 + var3 - this.wi - 1] !== 0) {
                    this.data[var4 + var3] = arg0;
                }
            }
        }
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
            SoftwarePix32.plotSprite(Pix2D.pixels, this.data, var6, var5, var8, var7, var9, var10);
        }
    }

    copyHFlip(): SoftwarePix32 {
        const var1 = new SoftwarePix32(this.wi, this.hi);
        var1.owi = this.owi;
        var1.ohi = this.ohi;
        var1.xof = this.owi - this.wi - this.xof;
        var1.yof = this.yof;
        for (let var2 = 0; var2 < this.hi; var2++) {
            for (let var3 = 0; var3 < this.wi; var3++) {
                var1.data[var2 * this.wi + var3] = this.data[var2 * this.wi + this.wi - var3 - 1];
            }
        }
        return var1;
    }

    rgbAdjust(arg0: number, arg1: number, arg2: number): void {
        for (let var4 = 0; var4 < this.data.length; var4++) {
            const var5 = this.data[var4];
            if (var5 !== 0) {
                const var6 = (var5 >> 16) & 0xff;
                let var7 = var6 + arg0;
                if (var7 < 1) {
                    var7 = 1;
                } else if (var7 > 255) {
                    var7 = 255;
                }
                const var8 = (var5 >> 8) & 0xff;
                let var9 = var8 + arg1;
                if (var9 < 1) {
                    var9 = 1;
                } else if (var9 > 255) {
                    var9 = 255;
                }
                const var10 = var5 & 0xff;
                let var11 = var10 + arg2;
                if (var11 < 1) {
                    var11 = 1;
                } else if (var11 > 255) {
                    var11 = 255;
                }
                this.data[var4] = (var7 << 16) + (var9 << 8) + var11;
            }
        }
    }

    hflip(): void {
        const var1 = new Int32Array(this.wi * this.hi);
        let var2 = 0;
        for (let var3 = 0; var3 < this.hi; var3++) {
            for (let var4 = this.wi - 1; var4 >= 0; var4--) {
                var1[var2++] = this.data[var4 + var3 * this.wi];
            }
        }
        this.data = var1;
        this.xof = this.owi - this.wi - this.xof;
    }

    override litPlotSprite(arg0: number, arg1: number): void {
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
            SoftwarePix32.litSprite(Pix2D.pixels, this.data, var6, var5, var8, var7, var9, var10);
        }
    }
    override quickPlotSprite(arg0: number, arg1: number): void {
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
            SoftwarePix32.plotQuick(Pix2D.pixels, this.data, var6, var5, var8, var7, var9, var10);
        }
    }
    override scalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (arg2 <= 0 || arg3 <= 0) {
            return;
        }
        const var5 = this.wi;
        const var6 = this.hi;
        let var7 = 0;
        let var8 = 0;
        const var9 = this.owi;
        const var10 = this.ohi;
        const var11 = ((var9 << 16) / arg2) | 0;
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
        SoftwarePix32.plotScale(Pix2D.pixels, this.data, var7, var8, var15, var16, arg2, arg3, var11, var12, var5);
    }
    scanlineRotatePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: Int32Array, arg8: Int32Array): void;
    scanlineRotatePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: Int32Array, arg9: Int32Array): void;
    scanlineRotatePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number | Int32Array, arg8: Int32Array, arg9?: Int32Array): void {
        if (arg9 === undefined) {
            try {
                const lineStart = arg7 as Int32Array;
                const var10 = (-arg2 / 2) | 0;
                const var11 = (-arg3 / 2) | 0;
                const var12 = (Math.sin(arg6 / 326.11) * 65536.0) | 0;
                const var13 = (Math.cos(arg6 / 326.11) * 65536.0) | 0;
                const var14 = (var12 * 256) >> 8;
                const var15 = (var13 * 256) >> 8;
                let var16 = (arg4 << 16) + var11 * var14 + var10 * var15;
                let var17 = (arg5 << 16) + (var11 * var15 - var10 * var14);
                let var18 = arg0 + arg1 * Pix2D.width;
                for (let var19 = 0; var19 < arg3; var19++) {
                    const var20 = lineStart[var19];
                    let var21 = var18 + var20;
                    let var22 = var16 + var15 * var20;
                    let var23 = var17 - var14 * var20;
                    for (let var24 = -arg8[var19]; var24 < 0; var24++) {
                        const var25 = this.data[(var22 >> 16) + (var23 >> 16) * this.wi];
                        if (var25 === 0) {
                            var21++;
                        } else {
                            Pix2D.pixels[var21++] = var25;
                        }
                        var22 += var15;
                        var23 -= var14;
                    }
                    var16 += var14;
                    var17 += var15;
                    var18 += Pix2D.width;
                }
            } catch {}
            return;
        }

        try {
            const scale = arg7 as number;
            const var11 = (-arg2 / 2) | 0;
            const var12 = (-arg3 / 2) | 0;
            const var13 = (Math.sin(arg6 / 326.11) * 65536.0) | 0;
            const var14 = (Math.cos(arg6 / 326.11) * 65536.0) | 0;
            const var15 = (var13 * scale) >> 8;
            const var16 = (var14 * scale) >> 8;
            let var17 = (arg4 << 16) + var12 * var15 + var11 * var16;
            let var18 = (arg5 << 16) + (var12 * var16 - var11 * var15);
            let var19 = arg0 + arg1 * Pix2D.width;
            for (let var20 = 0; var20 < arg3; var20++) {
                const var21 = arg8[var20];
                let var22 = var19 + var21;
                let var23 = var17 + var16 * var21;
                let var24 = var18 - var15 * var21;
                for (let var25 = -arg9[var20]; var25 < 0; var25++) {
                    Pix2D.pixels[var22++] = this.data[(var23 >> 16) + (var24 >> 16) * this.wi];
                    var23 += var16;
                    var24 -= var15;
                }
                var17 += var15;
                var18 += var16;
                var19 += Pix2D.width;
            }
        } catch {}
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
            SoftwarePix32.tranSprite(Pix2D.pixels, this.data, var7, var6, var9, var8, var10, var11, arg2);
        }
    }

    scanlinePlotSprite(arg0: number, arg1: number, arg2: Int32Array, arg3: Int32Array): void {
        if (Pix2D.clipMaxY - Pix2D.clipMinY !== arg2.length) {
            throw new Error();
        }
        let var5 = arg0 + this.xof;
        let var6 = arg1 + this.yof;
        let var7 = 0;
        let var8 = this.hi;
        let var9 = this.wi;
        let var10 = Pix2D.width - var9;
        let var11 = 0;
        let var12 = var5 + var6 * Pix2D.width;
        if (var6 < Pix2D.clipMinY) {
            const var13 = Pix2D.clipMinY - var6;
            var8 -= var13;
            var6 = Pix2D.clipMinY;
            var7 = var13 * var9;
            var12 += var13 * Pix2D.width;
        }
        if (var6 + var8 > Pix2D.clipMaxY) {
            var8 -= var6 + var8 - Pix2D.clipMaxY;
        }
        if (var5 < Pix2D.clipMinX) {
            const var14 = Pix2D.clipMinX - var5;
            var9 -= var14;
            var5 = Pix2D.clipMinX;
            var7 += var14;
            var12 += var14;
            var11 = var14;
            var10 += var14;
        }
        if (var5 + var9 > Pix2D.clipMaxX) {
            const var15 = var5 + var9 - Pix2D.clipMaxX;
            var9 -= var15;
            var11 += var15;
            var10 += var15;
        }
        if (var9 <= 0 || var8 <= 0) {
            return;
        }
        const var16 = var5 - Pix2D.clipMinX;
        const var17 = var6 - Pix2D.clipMinY;
        for (let var18 = var17; var18 < var17 + var8; var18++) {
            const var19 = arg2[var18];
            let var20 = arg3[var18];
            let var21 = var9;
            if (var16 > var19) {
                const var22 = var16 - var19;
                if (var22 >= var20) {
                    var7 += var9 + var11;
                    var12 += var9 + var10;
                    continue;
                }
                var20 -= var22;
            } else {
                const var23 = var19 - var16;
                if (var23 >= var9) {
                    var7 += var9 + var11;
                    var12 += var9 + var10;
                    continue;
                }
                var7 += var23;
                var21 = var9 - var23;
                var12 += var23;
            }
            let var24 = 0;
            if (var21 < var20) {
                var20 = var21;
            } else {
                var24 = var21 - var20;
            }
            for (let var25 = -var20; var25 < 0; var25++) {
                const var26 = this.data[var7++];
                if (var26 === 0) {
                    var12++;
                } else {
                    Pix2D.pixels[var12++] = var26;
                }
            }
            var7 += var24 + var11;
            var12 += var24 + var10;
        }
    }

    override pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number): void;
    override pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void;
    override pixelPerfectRotateScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4?: number, arg5?: number): void {
        if (arg4 === undefined || arg5 === undefined) {
            const var5 = this.ohi << 3;
            const var6 = (var5 & 0xf) + (arg0 << 4);
            const var7 = this.owi << 3;
            const var8 = (var7 & 0xf) + (arg1 << 4);
            this.pixelPerfectRotateScalePlotSprite(var7, var5, var8, var6, arg3, arg2);
            return;
        }
        if (arg5 === 0) {
            return;
        }
        let var7 = arg0 - (this.xof << 4);
        let var8 = arg1 - (this.yof << 4);
        const var9 = (arg4 & 0xffff) * 9.587379924285257e-5;
        const var11 = Math.floor(Math.sin(var9) * arg5 + 0.5) | 0;
        const var12 = Math.floor(Math.cos(var9) * arg5 + 0.5) | 0;
        const var13 = -var7 * var12 + -var8 * var11;
        const var14 = var7 * var11 + -var8 * var12;
        const var15 = ((this.wi << 4) - var7) * var12 + -var8 * var11;
        const var16 = -((this.wi << 4) - var7) * var11 + -var8 * var12;
        const var17 = -var7 * var12 + ((this.hi << 4) - var8) * var11;
        const var18 = var7 * var11 + ((this.hi << 4) - var8) * var12;
        const var19 = ((this.wi << 4) - var7) * var12 + ((this.hi << 4) - var8) * var11;
        const var20 = -((this.wi << 4) - var7) * var11 + ((this.hi << 4) - var8) * var12;
        let var21: number;
        let var22: number;
        if (var13 < var15) {
            var21 = var13;
            var22 = var15;
        } else {
            var21 = var15;
            var22 = var13;
        }
        if (var17 < var21) {
            var21 = var17;
        }
        if (var19 < var21) {
            var21 = var19;
        }
        if (var17 > var22) {
            var22 = var17;
        }
        if (var19 > var22) {
            var22 = var19;
        }
        let var23: number;
        let var24: number;
        if (var14 < var16) {
            var23 = var14;
            var24 = var16;
        } else {
            var23 = var16;
            var24 = var14;
        }
        if (var18 < var23) {
            var23 = var18;
        }
        if (var20 < var23) {
            var23 = var20;
        }
        if (var18 > var24) {
            var24 = var18;
        }
        if (var20 > var24) {
            var24 = var20;
        }
        const var25 = var21 >> 12;
        const var26 = (var22 + 4095) >> 12;
        const var27 = var23 >> 12;
        const var28 = (var24 + 4095) >> 12;
        const var29 = var25 + arg2;
        const var30 = var26 + arg2;
        const var31 = var27 + arg3;
        const var32 = var28 + arg3;
        let var33 = var29 >> 4;
        let var34 = (var30 + 15) >> 4;
        let var35 = var31 >> 4;
        let var36 = (var32 + 15) >> 4;
        if (var33 < Pix2D.clipMinX) {
            var33 = Pix2D.clipMinX;
        }
        if (var34 > Pix2D.clipMaxX) {
            var34 = Pix2D.clipMaxX;
        }
        if (var35 < Pix2D.clipMinY) {
            var35 = Pix2D.clipMinY;
        }
        if (var36 > Pix2D.clipMaxY) {
            var36 = Pix2D.clipMaxY;
        }
        const var37 = var33 - var34;
        if (var37 >= 0) {
            return;
        }
        const var38 = var35 - var36;
        if (var38 >= 0) {
            return;
        }
        let var39 = var35 * Pix2D.width + var33;
        const var40 = 1.6777216e7 / arg5;
        const var42 = Math.floor(Math.sin(var9) * var40 + 0.5) | 0;
        const var43 = Math.floor(Math.cos(var9) * var40 + 0.5) | 0;
        const var44 = (var33 << 4) + 8 - arg2;
        const var45 = (var35 << 4) + 8 - arg3;
        let var46 = (var7 << 8) - ((var45 * var42) >> 4);
        let var47 = (var8 << 8) + ((var45 * var43) >> 4);
        if (var43 === 0) {
            if (var42 === 0) {
                let var48 = var38;
                while (var48 < 0) {
                    let var49 = var39;
                    let var50 = var37;
                    if (var46 >= 0 && var47 >= 0 && var46 - (this.wi << 12) < 0 && var47 - (this.hi << 12) < 0) {
                        while (var50 < 0) {
                            const var51 = this.data[(var47 >> 12) * this.wi + (var46 >> 12)];
                            if (var51 === 0) {
                                var49++;
                            } else {
                                Pix2D.pixels[var49++] = var51;
                            }
                            var50++;
                        }
                    }
                    var48++;
                    var39 += Pix2D.width;
                }
            } else if (var42 < 0) {
                let var52 = var38;
                while (var52 < 0) {
                    let var53 = var39;
                    let var54 = var47 + ((var44 * var42) >> 4);
                    let var55 = var37;
                    if (var46 >= 0 && var46 - (this.wi << 12) < 0) {
                        let var56 = var54 - (this.hi << 12);
                        if (var56 >= 0) {
                            const var57 = ((var42 - var56) / var42) | 0;
                            var55 = var37 + var57;
                            var54 += var42 * var57;
                            var53 = var39 + var57;
                        }
                        const var58 = ((var54 - var42) / var42) | 0;
                        if (var58 > var55) {
                            var55 = var58;
                        }
                        while (var55 < 0) {
                            const var59 = this.data[(var54 >> 12) * this.wi + (var46 >> 12)];
                            if (var59 === 0) {
                                var53++;
                            } else {
                                Pix2D.pixels[var53++] = var59;
                            }
                            var54 += var42;
                            var55++;
                        }
                    }
                    var52++;
                    var46 -= var42;
                    var39 += Pix2D.width;
                }
            } else {
                let var60 = var38;
                while (var60 < 0) {
                    let var61 = var39;
                    let var62 = var47 + ((var44 * var42) >> 4);
                    let var63 = var37;
                    if (var46 >= 0 && var46 - (this.wi << 12) < 0) {
                        if (var62 < 0) {
                            const var64 = ((var42 - var62 - 1) / var42) | 0;
                            var63 = var37 + var64;
                            var62 += var42 * var64;
                            var61 = var39 + var64;
                        }
                        const var65 = ((var62 + 1 - (this.hi << 12) - var42) / var42) | 0;
                        if (var65 > var63) {
                            var63 = var65;
                        }
                        while (var63 < 0) {
                            const var66 = this.data[(var62 >> 12) * this.wi + (var46 >> 12)];
                            if (var66 === 0) {
                                var61++;
                            } else {
                                Pix2D.pixels[var61++] = var66;
                            }
                            var62 += var42;
                            var63++;
                        }
                    }
                    var60++;
                    var46 -= var42;
                    var39 += Pix2D.width;
                }
            }
        } else if (var43 < 0) {
            if (var42 === 0) {
                let var67 = var38;
                while (var67 < 0) {
                    let var68 = var39;
                    let var69 = var46 + ((var44 * var43) >> 4);
                    let var70 = var37;
                    if (var47 >= 0 && var47 - (this.hi << 12) < 0) {
                        let var71 = var69 - (this.wi << 12);
                        if (var71 >= 0) {
                            const var72 = ((var43 - var71) / var43) | 0;
                            var70 = var37 + var72;
                            var69 += var43 * var72;
                            var68 = var39 + var72;
                        }
                        const var73 = ((var69 - var43) / var43) | 0;
                        if (var73 > var70) {
                            var70 = var73;
                        }
                        while (var70 < 0) {
                            const var74 = this.data[(var47 >> 12) * this.wi + (var69 >> 12)];
                            if (var74 === 0) {
                                var68++;
                            } else {
                                Pix2D.pixels[var68++] = var74;
                            }
                            var69 += var43;
                            var70++;
                        }
                    }
                    var67++;
                    var47 += var43;
                    var39 += Pix2D.width;
                }
            } else if (var42 < 0) {
                let var75 = var38;
                while (var75 < 0) {
                    let var76 = var39;
                    let var77 = var46 + ((var44 * var43) >> 4);
                    let var78 = var47 + ((var44 * var42) >> 4);
                    let var79 = var37;
                    let var80 = var77 - (this.wi << 12);
                    if (var80 >= 0) {
                        const var81 = ((var43 - var80) / var43) | 0;
                        var79 = var37 + var81;
                        var77 += var43 * var81;
                        var78 += var42 * var81;
                        var76 = var39 + var81;
                    }
                    const var82 = ((var77 - var43) / var43) | 0;
                    if (var82 > var79) {
                        var79 = var82;
                    }
                    let var83 = var78 - (this.hi << 12);
                    if (var83 >= 0) {
                        const var84 = ((var42 - var83) / var42) | 0;
                        var79 += var84;
                        var77 += var43 * var84;
                        var78 += var42 * var84;
                        var76 += var84;
                    }
                    const var85 = ((var78 - var42) / var42) | 0;
                    if (var85 > var79) {
                        var79 = var85;
                    }
                    while (var79 < 0) {
                        const var86 = this.data[(var78 >> 12) * this.wi + (var77 >> 12)];
                        if (var86 === 0) {
                            var76++;
                        } else {
                            Pix2D.pixels[var76++] = var86;
                        }
                        var77 += var43;
                        var78 += var42;
                        var79++;
                    }
                    var75++;
                    var46 -= var42;
                    var47 += var43;
                    var39 += Pix2D.width;
                }
            } else {
                let var87 = var38;
                while (var87 < 0) {
                    let var88 = var39;
                    let var89 = var46 + ((var44 * var43) >> 4);
                    let var90 = var47 + ((var44 * var42) >> 4);
                    let var91 = var37;
                    let var92 = var89 - (this.wi << 12);
                    if (var92 >= 0) {
                        const var93 = ((var43 - var92) / var43) | 0;
                        var91 = var37 + var93;
                        var89 += var43 * var93;
                        var90 += var42 * var93;
                        var88 = var39 + var93;
                    }
                    const var94 = ((var89 - var43) / var43) | 0;
                    if (var94 > var91) {
                        var91 = var94;
                    }
                    if (var90 < 0) {
                        const var95 = ((var42 - var90 - 1) / var42) | 0;
                        var91 += var95;
                        var89 += var43 * var95;
                        var90 += var42 * var95;
                        var88 += var95;
                    }
                    const var96 = ((var90 + 1 - (this.hi << 12) - var42) / var42) | 0;
                    if (var96 > var91) {
                        var91 = var96;
                    }
                    while (var91 < 0) {
                        const var97 = this.data[(var90 >> 12) * this.wi + (var89 >> 12)];
                        if (var97 === 0) {
                            var88++;
                        } else {
                            Pix2D.pixels[var88++] = var97;
                        }
                        var89 += var43;
                        var90 += var42;
                        var91++;
                    }
                    var87++;
                    var46 -= var42;
                    var47 += var43;
                    var39 += Pix2D.width;
                }
            }
        } else if (var42 === 0) {
            let var98 = var38;
            while (var98 < 0) {
                let var99 = var39;
                let var100 = var46 + ((var44 * var43) >> 4);
                let var101 = var37;
                if (var47 >= 0 && var47 - (this.hi << 12) < 0) {
                    if (var100 < 0) {
                        const var102 = ((var43 - var100 - 1) / var43) | 0;
                        var101 = var37 + var102;
                        var100 += var43 * var102;
                        var99 = var39 + var102;
                    }
                    const var103 = ((var100 + 1 - (this.wi << 12) - var43) / var43) | 0;
                    if (var103 > var101) {
                        var101 = var103;
                    }
                    while (var101 < 0) {
                        const var104 = this.data[(var47 >> 12) * this.wi + (var100 >> 12)];
                        if (var104 === 0) {
                            var99++;
                        } else {
                            Pix2D.pixels[var99++] = var104;
                        }
                        var100 += var43;
                        var101++;
                    }
                }
                var98++;
                var47 += var43;
                var39 += Pix2D.width;
            }
        } else if (var42 < 0) {
            let var105 = var38;
            while (var105 < 0) {
                let var106 = var39;
                let var107 = var46 + ((var44 * var43) >> 4);
                let var108 = var47 + ((var44 * var42) >> 4);
                let var109 = var37;
                if (var107 < 0) {
                    const var110 = ((var43 - var107 - 1) / var43) | 0;
                    var109 = var37 + var110;
                    var107 += var43 * var110;
                    var108 += var42 * var110;
                    var106 = var39 + var110;
                }
                const var111 = ((var107 + 1 - (this.wi << 12) - var43) / var43) | 0;
                if (var111 > var109) {
                    var109 = var111;
                }
                let var112 = var108 - (this.hi << 12);
                if (var112 >= 0) {
                    const var113 = ((var42 - var112) / var42) | 0;
                    var109 += var113;
                    var107 += var43 * var113;
                    var108 += var42 * var113;
                    var106 += var113;
                }
                const var114 = ((var108 - var42) / var42) | 0;
                if (var114 > var109) {
                    var109 = var114;
                }
                while (var109 < 0) {
                    const var115 = this.data[(var108 >> 12) * this.wi + (var107 >> 12)];
                    if (var115 === 0) {
                        var106++;
                    } else {
                        Pix2D.pixels[var106++] = var115;
                    }
                    var107 += var43;
                    var108 += var42;
                    var109++;
                }
                var105++;
                var46 -= var42;
                var47 += var43;
                var39 += Pix2D.width;
            }
        } else {
            let var116 = var38;
            while (var116 < 0) {
                let var117 = var39;
                let var118 = var46 + ((var44 * var43) >> 4);
                let var119 = var47 + ((var44 * var42) >> 4);
                let var120 = var37;
                if (var118 < 0) {
                    const var121 = ((var43 - var118 - 1) / var43) | 0;
                    var120 = var37 + var121;
                    var118 += var43 * var121;
                    var119 += var42 * var121;
                    var117 = var39 + var121;
                }
                const var122 = ((var118 + 1 - (this.wi << 12) - var43) / var43) | 0;
                if (var122 > var120) {
                    var120 = var122;
                }
                if (var119 < 0) {
                    const var123 = ((var42 - var119 - 1) / var42) | 0;
                    var120 += var123;
                    var118 += var43 * var123;
                    var119 += var42 * var123;
                    var117 += var123;
                }
                const var124 = ((var119 + 1 - (this.hi << 12) - var42) / var42) | 0;
                if (var124 > var120) {
                    var120 = var124;
                }
                while (var120 < 0) {
                    const var125 = this.data[(var119 >> 12) * this.wi + (var118 >> 12)];
                    if (var125 === 0) {
                        var117++;
                    } else {
                        Pix2D.pixels[var117++] = var125;
                    }
                    var118 += var43;
                    var119 += var42;
                    var120++;
                }
                var116++;
                var46 -= var42;
                var47 += var43;
                var39 += Pix2D.width;
            }
        }
    }
    setPixels(): void {
        Pix2D.setPixels(this.data, this.wi, this.hi);
    }

    addOutline(arg0: number): void {
        const var2 = new Int32Array(this.wi * this.hi);
        let var3 = 0;
        for (let var4 = 0; var4 < this.hi; var4++) {
            for (let var5 = 0; var5 < this.wi; var5++) {
                let var6 = this.data[var3];
                if (var6 === 0) {
                    if (var5 > 0 && this.data[var3 - 1] !== 0) {
                        var6 = arg0;
                    } else if (var4 > 0 && this.data[var3 - this.wi] !== 0) {
                        var6 = arg0;
                    } else if (var5 < this.wi - 1 && this.data[var3 + 1] !== 0) {
                        var6 = arg0;
                    } else if (var4 < this.hi - 1 && this.data[var3 + this.wi] !== 0) {
                        var6 = arg0;
                    }
                }
                var2[var3++] = var6;
            }
        }
        this.data = var2;
    }

    rotateTransPlotSprite(arg0: number, arg1: number, arg2: number): void {
        try {
            const var5 = (Math.sin(arg2) * 65536.0) | 0;
            const var6 = (Math.cos(arg2) * 65536.0) | 0;
            const var7 = (var5 * 256) >> 8;
            const var8 = (var6 * 256) >> 8;
            let var9 = var7 * -10 + var8 * -10 + 983040;
            let var10 = var8 * -10 + 983040 - var7 * -10;
            let var11 = arg0 + arg1 * Pix2D.width;
            for (let var12 = 0; var12 < 20; var12++) {
                let var13 = var11;
                let var14 = var9;
                let var15 = var10;
                for (let var16 = -20; var16 < 0; var16++) {
                    const var17 = this.data[(var14 >> 16) + (var15 >> 16) * this.wi];
                    if (var17 === 0) {
                        var13++;
                    } else {
                        Pix2D.pixels[var13++] = var17;
                    }
                    var14 += var8;
                    var15 -= var7;
                }
                var9 += var7;
                var10 += var8;
                var11 += Pix2D.width;
            }
        } catch {}
    }
    vflip(): void {
        const var1 = new Int32Array(this.wi * this.hi);
        let var2 = 0;
        for (let var3 = this.hi - 1; var3 >= 0; var3--) {
            for (let var4 = 0; var4 < this.wi; var4++) {
                var1[var2++] = this.data[var4 + var3 * this.wi];
            }
        }
        this.data = var1;
        this.yof = this.ohi - this.hi - this.yof;
    }

    untrim(arg0: number): void {
        if (this.wi === this.owi && this.hi === this.ohi) {
            return;
        }
        let var2 = arg0;
        if (arg0 > this.xof) {
            var2 = this.xof;
        }
        let var3 = arg0;
        if (arg0 + this.xof + this.wi > this.owi) {
            var3 = this.owi - this.xof - this.wi;
        }
        let var4 = arg0;
        if (arg0 > this.yof) {
            var4 = this.yof;
        }
        let var5 = arg0;
        if (arg0 + this.yof + this.hi > this.ohi) {
            var5 = this.ohi - this.yof - this.hi;
        }
        const var6 = this.wi + var2 + var3;
        const var7 = this.hi + var4 + var5;
        const var8 = new Int32Array(var6 * var7);
        for (let var9 = 0; var9 < this.hi; var9++) {
            for (let var10 = 0; var10 < this.wi; var10++) {
                var8[(var9 + var4) * var6 + var10 + var2] = this.data[var9 * this.wi + var10];
            }
        }
        this.data = var8;
        this.wi = var6;
        this.hi = var7;
        this.xof -= var2;
        this.yof -= var4;
    }

    override transScalePlotSprite(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        if (arg2 <= 0 || arg3 <= 0) {
            return;
        }
        const var6 = this.wi;
        const var7 = this.hi;
        let var8 = 0;
        let var9 = 0;
        const var10 = this.owi;
        const var11 = this.ohi;
        const var12 = ((var10 << 16) / arg2) | 0;
        const var13 = ((var11 << 16) / arg3) | 0;
        if (this.xof > 0) {
            if (var12 === 0) {
                throw new Error();
            }
            const var14 = (((this.xof << 16) + var12 - 1) / var12) | 0;
            arg0 += var14;
            var8 = Math.imul(var14, var12) - (this.xof << 16);
        }
        if (this.yof > 0) {
            if (var13 === 0) {
                throw new Error();
            }
            const var15 = (((this.yof << 16) + var13 - 1) / var13) | 0;
            arg1 += var15;
            var9 = Math.imul(var15, var13) - (this.yof << 16);
        }
        if (var6 < var10) {
            if (var12 === 0) {
                throw new Error();
            }
            arg2 = (((var6 << 16) + var12 - var8 - 1) / var12) | 0;
        }
        if (var7 < var11) {
            if (var13 === 0) {
                throw new Error();
            }
            arg3 = (((var7 << 16) + var13 - var9 - 1) / var13) | 0;
        }
        let var16 = arg0 + Math.imul(arg1, Pix2D.width);
        let var17 = Pix2D.width - arg2;
        if (arg1 + arg3 > Pix2D.clipMaxY) {
            arg3 -= arg1 + arg3 - Pix2D.clipMaxY;
        }
        if (arg1 < Pix2D.clipMinY) {
            const var18 = Pix2D.clipMinY - arg1;
            arg3 -= var18;
            var16 += Math.imul(var18, Pix2D.width);
            var9 += Math.imul(var13, var18);
        }
        if (arg0 + arg2 > Pix2D.clipMaxX) {
            const var19 = arg0 + arg2 - Pix2D.clipMaxX;
            arg2 -= var19;
            var17 += var19;
        }
        if (arg0 < Pix2D.clipMinX) {
            const var20 = Pix2D.clipMinX - arg0;
            arg2 -= var20;
            var16 += var20;
            var8 += Math.imul(var12, var20);
            var17 += var20;
        }
        SoftwarePix32.tranScale(Pix2D.pixels, this.data, var8, var9, var16, var17, arg2, arg3, var12, var13, var6, arg4);
    }

    trim(): void {
        if (this.wi === this.owi && this.hi === this.ohi) {
            return;
        }
        const var1 = new Int32Array(this.owi * this.ohi);
        for (let var2 = 0; var2 < this.hi; var2++) {
            for (let var3 = 0; var3 < this.wi; var3++) {
                var1[(var2 + this.yof) * this.owi + var3 + this.xof] = this.data[var2 * this.wi + var3];
            }
        }
        this.data = var1;
        this.wi = this.owi;
        this.hi = this.ohi;
        this.xof = 0;
        this.yof = 0;
    }
}
