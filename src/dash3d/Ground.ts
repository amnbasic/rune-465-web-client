// jag::oldscape::dash3d::Ground
export default class Ground {
    readonly vertexX: Int32Array;
    readonly vertexY: Int32Array;
    readonly vertexZ: Int32Array;
    readonly faceColourA: Int32Array;
    readonly faceColourB: Int32Array;
    readonly faceColourC: Int32Array;
    readonly faceVertexA: Int32Array;
    readonly faceVertexB: Int32Array;
    readonly faceVertexC: Int32Array;
    faceTexture: Int32Array | null = null;
    flat: boolean = true;
    readonly overlayShape: number;
    readonly overlayRotation: number;
    readonly minimapOverlay: number;
    readonly minimapUnderlay: number;
    static readonly drawVertexX: Int32Array = new Int32Array(6);
    static readonly drawVertexY: Int32Array = new Int32Array(6);
    static readonly drawTextureVertexX: Int32Array = new Int32Array(6);
    static readonly drawTextureVertexY: Int32Array = new Int32Array(6);
    static readonly drawTextureVertexZ: Int32Array = new Int32Array(6);

    // jag::oldscape::dash3d::Ground::m_defShapeP
    // prettier-ignore
    static readonly defShapeP: Int8Array[] = [
        Int8Array.of(1, 3, 5, 7),
        Int8Array.of(1, 3, 5, 7),
        Int8Array.of(1, 3, 5, 7),
        Int8Array.of(1, 3, 5, 7, 6),
        Int8Array.of(1, 3, 5, 7, 6),
        Int8Array.of(1, 3, 5, 7, 6),
        Int8Array.of(1, 3, 5, 7, 6),
        Int8Array.of(1, 3, 5, 7, 2, 6),
        Int8Array.of(1, 3, 5, 7, 2, 8),
        Int8Array.of(1, 3, 5, 7, 2, 8),
        Int8Array.of(1, 3, 5, 7, 11, 12),
        Int8Array.of(1, 3, 5, 7, 11, 12),
        Int8Array.of(1, 3, 5, 7, 13, 14)
    ]; // shape points

    // jag::oldscape::dash3d::Ground::m_defShapeF
    // prettier-ignore
    static readonly defShapeF: Int8Array[] = [
        Int8Array.of(0, 1, 2, 3, 0, 0, 1, 3),
        Int8Array.of(1, 1, 2, 3, 1, 0, 1, 3),
        Int8Array.of(0, 1, 2, 3, 1, 0, 1, 3),
        Int8Array.of(0, 0, 1, 2, 0, 0, 2, 4, 1, 0, 4, 3),
        Int8Array.of(0, 0, 1, 4, 0, 0, 4, 3, 1, 1, 2, 4),
        Int8Array.of(0, 0, 4, 3, 1, 0, 1, 2, 1, 0, 2, 4),
        Int8Array.of(0, 1, 2, 4, 1, 0, 1, 4, 1, 0, 4, 3),
        Int8Array.of(0, 4, 1, 2, 0, 4, 2, 5, 1, 0, 4, 5, 1, 0, 5, 3),
        Int8Array.of(0, 4, 1, 2, 0, 4, 2, 3, 0, 4, 3, 5, 1, 0, 4, 5),
        Int8Array.of(0, 0, 4, 5, 1, 4, 1, 2, 1, 4, 2, 3, 1, 4, 3, 5),
        Int8Array.of(0, 0, 1, 5, 0, 1, 4, 5, 0, 1, 2, 4, 1, 0, 5, 3, 1, 5, 4, 3, 1, 4, 2, 3),
        Int8Array.of(1, 0, 1, 5, 1, 1, 4, 5, 1, 1, 2, 4, 0, 0, 5, 3, 0, 5, 4, 3, 0, 4, 2, 3),
        Int8Array.of(1, 0, 5, 4, 1, 0, 1, 5, 0, 0, 4, 3, 0, 4, 5, 3, 0, 5, 2, 3, 0, 1, 2, 5)
    ]; // shape faces

