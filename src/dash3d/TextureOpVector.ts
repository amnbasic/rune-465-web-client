import Texture from '#/dash3d/Texture.js';
import TextureOp from '#/dash3d/TextureOp.js';
import TextureOpSubShape from '#/dash3d/TextureOpSubShape.js';
import TextureOpSubShape0 from '#/dash3d/TextureOpSubShape0.js';
import TextureOpSubShape1 from '#/dash3d/TextureOpSubShape1.js';
import TextureOpSubShape2 from '#/dash3d/TextureOpSubShape2.js';
import TextureOpSubShape3 from '#/dash3d/TextureOpSubShape3.js';
import Packet from '#/io/Packet.js';
import ArrayUtil from '#/util/ArrayUtil.js';
import IntMath from '#/util/IntMath.js';

export default class TextureOpVector extends TextureOp {
    static field183: number = 100;
    static field1207: number = 0;
    static field919: number = 0;
    static field279: number = 100;
    static field42: Int32Array[] = null as unknown as Int32Array[];
    static field482: Int32Array = null as unknown as Int32Array;

    drawCommands: TextureOpSubShape[] | null = null;

    constructor() {
        super(0, true);
    }

    static method1575(arg0: number, arg1: number): void {
        TextureOpVector.field183 = arg1;
        TextureOpVector.field1207 = 0;
        TextureOpVector.field919 = 0;
        TextureOpVector.field279 = arg0;
    }

    static method114(arg0: Int32Array[]): void {
        TextureOpVector.field42 = arg0;
    }

