import LinkList from '#/datastruct/LinkList.js';
import Linkable from '#/datastruct/Linkable.js';
import MixerController from '#/sound/MixerController.js';
import PcmStream from '#/sound/PcmStream.js';

// jag::oldscape::sound::Mixer
export default class Mixer extends PcmStream {
    readonly streams: LinkList<PcmStream> = new LinkList();
    readonly controllers: LinkList<MixerController> = new LinkList();
    field4217: number = 0;
    field4216: number = -1;

    // jag::oldscape::sound::Mixer::PlayStream
    playStream(arg0: PcmStream): void {
        this.streams.pushFront(arg0);
    }

    // jag::oldscape::sound::Mixer::StopStream
    stopStream(arg0: PcmStream): void {
        arg0.unlink();
    }

    // todo: identify
    method1505(): void {
        if (this.field4217 <= 0) {
            return;
        }
        for (let controller = this.controllers.head(); controller !== null; controller = this.controllers.next()) {
            controller.field1338 -= this.field4217;
        }
        this.field4216 -= this.field4217;
        this.field4217 = 0;
    }

    // jag::oldscape::sound::Mixer::SortController
    sortController(arg0: Linkable | null, arg1: MixerController): void {
        while (arg0 !== this.controllers.sentinel && (arg0 as MixerController).field1338 <= arg1.field1338) {
            arg0 = arg0!.next;
        }
        this.controllers.insertBefore(arg1, arg0 as MixerController);
        this.field4216 = (this.controllers.sentinel.next as MixerController).field1338;
    }

    // jag::oldscape::sound::Mixer::UnlinkController
    unlinkController(arg0: MixerController): void {
        arg0.unlink();
        arg0.method499();
        const var2 = this.controllers.sentinel.next;
        if (var2 === this.controllers.sentinel) {
            this.field4216 = -1;
        } else {
            this.field4216 = (var2 as MixerController).field1338;
        }
    }

    // jag::oldscape::sound::Mixer::SubstreamStart
    override substreamStart(): PcmStream | null {
        return this.streams.head();
    }

    // jag::oldscape::sound::Mixer::SubstreamNext
    override substreamNext(): PcmStream | null {
        return this.streams.next();
    }

    // jag::oldscape::sound::Mixer::SelfMixCost
    override selfMixCost(): number {
        return 0;
    }

    // jag::oldscape::sound::Mixer::DoMix
    override doMix(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        do {
            if (this.field4216 < 0) {
                this.mix2(arg0, arg1, arg2);
                return;
            }
            if (this.field4217 + arg2 < this.field4216) {
                this.field4217 += arg2;
                this.mix2(arg0, arg1, arg2);
                return;
            }
            const step = this.field4216 - this.field4217;
            this.mix2(arg0, arg1, step);
            arg1 += step;
            arg2 -= step;
            this.field4217 += step;
            this.method1505();
            const var5 = this.controllers.head()!;
            {
                const var7 = var5.method500(this);
                if (var7 < 0) {
                    var5.field1338 = 0;
                    this.unlinkController(var5);
                } else {
                    var5.field1338 = var7;
                    this.sortController(var5.next, var5);
                }
            }
        } while (arg2 !== 0);
    }

    // jag::oldscape::sound::Mixer::Mix2
    mix2(arg0: Int32Array | number[], arg1: number, arg2: number): void {
        for (let stream = this.streams.head(); stream !== null; stream = this.streams.next()) {
            stream.maybeMix(arg0, arg1, arg2);
        }
    }

    // jag::oldscape::sound::Mixer::PretendToMix
    override pretendToMix(arg0: number): void {
        do {
            if (this.field4216 < 0) {
                this.pretendToMix2(arg0);
                return;
            }
            if (this.field4217 + arg0 < this.field4216) {
                this.field4217 += arg0;
                this.pretendToMix2(arg0);
                return;
            }
            const step = this.field4216 - this.field4217;
            this.pretendToMix2(step);
            arg0 -= step;
            this.field4217 += step;
            this.method1505();
            const var3 = this.controllers.head()!;
            {
                const var5 = var3.method500(this);
                if (var5 < 0) {
                    var3.field1338 = 0;
                    this.unlinkController(var3);
                } else {
                    var3.field1338 = var5;
                    this.sortController(var3.next, var3);
                }
            }
        } while (arg0 !== 0);
    }

    // jag::oldscape::sound::Mixer::PretendToMix2
    pretendToMix2(arg0: number): void {
        for (let stream = this.streams.head(); stream !== null; stream = this.streams.next()) {
            stream.pretendToMix(arg0);
        }
    }
}
