import Linkable from '#/datastruct/Linkable.js';
import Packet from '#/io/Packet.js';

// jag::oldscape::dash3d::AnimBase
export default class AnimBase extends Linkable {
    readonly id: number;
    readonly size: number;
    readonly type: Int32Array;
    readonly labels: Int32Array[];
    readonly field1410: boolean[];

    constructor(id: number, src: Uint8Array) {
        super();

        this.id = id;

        const buf = new Packet(src);
        this.size = buf.g1();

        this.field1410 = new Array(this.size).fill(false);
        this.type = new Int32Array(this.size);
        this.labels = new Array(this.size);

        for (let i = 0; i < this.size; i++) {
            this.type[i] = buf.g1();
        }

        // 464/465 AnimBase (skeleton) does NOT have the rev-500 per-bone flag array between the
        // transform types and the labels. Reading it consumed `size` phantom bytes -> the label
        // counts/labels decoded from the wrong offset -> wrong skeleton -> distorted animation pose.
        // field1410 stays all-false (it is never read anywhere else in the client).

        for (let i = 0; i < this.size; i++) {
            this.labels[i] = new Int32Array(buf.g1());
        }

        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.labels[i].length; j++) {
                this.labels[i][j] = buf.g1();
            }
        }
    }
}
