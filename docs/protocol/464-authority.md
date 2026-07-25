# 464 Server↔Client Packet Protocol — Authority for LC500 retarget

Extracted and cross-checked from the two authorities on 2026-07-24. Goal: give LC500 the
exact opcode numbers + sizes + which-packet-is-which so its wire layer can be retargeted onto
the RuneJS 464 server.

## Authorities used

| # | Role | Files |
|---|------|-------|
| 1 | Busted TS port of the 464 Java client | `client-ts/src/jagex2/io/Protocol.ts` (`SERVERPROT_SIZES` = the raw Java `AppletListener.anIntArray1465` table; `CLIENTPROT_SCRAMBLED`), `client-ts/src/jagex2/io/ServerProt.ts` + `ClientProt.ts` (opcode→name maps). Second copy at `client-ts/src/io/ServerProt.ts` (`SERVER_PACKET_SIZES` + a `ServerProt` object). |
| 2 | The live 464 server | `server/src/engine/net/packet.ts` (`PacketType` FIXED/DYNAMIC_SMALL/DYNAMIC_LARGE), `outbound-packet-handler.ts` (opcode + byte layout of every packet the server actually sends), `inbound-packet-handler.ts` (`PACKET_SIZES_464` fallback), and `server/src/engine/net/handler/**` (the **registered** inbound handlers = the real inbound sizes). |

Note: the task brief said "packet.ts has a ServerProt enum" — it does **not**. `packet.ts` only
defines the `PacketType` enum. The server emits **raw numeric opcodes** via `Packet.create(N, type)`
in `outbound-packet-handler.ts`; there is no server-side ServerProt enum. The opcode→name map lives
only client-side.

## Transport facts (verified, load-bearing for the retarget)

- **Plaintext, no ISAAC, no opcode scramble.** ISAAC is disabled on both sides for the 464
  extraction server (client patched to plaintext). Server: `packet.ts` `toBuffer()` comment + `player.ts:521`.
  Client send: `Packet.p1isaac(op) = (op + (random?.nextInt ?? 0)) & 0xff` — `random` is null →
  raw opcode (`client-ts/src/jagex2/io/Packet.ts:184`). Client read: `packetType -= randomIn.nextInt`
  only if `randomIn` set (`game.ts:5040`). **`CLIENTPROT_SCRAMBLED` is defined but never applied on the
  send path — vestigial. LC500 sends the plaintext ClientProt opcode byte directly.**
- **Size semantics are identical on both sides.** Client read (`game.ts:5043-5066`) and server
  `PacketType` map 1:1:
  - `SERVERPROT_SIZES[op] >= 0` → **FIXED**, that many payload bytes, no length header.
  - `== -1` → **DYNAMIC_SMALL** = 1 unsigned length byte precedes payload.
  - `== -2` → **DYNAMIC_LARGE** = 2 big-endian length bytes precede payload.
- **Inbound size precedence (server, `player.ts:523-531`):** if an opcode has a **registered
  handler**, its `size` field wins; **only unregistered opcodes** fall back to `PACKET_SIZES_464`
  (default `-3` = "consume all remaining" = desync). Inbound `-1` = 1 size byte; there is no inbound
  `-2` path in use. So for client→server, **the registered handler table below is authoritative**,
  not the fallback array.

---

## SERVER → CLIENT (ServerProt)

### Size table = `Protocol.SERVERPROT_SIZES` (jagex2 copy) — the authority

This is the raw 464 Java client table, **with two hand-patches** the working port applied. LC500
must use the **patched** values or those two packets mis-size.

| op | raw Java | patched (use this) | packet |
|----|----------|--------------------|--------|
| 83 | 0 | **-1** (DYNAMIC_SMALL) | CONSOLE_MESSAGE |
| 88 | 0 | **1** | BLINK_TAB |

(The `client-ts/src/io/ServerProt.ts` copy still has the raw `83=0, 88=0`; the `jagex2` copy is the corrected one. Everything else is identical between the two copies.)

### Named packets the server actually sends — verified opcode + size + layout

