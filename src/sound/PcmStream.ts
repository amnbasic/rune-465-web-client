import Linkable from '#/datastruct/Linkable.js';

import PcmStreamable from '#/sound/PcmStreamable.js';

// jag::oldscape::sound::PCMStream
export default abstract class PcmStream extends Linkable {
    stream: PcmStream | null = null;
    field934: number = 0;
    sound: PcmStreamable | null = null;
    active: boolean = true;

    // jag::oldscape::sound::PCMStream::Priority
    priority(): number {
        return 255;
    }

    // jag::oldscape::sound::PCMStream::MaybeMix
    maybeMix(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        if (this.active) {
            this.doMix(arg0, arg1, arg2);
        } else {
            this.pretendToMix(arg2);
        }
    }

    abstract substreamStart(): PcmStream | null;

    abstract substreamNext(): PcmStream | null;

    abstract selfMixCost(): number;

    abstract doMix(arg0: Int32Array | number[], arg1: number, arg2: number): void;

    abstract pretendToMix(arg0: number): void;
}