    static method827(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        TextureOpVector.method906(arg3);
        let var6 = 0;
        let var7 = arg3 - arg5;
        if (var7 < 0) {
            var7 = 0;
        }
        let var8 = arg3;
        let var9 = -arg3;
        let var10 = var7;
        if (TextureOpVector.field919 <= arg1 && arg1 <= TextureOpVector.field279) {
            const var11 = TextureOpVector.field42[arg1];
            const var12 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - arg3);
            const var13 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 + arg3);
            const var14 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - var7);
            const var15 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 + var7);
            ArrayUtil.method1534(var12, arg2, var14, var11);
            ArrayUtil.method1534(var14, arg0, var15, var11);
            ArrayUtil.method1534(var15, arg2, var13, var11);
        }
        let var16 = -1;
        let var17 = -var7;
        let var18 = -1;
        while (var8 > var6) {
            var18 += 2;
            var9 += var18;
            var16 += 2;
            var17 += var16;
            if (var17 >= 0 && var10 >= 1) {
                var10--;
                TextureOpVector.field482[var10] = var6;
                var17 -= var10 << 1;
            }
            var6++;
            if (var9 >= 0) {
                var8--;
                var9 -= var8 << 1;
                const var19 = arg1 - var8;
                const var20 = arg1 + var8;
                if (TextureOpVector.field919 <= var20 && TextureOpVector.field279 >= var19) {
                    if (var8 < var7) {
                        const var21 = TextureOpVector.field482[var8];
                        const var22 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 + var6);
                        const var23 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - var6);
                        const var24 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, var21 + arg4);
                        const var25 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - var21);
                        if (var20 <= TextureOpVector.field279) {
                            const var26 = TextureOpVector.field42[var20];
                            ArrayUtil.method1534(var23, arg2, var25, var26);
                            ArrayUtil.method1534(var25, arg0, var24, var26);
                            ArrayUtil.method1534(var24, arg2, var22, var26);
                        }
                        if (var19 >= TextureOpVector.field919) {
                            const var27 = TextureOpVector.field42[var19];
                            ArrayUtil.method1534(var23, arg2, var25, var27);
                            ArrayUtil.method1534(var25, arg0, var24, var27);
                            ArrayUtil.method1534(var24, arg2, var22, var27);
                        }
                    } else {
                        const var28 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, var6 + arg4);
                        const var29 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - var6);
                        if (var20 <= TextureOpVector.field279) {
                            ArrayUtil.method1534(var29, arg2, var28, TextureOpVector.field42[var20]);
                        }
                        if (TextureOpVector.field919 <= var19) {
                            ArrayUtil.method1534(var29, arg2, var28, TextureOpVector.field42[var19]);
                        }
                    }
                }
            }
            const var30 = var6 + arg1;
            const var31 = arg1 - var6;
            if (var30 >= TextureOpVector.field919 && var31 <= TextureOpVector.field279) {
                const var32 = arg4 + var8;
                const var33 = arg4 - var8;
                if (TextureOpVector.field1207 <= var32 && var33 <= TextureOpVector.field183) {
                    const var34 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, var32);
                    const var35 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, var33);
                    if (var7 > var6) {
                        const var36 = var10 >= var6 ? var10 : TextureOpVector.field482[var6];
                        const var37 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, var36 + arg4);
                        const var38 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - var36);
                        if (var30 <= TextureOpVector.field279) {
                            const var39 = TextureOpVector.field42[var30];
                            ArrayUtil.method1534(var35, arg2, var38, var39);
                            ArrayUtil.method1534(var38, arg0, var37, var39);
                            ArrayUtil.method1534(var37, arg2, var34, var39);
                        }
                        if (var31 >= TextureOpVector.field919) {
                            const var40 = TextureOpVector.field42[var31];
                            ArrayUtil.method1534(var35, arg2, var38, var40);
                            ArrayUtil.method1534(var38, arg0, var37, var40);
                            ArrayUtil.method1534(var37, arg2, var34, var40);
                        }
                    } else {
                        if (TextureOpVector.field279 >= var30) {
                            ArrayUtil.method1534(var35, arg2, var34, TextureOpVector.field42[var30]);
                        }
                        if (TextureOpVector.field919 <= var31) {
                            ArrayUtil.method1534(var35, arg2, var34, TextureOpVector.field42[var31]);
                        }
                    }
                }
            }
        }
    }

    static method906(arg0: number): void {
        if (TextureOpVector.field482 == null || TextureOpVector.field482.length < arg0) {
            TextureOpVector.field482 = new Int32Array(arg0);
        }
    }

    static method1514(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        if (arg1 === arg2) {
            TextureOpVector.method216(arg2, arg5, arg4, arg6, arg0, arg3);
        } else if (arg3 - arg2 >= TextureOpVector.field1207 && arg2 + arg3 <= TextureOpVector.field183 && TextureOpVector.field919 <= arg6 - arg1 && TextureOpVector.field279 >= arg1 + arg6) {
            TextureOpVector.method126(arg3, arg0, arg1, arg5, arg4, arg6, arg2);
        } else {
            TextureOpVector.method1051(arg6, arg4, arg2, arg5, arg0, arg1, arg3);
        }
    }

    static method892(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        let var5 = arg2;
        ArrayUtil.method1534(arg0 - arg1, arg4, arg0 + arg1, TextureOpVector.field42[arg3]);
        const var6 = arg1 * arg1;
        let var7 = 0;
        const var8 = arg2 * arg2;
        const var9 = var8 << 1;
        const var10 = var6 << 1;
        const var11 = arg2 << 1;
        let var12 = var8 - var10 * (var11 - 1);
        let var13 = var9 + var6 * (1 - var11);
        const var14 = var6 << 2;
        let var15 = var10 * ((arg2 << 1) - 3);
        const var16 = var8 << 2;
        let var17 = var16;
        let var18 = var9 * 3;
        let var19 = (arg2 - 1) * var14;
        while (var5 > 0) {
            if (var13 < 0) {
                while (var13 < 0) {
                    var7++;
                    var13 += var18;
                    var12 += var17;
                    var18 += var16;
                    var17 += var16;
                }
            }
            var5--;
            const var20 = arg3 - var5;
            if (var12 < 0) {
                var13 += var18;
                var7++;
                var18 += var16;
                var12 += var17;
                var17 += var16;
            }
            const var21 = var5 + arg3;
            var13 += -var19;
            var19 -= var14;
            const var22 = arg0 + var7;
            const var23 = arg0 - var7;
            ArrayUtil.method1534(var23, arg4, var22, TextureOpVector.field42[var20]);
            var12 += -var15;
            var15 -= var14;
            ArrayUtil.method1534(var23, arg4, var22, TextureOpVector.field42[var21]);
        }
    }

    static method26(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        if (TextureOpVector.field1207 <= arg3 && TextureOpVector.field183 >= arg4 && arg1 >= TextureOpVector.field919 && TextureOpVector.field279 >= arg0) {
            TextureOpVector.method1502(arg3, arg2, arg4, arg1, arg0);
        } else {
            TextureOpVector.method226(arg2, arg1, arg0, arg3, arg4);
        }
    }

    static method368(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        if (TextureOpVector.field1207 <= arg5 && TextureOpVector.field183 >= arg0 && arg2 >= TextureOpVector.field919 && arg6 <= TextureOpVector.field279) {
            TextureOpVector.method1333(arg4, arg2, arg6, arg3, arg5, arg0, arg1);
        } else {
            TextureOpVector.method986(arg4, arg0, arg2, arg5, arg6, arg3, arg1);
        }
    }

    static method887(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        if (TextureOpVector.field1207 <= arg5 && arg2 <= TextureOpVector.field183 && arg1 >= TextureOpVector.field919 && TextureOpVector.field279 >= arg3) {
            if (arg0 === 1) {
                TextureOpVector.method1420(arg5, arg2, arg3, arg1, arg4);
            } else {
                TextureOpVector.method786(arg2, arg4, arg0, arg3, arg1, arg5);
            }
        } else if (arg0 === 1) {
            TextureOpVector.method1028(arg3, arg4, arg5, arg1, arg2);
        } else {
            TextureOpVector.method101(arg3, arg0, arg5, arg1, arg2, arg4);
        }
    }

    static method46(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        TextureOpVector.method906(arg3);
        let var6 = arg3 - arg5;
        if (var6 < 0) {
            var6 = 0;
        }
        let var7 = 0;
        let var8 = arg3;
        let var9 = -var6;
        let var10 = var6;
        let var11 = -1;
        let var12 = -arg3;
        let var13 = -1;
        const var14 = arg1 - var6;
        const var15 = var6 + arg1;
        const var16 = TextureOpVector.field42[arg4];
        ArrayUtil.method1534(arg1 - arg3, arg2, var14, var16);
        ArrayUtil.method1534(var14, arg0, var15, var16);
        ArrayUtil.method1534(var15, arg2, arg3 + arg1, var16);
        while (var7 < var8) {
            var13 += 2;
            var9 += var13;
            var11 += 2;
            if (var9 >= 0 && var10 >= 1) {
                TextureOpVector.field482[var10] = var7;
                var10--;
                var9 -= var10 << 1;
            }
            var12 += var11;
            var7++;
            if (var12 >= 0) {
                var8--;
                if (var8 < var6) {
                    const var17 = TextureOpVector.field42[arg4 + var8];
                    const var18 = TextureOpVector.field482[var8];
                    const var19 = TextureOpVector.field42[arg4 - var8];
                    const var20 = arg1 - var7;
                    const var21 = arg1 + var7;
                    const var22 = arg1 + var18;
                    const var23 = arg1 - var18;
                    ArrayUtil.method1534(var20, arg2, var23, var17);
                    ArrayUtil.method1534(var23, arg0, var22, var17);
                    ArrayUtil.method1534(var22, arg2, var21, var17);
                    ArrayUtil.method1534(var20, arg2, var23, var19);
                    ArrayUtil.method1534(var23, arg0, var22, var19);
                    ArrayUtil.method1534(var22, arg2, var21, var19);
                } else {
                    const var24 = TextureOpVector.field42[arg4 + var8];
                    const var25 = TextureOpVector.field42[arg4 - var8];
                    const var26 = var7 + arg1;
                    const var27 = arg1 - var7;
                    ArrayUtil.method1534(var27, arg2, var26, var24);
                    ArrayUtil.method1534(var27, arg2, var26, var25);
                }
                var12 -= var8 << 1;
            }
            const var28 = TextureOpVector.field42[var7 + arg4];
            const var29 = TextureOpVector.field42[arg4 - var7];
            const var30 = var8 + arg1;
            const var31 = arg1 - var8;
            if (var6 <= var7) {
                ArrayUtil.method1534(var31, arg2, var30, var28);
                ArrayUtil.method1534(var31, arg2, var30, var29);
            } else {
                const var32 = var10 < var7 ? TextureOpVector.field482[var7] : var10;
                const var33 = arg1 - var32;
                ArrayUtil.method1534(var31, arg2, var33, var28);
                const var34 = var32 + arg1;
                ArrayUtil.method1534(var33, arg0, var34, var28);
                ArrayUtil.method1534(var34, arg2, var30, var28);
                ArrayUtil.method1534(var31, arg2, var33, var29);
                ArrayUtil.method1534(var33, arg0, var34, var29);
                ArrayUtil.method1534(var34, arg2, var30, var29);
            }
        }
    }

    static method1333(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        const var7 = arg1 + arg3;
        const var8 = arg2 - arg3;
        const var9 = arg4 + arg3;
        for (let var10 = arg1; var10 < var7; var10++) {
            ArrayUtil.method1534(arg4, arg6, arg5, TextureOpVector.field42[var10]);
        }
        const var11 = arg5 - arg3;
        for (let var12 = arg2; var12 > var8; var12--) {
            ArrayUtil.method1534(arg4, arg6, arg5, TextureOpVector.field42[var12]);
        }
        for (let var13 = var7; var13 <= var8; var13++) {
            const var14 = TextureOpVector.field42[var13];
            ArrayUtil.method1534(arg4, arg6, var9, var14);
            ArrayUtil.method1534(var9, arg0, var11, var14);
            ArrayUtil.method1534(var11, arg6, arg5, var14);
        }
    }

    static method1532(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (TextureOpVector.field1207 <= arg0 - arg1 && TextureOpVector.field183 >= arg1 + arg0 && arg2 - arg1 >= TextureOpVector.field919 && TextureOpVector.field279 >= arg1 + arg2) {
            TextureOpVector.method745(arg2, arg3, arg1, arg0);
        } else {
            TextureOpVector.method318(arg3, arg0, arg1, arg2);
        }
    }

    static method986(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        const var7 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg2);
        const var8 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg4);
        const var9 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg3);
        const var10 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1);
        const var11 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg2 + arg5);
        const var12 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg4 - arg5);
        for (let var13 = var7; var13 < var11; var13++) {
            ArrayUtil.method1534(var9, arg6, var10, TextureOpVector.field42[var13]);
        }
        for (let var14 = var8; var14 > var12; var14--) {
            ArrayUtil.method1534(var9, arg6, var10, TextureOpVector.field42[var14]);
        }
        const var15 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg3 + arg5);
        const var16 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 - arg5);
        for (let var17 = var11; var17 <= var12; var17++) {
            const var18 = TextureOpVector.field42[var17];
            ArrayUtil.method1534(var9, arg6, var15, var18);
            ArrayUtil.method1534(var15, arg0, var16, var18);
            ArrayUtil.method1534(var16, arg6, var10, var18);
        }
    }

    static method659(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (TextureOpVector.field919 <= arg1 && arg1 <= TextureOpVector.field279) {
            const var4 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg3);
            const var5 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg0);
            TextureOpVector.method310(arg1, var5, var4, arg2);
        }
    }

    static method1420(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        const var8 = arg3 + 1;
        ArrayUtil.method1534(arg0, arg4, arg1, TextureOpVector.field42[arg3]);
        const var7 = arg2 - 1;
        ArrayUtil.method1534(arg0, arg4, arg1, TextureOpVector.field42[arg2]);
        for (let var5 = var8; var5 <= var7; var5++) {
            const var6 = TextureOpVector.field42[var5];
            var6[arg0] = var6[arg1] = arg4;
        }
    }

    static method310(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (arg2 <= arg1) {
            ArrayUtil.method1534(arg2, arg3, arg1, TextureOpVector.field42[arg0]);
        } else {
            ArrayUtil.method1534(arg1, arg3, arg2, TextureOpVector.field42[arg0]);
        }
    }

    static method318(arg0: number, arg1: number, arg2: number, arg3: number): void {
        let var4 = 0;
        let var5 = arg2;
        let var6 = -arg2;
        const var7 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 + arg2);
        let var8 = -1;
        const var9 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 - arg2);
        ArrayUtil.method1534(var9, arg0, var7, TextureOpVector.field42[arg3]);
        while (var5 > var4) {
            var8 += 2;
            var6 += var8;
            if (var6 > 0) {
                var5--;
                var6 -= var5 << 1;
                const var10 = arg3 - var5;
                const var11 = arg3 + var5;
                if (TextureOpVector.field919 <= var11 && var10 <= TextureOpVector.field279) {
                    const var12 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 + var4);
                    const var13 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 - var4);
                    if (var11 <= TextureOpVector.field279) {
                        ArrayUtil.method1534(var13, arg0, var12, TextureOpVector.field42[var11]);
                    }
                    if (var10 >= TextureOpVector.field919) {
                        ArrayUtil.method1534(var13, arg0, var12, TextureOpVector.field42[var10]);
                    }
                }
            }
            var4++;
            const var14 = var4 + arg3;
            const var15 = arg3 - var4;
            if (TextureOpVector.field919 <= var14 && TextureOpVector.field279 >= var15) {
                const var16 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 + var5);
                const var17 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 - var5);
                if (var14 <= TextureOpVector.field279) {
                    ArrayUtil.method1534(var17, arg0, var16, TextureOpVector.field42[var14]);
                }
                if (var15 >= TextureOpVector.field919) {
                    ArrayUtil.method1534(var17, arg0, var16, TextureOpVector.field42[var15]);
                }
            }
        }
    }

    static method1502(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        for (let var5 = arg3; var5 <= arg4; var5++) {
            ArrayUtil.method1534(arg0, arg1, arg2, TextureOpVector.field42[var5]);
        }
    }

    static method1028(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        if (arg3 > TextureOpVector.field279 || TextureOpVector.field919 > arg0) {
            return;
        }
        let var5;
        if (TextureOpVector.field1207 > arg2) {
            var5 = false;
            arg2 = TextureOpVector.field1207;
        } else if (TextureOpVector.field183 >= arg2) {
            var5 = true;
        } else {
            arg2 = TextureOpVector.field183;
            var5 = false;
        }
        let var6;
        if (arg4 < TextureOpVector.field1207) {
            arg4 = TextureOpVector.field1207;
            var6 = false;
        } else if (TextureOpVector.field183 >= arg4) {
            var6 = true;
        } else {
            arg4 = TextureOpVector.field183;
            var6 = false;
        }
        if (arg3 >= TextureOpVector.field919) {
            ArrayUtil.method1534(arg2, arg1, arg4, TextureOpVector.field42[arg3++]);
        } else {
            arg3 = TextureOpVector.field919;
        }
        if (arg0 <= TextureOpVector.field279) {
            ArrayUtil.method1534(arg2, arg1, arg4, TextureOpVector.field42[arg0--]);
        } else {
            arg0 = TextureOpVector.field279;
        }
        if (var5 && var6) {
            for (let var9 = arg3; var9 <= arg0; var9++) {
                const var10 = TextureOpVector.field42[var9];
                var10[arg2] = var10[arg4] = arg1;
            }
            return;
        }
        if (var5) {
            for (let var7 = arg3; var7 <= arg0; var7++) {
                TextureOpVector.field42[var7][arg2] = arg1;
            }
            return;
        }
        if (var6) {
            for (let var8 = arg3; var8 <= arg0; var8++) {
                TextureOpVector.field42[var8][arg4] = arg1;
            }
            return;
        }
    }

    static method723(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        let var5 = arg1 - arg3;
        let var6 = arg4 - arg0;
        if (var6 === 0) {
            if (var5 !== 0) {
                TextureOpVector.method753(arg2, arg3, arg0, arg1);
            }
        } else if (var5 === 0) {
            TextureOpVector.method310(arg3, arg4, arg0, arg2);
        } else {
            if (var6 < 0) {
                var6 = -var6;
            }
            if (var5 < 0) {
                var5 = -var5;
            }
            const var7 = var6 < var5;
            if (var7) {
                const var8 = arg0;
                arg0 = arg3;
                arg3 = var8;
                const var9 = arg4;
                arg4 = arg1;
                arg1 = var9;
            }
            if (arg4 < arg0) {
                const var10 = arg0;
                const var11 = arg3;
                arg3 = arg1;
                arg0 = arg4;
                arg1 = var11;
                arg4 = var10;
            }
            let var12 = arg1 - arg3;
            const var13 = arg4 - arg0;
            if (var12 < 0) {
                var12 = -var12;
            }
            let var14 = arg3;
            let var15 = -(var13 >> 1);
            const var16 = arg3 < arg1 ? 1 : -1;
            if (var7) {
                for (let var17 = arg0; var17 <= arg4; var17++) {
                    TextureOpVector.field42[var17][var14] = arg2;
                    var15 += var12;
                    if (var15 > 0) {
                        var14 += var16;
                        var15 -= var13;
                    }
                }
            } else {
                for (let var18 = arg0; var18 <= arg4; var18++) {
                    TextureOpVector.field42[var14][var18] = arg2;
                    var15 += var12;
                    if (var15 > 0) {
                        var15 -= var13;
                        var14 += var16;
                    }
                }
            }
        }
    }

    static method580(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (TextureOpVector.field1207 <= arg3 && arg3 <= TextureOpVector.field183) {
            const var4 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg2);
            const var5 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg1);
            TextureOpVector.method753(arg0, var4, arg3, var5);
        }
    }

    static method753(arg0: number, arg1: number, arg2: number, arg3: number): void {
        if (arg1 > arg3) {
            for (let var4 = arg3; var4 < arg1; var4++) {
                TextureOpVector.field42[var4][arg2] = arg0;
            }
        } else {
            for (let var5 = arg1; var5 < arg3; var5++) {
                TextureOpVector.field42[var5][arg2] = arg0;
            }
        }
    }

    static method745(arg0: number, arg1: number, arg2: number, arg3: number): void {
        ArrayUtil.method1534(arg3 - arg2, arg1, arg2 + arg3, TextureOpVector.field42[arg0]);
        let var4 = 0;
        let var5 = arg2;
        let var6 = -1;
        let var7 = -arg2;
        while (var4 < var5) {
            var6 += 2;
            var7 += var6;
            var4++;
            if (var7 >= 0) {
                var5--;
                var7 -= var5 << 1;
                const var8 = TextureOpVector.field42[var5 + arg0];
                const var9 = TextureOpVector.field42[arg0 - var5];
                const var10 = var4 + arg3;
                const var11 = arg3 - var4;
                ArrayUtil.method1534(var11, arg1, var10, var8);
                ArrayUtil.method1534(var11, arg1, var10, var9);
            }
            const var12 = arg3 + var5;
            const var13 = arg3 - var5;
            const var14 = TextureOpVector.field42[arg0 + var4];
            const var15 = TextureOpVector.field42[arg0 - var4];
            ArrayUtil.method1534(var13, arg1, var12, var14);
            ArrayUtil.method1534(var13, arg1, var12, var15);
        }
    }

    static method1438(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        let var5 = 0;
        let var6 = arg1;
        const var7 = arg4 * arg4;
        const var8 = arg1 * arg1;
        const var9 = var8 << 1;
        const var10 = var7 << 1;
        const var11 = arg1 << 1;
        let var12 = var9 + var7 * (1 - var11);
        let var13 = var8 - var10 * (var11 - 1);
        const var14 = var7 << 2;
        const var15 = var8 << 2;
        let var16 = var9 * 3;
        let var17 = var10 * ((arg1 << 1) - 3);
        let var18 = var15;
        let var19 = (arg1 - 1) * var14;
        if (TextureOpVector.field919 <= arg2 && arg2 <= TextureOpVector.field279) {
            const var20 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 + arg0);
            const var21 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg0 - arg4);
            ArrayUtil.method1534(var21, arg3, var20, TextureOpVector.field42[arg2]);
        }
        while (var6 > 0) {
            var6--;
            const var22 = arg2 - var6;
            const var23 = var6 + arg2;
            if (var12 < 0) {
                while (var12 < 0) {
                    var13 += var18;
                    var5++;
                    var18 += var15;
                    var12 += var16;
                    var16 += var15;
                }
            }
            if (var13 < 0) {
                var5++;
                var13 += var18;
                var12 += var16;
                var16 += var15;
                var18 += var15;
            }
            var13 += -var17;
            if (var23 >= TextureOpVector.field919 && TextureOpVector.field279 >= var22) {
                const var24 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg0 + var5);
                const var25 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg0 - var5);
                if (var22 >= TextureOpVector.field919) {
                    ArrayUtil.method1534(var25, arg3, var24, TextureOpVector.field42[var22]);
                }
                if (TextureOpVector.field279 >= var23) {
                    ArrayUtil.method1534(var25, arg3, var24, TextureOpVector.field42[var23]);
                }
            }
            var17 -= var14;
            var12 += -var19;
            var19 -= var14;
        }
    }

    static method739(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void {
        if (
            arg2 >= TextureOpVector.field1207 &&
            TextureOpVector.field183 >= arg2 &&
            TextureOpVector.field1207 <= arg3 &&
            TextureOpVector.field183 >= arg3 &&
            arg8 >= TextureOpVector.field1207 &&
            TextureOpVector.field183 >= arg8 &&
            arg5 >= TextureOpVector.field1207 &&
            arg5 <= TextureOpVector.field183 &&
            arg1 >= TextureOpVector.field919 &&
            arg1 <= TextureOpVector.field279 &&
            arg0 >= TextureOpVector.field919 &&
            TextureOpVector.field279 >= arg0 &&
            TextureOpVector.field919 <= arg4 &&
            arg4 <= TextureOpVector.field279 &&
            TextureOpVector.field919 <= arg6 &&
            arg6 <= TextureOpVector.field279
        ) {
            TextureOpVector.method1042(arg3, arg7, arg5, arg0, arg1, arg6, arg4, arg2, arg8);
        } else {
            TextureOpVector.method982(arg2, arg3, arg5, arg7, arg6, arg0, arg1, arg4, arg8);
        }
    }

    static method226(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        const var5 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg1);
        const var6 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg2);
        const var7 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg3);
        const var8 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4);
        for (let var9 = var5; var9 <= var6; var9++) {
            ArrayUtil.method1534(var7, arg0, var8, TextureOpVector.field42[var9]);
        }
    }

    static method786(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        const var6 = arg2 + arg4;
        const var7 = arg3 - arg2;
        const var8 = arg2 + arg5;
        const var9 = arg0 - arg2;
        for (let var10 = arg4; var10 < var6; var10++) {
            ArrayUtil.method1534(arg5, arg1, arg0, TextureOpVector.field42[var10]);
        }
        for (let var11 = arg3; var11 > var7; var11--) {
            ArrayUtil.method1534(arg5, arg1, arg0, TextureOpVector.field42[var11]);
        }
        for (let var12 = var6; var12 <= var7; var12++) {
            const var13 = TextureOpVector.field42[var12];
            ArrayUtil.method1534(arg5, arg1, var8, var13);
            ArrayUtil.method1534(var9, arg1, arg0, var13);
        }
    }

    static method101(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        const var6 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg3);
        const var7 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg0);
        const var8 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg2);
        const var9 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4);
        const var10 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg3 + arg1);
        const var11 = IntMath.method1058(TextureOpVector.field919, TextureOpVector.field279, arg0 - arg1);
        for (let var12 = var6; var12 < var10; var12++) {
            ArrayUtil.method1534(var8, arg5, var9, TextureOpVector.field42[var12]);
        }
        for (let var13 = var7; var13 > var11; var13--) {
            ArrayUtil.method1534(var8, arg5, var9, TextureOpVector.field42[var13]);
        }
        const var14 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg1 + arg2);
        const var15 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg4 - arg1);
        for (let var16 = var10; var16 <= var11; var16++) {
            const var17 = TextureOpVector.field42[var16];
            ArrayUtil.method1534(var8, arg5, var14, var17);
            ArrayUtil.method1534(var15, arg5, var9, var17);
        }
    }

    static method126(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        let var7 = arg2;
        let var8 = 0;
        const var9 = arg6 - arg1;
        let var10 = 0;
        const var11 = arg6 * arg6;
        const var12 = arg2 * arg2;
        const var13 = var9 * var9;
        const var14 = arg2 - arg1;
        const var15 = var14 * var14;
        const var16 = var11 << 1;
        const var17 = var12 << 1;
        const var18 = var15 << 1;
        const var19 = var13 << 1;
        const var20 = arg2 << 1;
        const var21 = var14 << 1;
        let var22 = var12 - var16 * (var20 - 1);
        let var23 = var17 + var11 * (1 - var20);
        const var24 = var12 << 2;
        const var25 = var11 << 2;
        let var26 = var18 + (1 - var21) * var13;
        const var27 = var15 << 2;
        let var28 = (var20 - 3) * var16;
        const var29 = var13 << 2;
        let var30 = var15 - (var21 - 1) * var19;
        let var31 = var17 * 3;
        let var32 = var18 * 3;
        let var33 = (arg2 - 1) * var25;
        let var34 = (var21 - 3) * var19;
        let var35 = (var14 - 1) * var29;
        const var36 = TextureOpVector.field42[arg5];
        let var37 = var24;
        let var38 = var27;
        ArrayUtil.method1534(arg0 - arg6, arg4, arg0 - var9, var36);
        ArrayUtil.method1534(arg0 - var9, arg3, var9 + arg0, var36);
        ArrayUtil.method1534(var9 + arg0, arg4, arg0 + arg6, var36);
        while (var7 > 0) {
            if (var23 < 0) {
                while (var23 < 0) {
                    var23 += var31;
                    var31 += var24;
                    var10++;
                    var22 += var37;
                    var37 += var24;
                }
            }
            const var39 = var7 <= var14;
            if (var39) {
                if (var26 < 0) {
                    while (var26 < 0) {
                        var8++;
                        var30 += var38;
                        var38 += var27;
                        var26 += var32;
                        var32 += var27;
                    }
                }
                if (var30 < 0) {
                    var8++;
                    var26 += var32;
                    var32 += var27;
                    var30 += var38;
                    var38 += var27;
                }
                var26 += -var35;
                var30 += -var34;
                var34 -= var29;
                var35 -= var29;
            }
            if (var22 < 0) {
                var23 += var31;
                var31 += var24;
                var10++;
                var22 += var37;
                var37 += var24;
            }
            var23 += -var33;
            var33 -= var25;
            var22 += -var28;
            var7--;
            const var40 = var10 + arg0;
            const var41 = arg5 - var7;
            var28 -= var25;
            const var42 = var7 + arg5;
            const var43 = arg0 - var10;
            if (var39) {
                const var44 = arg0 + var8;
                const var45 = arg0 - var8;
                ArrayUtil.method1534(var43, arg4, var45, TextureOpVector.field42[var41]);
                ArrayUtil.method1534(var45, arg3, var44, TextureOpVector.field42[var41]);
                ArrayUtil.method1534(var44, arg4, var40, TextureOpVector.field42[var41]);
                ArrayUtil.method1534(var43, arg4, var45, TextureOpVector.field42[var42]);
                ArrayUtil.method1534(var45, arg3, var44, TextureOpVector.field42[var42]);
                ArrayUtil.method1534(var44, arg4, var40, TextureOpVector.field42[var42]);
            } else {
                ArrayUtil.method1534(var43, arg4, var40, TextureOpVector.field42[var41]);
                ArrayUtil.method1534(var43, arg4, var40, TextureOpVector.field42[var42]);
            }
        }
    }

    static method1051(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number): void {
        let var7 = 0;
        let var8 = arg5;
        let var9 = 0;
        const var10 = arg2 - arg4;
        const var11 = arg5 - arg4;
        const var12 = arg2 * arg2;
        const var13 = arg5 * arg5;
        const var14 = var11 * var11;
        const var15 = var13 << 1;
        const var16 = var10 * var10;
        const var17 = var12 << 1;
        const var18 = var16 << 1;
        const var19 = var14 << 1;
        const var20 = var11 << 1;
        let var21 = var19 + var16 * (1 - var20);
        const var22 = arg5 << 1;
        let var23 = var13 - (var22 - 1) * var17;
        let var24 = (1 - var22) * var12 + var15;
        let var25 = var14 - var18 * (var20 - 1);
        const var26 = var13 << 2;
        const var27 = var12 << 2;
        let var28 = var15 * 3;
        const var29 = var14 << 2;
        const var30 = var16 << 2;
        let var31 = var19 * 3;
        let var32 = var18 * (var20 - 3);
        let var33 = var26;
        let var34 = (var22 - 3) * var17;
        let var35 = var29;
        if (TextureOpVector.field919 <= arg0 && TextureOpVector.field279 >= arg0) {
            const var36 = TextureOpVector.field42[arg0];
            const var37 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 - arg2);
            const var38 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 + arg2);
            const var39 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 - var10);
            const var40 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 + var10);
            ArrayUtil.method1534(var37, arg1, var39, var36);
            ArrayUtil.method1534(var39, arg3, var40, var36);
            ArrayUtil.method1534(var40, arg1, var38, var36);
        }
        let var41 = (var11 - 1) * var30;
        let var42 = (arg5 - 1) * var27;
        while (var8 > 0) {
            if (var24 < 0) {
                while (var24 < 0) {
                    var24 += var28;
                    var28 += var26;
                    var7++;
                    var23 += var33;
                    var33 += var26;
                }
            }
            const var43 = var11 >= var8;
            var8--;
            const var44 = var8 + arg0;
            const var45 = arg0 - var8;
            if (var43) {
                if (var21 < 0) {
                    while (var21 < 0) {
                        var25 += var35;
                        var21 += var31;
                        var31 += var29;
                        var9++;
                        var35 += var29;
                    }
                }
                if (var25 < 0) {
                    var25 += var35;
                    var9++;
                    var21 += var31;
                    var31 += var29;
                    var35 += var29;
                }
                var25 += -var32;
                var21 += -var41;
                var32 -= var30;
                var41 -= var30;
            }
            if (var23 < 0) {
                var23 += var33;
                var33 += var26;
                var24 += var28;
                var28 += var26;
                var7++;
            }
            var23 += -var34;
            var24 += -var42;
            var42 -= var27;
            var34 -= var27;
            if (var44 >= TextureOpVector.field919 && TextureOpVector.field279 >= var45) {
                const var46 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 + var7);
                const var47 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 - var7);
                if (var43) {
                    const var48 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 + var9);
                    const var49 = IntMath.method1058(TextureOpVector.field1207, TextureOpVector.field183, arg6 - var9);
                    if (var45 >= TextureOpVector.field919) {
                        const var50 = TextureOpVector.field42[var45];
                        ArrayUtil.method1534(var47, arg1, var49, var50);
                        ArrayUtil.method1534(var49, arg3, var48, var50);
                        ArrayUtil.method1534(var48, arg1, var46, var50);
                    }
                    if (TextureOpVector.field279 >= var44) {
                        const var51 = TextureOpVector.field42[var44];
                        ArrayUtil.method1534(var47, arg1, var49, var51);
                        ArrayUtil.method1534(var49, arg3, var48, var51);
                        ArrayUtil.method1534(var48, arg1, var46, var51);
                    }
                } else {
                    if (var45 >= TextureOpVector.field919) {
                        ArrayUtil.method1534(var47, arg1, var46, TextureOpVector.field42[var45]);
                    }
                    if (TextureOpVector.field279 >= var44) {
                        ArrayUtil.method1534(var47, arg1, var46, TextureOpVector.field42[var44]);
                    }
                }
            }
        }
    }

    static method1042(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void {
        if (arg0 === arg7 && arg4 === arg3 && arg8 === arg2 && arg6 === arg5) {
            TextureOpVector.method723(arg7, arg5, arg1, arg4, arg2);
            return;
        }
        let var9 = arg7;
        let var10 = arg4;
        const var11 = arg7 * 3;
        const var12 = arg4 * 3;
        const var13 = arg6 * 3;
        const var14 = arg3 * 3;
        const var15 = arg8 * 3;
        const var16 = arg0 * 3;
        const var17 = arg5 + var14 - arg4 - var13;
        const var18 = arg2 + var16 - arg7 - var15;
        const var19 = var15 + var11 - var16 - var16;
        const var20 = var12 + var13 - var14 - var14;
        const var21 = var16 - var11;
        const var22 = var14 - var12;
        for (let var23 = 128; var23 <= 4096; var23 += 128) {
            const var24 = (var23 * var23) >> 12;
            const var25 = (var24 * var23) >> 12;
            const var26 = var18 * var25;
            const var27 = var24 * var19;
            const var28 = var23 * var21;
            const var29 = var24 * var20;
            const var30 = var17 * var25;
            const var31 = var22 * var23;
            const var32 = arg7 + ((var26 + var27 + var28) >> 12);
            const var33 = arg4 + ((var31 + var30 + var29) >> 12);
            TextureOpVector.method723(var9, var33, arg1, var10, var32);
            var10 = var33;
            var9 = var32;
        }
    }

    static method1529(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number): void {
        const var5 = arg2 - arg0;
        const var6 = arg1 - arg3;
        if (var5 === 0) {
            if (var6 !== 0) {
                TextureOpVector.method580(arg4, arg1, arg3, arg0);
            }
        } else if (var6 === 0) {
            TextureOpVector.method659(arg2, arg3, arg4, arg0);
        } else {
            const var7 = ((var6 << 12) / var5) | 0;
            const var8 = (arg3 - (Math.imul(var7, arg0) >> 12)) | 0;
            let var9;
            let var10;
            if (TextureOpVector.field1207 > arg2) {
                var9 = TextureOpVector.field1207;
                var10 = ((Math.imul(TextureOpVector.field1207, var7) >> 12) + var8) | 0;
            } else if (arg2 > TextureOpVector.field183) {
                var9 = TextureOpVector.field183;
                var10 = (var8 + (Math.imul(TextureOpVector.field183, var7) >> 12)) | 0;
            } else {
                var9 = arg2;
                var10 = arg1;
            }
            if (TextureOpVector.field919 > var10) {
                var10 = TextureOpVector.field919;
                if (var7 === 0) {
                    throw new Error();
                }
                var9 = (((TextureOpVector.field919 - var8) << 12) / var7) | 0;
            } else if (var10 > TextureOpVector.field279) {
                var10 = TextureOpVector.field279;
                if (var7 === 0) {
                    throw new Error();
                }
                var9 = (((TextureOpVector.field279 - var8) << 12) / var7) | 0;
            }
            let var11;
            let var12;
            if (TextureOpVector.field1207 > arg0) {
                var11 = TextureOpVector.field1207;
                var12 = ((Math.imul(TextureOpVector.field1207, var7) >> 12) + var8) | 0;
            } else if (TextureOpVector.field183 < arg0) {
                var11 = TextureOpVector.field183;
                var12 = ((Math.imul(var7, TextureOpVector.field183) >> 12) + var8) | 0;
            } else {
                var11 = arg0;
                var12 = arg3;
            }
            if (var12 < TextureOpVector.field919) {
                var12 = TextureOpVector.field919;
                if (var7 === 0) {
                    throw new Error();
                }
                var11 = (((TextureOpVector.field919 - var8) << 12) / var7) | 0;
            } else if (TextureOpVector.field279 < var12) {
                var12 = TextureOpVector.field279;
                if (var7 === 0) {
                    throw new Error();
                }
                var11 = (((TextureOpVector.field279 - var8) << 12) / var7) | 0;
            }
            TextureOpVector.method723(var11, var10, arg4, var12, var9);
        }
    }

    static method982(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number): void {
        if (arg1 === arg0 && arg6 === arg5 && arg2 === arg8 && arg7 === arg4) {
            TextureOpVector.method1529(arg0, arg4, arg2, arg6, arg3);
            return;
        }
        let var9 = arg0;
        let var10 = arg6;
        const var11 = arg0 * 3;
        const var12 = arg6 * 3;
        const var13 = arg1 * 3;
        const var14 = arg5 * 3;
        const var15 = arg8 * 3;
        const var16 = arg7 * 3;
        const var17 = arg2 + var13 - var15 - arg0;
        const var18 = var15 + var11 - var13 - var13;
        const var19 = arg4 + var14 - arg6 - var16;
        const var20 = var16 + var12 - var14 - var14;
        const var21 = var13 - var11;
        const var22 = var14 - var12;
        for (let var23 = 128; var23 <= 4096; var23 += 128) {
            const var24 = (var23 * var23) >> 12;
            const var25 = var21 * var23;
            const var26 = (var23 * var24) >> 12;
            const var27 = var23 * var22;
            const var28 = var26 * var17;
            const var29 = var18 * var24;
            const var30 = var26 * var19;
            const var31 = ((var25 + var28 + var29) >> 12) + arg0;
            const var32 = var24 * var20;
            const var33 = ((var27 + var30 + var32) >> 12) + arg6;
            TextureOpVector.method1529(var9, var33, var31, var10, arg3);
            var10 = var33;
            var9 = var31;
        }
    }

    static method216(arg0: number, arg1: number, arg2: number, arg3: number, arg4: number, arg5: number): void {
        if (TextureOpVector.field1207 <= arg5 - arg0 && TextureOpVector.field183 >= arg5 + arg0 && TextureOpVector.field919 <= arg3 - arg0 && TextureOpVector.field279 >= arg0 + arg3) {
            TextureOpVector.method46(arg1, arg5, arg2, arg0, arg3, arg4);
        } else {
            TextureOpVector.method827(arg1, arg3, arg2, arg0, arg5, arg4);
        }
    }

    override decode(arg0: Packet, arg1: number): void {
        if (arg1 === 0) {
            this.drawCommands = new Array(arg0.g1());
            for (let var3 = 0; var3 < this.drawCommands.length; var3++) {
                const var4 = arg0.g1();
                if (var4 === 0) {
                    this.drawCommands[var3] = TextureOpSubShape0.method538(arg0);
                } else if (var4 === 1) {
                    this.drawCommands[var3] = TextureOpSubShape1.method936(arg0);
                } else if (var4 === 2) {
                    this.drawCommands[var3] = TextureOpSubShape2.method62(arg0);
                } else if (var4 === 3) {
                    this.drawCommands[var3] = TextureOpSubShape3.method577(arg0);
                }
            }
        } else if (arg1 === 1) {
            this.monochrome = arg0.g1() === 1;
        }
    }

    override renderMono(arg0: number): Int32Array {
        const var2 = this.monoCache.getFrame(arg0);
        if (this.monoCache.field3098) {
            this.rasterize(this.monoCache.getAllFrames());
        }
        return var2;
    }

    override renderColour(arg0: number): [Int32Array, Int32Array, Int32Array] {
        const var2 = this.colourCache.getFrame(arg0);
        if (this.colourCache.field4310) {
            const var3 = Texture.width;
            const var4 = Texture.height;
            const var5 = this.colourCache.getAllFrames();
            const var6 = Array.from({ length: var4 }, () => new Int32Array(var3));
            this.rasterize(var6);
            for (let var7 = 0; var7 < Texture.height; var7++) {
                const var8 = var6[var7];
                const var9 = var5[var7];
                const var10 = var9[1];
                const var11 = var9[2];
                const var12 = var9[0];
                for (let var13 = 0; var13 < Texture.width; var13++) {
                    const var14 = var8[var13];
                    var11[var13] = (var14 & 0xff) << 4;
                    var10[var13] = (var14 >> 4) & 0xff0;
                    var12[var13] = (var14 >> 12) & 0xff0;
                }
            }
        }
        return var2;
    }

    rasterize(arg0: Int32Array[]): void {
        const var2 = Texture.width;
        const var3 = Texture.height;
        TextureOpVector.method114(arg0);
        TextureOpVector.method1575(Texture.heightMask, Texture.widthMask);
        if (this.drawCommands == null) {
            return;
        }
        for (let var4 = 0; var4 < this.drawCommands.length; var4++) {
            const var5 = this.drawCommands[var4];
            const var6 = var5.field925;
            const var7 = var5.field927;
            if (var6 < 0) {
                if (var7 >= 0) {
                    var5.method377(var2, var3);
                }
            } else if (var7 < 0) {
                var5.method373(var3, var2);
            } else {
                var5.method371(var2, var3);
            }
        }
    }
}
