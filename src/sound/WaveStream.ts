import PcmPlayer from '#/sound/PcmPlayer.js';
import PcmStream from '#/sound/PcmStream.js';
import Wave from '#/sound/Wave.js';

// jag::oldscape::sound::WaveStream
export default class WaveStream extends PcmStream {
    position: number = 0;
    pitch: number;
    volume: number = 0;
    pan: number = -1;
    volumeMono!: number;
    volumeStereoLeft: number = 0;
    volumeStereoRight: number = 0;
    loopCount: number = 0;
    readonly loopStartPosition: number;
    readonly loopEndPosition: number;
    loopReversed: boolean = false;
    volumeChangeDelta: number = 0;
    volumeChangeSpeedMono: number = 0;
    volumeChangeSpeedStereoLeft: number = 0;
    volumeChangeSpeedStereoRight: number = 0;

    // jag::oldscape::sound::WaveStream::GetLVol
    static getLVol(arg0: number, arg1: number): number {
        return arg1 < 0 ? arg0 : (arg0 * Math.sqrt((16384 - arg1) * 1.220703125e-4) + 0.5) | 0;
    }

    // jag::oldscape::sound::WaveStream::GetRVol
    static getRVol(arg0: number, arg1: number): number {
        return arg1 < 0 ? -arg0 : (arg0 * Math.sqrt(arg1 * 1.220703125e-4) + 0.5) | 0;
    }

    // jag::oldscape::sound::WaveStream::Priority
    override priority(): number {
        const var1 = Math.imul(this.volumeMono, 3) >> 6;
        let var2 = (var1 ^ (var1 >> 31)) + (var1 >>> 31);
        if (this.loopCount === 0) {
            var2 -= (Math.imul(var2, this.position) / ((this.sound as Wave).samples.length << 8)) | 0;
        } else if (this.loopCount >= 0) {
            var2 -= (Math.imul(var2, this.loopStartPosition) / (this.sound as Wave).samples.length) | 0;
        }
        return var2 > 255 ? 255 : var2;
    }

    constructor(arg0: Wave, arg1: number, arg2: number, arg3: number = 8192) {
        super();
        this.sound = arg0;
        this.loopStartPosition = arg0.loopStartPosition;
        this.loopEndPosition = arg0.loopEndPosition;
        this.loopReversed = arg0.loopReversed;
        this.pitch = arg1;
        this.volume = arg2;
        this.pan = arg3;
        this.position = 0;
        this.setMLRVol();
    }

    // jag::oldscape::sound::WaveStream::NewRatePercent
    static newRatePercent(arg0: Wave, arg1: number): WaveStream | null {
        return arg0.samples === null || arg0.samples.length === 0 ? null : new WaveStream(arg0, Number(BigInt.asIntN(32, BigInt.asIntN(64, BigInt(arg0.samplingFrequency) * 256n * 100n) / BigInt(PcmPlayer.frequency * 100))), arg1 << 6);
    }

    // jag::oldscape::sound::WaveStream::NewRateRawFineVolPan
    static newRateFineVolPan(arg0: Wave, arg1: number, arg2: number, arg3: number): WaveStream | null {
        return arg0.samples === null || arg0.samples.length === 0 ? null : new WaveStream(arg0, arg1, arg2, arg3);
    }

    // jag::oldscape::sound::WaveStream::SetMLRVol
    setMLRVol(): void {
        this.volumeMono = this.volume;
        this.volumeStereoLeft = WaveStream.getLVol(this.volume, this.pan);
        this.volumeStereoRight = WaveStream.getRVol(this.volume, this.pan);
    }

    // jag::oldscape::sound::WaveStream::SetLoopCount
    setLoopCount(arg0: number): void {
        this.loopCount = arg0;
    }

    // jag::oldscape::sound::WaveStream::ApplyVolume
    applyVolume(arg0: number): void {
        this.setVolPanFine(arg0 << 6, this.getPanFine());
    }

    // todo: rename
    // jag::oldscape::sound::WaveStream::SetVolumeFine
    method1091(): void {
        this.setVolPanFine(0, this.getPanFine());
    }

    // jag::oldscape::sound::WaveStream::SetVolPanFine
    setVolPanFine(arg0: number, arg1: number): void {
        this.volume = arg0;
        this.pan = arg1;
        this.volumeChangeDelta = 0;
        this.setMLRVol();
    }

    // jag::oldscape::sound::WaveStream::GetVolumeFine
    getVolumeFine(): number {
        return this.volume === -2147483648 ? 0 : this.volume;
    }

    // jag::oldscape::sound::WaveStream::GetPanFine
    getPanFine(): number {
        return this.pan < 0 ? -1 : this.pan;
    }

    // jag::oldscape::sound::WaveStream::SetPosition
    setPosition(arg0: number): void {
        const end = (this.sound as Wave).samples.length << 8;
        if (arg0 < -1) {
            arg0 = -1;
        }
        if (arg0 > end) {
            arg0 = end;
        }
        this.position = arg0;
    }

    // todo: rename
    // jag::oldscape::sound::WaveStream::SetReverse
    method1111(): void {
        this.pitch = (this.pitch ^ (this.pitch >> 31)) + (this.pitch >>> 31);
        this.pitch = -this.pitch;
    }

    // jag::oldscape::sound::WaveStream::SkipRampNounLink
    skipRampNounLink(): void {
        if (this.volumeChangeDelta === 0) {
            return;
        }
        if (this.volume === -2147483648) {
            this.volume = 0;
        }
        this.volumeChangeDelta = 0;
        this.setMLRVol();
    }

    // jag::oldscape::sound::WaveStream::RampVolumeFine
    rampVolumeFine(arg0: number, arg1: number): void {
        this.rampVolPanFine(arg0, arg1, this.getPanFine());
    }

