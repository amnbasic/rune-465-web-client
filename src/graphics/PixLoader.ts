import Pix32 from '#/graphics/Pix32.js';
import Pix8 from '#/graphics/Pix8.js';
import PixFont from '#/graphics/PixFont.js';
import SoftwarePix8 from '#/graphics/SoftwarePix8.js';
import SoftwarePix32 from '#/graphics/SoftwarePix32.js';
import SoftwarePixFont from '#/graphics/SoftwarePixFont.js';

import Packet from '#/io/Packet.js';
import Js5 from '#/js5/Js5.js';

export default class PixLoader {
    static count: number = 0;
    static xof: Int32Array = new Int32Array(0);
    static yof: Int32Array = new Int32Array(0);
    static wi: Int32Array = new Int32Array(0);
    static hi: Int32Array = new Int32Array(0);
    static owi: number = 0;
    static ohi: number = 0;
    static bpal: Int32Array = new Int32Array(0);
    static bspr: Int8Array[] = [];

    static depack(src: Uint8Array): void;
    static depack(js5: Js5, group: number, file: number): boolean;
    static depack(file: number, js5: Js5): boolean;
    static depack(arg0: Uint8Array | Js5 | number, arg1?: Js5 | number, arg2?: number): void | boolean {
        if (arg0 instanceof Js5) {
            const var3 = arg0.getFile(arg2 as number, arg1 as number);
            if (var3 === null) {
                return false;
            }
            this.depack(var3);
            return true;
        }

        if (typeof arg0 === 'number') {
            const var2 = (arg1 as Js5).getFile(arg0);
            if (var2 === null) {
                return false;
            }
            this.depack(var2);
            return true;
        }

        const src = arg0;
        const packet = new Packet(src);
        packet.pos = src.length - 2;
        this.count = packet.g2();

        this.xof = new Int32Array(this.count);
        this.yof = new Int32Array(this.count);
        this.wi = new Int32Array(this.count);
        this.hi = new Int32Array(this.count);
        this.bspr = new Array(this.count);

        packet.pos = src.length - this.count * 8 - 7;
        this.owi = packet.g2();
        this.ohi = packet.g2();
        const paletteCount = (packet.g1() & 0xff) + 1;

        for (let i = 0; i < this.count; i++) {
            this.xof[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.yof[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.wi[i] = packet.g2();
        }
        for (let i = 0; i < this.count; i++) {
            this.hi[i] = packet.g2();
        }

        packet.pos = src.length + 3 - this.count * 8 - paletteCount * 3 - 7;
        this.bpal = new Int32Array(paletteCount);
        for (let i = 1; i < paletteCount; i++) {
            this.bpal[i] = packet.g3();
            if (this.bpal[i] === 0) {
                this.bpal[i] = 1;
            }
        }

        packet.pos = 0;
        for (let i = 0; i < this.count; i++) {
            const width = this.wi[i];
            const height = this.hi[i];
            const pixels = new Int8Array(width * height);
            this.bspr[i] = pixels;

            const encoding = packet.g1();
            if (encoding === 0) {
                for (let pixel = 0; pixel < pixels.length; pixel++) {
                    pixels[pixel] = packet.g1b();
                }
            } else if (encoding === 1) {
                for (let x = 0; x < width; x++) {
                    for (let y = 0; y < height; y++) {
                        pixels[y * width + x] = packet.g1b();
                    }
                }
            }
        }
    }

    static makePix8(): Pix8;
    static makePix8(group: number, js5: Js5): Pix8 | null;
    static makePix8(group?: number, js5?: Js5): Pix8 | null {
        if (group !== undefined && js5 !== undefined) {
            return this.depack(js5, group, 0) ? this.makePix8() : null;
        }
        const image = new SoftwarePix8(this.owi, this.ohi, this.xof[0], this.yof[0], this.wi[0], this.hi[0], this.bspr[0], this.bpal);
        this.unload();
        return image;
    }

    static makeSoftwarePix8(): SoftwarePix8;
    static makeSoftwarePix8(js5: Js5, file: number): SoftwarePix8 | null;
    static makeSoftwarePix8(js5?: Js5, file?: number): SoftwarePix8 | null {
        if (js5 !== undefined && file !== undefined) {
            return this.depack(js5, file, 0) ? this.makeSoftwarePix8() : null;
        }
        const image = new SoftwarePix8(this.owi, this.ohi, this.xof[0], this.yof[0], this.wi[0], this.hi[0], this.bspr[0], this.bpal);
        this.unload();
        return image;
    }

    static makePix8Array(): Pix8[];
    static makePix8Array(group: string, js5: Js5, file: string): Pix8[] | null;
    static makePix8Array(group: number, js5: Js5, file: number): Pix8[] | null;
    static makePix8Array(js5: Js5, group: number): Pix8[] | null;
    static makePix8Array(arg0?: string | number | Js5, arg1?: Js5 | number, arg2?: string | number): Pix8[] | null {
        if (typeof arg0 === 'string') {
            const group = (arg1 as Js5).getGroupId(arg0);
            const file = (arg1 as Js5).getFileId(arg2 as string, group);
            return this.depack(arg1 as Js5, group, file) ? this.makePix8Array() : null;
        }
        if (arg0 instanceof Js5) {
            return this.depack(arg1 as number, arg0) ? this.makePix8Array() : null;
        }
        if (typeof arg0 === 'number' && arg1 instanceof Js5 && typeof arg2 === 'number') {
            return this.depack(arg1, arg0, arg2) ? this.makePix8Array() : null;
        }
        const images = new Array<Pix8>(this.count);
        for (let i = 0; i < this.count; i++) {
            images[i] = new SoftwarePix8(this.owi, this.ohi, this.xof[i], this.yof[i], this.wi[i], this.hi[i], this.bspr[i], this.bpal);
        }
        this.unload();
        return images;
    }

    static makeSoftwarePix8Array(): SoftwarePix8[];
    static makeSoftwarePix8Array(group: string, file: string, js5: Js5): SoftwarePix8[] | null;
    static makeSoftwarePix8Array(js5: Js5, group: number): SoftwarePix8[] | null;
    static makeSoftwarePix8Array(arg0?: string | Js5, arg1?: string | number, arg2?: Js5): SoftwarePix8[] | null {
        if (typeof arg0 === 'string') {
            const group = arg2!.getGroupId(arg0);
            const file = arg2!.getFileId(arg1 as string, group);
            return this.depack(arg2!, group, file) ? this.makeSoftwarePix8Array() : null;
        }
        if (arg0 !== undefined && arg1 !== undefined) {
            return this.depack(arg1 as number, arg0) ? this.makeSoftwarePix8Array() : null;
        }
        const images = new Array<SoftwarePix8>(this.count);
        for (let i = 0; i < this.count; i++) {
            images[i] = new SoftwarePix8(this.owi, this.ohi, this.xof[i], this.yof[i], this.wi[i], this.hi[i], this.bspr[i], this.bpal);
        }
        this.unload();
        return images;
    }

    static makePix32(): Pix32;
    static makePix32(js5: Js5, group: number, file: number): Pix32 | null;
    static makePix32(group: string, file: string, js5: Js5): Pix32 | null;
    static makePix32(arg0?: Js5 | string, arg1?: number | string, arg2?: number | Js5): Pix32 | null {
        if (arg0 instanceof Js5 && typeof arg1 === 'number' && typeof arg2 === 'number') {
            return this.depack(arg0, arg1, arg2) ? this.makePix32() : null;
        }
        if (typeof arg0 === 'string') {
            const group = (arg2 as Js5).getGroupId(arg0);
            const file = (arg2 as Js5).getFileId(arg1 as string, group);
            return this.depack(arg2 as Js5, group, file) ? this.makePix32() : null;
        }
        const src = this.bspr[0];
        const length = this.wi[0] * this.hi[0];
        const pixels = new Int32Array(length);
        for (let i = 0; i < length; i++) {
            pixels[i] = this.bpal[src[i] & 0xff];
        }
        const image = new SoftwarePix32(this.owi, this.ohi, this.xof[0], this.yof[0], this.wi[0], this.hi[0], pixels);
        this.unload();
        return image;
    }

    static makeSoftwarePix32(): SoftwarePix32;
    static makeSoftwarePix32(js5: Js5, file: number): SoftwarePix32 | null;
    static makeSoftwarePix32(js5: Js5, file: number, group: number): SoftwarePix32 | null;
    static makeSoftwarePix32(group: string, js5: Js5, file: string): SoftwarePix32 | null;
    static makeSoftwarePix32(arg0?: Js5 | string, arg1?: number | Js5, arg2?: number | string): SoftwarePix32 | null {
        if (arg0 instanceof Js5 && typeof arg1 === 'number') {
            return arg2 === undefined ? (this.depack(arg1, arg0) ? this.makeSoftwarePix32() : null) : this.depack(arg0, arg2 as number, arg1) ? this.makeSoftwarePix32() : null;
        }
        if (typeof arg0 === 'string') {
            const group = (arg1 as Js5).getGroupId(arg0);
            const file = (arg1 as Js5).getFileId(arg2 as string, group);
            return this.depack(arg1 as Js5, group, file) ? this.makeSoftwarePix32() : null;
        }
        const src = this.bspr[0];
        const length = this.wi[0] * this.hi[0];
        const pixels = new Int32Array(length);
        for (let i = 0; i < length; i++) {
            pixels[i] = this.bpal[src[i] & 0xff];
        }
        const image = new SoftwarePix32(this.owi, this.ohi, this.xof[0], this.yof[0], this.wi[0], this.hi[0], pixels);
        this.unload();
        return image;
    }

    static makePix32Array(): Pix32[];
    static makePix32Array(group: string, js5: Js5, file: string): Pix32[] | null;
    static makePix32Array(file: number, js5: Js5, group: number): Pix32[] | null;
    static makePix32Array(arg0?: string | number, arg1?: Js5, arg2?: string | number): Pix32[] | null {
        if (typeof arg0 === 'string') {
            const group = arg1!.getGroupId(arg0);
            const file = arg1!.getFileId(arg2 as string, group);
            return this.depack(arg1!, group, file) ? this.makePix32Array() : null;
        }
        if (typeof arg0 === 'number' && arg1 !== undefined && typeof arg2 === 'number') {
            return this.depack(arg1, arg2, arg0) ? this.makePix32Array() : null;
        }
        const images = new Array<Pix32>(this.count);
        for (let i = 0; i < this.count; i++) {
            const length = this.hi[i] * this.wi[i];
            const pixels = new Int32Array(length);
            const src = this.bspr[i];
            for (let j = 0; j < length; j++) {
                pixels[j] = this.bpal[src[j] & 0xff];
            }
            images[i] = new SoftwarePix32(this.owi, this.ohi, this.xof[i], this.yof[i], this.wi[i], this.hi[i], pixels);
        }
        this.unload();
        return images;
    }

    static makeSoftwarePix32Array(): SoftwarePix32[];
    static makeSoftwarePix32Array(group: number, js5: Js5, file: number): SoftwarePix32[] | null;
    static makeSoftwarePix32Array(group: string, file: string, js5: Js5): SoftwarePix32[] | null;
    static makeSoftwarePix32Array(group?: number | string, js5OrFile?: Js5 | string, fileOrJs5?: number | Js5): SoftwarePix32[] | null {
        if (typeof group === 'string') {
            const js5 = fileOrJs5 as Js5;
            const groupId = js5.getGroupId(group);
            const file = js5.getFileId(js5OrFile as string, groupId);
            return this.depack(js5, groupId, file) ? this.makeSoftwarePix32Array() : null;
        }
        if (group !== undefined && js5OrFile instanceof Js5 && typeof fileOrJs5 === 'number') {
            return this.depack(js5OrFile, fileOrJs5, group) ? this.makeSoftwarePix32Array() : null;
        }
        const images = new Array<SoftwarePix32>(this.count);
        for (let i = 0; i < this.count; i++) {
            const length = this.wi[i] * this.hi[i];
            const src = this.bspr[i];
            const pixels = new Int32Array(length);
            for (let j = 0; j < length; j++) {
                pixels[j] = this.bpal[src[j] & 0xff];
            }
            images[i] = new SoftwarePix32(this.owi, this.ohi, this.xof[i], this.yof[i], this.wi[i], this.hi[i], pixels);
        }
        this.unload();
        return images;
    }

    static makePixFont(metrics: Uint8Array | null): PixFont | null;
    static makePixFont(file: number, fontmetrics: Js5, group: number, sprites: Js5): PixFont | null;
    static makePixFont(fontmetrics: Js5, sprites: Js5, file: string, group: string): PixFont | null;
    static makePixFont(arg0: Uint8Array | null | number | Js5, arg1?: Js5, arg2?: number | string, arg3?: Js5 | string): PixFont | null {
        if (arg0 === null) {
            return null;
        }
        if (arg0 instanceof Uint8Array) {
            const font = new SoftwarePixFont(arg0, this.xof, this.yof, this.wi, this.hi, this.bspr);
            this.unload();
            return font;
        }
        if (typeof arg0 === 'number') {
            return this.depack(arg3 as Js5, arg2 as number, arg0) ? this.makePixFont(arg1!.getFile(arg0, arg2 as number)) : null;
        }
        const group = arg1!.getGroupId(arg3 as string);
        const file = arg1!.getFileId(arg2 as string, group);
        return this.makePixFont(file, arg0, group, arg1!);
    }

    static unload(): void {
        PixLoader.xof = null!;
        PixLoader.hi = null!;
        PixLoader.yof = null!;
        PixLoader.bspr = null!;
        PixLoader.bpal = null!;
        PixLoader.wi = null!;
    }

    static makePix8_(arg0: number, arg1: Js5): Pix8 | null {
        return PixLoader.depack(arg0, arg1) ? PixLoader.makePix8() : null;
    }
}
