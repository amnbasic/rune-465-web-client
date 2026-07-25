import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::dash3d::Wall
export default class Wall {
    y: number = 0;
    x: number = 0;
    z: number = 0;
    typeA: number = 0;
    typeB: number = 0;
    modelA: ModelSource = null!;
    modelB: ModelSource = null!;
    typecode: SceneTag = 0;
}