All FIXED/DYNAMIC sizes below were cross-checked: `SERVERPROT_SIZES[op]` vs the bytes
`outbound-packet-handler.ts` writes. Unless flagged in "Deltas", they agree exactly.

| Opcode | Name (client) | Server method | Type | Payload bytes | Layout |
|-------:|---------------|---------------|------|--------------:|--------|
| **90** | PLAYER_INFO | `player-sync-task.ts:32` | DYNAMIC_LARGE | -2 | bit-packed player sync |
| **174** | NPC_INFO | `npc-sync-task.ts:192` | DYNAMIC_LARGE | -2 | bit-packed npc sync |
| **221** | REBUILD_NORMAL (REBUILD_REGION) | `updateCurrentMapChunk` | DYNAMIC_LARGE | -2 | shortA(regionY), XTEA keys (int1 mid-endian ×4/region), LEshort(regionX), short(localX), byte(level), short(localY) |
| **222** | CONSTRUCT_MAP_REGION | `constructMapRegion` | DYNAMIC_LARGE | -2 | header: LEshortA(regionY), byteC(level), LEshortA(regionX), LEshortA(localY), shortA(localX); then bit grid (13×13×4, 1+2+10+11+2+1 bits/chunk); then XTEA blocks (4 BE ints/region) |
| **132** | UPDATE_ZONE_PARTIAL_FOLLOWS (set-ref-position / DATA_LAND) | `updateReferencePosition` | FIXED | 2 | byte(offsetY), byte(offsetX) — **raw u8, NOT byteC** |
| **159** | UPDATE_ZONE_FULL_FOLLOWS (clearChunk) | `clearChunk` | FIXED | 2 | byteC(offsetX), byteC(offsetZ) |
| **108** | MESSAGE_GAME (chatbox) | `chatboxMessage` | DYNAMIC_SMALL | -1 | string(msg) |
| **83** | CONSOLE_MESSAGE | `consoleMessage` | DYNAMIC_SMALL | -1 | string |
| **85** | (console command) | `sendConsoleCommand` | DYNAMIC_SMALL | -1 | string(cmd), string(help) — **see Delta** |
| **245** | VARP_SMALL (clientconfig small) | `updateClientConfig` | FIXED | 3 | shortA(configId), byte(value) — used when 0≤value<128 |
| **37** | VARP_LARGE (clientconfig large) | `updateClientConfig` | FIXED | 6 | shortA(configId), LEint(value) — used when value≥128 or <0 |
| **68** | RESET_CLIENT_VARCACHE (RESET_CONFIGS) | `resetAllClientConfigs` | FIXED | 0 | — |
| **238** | IF_OPENCHATMODAL / sendInterface | many (`showChatboxWidget`, tabs, etc.) | FIXED | 7 | int(pos<<16\|window), short(ifaceId), byteC(walkable) |
| **137** | IF_CLOSE / removeInterface | `closeActiveWidgets`, `showScreenOverlayWidget(-1)` | FIXED | 4 | int(window<<16\|pos) |
| **195** | IF_OPENMAINMODAL (fullscreen) | `showFullscreenWidget` | FIXED | writes 4 | short(secondary), short(widget) — **DELTA: table says 0** |
| **237** | IF_SHOWSIDE (showTabWidget) | `showTabWidget` | FIXED | writes 2 | short(widgetId) — **DELTA: table says 3** |
| **77** | WINDOW_PANE | `sendWindowPane` | FIXED | 2 | LEshortA(windowId) |
| **92** | UPDATE_INV_FULL | `sendUpdateAllWidgetItems` | DYNAMIC_LARGE | -2 | int(widget<<16\|cont), short(type), short(count), then per slot: byteC(count)[+int if≥255], LEshort(itemId+1) |
| **120** | UPDATE_INV_PARTIAL | `sendUpdateInvSlots` / `sendUpdateSingleWidgetItem` | DYNAMIC_LARGE | -2 | int(widget<<16\|cont), short(type), then per slot: smart(slot), short(itemId+1), byte(count)[255+int if≥255] |
| **190** | UPDATE_STAT (updateSkill) | `updateSkill` | FIXED | 6 | byteS(skillId), LEint(exp), byte(level) |
| **163** | UPDATE_RUNENERGY | `sendRunEnergy` | FIXED | 1 | byte(0-100) |
| **254** | ACCESS_MASK / SET_MULTIWAY | `sendAccessMask` | FIXED | 12 | int(widget<<16\|child), LEshort(len), int2(mask), shortA(offset) |
| **72** | PLAYER_OPTION | `updatePlayerOption` | DYNAMIC_SMALL | -1 | string(option), byteS(slot), byteC(top) |
| **167** | LOGOUT | `logout` | FIXED | 0 | — |
| **244** | IF_SETCOLOUR / IF_SETRECOL | `updateWidgetColor` | FIXED | 6 | int(widget<<16\|child), shortA(color) |
| **142** | IF_SETHIDE | `toggleWidgetVisibility` | FIXED | 5 | byteS(hidden), short(child), short(widget) |
| **114** | IF_SETOBJECT (SET_ITEM) | `setItemOnWidget` / `updateWidgetItemModel` | FIXED | 10 | LEint(zoom), short(itemId), LEint(widget<<16\|child) |
| **47** | IF_SETTEXT | `updateWidgetString` | DYNAMIC_LARGE | -2 | int1(widget<<16\|child), string |
| **63** | IF_SETANIM | `playWidgetAnimation` | FIXED | 6 | int2(widget<<16\|child), LEshort(animId) |
| **8** | IF_SETPLAYERHEAD | `setWidgetPlayerHead` | FIXED | 4 | LEint(widget<<16\|child) |
| **207** | IF_SETNPCHEAD | `setWidgetNpcHead` | FIXED | 6 | LEshortA(npcId), int(widget<<16\|child) |
| **201** | IF_SETPOSITION | `moveWidgetChild` | FIXED | 8 | LEshortA(x), LEshortA(y), int2(widget<<16\|child) |
| **246** | IF_SETMODEL | `updateWidgetModel1` | FIXED | writes 6 | LEshort(modelId), LEint(widget<<16\|child) — **DELTA: table says 0** |
| **1** | IF_SETMODEL_ROTATION | `setWidgetModelRotationAndZoom` | FIXED | writes 9 | int1(widget<<16\|child), short(zoom), short(rotX), byteS(rotY) — **DELTA: table says 10** |
| **88** | TUTORIAL_FLASHSIDE (BLINK_TAB) | `blinkTabIcon` | FIXED | 1 | byte(tabIndex) |
| **160** | HINT_ARROW | `showHintIcon`/`showPlayerHintIcon`/`showNpcHintIcon` | FIXED | 6 | byte(type), short, short, byte |
| **156** | SOCIAL_SETTINGS / UPDATE_IGNORELIST | `updateSocialSettings` | FIXED | 3 | byte(public), byte(private), byte(trade) |
| **152** | FRIEND_STATUS | `sendFriendServerStatus` | FIXED | 1 | byte(status 0/1/2) |
| **100** | UPDATE_FRIENDLIST (FRIEND_UPDATE) | `updateFriendStatus` | FIXED | 11 | long(name), short(world), byte(0) |
| **23** | MESSAGE_PRIVATE | `sendPrivateMessage` | DYNAMIC_SMALL | -1 | long(sender), short(32767), int24(counter), byte(rights), bytes(msg) |
| **112** | OBJ_ADD/OBJ_COUNT/OBJ_REVEAL (SET_OBJ) | `setObjPrimitive` | FIXED | 5 | short(itemId), LEshort(count), byteS(offset) |
| **39** | OBJ_DEL (REMOVE_OBJ) | `removeObjPrimitive` | FIXED | 3 | shortA(itemId), byteS(offset) |
| **17** | LOC_ADD_CHANGE (SET_LOC) | `setLocPrimitive`/`setLocationObject` | FIXED | 4 | byteA(offset), LEshort(locId), byteA(shape<<2\|rot) |
| **16** | LOC_DEL (REMOVE_LOC) | `removeLocPrimitive`/`removeLocationObject` | FIXED | 2 | byteA(shape<<2\|rot), byteA(offset) |
| **186** | MAP_ANIM / LOC_ANIM | `sendMapAnim` | FIXED | 6 | byte(offset), short(spotanim), byte(height), short(delay) |
| **218** | MAP_PROJANIM (PROJECTILE) | `sendProjectile` | FIXED | 17 | byte(0), byte(offX), byte(offY), short(lockon), short(id), byte(startH), byte(endH), short(delay), short(duration), byte(peak), byte(arc), short(srcLockon) |
| **69** | UPDATE_ZONE_PARTIAL_ENCLOSED / runscript | `sendRunScript` | DYNAMIC_LARGE | -2 | string(types), params (reverse), int(scriptId) |
| **99** | CAM_RESET | `resetCamera` | FIXED | 0 | — |
| **82** | CAM_LOOKAT / CAM_SHAKE | `turnCameraTowards` | FIXED | 6 | byte(localX), byte(localY), short(height), byte(speed), byte(accel) |
| **113** | CAM_MOVETO | `snapCameraTo` | FIXED | 6 | byte(localX), byte(localY), short(height), byte(speed), byte(accel) |
| **5** | MIDI_SONG / MIDI_JINGLE | `playSong` | FIXED | 2 | **LE**short(songId) — 464 reads LE u16, not BE |
| **40** | SYNTH_SOUND | `playSound` | FIXED | 5 | short(id), byte(loops≥1), short(delay) |
| **35** | CLAN_CHAT | `sendClanChatUpdate` | DYNAMIC_LARGE | writes -2 | clan list — **DELTA: table says 0** |

