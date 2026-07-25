import ByteArrayNode from '#/datastruct/ByteArrayNode.js';
import HashTable from '#/datastruct/HashTable.js';
import type Js5 from '#/js5/Js5.js';
import MidiFile from '#/midi2/MidiFile.js';
import MidiMixer from '#/midi2/MidiMixer.js';
import MidiNote from '#/midi2/MidiNote.js';
import MidiParser from '#/midi2/MidiParser.js';
import Patch from '#/midi2/Patch.js';
import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import WaveCache from '#/sound/WaveCache.js';
import WaveStream from '#/sound/WaveStream.js';

// jag::oldscape::midi2::MidiPlayer
export default class MidiPlayer extends PcmStream {
    readonly patches: HashTable<Patch> = new HashTable(128);
    globalVolume: number = 256;
    readonly tempoMicroseconds: number = 1000000;
    readonly channelExpression: Int32Array = new Int32Array(16);
    readonly channelPan: Int32Array = new Int32Array(16);
    readonly channelVolume: Int32Array = new Int32Array(16);
    readonly channelDefaultPatch: Int32Array = new Int32Array(16);
    readonly channelPatch: Int32Array = new Int32Array(16);
    readonly channelBank: Int32Array = new Int32Array(16);
    readonly channelPitchBend: Int32Array = new Int32Array(16);
    readonly channelModulation: Int32Array = new Int32Array(16);
    readonly channelPortamentoTime: Int32Array = new Int32Array(16);
    readonly channelEffects: Int32Array = new Int32Array(16);
    readonly channelParameterNumber: Int32Array = new Int32Array(16);
    readonly channelPitchBendRange: Int32Array = new Int32Array(16);
    readonly channelCustom1: Int32Array = new Int32Array(16);
    readonly channelCustom2: Int32Array = new Int32Array(16);
    readonly channelCustom3: Int32Array = new Int32Array(16);
    readonly channelNotes: (MidiNote | null)[][] = Array.from({ length: 16 }, () => new Array(128).fill(null));
    readonly channelSecondaryNotes: (MidiNote | null)[][] = Array.from({ length: 16 }, () => new Array(128).fill(null));
    readonly parser: MidiParser = new MidiParser();
    loop: boolean = false;
    track: number = 0;
    trackCurrentTick: number = 0;
    trackPreviousTime: bigint = 0n;
    trackCurrentTime: bigint = 0n;
    readonly patchStream: MidiMixer = new MidiMixer(this);

    constructor() {
        super();
        this.reset();
    }

    setGlobalVolume(arg0: number): void {
        this.globalVolume = arg0;
    }

    // jag::oldscape::midi2::MidiPlayer::GetGlobalVolume
    getGlobalVolume(): number {
        return this.globalVolume;
    }

    // jag::oldscape::midi2::MidiPlayer::LoadAndQueuePatches
    loadAndQueuePatches(arg0: WaveCache, arg1: MidiFile, arg2: Js5): boolean {
        arg1.method660();
        let var4 = true;
        const var5 = [22050];
        for (let var6 = arg1.patches!.search() as ByteArrayNode | null; var6 != null; var6 = arg1.patches!.findnext() as ByteArrayNode | null) {
            const var7 = Number(var6.key);
            let var8 = this.patches.find(BigInt(var7));
            if (var8 == null) {
                var8 = Patch.load(arg2, var7);
                if (var8 == null) {
                    var4 = false;
                    continue;
                }
                this.patches.put(BigInt(var7), var8);
            }
            if (!var8.loadWaves(var5, arg0, var6.data)) {
                var4 = false;
            }
        }
        if (var4) {
            arg1.method661();
        }
        return var4;
    }

    freeWaveIds(): void {
        for (let var1 = this.patches.search(); var1 != null; var1 = this.patches.findnext()) {
            var1.freeWaveIds();
        }
    }

    clearPatches(): void {
        for (let var1 = this.patches.search(); var1 != null; var1 = this.patches.findnext()) {
            var1.unlink();
        }
    }

