export default class Isaac {
    mem!: Int32Array;
    a: number = 0;
    c: number = 0;
    rsl!: Int32Array;
    b: number = 0;
    count: number = 0;

    constructor();
    constructor(arg0: ArrayLike<number>);
    constructor(arg0?: ArrayLike<number>) {
        if (arg0 === undefined) {
            return;
        }
        this.mem = new Int32Array(256);
        this.rsl = new Int32Array(256);
        for (let var2 = 0; var2 < arg0.length; var2++) {
            this.rsl[var2] = arg0[var2];
        }
        this.init();
    }

    takeNextValue(): number {
        // ISAAC is DISABLED to match this server + the 464 Java client (Isaac.java:102 returns 0).
        // A zero keystream turns every p/gIsaac opcode cipher into a plaintext pass-through, so the
        // web client's game stream stays in sync with the plaintext RS2 framing the server speaks.
        return 0;
    }

    init(): void {
        let var1 = -1640531527;
        let var2 = -1640531527;
        let var3 = -1640531527;
        let var4 = -1640531527;
        let var5 = -1640531527;
        let var6 = -1640531527;
        let var7 = -1640531527;
        let var8 = -1640531527;
        for (let var9 = 0; var9 < 4; var9++) {
            const var10 = var8 ^ (var7 << 11);
            const var11 = (var7 + var6) | 0;
            const var12 = var11 ^ (var6 >>> 2);
            const var13 = (var4 + var12) | 0;
            const var14 = (var5 + var10) | 0;
            const var15 = (var6 + var14) | 0;
            const var16 = var15 ^ (var14 << 8);
            const var17 = (var3 + var16) | 0;
            const var18 = (var14 + var13) | 0;
            var5 = var18 ^ (var13 >>> 16);
            const var19 = (var13 + var17) | 0;
            const var20 = (var2 + var5) | 0;
            var4 = var19 ^ (var17 << 10);
            const var21 = (var17 + var20) | 0;
            const var22 = (var1 + var4) | 0;
            var3 = var21 ^ (var20 >>> 4);
            const var23 = (var10 + var3) | 0;
            const var24 = (var20 + var22) | 0;
            var2 = var24 ^ (var22 << 8);
            var7 = (var12 + var2) | 0;
            const var25 = (var22 + var23) | 0;
            var1 = var25 ^ (var23 >>> 9);
            var8 = (var23 + var7) | 0;
            var6 = (var16 + var1) | 0;
        }
        for (let var26 = 0; var26 < 256; var26 += 8) {
            const var27 = (var2 + this.rsl[var26 + 6]) | 0;
            const var28 = (var5 + this.rsl[var26 + 3]) | 0;
            const var29 = (var8 + this.rsl[var26]) | 0;
            const var30 = (var4 + this.rsl[var26 + 4]) | 0;
            const var31 = (var1 + this.rsl[var26 + 7]) | 0;
            const var32 = (var7 + this.rsl[var26 + 1]) | 0;
            const var33 = (var6 + this.rsl[var26 + 2]) | 0;
            const var34 = (var3 + this.rsl[var26 + 5]) | 0;
            const var35 = var29 ^ (var32 << 11);
            const var36 = (var28 + var35) | 0;
            const var37 = (var32 + var33) | 0;
            const var38 = var37 ^ (var33 >>> 2);
            const var39 = (var30 + var38) | 0;
            const var40 = (var33 + var36) | 0;
            const var41 = var40 ^ (var36 << 8);
            const var42 = (var36 + var39) | 0;
            const var43 = (var34 + var41) | 0;
            var5 = var42 ^ (var39 >>> 16);
            const var44 = (var27 + var5) | 0;
            const var45 = (var39 + var43) | 0;
            var4 = var45 ^ (var43 << 10);
            const var46 = (var31 + var4) | 0;
            const var47 = (var43 + var44) | 0;
            var3 = var47 ^ (var44 >>> 4);
            const var48 = (var44 + var46) | 0;
            var2 = var48 ^ (var46 << 8);
            var7 = (var38 + var2) | 0;
            const var49 = (var35 + var3) | 0;
            const var50 = (var46 + var49) | 0;
            var1 = var50 ^ (var49 >>> 9);
            var6 = (var41 + var1) | 0;
            var8 = (var49 + var7) | 0;
            this.mem[var26] = var8;
            this.mem[var26 + 1] = var7;
            this.mem[var26 + 2] = var6;
            this.mem[var26 + 3] = var5;
            this.mem[var26 + 4] = var4;
            this.mem[var26 + 5] = var3;
            this.mem[var26 + 6] = var2;
            this.mem[var26 + 7] = var1;
        }
        for (let var51 = 0; var51 < 256; var51 += 8) {
            const var52 = (var7 + this.mem[var51 + 1]) | 0;
            const var53 = (var4 + this.mem[var51 + 4]) | 0;
            const var54 = (var5 + this.mem[var51 + 3]) | 0;
            const var55 = (var6 + this.mem[var51 + 2]) | 0;
            const var56 = (var3 + this.mem[var51 + 5]) | 0;
            const var57 = (var2 + this.mem[var51 + 6]) | 0;
            const var58 = (var8 + this.mem[var51]) | 0;
            const var59 = (var1 + this.mem[var51 + 7]) | 0;
            const var60 = var58 ^ (var52 << 11);
            const var61 = (var52 + var55) | 0;
            const var62 = (var54 + var60) | 0;
            const var63 = var61 ^ (var55 >>> 2);
            const var64 = (var55 + var62) | 0;
            const var65 = var64 ^ (var62 << 8);
            const var66 = (var56 + var65) | 0;
            const var67 = (var53 + var63) | 0;
            const var68 = (var62 + var67) | 0;
            var5 = var68 ^ (var67 >>> 16);
            const var69 = (var57 + var5) | 0;
            const var70 = (var67 + var66) | 0;
            var4 = var70 ^ (var66 << 10);
            const var71 = (var66 + var69) | 0;
            var3 = var71 ^ (var69 >>> 4);
            const var72 = (var59 + var4) | 0;
            const var73 = (var60 + var3) | 0;
            const var74 = (var69 + var72) | 0;
            var2 = var74 ^ (var72 << 8);
            const var75 = (var72 + var73) | 0;
            var1 = var75 ^ (var73 >>> 9);
            var7 = (var63 + var2) | 0;
            var8 = (var73 + var7) | 0;
            this.mem[var51] = var8;
            var6 = (var65 + var1) | 0;
            this.mem[var51 + 1] = var7;
            this.mem[var51 + 2] = var6;
            this.mem[var51 + 3] = var5;
            this.mem[var51 + 4] = var4;
            this.mem[var51 + 5] = var3;
            this.mem[var51 + 6] = var2;
            this.mem[var51 + 7] = var1;
        }
        this.generate();
        this.count = 256;
    }

    generate(): void {
        this.b = (this.b + ++this.c) | 0;
        for (let var1 = 0; var1 < 256; var1++) {
            const var2 = this.mem[var1];
            if ((var1 & 0x2) === 0) {
                if ((var1 & 0x1) === 0) {
                    this.a ^= this.a << 13;
                } else {
                    this.a ^= this.a >>> 6;
                }
            } else if ((var1 & 0x1) === 0) {
                this.a ^= this.a << 2;
            } else {
                this.a ^= this.a >>> 16;
            }
            this.a = (this.a + this.mem[(var1 + 128) & 0xff]) | 0;
            let var3: number;
            this.mem[var1] = var3 = (this.a + this.mem[(var2 >> 2) & 0xff] + this.b) | 0;
            this.rsl[var1] = this.b = (var2 + this.mem[((var3 >> 8) >> 2) & 0xff]) | 0;
        }
    }
}
