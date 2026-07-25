import PcmStreamable from '#/sound/PcmStreamable.js';
import Decimator from '#/sound/Decimator.js';

// jag::oldscape::sound::Wave
export default class Wave extends PcmStreamable {
    samplingFrequency: number = 0;
    samples: Int8Array;
    loopStartPosition: number;
    loopEndPosition: number;
    loopReversed: boolean = false;

    constructor(arg0: number, arg1: Int8Array, arg2: number, arg3: number);
    constructor(arg0: number, arg1: Int8Array, arg2: number, arg3: number, arg4: boolean);
    constructor(arg0: number, arg1: Int8Array, arg2: number, arg3: number, arg4?: boolean) {
        super();
        this.samplingFrequency = arg4 === undefined ? 22050 : arg0;
        this.samples = arg1;
        this.loopStartPosition = arg2;
        this.loopEndPosition = arg3;
        if (arg4 !== undefined) {
            this.loopReversed = arg4;
        }
    }

    decimate(d: Decimator): Wave {
        this.samples = d.decimate(this.samples);
        this.samplingFrequency = d.transmitFreq(this.samplingFrequency);
        if (this.loopStartPosition === this.loopEndPosition) {
            this.loopStartPosition = this.loopEndPosition = d.transmitPos(this.loopStartPosition);
        } else {
            this.loopStartPosition = d.transmitPos(this.loopStartPosition);
            this.loopEndPosition = d.transmitPos(this.loopEndPosition);
            if (this.loopStartPosition === this.loopEndPosition) {
                this.loopStartPosition--;
            }
        }
        return this;
    }
}
