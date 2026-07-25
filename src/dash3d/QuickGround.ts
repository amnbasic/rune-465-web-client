// jag::oldscape::dash3d::QuickGround
export default class QuickGround {
    readonly colourSW: number;
    readonly colourSE: number;
    readonly colourNE: number;
    readonly colourNW: number;
    readonly texture: number;
    flat: boolean = true;
    readonly minimapRgb: number;

    constructor(colourSW: number, colourSE: number, colourNE: number, colourNW: number, texture: number, minimapRgb: number, flat: boolean) {
        this.colourNW = colourNW;
        this.flat = flat;
        this.colourSW = colourSW;
        this.colourSE = colourSE;
        this.texture = texture;
        this.minimapRgb = minimapRgb;
        this.colourNE = colourNE;
    }
}
