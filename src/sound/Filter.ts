import Packet from '#/io/Packet.js';

import Envelope from '#/sound/Envelope.js';

// jag::oldscape::sound::Filter
export default class Filter {
    pairs: Int32Array = new Int32Array(2);
    frequencies: Int32Array[][] = [
        [new Int32Array(4), new Int32Array(4)],
        [new Int32Array(4), new Int32Array(4)]
    ];
    ranges: Int32Array[][] = [
        [new Int32Array(4), new Int32Array(4)],
        [new Int32Array(4), new Int32Array(4)]
    ];
    unities: Int32Array = new Int32Array(2);

    // jag::oldscape::sound::Filter::m_coeff
    static coeff: Float32Array[] = [new Float32Array(8), new Float32Array(8)];

    // jag::oldscape::sound::Filter::m_coeffInt
    static coeffInt: Int32Array[] = [new Int32Array(8), new Int32Array(8)];

    // jag::oldscape::sound::Filter::m_reduceCoeff
    static reduceCoeff: number = 0.0;

    // jag::oldscape::sound::Filter::m_reduceCoeffInt
    static reduceCoeffInt: number = 0;

    // jag::oldscape::sound::Filter::Radius
    radius(arg0: number, arg1: number, arg2: number): number {
        const var4 = this.ranges[arg0][0][arg1] + arg2 * (this.ranges[arg0][1][arg1] - this.ranges[arg0][0][arg1]);
        const var5 = var4 * 0.0015258789;
        return 1.0 - Math.pow(10.0, -var5 / 20.0);
    }

    // jag::oldscape::sound::Filter::Frequency
    static frequency(arg0: number): number {
        const var1 = Math.pow(2.0, arg0) * 32.703197;
        return (var1 * 3.1415927) / 11025.0;
    }

    // jag::oldscape::sound::Filter::Frequency
    frequency(arg0: number, arg1: number, arg2: number): number {
        const var4 = this.frequencies[arg0][0][arg1] + arg2 * (this.frequencies[arg0][1][arg1] - this.frequencies[arg0][0][arg1]);
        const var5 = var4 * 1.2207031e-4;
        return Filter.frequency(var5);
    }

    // jag::oldscape::sound::Filter::CalculateCoeffs
    calculateCoeffs(arg0: number, arg1: number): number {
        if (arg0 === 0) {
            const var3 = this.unities[0] + (this.unities[1] - this.unities[0]) * arg1;
            const var4 = var3 * 0.0030517578;
            Filter.reduceCoeff = Math.pow(0.1, var4 / 20.0);
            Filter.reduceCoeffInt = (Filter.reduceCoeff * 65536.0) | 0;
        }

        if (this.pairs[arg0] === 0) {
            return 0;
        }

        const var5 = this.radius(arg0, 0, arg1);
        Filter.coeff[arg0][0] = -2.0 * var5 * Math.cos(this.frequency(arg0, 0, arg1));
        Filter.coeff[arg0][1] = var5 * var5;

        for (let var6 = 1; var6 < this.pairs[arg0]; var6++) {
            const var7 = this.radius(arg0, var6, arg1);
            const var8 = -2.0 * var7 * Math.cos(this.frequency(arg0, var6, arg1));
            const var9 = var7 * var7;

            Filter.coeff[arg0][var6 * 2 + 1] = Filter.coeff[arg0][var6 * 2 - 1] * var9;
            Filter.coeff[arg0][var6 * 2] = Filter.coeff[arg0][var6 * 2 - 1] * var8 + Filter.coeff[arg0][var6 * 2 - 2] * var9;

            for (let var10 = var6 * 2 - 1; var10 >= 2; var10--) {
                Filter.coeff[arg0][var10] += Filter.coeff[arg0][var10 - 1] * var8 + Filter.coeff[arg0][var10 - 2] * var9;
            }

            Filter.coeff[arg0][1] += Filter.coeff[arg0][0] * var8 + var9;
            Filter.coeff[arg0][0] += var8;
        }

        if (arg0 === 0) {
            for (let var11 = 0; var11 < this.pairs[0] * 2; var11++) {
                Filter.coeff[0][var11] *= Filter.reduceCoeff;
            }
        }

        for (let var12 = 0; var12 < this.pairs[arg0] * 2; var12++) {
            Filter.coeffInt[arg0][var12] = (Filter.coeff[arg0][var12] * 65536.0) | 0;
        }

        return this.pairs[arg0] * 2;
    }

    // jag::oldscape::sound::Filter::Load
    load(arg0: Packet, arg1: Envelope): void {
        const var3 = arg0.g1();
        this.pairs[0] = var3 >> 4;
        this.pairs[1] = var3 & 0xf;
        if (var3 === 0) {
            this.unities[0] = this.unities[1] = 0;
            return;
        }
        this.unities[0] = arg0.g2();
        this.unities[1] = arg0.g2();
        const var4 = arg0.g1();
        for (let var5 = 0; var5 < 2; var5++) {
            for (let var6 = 0; var6 < this.pairs[var5]; var6++) {
                this.frequencies[var5][0][var6] = arg0.g2();
                this.ranges[var5][0][var6] = arg0.g2();
            }
        }

        for (let var7 = 0; var7 < 2; var7++) {
            for (let var8 = 0; var8 < this.pairs[var7]; var8++) {
                if ((var4 & ((0x1 << (var7 * 4)) << var8)) === 0) {
                    this.frequencies[var7][1][var8] = this.frequencies[var7][0][var8];
                    this.ranges[var7][1][var8] = this.ranges[var7][0][var8];
                } else {
                    this.frequencies[var7][1][var8] = arg0.g2();
                    this.ranges[var7][1][var8] = arg0.g2();
                }
            }
        }

        if (var4 !== 0 || this.unities[1] !== this.unities[0]) {
            arg1.loadPoints(arg0);
        }
    }
}
