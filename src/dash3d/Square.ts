import Linkable from '#/datastruct/Linkable.js';

import GroundDecor from '#/dash3d/GroundDecor.js';
import Sprite from '#/dash3d/Sprite.js';
import GroundObject from '#/dash3d/GroundObject.js';
import Ground from '#/dash3d/Ground.js';
import QuickGround from '#/dash3d/QuickGround.js';
import Wall from '#/dash3d/Wall.js';
import Decor from '#/dash3d/Decor.js';

// jag::oldscape::dash3d::Square
export default class Square extends Linkable {
    level: number;
    readonly x: number;
    readonly z: number;
    readonly originalLevel: number;
    quickGround: QuickGround | null = null;
    ground: Ground | null = null;
    wall: Wall | null = null;
    decor: Decor | null = null;
    groundDecor: GroundDecor | null = null;
    groundObject: GroundObject | null = null;
    spriteCount: number = 0;
    readonly sprites: (Sprite | null)[] = new Array(5).fill(null);
    readonly spriteSpan: Int32Array = new Int32Array(5);
    spriteSpans: number = 0;
    drawLevel: number = 0;
    drawFront: boolean = false;
    drawBack: boolean = false;
    drawSprites: boolean = false;
    checkLocSpans: number = 0;
    blockLocSpans: number = 0;
    inverseBlockLocSpans: number = 0;
    backWallTypes: number = 0;
    linkedSquare: Square | null = null;

    constructor(level: number, x: number, z: number) {
        super();
        this.z = z;
        this.originalLevel = this.level = level;
        this.x = x;
    }
}
