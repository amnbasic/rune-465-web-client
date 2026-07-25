import Linkable2 from '#/datastruct/Linkable2.js';
import type ModelSource from '#/dash3d/ModelSource.js';

export default class ModelCacheLit extends Linkable2 {
    model: ModelSource | null = null;
}
