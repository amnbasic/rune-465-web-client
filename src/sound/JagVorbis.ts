import Linkable from '#/datastruct/Linkable.js';
import Packet from '#/io/Packet.js';
import type Js5 from '#/js5/Js5.js';
import CodeBook from '#/sound/CodeBook.js';
import Floor from '#/sound/Floor.js';
import Mapping from '#/sound/Mapping.js';
import Residue from '#/sound/Residue.js';
import Wave from '#/sound/Wave.js';
import MathTool from '#/util/MathTool.js';

// jag::oldscape::sound::JagVorbis
export default class JagVorbis extends Linkable {
    audioPackets: Uint8Array[] = null!;
    sampleRate: number = 0;
    sampleCount: number = 0;
    loopStart: number = 0;
    loopEnd: number = 0;
    hasLoop: boolean = false;

    // jag::oldscape::sound::JagVorbis::m_staticUnpacker
    static staticUnpacker: Uint8Array = null!;

    static bytePos: number = 0;
    static bitPos: number = 0;

    // jag::oldscape::sound::JagVorbis::m_blocksize0
    static blocksize0: number = 0;

    // jag::oldscape::sound::JagVorbis::m_blocksize1
    static blocksize1: number = 0;

    // todo: rename
    // jag::oldscape::sound::JagVorbis::m_codebook
    static codebooks: CodeBook[] = null!;

    static floor_config: Floor[] = null!;
    static residue_config: Residue[] = null!;
    static mapping_config: Mapping[] = null!;
    static blockflag: boolean[] = null!;
    static mapping: Int32Array = null!;

    // jag::oldscape::sound::JagVorbis::m_gotHeaders
    static gotHeaders: boolean = false;

    previousWindow: Float32Array | null = null;
    previousWindowSize: number = 0;
    previousWindowRightStart: number = 0;
    previousWindowUnused: boolean = false;
    static workBuffer: Float32Array = null!;
    static imdctPrevShort: Float32Array = null!;
    static imdctStepShort: Float32Array = null!;
    static imdctPostShort: Float32Array = null!;
    static imdctPrevLong: Float32Array = null!;
    static imdctStepLong: Float32Array = null!;
    static imdctPostLong: Float32Array = null!;
    static bitReverseShort: Int32Array = null!;
    static bitReverseLong: Int32Array = null!;
    pcmData: Int8Array | null = null;
    pcmWritePosition: number = 0;
    currentPacketIndex: number = 0;

    // jag::oldscape::sound::JagVorbis::Float32Unpack
    static float32Unpack(arg0: number): number {
        let var1 = arg0 & 0x1fffff;
        const var2 = arg0 & -2147483648;
        const var3 = (arg0 >> 21) & 0x3ff;
        if (var2 !== 0) {
            var1 = -var1;
        }
        return var1 * Math.pow(2.0, var3 - 788);
    }

    // jag::oldscape::sound::BitUnpacker::SetBitPos
    static setBitPos(arg0: Uint8Array): void {
        JagVorbis.staticUnpacker = arg0;
        JagVorbis.bytePos = 0;
        JagVorbis.bitPos = 0;
    }

    // jag::oldscape::sound::BitUnpacker::ReadBit
    static readBit(): number {
        const var0 = (JagVorbis.staticUnpacker[JagVorbis.bytePos] >> JagVorbis.bitPos) & 0x1;
        JagVorbis.bitPos++;
        JagVorbis.bytePos += JagVorbis.bitPos >> 3;
        JagVorbis.bitPos &= 0x7;
        return var0;
    }

    // jag::oldscape::sound::BitUnpacker::ReadBits
    static readBits(arg0: number): number {
        let var1 = 0;
        let var2 = 0;
        while (arg0 >= 8 - JagVorbis.bitPos) {
            const var3 = 8 - JagVorbis.bitPos;
            const var4 = (0x1 << var3) - 1;
            var1 += ((JagVorbis.staticUnpacker[JagVorbis.bytePos] >> JagVorbis.bitPos) & var4) << var2;
            JagVorbis.bitPos = 0;
            JagVorbis.bytePos++;
            var2 += var3;
            arg0 -= var3;
        }
        if (arg0 > 0) {
            const var5 = (0x1 << arg0) - 1;
            var1 += ((JagVorbis.staticUnpacker[JagVorbis.bytePos] >> JagVorbis.bitPos) & var5) << var2;
            JagVorbis.bitPos += arg0;
        }
        return var1;
    }

