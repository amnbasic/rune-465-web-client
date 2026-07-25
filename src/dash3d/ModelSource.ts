import Linkable2 from '#/datastruct/Linkable2.js';

export type SceneTag = number | bigint;

export default abstract class ModelSource extends Linkable2 {
    method559(): ModelSource {
        return this;
    }

    method570(_model: ModelSource, _x: number, _y: number, _z: number, _allowFaceRemoval: boolean): void {}

    method544(): boolean {
        return false;
    }

    method537(_x: number, _z: number): void {}

    abstract method87(yaw: number, sinEyePitch: number, cosEyePitch: number, sinEyeYaw: number, cosEyeYaw: number, relativeX: number, relativeY: number, relativeZ: number, typecode: SceneTag): void;

    abstract method88(): number;
}
