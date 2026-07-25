import PixFont from '#/graphics/PixFont.js';
import Pix2D from '#/graphics/Pix2D.js';

export default class SoftwarePixFont extends PixFont {
    constructor(arg0: Uint8Array);
    constructor(arg0: Uint8Array, arg1: Int32Array, arg2: Int32Array, arg3: Int32Array, arg4: Int32Array, arg5: Int8Array[]);
    constructor(arg0: Uint8Array, arg1?: Int32Array, arg2?: Int32Array, arg3?: Int32Array, arg4?: Int32Array, arg5?: Int8Array[]) {
        if (arg1 && arg2 && arg3 && arg4 && arg5) {
            super(arg0, arg1, arg2, arg3, arg4, arg5);
        } else {
            super(arg0);
        }
    }

    override plotLetterTransScanline(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        let var8 = arg1 + arg2 * Pix2D.width;
        let var9 = Pix2D.width - arg3;
        let var10 = 0;
        let var11 = 0;
        if (arg2 < Pix2D.clipMinY) {
            const var12 = Pix2D.clipMinY - arg2;
            arg4 -= var12;
            arg2 = Pix2D.clipMinY;
            var11 = var12 * arg3;
            var8 += var12 * Pix2D.width;
        }
        if (arg2 + arg4 > Pix2D.clipMaxY) {
            arg4 -= arg2 + arg4 - Pix2D.clipMaxY;
        }
        if (arg1 < Pix2D.clipMinX) {
            const var13 = Pix2D.clipMinX - arg1;
            arg3 -= var13;
            arg1 = Pix2D.clipMinX;
            var11 += var13;
            var8 += var13;
            var10 = var13;
            var9 += var13;
        }
        if (arg1 + arg3 > Pix2D.clipMaxX) {
            const var14 = arg1 + arg3 - Pix2D.clipMaxX;
            arg3 -= var14;
            var10 += var14;
            var9 += var14;
        }
        if (arg3 > 0 && arg4 > 0) {
            PixFont.plotTrans(Pix2D.pixels, arg3, arg6, var11, var9, this.glyphs[arg0], arg5, var8, arg4, var10);
        }
    }

    override plotLetterScanline(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        let var7 = arg1 + arg2 * Pix2D.width;
        let var8 = Pix2D.width - arg3;
        let var9 = 0;
        let var10 = 0;
        if (arg2 < Pix2D.clipMinY) {
            const var11 = Pix2D.clipMinY - arg2;
            arg4 -= var11;
            arg2 = Pix2D.clipMinY;
            var10 = var11 * arg3;
            var7 += var11 * Pix2D.width;
        }
        if (arg2 + arg4 > Pix2D.clipMaxY) {
            arg4 -= arg2 + arg4 - Pix2D.clipMaxY;
        }
        if (arg1 < Pix2D.clipMinX) {
            const var12 = Pix2D.clipMinX - arg1;
            arg3 -= var12;
            arg1 = Pix2D.clipMinX;
            var10 += var12;
            var7 += var12;
            var9 = var12;
            var8 += var12;
        }
        if (arg1 + arg3 > Pix2D.clipMaxX) {
            const var13 = arg1 + arg3 - Pix2D.clipMaxX;
            arg3 -= var13;
            var9 += var13;
            var8 += var13;
        }
        if (arg3 > 0 && arg4 > 0) {
            PixFont.plot(arg5, var9, var7, this.glyphs[arg0], arg3, arg4, var8, Pix2D.pixels, var10);
        }
    }
}