    start(arg0: MidiFile, arg1: boolean): void {
        this.stop();
        this.parser.setMidi(arg0.midi);
        this.trackPreviousTime = 0n;
        this.loop = arg1;
        const var3 = this.parser.getTrackCount();
        for (let var4 = 0; var4 < var3; var4++) {
            this.parser.setTrack(var4);
            this.parser.processDeltaTime(var4);
            this.parser.unsetTrack(var4);
        }
        this.track = this.parser.nextTrackToPlay();
        this.trackCurrentTick = this.parser.trackCurrentTick![this.track];
        this.trackCurrentTime = this.parser.timeFromTick(this.trackCurrentTick);
    }

    stop(): void {
        this.parser.dropMidi();
        this.reset();
    }

    loaded(): boolean {
        return this.parser.gotMidi();
    }

    setChannelDefaultPatch(): void {
        this.setPatchAndBank();
    }

    setPatchAndBank(): void {
        this.channelDefaultPatch[9] = 128;
        this.channelBank[9] = 128;
        this.setInst(9, 128);
    }

    // jag::oldscape::midi2::MidiPlayer::SetInst
    setInst(arg0: number, arg1: number): void {
        if (arg1 !== this.channelPatch[arg0]) {
            this.channelPatch[arg0] = arg1;
            for (let var3 = 0; var3 < 128; var3++) {
                this.channelSecondaryNotes[arg0][var3] = null;
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::PlayNote
    playNote(arg0: number, arg1: number, arg2: number): void {
        this.stopNote(64, arg2, arg1);
        if ((this.channelEffects[arg1] & 0x2) !== 0) {
            for (let var4 = this.patchStream.queue.tail(); var4 != null; var4 = this.patchStream.queue.prev()) {
                if (var4.channel === arg1 && var4.releaseProgress < 0) {
                    this.channelNotes[arg1][var4.noteKey] = null;
                    this.channelNotes[arg1][arg2] = var4;
                    const var5 = var4.pitch + (Math.imul(var4.portamentoAmount, var4.portamentoDelta) >> 12);
                    var4.portamentoAmount = 4096;
                    var4.pitch += (arg2 - var4.noteKey) << 8;
                    var4.noteKey = arg2;
                    var4.portamentoDelta = var5 - var4.pitch;
                    return;
                }
            }
        }
        const var6 = this.patches.find(BigInt(this.channelPatch[arg1]));
        if (var6 == null) {
            return;
        }
        const var7 = var6.noteSound[arg2];
        if (var7 == null) {
            return;
        }
        const var8 = new MidiNote();
        var8.patch = var6;
        var8.channel = arg1;
        var8.sound = var7;
        var8.envelope = var6.noteEnvelope[arg2];
        var8.secondaryNote = var6.noteSecondaryNote[arg2];
        var8.noteKey = arg2;
        var8.volume = (Math.imul(Math.imul(Math.imul(arg0, arg0), var6.volume), var6.noteVolume[arg2]) + 1024) >> 11;
        var8.pan = var6.notePan[arg2] & 0xff;
        var8.pitch = (arg2 << 8) - (var6.notePitch[arg2] & 0x7fff);
        var8.releaseProgress = -1;
        var8.decayProgress = 0;
        var8.attackProgress = 0;
        var8.attackEnvelopeProgress = 0;
        var8.releaseEnvelopeProgress = 0;
        if (this.channelCustom1[arg1] === 0) {
            var8.stream = WaveStream.newRateFineVolPan(var7, this.getRateRaw(var8), this.getVolume(var8), this.getPan(var8));
        } else {
            var8.stream = WaveStream.newRateFineVolPan(var7, this.getRateRaw(var8), 0, this.getPan(var8));
            this.setSampleOffset(var8, var6.notePitch[arg2] < 0);
        }
        if (var6.notePitch[arg2] < 0) {
            var8.stream!.setLoopCount(-1);
        }
        if (var8.secondaryNote >= 0) {
            const var9 = this.channelSecondaryNotes[arg1][var8.secondaryNote];
            if (var9 != null && var9.releaseProgress < 0) {
                this.channelNotes[arg1][var9.noteKey] = null;
                var9.releaseProgress = 0;
            }
            this.channelSecondaryNotes[arg1][var8.secondaryNote] = var8;
        }
        this.patchStream.queue.push(var8);
        this.channelNotes[arg1][arg2] = var8;
    }

    // jag::oldscape::midi2::MidiPlayer::SetSampleOffset
    setSampleOffset(arg0: MidiNote, arg1: boolean): void {
        const var3 = arg0.sound!.samples.length;
        let var6;
        if (arg1 && arg0.sound!.loopReversed) {
            const var4 = var3 + var3 - arg0.sound!.loopStartPosition;
            const var5 = var3 << 8;
            var6 = Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(var4) * BigInt(this.channelCustom1[arg0.channel])) >> 6n));
            if (var5 <= var6) {
                arg0.stream!.method1111();
                var6 = (var5 + var5 - var6 - 1) | 0;
            }
        } else {
            var6 = Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(this.channelCustom1[arg0.channel]) * BigInt(var3)) >> 6n));
        }
        arg0.stream!.setPosition(var6);
    }

    // jag::oldscape::midi2::MidiPlayer::StopNote
    stopNote(arg0: number, arg1: number, arg2: number): void {
        const var4 = this.channelNotes[arg2][arg1];
        if (var4 == null) {
            return;
        }
        this.channelNotes[arg2][arg1] = null;
        if ((this.channelEffects[arg2] & 0x2) === 0) {
            var4.releaseProgress = 0;
            return;
        }
        for (let var5 = this.patchStream.queue.head(); var5 != null; var5 = this.patchStream.queue.next()) {
            if (var5.channel === var4.channel && var5.releaseProgress < 0 && var4 !== var5) {
                var4.releaseProgress = 0;
                return;
            }
        }
    }

    setPolyphonicKeyPressure(_arg0: number, _arg1: number, _arg2: number): void {}

    // jag::oldscape::midi2::MidiPlayer::ChannelPressure
    channelPressure(_arg0: number, _arg1: number): void {}

    // jag::oldscape::midi2::MidiPlayer::PitchWheel
    pitchWheel(arg0: number, arg1: number): void {
        this.channelPitchBend[arg0] = arg1;
    }

    // jag::oldscape::midi2::MidiPlayer::AllSoundOff
    allSoundOff(arg0: number): void {
        for (let var2 = this.patchStream.queue.head(); var2 != null; var2 = this.patchStream.queue.next()) {
            if (arg0 < 0 || var2.channel === arg0) {
                if (var2.stream != null) {
                    var2.stream.rampOut((PcmPlayer.frequency / 100) | 0);
                    if (var2.stream.isRamping()) {
                        this.patchStream.mixer.playStream(var2.stream);
                    }
                    var2.dropData();
                }
                if (var2.releaseProgress < 0) {
                    this.channelNotes[var2.channel][var2.noteKey] = null;
                }
                var2.unlink();
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::AllControllersOff
    allControllersOff(arg0: number): void {
        if (arg0 < 0) {
            for (let var2 = 0; var2 < 16; var2++) {
                this.allControllersOff(var2);
            }
            return;
        }
        this.channelVolume[arg0] = 12800;
        this.channelPan[arg0] = 8192;
        this.channelExpression[arg0] = 16383;
        this.channelPitchBend[arg0] = 8192;
        this.channelModulation[arg0] = 0;
        this.channelPortamentoTime[arg0] = 8192;
        this.cleanPorta(arg0);
        this.cleanRetrig(arg0);
        this.channelEffects[arg0] = 0;
        this.channelParameterNumber[arg0] = 32767;
        this.channelPitchBendRange[arg0] = 256;
        this.channelCustom1[arg0] = 0;
        this.setRetrigRate(8192, arg0);
    }

    // jag::oldscape::midi2::MidiPlayer::AllNotesOff
    allNotesOff(arg0: number): void {
        for (let var2 = this.patchStream.queue.head(); var2 != null; var2 = this.patchStream.queue.next()) {
            if ((arg0 < 0 || var2.channel === arg0) && var2.releaseProgress < 0) {
                this.channelNotes[var2.channel][var2.noteKey] = null;
                var2.releaseProgress = 0;
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::Reset
    reset(): void {
        this.allSoundOff(-1);
        this.allControllersOff(-1);
        for (let var1 = 0; var1 < 16; var1++) {
            this.channelPatch[var1] = this.channelDefaultPatch[var1];
        }
        for (let var2 = 0; var2 < 16; var2++) {
            this.channelBank[var2] = this.channelDefaultPatch[var2] & 0xffffff80;
        }
    }

    // jag::oldscape::midi2::MidiPlayer::CleanPorta
    cleanPorta(arg0: number): void {
        if ((this.channelEffects[arg0] & 0x2) === 0) {
            return;
        }
        for (let var2 = this.patchStream.queue.head(); var2 != null; var2 = this.patchStream.queue.next()) {
            if (var2.channel === arg0 && this.channelNotes[arg0][var2.noteKey] == null && var2.releaseProgress < 0) {
                var2.releaseProgress = 0;
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::CleanRetrig
    cleanRetrig(arg0: number): void {
        if ((this.channelEffects[arg0] & 0x4) === 0) {
            return;
        }
        for (let var2 = this.patchStream.queue.head(); var2 != null; var2 = this.patchStream.queue.next()) {
            if (arg0 === var2.channel) {
                var2.field1766 = 0;
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::ProcessMidi
    processMidi(arg0: number): void {
        const var2 = arg0 & 0xf0;
        if (var2 === 128) {
            const var3 = (arg0 >> 16) & 0x7f;
            const var4 = arg0 & 0xf;
            const var5 = (arg0 >> 8) & 0x7f;
            this.stopNote(var3, var5, var4);
        } else if (var2 === 144) {
            const var6 = (arg0 >> 8) & 0x7f;
            const var7 = arg0 & 0xf;
            const var8 = (arg0 >> 16) & 0x7f;
            if (var8 > 0) {
                this.playNote(var8, var7, var6);
            } else {
                this.stopNote(64, var6, var7);
            }
        } else if (var2 === 160) {
            const var9 = arg0 & 0xf;
            const var10 = (arg0 >> 16) & 0x7f;
            const var11 = (arg0 >> 8) & 0x7f;
            this.setPolyphonicKeyPressure(var10, var11, var9);
        } else if (var2 === 176) {
            const var12 = (arg0 >> 8) & 0x7f;
            const var13 = arg0 & 0xf;
            const var14 = (arg0 >> 16) & 0x7f;
            if (var12 === 0) {
                this.channelBank[var13] = (this.channelBank[var13] & 0xffe03fff) + (var14 << 14);
            }
            if (var12 === 32) {
                this.channelBank[var13] = (this.channelBank[var13] & 0xffffc07f) + (var14 << 7);
            }
            if (var12 === 1) {
                this.channelModulation[var13] = (var14 << 7) + (this.channelModulation[var13] & 0xffffc07f);
            }
            if (var12 === 33) {
                this.channelModulation[var13] = var14 + (this.channelModulation[var13] & 0xffffff80);
            }
            if (var12 === 5) {
                this.channelPortamentoTime[var13] = (var14 << 7) + (this.channelPortamentoTime[var13] & 0xffffc07f);
            }
            if (var12 === 37) {
                this.channelPortamentoTime[var13] = (this.channelPortamentoTime[var13] & 0xffffff80) + var14;
            }
            if (var12 === 7) {
                this.channelVolume[var13] = (var14 << 7) + (this.channelVolume[var13] & 0xffffc07f);
            }
            if (var12 === 39) {
                this.channelVolume[var13] = (this.channelVolume[var13] & 0xffffff80) + var14;
            }
            if (var12 === 10) {
                this.channelPan[var13] = (var14 << 7) + (this.channelPan[var13] & 0xffffc07f);
            }
            if (var12 === 42) {
                this.channelPan[var13] = var14 + (this.channelPan[var13] & 0xffffff80);
            }
            if (var12 === 11) {
                this.channelExpression[var13] = (var14 << 7) + (this.channelExpression[var13] & 0xffffc07f);
            }
            if (var12 === 43) {
                this.channelExpression[var13] = (this.channelExpression[var13] & 0xffffff80) + var14;
            }
            if (var12 === 64) {
                if (var14 < 64) {
                    this.channelEffects[var13] &= 0xfffffffe;
                } else {
                    this.channelEffects[var13] |= 0x1;
                }
            }
            if (var12 === 65) {
                if (var14 >= 64) {
                    this.channelEffects[var13] |= 0x2;
                } else {
                    this.cleanPorta(var13);
                    this.channelEffects[var13] &= 0xfffffffd;
                }
            }
            if (var12 === 99) {
                this.channelParameterNumber[var13] = (this.channelParameterNumber[var13] & 0x7f) + (var14 << 7);
            }
            if (var12 === 98) {
                this.channelParameterNumber[var13] = var14 + (this.channelParameterNumber[var13] & 0x3f80);
            }
            if (var12 === 101) {
                this.channelParameterNumber[var13] = (var14 << 7) + (this.channelParameterNumber[var13] & 0x7f) + 16384;
            }
            if (var12 === 100) {
                this.channelParameterNumber[var13] = (this.channelParameterNumber[var13] & 0x3f80) + var14 + 16384;
            }
            if (var12 === 120) {
                this.allSoundOff(var13);
            }
            if (var12 === 121) {
                this.allControllersOff(var13);
            }
            if (var12 === 123) {
                this.allNotesOff(var13);
            }
            if (var12 === 6) {
                const var15 = this.channelParameterNumber[var13];
                if (var15 === 16384) {
                    this.channelPitchBendRange[var13] = (var14 << 7) + (this.channelPitchBendRange[var13] & 0xffffc07f);
                }
            }
            if (var12 === 38) {
                const var16 = this.channelParameterNumber[var13];
                if (var16 === 16384) {
                    this.channelPitchBendRange[var13] = var14 + (this.channelPitchBendRange[var13] & 0xffffff80);
                }
            }
            if (var12 === 16) {
                this.channelCustom1[var13] = (this.channelCustom1[var13] & 0xffffc07f) + (var14 << 7);
            }
            if (var12 === 48) {
                this.channelCustom1[var13] = (this.channelCustom1[var13] & 0xffffff80) + var14;
            }
            if (var12 === 81) {
                if (var14 >= 64) {
                    this.channelEffects[var13] |= 0x4;
                } else {
                    this.cleanRetrig(var13);
                    this.channelEffects[var13] &= 0xfffffffb;
                }
            }
            if (var12 === 17) {
                this.setRetrigRate((this.channelCustom2[var13] & 0xffffc07f) + (var14 << 7), var13);
            }
            if (var12 === 49) {
                this.setRetrigRate((this.channelCustom2[var13] & 0xffffff80) + var14, var13);
            }
        } else if (var2 === 192) {
            const var17 = (arg0 >> 8) & 0x7f;
            const var18 = arg0 & 0xf;
            this.setInst(var18, this.channelBank[var18] + var17);
        } else if (var2 === 208) {
            const var19 = arg0 & 0xf;
            const var20 = (arg0 >> 8) & 0x7f;
            this.channelPressure(var20, var19);
        } else if (var2 === 224) {
            const var21 = arg0 & 0xf;
            const var22 = ((arg0 >> 8) & 0x7f) + ((arg0 & 0x7f018f) >> 9);
            this.pitchWheel(var21, var22);
        } else {
            const var23 = arg0 & 0xff;
            if (var23 === 255) {
                this.reset();
            }
        }
    }

    // jag::oldscape::midi2::MidiPlayer::SetRetrigRate
    setRetrigRate(arg0: number, arg1: number): void {
        this.channelCustom2[arg1] = arg0;
        this.channelCustom3[arg1] = (Math.pow(2.0, arg0 * 5.4931640625e-4) * 2097152.0 + 0.5) | 0;
    }

    // jag::oldscape::midi2::MidiPlayer::GetRateRaw
    getRateRaw(arg0: MidiNote): number {
        const var2 = arg0.pitch + (Math.imul(arg0.portamentoDelta, arg0.portamentoAmount) >> 12);
        let var3 = var2 + (Math.imul(this.channelPitchBendRange[arg0.channel], this.channelPitchBend[arg0.channel] - 8192) >> 12);
        const var4 = arg0.envelope!;
        if (var4.vibratoFrequency > 0 && (var4.vibratoAmplitude > 0 || this.channelModulation[arg0.channel] > 0)) {
            let var5 = var4.vibratoAmplitude << 2;
            const var6 = var4.vibratoRampTime << 1;
            if (var6 > arg0.vibratoRampProgress) {
                var5 = (Math.imul(var5, arg0.vibratoRampProgress) / var6) | 0;
            }
            const var7 = var5 + (this.channelModulation[arg0.channel] >> 7);
            const var8 = Math.sin((arg0.vibratoProgress & 0x1ff) * 0.01227184630308513);
            var3 += (var7 * var8) | 0;
        }
        const var10 = ((Math.imul(arg0.sound!.samplingFrequency, 256) * Math.pow(2.0, var3 * 3.255208333333333e-4)) / PcmPlayer.frequency + 0.5) | 0;
        return var10 >= 1 ? var10 : 1;
    }

    // jag::oldscape::midi2::MidiPlayer::GetVolume
    getVolume(arg0: MidiNote): number {
        const var2 = arg0.envelope!;
        const var3 = (Math.imul(this.channelExpression[arg0.channel], this.channelVolume[arg0.channel]) + 4096) >> 13;
        const var4 = (Math.imul(var3, var3) + 16384) >> 15;
        const var5 = (Math.imul(var4, arg0.volume) + 16384) >> 15;
        let var6 = (Math.imul(this.globalVolume, var5) + 128) >> 8;
        if (var2.decayVolume > 0) {
            var6 = (var6 * Math.pow(0.5, var2.decayVolume * arg0.decayProgress * 1.953125e-5) + 0.5) | 0;
        }
        if (var2.attackVolume != null) {
            const var7 = arg0.attackEnvelopeProgress;
            let var8 = var2.attackVolume[arg0.releaseEnvelopeProgress + 1];
            if (arg0.releaseEnvelopeProgress < var2.attackVolume.length - 2) {
                const var9 = (var2.attackVolume[arg0.releaseEnvelopeProgress] & 0xff) << 8;
                const var10 = (var2.attackVolume[arg0.releaseEnvelopeProgress + 2] & 0xff) << 8;
                if (var10 - var9 === 0) {
                    throw new Error();
                }
                var8 += (Math.imul(var2.attackVolume[arg0.releaseEnvelopeProgress + 3] - var8, var7 - var9) / (var10 - var9)) | 0;
            }
            var6 = (Math.imul(var8, var6) + 32) >> 6;
        }
        if (arg0.releaseProgress > 0 && var2.releaseVolume != null) {
            let var11 = var2.releaseVolume[arg0.attackProgress + 1];
            const var12 = arg0.releaseProgress;
            if (arg0.attackProgress < var2.releaseVolume.length - 2) {
                const var13 = (var2.releaseVolume[arg0.attackProgress + 2] & 0xff) << 8;
                const var14 = (var2.releaseVolume[arg0.attackProgress] & 0xff) << 8;
                if (var13 - var14 === 0) {
                    throw new Error();
                }
                var11 += (Math.imul(var2.releaseVolume[arg0.attackProgress + 3] - var11, var12 - var14) / (var13 - var14)) | 0;
            }
            var6 = (Math.imul(var11, var6) + 32) >> 6;
        }
        return var6;
    }

    // jag::oldscape::midi2::MidiPlayer::GetPan
    getPan(arg0: MidiNote): number {
        const var2 = this.channelPan[arg0.channel];
        return var2 >= 8192 ? 16384 - ((Math.imul(16384 - var2, -arg0.pan + 128) + 32) >> 6) : (Math.imul(var2, arg0.pan) + 32) >> 6;
    }

    override substreamStart(): PcmStream | null {
        return this.patchStream;
    }

    override substreamNext(): PcmStream | null {
        return null;
    }

    override selfMixCost(): number {
        return 0;
    }

    // jag::oldscape::midi2::MidiPlayer::DoMix
    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        if (this.parser.gotMidi()) {
            const var4 = (Math.imul(this.parser.division, this.tempoMicroseconds) / PcmPlayer.frequency) | 0;
            do {
                const var5 = BigInt.asIntN(64, this.trackPreviousTime + BigInt.asIntN(64, BigInt(arg2) * BigInt(var4)));
                if (this.trackCurrentTime - var5 >= 0n) {
                    this.trackPreviousTime = var5;
                    break;
                }
                const var7 = Number((this.trackCurrentTime + BigInt(var4) - this.trackPreviousTime - 1n) / BigInt(var4));
                this.trackPreviousTime = BigInt.asIntN(64, this.trackPreviousTime + BigInt.asIntN(64, BigInt(var4) * BigInt(var7)));
                this.patchStream.doMix(arg0, arg1, var7);
                arg1 += var7;
                arg2 -= var7;
                this.updateMidi();
            } while (this.parser.gotMidi());
        }
        this.patchStream.doMix(arg0, arg1, arg2);
    }

    // jag::oldscape::midi2::MidiPlayer::PretendToMix
    override pretendToMix(arg0: number): void {
        if (this.parser.gotMidi()) {
            const var2 = (Math.imul(this.parser.division, this.tempoMicroseconds) / PcmPlayer.frequency) | 0;
            do {
                const var3 = BigInt.asIntN(64, BigInt.asIntN(64, BigInt(var2) * BigInt(arg0)) + this.trackPreviousTime);
                if (this.trackCurrentTime - var3 >= 0n) {
                    this.trackPreviousTime = var3;
                    break;
                }
                const var5 = Number((BigInt(var2) + this.trackCurrentTime - this.trackPreviousTime - 1n) / BigInt(var2));
                this.trackPreviousTime = BigInt.asIntN(64, this.trackPreviousTime + BigInt.asIntN(64, BigInt(var2) * BigInt(var5)));
                arg0 -= var5;
                this.patchStream.pretendToMix(var5);
                this.updateMidi();
            } while (this.parser.gotMidi());
        }
        this.patchStream.pretendToMix(arg0);
    }

    // jag::oldscape::midi2::MidiPlayer::UpdateMidi
    updateMidi(): void {
        let var1 = this.trackCurrentTick;
        let var2 = this.track;
        let var3 = this.trackCurrentTime;
        while (var1 === this.trackCurrentTick) {
            while (this.parser.trackCurrentTick![var2] === var1) {
                this.parser.setTrack(var2);
                const var5 = this.parser.getEvent(var2);
                if (var5 === 1) {
                    this.parser.finishTrack();
                    this.parser.unsetTrack(var2);
                    if (this.parser.allTracksFinished()) {
                        if (!this.loop || var1 === 0) {
                            this.reset();
                            this.parser.dropMidi();
                            return;
                        }
                        this.parser.restart(var3);
                    }
                    break;
                }
                if ((var5 & 0x80) !== 0) {
                    this.processMidi(var5);
                }
                this.parser.processDeltaTime(var2);
                this.parser.unsetTrack(var2);
            }
            var2 = this.parser.nextTrackToPlay();
            var1 = this.parser.trackCurrentTick![var2];
            var3 = this.parser.timeFromTick(var1);
        }
        this.track = var2;
        this.trackCurrentTick = var1;
        this.trackCurrentTime = var3;
    }

    // jag::oldscape::midi2::MidiPlayer::UpdateStreamlessNote
    updateStreamlessNote(arg0: MidiNote): boolean {
        if (arg0.stream != null) {
            return false;
        }
        if (arg0.releaseProgress >= 0) {
            arg0.unlink();
            if (arg0.secondaryNote > 0 && arg0 === this.channelSecondaryNotes[arg0.channel][arg0.secondaryNote]) {
                this.channelSecondaryNotes[arg0.channel][arg0.secondaryNote] = null;
            }
        }
        return true;
    }

    // jag::oldscape::midi2::MidiPlayer::UpdateNote
    updateNote(arg0: Int32Array | number[] | null, arg1: number, arg2: number, arg3: MidiNote): boolean {
        arg3.volumeChangeDuration = (PcmPlayer.frequency / 100) | 0;
        if (arg3.releaseProgress >= 0 && (arg3.stream == null || arg3.stream.isFinished())) {
            arg3.dropData();
            arg3.unlink();
            if (arg3.secondaryNote > 0 && arg3 === this.channelSecondaryNotes[arg3.channel][arg3.secondaryNote]) {
                this.channelSecondaryNotes[arg3.channel][arg3.secondaryNote] = null;
            }
            return true;
        }
        const var5 = arg3.portamentoAmount;
        let var6 = false;
        if (var5 > 0) {
            let var7 = var5 - ((Math.pow(2.0, this.channelPortamentoTime[arg3.channel] * 4.921259842519685e-4) * 16.0 + 0.5) | 0);
            if (var7 < 0) {
                var7 = 0;
            }
            arg3.portamentoAmount = var7;
        }
        arg3.stream!.setRateRaw(this.getRateRaw(arg3));
        const var8 = arg3.envelope!;
        arg3.vibratoRampProgress++;
        const var9 = ((Math.imul(arg3.portamentoAmount, arg3.portamentoDelta) >> 12) + ((arg3.noteKey - 60) << 8)) * 5.086263020833333e-6;
        arg3.vibratoProgress += var8.vibratoFrequency;
        if (var8.decayVolume > 0) {
            if (var8.decaySpeed > 0) {
                arg3.decayProgress += (Math.pow(2.0, var9 * var8.decaySpeed) * 128.0 + 0.5) | 0;
            } else {
                arg3.decayProgress += 128;
            }
            if (Math.imul(var8.decayVolume, arg3.decayProgress) >= 819200) {
                var6 = true;
            }
        }
        if (var8.attackVolume != null) {
            if (var8.attackSpeed <= 0) {
                arg3.attackEnvelopeProgress += 128;
            } else {
                arg3.attackEnvelopeProgress += (Math.pow(2.0, var9 * var8.attackSpeed) * 128.0 + 0.5) | 0;
            }
            while (var8.attackVolume.length - 2 > arg3.releaseEnvelopeProgress && arg3.attackEnvelopeProgress > (var8.attackVolume[arg3.releaseEnvelopeProgress + 2] & 0xff) << 8) {
                arg3.releaseEnvelopeProgress += 2;
            }
            if (arg3.releaseEnvelopeProgress === var8.attackVolume.length - 2 && var8.attackVolume[arg3.releaseEnvelopeProgress + 1] === 0) {
                var6 = true;
            }
        }
        if (arg3.releaseProgress >= 0 && var8.releaseVolume != null && (this.channelEffects[arg3.channel] & 0x1) === 0 && (arg3.secondaryNote < 0 || arg3 !== this.channelSecondaryNotes[arg3.channel][arg3.secondaryNote])) {
            if (var8.releaseSpeed > 0) {
                arg3.releaseProgress += (Math.pow(2.0, var9 * var8.releaseSpeed) * 128.0 + 0.5) | 0;
            } else {
                arg3.releaseProgress += 128;
            }
            while (var8.releaseVolume.length - 2 > arg3.attackProgress && (var8.releaseVolume[arg3.attackProgress + 2] & 0xff) << 8 < arg3.releaseProgress) {
                arg3.attackProgress += 2;
            }
            if (var8.releaseVolume.length - 2 === arg3.attackProgress) {
                var6 = true;
            }
        }
        if (!var6) {
            arg3.stream!.rampVolPanFine(arg3.volumeChangeDuration, this.getVolume(arg3), this.getPan(arg3));
            return false;
        }
        arg3.stream!.rampOut(arg3.volumeChangeDuration);
        if (arg0 == null) {
            arg3.stream!.pretendToMix(arg1);
        } else {
            arg3.stream!.doMix(arg0, arg2, arg1);
        }
        if (arg3.stream!.isRamping()) {
            this.patchStream.mixer.playStream(arg3.stream!);
        }
        arg3.dropData();
        if (arg3.releaseProgress >= 0) {
            arg3.unlink();
            if (arg3.secondaryNote > 0 && arg3 === this.channelSecondaryNotes[arg3.channel][arg3.secondaryNote]) {
                this.channelSecondaryNotes[arg3.channel][arg3.secondaryNote] = null;
            }
        }
        return true;
    }
}
