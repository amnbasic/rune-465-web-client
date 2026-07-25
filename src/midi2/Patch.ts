import Linkable from '#/datastruct/Linkable.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';
import EnvelopeSet from '#/midi2/EnvelopeSet.js';
import Wave from '#/sound/Wave.js';
import WaveCache from '#/sound/WaveCache.js';

// jag::oldscape::midi2::Patch
export default class Patch extends Linkable {
    volume: number = 0;
    noteSound!: (Wave | null)[];
    notePitch!: Int16Array;
    noteVolume!: Int8Array;
    notePan!: Int8Array;
    noteEnvelope!: (EnvelopeSet | null)[];
    noteSecondaryNote!: Int8Array;
    noteWaveId!: Int32Array | null;

    // jag::oldscape::midi2::Patch::Load
    static load(arg0: Js5, arg1: number): Patch | null {
        const var2 = arg0.getFile(arg1);
        return var2 === null ? null : new Patch(var2);
    }

    constructor(arg0?: Uint8Array | Int8Array) {
        super();
        if (arg0 === undefined) {
            return;
        }
        this.notePitch = new Int16Array(128);
        this.noteSecondaryNote = new Int8Array(128);
        this.noteEnvelope = new Array(128).fill(null);
        this.noteVolume = new Int8Array(128);
        this.noteSound = new Array(128).fill(null);
        this.noteWaveId = new Int32Array(128);
        this.notePan = new Int8Array(128);
        const data = arg0 instanceof Uint8Array ? arg0 : new Uint8Array(arg0.buffer, arg0.byteOffset, arg0.byteLength);
        const var2 = new Packet(data);
        let var3;
        for (var3 = 0; var2.data[var3 + var2.pos] !== 0; var3++) {}
        const var4 = new Int8Array(var3);
        for (let var5 = 0; var5 < var3; var5++) var4[var5] = var2.g1b();
        var2.pos++;
        var3++;
        let var6 = var2.pos;
        var2.pos += var3;
        let var7;
        for (var7 = 0; var2.data[var7 + var2.pos] !== 0; var7++) {}
        const var8 = new Int8Array(var7);
        for (let var9 = 0; var9 < var7; var9++) var8[var9] = var2.g1b();
        var2.pos++;
        var7++;
        let var10 = var2.pos;
        var2.pos += var7;
        let var11;
        for (var11 = 0; var2.data[var11 + var2.pos] !== 0; var11++) {}
        const var12 = new Int8Array(var11);
        for (let var13 = 0; var13 < var11; var13++) var12[var13] = var2.g1b();
        var2.pos++;
        var11++;
        const var14 = new Int8Array(var11);
        let var15;
        if (var11 > 1) {
            var15 = 2;
            var14[1] = 1;
            let var16 = 1;
            for (let var17 = 2; var17 < var11; var17++) {
                let var18 = var2.g1();
                if (var18 === 0) {
                    var16 = var15++;
                } else {
                    if (var18 <= var16) var18--;
                    var16 = var18;
                }
                var14[var17] = var16;
            }
        } else {
            var15 = var11;
        }
        const var19 = new Array(var15);
        for (let var20 = 0; var20 < var19.length; var20++) {
            const var21 = (var19[var20] = new EnvelopeSet());
            const var22 = var2.g1();
            if (var22 > 0) var21.attackVolume = new Int8Array(var22 * 2);
            const var23 = var2.g1();
            if (var23 > 0) {
                var21.releaseVolume = new Int8Array(var23 * 2 + 2);
                var21.releaseVolume[1] = 64;
            }
        }
        const var24 = var2.g1();
        const var25 = var24 > 0 ? new Int8Array(var24 * 2) : null;
        const var26 = var2.g1();
        const var27 = var26 <= 0 ? null : new Int8Array(var26 * 2);
        let var28;
        for (var28 = 0; var2.data[var28 + var2.pos] !== 0; var28++) {}
        const var29 = new Int8Array(var28);
        for (let var30 = 0; var30 < var28; var30++) var29[var30] = var2.g1b();
        var2.pos++;
        var28++;
        let var31 = 0;
        for (let var32 = 0; var32 < 128; var32++) {
            var31 += var2.g1();
            this.notePitch[var32] = var31;
        }
        let var33 = 0;
        for (let var34 = 0; var34 < 128; var34++) {
            var33 += var2.g1();
            this.notePitch[var34] = this.notePitch[var34] + (var33 << 8);
        }
        let var35 = 0;
        let var36 = 0;
        let var37 = 0;
        for (let var38 = 0; var38 < 128; var38++) {
            if (var35 === 0) {
                if (var29.length <= var37) var35 = -1;
                else var35 = var29[var37++];
                var36 = var2.gMidiVarLen();
            }
            this.notePitch[var38] = this.notePitch[var38] + (((var36 - 1) & 0x2) << 14);
            this.noteWaveId[var38] = var36;
            var35--;
        }
        let var39 = 0;
        let var40 = 0;
        let var41 = 0;
        for (let var42 = 0; var42 < 128; var42++) {
            if (this.noteWaveId[var42] !== 0) {
                if (var39 === 0) {
                    var41 = ((var2.data[var6++] << 24) >> 24) - 1;
                    if (var4.length <= var40) var39 = -1;
                    else var39 = var4[var40++];
                }
                var39--;
                this.noteSecondaryNote[var42] = var41;
            }
        }
        let var43 = 0;
        let var44 = 0;
        let var45 = 0;
        for (let var46 = 0; var46 < 128; var46++) {
            if (this.noteWaveId[var46] !== 0) {
                if (var43 === 0) {
                    if (var44 >= var8.length) var43 = -1;
                    else var43 = var8[var44++];
                    var45 = (((var2.data[var10++] << 24) >> 24) + 16) << 2;
                }
                this.notePan[var46] = var45;
                var43--;
            }
        }
        let var47 = 0;
        let var48 = 0;
        let var49 = null;
        for (let var50 = 0; var50 < 128; var50++) {
            if (this.noteWaveId[var50] !== 0) {
                if (var48 === 0) {
                    var49 = var19[var14[var47]];
                    if (var47 >= var12.length) var48 = -1;
                    else var48 = var12[var47++];
                }
                this.noteEnvelope[var50] = var49;
                var48--;
            }
        }
        let var51 = 0;
        let var52 = 0;
        let var53 = 0;
        for (let var54 = 0; var54 < 128; var54++) {
            if (var53 === 0) {
                if (var51 < var29.length) var53 = var29[var51++];
                else var53 = -1;
                if (this.noteWaveId[var54] > 0) var52 = var2.g1() + 1;
            }
            var53--;
            this.noteVolume[var54] = var52;
        }
        this.volume = var2.g1() + 1;
        for (let var55 = 0; var55 < var15; var55++) {
            const var56 = var19[var55];
            if (var56.attackVolume != null) {
                for (let var57 = 1; var57 < var56.attackVolume.length; var57 += 2) var56.attackVolume[var57] = var2.g1b();
            }
            if (var56.releaseVolume != null) {
                for (let var58 = 3; var58 < var56.releaseVolume.length - 2; var58 += 2) var56.releaseVolume[var58] = var2.g1b();
            }
        }
        if (var25 != null) for (let var59 = 1; var59 < var25.length; var59 += 2) var25[var59] = var2.g1b();
        if (var27 != null) for (let var60 = 1; var60 < var27.length; var60 += 2) var27[var60] = var2.g1b();
        for (let var61 = 0; var61 < var15; var61++) {
            const var62 = var19[var61];
            if (var62.releaseVolume != null) {
                let var63 = 0;
                for (let var64 = 2; var64 < var62.releaseVolume.length; var64 += 2) {
                    var63 = var63 + var2.g1() + 1;
                    var62.releaseVolume[var64] = var63;
                }
            }
        }
        for (let var65 = 0; var65 < var15; var65++) {
            const var66 = var19[var65];
            if (var66.attackVolume != null) {
                let var67 = 0;
                for (let var68 = 2; var68 < var66.attackVolume.length; var68 += 2) {
                    var67 = var67 + var2.g1() + 1;
                    var66.attackVolume[var68] = var67;
                }
            }
        }
        if (var25 != null) {
            let var69 = var2.g1();
            var25[0] = var69;
            for (let var70 = 2; var70 < var25.length; var70 += 2) {
                var69 = var69 + var2.g1() + 1;
                var25[var70] = var69;
            }
            let var71 = var25[0];
            let var72 = var25[1];
            for (let var73 = 0; var73 < var71; var73++) this.noteVolume[var73] = (Math.imul(this.noteVolume[var73], var72) + 32) >> 6;
            let var74 = 2;
            while (var25.length > var74) {
                const var75 = var25[var74 + 1];
                const var76 = var25[var74];
                var74 += 2;
                let var77 = ((((var76 - var71) / 2) | 0) + Math.imul(var76 - var71, var72)) | 0;
                for (let var78 = var71; var78 < var76; var78++) {
                    const var79 = Patch.method1284(var76 - var71, var77);
                    var77 += var75 - var72;
                    this.noteVolume[var78] = (Math.imul(this.noteVolume[var78], var79) + 32) >> 6;
                }
                var71 = var76;
                var72 = var75;
            }
            for (let var80 = var71; var80 < 128; var80++) this.noteVolume[var80] = (Math.imul(var72, this.noteVolume[var80]) + 32) >> 6;
        }
        if (var27 != null) {
            let var81 = var2.g1();
            var27[0] = var81;
            for (let var82 = 2; var82 < var27.length; var82 += 2) {
                var81 = var81 + var2.g1() + 1;
                var27[var82] = var81;
            }
            let var83 = var27[0];
            let var84 = var27[1] << 1;
            for (let var85 = 0; var85 < var83; var85++) {
                let var86 = var84 + (this.notePan[var85] & 0xff);
                if (var86 < 0) var86 = 0;
                if (var86 > 128) var86 = 128;
                this.notePan[var85] = var86;
            }
            let var87 = 2;
            while (var27.length > var87) {
                const var88 = var27[var87];
                const var89 = var27[var87 + 1] << 1;
                var87 += 2;
                let var90 = ((((var88 - var83) / 2) | 0) + Math.imul(var88 - var83, var84)) | 0;
                for (let var91 = var83; var91 < var88; var91++) {
                    const var92 = Patch.method1284(var88 - var83, var90);
                    let var93 = (this.notePan[var91] & 0xff) + var92;
                    if (var93 < 0) var93 = 0;
                    var90 += var89 - var84;
                    if (var93 > 128) var93 = 128;
                    this.notePan[var91] = var93;
                }
                var83 = var88;
                var84 = var89;
            }
            for (let var94 = var83; var94 < 128; var94++) {
                let var95 = var84 + (this.notePan[var94] & 0xff);
                if (var95 < 0) var95 = 0;
                if (var95 > 128) var95 = 128;
                this.notePan[var94] = var95;
            }
        }
        for (let var96 = 0; var96 < var15; var96++) var19[var96].decayVolume = var2.g1();
        for (let var97 = 0; var97 < var15; var97++) {
            const var98 = var19[var97];
            if (var98.attackVolume != null) var98.attackSpeed = var2.g1();
            if (var98.releaseVolume != null) var98.releaseSpeed = var2.g1();
            if (var98.decayVolume > 0) var98.decaySpeed = var2.g1();
        }
        for (let var99 = 0; var99 < var15; var99++) var19[var99].vibratoFrequency = var2.g1();
        for (let var100 = 0; var100 < var15; var100++) {
            const var101 = var19[var100];
            if (var101.vibratoFrequency > 0) var101.vibratoAmplitude = var2.g1();
        }
        for (let var102 = 0; var102 < var15; var102++) {
            const var103 = var19[var102];
            if (var103.vibratoAmplitude > 0) var103.vibratoRampTime = var2.g1();
        }
    }