    // jag::oldscape::sound::JagVorbis::DecodeJagVorbis
    decodeJagVorbis(arg0: Uint8Array): void {
        const var2 = new Packet(arg0);
        this.sampleRate = var2.g4();
        this.sampleCount = var2.g4();
        this.loopStart = var2.g4();
        this.loopEnd = var2.g4();
        if (this.loopEnd < 0) {
            this.loopEnd = ~this.loopEnd;
            this.hasLoop = true;
        }
        const var3 = var2.g4();
        this.audioPackets = new Array(var3);
        for (let var4 = 0; var4 < var3; var4++) {
            let var5 = 0;
            let var6;
            do {
                var6 = var2.g1();
                var5 += var6;
            } while (var6 >= 255);
            const var7 = new Uint8Array(var5);
            var2.gdata(var5, var7);
            this.audioPackets[var4] = var7;
        }
    }

    // jag::oldscape::sound::JagVorbis::ProcessHeaders
    static processHeaders(arg0: Uint8Array): void {
        JagVorbis.setBitPos(arg0);
        JagVorbis.blocksize0 = 0x1 << JagVorbis.readBits(4);
        JagVorbis.blocksize1 = 0x1 << JagVorbis.readBits(4);
        JagVorbis.workBuffer = new Float32Array(JagVorbis.blocksize1);
        for (let var1 = 0; var1 < 2; var1++) {
            const var2 = var1 === 0 ? JagVorbis.blocksize0 : JagVorbis.blocksize1;
            const var3 = var2 >> 1;
            const var4 = var2 >> 2;
            const var5 = var2 >> 3;
            const var6 = new Float32Array(var3);
            for (let var7 = 0; var7 < var4; var7++) {
                var6[var7 * 2] = Math.cos((var7 * 4 * 3.141592653589793) / var2);
                var6[var7 * 2 + 1] = -Math.sin((var7 * 4 * 3.141592653589793) / var2);
            }
            const var8 = new Float32Array(var3);
            for (let var9 = 0; var9 < var4; var9++) {
                var8[var9 * 2] = Math.cos(((var9 * 2 + 1) * 3.141592653589793) / (var2 * 2));
                var8[var9 * 2 + 1] = Math.sin(((var9 * 2 + 1) * 3.141592653589793) / (var2 * 2));
            }
            const var10 = new Float32Array(var4);
            for (let var11 = 0; var11 < var5; var11++) {
                var10[var11 * 2] = Math.cos(((var11 * 4 + 2) * 3.141592653589793) / var2);
                var10[var11 * 2 + 1] = -Math.sin(((var11 * 4 + 2) * 3.141592653589793) / var2);
            }
            const var12 = new Int32Array(var5);
            const var13 = MathTool.bitsRequired(var5 - 1);
            for (let var14 = 0; var14 < var5; var14++) {
                var12[var14] = MathTool.method1524(var14, var13);
            }
            if (var1 === 0) {
                JagVorbis.imdctPrevShort = var6;
                JagVorbis.imdctStepShort = var8;
                JagVorbis.imdctPostShort = var10;
                JagVorbis.bitReverseShort = var12;
            } else {
                JagVorbis.imdctPrevLong = var6;
                JagVorbis.imdctStepLong = var8;
                JagVorbis.imdctPostLong = var10;
                JagVorbis.bitReverseLong = var12;
            }
        }
        const var15 = JagVorbis.readBits(8) + 1;
        JagVorbis.codebooks = new Array(var15);
        for (let var16 = 0; var16 < var15; var16++) {
            JagVorbis.codebooks[var16] = new CodeBook();
        }
        const var17 = JagVorbis.readBits(6) + 1;
        for (let var18 = 0; var18 < var17; var18++) {
            JagVorbis.readBits(16);
        }
        const var19 = JagVorbis.readBits(6) + 1;
        JagVorbis.floor_config = new Array(var19);
        for (let var20 = 0; var20 < var19; var20++) {
            JagVorbis.floor_config[var20] = new Floor();
        }
        const var21 = JagVorbis.readBits(6) + 1;
        JagVorbis.residue_config = new Array(var21);
        for (let var22 = 0; var22 < var21; var22++) {
            JagVorbis.residue_config[var22] = new Residue();
        }
        const var23 = JagVorbis.readBits(6) + 1;
        JagVorbis.mapping_config = new Array(var23);
        for (let var24 = 0; var24 < var23; var24++) {
            JagVorbis.mapping_config[var24] = new Mapping();
        }
        const var25 = JagVorbis.readBits(6) + 1;
        JagVorbis.blockflag = new Array(var25).fill(false);
        JagVorbis.mapping = new Int32Array(var25);
        for (let var26 = 0; var26 < var25; var26++) {
            JagVorbis.blockflag[var26] = JagVorbis.readBit() !== 0;
            JagVorbis.readBits(16);
            JagVorbis.readBits(16);
            JagVorbis.mapping[var26] = JagVorbis.readBits(8);
        }
    }

