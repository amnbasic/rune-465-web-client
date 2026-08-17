import PcmStream from '#/sound/PcmStream.js';
import type AudioThread from '#/sound/AudioThread.js';
import ArrayUtil from '#/util/ArrayUtil.js';
import MonotonicTime from '#/util/MonotonicTime.js';

// jag::oldscape::sound::PCMPlayer
export default class PcmPlayer {
    // jag::oldscape::sound::PCMPlayer::m_frequency
    static frequency: number = 0;

    static stereo: boolean = false;
    static threadPriority: number = 0;
    static thread: AudioThread | null = null; // field2738
    samples: Int32Array | null = null;
    stream: PcmStream | null = null;
    readonly maxMixCost: number = 32;
    lastPlayTime: number = Date.now();
    capacity: number = 0;
    initialTargetSampledQueued: number = 0;
    additionalTargetSamplesQueued: number = 0;
    reopenTime: number = 0;
    maxAccepted: number = 0;
    previousMaxAccepted: number = 0;
    previousQueued: number = 0;
    nextAcceptedCheckTime: number = 0;
    skipAcceptedCheck: boolean = true;
    samplesUntilMix: number = 0;
    readonly priorityQueueHeads: (PcmStream | null)[] = new Array(8).fill(null);
    readonly priorityQueueTails: (PcmStream | null)[] = new Array(8).fill(null);

    // custom: increased samples for web throttling
    backgroundTargetSamplesQueued: number = 0;
    // custom: true while the deep background buffer is in force, so cycle() can tear it
    // back down on the first foreground tick instead of leaving it latched forever.
    wasBackgrounded: boolean = false;

    static init(arg0: boolean): void {
        PcmPlayer.frequency = 22050;
        PcmPlayer.stereo = arg0;
        PcmPlayer.threadPriority = 2;
    }

    static getPlayer(_arg0: number, _arg1: unknown, arg3: number): PcmPlayer {
        if (PcmPlayer.frequency === 0) {
            throw new Error();
        }
        const player = new WebPcmPlayer();
        player.initialTargetSampledQueued = arg3;
        player.samples = new Int32Array((PcmPlayer.stereo ? 2 : 1) * 256);
        player.capacity = (arg3 & 0xfffffc00) + 1024;
        if (player.capacity > 16384) {
            player.capacity = 16384;
        }
        return player;
    }

    playStream(arg0: PcmStream): void {
        this.stream = arg0;
    }

    cycle(): void {
        if (this.samples === null) {
            return;
        }
        let var1 = MonotonicTime.currentTime();
        try {
            if (this.reopenTime !== 0) {
                if (var1 < this.reopenTime) {
                    return;
                }
                this.open(this.capacity);
                this.reopenTime = 0;
                this.skipAcceptedCheck = true;
            }
            let var3 = this.queued();
            let var4 = this.additionalTargetSamplesQueued + this.initialTargetSampledQueued;
            if (this.previousQueued - var3 > this.maxAccepted) {
                this.maxAccepted = this.previousQueued - var3;
            }
            // custom: increased samples for web throttling
            // if (var4 + 256 > 16384) {
            //     var4 = 16128;
            // }
            let maxSamplesQueued = 16384;
            if (this.backgroundTargetSamplesQueued !== 0 && document.hidden) {
                var4 = Math.max(var4, this.backgroundTargetSamplesQueued);
                maxSamplesQueued = this.backgroundTargetSamplesQueued + 256;
                this.wasBackgrounded = true;
            } else if (this.wasBackgrounded) {
                // Returning to the foreground: undo the deep background buffer.
                //
                // While hidden we deliberately queue backgroundTargetSamplesQueued samples
                // (4s at 22050Hz) because browsers throttle timers in background tabs and a
                // shallow buffer underruns. Nothing used to reverse that, and two values
                // survived the transition:
                //   - capacity, grown at the line below to fit the background target,
                //   - additionalTargetSamplesQueued, which the adaptive block further down
                //     ratchets up to the largest drain it has seen and never lowers.
                // Both feed the target queue depth, so a single alt-tab left every later
                // sound multiple seconds late for the rest of the session.
                this.wasBackgrounded = false;
                this.additionalTargetSamplesQueued = 0;
                this.maxAccepted = 0;
                this.previousMaxAccepted = 0;
                var4 = this.initialTargetSampledQueued;
                const foregroundCapacity = (this.initialTargetSampledQueued & 0xfffffc00) + 1024;
                if (this.capacity > foregroundCapacity) {
                    this.capacity = foregroundCapacity;
                    this.close();
                    this.open(this.capacity);
                    this.skipAcceptedCheck = true;
                    var3 = 0;
                }
            }
            if (var4 + 256 > maxSamplesQueued) {
                var4 = maxSamplesQueued - 256;
            }
            if (this.capacity < var4 + 256) {
                var3 = 0;
                // custom: increased samples for web throttling
                // this.capacity += 1024;
                // if (this.capacity > 16384) {
                //     this.capacity = 16384;
                // }
                this.capacity = Math.min(maxSamplesQueued, Math.max(this.capacity + 1024, var4 + 256));
                this.close();
                this.open(this.capacity);
                this.skipAcceptedCheck = true;
                if (var4 + 256 > this.capacity) {
                    var4 = this.capacity - 256;
                    this.additionalTargetSamplesQueued = var4 - this.initialTargetSampledQueued;
                }
            }
            while (var3 < var4) {
                this.generate(this.samples);
                this.write();
                var3 += 256;
            }
            if (var1 > this.nextAcceptedCheckTime) {
                if (this.skipAcceptedCheck) {
                    this.skipAcceptedCheck = false;
                } else if (this.maxAccepted === 0 && this.previousMaxAccepted === 0) {
                    this.close();
                    this.reopenTime = var1 + 2000;
                    return;
                } else {
                    this.additionalTargetSamplesQueued = Math.min(this.previousMaxAccepted, this.maxAccepted);
                    this.previousMaxAccepted = this.maxAccepted;
                }
                this.maxAccepted = 0;
                this.nextAcceptedCheckTime = var1 + 2000;
            }
            this.previousQueued = var3;
        } catch {
            this.close();
            this.reopenTime = var1 + 2000;
        }
        try {
            if (var1 > this.lastPlayTime + 500000) {
                var1 = this.lastPlayTime;
            }
            while (var1 > this.lastPlayTime + 5000) {
                this.skip();
                this.lastPlayTime += (256000 / PcmPlayer.frequency) | 0;
            }
        } catch {
            this.lastPlayTime = var1;
        }
    }

