// jag::oldscape::dash3d::PointNormal
export default class PointNormal {
    x: number = 0;
    y: number = 0;
    z: number = 0;
    w: number = 0;

    constructor();
    constructor(arg0: PointNormal);
    constructor(arg0?: PointNormal) {
        if (arg0) {
            this.z = arg0.z;
            this.y = arg0.y;
            this.x = arg0.x;
            this.w = arg0.w;
        }
    }
}