    // jag::oldscape::sound::JagVorbis::DecodeAudioPacket
    decodeAudioPacket(arg0: number): Float32Array | null {
        JagVorbis.setBitPos(this.audioPackets[arg0]);
        JagVorbis.readBit();
        const var2 = JagVorbis.readBits(MathTool.bitsRequired(JagVorbis.mapping.length - 1));
        const var3 = JagVorbis.blockflag[var2];
        const var4 = var3 ? JagVorbis.blocksize1 : JagVorbis.blocksize0;
        let var5 = false;
        let var6 = false;
        if (var3) {
            var5 = JagVorbis.readBit() !== 0;
            var6 = JagVorbis.readBit() !== 0;
        }
        const var7 = var4 >> 1;
        let var8;
        let var9;
        let var10;
        if (var3 && !var5) {
            var8 = (var4 >> 2) - (JagVorbis.blocksize0 >> 2);
            var9 = (var4 >> 2) + (JagVorbis.blocksize0 >> 2);
            var10 = JagVorbis.blocksize0 >> 1;
        } else {
            var8 = 0;
            var9 = var7;
            var10 = var4 >> 1;
        }
        let var11;
        let var12;
        let var13;
        if (var3 && !var6) {
            var11 = var4 - (var4 >> 2) - (JagVorbis.blocksize0 >> 2);
            var12 = var4 + (JagVorbis.blocksize0 >> 2) - (var4 >> 2);
            var13 = JagVorbis.blocksize0 >> 1;
        } else {
            var11 = var7;
            var12 = var4;
            var13 = var4 >> 1;
        }
        const var14 = JagVorbis.mapping_config[JagVorbis.mapping[var2]];
        const var15 = var14.mux;
        const var16 = var14.submap_floor[var15];
        const var17 = !JagVorbis.floor_config[var16].packetDecode();
        for (let var18 = 0; var18 < var14.submaps; var18++) {
            const var19 = JagVorbis.residue_config[var14.submap_residue[var18]];
            const var20 = JagVorbis.workBuffer;
            var19.packetDecode(var20, var4 >> 1, var17);
        }
        if (!var17) {
            const var21 = var14.mux;
            const var22 = var14.submap_floor[var21];
            JagVorbis.floor_config[var22].synthMul(JagVorbis.workBuffer, var4 >> 1);
        }
        if (var17) {
            for (let var23 = var4 >> 1; var23 < var4; var23++) {
                JagVorbis.workBuffer[var23] = 0.0;
            }
        } else {
            const var24 = var4 >> 1;
            const var25 = var4 >> 2;
            const var26 = var4 >> 3;
            const var27 = JagVorbis.workBuffer;
            for (let var28 = 0; var28 < var24; var28++) {
                var27[var28] *= 0.5;
            }
            for (let var29 = var24; var29 < var4; var29++) {
                var27[var29] = -var27[var4 - var29 - 1];
            }
            const var30 = var3 ? JagVorbis.imdctPrevLong : JagVorbis.imdctPrevShort;
            const var31 = var3 ? JagVorbis.imdctStepLong : JagVorbis.imdctStepShort;
            const var32 = var3 ? JagVorbis.imdctPostLong : JagVorbis.imdctPostShort;
            const var33 = var3 ? JagVorbis.bitReverseLong : JagVorbis.bitReverseShort;
            for (let var34 = 0; var34 < var25; var34++) {
                const var35 = var27[var34 * 4] - var27[var4 - var34 * 4 - 1];
                const var36 = var27[var34 * 4 + 2] - var27[var4 - var34 * 4 - 3];
                const var37 = var30[var34 * 2];
                const var38 = var30[var34 * 2 + 1];
                var27[var4 - var34 * 4 - 1] = var35 * var37 - var36 * var38;
                var27[var4 - var34 * 4 - 3] = var35 * var38 + var36 * var37;
            }
            for (let var39 = 0; var39 < var26; var39++) {
                const var40 = var27[var24 + var39 * 4 + 3];
                const var41 = var27[var24 + var39 * 4 + 1];
                const var42 = var27[var39 * 4 + 3];
                const var43 = var27[var39 * 4 + 1];
                var27[var24 + var39 * 4 + 3] = var40 + var42;
                var27[var24 + var39 * 4 + 1] = var41 + var43;
                const var44 = var30[var24 - var39 * 4 - 4];
                const var45 = var30[var24 - var39 * 4 - 3];
                var27[var39 * 4 + 3] = (var40 - var42) * var44 - (var41 - var43) * var45;
                var27[var39 * 4 + 1] = (var41 - var43) * var44 + (var40 - var42) * var45;
            }
            const var46 = MathTool.bitsRequired(var4 - 1);
            for (let var47 = 0; var47 < var46 - 3; var47++) {
                const var48 = var4 >> (var47 + 2);
                const var49 = 0x8 << var47;
                for (let var50 = 0; var50 < 0x2 << var47; var50++) {
                    const var51 = var4 - var48 * 2 * var50;
                    const var52 = var4 - var48 * (var50 * 2 + 1);
                    for (let var53 = 0; var53 < var4 >> (var47 + 4); var53++) {
                        const var54 = var53 * 4;
                        const var55 = var27[var51 - var54 - 1];
                        const var56 = var27[var51 - var54 - 3];
                        const var57 = var27[var52 - var54 - 1];
                        const var58 = var27[var52 - var54 - 3];
                        var27[var51 - var54 - 1] = var55 + var57;
                        var27[var51 - var54 - 3] = var56 + var58;
                        const var59 = var30[var53 * var49];
                        const var60 = var30[var53 * var49 + 1];
                        var27[var52 - var54 - 1] = (var55 - var57) * var59 - (var56 - var58) * var60;
                        var27[var52 - var54 - 3] = (var56 - var58) * var59 + (var55 - var57) * var60;
                    }
                }
            }
            for (let var61 = 1; var61 < var26 - 1; var61++) {
                const var62 = var33[var61];
                if (var61 < var62) {
                    const var63 = var61 * 8;
                    const var64 = var62 * 8;
                    let var65 = var27[var63 + 1];
                    var27[var63 + 1] = var27[var64 + 1];
                    var27[var64 + 1] = var65;
                    const var66 = var27[var63 + 3];
                    var27[var63 + 3] = var27[var64 + 3];
                    var27[var64 + 3] = var66;
                    const var67 = var27[var63 + 5];
                    var27[var63 + 5] = var27[var64 + 5];
                    var27[var64 + 5] = var67;
                    const var68 = var27[var63 + 7];
                    var27[var63 + 7] = var27[var64 + 7];
                    var27[var64 + 7] = var68;
                }
            }
            for (let var69 = 0; var69 < var24; var69++) {
                var27[var69] = var27[var69 * 2 + 1];
            }
            for (let var70 = 0; var70 < var26; var70++) {
                var27[var4 - var70 * 2 - 1] = var27[var70 * 4];
                var27[var4 - var70 * 2 - 2] = var27[var70 * 4 + 1];
                var27[var4 - var25 - var70 * 2 - 1] = var27[var70 * 4 + 2];
                var27[var4 - var25 - var70 * 2 - 2] = var27[var70 * 4 + 3];
            }
            for (let var71 = 0; var71 < var26; var71++) {
                const var72 = var32[var71 * 2];
                const var73 = var32[var71 * 2 + 1];
                const var74 = var27[var24 + var71 * 2];
                const var75 = var27[var24 + var71 * 2 + 1];
                const var76 = var27[var4 - var71 * 2 - 2];
                const var77 = var27[var4 - var71 * 2 - 1];
                const var78 = var73 * (var74 - var76) + var72 * (var75 + var77);
                var27[var24 + var71 * 2] = (var74 + var76 + var78) * 0.5;
                var27[var4 - var71 * 2 - 2] = (var74 + var76 - var78) * 0.5;
                const var79 = var73 * (var75 + var77) - var72 * (var74 - var76);
                var27[var24 + var71 * 2 + 1] = (var75 + var79 - var77) * 0.5;
                var27[var4 - var71 * 2 - 1] = (var77 + var79 - var75) * 0.5;
            }
            for (let var80 = 0; var80 < var25; var80++) {
                var27[var80] = var27[var80 * 2 + var24] * var31[var80 * 2] + var27[var80 * 2 + var24 + 1] * var31[var80 * 2 + 1];
                var27[var24 - var80 - 1] = var27[var80 * 2 + var24] * var31[var80 * 2 + 1] - var27[var80 * 2 + var24 + 1] * var31[var80 * 2];
            }
            for (let var81 = 0; var81 < var25; var81++) {
                var27[var4 + var81 - var25] = -var27[var81];
            }
            for (let var82 = 0; var82 < var25; var82++) {
                var27[var82] = var27[var25 + var82];
            }
            for (let var83 = 0; var83 < var25; var83++) {
                var27[var25 + var83] = -var27[var25 - var83 - 1];
            }
            for (let var84 = 0; var84 < var25; var84++) {
                var27[var24 + var84] = var27[var4 - var84 - 1];
            }
            for (let var85 = var8; var85 < var9; var85++) {
                const var86 = Math.sin(((var85 - var8 + 0.5) / var10) * 0.5 * 3.141592653589793);
                JagVorbis.workBuffer[var85] *= Math.sin(var86 * 1.5707963267948966 * var86);
            }
            for (let var87 = var11; var87 < var12; var87++) {
                const var88 = Math.sin(((var87 - var11 + 0.5) / var13) * 0.5 * 3.141592653589793 + 1.5707963267948966);
                JagVorbis.workBuffer[var87] *= Math.sin(var88 * 1.5707963267948966 * var88);
            }
        }
        let var89: Float32Array | null = null;
        if (this.previousWindowSize > 0) {
            const var90 = (this.previousWindowSize + var4) >> 2;
            var89 = new Float32Array(var90);
            if (!this.previousWindowUnused) {
                for (let var91 = 0; var91 < this.previousWindowRightStart; var91++) {
                    const var92 = (this.previousWindowSize >> 1) + var91;
                    var89[var91] += this.previousWindow![var92];
                }
            }
            if (!var17) {
                for (let var93 = var8; var93 < var4 >> 1; var93++) {
                    const var94 = var89.length + var93 - (var4 >> 1);
                    var89[var94] += JagVorbis.workBuffer[var93];
                }
            }
        }
        const var95 = this.previousWindow;
        this.previousWindow = JagVorbis.workBuffer;
        JagVorbis.workBuffer = var95!;
        this.previousWindowSize = var4;
        this.previousWindowRightStart = var12 - (var4 >> 1);
        this.previousWindowUnused = var17;
        return var89;
    }

