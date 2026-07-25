import Linkable from '#/datastruct/Linkable.js';

export default class IntNode extends Linkable {
    value: number;

    constructor(value: number = 0) {
        super();
        this.value = value;
    }
}