    skipNextAcceptedCheck(): void {
        this.skipAcceptedCheck = true;
    }

    play(): void {
        this.skipAcceptedCheck = true;
        try {
            this.flush();
        } catch (var1) {
            this.close();
            this.reopenTime = MonotonicTime.currentTime() + 2000;
        }
    }

    shutdown(): void {
        this.close();
        this.samples = null;
    }

    skip(): void {
        this.samplesUntilMix -= 256;
        if (this.samplesUntilMix < 0) {
            this.samplesUntilMix = 0;
        }
        if (this.stream !== null) {
            this.stream.pretendToMix(256);
        }
    }

    // jag::oldscape::sound::PCMPlayer::Generate
    generate(arg0: Int32Array | number[]): void {
        let var2 = 256;
        if (PcmPlayer.stereo) {
            var2 = 512;
        }
        ArrayUtil.clear(arg0, 0, var2);
        this.samplesUntilMix -= 256;
        if (this.stream !== null && this.samplesUntilMix <= 0) {
            this.samplesUntilMix += PcmPlayer.frequency >> 4;
            PcmPlayer.resetStreamState(this.stream);
            this.enqueueStream(this.stream.priority(), this.stream);
            let var3 = 0;
            let var4 = 255;
            let var5 = 7;
            label103: while (var4 !== 0) {
                let var6: number;
                let var7: number;
                if (var5 < 0) {
                    var6 = var5 & 0x3;
                    var7 = -(var5 >> 2);
                } else {
                    var6 = var5;
                    var7 = 0;
                }
                for (let var8 = (var4 >>> var6) & 0x11111111; var8 !== 0; var8 >>>= 0x4) {
                    if ((var8 & 0x1) !== 0) {
                        var4 &= ~(0x1 << var6);
                        let var9: PcmStream | null = null;
                        let var10 = this.priorityQueueHeads[var6];
                        label97: while (true) {
                            while (true) {
                                if (var10 === null) {
                                    break label97;
                                }
                                const var11 = var10.sound;
                                if (var11 === null || var11.position <= var7) {
                                    var10.active = true;
                                    const var12 = var10.selfMixCost();
                                    var3 += var12;
                                    if (var11 !== null) {
                                        var11.position += var12;
                                    }
                                    if (var3 >= this.maxMixCost) {
                                        break label103;
                                    }
                                    let var13 = var10.substreamStart();
                                    if (var13 !== null) {
                                        const var14 = var10.field934;
                                        while (var13 !== null) {
                                            this.enqueueStream(Math.imul(var14, var13.priority()) >> 8, var13);
                                            var13 = var10.substreamNext();
                                        }
                                    }
                                    const var15 = var10.stream;
                                    var10.stream = null;
                                    if (var9 === null) {
                                        this.priorityQueueHeads[var6] = var15;
                                    } else {
                                        var9.stream = var15;
                                    }
                                    if (var15 === null) {
                                        this.priorityQueueTails[var6] = var9;
                                    }
                                    var10 = var15;
                                } else {
                                    var4 |= 0x1 << var6;
                                    var9 = var10;
                                    var10 = var10.stream;
                                }
                            }
                        }
                    }
                    var6 += 4;
                    var7++;
                }
                var5--;
            }
            for (let var16 = 0; var16 < 8; var16++) {
                let var17 = this.priorityQueueHeads[var16];
                this.priorityQueueHeads[var16] = this.priorityQueueTails[var16] = null;
                while (var17 !== null) {
                    const var18 = var17.stream;
                    var17.stream = null;
                    var17 = var18;
                }
            }
        }
        if (this.samplesUntilMix < 0) {
            this.samplesUntilMix = 0;
        }
        if (this.stream !== null) {
            this.stream.doMix(arg0, 0, 256);
        }
        this.lastPlayTime = MonotonicTime.currentTime();
    }

