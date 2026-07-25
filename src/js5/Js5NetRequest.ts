import Linkable2 from '#/datastruct/Linkable2.js';
import type Js5Loader from '#/js5/Js5Loader.js';

export default class Js5NetRequest extends Linkable2 {
    padding: number = 0;
    expectedCrc: number = 0;
    provider: Js5Loader | null = null;
}
