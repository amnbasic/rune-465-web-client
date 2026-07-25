import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::dash3d::GroundDecor
export default class GroundDecor {
    y: number = 0;
    x: number = 0;
    z: number = 0;
    typecode: SceneTag = 0;
    model: ModelSource = null!;
}
