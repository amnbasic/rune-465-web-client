/**
 * The chat tabs — All / Game / Public / Private / Channel / Clan / Trade — as a filtered VIEW of
 * the client's message history rather than a second chatbox.
 *
 * ---------------------------------------------------------------------------------------------
 * THE MECHANISM: THE CACHE'S CHATBOX ASKS US FOR ITS LINES, SO WE CAN ANSWER WITH FEWER
 * ---------------------------------------------------------------------------------------------
 *
 * Widget 137's hundred scrollback lines are filled by the cache's own clientscripts, and those
 * scripts do not own the history — they *ask* for it, one line at a time, through opcodes this
 * client implements: `chat_gethistorylength` (5017) for the count, then `5003`/`5004`/`5010`/
 * `5011`/`5012` for each line's text, type, sender, screen name and phrase id
 * (`ScriptRunner.ts`), every one of them reading the 100-entry ring that `Client.addChat`
 * maintains.
 *
 * So a filter here is an INDEX REMAP, not a reimplementation: report a smaller count, and map
 * line `i` to the `i`-th line that passes. The cache's chatbox, its per-line click hooks, its
 * colouring and its scrollbar all keep working, on a shorter list, and nothing in widget 137 is
 * touched. Writing our own chatbox would have meant reproducing all of that and then diverging
 * from it.
 *
 * A filtered-out line resolves to index `OUT`, which is past the `< 100` guard every one of those
 * opcodes already has — so an out-of-range request answers empty through the cache's own path
 * rather than through a special case.
 *
 * `All` is a true pass-through: `count()` and `line()` return exactly what the client would have
 * returned with this file absent. There is no filtering cost, and no behaviour change, unless a
 * tab is actually selected.
 *
 * NO IMPORT OF `Client`. The history is pushed in by `Client.addChat`, the same discipline
 * `ControlBar` and `ScreenMode` follow — see docs/display-and-settings.md. `ScriptRunner` already
 * imports both, and it is the only place that needs them together.
 */

/**
 * Which `chatType` belongs to which tab.
 *
 * EVERY ONE OF THESE IS READ OFF AN `addChat` CALL SITE, not guessed from OSRS. Two of them are
 * worth knowing because they are not what they look like:
 *
 * - **9 is the friends-chat channel** (`Client.friendAddChat`), and **20 is that channel's
 *   quickchat** (the `chatOwner`/`screenName` branch of the public-chat packet). Neither is
 *   ordinary public chat, which is what a reasonable person would assume 20 was.
 * - **10-16 are not clan chat**, they are social requests: assist, clan invite, trade, assist
 *   accept, duel stake, duel friend, clan request. Only 11 and 16 concern clans at all, and both
 *   are invitations rather than channel traffic.
 *
 * `Game` is also the fallback: any type not listed here shows under it, so a message can never
 * become invisible by being unrecognised — the worst case is that it files under the wrong tab.
 */
export const CHAT_CHIPS: { label: string; types: number[] | null }[] = [
    { label: 'All', types: null },
    // 0 = server and client notices, 5 = a friend logging in or out.
    { label: 'Game', types: [0, 5] },
    // 1 = mod public, 2 = public, 17 = public quickchat.
    { label: 'Public', types: [1, 2, 17] },
    // 3 = received, 6 = sent, 7 = received from a mod, 18/19 = quickchat in/out.
    { label: 'Private', types: [3, 6, 7, 18, 19] },
    // 4 = trade request, 8 = duel request, 10/13 = assist, 12 = trade, 14/15 = duel.
    // Empty until the server grows a trade system; kept because that is a planned feature and the
    // client already decodes every one of these the moment it starts sending them.
    { label: 'Trade', types: [4, 8, 10, 12, 13, 14, 15] }
];

/**
 * OSRS's `Channel` and `Clan` tabs are deliberately absent, because **this server cannot produce a
 * single message that would appear under them, and is not going to.** Checked against the server
 * rather than assumed: `server/src/engine/net/handler/` implements public chat, private messages,
 * the friend and ignore lists and the chat-mode settings, and nothing else — there is no
 * friends-chat channel, no clan system and no quickchat. A tab that can only ever be empty is
 * worse than no tab, because it reads as broken.
 *
 * Their mapping is recorded here so that adding one back is editing the list above rather than
 * re-deriving the ids, and because two of them are not what they look like:
 *
 * | Tab     | types | what they are |
 * |---------|-------|---------------|
 * | Channel | 9, 20 | the friends-chat channel (`Client.friendAddChat`) and its quickchat — **not** public chat, which is what a reasonable person would assume 20 was |
 * | Clan    | 11, 16 | clan invite and clan request. Note that **10-16 are not clan chat**; they are social requests, and only these two concern clans at all |
 */

/** The chip every unlisted type falls under, so nothing can go missing. */
const FALLBACK: number = 1;

export default class ChatFilter {
    /** How many lines the ring holds, and the `< 100` guard every chat opcode already applies. */
    private static readonly CAPACITY: number = 100;

    /** An index past the guard: the cache's own accessors answer empty for it. */
    static readonly OUT: number = 1000;

    /** Index into `CHAT_CHIPS`. 0 is All, and All is a pass-through. */
    static active: number = 0;

    private static source: ArrayLike<number> | null = null;
    private static sourceLength: number = 0;
    private static view: number[] = [];
    private static dirty: boolean = true;

    /** Which chip a type files under, for building the view and for testing one line. */
    private static chipOf(type: number): number {
        for (let i = 1; i < CHAT_CHIPS.length; i++) {
            const types = CHAT_CHIPS[i].types;
            if (types !== null && types.includes(type)) {
                return i;
            }
        }
        return FALLBACK;
    }

    /**
     * A message arrived, or the history was cleared. Called by `Client.addChat` with the ring it
     * just wrote — the reference is kept, not copied, so this stays a view rather than a second
     * copy of the chat that could disagree with the first.
     */
    static onMessage(types: ArrayLike<number>, length: number): void {
        ChatFilter.source = types;
        ChatFilter.sourceLength = length;
        ChatFilter.dirty = true;
    }

    /** Show a different tab. The caller repaints — see the `chatTransmitNum` note in Client. */
    static select(chip: number): void {
        if (chip < 0 || chip >= CHAT_CHIPS.length || chip === ChatFilter.active) {
            return;
        }
        ChatFilter.active = chip;
        ChatFilter.dirty = true;
    }

    private static rebuild(): void {
        ChatFilter.dirty = false;
        ChatFilter.view = [];
        const types = ChatFilter.source;
        if (types === null || ChatFilter.active === 0) {
            return;
        }
        const lines: number = Math.min(ChatFilter.CAPACITY, ChatFilter.sourceLength);
        for (let i = 0; i < lines; i++) {
            if (ChatFilter.chipOf(types[i]) === ChatFilter.active) {
                ChatFilter.view.push(i);
            }
        }
    }

    /** The history length the chatbox should see. */
    static count(fullLength: number): number {
        if (ChatFilter.active === 0) {
            return fullLength;
        }
        if (ChatFilter.dirty) {
            ChatFilter.rebuild();
        }
        return ChatFilter.view.length;
    }

    /** Map a line the chatbox asked for onto the line it should actually get. */
    static line(index: number): number {
        if (ChatFilter.active === 0) {
            return index;
        }
        if (ChatFilter.dirty) {
            ChatFilter.rebuild();
        }
        if (index < 0 || index >= ChatFilter.view.length) {
            return ChatFilter.OUT;
        }
        return ChatFilter.view[index];
    }
}
