import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::dash3d::Decor
export default class Decor {
    y: number = 0;
    x: number = 0;
    z: number = 0;
    wshape: number = 0;
    yof: number = 0;
    xof: number = 0;
    zof: number = 0;
    model: ModelSource = null!;
    model2: ModelSource | null = null;
    typecode: SceneTag = 0;
}
