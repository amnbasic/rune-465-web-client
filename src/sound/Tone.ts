import Packet from '#/io/Packet.js';

import Envelope from '#/sound/Envelope.js';
import Filter from '#/sound/Filter.js';
import ArrayUtil from '#/util/ArrayUtil.js';
import JavaRandom from '#/util/JavaRandom.js';

// jag::oldscape::sound::Tone
export default class Tone {
    frequencyBase!: Envelope;
    amplitudeBase!: Envelope;
    frequencyModRate: Envelope | null = null;
    frequencyModRange: Envelope | null = null;
    amplitudeModRate: Envelope | null = null;
    amplitudeModRange: Envelope | null = null;
    release: Envelope | null = null;
    attack: Envelope | null = null;
    harmonicVolume: Int32Array = new Int32Array(5);
    harmonicSemitone: Int32Array = new Int32Array(5);
    harmonicDelay: Int32Array = new Int32Array(5);
    reverbDelay: number = 0;
    reverbVolume: number = 100;
    filter!: Filter;
    filterRange!: Envelope;
    length: number = 500;
    start: number = 0;

    // jag::oldscape::sound::Tone::m_buf
    static buf: Int32Array;

    // jag::oldscape::sound::Tone::m_noise
    static noise: Int32Array = new Int32Array(32768);

    // jag::oldscape::sound::Tone::m_sine
    static sine: Int32Array;

    // jag::oldscape::sound::Tone::m_fPos
    static fPos: Int32Array;

    // jag::oldscape::sound::Tone::m_fDel
    static fDel: Int32Array;

    // jag::oldscape::sound::Tone::m_fAmp
    static fAmp: Int32Array;

    // jag::oldscape::sound::Tone::m_fMulti
    static fMulti: Int32Array;

    // jag::oldscape::sound::Tone::m_fOffset
    static fOffset: Int32Array;

    static {
        const rand = new JavaRandom(0);
        for (let i = 0; i < 32768; i++) {
            Tone.noise[i] = (rand.nextInt() & 0x2) - 1;
        }

        Tone.sine = new Int32Array(32768);
        for (let i = 0; i < 32768; i++) {
            Tone.sine[i] = (Math.sin(i / 5215.1903) * 16384.0) | 0;
        }

        Tone.buf = new Int32Array(220500);

        Tone.fMulti = new Int32Array(5);
        Tone.fPos = new Int32Array(5);
        Tone.fOffset = new Int32Array(5);
        Tone.fAmp = new Int32Array(5);
        Tone.fDel = new Int32Array(5);
    }

