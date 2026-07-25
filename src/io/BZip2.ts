import BZip2State from '#/io/BZip2State.js';

export default class BZip2 {
    static readonly state: BZip2State = new BZip2State();
    static field1831: Int32Array | null = null;

    static decompress(arg0: Uint8Array, arg1: number, arg2: Uint8Array, arg3: number): number;
    static decompress(arg0: BZip2State): void;
    static decompress(arg0: BZip2State | Uint8Array, arg1?: number, arg2?: Uint8Array, arg3?: number): number | void {
        if (!(arg0 instanceof BZip2State)) {
            const var4 = BZip2.state;
            var4.stream = arg2!;
            var4.next_in = 9;
            var4.decompressed = arg0;
            var4.next_out = 0;
            var4.avail_out = arg1!;
            var4.bsLive = 0;
            var4.bsBuff = 0;
            var4.total_in_lo32 = 0;
            var4.total_out_lo32 = 0;
            BZip2.decompress(var4);
            const var5 = arg1! - var4.avail_out;
            var4.stream = null;
            var4.decompressed = null;
            return var5;
        }

        arg0.blockSize100k = 1;
        if (BZip2.field1831 == null) {
            BZip2.field1831 = new Int32Array(arg0.blockSize100k * 100000);
        }
        let var1 = true;
        while (true) {
            while (var1) {
                const var2 = BZip2.getUnsignedChar(arg0);
                if (var2 === 23) {
                    return;
                }
                const var3 = BZip2.getUnsignedChar(arg0);
                const var4 = BZip2.getUnsignedChar(arg0);
                const var5 = BZip2.getUnsignedChar(arg0);
                const var6 = BZip2.getUnsignedChar(arg0);
                const var7 = BZip2.getUnsignedChar(arg0);
                const var8 = BZip2.getUnsignedChar(arg0);
                const var9 = BZip2.getUnsignedChar(arg0);
                const var10 = BZip2.getUnsignedChar(arg0);
                const var11 = BZip2.getUnsignedChar(arg0);
                const var12 = BZip2.getBit(arg0);
                arg0.origPtr = 0;
                const var13 = BZip2.getUnsignedChar(arg0);
                arg0.origPtr = (arg0.origPtr << 8) | (var13 & 0xff);
                const var14 = BZip2.getUnsignedChar(arg0);
                arg0.origPtr = (arg0.origPtr << 8) | (var14 & 0xff);
                const var15 = BZip2.getUnsignedChar(arg0);
                arg0.origPtr = (arg0.origPtr << 8) | (var15 & 0xff);
                for (let var16 = 0; var16 < 16; var16++) {
                    const var17 = BZip2.getBit(arg0);
                    if (var17 === 1) {
                        arg0.inUse16[var16] = true;
                    } else {
                        arg0.inUse16[var16] = false;
                    }
                }
                for (let var18 = 0; var18 < 256; var18++) {
                    arg0.inUse[var18] = false;
                }
                for (let var19 = 0; var19 < 16; var19++) {
                    if (arg0.inUse16[var19]) {
                        for (let var20 = 0; var20 < 16; var20++) {
                            const var21 = BZip2.getBit(arg0);
                            if (var21 === 1) {
                                arg0.inUse[var19 * 16 + var20] = true;
                            }
                        }
                    }
                }
                BZip2.makeMaps(arg0);
                const var22 = arg0.nInUse + 2;
                const var23 = BZip2.getBits(3, arg0);
                const var24 = BZip2.getBits(15, arg0);
                for (let var25 = 0; var25 < var24; var25++) {
                    let var26 = 0;
                    while (true) {
                        const var27 = BZip2.getBit(arg0);
                        if (var27 === 0) {
                            arg0.selectorMtf[var25] = var26;
                            break;
                        }
                        var26++;
                    }
                }
                const var28 = new Int8Array(6);
                let var29 = 0;
                while (var29 < var23) {
                    var28[var29] = var29++;
                }
                for (let var30 = 0; var30 < var24; var30++) {
                    let var31 = arg0.selectorMtf[var30];
                    const var32 = var28[var31];
                    while (var31 > 0) {
                        var28[var31] = var28[var31 - 1];
                        var31--;
                    }
                    var28[0] = var32;
                    arg0.selector[var30] = var32;
                }
                for (let var33 = 0; var33 < var23; var33++) {
                    let var34 = BZip2.getBits(5, arg0);
                    for (let var35 = 0; var35 < var22; var35++) {
                        while (true) {
                            const var36 = BZip2.getBit(arg0);
                            if (var36 === 0) {
                                arg0.len[var33][var35] = var34;
                                break;
                            }
                            const var37 = BZip2.getBit(arg0);
                            if (var37 === 0) {
                                var34++;
                            } else {
                                var34--;
                            }
                        }
                    }
                }
                for (let var38 = 0; var38 < var23; var38++) {
                    let var39 = 32;
                    let var40 = 0;
                    for (let var41 = 0; var41 < var22; var41++) {
                        if (arg0.len[var38][var41] > var40) {
                            var40 = arg0.len[var38][var41];
                        }
                        if (arg0.len[var38][var41] < var39) {
                            var39 = arg0.len[var38][var41];
                        }
                    }
                    BZip2.createDecodeTables(arg0.limit[var38], arg0.base[var38], arg0.perm[var38], arg0.len[var38], var39, var40, var22);
                    arg0.minLens[var38] = var39;
                }
                const var42 = arg0.nInUse + 1;
                const var43 = -1;
                for (let var44 = 0; var44 <= 255; var44++) {
                    arg0.unzftab[var44] = 0;
                }
                let var45 = 4095;
                for (let var46 = 15; var46 >= 0; var46--) {
                    for (let var47 = 15; var47 >= 0; var47--) {
                        arg0.mtfa[var45] = var46 * 16 + var47;
                        var45--;
                    }
                    arg0.mtfbase[var46] = var45 + 1;
                }
                let var48 = 0;
                let var84 = var43 + 1;
                const var49 = 50;
                const var50 = arg0.selector[0];
                let var51 = arg0.minLens[var50];
                let var52 = arg0.limit[var50];
                let var53 = arg0.perm[var50];
                let var54 = arg0.base[var50];
                let var85 = var49 - 1;
                let var55 = var51;
                let var56;
                let var57;
                for (var56 = BZip2.getBits(var51, arg0); var56 > var52[var55]; var56 = (var56 << 1) | var57) {
                    var55++;
                    var57 = BZip2.getBit(arg0);
                }
                let var58 = var53[var56 - var54[var55]];
                while (true) {
                    while (var58 !== var42) {
                        if (var58 === 0 || var58 === 1) {
                            let var59 = -1;
                            let var60 = 1;
                            do {
                                if (var58 === 0) {
                                    var59 += var60;
                                } else if (var58 === 1) {
                                    var59 += var60 * 2;
                                }
                                var60 *= 2;
                                if (var85 === 0) {
                                    var84++;
                                    var85 = 50;
                                    const var61 = arg0.selector[var84];
                                    var51 = arg0.minLens[var61];
                                    var52 = arg0.limit[var61];
                                    var53 = arg0.perm[var61];
                                    var54 = arg0.base[var61];
                                }
                                var85--;
                                let var62 = var51;
                                let var63;
                                let var64;
                                for (var63 = BZip2.getBits(var51, arg0); var63 > var52[var62]; var63 = (var63 << 1) | var64) {
                                    var62++;
                                    var64 = BZip2.getBit(arg0);
                                }
                                var58 = var53[var63 - var54[var62]];
                            } while (var58 === 0 || var58 === 1);
                            var59++;
                            const var65 = arg0.seqToUnseq[arg0.mtfa[arg0.mtfbase[0]] & 0xff];
                            arg0.unzftab[var65 & 0xff] += var59;
                            while (var59 > 0) {
                                BZip2.field1831[var48] = var65 & 0xff;
                                var48++;
                                var59--;
                            }
                        } else {
                            let var66 = var58 - 1;
                            let var68;
                            if (var66 < 16) {
                                const var67 = arg0.mtfbase[0];
                                var68 = arg0.mtfa[var67 + var66];
                                while (var66 > 3) {
                                    const var69 = var67 + var66;
                                    arg0.mtfa[var69] = arg0.mtfa[var69 - 1];
                                    arg0.mtfa[var69 - 1] = arg0.mtfa[var69 - 2];
                                    arg0.mtfa[var69 - 2] = arg0.mtfa[var69 - 3];
                                    arg0.mtfa[var69 - 3] = arg0.mtfa[var69 - 4];
                                    var66 -= 4;
                                }
                                while (var66 > 0) {
                                    arg0.mtfa[var67 + var66] = arg0.mtfa[var67 + var66 - 1];
                                    var66--;
                                }
                                arg0.mtfa[var67] = var68;
                            } else {
                                let var70 = (var66 / 16) | 0;
                                const var71 = var66 % 16;
                                let var72 = arg0.mtfbase[var70] + var71;
                                var68 = arg0.mtfa[var72];
                                while (var72 > arg0.mtfbase[var70]) {
                                    arg0.mtfa[var72] = arg0.mtfa[var72 - 1];
                                    var72--;
                                }
                                arg0.mtfbase[var70]++;
                                while (var70 > 0) {
                                    arg0.mtfbase[var70]--;
                                    arg0.mtfa[arg0.mtfbase[var70]] = arg0.mtfa[arg0.mtfbase[var70 - 1] + 16 - 1];
                                    var70--;
                                }
                                arg0.mtfbase[0]--;
                                arg0.mtfa[arg0.mtfbase[0]] = var68;
                                if (arg0.mtfbase[0] === 0) {
                                    let var73 = 4095;
                                    for (let var74 = 15; var74 >= 0; var74--) {
                                        for (let var75 = 15; var75 >= 0; var75--) {
                                            arg0.mtfa[var73] = arg0.mtfa[arg0.mtfbase[var74] + var75];
                                            var73--;
                                        }
                                        arg0.mtfbase[var74] = var73 + 1;
                                    }
                                }
                            }
                            arg0.unzftab[arg0.seqToUnseq[var68 & 0xff] & 0xff]++;
                            BZip2.field1831[var48] = arg0.seqToUnseq[var68 & 0xff] & 0xff;
                            var48++;
                            if (var85 === 0) {
                                var84++;
                                var85 = 50;
                                const var76 = arg0.selector[var84];
                                var51 = arg0.minLens[var76];
                                var52 = arg0.limit[var76];
                                var53 = arg0.perm[var76];
                                var54 = arg0.base[var76];
                            }
                            var85--;
                            let var77 = var51;
                            let var78;
                            let var79;
                            for (var78 = BZip2.getBits(var51, arg0); var78 > var52[var77]; var78 = (var78 << 1) | var79) {
                                var77++;
                                var79 = BZip2.getBit(arg0);
                            }
                            var58 = var53[var78 - var54[var77]];
                        }
                    }
                    arg0.state_out_len = 0;
                    arg0.state_out_ch = 0;
                    arg0.cftab[0] = 0;
                    for (let var80 = 1; var80 <= 256; var80++) {
                        arg0.cftab[var80] = arg0.unzftab[var80 - 1];
                    }
                    for (let var81 = 1; var81 <= 256; var81++) {
                        arg0.cftab[var81] += arg0.cftab[var81 - 1];
                    }
                    for (let var82 = 0; var82 < var48; var82++) {
                        const var83 = ((BZip2.field1831[var82] & 0xff) << 24) >> 24;
                        BZip2.field1831[arg0.cftab[var83 & 0xff]] |= var82 << 8;
                        arg0.cftab[var83 & 0xff]++;
                    }
                    arg0.tPos = BZip2.field1831[arg0.origPtr] >> 8;
                    arg0.c_nblock_used = 0;
                    arg0.tPos = BZip2.field1831[arg0.tPos];
                    arg0.k0 = ((arg0.tPos & 0xff) << 24) >> 24;
                    arg0.tPos >>= 0x8;
                    arg0.c_nblock_used++;
                    arg0.save_nblock = var48;
                    BZip2.finish(arg0);
                    if (arg0.c_nblock_used === arg0.save_nblock + 1 && arg0.state_out_len === 0) {
                        var1 = true;
                        break;
                    }
                    var1 = false;
                    break;
                }
            }
            return;
        }
    }

