import ByteArrayWrapper from '#/io/ByteArrayWrapper.js';
import Packet from '#/io/Packet.js';
import Js5 from '#/js5/Js5.js';
import Js5Net from '#/js5/Js5Net.js';
import Js5NetThread from '#/js5/Js5NetThread.js';

export default class Js5Loader extends Js5 {
    static readonly js5Crc32 = {
        value: 0,
        reset(): void {
            this.value = 0;
        },
        update(data: Uint8Array, start: number = 0, length: number = data.length - start): void {
            this.value = Packet.getcrc(start, data, start + length);
        },
        getValue(): number {
            return this.value;
        }
    };

    loadedGroups: boolean[] = [];
    archive: number;
    loadStatus: boolean = false;
    indexCrc: number = 0;
    indexVersion: number = 0;
    remoteEnabled: boolean;
    lastLocalGroup: number = -1;

    constructor(
        archive: number,
        private readonly net: Js5Net,
        discardPacked: boolean,
        discardUnpacked: boolean,
        remoteEnabled: boolean
    ) {
        super(discardPacked, discardUnpacked);
        this.archive = archive;
        this.remoteEnabled = remoteEnabled;
        this.net.registerProvider(this.archive, this);
    }

    requestIndex(crc: number, version: number): void {
        this.indexCrc = crc;
        this.indexVersion = version;
        if (Js5NetThread.db == null) {
            this.net.queueRequest(this, this.archive, 255, 0, this.indexCrc, true);
        } else {
            Js5NetThread.queueRequest(this, this.archive, 255);
        }
    }

    override requestGroupDownload2(group: number): void {
        if (!this.isGroupValid(group)) {
            return;
        }
        if (Js5NetThread.db == null) {
            this.net.queueRequest(this, group, this.archive, 2, this.groupChecksums[group], true);
        } else {
            Js5NetThread.queueRequest(this, group, this.archive);
        }
    }

    override updateCacheHint(group: number): void;
    override updateCacheHint(group: string): void;
    override updateCacheHint(group: number | string): void {
        if (typeof group === 'string') {
            super.updateCacheHint(group);
            return;
        }
        if (this.isGroupValid(group)) {
            this.net.updateCacheHint(this.archive, group);
        }
    }

    write(group: number, data: Uint8Array, keepPacked: boolean, isIndex: boolean): void {
        if (isIndex) {
            if (this.loadStatus) {
                throw new Error();
            }
            if (Js5NetThread.db != null) {
                Js5NetThread.queueWrite(data, this.archive, 255);
            }
            this.decodeIndex(data);
            void this.loadAllLocal();
            return;
        }

        data[data.length - 2] = this.groupVersions[group] >> 8;
        data[data.length - 1] = this.groupVersions[group];
        if (Js5NetThread.db != null) {
            Js5NetThread.queueWrite(data, group, this.archive);
            this.loadedGroups[group] = true;
        }
        if (keepPacked) {
            this.packed[group] = ByteArrayWrapper.wrap(data);
        }
    }

    loadIndex(data: Uint8Array | null | undefined, group: number, archive: number, keepPacked: boolean): void {
        if (archive !== 255) {
            if (!keepPacked && group === this.lastLocalGroup) {
                this.loadStatus = true;
            }
            let valid = false;
            if (data && data.length > 2) {
                Js5Loader.js5Crc32.reset();
                Js5Loader.js5Crc32.update(data, 0, data.length - 2);
                const crc = Js5Loader.js5Crc32.getValue();
                const version = ((data[data.length - 2] & 0xff) << 8) + (data[data.length - 1] & 0xff);
                valid = crc === this.groupChecksums[group] && this.groupVersions[group] === version;
            }
            if (!valid) {
                this.loadedGroups[group] = false;
                if (this.remoteEnabled || keepPacked) {
                    this.net.queueRequest(this, group, this.archive, 2, this.groupChecksums[group], keepPacked);
                }
                return;
            }
            this.loadedGroups[group] = true;
            if (keepPacked && data) {
                this.packed[group] = ByteArrayWrapper.wrap(data);
            }
            return;
        }

        if (this.loadStatus) {
            throw new Error();
        }
        let valid = false;
        if (data) {
            Js5Loader.js5Crc32.reset();
            Js5Loader.js5Crc32.update(data, 0, data.length);
            const crc = Js5Loader.js5Crc32.getValue();
            if (crc === this.indexCrc) {
                try {
                    const packet = new Packet(Js5.getUncompressedPacket(data));
                    const protocol = packet.g1();
                    if (protocol === 5 || protocol === 6) {
                        const indexVersion = protocol >= 6 ? packet.g4() : 0;
                        valid = this.indexVersion === indexVersion;
                    }
                } catch {
                    valid = false;
                }
            }
        }
        if (!valid || !data) {
            this.net.queueRequest(this, this.archive, 255, 0, this.indexCrc, true);
            return;
        }
        this.decodeIndex(data);
        void this.loadAllLocal();
    }

    getIndexPercentage(): number {
        if (this.loadStatus) {
            return 100;
        } else if (this.packed == null) {
            const progress = this.net.transferProgress(255, this.archive);
            return progress >= 100 ? 99 : progress;
        } else {
            return 99;
        }
    }

    override getGroupLoadProgress(group: number): number;
    override getGroupLoadProgress(group: string): number;
    override getGroupLoadProgress(group: number | string): number {
        if (typeof group === 'string') {
            return this.getGroupLoadProgress(this.getGroupId(group));
        }
        if (!this.isGroupValid(group)) {
            return 0;
        }

        if (this.packed[group] != null) {
            return 100;
        }

        return this.loadedGroups[group] ? 100 : this.net.transferProgress(this.archive, group);
    }

    loadAllLocal(): void {
        this.loadedGroups = new Array(this.packed.length).fill(false);
        this.loadStatus = false;

        if (Js5NetThread.db == null) {
            this.loadStatus = true;
            return;
        }

        this.loadStatus = true;
    }
}