### Server→Client deltas (size-table vs actual server write) — reconcile these

These are the only cross-check mismatches. For a FIXED opcode a mismatch means real desync if the
packet is ever sent, because the client reads the table's byte count.

| op | name | table (client reads) | server writes | consequence / likely cause |
|---:|------|----------------------|---------------|-----------|
| 1 | IF_SETMODEL_ROTATION | 10 | 9 | client over-reads 1 byte → eats next packet. Server's `rotY` written as `byteS` (1); table implies rotY is a **short**. Low-traffic. |
| 195 | IF_OPENMAINMODAL (fullscreen) | 0 | 4 | client treats 4 payload bytes as next opcodes → desync when a fullscreen widget opens. |
| 237 | IF_SHOWSIDE (showTabWidget) | 3 | 2 | client under-reads → eats 1 byte of next packet. Note the *main* tab loader uses 238, so 237 is rarely hit. |
| 246 | IF_SETMODEL | 0 | 6 | desync if `updateWidgetModel1` is ever sent. |
| 85 | console command | 0 | -1 (DYN_S) | table has this as FIXED-0; server sends a small-var string → desync if sent. |
| 35 | CLAN_CHAT | 0 | -2 (DYN_L) | table FIXED-0; server sends large-var → desync if sent. |

All six are low-traffic / not on the login→walk→combat critical path. **Every critical packet
(90, 174, 221, 222, 132, 245/37/68, 238/137, 92/120, 190, 163, 108) cross-checks clean.**

