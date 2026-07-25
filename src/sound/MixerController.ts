import Linkable from '#/datastruct/Linkable.js';
import type Mixer from '#/sound/Mixer.js';

// jag::oldscape::sound::MixerController
export default abstract class MixerController extends Linkable {
    field1338: number = 0;

    abstract method500(arg0: Mixer): number;
    abstract method499(): void;
}
