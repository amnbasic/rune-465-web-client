import ModelSource, { type SceneTag } from '#/dash3d/ModelSource.js';

// jag::oldscape::dash3d::GroundObject
export default class GroundObject {
    y: number = 0;
    x: number = 0;
    z: number = 0;
    bottomObj: ModelSource | null = null;
    topObj: ModelSource | null = null;
    middleObj: ModelSource | null = null;
    typecode: SceneTag = 0;
    height: number = 0;
}