    // todo: identify
    static method1284(arg0: number, arg1: number): number {
        const var2 = arg1 >>> 31;
        if (arg0 === 0) {
            throw new Error();
        }
        return (((var2 + arg1) / arg0) | 0) - var2;
    }

    // jag::oldscape::midi2::Patch::LoadWaves
    loadWaves(arg0: Int32Array | number[] | null, arg1: WaveCache, arg2: Int8Array | Uint8Array | null): boolean {
        let var4 = true;
        let var5 = 0;
        let var6: Wave | null = null;
        for (let var7 = 0; var7 < 128; var7++) {
            if (arg2 == null || arg2[var7] !== 0) {
                let var8 = this.noteWaveId![var7];
                if (var8 !== 0) {
                    if (var5 !== var8) {
                        var5 = var8--;
                        if ((var8 & 0x1) === 0) {
                            var6 = arg1.getJagFx(var8 >> 2, arg0);
                        } else {
                            var6 = arg1.getJagVorbis(arg0, var8 >> 2);
                        }
                        if (var6 == null) {
                            var4 = false;
                        }
                    }
                    if (var6 != null) {
                        this.noteSound[var7] = var6;
                        this.noteWaveId![var7] = 0;
                    }
                }
            }
        }
        return var4;
    }

    freeWaveIds(): void {
        this.noteWaveId = null;
    }
}