---

## CLIENT → SERVER (ClientProt)

### Authoritative table = registered inbound handlers (`server/src/engine/net/handler/**`)

Because the server sizes a handled opcode by its registered `size`, this table (not the fallback
array, not the busted `ClientProt.ts`) is what LC500 must send to.

| Opcode | Size | Action | Handler |
|-------:|-----:|--------|---------|
| 7 | 1 | keepalive (NO_TIMEOUT) | event-tracking |
| 99 | 4 | event tracking | event-tracking |
| 174 | -1 | event tracking (var) | event-tracking |
| 202 | 0 | idle timer | event-tracking |
| 230 | 0 | anticheat/quiet noop | event-tracking |
| 255 | 1 | tutorial click side | event-tracking |
| 128 | 4 | camera angle noop | event-tracking |
| **143** | -1 | MOVE_GAMECLICK (walk tile) | move-click |
| **50** | -1 | MOVE_MINIMAPCLICK | move-click |
| **36** | -1 | MOVE_OPCLICK (walk+interact) | move-click |
| 61 | 6 | walk variant (fixed) | move-click |
| 216 | 6 | OPOBJ1-5 (pick up ground item) | op-obj |
| 172 | 14 | OPOBJU (item on ground obj) | op-obj-u |
| 152 | 14 | OPOBJT — **spell/magic on ground obj** | op-obj-t |
| 63 | 12 | item-on-floor-item (held-u-obj) | op-held-u-obj |
| 156 | 2 | OPNPC1 | op-npc |
| 129 | 2 | OPNPC2 | op-npc |
| 19 | 2 | OPNPC3 | op-npc |
| 51 | 2 | OPNPC4 | op-npc |
| 43 | 2 | OPNPC5 | op-npc |
| 69 | 8 | OPNPCT (**spell on NPC**) | op-npc-t |
| 187 | 10 | OPNPCU (item on NPC) | op-npc-u |
| 208 | 10 | OPNPCU alt (legacy) | op-npc-u |
| 44 | 6 | OPLOC1 | (loc) |
| 119 | 6 | OPLOC2 | (loc) |
| 120 | 6 | OPLOC3 | (loc) |
| 97 | 2 | OPLOC5 / loc examine | examine |
| 103 | 14 | OPLOCU (item on loc) | op-loc-u |
| 207 | 12 | OPLOCT (**spell on loc**) | op-loc-t |
| 84 | 2 | OPPLAYER1/2 (attack) | op-player |
| 185 | 2 | OPPLAYER3 (follow) | op-player |
| 180 | 2 | OPPLAYER4 (follow alt) | op-player |
| 110 | 10 | OPPLAYERU (**item on player**) | op-player-u |
| 123 | 8 | OPPLAYERT (**spell on player**) | op-player-t |
| 101 | 8 | OPHELD1 (CLICK_1) | op-held |
| 177 | 8 | OPHELD1 (OPTION_1) | op-held |
| 88 | 8 | OPHELD2 | op-held |
| 159 | 8 | OPHELD3 | op-held |
| 86 | 8 | OPHELD4 | op-held |
| 220 | 8 | OPHELD5 | op-held |
| 212 | 8 | OPHELD3 (CLICK_3) | op-held |
| 215 | 8 | OPHELD2 (WIELD) | op-held |
| 4 | 8 | OPHELD2 (CLICK_2) | op-held |
| 166 | 16 | OPHELDU (item on item) | op-held-u |
| 163 | 14 | OPHELDT (**magic on item**) | op-held-t |
| 113 | 6 | INV_BUTTON1 | if-button |
| 37 | 6 | INV_BUTTON2 | if-button |
| 134 | 6 | INV_BUTTON3 | if-button |
| 137 | 6 | INV_BUTTON4 | if-button |
| 140 | 6 | INV_BUTTON5 | if-button |
| 153 | 4 | IF_BUTTON (simple click) | if-button |
| 132 | 6 | INV_BUTTOND (button drag) | if-button-d |
| 121 | 9 | inv swap/drag | inv-swap |
| 247 | 8 | inv drop/destroy | inv-drop |
| 71 | 0 | CLOSE_MODAL (close all) | close-modal |
| 240 | 6 | RESUME_PAUSEBUTTON (close 6-byte) | close-modal |
| 78 | 4 | RESUME_P_COUNTDIALOG (enter amount) | resume-p-count |
| 150 | -1 | RESUME text/name input | resume-p-name |
| 49 | 13 | IF_PLAYERDESIGN (appearance) | if-player-design |
| 11 | 3 | CHAT_SETMODE | chat-set-mode |
| 115 | -1 | MESSAGE_PUBLIC | message-public |
| 238 | -1 | MESSAGE_PRIVATE | message-private |
| 197 | 8 | FRIENDLIST_ADD | friend-list-add |
| 133 | 8 | FRIENDLIST_DEL | friend-list-del |
| 102 | 8 | IGNORELIST_ADD | ignore-list-add |
| 214 | 8 | IGNORELIST_DEL | ignore-list-del |
| 165 | -1 | CLIENT_CHEAT (::command) | client-cheat |
| 205 | 2 | item examine | examine |
| 176 | 2 | npc examine | examine |
| 62 | 5 | admin teleport-here (custom) | teleport-here |
| 60 | 8 | MOBA skillshot cast (custom) | moba-cast |
| 64 | 1 | MOBA HUD (custom) | moba-hud |