    // jag::oldscape::sound::JagVorbis::GetHeaders
    static getHeaders(arg0: Js5): boolean {
        if (!JagVorbis.gotHeaders) {
            const var1 = arg0.getFile(0, 0);
            if (var1 == null) {
                return false;
            }
            JagVorbis.processHeaders(var1);
            JagVorbis.gotHeaders = true;
        }
        return true;
    }

    // jag::oldscape::sound::JagVorbis::Load
    static load(arg0: Js5, arg1: number, arg2: number): JagVorbis | null {
        if (JagVorbis.getHeaders(arg0)) {
            const var3 = arg0.getFile(arg2, arg1);
            return var3 == null ? null : new JagVorbis(var3);
        } else {
            arg0.requestDownload(arg1, arg2);
            return null;
        }
    }

    constructor(arg0: Uint8Array) {
        super();
        this.decodeJagVorbis(arg0);
    }

    // jag::oldscape::sound::JagVorbis::ToWave
    toWave(arg0: Int32Array | number[] | null): Wave | null {
        if (arg0 != null && arg0[0] <= 0) {
            return null;
        }
        if (this.pcmData == null) {
            this.previousWindowSize = 0;
            this.previousWindow = new Float32Array(JagVorbis.blocksize1);
            this.pcmData = new Int8Array(this.sampleCount);
            this.pcmWritePosition = 0;
            this.currentPacketIndex = 0;
        }
        while (this.currentPacketIndex < this.audioPackets.length) {
            if (arg0 != null && arg0[0] <= 0) {
                return null;
            }
            const var2 = this.decodeAudioPacket(this.currentPacketIndex);
            if (var2 != null) {
                let var3 = this.pcmWritePosition;
                let var4 = var2.length;
                if (var4 > this.sampleCount - var3) {
                    var4 = this.sampleCount - var3;
                }
                for (let var5 = 0; var5 < var4; var5++) {
                    let var6 = (var2[var5] * 128.0 + 128.0) | 0;
                    if ((var6 & 0xffffff00) !== 0) {
                        var6 = ~var6 >> 31;
                    }
                    this.pcmData[var3++] = var6 - 128;
                }
                if (arg0 != null) {
                    arg0[0] -= var3 - this.pcmWritePosition;
                }
                this.pcmWritePosition = var3;
            }
            this.currentPacketIndex++;
        }
        this.previousWindow = null;
        const var7 = this.pcmData;
        this.pcmData = null;
        return new Wave(this.sampleRate, var7, this.loopStart, this.loopEnd, this.hasLoop);
    }
}
