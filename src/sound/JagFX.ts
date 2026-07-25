import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';

import Tone from '#/sound/Tone.js';
import Wave from '#/sound/Wave.js';

// jag::oldscape::sound::JagFX
export default class JagFX {
    tones: (Tone | null)[] = new Array(10).fill(null);
    loopBegin: number = 0;
    loopEnd: number = 0;

    // jag::oldscape::sound::JagFX::Load
    static load(arg0: Js5, arg1: number, arg2: number): JagFX | null {
        const var3 = arg0.getFile(arg2, arg1);
        return var3 === null ? null : new JagFX(new Packet(var3));
    }

    constructor(arg0: Packet);
    constructor();
    constructor(arg0?: Packet) {
        if (arg0 === undefined) {
            return;
        }
        for (let var2 = 0; var2 < 10; var2++) {
            const var3 = arg0.g1();
            if (var3 !== 0) {
                arg0.pos--;

                this.tones[var2] = new Tone();
                this.tones[var2]!.load(arg0);
            }
        }

        this.loopBegin = arg0.g2();
        this.loopEnd = arg0.g2();
    }

    // jag::oldscape::sound::JagFX::ToWave
    toWave(): Wave {
        const var1 = this.makeSound();
        return new Wave(22050, var1, (Math.imul(this.loopBegin, 22050) / 1000) | 0, (Math.imul(this.loopEnd, 22050) / 1000) | 0);
    }

    // jag::oldscape::sound::JagFX::OptimiseStart
    optimiseStart(): number {
        let var1 = 9999999;
        for (let var2 = 0; var2 < 10; var2++) {
            if (this.tones[var2] !== null && ((this.tones[var2]!.start / 20) | 0) < var1) {
                var1 = (this.tones[var2]!.start / 20) | 0;
            }
        }

        if (this.loopBegin < this.loopEnd && ((this.loopBegin / 20) | 0) < var1) {
            var1 = (this.loopBegin / 20) | 0;
        }

        if (var1 === 9999999 || var1 === 0) {
            return 0;
        }

        for (let var3 = 0; var3 < 10; var3++) {
            if (this.tones[var3] !== null) {
                this.tones[var3]!.start -= var1 * 20;
            }
        }

        if (this.loopBegin < this.loopEnd) {
            this.loopBegin -= var1 * 20;
            this.loopEnd -= var1 * 20;
        }

        return var1;
    }

    // jag::oldscape::sound::JagFX::MakeSound
    makeSound(): Int8Array {
        let var1 = 0;
        for (let var2 = 0; var2 < 10; var2++) {
            if (this.tones[var2] !== null && this.tones[var2]!.length + this.tones[var2]!.start > var1) {
                var1 = this.tones[var2]!.length + this.tones[var2]!.start;
            }
        }
        if (var1 === 0) {
            return new Int8Array(0);
        }
        const var3 = (Math.imul(var1, 22050) / 1000) | 0;
        const var4 = new Int8Array(var3);
        for (let var5 = 0; var5 < 10; var5++) {
            if (this.tones[var5] !== null) {
                const var6 = (Math.imul(this.tones[var5]!.length, 22050) / 1000) | 0;
                const var7 = (Math.imul(this.tones[var5]!.start, 22050) / 1000) | 0;
                const var8 = this.tones[var5]!.generate(var6, this.tones[var5]!.length);
                for (let var9 = 0; var9 < var6; var9++) {
                    let var10 = var4[var9 + var7] + (var8[var9] >> 8);
                    if (((var10 + 128) & 0xffffff00) !== 0) {
                        var10 = (var10 >> 31) ^ 0x7f;
                    }
                    var4[var9 + var7] = var10;
                }
            }
        }
        return var4;
    }
}