### Client→Server deltas — `ClientProt.ts` is wrong for the spell-on-target family

The busted port's `ClientProt.ts` conflates the spell/magic-on-target opcodes with other ops. The
**server handlers** (table above) are correct; LC500 must send these, not the `ClientProt.ts` values:

| Action | `ClientProt.ts` says (WRONG) | Server expects (CORRECT) | why the ClientProt value is wrong |
|--------|------------------------------|--------------------------|-----------------------------------|
| spell on loc (OPLOCT) | 69 | **207** (size 12) | 69 is spell-on-**NPC**; would route loc casts to the npc handler |
| spell on player (OPPLAYERT) | 110 | **123** (size 8) | 110 is **item**-on-player (OPPLAYERU, size 10) |
| magic on inv item (OPHELDT) | 21 | **163** (size 14) | 21 is unregistered → server consumes-all → desync |
| spell on ground obj (OPOBJT) | 172 (shared w/ item-on-obj) | **152** (size 14) for the *spell* case | 172 is item-on-ground-obj (OPOBJU); spell needs its own 152 |

The rest of `ClientProt.ts` (movement 143/50/36, npc 156/129/19/51/43, loc 44/119/120, obj 216,
held 101/177/88/159/86/220, buttons, chat, social) matches the server exactly and can be used as-is.