    // jag::oldscape::sound::WaveStream::RampVolPanFine
    rampVolPanFine(arg0: number, arg1: number, arg2: number): void {
        if (arg0 === 0) {
            this.setVolPanFine(arg1, arg2);
            return;
        }
        const var4 = WaveStream.getLVol(arg1, arg2);
        const var5 = WaveStream.getRVol(arg1, arg2);
        if (this.volumeStereoLeft === var4 && this.volumeStereoRight === var5) {
            this.volumeChangeDelta = 0;
            return;
        }
        let var6 = arg1 - this.volumeMono;
        if (this.volumeMono - arg1 > var6) {
            var6 = this.volumeMono - arg1;
        }
        if (var4 - this.volumeStereoLeft > var6) {
            var6 = var4 - this.volumeStereoLeft;
        }
        if (this.volumeStereoLeft - var4 > var6) {
            var6 = this.volumeStereoLeft - var4;
        }
        if (var5 - this.volumeStereoRight > var6) {
            var6 = var5 - this.volumeStereoRight;
        }
        if (this.volumeStereoRight - var5 > var6) {
            var6 = this.volumeStereoRight - var5;
        }
        if (arg0 > var6) {
            arg0 = var6;
        }
        this.volumeChangeDelta = arg0;
        this.volume = arg1;
        this.pan = arg2;
        this.volumeChangeSpeedMono = ((arg1 - this.volumeMono) / arg0) | 0;
        this.volumeChangeSpeedStereoLeft = ((var4 - this.volumeStereoLeft) / arg0) | 0;
        this.volumeChangeSpeedStereoRight = ((var5 - this.volumeStereoRight) / arg0) | 0;
    }

    // jag::oldscape::sound::WaveStream::RampOut
    rampOut(arg0: number): void {
        if (arg0 === 0) {
            this.method1091();
            this.unlink();
        } else if (this.volumeStereoLeft === 0 && this.volumeStereoRight === 0) {
            this.volumeChangeDelta = 0;
            this.volume = 0;
            this.volumeMono = 0;
            this.unlink();
        } else {
            let var2 = -this.volumeMono;
            if (this.volumeMono > var2) {
                var2 = this.volumeMono;
            }
            if (-this.volumeStereoLeft > var2) {
                var2 = -this.volumeStereoLeft;
            }
            if (this.volumeStereoLeft > var2) {
                var2 = this.volumeStereoLeft;
            }
            if (-this.volumeStereoRight > var2) {
                var2 = -this.volumeStereoRight;
            }
            if (this.volumeStereoRight > var2) {
                var2 = this.volumeStereoRight;
            }
            if (arg0 > var2) {
                arg0 = var2;
            }
            this.volumeChangeDelta = arg0;
            this.volume = -2147483648;
            this.volumeChangeSpeedMono = (-this.volumeMono / arg0) | 0;
            this.volumeChangeSpeedStereoLeft = (-this.volumeStereoLeft / arg0) | 0;
            this.volumeChangeSpeedStereoRight = (-this.volumeStereoRight / arg0) | 0;
        }
    }

    // jag::oldscape::sound::WaveStream::SetRateRaw
    setRateRaw(arg0: number): void {
        if (this.pitch < 0) {
            this.pitch = -arg0;
        } else {
            this.pitch = arg0;
        }
    }

    // jag::oldscape::sound::WaveStream::GetRateRaw
    getRateRaw(): number {
        return this.pitch < 0 ? -this.pitch : this.pitch;
    }

    // jag::oldscape::sound::WaveStream::Isfinished
    isFinished(): boolean {
        return this.position < 0 || this.position >= (this.sound as Wave).samples.length << 8;
    }

    // jag::oldscape::sound::WaveStream::Isramping
    isRamping(): boolean {
        return this.volumeChangeDelta !== 0;
    }

    // jag::oldscape::sound::WaveStream::SubstreamStart
    override substreamStart(): PcmStream | null {
        return null;
    }

    // jag::oldscape::sound::WaveStream::SubstreamNext
    override substreamNext(): PcmStream | null {
        return null;
    }

    // jag::oldscape::sound::WaveStream::SelfMixCost
    override selfMixCost(): number {
        return this.volume === 0 && this.volumeChangeDelta === 0 ? 0 : 1;
    }

