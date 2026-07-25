import Linkable from '#/datastruct/Linkable.js';
import type JagString from '#/jstring/JagString.js';

export default class ClanChannelUser extends Linkable {
    rank: number = 0;
    world: number = 0;
    displayName: string | null = null;
    name: JagString | null = null;
}
