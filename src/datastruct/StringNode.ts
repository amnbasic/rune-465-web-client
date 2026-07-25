import Linkable from '#/datastruct/Linkable.js';
import type JagString from '#/jstring/JagString.js';

export default class StringNode extends Linkable {
    value: JagString | string | null;

    constructor(value: JagString | string | null = null) {
        super();
        this.value = value;
    }
}
