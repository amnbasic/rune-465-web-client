import LruCache from '#/datastruct/LruCache.js';
import ModelSourceNode from '#/dash3d/ModelSourceNode.js';
import ModelSource from '#/dash3d/ModelSource.js';

export default class ModelSourceCache {
    readonly cache: LruCache<ModelSourceNode> = new LruCache(30);

    constructor(_size: number) {}

    put(key: bigint, arg1: ModelSource): void {
        this.cache.put(key, new ModelSourceNode(arg1));
    }

    remove(key: bigint): void {
        this.cache.remove(key);
    }

    clear(): void {
        this.cache.clear();
    }

    find(key: bigint): ModelSource | null {
        const var3 = this.cache.find(key);
        return var3 == null ? null : var3.model;
    }
}
