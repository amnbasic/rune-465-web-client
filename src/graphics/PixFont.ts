import PixfontGeneric from '#/graphics/PixfontGeneric.js';
import Pix2D from '#/graphics/Pix2D.js';

export default abstract class PixFont extends PixfontGeneric {
    glyphs: Int8Array[] = new Array(256);

    constructor(arg0: Uint8Array);
    constructor(arg0: Uint8Array, arg1: Int32Array, arg2: Int32Array, arg3: Int32Array, arg4: Int32Array, arg5: Int8Array[]);
    constructor(arg0: Uint8Array, arg1?: Int32Array, arg2?: Int32Array, arg3?: Int32Array, arg4?: Int32Array, arg5?: Int8Array[]) {
        if (arg1 && arg2 && arg3 && arg4 && arg5) {
            super(arg0, arg1, arg2, arg3, arg4);
            this.glyphs = arg5;
        } else {
            super(arg0);
        }
    }

    static plot(arg0: number, arg1: number, arg2: number, arg3: Int8Array, arg4: number, arg5: number, arg6: number, arg7: Int32Array, arg8: number): void {
        let var9 = -(arg4 >> 2);
        let var10 = -(arg4 & 0x3);
        for (let var11 = -arg5; var11 < 0; var11++) {
            for (let var12 = var9; var12 < 0; var12++) {
                if (arg3[arg8++] === 0) {
                    arg2++;
                } else {
                    arg7[arg2++] = arg0;
                }
                if (arg3[arg8++] === 0) {
                    arg2++;
                } else {
                    arg7[arg2++] = arg0;
                }
                if (arg3[arg8++] === 0) {
                    arg2++;
                } else {
                    arg7[arg2++] = arg0;
                }
                if (arg3[arg8++] === 0) {
                    arg2++;
                } else {
                    arg7[arg2++] = arg0;
                }
            }
            for (let var13 = var10; var13 < 0; var13++) {
                if (arg3[arg8++] === 0) {
                    arg2++;
                } else {
                    arg7[arg2++] = arg0;
                }
            }
            arg2 += arg6;
            arg8 += arg1;
        }
    }

    static plotTrans(arg0: Int32Array, arg1: number, arg2: number, arg3: number, arg4: number, arg5: Int8Array, arg6: number, arg7: number, arg8: number, arg9: number): void {
        let var10 = (((arg2 * (arg6 & 0xff00ff)) & 0xff00ff00) + (((arg6 & 0xff00) * arg2) & 0xff0000)) >> 8;
        let var11 = 256 - arg2;
        for (let var12 = -arg8; var12 < 0; var12++) {
            for (let var13 = -arg1; var13 < 0; var13++) {
                if (arg5[arg3++] === 0) {
                    arg7++;
                } else {
                    let var14 = arg0[arg7];
                    arg0[arg7++] = ((((var11 * (var14 & 0xff00ff)) & 0xff00ff00) + ((var11 * (var14 & 0xff00)) & 0xff0000)) >> 8) + var10;
                }
            }
            arg7 += arg4;
            arg3 += arg9;
        }
    }

    override plotLetterTrans(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        let var8 = arg2 * Pix2D.width + arg1;
        let var9 = 0;
        let var10 = Pix2D.width - arg3;
        let var11 = 0;
        if (Pix2D.clipMinY > arg2) {
            let var12 = Pix2D.clipMinY - arg2;
            arg2 = Pix2D.clipMinY;
            var11 = arg3 * var12;
            arg4 -= var12;
            var8 += var12 * Pix2D.width;
        }
        if (Pix2D.clipMaxY < arg2 + arg4) {
            arg4 -= arg2 + arg4 - Pix2D.clipMaxY;
        }
        if (arg1 < Pix2D.clipMinX) {
            let var13 = Pix2D.clipMinX - arg1;
            arg1 = Pix2D.clipMinX;
            var9 = var13;
            var10 += var13;
            var11 += var13;
            var8 += var13;
            arg3 -= var13;
        }
        if (Pix2D.clipMaxX < arg1 + arg3) {
            let var14 = arg3 + arg1 - Pix2D.clipMaxX;
            arg3 -= var14;
            var10 += var14;
            var9 += var14;
        }
        if (arg3 > 0 && arg4 > 0) {
            PixFont.plotTrans(Pix2D.pixels, arg3, arg6, var11, var10, this.glyphs[arg0], arg5, var8, arg4, var9);
        }
    }

    override plotLetter(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        let var7 = Pix2D.width - arg3;
        let var8 = Pix2D.width * arg2 + arg1;
        let var9 = 0;
        let var10 = 0;
        if (arg2 < Pix2D.clipMinY) {
            let var11 = Pix2D.clipMinY - arg2;
            var10 = var11 * arg3;
            arg4 -= var11;
            var8 += Pix2D.width * var11;
            arg2 = Pix2D.clipMinY;
        }
        if (Pix2D.clipMaxY < arg2 + arg4) {
            arg4 -= arg4 + arg2 - Pix2D.clipMaxY;
        }
        if (Pix2D.clipMinX > arg1) {
            let var12 = Pix2D.clipMinX - arg1;
            var8 += var12;
            var9 = var12;
            var10 += var12;
            arg3 -= var12;
            var7 += var12;
            arg1 = Pix2D.clipMinX;
        }
        if (arg1 + arg3 > Pix2D.clipMaxX) {
            let var13 = arg1 + arg3 - Pix2D.clipMaxX;
            var7 += var13;
            arg3 -= var13;
            var9 += var13;
        }
        if (arg3 > 0 && arg4 > 0) {
            PixFont.plot(arg5, var9, var8, this.glyphs[arg0], arg3, arg4, var7, Pix2D.pixels, var10);
        }
    }
}