### Fallback array `PACKET_SIZES_464` (inbound)

256-entry array in `inbound-packet-handler.ts`; only consulted for **unregistered** opcodes
(`-1`=var byte, `-2`=var short, `-3`=UNKNOWN→consume-all→desync). It agrees with the handler
registrations for every handled opcode; its `-3` slots at 110/21 are harmless because those opcodes
either have a handler (110) or should never be sent (21). Don't treat it as the inbound authority —
the handler `size` fields are.

### Rate limiting (2004scape parity, `inbound-packet-handler.ts`)

Per-tick decode caps by category: USER_EVENT 5/tick, CLIENT_EVENT 20/tick, RESTRICTED 2/tick.
Unknown opcodes default to CLIENT_EVENT. LC500 doesn't need to implement this (server-side), but
bursting >5 user actions in a tick will silently defer the extras to the next tick.

---

## Quick reference — the critical packets the brief asked for

| Concern | Direction | Opcode | Type/Size |
|---------|-----------|-------:|-----------|
| map-region rebuild | S→C | 221 | DYNAMIC_LARGE |
| constructed region | S→C | 222 | DYNAMIC_LARGE |
| player sync | S→C | **90** | DYNAMIC_LARGE |
| npc sync | S→C | **174** | DYNAMIC_LARGE |
| varp / clientconfig | S→C | 245 (small, sz 3) / 37 (large, sz 6) / 68 (reset, sz 0) | FIXED |
| if_open (interface) | S→C | 238 (open, sz 7) / 137 (close, sz 4) | FIXED |
| inventory | S→C | 92 (full) / 120 (partial) | DYNAMIC_LARGE |
| skill / stat | S→C | 190 | FIXED 6 |
| run energy | S→C | 163 | FIXED 1 |
| set-ref-position | S→C | **132** | FIXED 2 (raw u8 offY, offX) |
| chatbox message | S→C | **108** | DYNAMIC_SMALL |
| walk (tile / minimap / opclick) | C→S | 143 / 50 / 36 | var byte (-1) each |
| npc op 1-5 | C→S | 156 / 129 / 19 / 51 / 43 | FIXED 2 |
| loc op 1-3 | C→S | 44 / 119 / 120 | FIXED 6 |
| item click / opts | C→S | 101,177 / 88 / 159 / 86 / 220 | FIXED 8 |
| attack player | C→S | 84 | FIXED 2 |
| button click | C→S | 153 (simple) / 113,37,134,137,140 (inv) | FIXED 4 / 6 |
| close modal | C→S | 71 | FIXED 0 |
| public / private chat | C→S | 115 / 238 | var byte (-1) |
| command (::) | C→S | 165 | var byte (-1) |
