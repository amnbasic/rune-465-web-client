// jag::game::Huffman
export default class Huffman {
    readonly masks: Int32Array;
    readonly bits: Uint8Array;
    keys: Int32Array;

    // todo: rename local variables
    constructor(src: Uint8Array) {
        const var2 = src.length;
        this.keys = new Int32Array(8);
        this.masks = new Int32Array(var2);
        this.bits = src;
        const var3 = new Int32Array(33);
        let var4 = 0;
        for (let var5 = 0; var5 < var2; var5++) {
            const var6 = src[var5];
            if (var6 !== 0) {
                const var7 = 0x1 << (32 - var6);
                const var8 = var3[var6];
                this.masks[var5] = var8;
                let var9: number;
                if ((var8 & var7) === 0) {
                    var9 = var8 | var7;
                    for (let var10 = var6 - 1; var10 >= 1; var10--) {
                        const var11 = var3[var10];
                        if (var8 !== var11) {
                            break;
                        }
                        const var12 = 0x1 << (32 - var10);
                        if ((var11 & var12) !== 0) {
                            var3[var10] = var3[var10 - 1];
                            break;
                        }
                        var3[var10] = var12 | var11;
                    }
                } else {
                    var9 = var3[var6 - 1];
                }
                var3[var6] = var9;
                for (let var13 = var6 + 1; var13 <= 32; var13++) {
                    if (var3[var13] === var8) {
                        var3[var13] = var9;
                    }
                }
                let var14 = 0;
                for (let var15 = 0; var15 < var6; var15++) {
                    const var16 = -2147483648 >>> var15;
                    if ((var16 & var8) === 0) {
                        var14++;
                    } else {
                        if (this.keys[var14] === 0) {
                            this.keys[var14] = var4;
                        }
                        var14 = this.keys[var14];
                    }
                    if (this.keys.length <= var14) {
                        const var17 = new Int32Array(this.keys.length * 2);
                        for (let var18 = 0; var18 < this.keys.length; var18++) {
                            var17[var18] = this.keys[var18];
                        }
                        this.keys = var17;
                    }
                }
                if (var4 <= var14) {
                    var4 = var14 + 1;
                }
                this.keys[var14] = ~var5;
            }
        }
    }

    // jag::game::Huffman::Encode
    encode(arg0: Uint8Array, arg1: number, arg2: number, arg3: number, arg4: Uint8Array | Int8Array): number {
        let var6 = 0;
        const var7 = arg2;
        let var8 = arg1 << 3;
        while (arg3 < var7) {
            const var9 = arg0[arg3] & 0xff;
            const var10 = this.bits[var9];
            const var11 = this.masks[var9];
            if (var10 === 0) {
                throw new Error('No codeword for data value ' + var9);
            }
            let var12 = var8 >> 3;
            let var13 = var8 & 0x7;
            var8 += var10;
            const var14 = var12 + ((var13 + var10 - 1) >> 3);
            const var15 = var6 & (-var13 >> 31);
            const var16 = var13 + 24;
            arg4[var12] = var6 = var15 | (var11 >>> var16);
            if (var14 > var12) {
                var12++;
                var13 = var16 - 8;
                arg4[var12] = var6 = var11 >>> var13;
                if (var14 > var12) {
                    var13 -= 8;
                    var12++;
                    arg4[var12] = var6 = var11 >>> var13;
                    if (var14 > var12) {
                        var12++;
                        var13 -= 8;
                        arg4[var12] = var6 = var11 >>> var13;
                        if (var12 < var14) {
                            var13 -= 8;
                            var12++;
                            arg4[var12] = var6 = var11 << -var13;
                        }
                    }
                }
            }
            arg3++;
        }
        return ((var8 + 7) >> 3) - arg1;
    }

    // jag::game::Huffman::Decode
    decode(arg0: number, arg1: Uint8Array | Int8Array, arg2: Uint8Array | Int8Array, arg3: number, arg4: number): number {
        if (arg3 === 0) {
            return 0;
        }
        let var6 = 0;
        const var7 = arg3;
        let var8 = arg4;
        while (true) {
            const var9 = (arg2[var8] << 24) >> 24;
            if (var9 >= 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var10: number;
            if ((var10 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var10;
                if (var7 <= arg0) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x40) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var11: number;
            if ((var11 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var11;
                if (var7 <= arg0) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x20) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var12: number;
            if ((var12 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var12;
                if (var7 <= arg0) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x10) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var13: number;
            if ((var13 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var13;
                if (arg0 >= var7) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x8) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var14: number;
            if ((var14 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var14;
                if (arg0 >= var7) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x4) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var15: number;
            if ((var15 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var15;
                if (arg0 >= var7) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x2) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var16: number;
            if ((var16 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var16;
                if (arg0 >= var7) {
                    break;
                }
                var6 = 0;
            }
            if ((var9 & 0x1) === 0) {
                var6++;
            } else {
                var6 = this.keys[var6];
            }
            let var17: number;
            if ((var17 = this.keys[var6]) < 0) {
                arg1[arg0++] = ~var17;
                if (var7 <= arg0) {
                    break;
                }
                var6 = 0;
            }
            var8++;
        }
        return var8 + 1 - arg4;
    }
}
