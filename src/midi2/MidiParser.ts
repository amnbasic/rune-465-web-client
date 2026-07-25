import Packet from '#/io/Packet.js';

// jag::oldscape::midi2::MidiParser
export default class MidiParser {
    readonly packet: Packet = new Packet(0);
    division: number = 0;
    trackStartPos: Int32Array | null = null;
    trackCurrentPos: Int32Array | null = null;
    trackCurrentTick: Int32Array | null = null;
    trackCurrentStatus: Int32Array | null = null;
    tempo: number = 0;
    baseTime: bigint = 0n;

    // jag::oldscape::midi2::MidiParser::m_msgLen
    static readonly msgLen: Int8Array = Int8Array.from([
        2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
        1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 0, 1, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0
    ]);

    constructor(arg0?: Uint8Array) {
        this.packet.data = null!;
        if (arg0 !== undefined) {
            this.setMidi(arg0);
        }
    }

    // jag::oldscape::midi2::MidiParser::SetMidi
    setMidi(arg0: Uint8Array): void {
        this.packet.data = arg0;
        this.packet.pos = 10;
        const var2 = this.packet.g2();
        this.division = this.packet.g2();
        this.tempo = 500000;
        this.trackStartPos = new Int32Array(var2);
        let var3 = 0;
        while (var3 < var2) {
            const var4 = this.packet.g4();
            const var5 = this.packet.g4();
            if (var4 === 1297379947) {
                this.trackStartPos[var3] = this.packet.pos;
                var3++;
            }
            this.packet.pos += var5;
        }
        this.baseTime = 0n;
        this.trackCurrentPos = new Int32Array(var2);
        for (let var6 = 0; var6 < var2; var6++) {
            this.trackCurrentPos[var6] = this.trackStartPos[var6];
        }
        this.trackCurrentTick = new Int32Array(var2);
        this.trackCurrentStatus = new Int32Array(var2);
    }

    // jag::oldscape::midi2::MidiParser::DropMidi
    dropMidi(): void {
        this.packet.data = null!;
        this.trackStartPos = null;
        this.trackCurrentPos = null;
        this.trackCurrentTick = null;
        this.trackCurrentStatus = null;
    }

    // jag::oldscape::midi2::MidiParser::GotMidi
    gotMidi(): boolean {
        return this.packet.data !== null;
    }

    getTrackCount(): number {
        return this.trackCurrentPos!.length;
    }

    // jag::oldscape::midi2::MidiParser::SetTrack
    setTrack(arg0: number): void {
        this.packet.pos = this.trackCurrentPos![arg0];
    }

    // jag::oldscape::midi2::MidiParser::UnsetTrack
    unsetTrack(arg0: number): void {
        this.trackCurrentPos![arg0] = this.packet.pos;
    }

    // jag::oldscape::midi2::MidiParser::FinishTrack
    finishTrack(): void {
        this.packet.pos = -1;
    }

    // jag::oldscape::midi2::MidiParser::ProcessDeltaTime
    processDeltaTime(arg0: number): void {
        const var2 = this.packet.gMidiVarLen();
        this.trackCurrentTick![arg0] += var2;
    }

    // jag::oldscape::midi2::MidiParser::GetEvent
    getEvent(arg0: number): number {
        return this.getEvent2(arg0);
    }

    // jag::oldscape::midi2::MidiParser::GetEvent2
    getEvent2(arg0: number): number {
        const var2 = (this.packet.data[this.packet.pos] << 24) >> 24;
        let var3;
        if (var2 < 0) {
            var3 = var2 & 0xff;
            this.trackCurrentStatus![arg0] = var3;
            this.packet.pos++;
        } else {
            var3 = this.trackCurrentStatus![arg0];
        }
        if (var3 !== 240 && var3 !== 247) {
            return this.getEvent3(arg0, var3);
        }
        const var4 = this.packet.gMidiVarLen();
        if (var3 === 247 && var4 > 0) {
            const var5 = this.packet.data[this.packet.pos] & 0xff;
            if ((var5 >= 241 && var5 <= 243) || var5 === 246 || var5 === 248 || (var5 >= 250 && var5 <= 252) || var5 === 254) {
                this.packet.pos++;
                this.trackCurrentStatus![arg0] = var5;
                return this.getEvent3(arg0, var5);
            }
        }
        this.packet.pos += var4;
        return 0;
    }

    // jag::oldscape::midi2::MidiParser::GetEvent3
    getEvent3(arg0: number, arg1: number): number {
        if (arg1 !== 255) {
            const var7 = MidiParser.msgLen[arg1 - 128];
            let var8 = arg1;
            if (var7 >= 1) {
                var8 = arg1 | (this.packet.g1() << 8);
            }
            if (var7 >= 2) {
                var8 |= this.packet.g1() << 16;
            }
            return var8;
        }
        const var3 = this.packet.g1();
        let var4 = this.packet.gMidiVarLen();
        if (var3 === 47) {
            this.packet.pos += var4;
            return 1;
        } else if (var3 === 81) {
            const var5 = this.packet.g3();
            var4 -= 3;
            const var6 = this.trackCurrentTick![arg0];
            this.baseTime = BigInt.asIntN(64, this.baseTime + BigInt.asIntN(64, BigInt(var6) * BigInt(this.tempo - var5)));
            this.tempo = var5;
            this.packet.pos += var4;
            return 2;
        } else {
            this.packet.pos += var4;
            return 3;
        }
    }

    // jag::oldscape::midi2::MidiParser::TimeFromTick
    timeFromTick(arg0: number): bigint {
        return BigInt.asIntN(64, this.baseTime + BigInt.asIntN(64, BigInt(arg0) * BigInt(this.tempo)));
    }

    // jag::oldscape::midi2::MidiParser::NextTrackToPlay
    nextTrackToPlay(): number {
        const var1 = this.trackCurrentPos!.length;
        let var2 = -1;
        let var3 = 2147483647;
        for (let var4 = 0; var4 < var1; var4++) {
            if (this.trackCurrentPos![var4] >= 0 && this.trackCurrentTick![var4] < var3) {
                var2 = var4;
                var3 = this.trackCurrentTick![var4];
            }
        }
        return var2;
    }

    // jag::oldscape::midi2::MidiParser::AllTracksFinished
    allTracksFinished(): boolean {
        const var1 = this.trackCurrentPos!.length;
        for (let var2 = 0; var2 < var1; var2++) {
            if (this.trackCurrentPos![var2] >= 0) {
                return false;
            }
        }
        return true;
    }

    // jag::oldscape::midi2::MidiParser::Restart
    restart(arg0: bigint): void {
        this.baseTime = arg0;
        const var3 = this.trackCurrentPos!.length;
        for (let var4 = 0; var4 < var3; var4++) {
            this.trackCurrentTick![var4] = 0;
            this.trackCurrentStatus![var4] = 0;
            this.packet.pos = this.trackStartPos![var4];
            this.processDeltaTime(var4);
            this.trackCurrentPos![var4] = this.packet.pos;
        }
    }
}
