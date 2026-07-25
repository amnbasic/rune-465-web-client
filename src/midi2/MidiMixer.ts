import LinkList from '#/datastruct/LinkList.js';
import MidiNote from '#/midi2/MidiNote.js';
import MidiPlayer from '#/midi2/MidiPlayer.js';
import Mixer from '#/sound/Mixer.js';
import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import WaveStream from '#/sound/WaveStream.js';

// jag::oldscape::midi2::MidiMixer
export default class MidiMixer extends PcmStream {
    readonly midiPlayer: MidiPlayer;
    readonly queue: LinkList<MidiNote> = new LinkList();
    readonly mixer: Mixer = new Mixer();

    constructor(arg0: MidiPlayer) {
        super();
        this.midiPlayer = arg0;
    }

    // jag::oldscape::midi2::MidiMixer::SubstreamStart
    override substreamStart(): PcmStream | null {
        const var1 = this.queue.head();
        if (var1 == null) {
            return null;
        } else if (var1.stream == null) {
            return this.substreamNext();
        } else {
            return var1.stream;
        }
    }

    // jag::oldscape::midi2::MidiMixer::SubstreamNext
    override substreamNext(): PcmStream | null {
        let var1;
        do {
            var1 = this.queue.next();
            if (var1 == null) {
                return null;
            }
        } while (var1.stream == null);
        return var1.stream;
    }

    // jag::oldscape::midi2::MidiMixer::SelfMixCost
    override selfMixCost(): number {
        return 0;
    }

    // jag::oldscape::midi2::MidiMixer::DoMix
    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        this.mixer.doMix(arg0, arg1, arg2);
        for (let var4 = this.queue.head(); var4 != null; var4 = this.queue.next()) {
            if (!this.midiPlayer.updateStreamlessNote(var4)) {
                let var5 = arg2;
                let var6 = arg1;
                do {
                    if (var4.volumeChangeDuration >= var5) {
                        this.doMix2(var5, arg0, var6 + var5, var4, var6);
                        var4.volumeChangeDuration -= var5;
                        break;
                    }
                    this.doMix2(var4.volumeChangeDuration, arg0, var5 + var6, var4, var6);
                    var5 -= var4.volumeChangeDuration;
                    var6 += var4.volumeChangeDuration;
                } while (!this.midiPlayer.updateNote(arg0, var5, var6, var4));
            }
        }
    }

    // jag::oldscape::midi2::MidiMixer::PretendToMix
    override pretendToMix(arg0: number): void {
        this.mixer.pretendToMix(arg0);
        for (let var2 = this.queue.head(); var2 != null; var2 = this.queue.next()) {
            if (!this.midiPlayer.updateStreamlessNote(var2)) {
                let var3 = arg0;
                do {
                    if (var2.volumeChangeDuration >= var3) {
                        this.pretendToMix2(var3, var2);
                        var2.volumeChangeDuration -= var3;
                        break;
                    }
                    this.pretendToMix2(var2.volumeChangeDuration, var2);
                    var3 -= var2.volumeChangeDuration;
                } while (!this.midiPlayer.updateNote(null, var3, 0, var2));
            }
        }
    }

    // jag::oldscape::midi2::MidiMixer::DoMix2
    doMix2(arg0: number, arg1: Int32Array | number[], arg2: number, arg3: MidiNote, arg4: number): void {
        if ((this.midiPlayer.channelEffects[arg3.channel] & 0x4) !== 0 && arg3.releaseProgress < 0) {
            const var6 = (this.midiPlayer.channelCustom3[arg3.channel] / PcmPlayer.frequency) | 0;
            if (var6 === 0) {
                throw new Error();
            }
            while (true) {
                const var7 = ((var6 + 1048575 - arg3.field1766) / var6) | 0;
                if (var7 > arg0) {
                    arg3.field1766 = (arg3.field1766 + Math.imul(arg0, var6)) | 0;
                    break;
                }
                arg0 -= var7;
                arg3.stream!.doMix(arg1, arg4, var7);
                let var8 = (PcmPlayer.frequency / 100) | 0;
                arg3.field1766 = (arg3.field1766 + Math.imul(var6, var7) - 1048576) | 0;
                const var9 = (262144 / var6) | 0;
                const var10 = arg3.stream!;
                if (var9 < var8) {
                    var8 = var9;
                }
                if (this.midiPlayer.channelCustom1[arg3.channel] === 0) {
                    arg3.stream = WaveStream.newRateFineVolPan(arg3.sound!, var10.getRateRaw(), var10.getVolumeFine(), var10.getPanFine());
                } else {
                    arg3.stream = WaveStream.newRateFineVolPan(arg3.sound!, var10.getRateRaw(), 0, var10.getPanFine());
                    this.midiPlayer.setSampleOffset(arg3, arg3.patch!.notePitch[arg3.noteKey] < 0);
                    arg3.stream!.rampVolumeFine(var8, var10.getVolumeFine());
                }
                arg4 += var7;
                if (arg3.patch!.notePitch[arg3.noteKey] < 0) {
                    arg3.stream!.setLoopCount(-1);
                }
                var10.rampOut(var8);
                var10.doMix(arg1, arg4, arg2 - arg4);
                if (var10.isRamping()) {
                    this.mixer.playStream(var10);
                }
            }
        }
        arg3.stream!.doMix(arg1, arg4, arg0);
    }

    // jag::oldscape::midi2::MidiMixer::PretendToMix2
    pretendToMix2(arg0: number, arg1: MidiNote): void {
        if ((this.midiPlayer.channelEffects[arg1.channel] & 0x4) !== 0 && arg1.releaseProgress < 0) {
            const var3 = (this.midiPlayer.channelCustom3[arg1.channel] / PcmPlayer.frequency) | 0;
            if (var3 === 0) {
                throw new Error();
            }
            const var4 = ((var3 + 1048575 - arg1.field1766) / var3) | 0;
            arg1.field1766 = (arg1.field1766 + Math.imul(arg0, var3)) & 0xfffff;
            if (arg0 >= var4) {
                if (this.midiPlayer.channelCustom1[arg1.channel] === 0) {
                    arg1.stream = WaveStream.newRateFineVolPan(arg1.sound!, arg1.stream!.getRateRaw(), arg1.stream!.getVolumeFine(), arg1.stream!.getPanFine());
                } else {
                    arg1.stream = WaveStream.newRateFineVolPan(arg1.sound!, arg1.stream!.getRateRaw(), 0, arg1.stream!.getPanFine());
                    this.midiPlayer.setSampleOffset(arg1, arg1.patch!.notePitch[arg1.noteKey] < 0);
                }
                if (arg1.patch!.notePitch[arg1.noteKey] < 0) {
                    arg1.stream!.setLoopCount(-1);
                }
                arg0 = (arg1.field1766 / var3) | 0;
            }
        }
        arg1.stream!.pretendToMix(arg0);
    }
}
