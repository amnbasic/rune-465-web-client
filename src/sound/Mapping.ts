import JagVorbis from '#/sound/JagVorbis.js';

// jag::oldscape::sound::Mapping
export default class Mapping {
    readonly submaps: number;
    mux: number = 0;
    readonly submap_floor: Int32Array;
    readonly submap_residue: Int32Array;

    constructor() {
        JagVorbis.readBits(16); // mapping_type
        this.submaps = JagVorbis.readBit() === 0 ? 1 : JagVorbis.readBits(4) + 1;
        if (JagVorbis.readBit() !== 0) {
            JagVorbis.readBits(8);
        }
        JagVorbis.readBits(2);
        if (this.submaps > 1) {
            this.mux = JagVorbis.readBits(4);
        }
        this.submap_floor = new Int32Array(this.submaps);
        this.submap_residue = new Int32Array(this.submaps);
        for (let var1 = 0; var1 < this.submaps; var1++) {
            JagVorbis.readBits(8); // discard
            this.submap_floor[var1] = JagVorbis.readBits(8);
            this.submap_residue[var1] = JagVorbis.readBits(8);
        }
    }
}