    constructor(
        overlayShape: number,
        overlayRotation: number,
        arg2: number,
        arg3: number,
        arg4: number,
        arg5: number,
        arg6: number,
        arg7: number,
        arg8: number,
        arg9: number,
        arg10: number,
        arg11: number,
        arg12: number,
        arg13: number,
        arg14: number,
        arg15: number,
        arg16: number,
        minimapOverlay: number,
        minimapUnderlay: number
    ) {
        if (arg5 !== arg6 || arg5 !== arg7 || arg5 !== arg8) {
            this.flat = false;
        }
        this.overlayShape = overlayShape;
        this.overlayRotation = overlayRotation;
        this.minimapOverlay = minimapOverlay;
        this.minimapUnderlay = minimapUnderlay;
        const var20 = Ground.defShapeP[overlayShape];
        const var21 = var20.length;
        this.vertexX = new Int32Array(var21);
        this.vertexY = new Int32Array(var21);
        this.vertexZ = new Int32Array(var21);
        const var22 = new Int32Array(var21);
        const var23 = new Int32Array(var21);
        const var24 = arg3 * 128;
        const var25 = arg4 * 128;
        for (let var26 = 0; var26 < var21; var26++) {
            let var27 = var20[var26];
            if ((var27 & 0x1) === 0 && var27 <= 8) {
                var27 = ((var27 - overlayRotation - overlayRotation - 1) & 0x7) + 1;
            }
            if (var27 > 8 && var27 <= 12) {
                var27 = ((var27 - overlayRotation - 9) & 0x3) + 9;
            }
            if (var27 > 12 && var27 <= 16) {
                var27 = ((var27 - overlayRotation - 13) & 0x3) + 13;
            }
            let var28: number;
            let var29: number;
            let var30: number;
            let var31: number;
            let var32: number;
            if (var27 === 1) {
                var28 = var24;
                var29 = var25;
                var30 = arg5;
                var31 = arg9;
                var32 = arg13;
            } else if (var27 === 2) {
                var28 = var24 + 64;
                var29 = var25;
                var30 = (arg5 + arg6) >> 1;
                var31 = (arg9 + arg10) >> 1;
                var32 = (arg13 + arg14) >> 1;
            } else if (var27 === 3) {
                var28 = var24 + 128;
                var29 = var25;
                var30 = arg6;
                var31 = arg10;
                var32 = arg14;
            } else if (var27 === 4) {
                var28 = var24 + 128;
                var29 = var25 + 64;
                var30 = (arg6 + arg7) >> 1;
                var31 = (arg10 + arg11) >> 1;
                var32 = (arg14 + arg15) >> 1;
            } else if (var27 === 5) {
                var28 = var24 + 128;
                var29 = var25 + 128;
                var30 = arg7;
                var31 = arg11;
                var32 = arg15;
            } else if (var27 === 6) {
                var28 = var24 + 64;
                var29 = var25 + 128;
                var30 = (arg7 + arg8) >> 1;
                var31 = (arg11 + arg12) >> 1;
                var32 = (arg15 + arg16) >> 1;
            } else if (var27 === 7) {
                var28 = var24;
                var29 = var25 + 128;
                var30 = arg8;
                var31 = arg12;
                var32 = arg16;
            } else if (var27 === 8) {
                var28 = var24;
                var29 = var25 + 64;
                var30 = (arg8 + arg5) >> 1;
                var31 = (arg12 + arg9) >> 1;
                var32 = (arg16 + arg13) >> 1;
            } else if (var27 === 9) {
                var28 = var24 + 64;
                var29 = var25 + 32;
                var30 = (arg5 + arg6) >> 1;
                var31 = (arg9 + arg10) >> 1;
                var32 = (arg13 + arg14) >> 1;
            } else if (var27 === 10) {
                var28 = var24 + 96;
                var29 = var25 + 64;
                var30 = (arg6 + arg7) >> 1;
                var31 = (arg10 + arg11) >> 1;
                var32 = (arg14 + arg15) >> 1;
            } else if (var27 === 11) {
                var28 = var24 + 64;
                var29 = var25 + 96;
                var30 = (arg7 + arg8) >> 1;
                var31 = (arg11 + arg12) >> 1;
                var32 = (arg15 + arg16) >> 1;
            } else if (var27 === 12) {
                var28 = var24 + 32;
                var29 = var25 + 64;
                var30 = (arg8 + arg5) >> 1;
                var31 = (arg12 + arg9) >> 1;
                var32 = (arg16 + arg13) >> 1;
            } else if (var27 === 13) {
                var28 = var24 + 32;
                var29 = var25 + 32;
                var30 = arg5;
                var31 = arg9;
                var32 = arg13;
            } else if (var27 === 14) {
                var28 = var24 + 96;
                var29 = var25 + 32;
                var30 = arg6;
                var31 = arg10;
                var32 = arg14;
            } else if (var27 === 15) {
                var28 = var24 + 96;
                var29 = var25 + 96;
                var30 = arg7;
                var31 = arg11;
                var32 = arg15;
            } else {
                var28 = var24 + 32;
                var29 = var25 + 96;
                var30 = arg8;
                var31 = arg12;
                var32 = arg16;
            }
            this.vertexX[var26] = var28;
            this.vertexY[var26] = var30;
            this.vertexZ[var26] = var29;
            var22[var26] = var31;
            var23[var26] = var32;
        }
        const var33 = Ground.defShapeF[overlayShape];
        const var34 = (var33.length / 4) | 0;
        this.faceVertexA = new Int32Array(var34);
        this.faceVertexB = new Int32Array(var34);
        this.faceVertexC = new Int32Array(var34);
        this.faceColourA = new Int32Array(var34);
        this.faceColourB = new Int32Array(var34);
        this.faceColourC = new Int32Array(var34);
        if (arg2 !== -1) {
            this.faceTexture = new Int32Array(var34);
        }
        let var35 = 0;
        for (let var36 = 0; var36 < var34; var36++) {
            const var37 = var33[var35];
            let var38 = var33[var35 + 1];
            let var39 = var33[var35 + 2];
            let var40 = var33[var35 + 3];
            var35 += 4;
            if (var38 < 4) {
                var38 = (var38 - overlayRotation) & 0x3;
            }
            if (var39 < 4) {
                var39 = (var39 - overlayRotation) & 0x3;
            }
            if (var40 < 4) {
                var40 = (var40 - overlayRotation) & 0x3;
            }
            this.faceVertexA[var36] = var38;
            this.faceVertexB[var36] = var39;
            this.faceVertexC[var36] = var40;
            if (var37 === 0) {
                this.faceColourA[var36] = var22[var38];
                this.faceColourB[var36] = var22[var39];
                this.faceColourC[var36] = var22[var40];
                if (this.faceTexture !== null) {
                    this.faceTexture[var36] = -1;
                }
            } else {
                this.faceColourA[var36] = var23[var38];
                this.faceColourB[var36] = var23[var39];
                this.faceColourC[var36] = var23[var40];
                if (this.faceTexture !== null) {
                    this.faceTexture[var36] = arg2;
                }
            }
        }
        let var41 = arg5;
        let var42 = arg6;
        if (arg6 < arg5) {
            var41 = arg6;
        }
        if (arg6 > arg6) {
            var42 = arg6;
        }
        if (arg7 < var41) {
            var41 = arg7;
        }
        if (arg7 > arg6) {
            var42 = arg7;
        }
        if (arg8 < var41) {
        }
        if (arg8 > var42) {
        }
    }
}