    static resetStreamState(arg0: PcmStream): void {
        if (arg0.sound !== null) {
            arg0.sound.position = 0;
        }
        arg0.active = false;
        for (let var1 = arg0.substreamStart(); var1 !== null; var1 = arg0.substreamNext()) {
            PcmPlayer.resetStreamState(var1);
        }
    }

    enqueueStream(priority: number, stream: PcmStream): void {
        const bucket = priority >> 5;
        const tail = this.priorityQueueTails[bucket];
        if (tail === null) {
            this.priorityQueueHeads[bucket] = stream;
        } else {
            tail.stream = stream;
        }
        this.priorityQueueTails[bucket] = stream;
        stream.field934 = priority;
    }

    init(_arg0: unknown): void {}

    open(arg0: number): void {}

    queued(): number {
        return this.capacity;
    }

    write(): void {}

    close(): void {}

    flush(): void {}
}

declare global {
    interface Window {
        audioContext: AudioContext;
    }
}

class WebPcmPlayer extends PcmPlayer {
    readonly buffer: Int16Array = new Int16Array(256);
    line: AudioBufferSourceNode | null = null;
    nextBufferTime: number = 0;

    // custom: increased samples for web throttling
    override backgroundTargetSamplesQueued = PcmPlayer.frequency * 4;

    override init(arg0: number): void {
        if (typeof arg0 === 'number' && arg0 > 0) {
            this.capacity = arg0;
        }
        this.nextBufferTime = window.audioContext.currentTime;
    }

    override queued(): number {
        const queuedSamples = ((this.nextBufferTime - window.audioContext.currentTime) * PcmPlayer.frequency) | 0;
        if (queuedSamples <= 0) {
            return 0;
        }
        return queuedSamples > this.capacity ? this.capacity : queuedSamples;
    }

    override write(): void {
        const samples = this.samples;
        if (samples === null) {
            return;
        }
        const channels = PcmPlayer.stereo ? 2 : 1;
        const audioBuffer = window.audioContext.createBuffer(channels, 256, PcmPlayer.frequency);
        for (let channel = 0; channel < channels; channel++) {
            const audioData = audioBuffer.getChannelData(channel);
            for (let frame = 0; frame < 256; frame++) {
                let sample = samples[PcmPlayer.stereo ? frame * 2 + channel : frame];
                if (((sample + 8388608) & 0xff000000) !== 0) {
                    sample = (sample >> 31) ^ 0x7fffff;
                }
                audioData[frame] = (sample >> 8) / 32768;
            }
        }
        // The schedule cursor is corrected in BOTH directions. Falling behind currentTime is
        // an underrun (start() in the past plays immediately), which upstream already handled.
        // Running too far AHEAD is the latency bug: nextBufferTime only ever advances by each
        // buffer's duration, so any lead it gains — from a stutter, or from the deep buffer a
        // background tab queues — is inherited by every later sound and never repaid.
        // Clamp the lead to the target queue depth so audio stays gapless but cannot drift.
        const now = window.audioContext.currentTime;
        if (this.nextBufferTime < now) {
            this.nextBufferTime = now;
        } else {
            const targetSamples = this.initialTargetSampledQueued + this.additionalTargetSamplesQueued;
            const maxLead = (targetSamples + 256) / PcmPlayer.frequency;
            if (this.nextBufferTime - now > maxLead) {
                this.nextBufferTime = now + maxLead;
            }
        }
        const line = window.audioContext.createBufferSource();
        line.buffer = audioBuffer;
        line.connect(window.audioContext.destination);
        line.start(this.nextBufferTime);
        this.line = line;
        this.nextBufferTime += audioBuffer.duration;
    }

    override close(): void {
        if (this.line !== null) {
            this.line.disconnect();
            this.line = null;
        }
    }
}
