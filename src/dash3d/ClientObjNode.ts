import Linkable2 from '#/datastruct/Linkable2.js';
import type ClientObj from '#/dash3d/ClientObj.js';

export default class ClientObjNode extends Linkable2 {
    readonly obj: ClientObj;

    constructor(arg0: ClientObj) {
        super();
        this.obj = arg0;
    }
}
