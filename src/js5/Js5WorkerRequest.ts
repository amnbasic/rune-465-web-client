import Linkable from '#/datastruct/Linkable.js';
import type Js5Loader from '#/js5/Js5Loader.js';

export default class Js5WorkerRequest extends Linkable {
    type: number = 0;
    loader: Js5Loader | null = null;
    data: Uint8Array | null = null;
    archive: number = 0;
    keepPacked: boolean = false;
    inProgress: boolean = false;
}