    // jag::oldscape::sound::Tone::Generate
    generate(arg0: number, arg1: number): Int32Array {
        ArrayUtil.clear(Tone.buf, 0, arg0);
        if (arg1 < 10) {
            return Tone.buf;
        }
        const var3 = arg0 / (arg1 + 0.0);
        this.frequencyBase.genInit();
        this.amplitudeBase.genInit();
        let var5 = 0;
        let var6 = 0;
        let var7 = 0;
        if (this.frequencyModRate !== null) {
            this.frequencyModRate.genInit();
            this.frequencyModRange!.genInit();
            var5 = (((this.frequencyModRate.end - this.frequencyModRate.start) * 32.768) / var3) | 0;
            var6 = ((this.frequencyModRate.start * 32.768) / var3) | 0;
        }
        let var8 = 0;
        let var9 = 0;
        let var10 = 0;
        if (this.amplitudeModRate !== null) {
            this.amplitudeModRate.genInit();
            this.amplitudeModRange!.genInit();
            var8 = (((this.amplitudeModRate.end - this.amplitudeModRate.start) * 32.768) / var3) | 0;
            var9 = ((this.amplitudeModRate.start * 32.768) / var3) | 0;
        }
        for (let var11 = 0; var11 < 5; var11++) {
            if (this.harmonicVolume[var11] !== 0) {
                Tone.fPos[var11] = 0;
                Tone.fDel[var11] = (this.harmonicDelay[var11] * var3) | 0;
                Tone.fAmp[var11] = ((this.harmonicVolume[var11] << 14) / 100) | 0;
                Tone.fMulti[var11] = (((this.frequencyBase.end - this.frequencyBase.start) * 32.768 * Math.pow(1.0057929410678534, this.harmonicSemitone[var11])) / var3) | 0;
                Tone.fOffset[var11] = ((this.frequencyBase.start * 32.768) / var3) | 0;
            }
        }
        for (let var12 = 0; var12 < arg0; var12++) {
            let var13 = this.frequencyBase.genNext(arg0);
            let var14 = this.amplitudeBase.genNext(arg0);
            if (this.frequencyModRate !== null) {
                const var15 = this.frequencyModRate.genNext(arg0);
                const var16 = this.frequencyModRange!.genNext(arg0);
                var13 += this.waveFunc(var7, var16, this.frequencyModRate.form) >> 1;
                var7 = (var7 + ((Math.imul(var15, var5) >> 16) + var6)) | 0;
            }
            if (this.amplitudeModRate !== null) {
                const var17 = this.amplitudeModRate.genNext(arg0);
                const var18 = this.amplitudeModRange!.genNext(arg0);
                var14 = Math.imul(var14, (this.waveFunc(var10, var18, this.amplitudeModRate.form) >> 1) + 32768) >> 15;
                var10 = (var10 + ((Math.imul(var17, var8) >> 16) + var9)) | 0;
            }
            for (let var19 = 0; var19 < 5; var19++) {
                if (this.harmonicVolume[var19] !== 0) {
                    const var20 = var12 + Tone.fDel[var19];
                    if (var20 < arg0) {
                        Tone.buf[var20] = (Tone.buf[var20] + this.waveFunc(Tone.fPos[var19], Math.imul(var14, Tone.fAmp[var19]) >> 15, this.frequencyBase.form)) | 0;
                        Tone.fPos[var19] = (Tone.fPos[var19] + ((Math.imul(var13, Tone.fMulti[var19]) >> 16) + Tone.fOffset[var19])) | 0;
                    }
                }
            }
        }
        if (this.release !== null) {
            this.release.genInit();
            this.attack!.genInit();
            let var21 = 0;
            let var22 = true;
            for (let var23 = 0; var23 < arg0; var23++) {
                const var24 = this.release.genNext(arg0);
                const var25 = this.attack!.genNext(arg0);
                let var26: number;
                if (var22) {
                    var26 = (this.release.start + (Math.imul(this.release.end - this.release.start, var24) >> 8)) | 0;
                } else {
                    var26 = (this.release.start + (Math.imul(this.release.end - this.release.start, var25) >> 8)) | 0;
                }
                var21 = (var21 + 256) | 0;
                if (var21 >= var26) {
                    var21 = 0;
                    var22 = !var22;
                }
                if (var22) {
                    Tone.buf[var23] = 0;
                }
            }
        }
        if (this.reverbDelay > 0 && this.reverbVolume > 0) {
            const var27 = (this.reverbDelay * var3) | 0;
            for (let var28 = var27; var28 < arg0; var28++) {
                Tone.buf[var28] += (Math.imul(Tone.buf[var28 - var27], this.reverbVolume) / 100) | 0;
            }
        }
        if (this.filter.pairs[0] > 0 || this.filter.pairs[1] > 0) {
            this.filterRange.genInit();
            let var29 = this.filterRange.genNext(arg0 + 1);
            let var30 = this.filter.calculateCoeffs(0, var29 / 65536.0);
            let var31 = this.filter.calculateCoeffs(1, var29 / 65536.0);
            if (arg0 >= var30 + var31) {
                let var32 = 0;
                let var33 = var31;
                if (var31 > arg0 - var30) {
                    var33 = arg0 - var30;
                }
                while (var32 < var33) {
                    let var34 = Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 + var30]) * BigInt(Filter.reduceCoeffInt)) >> 16n));
                    for (let var35 = 0; var35 < var30; var35++) {
                        var34 = (var34 + Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 + var30 - var35 - 1]) * BigInt(Filter.coeffInt[0][var35])) >> 16n))) | 0;
                    }
                    for (let var36 = 0; var36 < var32; var36++) {
                        var34 = (var34 - Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 - var36 - 1]) * BigInt(Filter.coeffInt[1][var36])) >> 16n))) | 0;
                    }
                    Tone.buf[var32] = var34;
                    var29 = this.filterRange.genNext(arg0 + 1);
                    var32++;
                }
                let var37 = 128;
                while (true) {
                    if (var37 > arg0 - var30) {
                        var37 = arg0 - var30;
                    }
                    while (var32 < var37) {
                        let var38 = Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 + var30]) * BigInt(Filter.reduceCoeffInt)) >> 16n));
                        for (let var39 = 0; var39 < var30; var39++) {
                            var38 = (var38 + Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 + var30 - var39 - 1]) * BigInt(Filter.coeffInt[0][var39])) >> 16n))) | 0;
                        }
                        for (let var40 = 0; var40 < var31; var40++) {
                            var38 = (var38 - Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 - var40 - 1]) * BigInt(Filter.coeffInt[1][var40])) >> 16n))) | 0;
                        }
                        Tone.buf[var32] = var38;
                        var29 = this.filterRange.genNext(arg0 + 1);
                        var32++;
                    }
                    if (var32 >= arg0 - var30) {
                        while (var32 < arg0) {
                            let var41 = 0;
                            for (let var42 = var32 + var30 - arg0; var42 < var30; var42++) {
                                var41 = (var41 + Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 + var30 - var42 - 1]) * BigInt(Filter.coeffInt[0][var42])) >> 16n))) | 0;
                            }
                            for (let var43 = 0; var43 < var31; var43++) {
                                var41 = (var41 - Number(BigInt.asIntN(32, (BigInt(Tone.buf[var32 - var43 - 1]) * BigInt(Filter.coeffInt[1][var43])) >> 16n))) | 0;
                            }
                            Tone.buf[var32] = var41;
                            this.filterRange.genNext(arg0 + 1);
                            var32++;
                        }
                        break;
                    }
                    var30 = this.filter.calculateCoeffs(0, var29 / 65536.0);
                    var31 = this.filter.calculateCoeffs(1, var29 / 65536.0);
                    var37 += 128;
                }
            }
        }
        for (let var45 = 0; var45 < arg0; var45++) {
            if (Tone.buf[var45] < -32768) {
                Tone.buf[var45] = -32768;
            }
            if (Tone.buf[var45] > 32767) {
                Tone.buf[var45] = 32767;
            }
        }
        return Tone.buf;
    }

    // jag::oldscape::sound::Tone::WaveFunc
    waveFunc(phase: number, amplitude: number, form: number): number {
        if (form === 1) {
            return (phase & 0x7fff) < 16384 ? amplitude : -amplitude;
        } else if (form === 2) {
            return Math.imul(Tone.sine[phase & 0x7fff], amplitude) >> 14;
        } else if (form === 3) {
            return ((Math.imul(phase & 0x7fff, amplitude) >> 14) - amplitude) | 0;
        } else if (form === 4) {
            return Math.imul(Tone.noise[((phase / 2607) | 0) & 0x7fff], amplitude);
        } else {
            return 0;
        }
    }

    // jag::oldscape::sound::Tone::Load
    load(arg0: Packet): void {
        this.frequencyBase = new Envelope();
        this.frequencyBase.load(arg0);

        this.amplitudeBase = new Envelope();
        this.amplitudeBase.load(arg0);

        const var2 = arg0.g1();
        if (var2 !== 0) {
            arg0.pos--;

            this.frequencyModRate = new Envelope();
            this.frequencyModRate.load(arg0);

            this.frequencyModRange = new Envelope();
            this.frequencyModRange.load(arg0);
        }

        const var3 = arg0.g1();
        if (var3 !== 0) {
            arg0.pos--;

            this.amplitudeModRate = new Envelope();
            this.amplitudeModRate.load(arg0);

            this.amplitudeModRange = new Envelope();
            this.amplitudeModRange.load(arg0);
        }

        const var4 = arg0.g1();
        if (var4 !== 0) {
            arg0.pos--;

            this.release = new Envelope();
            this.release.load(arg0);

            this.attack = new Envelope();
            this.attack.load(arg0);
        }

        for (let var5 = 0; var5 < 10; var5++) {
            const var6 = arg0.gsmart();
            if (var6 === 0) {
                break;
            }

            this.harmonicVolume[var5] = var6;
            this.harmonicSemitone[var5] = arg0.method342();
            this.harmonicDelay[var5] = arg0.gsmart();
        }

        this.reverbDelay = arg0.gsmart();
        this.reverbVolume = arg0.gsmart();
        this.length = arg0.g2();
        this.start = arg0.g2();

        this.filter = new Filter();
        this.filterRange = new Envelope();
        this.filter.load(arg0, this.filterRange);
    }
}
