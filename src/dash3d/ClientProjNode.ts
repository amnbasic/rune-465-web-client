import Linkable2 from '#/datastruct/Linkable2.js';
import type ClientProj from '#/dash3d/ClientProj.js';

export default class ClientProjNode extends Linkable2 {
    readonly proj: ClientProj;

    constructor(arg0: ClientProj) {
        super();
        this.proj = arg0;
    }
}