    static getBit(arg0: BZip2State): number {
        return (BZip2.getBits(1, arg0) << 24) >> 24;
    }

    static getBits(arg0: number, arg1: BZip2State): number {
        while (arg1.bsLive < arg0) {
            arg1.bsBuff = (arg1.bsBuff << 8) | (arg1.stream![arg1.next_in] & 0xff);
            arg1.bsLive += 8;
            arg1.next_in++;
            arg1.total_in_lo32++;
        }
        const var2 = (arg1.bsBuff >> (arg1.bsLive - arg0)) & ((0x1 << arg0) - 1);
        arg1.bsLive -= arg0;
        return var2;
    }

    static createDecodeTables(arg0: Int32Array, arg1: Int32Array, arg2: Int32Array, arg3: Int8Array, arg4: number, arg5: number, arg6: number): void {
        let var7 = 0;
        for (let var8 = arg4; var8 <= arg5; var8++) {
            for (let var9 = 0; var9 < arg6; var9++) {
                if (arg3[var9] === var8) {
                    arg2[var7] = var9;
                    var7++;
                }
            }
        }
        for (let var10 = 0; var10 < 23; var10++) {
            arg1[var10] = 0;
        }
        for (let var11 = 0; var11 < arg6; var11++) {
            arg1[arg3[var11] + 1]++;
        }
        for (let var12 = 1; var12 < 23; var12++) {
            arg1[var12] += arg1[var12 - 1];
        }
        for (let var13 = 0; var13 < 23; var13++) {
            arg0[var13] = 0;
        }
        let var14 = 0;
        for (let var15 = arg4; var15 <= arg5; var15++) {
            const var16 = var14 + arg1[var15 + 1] - arg1[var15];
            arg0[var15] = var16 - 1;
            var14 = var16 << 1;
        }
        for (let var17 = arg4 + 1; var17 <= arg5; var17++) {
            arg1[var17] = ((arg0[var17 - 1] + 1) << 1) - arg1[var17];
        }
    }

