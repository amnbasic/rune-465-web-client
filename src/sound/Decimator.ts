import MathTool from '#/util/MathTool.js';

// jag::oldscape::sound::Decimator
export default class Decimator {
    inputRate = 0;
    outputRate = 0;
    resampleTable: Int32Array[] | null = null;

    constructor(arg0: number, arg1: number) {
        if (arg1 !== 22050) {
            const var3 = MathTool.hcf(arg1, 22050);
            const var4 = (22050 / var3) | 0;
            this.inputRate = var4;
            const var5 = (arg1 / var3) | 0;
            this.resampleTable = Array.from({ length: var4 }, () => new Int32Array(14));
            this.outputRate = var5;
            for (let var6 = 0; var6 < var4; var6++) {
                const var7 = this.resampleTable[var6];
                const var8 = var6 / var4 + 6.0;
                let var10 = Math.floor(var8 + 1.0 - 7.0);
                let var11 = Math.ceil(var8 + 7.0);
                if (var11 > 14) {
                    var11 = 14;
                }
                if (var10 < 0) {
                    var10 = 0;
                }
                const var12 = var5 / var4;
                while (var10 < var11) {
                    let var14 = var12;
                    const var16 = (var10 - var8) * 3.141592653589793;
                    if (var16 < -1.0e-4 || var16 > 1.0e-4) {
                        var14 = var12 * (Math.sin(var16) / var16);
                    }
                    const var18 = var14 * (Math.cos((var10 - var8) * 0.2243994752564138) * 0.46 + 0.54);
                    var7[var10] = Math.floor(var18 * 65536.0 + 0.5);
                    var10++;
                }
            }
        }
    }

    decimate(arg0: Int8Array): Int8Array {
        if (this.resampleTable !== null) {
            const var2 = (Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(this.outputRate) * BigInt(arg0.length)) / BigInt(this.inputRate))) + 14) | 0;
            const var3 = new Int32Array(var2);
            let var4 = 0;
            let var5 = 0;
            for (let var6 = 0; var6 < arg0.length; var6++) {
                const var7 = arg0[var6];
                const var8 = this.resampleTable[var5];
                for (let var9 = 0; var9 < 14; var9++) {
                    var3[var4 + var9] += var8[var9] * var7;
                }
                const var10 = var5 + this.outputRate;
                const var11 = (var10 / this.inputRate) | 0;
                var5 = var10 - var11 * this.inputRate;
                var4 += var11;
            }
            arg0 = new Int8Array(var2);
            for (let var12 = 0; var12 < var2; var12++) {
                const var13 = (var3[var12] + 32768) >> 16;
                if (var13 < -128) {
                    arg0[var12] = -128;
                } else if (var13 <= 127) {
                    arg0[var12] = var13;
                } else {
                    arg0[var12] = 127;
                }
            }
        }
        return arg0;
    }

    // jag::oldscape::sound::Decimator::TransmitFreq
    transmitFreq(arg0: number): number {
        if (this.resampleTable !== null) {
            arg0 = Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(this.outputRate) * BigInt(arg0)) / BigInt(this.inputRate)));
        }
        return arg0;
    }

    // jag::oldscape::sound::Decimator::TransmitPos
    transmitPos(arg0: number): number {
        if (this.resampleTable !== null) {
            arg0 = (Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(this.outputRate) * BigInt(arg0)) / BigInt(this.inputRate))) + 6) | 0;
        }
        return arg0;
    }
}