    // jag::oldscape::sound::WaveStream::DoMix
    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        if (this.volume === 0 && this.volumeChangeDelta === 0) {
            this.pretendToMix(arg2);
            return;
        }
        const var4 = this.sound as Wave;
        const var5 = this.loopStartPosition << 8;
        const var6 = this.loopEndPosition << 8;
        const var7 = var4.samples.length << 8;
        const var8 = var6 - var5;
        if (var8 <= 0) {
            this.loopCount = 0;
        }
        let var9 = arg1;
        const var10 = arg2 + arg1;
        if (this.position < 0) {
            if (this.pitch <= 0) {
                this.skipRampNounLink();
                this.unlink();
                return;
            }
            this.position = 0;
        }
        if (this.position >= var7) {
            if (this.pitch >= 0) {
                this.skipRampNounLink();
                this.unlink();
                return;
            }
            this.position = var7 - 1;
        }
        if (this.loopCount >= 0) {
            if (this.loopCount > 0) {
                if (this.loopReversed) {
                    label130: {
                        if (this.pitch < 0) {
                            var9 = this.mixBackwardSto(arg0, arg1, var5, var10, var4.samples[this.loopStartPosition]);
                            if (this.position >= var5) {
                                return;
                            }
                            this.position = var5 + var5 - this.position - 1;
                            this.pitch = -this.pitch;
                            if (--this.loopCount === 0) {
                                break label130;
                            }
                        }
                        do {
                            var9 = this.mixForwardSto(arg0, var9, var6, var10, var4.samples[this.loopEndPosition - 1]);
                            if (this.position < var6) {
                                return;
                            }
                            this.position = var6 + var6 - this.position - 1;
                            this.pitch = -this.pitch;
                            if (--this.loopCount === 0) {
                                break;
                            }
                            var9 = this.mixBackwardSto(arg0, var9, var5, var10, var4.samples[this.loopStartPosition]);
                            if (this.position >= var5) {
                                return;
                            }
                            this.position = var5 + var5 - this.position - 1;
                            this.pitch = -this.pitch;
                        } while (--this.loopCount !== 0);
                    }
                } else if (this.pitch < 0) {
                    while (true) {
                        var9 = this.mixBackwardSto(arg0, var9, var5, var10, var4.samples[this.loopEndPosition - 1]);
                        if (this.position >= var5) {
                            return;
                        }
                        const var12 = ((var6 - this.position - 1) / var8) | 0;
                        if (var12 >= this.loopCount) {
                            this.position += var8 * this.loopCount;
                            this.loopCount = 0;
                            break;
                        }
                        this.position += var8 * var12;
                        this.loopCount -= var12;
                    }
                } else {
                    while (true) {
                        var9 = this.mixForwardSto(arg0, var9, var6, var10, var4.samples[this.loopStartPosition]);
                        if (this.position < var6) {
                            return;
                        }
                        const var13 = ((this.position - var5) / var8) | 0;
                        if (var13 >= this.loopCount) {
                            this.position -= var8 * this.loopCount;
                            this.loopCount = 0;
                            break;
                        }
                        this.position -= var8 * var13;
                        this.loopCount -= var13;
                    }
                }
            }
            if (this.pitch < 0) {
                this.mixBackwardSto(arg0, var9, 0, var10, 0);
                if (this.position < 0) {
                    this.position = -1;
                    this.skipRampNounLink();
                    this.unlink();
                    return;
                }
            } else {
                this.mixForwardSto(arg0, var9, var7, var10, 0);
                if (this.position >= var7) {
                    this.position = var7;
                    this.skipRampNounLink();
                    this.unlink();
                }
            }
        } else if (this.loopReversed) {
            if (this.pitch < 0) {
                var9 = this.mixBackwardSto(arg0, arg1, var5, var10, var4.samples[this.loopStartPosition]);
                if (this.position >= var5) {
                    return;
                }
                this.position = var5 + var5 - this.position - 1;
                this.pitch = -this.pitch;
            }
            while (true) {
                const var11 = this.mixForwardSto(arg0, var9, var6, var10, var4.samples[this.loopEndPosition - 1]);
                if (this.position < var6) {
                    return;
                }
                this.position = var6 + var6 - this.position - 1;
                this.pitch = -this.pitch;
                var9 = this.mixBackwardSto(arg0, var11, var5, var10, var4.samples[this.loopStartPosition]);
                if (this.position >= var5) {
                    return;
                }
                this.position = var5 + var5 - this.position - 1;
                this.pitch = -this.pitch;
            }
        } else if (this.pitch < 0) {
            while (true) {
                var9 = this.mixBackwardSto(arg0, var9, var5, var10, var4.samples[this.loopEndPosition - 1]);
                if (this.position >= var5) {
                    return;
                }
                this.position = var6 - ((var6 - 1 - this.position) % var8) - 1;
            }
        } else {
            while (true) {
                var9 = this.mixForwardSto(arg0, var9, var6, var10, var4.samples[this.loopStartPosition]);
                if (this.position < var6) {
                    return;
                }
                this.position = var5 + ((this.position - var5) % var8);
            }
        }
    }

    // jag::oldscape::sound::WaveStream::PretendToMix
    override pretendToMix(arg0: number): void {
        if (this.volumeChangeDelta > 0) {
            if (arg0 >= this.volumeChangeDelta) {
                if (this.volume === -2147483648) {
                    this.volume = 0;
                    this.volumeMono = this.volumeStereoLeft = this.volumeStereoRight = 0;
                    this.unlink();
                    arg0 = this.volumeChangeDelta;
                }
                this.volumeChangeDelta = 0;
                this.setMLRVol();
            } else {
                this.volumeMono += Math.imul(this.volumeChangeSpeedMono, arg0);
                this.volumeStereoLeft += Math.imul(this.volumeChangeSpeedStereoLeft, arg0);
                this.volumeStereoRight += Math.imul(this.volumeChangeSpeedStereoRight, arg0);
                this.volumeChangeDelta -= arg0;
            }
        }
        const var2 = this.sound as Wave;
        const var3 = this.loopStartPosition << 8;
        const var4 = this.loopEndPosition << 8;
        const var5 = var2.samples.length << 8;
        const var6 = var4 - var3;
        if (var6 <= 0) {
            this.loopCount = 0;
        }
        if (this.position < 0) {
            if (this.pitch <= 0) {
                this.skipRampNounLink();
                this.unlink();
                return;
            }
            this.position = 0;
        }
        if (this.position >= var5) {
            if (this.pitch >= 0) {
                this.skipRampNounLink();
                this.unlink();
                return;
            }
            this.position = var5 - 1;
        }
        this.position += Math.imul(this.pitch, arg0);
        if (this.loopCount >= 0) {
            if (this.loopCount > 0) {
                if (this.loopReversed) {
                    label125: {
                        if (this.pitch < 0) {
                            if (this.position >= var3) {
                                return;
                            }
                            this.position = var3 + var3 - this.position - 1;
                            this.pitch = -this.pitch;
                            if (--this.loopCount === 0) {
                                break label125;
                            }
                        }
                        do {
                            if (this.position < var4) {
                                return;
                            }
                            this.position = var4 + var4 - this.position - 1;
                            this.pitch = -this.pitch;
                            if (--this.loopCount === 0) {
                                break;
                            }
                            if (this.position >= var3) {
                                return;
                            }
                            this.position = var3 + var3 - this.position - 1;
                            this.pitch = -this.pitch;
                        } while (--this.loopCount !== 0);
                    }
                } else if (this.pitch < 0) {
                    if (this.position >= var3) {
                        return;
                    }
                    const var7 = ((var4 - this.position - 1) / var6) | 0;
                    if (var7 < this.loopCount) {
                        this.position += Math.imul(var6, var7);
                        this.loopCount -= var7;
                        return;
                    }
                    this.position += Math.imul(var6, this.loopCount);
                    this.loopCount = 0;
                } else if (this.position >= var4) {
                    const var8 = ((this.position - var3) / var6) | 0;
                    if (var8 < this.loopCount) {
                        this.position -= Math.imul(var6, var8);
                        this.loopCount -= var8;
                        return;
                    }
                    this.position -= Math.imul(var6, this.loopCount);
                    this.loopCount = 0;
                } else {
                    return;
                }
            }
            if (this.pitch < 0) {
                if (this.position < 0) {
                    this.position = -1;
                    this.skipRampNounLink();
                    this.unlink();
                    return;
                }
            } else if (this.position >= var5) {
                this.position = var5;
                this.skipRampNounLink();
                this.unlink();
            }
        } else if (this.loopReversed) {
            if (this.pitch < 0) {
                if (this.position >= var3) {
                    return;
                }
                this.position = var3 + var3 - this.position - 1;
                this.pitch = -this.pitch;
            }
            while (this.position >= var4) {
                this.position = var4 + var4 - this.position - 1;
                this.pitch = -this.pitch;
                if (this.position >= var3) {
                    return;
                }
                this.position = var3 + var3 - this.position - 1;
                this.pitch = -this.pitch;
            }
        } else if (this.pitch < 0) {
            if (this.position < var3) {
                this.position = var4 - ((var4 - 1 - this.position) % var6) - 1;
            }
        } else if (this.position >= var4) {
            this.position = var3 + ((this.position - var3) % var6);
        }
    }

    mixForwardSto(arg0: Int32Array | number[], arg1: number, arg2: number, arg3: number, arg4: number): number {
        do {
            if (this.volumeChangeDelta <= 0) {
                if (this.pitch === 256 && (this.position & 0xff) === 0) {
                    if (PcmPlayer.stereo) {
                        return WaveStream.doMixForwards1To1Stereo((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeStereoLeft, this.volumeStereoRight, arg3, arg2, this);
                    }
                    return WaveStream.doMixForwards1To1Mono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this);
                }
                if (PcmPlayer.stereo) {
                    return WaveStream.doMixForwardsStereo((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeStereoLeft, this.volumeStereoRight, arg3, arg2, this, this.pitch, arg4);
                }
                return WaveStream.doMixForwardsMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this, this.pitch, arg4);
            }
            let var6 = arg1 + this.volumeChangeDelta;
            if (var6 > arg3) {
                var6 = arg3;
            }
            this.volumeChangeDelta += arg1;
            if (this.pitch === 256 && (this.position & 0xff) === 0) {
                if (PcmPlayer.stereo) {
                    arg1 = WaveStream.doMixForwards1To1RampStereo(
                        (this.sound as Wave).samples,
                        arg0,
                        this.position,
                        arg1,
                        this.volumeStereoLeft,
                        this.volumeStereoRight,
                        this.volumeChangeSpeedStereoLeft,
                        this.volumeChangeSpeedStereoRight,
                        var6,
                        arg2,
                        this
                    );
                } else {
                    arg1 = WaveStream.doMixForwards1To1RampMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeChangeSpeedMono, var6, arg2, this);
                }
            } else if (PcmPlayer.stereo) {
                arg1 = WaveStream.doMixForwardsRampStereo(
                    (this.sound as Wave).samples,
                    arg0,
                    this.position,
                    arg1,
                    this.volumeStereoLeft,
                    this.volumeStereoRight,
                    this.volumeChangeSpeedStereoLeft,
                    this.volumeChangeSpeedStereoRight,
                    var6,
                    arg2,
                    this,
                    this.pitch,
                    arg4
                );
            } else {
                arg1 = WaveStream.doMixForwardsRampMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeChangeSpeedMono, var6, arg2, this, this.pitch, arg4);
            }
            this.volumeChangeDelta -= arg1;
            if (this.volumeChangeDelta !== 0) {
                return arg1;
            }
        } while (!this.finaliseRamp());
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::MixBackwardSto
    mixBackwardSto(arg0: Int32Array | number[], arg1: number, arg2: number, arg3: number, arg4: number): number {
        do {
            if (this.volumeChangeDelta <= 0) {
                if (this.pitch === -256 && (this.position & 0xff) === 0) {
                    if (PcmPlayer.stereo) {
                        return WaveStream.doMixBackwards1To1Stereo((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeStereoLeft, this.volumeStereoRight, arg3, arg2, this);
                    }
                    return WaveStream.doMixBackwards1To1Mono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this);
                }
                if (PcmPlayer.stereo) {
                    return WaveStream.doMixBackwardsStereo((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeStereoLeft, this.volumeStereoRight, arg3, arg2, this, this.pitch, arg4);
                }
                return WaveStream.doMixBackwardsMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, arg3, arg2, this, this.pitch, arg4);
            }
            let var6 = arg1 + this.volumeChangeDelta;
            if (var6 > arg3) {
                var6 = arg3;
            }
            this.volumeChangeDelta += arg1;
            if (this.pitch === -256 && (this.position & 0xff) === 0) {
                if (PcmPlayer.stereo) {
                    arg1 = WaveStream.doMixBackwards1To1RampStereo(
                        (this.sound as Wave).samples,
                        arg0,
                        this.position,
                        arg1,
                        this.volumeStereoLeft,
                        this.volumeStereoRight,
                        this.volumeChangeSpeedStereoLeft,
                        this.volumeChangeSpeedStereoRight,
                        var6,
                        arg2,
                        this
                    );
                } else {
                    arg1 = WaveStream.doMixBackwards1To1RampMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeChangeSpeedMono, var6, arg2, this);
                }
            } else if (PcmPlayer.stereo) {
                arg1 = WaveStream.doMixBackwardsRampStereo(
                    (this.sound as Wave).samples,
                    arg0,
                    this.position,
                    arg1,
                    this.volumeStereoLeft,
                    this.volumeStereoRight,
                    this.volumeChangeSpeedStereoLeft,
                    this.volumeChangeSpeedStereoRight,
                    var6,
                    arg2,
                    this,
                    this.pitch,
                    arg4
                );
            } else {
                arg1 = WaveStream.doMixBackwardsRampMono((this.sound as Wave).samples, arg0, this.position, arg1, this.volumeMono, this.volumeChangeSpeedMono, var6, arg2, this, this.pitch, arg4);
            }
            this.volumeChangeDelta -= arg1;
            if (this.volumeChangeDelta !== 0) {
                return arg1;
            }
        } while (!this.finaliseRamp());
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::FinaliseRamp
    finaliseRamp(): boolean {
        let var1 = this.volume;
        let var2: number;
        let var3: number;
        if (var1 === -2147483648) {
            var2 = 0;
            var3 = 0;
            var1 = 0;
        } else {
            var3 = WaveStream.getLVol(var1, this.pan);
            var2 = WaveStream.getRVol(var1, this.pan);
        }
        if (this.volumeMono !== var1 || this.volumeStereoLeft !== var3 || this.volumeStereoRight !== var2) {
            if (this.volumeMono < var1) {
                this.volumeChangeSpeedMono = 1;
                this.volumeChangeDelta = var1 - this.volumeMono;
            } else if (this.volumeMono > var1) {
                this.volumeChangeSpeedMono = -1;
                this.volumeChangeDelta = this.volumeMono - var1;
            } else {
                this.volumeChangeSpeedMono = 0;
            }
            if (this.volumeStereoLeft < var3) {
                this.volumeChangeSpeedStereoLeft = 1;
                if (this.volumeChangeDelta === 0 || this.volumeChangeDelta > var3 - this.volumeStereoLeft) {
                    this.volumeChangeDelta = var3 - this.volumeStereoLeft;
                }
            } else if (this.volumeStereoLeft > var3) {
                this.volumeChangeSpeedStereoLeft = -1;
                if (this.volumeChangeDelta === 0 || this.volumeChangeDelta > this.volumeStereoLeft - var3) {
                    this.volumeChangeDelta = this.volumeStereoLeft - var3;
                }
            } else {
                this.volumeChangeSpeedStereoLeft = 0;
            }
            if (this.volumeStereoRight < var2) {
                this.volumeChangeSpeedStereoRight = 1;
                if (this.volumeChangeDelta === 0 || this.volumeChangeDelta > var2 - this.volumeStereoRight) {
                    this.volumeChangeDelta = var2 - this.volumeStereoRight;
                }
            } else if (this.volumeStereoRight > var2) {
                this.volumeChangeSpeedStereoRight = -1;
                if (this.volumeChangeDelta === 0 || this.volumeChangeDelta > this.volumeStereoRight - var2) {
                    this.volumeChangeDelta = this.volumeStereoRight - var2;
                }
            } else {
                this.volumeChangeSpeedStereoRight = 0;
            }
            return false;
        } else if (this.volume === -2147483648) {
            this.volume = 0;
            this.volumeMono = this.volumeStereoLeft = this.volumeStereoRight = 0;
            this.unlink();
            return true;
        } else {
            this.setMLRVol();
            return false;
        }
    }

    // jag::oldscape::sound::WaveStream::DoMixForwards1To1Mono
    static doMixForwards1To1Mono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream): number {
        let var8 = arg2 >> 8;
        const var9 = arg6 >> 8;
        const var10 = arg4 << 2;
        let var11: number;
        if ((var11 = arg3 + var9 - var8) > arg5) {
            var11 = arg5;
        }
        var11 -= 3;
        let var10001: number;
        while (arg3 < var11) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var8++], var10);
            const var12 = arg3++;
            arg1[var12] += Math.imul(arg0[var8++], var10);
            const var13 = arg3++;
            arg1[var13] += Math.imul(arg0[var8++], var10);
            const var14 = arg3++;
            arg1[var14] += Math.imul(arg0[var8++], var10);
        }
        var11 += 3;
        while (arg3 < var11) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var8++], var10);
        }
        arg7.position = var8 << 8;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwards1To1Stereo
    static doMixForwards1To1Stereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream): number {
        let var9 = arg2 >> 8;
        const var10 = arg7 >> 8;
        const var11 = arg4 << 2;
        const var12 = arg5 << 2;
        let var13: number;
        if ((var13 = arg3 + var10 - var9) > arg6) {
            var13 = arg6;
        }
        let var14 = arg3 << 1;
        let var15 = var13 << 1;
        const var21 = var15 - 6;
        while (var14 < var21) {
            const var16 = arg0[var9++];
            const var22 = var14++;
            arg1[var22] += Math.imul(var16, var11);
            const var23 = var14++;
            arg1[var23] += Math.imul(var16, var12);
            const var17 = arg0[var9++];
            const var25 = var14++;
            arg1[var25] += Math.imul(var17, var11);
            const var26 = var14++;
            arg1[var26] += Math.imul(var17, var12);
            const var18 = arg0[var9++];
            const var28 = var14++;
            arg1[var28] += Math.imul(var18, var11);
            const var29 = var14++;
            arg1[var29] += Math.imul(var18, var12);
            const var19 = arg0[var9++];
            const var31 = var14++;
            arg1[var31] += Math.imul(var19, var11);
            const var32 = var14++;
            arg1[var32] += Math.imul(var19, var12);
        }
        var15 = var21 + 6;
        while (var14 < var15) {
            const var20 = arg0[var9++];
            const var10001 = var14++;
            arg1[var10001] += Math.imul(var20, var11);
            const var33 = var14++;
            arg1[var33] += Math.imul(var20, var12);
        }
        arg8.position = var9 << 8;
        return var14 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwards1To1Mono
    static doMixBackwards1To1Mono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream): number {
        let var8 = arg2 >> 8;
        const var9 = arg6 >> 8;
        const var10 = arg4 << 2;
        let var11: number;
        if ((var11 = arg3 + var8 + 1 - var9) > arg5) {
            var11 = arg5;
        }
        var11 -= 3;
        let var10001: number;
        while (arg3 < var11) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var8--], var10);
            const var12 = arg3++;
            arg1[var12] += Math.imul(arg0[var8--], var10);
            const var13 = arg3++;
            arg1[var13] += Math.imul(arg0[var8--], var10);
            const var14 = arg3++;
            arg1[var14] += Math.imul(arg0[var8--], var10);
        }
        var11 += 3;
        while (arg3 < var11) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var8--], var10);
        }
        arg7.position = var8 << 8;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwards1To1Stereo
    static doMixBackwards1To1Stereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream): number {
        let var9 = arg2 >> 8;
        const var10 = arg7 >> 8;
        const var11 = arg4 << 2;
        const var12 = arg5 << 2;
        let var13: number;
        if ((var13 = arg3 + var9 + 1 - var10) > arg6) {
            var13 = arg6;
        }
        let var14 = arg3 << 1;
        let var15 = var13 << 1;
        const var21 = var15 - 6;
        while (var14 < var21) {
            const var16 = arg0[var9--];
            const var22 = var14++;
            arg1[var22] += Math.imul(var16, var11);
            const var23 = var14++;
            arg1[var23] += Math.imul(var16, var12);
            const var17 = arg0[var9--];
            const var25 = var14++;
            arg1[var25] += Math.imul(var17, var11);
            const var26 = var14++;
            arg1[var26] += Math.imul(var17, var12);
            const var18 = arg0[var9--];
            const var28 = var14++;
            arg1[var28] += Math.imul(var18, var11);
            const var29 = var14++;
            arg1[var29] += Math.imul(var18, var12);
            const var19 = arg0[var9--];
            const var31 = var14++;
            arg1[var31] += Math.imul(var19, var11);
            const var32 = var14++;
            arg1[var32] += Math.imul(var19, var12);
        }
        var15 = var21 + 6;
        while (var14 < var15) {
            const var20 = arg0[var9--];
            const var10001 = var14++;
            arg1[var10001] += Math.imul(var20, var11);
            const var33 = var14++;
            arg1[var33] += Math.imul(var20, var12);
        }
        arg8.position = var9 << 8;
        return var14 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwardsMono
    static doMixForwardsMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream, arg8: number, arg9: number): number {
        let var10: number;
        if (arg8 === 0 || (var10 = arg3 + (((arg6 + arg8 - arg2 - 257) / arg8) | 0)) > arg5) {
            var10 = arg5;
        }
        let var10001: number;
        while (arg3 < var10) {
            const var11 = arg2 >> 8;
            const var12 = arg0[var11];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var12 << 8) + Math.imul(arg0[var11 + 1] - var12, arg2 & 0xff), arg4) >> 6;
            arg2 += arg8;
        }
        let var13: number;
        if (arg8 === 0 || (var13 = arg3 + (((arg6 + arg8 - arg2 - 1) / arg8) | 0)) > arg5) {
            var13 = arg5;
        }
        while (arg3 < var13) {
            const var14 = arg0[arg2 >> 8];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var14 << 8) + Math.imul(arg9 - var14, arg2 & 0xff), arg4) >> 6;
            arg2 += arg8;
        }
        arg7.position = arg2;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwardsStereo
    static doMixForwardsStereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream, arg9: number, arg10: number): number {
        let var11: number;
        if (arg9 === 0 || (var11 = arg3 + (((arg7 + arg9 - arg2 - 257) / arg9) | 0)) > arg6) {
            var11 = arg6;
        }
        let var12 = arg3 << 1;
        let var13 = var11 << 1;
        let var10001: number;
        while (var12 < var13) {
            const var14 = arg2 >> 8;
            const var15 = arg0[var14];
            const var16 = (var15 << 8) + Math.imul(arg0[var14 + 1] - var15, arg2 & 0xff);
            var10001 = var12++;
            arg1[var10001] += Math.imul(var16, arg4) >> 6;
            const var21 = var12++;
            arg1[var21] += Math.imul(var16, arg5) >> 6;
            arg2 += arg9;
        }
        let var17: number;
        if (arg9 === 0 || (var17 = (var12 >> 1) + (((arg7 + arg9 - arg2 - 1) / arg9) | 0)) > arg6) {
            var17 = arg6;
        }
        const var18 = var17 << 1;
        while (var12 < var18) {
            const var19 = arg0[arg2 >> 8];
            const var20 = (var19 << 8) + Math.imul(arg10 - var19, arg2 & 0xff);
            var10001 = var12++;
            arg1[var10001] += Math.imul(var20, arg4) >> 6;
            var10001 = var12++;
            arg1[var10001] += Math.imul(var20, arg5) >> 6;
            arg2 += arg9;
        }
        arg8.position = arg2;
        return var12 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwardsMono
    static doMixBackwardsMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: WaveStream, arg8: number, arg9: number): number {
        let var10: number;
        if (arg8 === 0 || (var10 = arg3 + (((arg6 + arg8 + 256 - arg2) / arg8) | 0)) > arg5) {
            var10 = arg5;
        }
        let var10001: number;
        while (arg3 < var10) {
            const var11 = arg2 >> 8;
            const var12 = arg0[var11 - 1];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var12 << 8) + Math.imul(arg0[var11] - var12, arg2 & 0xff), arg4) >> 6;
            arg2 += arg8;
        }
        let var13: number;
        if (arg8 === 0 || (var13 = arg3 + (((arg6 + arg8 - arg2) / arg8) | 0)) > arg5) {
            var13 = arg5;
        }
        while (arg3 < var13) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul((arg9 << 8) + Math.imul(arg0[arg2 >> 8] - arg9, arg2 & 0xff), arg4) >> 6;
            arg2 += arg8;
        }
        arg7.position = arg2;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwardsStereo
    static doMixBackwardsStereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream, arg9: number, arg10: number): number {
        let var11: number;
        if (arg9 === 0 || (var11 = arg3 + (((arg7 + arg9 + 256 - arg2) / arg9) | 0)) > arg6) {
            var11 = arg6;
        }
        let var12 = arg3 << 1;
        let var13 = var11 << 1;
        let var10001: number;
        while (var12 < var13) {
            const var14 = arg2 >> 8;
            const var15 = arg0[var14 - 1];
            const var16 = (var15 << 8) + Math.imul(arg0[var14] - var15, arg2 & 0xff);
            var10001 = var12++;
            arg1[var10001] += Math.imul(var16, arg4) >> 6;
            const var20 = var12++;
            arg1[var20] += Math.imul(var16, arg5) >> 6;
            arg2 += arg9;
        }
        let var17: number;
        if (arg9 === 0 || (var17 = (var12 >> 1) + (((arg7 + arg9 - arg2) / arg9) | 0)) > arg6) {
            var17 = arg6;
        }
        const var18 = var17 << 1;
        while (var12 < var18) {
            const var19 = (arg10 << 8) + Math.imul(arg0[arg2 >> 8] - arg10, arg2 & 0xff);
            var10001 = var12++;
            arg1[var10001] += Math.imul(var19, arg4) >> 6;
            var10001 = var12++;
            arg1[var10001] += Math.imul(var19, arg5) >> 6;
            arg2 += arg9;
        }
        arg8.position = arg2;
        return var12 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwards1To1RampMono
    static doMixForwards1To1RampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream): number {
        let var9 = arg2 >> 8;
        const var10 = arg7 >> 8;
        let var11 = arg4 << 2;
        const var12 = arg5 << 2;
        let var13: number;
        if ((var13 = arg3 + var10 - var9) > arg6) {
            var13 = arg6;
        }
        arg8.volumeStereoLeft += Math.imul(arg8.volumeChangeSpeedStereoLeft, var13 - arg3);
        arg8.volumeStereoRight += Math.imul(arg8.volumeChangeSpeedStereoRight, var13 - arg3);
        var13 -= 3;
        let var10001: number;
        while (arg3 < var13) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var9++], var11);
            const var14 = var11 + var12;
            const var17 = arg3++;
            arg1[var17] += Math.imul(arg0[var9++], var14);
            const var15 = var14 + var12;
            const var18 = arg3++;
            arg1[var18] += Math.imul(arg0[var9++], var15);
            const var16 = var15 + var12;
            const var19 = arg3++;
            arg1[var19] += Math.imul(arg0[var9++], var16);
            var11 = var16 + var12;
        }
        var13 += 3;
        while (arg3 < var13) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var9++], var11);
            var11 += var12;
        }
        arg8.volumeMono = var11 >> 2;
        arg8.position = var9 << 8;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwards1To1RampStereo
    static doMixForwards1To1RampStereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: WaveStream): number {
        let var11 = arg2 >> 8;
        const var12 = arg9 >> 8;
        let var13 = arg4 << 2;
        let var14 = arg5 << 2;
        const var15 = arg6 << 2;
        const var16 = arg7 << 2;
        let var17: number;
        if ((var17 = arg3 + var12 - var11) > arg8) {
            var17 = arg8;
        }
        arg10.volumeMono += Math.imul(arg10.volumeChangeSpeedMono, var17 - arg3);
        let var18 = arg3 << 1;
        let var19 = var17 << 1;
        const var37 = var19 - 6;
        while (var18 < var37) {
            const var20 = arg0[var11++];
            const var31 = var18++;
            arg1[var31] += Math.imul(var20, var13);
            const var21 = var13 + var15;
            const var32 = var18++;
            arg1[var32] += Math.imul(var20, var14);
            const var22 = var14 + var16;
            const var23 = arg0[var11++];
            const var34 = var18++;
            arg1[var34] += Math.imul(var23, var21);
            const var24 = var21 + var15;
            const var35 = var18++;
            arg1[var35] += Math.imul(var23, var22);
            const var25 = var22 + var16;
            const var26 = arg0[var11++];
            const var38 = var18++;
            arg1[var38] += Math.imul(var26, var24);
            const var27 = var24 + var15;
            const var39 = var18++;
            arg1[var39] += Math.imul(var26, var25);
            const var28 = var25 + var16;
            const var29 = arg0[var11++];
            const var41 = var18++;
            arg1[var41] += Math.imul(var29, var27);
            var13 = var27 + var15;
            const var42 = var18++;
            arg1[var42] += Math.imul(var29, var28);
            var14 = var28 + var16;
        }
        var19 = var37 + 6;
        while (var18 < var19) {
            const var30 = arg0[var11++];
            const var10001 = var18++;
            arg1[var10001] += Math.imul(var30, var13);
            var13 += var15;
            const var43 = var18++;
            arg1[var43] += Math.imul(var30, var14);
            var14 += var16;
        }
        arg10.volumeStereoLeft = var13 >> 2;
        arg10.volumeStereoRight = var14 >> 2;
        arg10.position = var11 << 8;
        return var18 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwards1To1RampMono
    static doMixBackwards1To1RampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream): number {
        let var9 = arg2 >> 8;
        const var10 = arg7 >> 8;
        let var11 = arg4 << 2;
        const var12 = arg5 << 2;
        let var13: number;
        if ((var13 = arg3 + var9 + 1 - var10) > arg6) {
            var13 = arg6;
        }
        arg8.volumeStereoLeft += Math.imul(arg8.volumeChangeSpeedStereoLeft, var13 - arg3);
        arg8.volumeStereoRight += Math.imul(arg8.volumeChangeSpeedStereoRight, var13 - arg3);
        var13 -= 3;
        let var10001: number;
        while (arg3 < var13) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var9--], var11);
            const var14 = var11 + var12;
            const var17 = arg3++;
            arg1[var17] += Math.imul(arg0[var9--], var14);
            const var15 = var14 + var12;
            const var18 = arg3++;
            arg1[var18] += Math.imul(arg0[var9--], var15);
            const var16 = var15 + var12;
            const var19 = arg3++;
            arg1[var19] += Math.imul(arg0[var9--], var16);
            var11 = var16 + var12;
        }
        var13 += 3;
        while (arg3 < var13) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul(arg0[var9--], var11);
            var11 += var12;
        }
        arg8.volumeMono = var11 >> 2;
        arg8.position = var9 << 8;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwards1To1RampStereo
    static doMixBackwards1To1RampStereo(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: number, arg9: number, arg10: WaveStream): number {
        let var11 = arg2 >> 8;
        const var12 = arg9 >> 8;
        let var13 = arg4 << 2;
        let var14 = arg5 << 2;
        const var15 = arg6 << 2;
        const var16 = arg7 << 2;
        let var17: number;
        if ((var17 = arg3 + var11 + 1 - var12) > arg8) {
            var17 = arg8;
        }
        arg10.volumeMono += Math.imul(arg10.volumeChangeSpeedMono, var17 - arg3);
        let var18 = arg3 << 1;
        let var19 = var17 << 1;
        const var37 = var19 - 6;
        while (var18 < var37) {
            const var20 = arg0[var11--];
            const var31 = var18++;
            arg1[var31] += Math.imul(var20, var13);
            const var21 = var13 + var15;
            const var32 = var18++;
            arg1[var32] += Math.imul(var20, var14);
            const var22 = var14 + var16;
            const var23 = arg0[var11--];
            const var34 = var18++;
            arg1[var34] += Math.imul(var23, var21);
            const var24 = var21 + var15;
            const var35 = var18++;
            arg1[var35] += Math.imul(var23, var22);
            const var25 = var22 + var16;
            const var26 = arg0[var11--];
            const var38 = var18++;
            arg1[var38] += Math.imul(var26, var24);
            const var27 = var24 + var15;
            const var39 = var18++;
            arg1[var39] += Math.imul(var26, var25);
            const var28 = var25 + var16;
            const var29 = arg0[var11--];
            const var41 = var18++;
            arg1[var41] += Math.imul(var29, var27);
            var13 = var27 + var15;
            const var42 = var18++;
            arg1[var42] += Math.imul(var29, var28);
            var14 = var28 + var16;
        }
        var19 = var37 + 6;
        while (var18 < var19) {
            const var30 = arg0[var11--];
            const var10001 = var18++;
            arg1[var10001] += Math.imul(var30, var13);
            var13 += var15;
            const var43 = var18++;
            arg1[var43] += Math.imul(var30, var14);
            var14 += var16;
        }
        arg10.volumeStereoLeft = var13 >> 2;
        arg10.volumeStereoRight = var14 >> 2;
        arg10.position = var11 << 8;
        return var18 >> 1;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwardsRampMono
    static doMixForwardsRampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream, arg9: number, arg10: number): number {
        arg8.volumeStereoLeft -= Math.imul(arg8.volumeChangeSpeedStereoLeft, arg3);
        arg8.volumeStereoRight -= Math.imul(arg8.volumeChangeSpeedStereoRight, arg3);
        let var11: number;
        if (arg9 === 0 || (var11 = arg3 + (((arg7 + arg9 - arg2 - 257) / arg9) | 0)) > arg6) {
            var11 = arg6;
        }
        let var10001: number;
        while (arg3 < var11) {
            const var12 = arg2 >> 8;
            const var13 = arg0[var12];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var13 << 8) + Math.imul(arg0[var12 + 1] - var13, arg2 & 0xff), arg4) >> 6;
            arg4 += arg5;
            arg2 += arg9;
        }
        let var14: number;
        if (arg9 === 0 || (var14 = arg3 + (((arg7 + arg9 - arg2 - 1) / arg9) | 0)) > arg6) {
            var14 = arg6;
        }
        while (arg3 < var14) {
            const var15 = arg0[arg2 >> 8];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var15 << 8) + Math.imul(arg10 - var15, arg2 & 0xff), arg4) >> 6;
            arg4 += arg5;
            arg2 += arg9;
        }
        arg8.volumeStereoLeft += Math.imul(arg8.volumeChangeSpeedStereoLeft, arg3);
        arg8.volumeStereoRight += Math.imul(arg8.volumeChangeSpeedStereoRight, arg3);
        arg8.volumeMono = arg4;
        arg8.position = arg2;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixForwardsRampStereo
    static doMixForwardsRampStereo(
        arg0: Int8Array,
        arg1: Int32Array | number[],
        arg2: number,
        arg3: number,
        arg4: number,
        arg5: number,
        arg6: number,
        arg7: number,
        arg8: number,
        arg9: number,
        arg10: WaveStream,
        arg11: number,
        arg12: number
    ): number {
        arg10.volumeMono -= Math.imul(arg10.volumeChangeSpeedMono, arg3);
        let var13: number;
        if (arg11 === 0 || (var13 = arg3 + (((arg9 + arg11 - arg2 - 257) / arg11) | 0)) > arg8) {
            var13 = arg8;
        }
        let var14 = arg3 << 1;
        let var15 = var13 << 1;
        let var10001: number;
        while (var14 < var15) {
            const var16 = arg2 >> 8;
            const var17 = arg0[var16];
            const var18 = (var17 << 8) + Math.imul(arg0[var16 + 1] - var17, arg2 & 0xff);
            var10001 = var14++;
            arg1[var10001] += Math.imul(var18, arg4) >> 6;
            arg4 += arg6;
            const var24 = var14++;
            arg1[var24] += Math.imul(var18, arg5) >> 6;
            arg5 += arg7;
            arg2 += arg11;
        }
        let var19: number;
        if (arg11 === 0 || (var19 = (var14 >> 1) + (((arg9 + arg11 - arg2 - 1) / arg11) | 0)) > arg8) {
            var19 = arg8;
        }
        const var20 = var19 << 1;
        while (var14 < var20) {
            const var21 = arg0[arg2 >> 8];
            const var22 = (var21 << 8) + Math.imul(arg12 - var21, arg2 & 0xff);
            var10001 = var14++;
            arg1[var10001] += Math.imul(var22, arg4) >> 6;
            arg4 += arg6;
            var10001 = var14++;
            arg1[var10001] += Math.imul(var22, arg5) >> 6;
            arg5 += arg7;
            arg2 += arg11;
        }
        const var23 = var14 >> 1;
        arg10.volumeMono += Math.imul(arg10.volumeChangeSpeedMono, var23);
        arg10.volumeStereoLeft = arg4;
        arg10.volumeStereoRight = arg5;
        arg10.position = arg2;
        return var23;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwardsRampMono
    static doMixBackwardsRampMono(arg0: Int8Array, arg1: Int32Array | number[], arg2: number, arg3: number, arg4: number, arg5: number, arg6: number, arg7: number, arg8: WaveStream, arg9: number, arg10: number): number {
        arg8.volumeStereoLeft -= Math.imul(arg8.volumeChangeSpeedStereoLeft, arg3);
        arg8.volumeStereoRight -= Math.imul(arg8.volumeChangeSpeedStereoRight, arg3);
        let var11: number;
        if (arg9 === 0 || (var11 = arg3 + (((arg7 + arg9 + 256 - arg2) / arg9) | 0)) > arg6) {
            var11 = arg6;
        }
        let var10001: number;
        while (arg3 < var11) {
            const var12 = arg2 >> 8;
            const var13 = arg0[var12 - 1];
            var10001 = arg3++;
            arg1[var10001] += Math.imul((var13 << 8) + Math.imul(arg0[var12] - var13, arg2 & 0xff), arg4) >> 6;
            arg4 += arg5;
            arg2 += arg9;
        }
        let var14: number;
        if (arg9 === 0 || (var14 = arg3 + (((arg7 + arg9 - arg2) / arg9) | 0)) > arg6) {
            var14 = arg6;
        }
        while (arg3 < var14) {
            var10001 = arg3++;
            arg1[var10001] += Math.imul((arg10 << 8) + Math.imul(arg0[arg2 >> 8] - arg10, arg2 & 0xff), arg4) >> 6;
            arg4 += arg5;
            arg2 += arg9;
        }
        arg8.volumeStereoLeft += Math.imul(arg8.volumeChangeSpeedStereoLeft, arg3);
        arg8.volumeStereoRight += Math.imul(arg8.volumeChangeSpeedStereoRight, arg3);
        arg8.volumeMono = arg4;
        arg8.position = arg2;
        return arg3;
    }

    // jag::oldscape::sound::WaveStream::DoMixBackwardsRampStereo
    static doMixBackwardsRampStereo(
        arg0: Int8Array,
        arg1: Int32Array | number[],
        arg2: number,
        arg3: number,
        arg4: number,
        arg5: number,
        arg6: number,
        arg7: number,
        arg8: number,
        arg9: number,
        arg10: WaveStream,
        arg11: number,
        arg12: number
    ): number {
        arg10.volumeMono -= Math.imul(arg10.volumeChangeSpeedMono, arg3);
        let var13: number;
        if (arg11 === 0 || (var13 = arg3 + (((arg9 + arg11 + 256 - arg2) / arg11) | 0)) > arg8) {
            var13 = arg8;
        }
        let var14 = arg3 << 1;
        let var15 = var13 << 1;
        let var10001: number;
        while (var14 < var15) {
            const var16 = arg2 >> 8;
            const var17 = arg0[var16 - 1];
            const var18 = (var17 << 8) + Math.imul(arg0[var16] - var17, arg2 & 0xff);
            var10001 = var14++;
            arg1[var10001] += Math.imul(var18, arg4) >> 6;
            arg4 += arg6;
            const var23 = var14++;
            arg1[var23] += Math.imul(var18, arg5) >> 6;
            arg5 += arg7;
            arg2 += arg11;
        }
        let var19: number;
        if (arg11 === 0 || (var19 = (var14 >> 1) + (((arg9 + arg11 - arg2) / arg11) | 0)) > arg8) {
            var19 = arg8;
        }
        const var20 = var19 << 1;
        while (var14 < var20) {
            const var21 = (arg12 << 8) + Math.imul(arg0[arg2 >> 8] - arg12, arg2 & 0xff);
            var10001 = var14++;
            arg1[var10001] += Math.imul(var21, arg4) >> 6;
            arg4 += arg6;
            var10001 = var14++;
            arg1[var10001] += Math.imul(var21, arg5) >> 6;
            arg5 += arg7;
            arg2 += arg11;
        }
        const var22 = var14 >> 1;
        arg10.volumeMono += Math.imul(arg10.volumeChangeSpeedMono, var22);
        arg10.volumeStereoLeft = arg4;
        arg10.volumeStereoRight = arg5;
        arg10.position = arg2;
        return var22;
    }
}