    static getUnsignedChar(arg0: BZip2State): number {
        return (BZip2.getBits(8, arg0) << 24) >> 24;
    }

    static makeMaps(arg0: BZip2State): void {
        arg0.nInUse = 0;
        for (let var1 = 0; var1 < 256; var1++) {
            if (arg0.inUse[var1]) {
                arg0.seqToUnseq[arg0.nInUse] = var1;
                arg0.nInUse++;
            }
        }
    }

    static finish(arg0: BZip2State): void {
        let var1 = arg0.state_out_ch;
        let var2 = arg0.state_out_len;
        let var3 = arg0.c_nblock_used;
        let var4 = arg0.k0;
        const var5 = BZip2.field1831!;
        let var6 = arg0.tPos;
        const var7 = arg0.decompressed!;
        let var8 = arg0.next_out;
        let var9 = arg0.avail_out;
        const var10 = var9;
        const var11 = arg0.save_nblock + 1;
        outer: while (true) {
            if (var2 > 0) {
                while (true) {
                    if (var9 === 0) {
                        break outer;
                    }
                    if (var2 === 1) {
                        if (var9 === 0) {
                            var2 = 1;
                            break outer;
                        }
                        var7[var8] = var1;
                        var8++;
                        var9--;
                        break;
                    }
                    var7[var8] = var1;
                    var2--;
                    var8++;
                    var9--;
                }
            }
            let var12 = true;
            while (var12) {
                var12 = false;
                if (var3 === var11) {
                    var2 = 0;
                    break outer;
                }
                var1 = (var4 << 24) >> 24;
                const var13 = var5[var6];
                const var14 = ((var13 & 0xff) << 24) >> 24;
                var6 = var13 >> 8;
                var3++;
                if (var14 !== var4) {
                    var4 = var14;
                    if (var9 === 0) {
                        var2 = 1;
                        break outer;
                    }
                    var7[var8] = var1;
                    var8++;
                    var9--;
                    var12 = true;
                } else if (var3 === var11) {
                    if (var9 === 0) {
                        var2 = 1;
                        break outer;
                    }
                    var7[var8] = var1;
                    var8++;
                    var9--;
                    var12 = true;
                }
            }
            var2 = 2;
            const var15 = var5[var6];
            const var16 = ((var15 & 0xff) << 24) >> 24;
            var6 = var15 >> 8;
            var3++;
            if (var3 !== var11) {
                if (var16 === var4) {
                    var2 = 3;
                    const var17 = var5[var6];
                    const var18 = ((var17 & 0xff) << 24) >> 24;
                    var6 = var17 >> 8;
                    var3++;
                    if (var3 !== var11) {
                        if (var18 === var4) {
                            const var19 = var5[var6];
                            const var20 = ((var19 & 0xff) << 24) >> 24;
                            const var21 = var19 >> 8;
                            var3++;
                            var2 = (var20 & 0xff) + 4;
                            const var22 = var5[var21];
                            var4 = ((var22 & 0xff) << 24) >> 24;
                            var6 = var22 >> 8;
                            var3++;
                        } else {
                            var4 = var18;
                        }
                    }
                } else {
                    var4 = var16;
                }
            }
        }
        const var23 = arg0.total_out_lo32;
        arg0.total_out_lo32 += var10 - var9;
        arg0.state_out_ch = var1;
        arg0.state_out_len = var2;
        arg0.c_nblock_used = var3;
        arg0.k0 = var4;
        BZip2.field1831 = var5;
        arg0.tPos = var6;
        arg0.decompressed = var7;
        arg0.next_out = var8;
        arg0.avail_out = var9;
    }
}
