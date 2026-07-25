import type ModelSource from '#/dash3d/ModelSource.js';
import type { SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::dash3d::Sprite
export default class Sprite {
    level: number = 0;
    y: number = 0;
    x: number = 0;
    yaw: number = 0;
    z: number = 0;
    model: ModelSource = null!;
    minTileX: number = 0;
    maxTileX: number = 0;
    minTileZ: number = 0;
    maxTileZ: number = 0;
    distance: number = 0;
    cycle: number = 0;
    typecode: SceneTag = 0;
}
