# Critical server→client packet formats: LC500 (rev-500) vs the 464 server

Scope: the two packets that are the minimum for a visible world after login —
**(A) map-region / rebuild** and **(B) player sync**. For each, this compares the
464 server's outbound wire format against what the LC500 (rev-500) TypeScript
client actually parses, using the **464 Java client (`client/src`) as the
byte-exact reference for what the server was built against**.

## The three-way relationship (read this first)

- **464 server** (`server/src`) emits packets built to the **464 Java client** spec.
  Every field encoding in the server was verified against `client/src` decompiled
  methods (the server code even cites the Java line numbers).
- **464 Java client** = the ground-truth reference. The server matches it. Verified
  directly below for both packets.
- **LC500** (`web-client/src`, rev-500 protocol) is stock and **still uses rev-500
  opcodes and field layouts**. It does **not** match the 464 format.
- **There is no opcode/format translation layer.** `web-client/proxy.ts` is a plain
  WebSocket↔TCP bridge (no remap); `ClientStream.ts`/`GameShell.ts` do no opcode
  rewriting. So the byte stream the server sends hits the LC500 parsers unmodified.

**Consequence:** the "reconciliation" is the S5 (map) / S6 (player-sync) porting
work itself — either the LC500 handlers are rewritten to the 464 wire format, or
the server grows a rev-500 encoder path. Nothing bridges them today.

Opcode + size summary (size type is identical on both sides; only the *number*
and the *payload* differ):

| Packet | Server opcode | Server size type | LC500 opcode | LC500 size (`Statics.field224`) |
|---|---|---|---|---|
| RebuildNormal | **221** | DYNAMIC_LARGE | **79** | `field224[79] = -2` (var-short) |
| RebuildRegion (constructed) | **222** | DYNAMIC_LARGE | **21** | `field224[21] = -2` (var-short) |
| Player sync | **90** | DYNAMIC_LARGE | **116** | `field224[116] = -2` (var-short) |
| (NPC sync, for reference) | 71 | DYNAMIC_LARGE | **19** | `field224[19] = -2` |

Note `field224[90] = 0` (fixed 0-length) — if the server's opcode 90 reached LC500
untranslated it would be read as an empty packet and everything after it would
desync. Same class of problem for 221/222 (`field224[221]=20`, `field224[222]=0`).

Source anchors:
- Server rebuild: `server/src/engine/net/outbound-packet-handler.ts`
  `updateCurrentMapChunk()` @1103 (opcode 221), `constructMapRegion()` @989 (opcode 222).
- Server player sync: `server/src/engine/world/entity/pathing/player/sync/player-sync-task.ts` (opcode 90),
  walk/run bits in `.../sync/actor-sync.ts` `appendMovement()` @201.
- 464 reference: `client/src/InteractiveObject.java` `method1086()` @32 (rebuild),
  `client/src/Class47.java` `method978()` @95 (rebuild apply),
  `client/src/Class73.java` `method1166()` @65 (player update-mask blocks).
- LC500 rebuild: `web-client/src/client/Client.ts` `rebuildPacket()` @4050, `startRebuild()` @4158,
  opcode dispatch @6722 (79→normal) / @6776 (21→region), login call @1703.
- LC500 player sync: `web-client/src/client/Client.ts` `getPlayerPos()` @7461 and its four
  sub-readers @7484/7522/7573/7616; opcode dispatch @5836 (116).
- Size table: `web-client/src/deob/Statics.ts` `field224` @2; consumed at `Client.ts` @5319.

---

# (A) Map-region / Rebuild

There are two variants. Both are sent right after login (`updateCurrentMapChunk`
is what streams the initial scene; LC500 even calls `rebuildPacket(false)` inline
on the login response at `Client.ts:1703`, before any opcode loop).

## A.1 RebuildNormal — server 221 vs LC500 79

### 464 wire format (server matches this — verified)
`InteractiveObject.method1086(false, …)` `client/src`, `!arg0` branch @37-100:

| # | Field | 464 read method | Encoding |
|---|---|---|---|
| 1 | **regionY** | `method223` @38 | **ShortA** — `[hi, lo+128]` (BE, low byte +128) |
| 2 | **XTEA blocks** | `N × 4 × method241(4)` @44 | N = `(end−pos)/16`; each key int = **int1** `[b15-8, b7-0, b31-24, b23-16]` |
| 3 | **regionX** | `method213` @47 | **LEShort** `[lo, hi]` |
| 4 | **localX** | `method209` @49 | **Short** (BE) `[hi, lo]` |
| 5 | **level** | `get()` @51 | plain byte |
| 6 | **localY** | `method209` @58 | **Short** (BE) |

Then `method978(regionX, localX, false, level, localY, regionY)` @100. Note
`regionY` is consumed **first, before the XTEA block**, so the `(end−pos)/16`
count in step 2 is measured *after* those 2 bytes.

Server `updateCurrentMapChunk()` writes exactly this order (`outbound-packet-handler.ts:1124-1154`):
`putShortA(regionY)` → XTEA loop (`putInt1`, middle-endian `[hi8,lo8,hi32,lo24]`)
→ `putLEShort(regionX)` → `putShort(localX)` → `put(level)` → `putShort(localY)`. **Match confirmed.**

### LC500 wire format it actually parses (opcode 79)
`Client.rebuildPacket(false)` `Client.ts:4052-4093`:

| # | Field | LC500 read | Encoding |
|---|---|---|---|
| 1 | **XTEA blocks** | `N × 4 × g4_alt1()` @4057 | N = `(psize−pos)/16` measured **from packet start** (no leading field); key int = **little-endian** `[b7-0,b15-8,b23-16,b31-24]` |
| 2 | **regionY** (centreZoneZ) | `g2_alt2()` @4060 | ShortA-BE `[hi, lo+128]` |
| 3 | **localX** | `g2_alt3()` @4062 | `[lo−128, hi]` (LEShortA-ish) |
| 4 | **regionX** (centreZoneX) | `g2()` @4063 | Short (BE) `[hi, lo]` |
| 5 | **level** | `g1_alt3()` @4064 | `(128 − byte)` |
| 6 | **localY** | `g2()` @4065 | Short (BE) |

Then `startRebuild(level, localY, regionX, regionY, localX)` @4093.
(Field→coord mapping recovered from `startRebuild`'s XTEA loop @4078-4079 which
ranges x over `var7`/regionX and z over `var4`/regionY, and `teleport(false,
localX=var6, localY=var9)` @4202.)

### Deltas (A.1)
1. **Opcode**: 221 → 79.
2. **regionY placement**: 464 sends it FIRST (before XTEA); LC500 expects it AFTER
   XTEA. This alone slides every subsequent field.
3. **Field order after XTEA**: 464 = `regionX, localX, level, localY`;
   LC500 = `regionY, localX, regionX, level, localY`.
4. **XTEA int endianness**: 464 = int1 middle-endian (`putInt1`); LC500 `g4_alt1` = pure
   little-endian. Different byte order → wrong keys → map decrypt fails.
5. **Per-field encodings**: regionX 464 `LEShort` vs LC500 `g2` (plain BE); localX
   464 `Short(BE)` vs LC500 `g2_alt3` (low−128); level 464 plain byte vs LC500
   `g1_alt3` (128−v). Only localY (`Short`/`g2` BE) coincides.

## A.2 RebuildRegion (constructed / POH) — server 222 vs LC500 21

### 464 wire format (server matches — verified)
`InteractiveObject.method1086(true, …)`, `else` branch @102-193:

Header (5 fields, before the bit grid):
1. **regionY** `method235` = **LEShortA** `[lo+128, hi]`
2. **level** `method240` = **byteC** `(128 − byte)`
3. **regionX** `method235` (LEShortA)
4. **localY** `method235` (LEShortA)
5. **localX** `method223` = **ShortA** `[hi, lo+128]`

Bit grid `method271`/bit-start @112, loop **level 0..3 × x 0..12 × y 0..12** @113-125:
`gBit(1)` present flag; if set `gBit(26)` = packed zone id (else −1). Bit-end @126.

XTEA tail: `N = (end−pos)/16` @127, each `4 × method219` (**BE int**, `getInt`).
Then `method978(regionX, localX, false, level, localY, regionY)` @193.

Server `constructMapRegion()` (`outbound-packet-handler.ts:1010-1098`) writes the
same header (`regionY` LEShortA, `level` byteC, `regionX` LEShortA, `localY`
LEShortA, `localX` ShortA), then a bit grid where each present cell emits
`putBits(2,level) putBits(10,x/8) putBits(11,y/8) putBits(2,orient) putBits(1,0)`
= **26 structured bits** (2+10+11+2+1), then XTEA `put(key,'int')` BE. The 464
client reads those 26 bits as one `gBit(26)` blob and re-decodes them — so the
**bit grid is format-compatible**; the header/tail encodings are the load-bearing part. **Match confirmed.**

### LC500 wire format it actually parses (opcode 21)
`Client.rebuildPacket(true)` `Client.ts:4096-4154`:

Header (3 fields, before the grid):
1. **level** `g1()` @4096 (plain byte, not byteC)
2. **regionX** `g2_alt1()` @4097 = **LEShort** `[lo, hi]` (no +128)
3. **regionY** `g2_alt3()` @4098 = `[lo−128, hi]`

Bit grid @4099-4112: **var17 0..3 × var18 0..12 × var19 0..12**, `gBit(1)` present +
`gBit(26)` id — **same shape/26-bit width as 464** (LC500 then re-decodes the 26
bits at @4131-4147).

XTEA tail @4113-4119: `N = (psize−pos)/16`, `4 × g4()` = **BE int** (matches server BE int).

Trailing (after XTEA): **localX** `g2_alt1()` @4120 (LEShort), **localY** `g2()` @4121 (BE).
Then `startRebuild(level, localY, regionX, regionY, localX)` @4154.

### Deltas (A.2)
1. **Opcode**: 222 → 21.
2. **Header split**: 464 packs all 5 coords (regionY, level, regionX, localY,
   localX) into a single header before the grid. LC500 puts only 3 (level,
   regionX, regionY) before the grid and reads **localX/localY *after* the XTEA
   block** at the tail.
3. **Header encodings**: level 464 `byteC` vs LC500 plain `g1`; regionX/regionY
   464 `LEShortA` (low+128) vs LC500 `g2_alt1`/`g2_alt3` (different A-offset).
4. **Compatible parts**: the 4×13×13 present/26-bit grid and the BE-int XTEA tail
   line up structurally — those don't need changing, only the header/tail.

---

# (B) Player sync — server 90 vs LC500 116

Server packet is one bit-stream (local player movement → tracked-player movement
→ new-player registration → `2047` terminator) followed by a byte-aligned
**update-mask block** (`player-sync-task.ts:46-176`). LC500 mirrors that shape with
four passes: `getPlayerPosLocal` @7484, `getPlayerPosOldVis` @7522,
`getPlayerPosNewVis` @7573, `getPlayerPosExtended` @7616.

## B.1 Local-player movement bits

Both start `gBit(1)` "any local update this tick" then `gBit(2)` movement type
(0 none / 1 walk / 2 run / 3 teleport).

**WALK / RUN match.** Server `appendMovement()` (`actor-sync.ts:201-217`): walk =
`putBits(2,1) putBits(3,walkDir)`, run = `putBits(2,2) putBits(3,walkDir)
putBits(3,runDir)`, then `putBits(1, updateBlock)`. LC500 `getPlayerPosLocal`
@7493-7508 reads type 1 = `gBit(3)`+update, type 2 = `gBit(3)`+`gBit(3)`+update.
Identical.

**TELEPORT (type 3) bit order DIFFERS.**

- Server (jump/tele branch, `player-sync-task.ts:71-92`), after the `2`-bit type:
  `putBits(2,level) putBits(7,localX) putBits(1,jump) putBits(7,localY) putBits(1,updateBlock)`
  → order **`[level, localX, jump, localY, updateBlock]`**.
- LC500 (`Client.ts:7509-7518`), after the type: `gBit(1)=jump`, `gBit(2)=level`,
  `gBit(1)=update`, `gBit(7)=localX`, `gBit(7)=localY`
  → order **`[jump, level, update, localX, localY]`**.

Same 18 bits, reshuffled. A teleport/map-rebase will land the player at the wrong
tile. (The 464 Java local-player teleport decoder was not located as a single
method; the server order is the documented 464/Hyperion order that pairs with
`method385(localX, jump, 128, localY)`. Verify against a live 464 teleport if this
misbehaves.)

## B.2 Tracked-player + new-player passes

- **Old-vis** (already-tracked): server `syncTrackedActors` (`actor-sync.ts:132-199`)
  uses the same `appendMovement` encoding + a teleport path. LC500
  `getPlayerPosOldVis` @7522 reads `gBit(1)` still-here, then `gBit(2)` type
  (0 mask-only / 1 walk / 2 run / 3 **remove**). Walk/run align; note LC500 type 3
  here means *remove*, not teleport.
- **New-vis** (add player): server `registerNewActors` (`player-sync-task.ts:140-161`)
  emits `putBits(11, worldIndex)` then **`dy(5), faceDir(3), jump(1),
  forceMask(1), dx(5)`**. LC500 `getPlayerPosNewVis` @7576-7607 reads `gBit(11)`
  index, then `gBit(3)` faceDir, `gBit(1)` updateFlag, `gBit(5)` dy, `gBit(5)` dx,
  `gBit(1)` jump. **Field order differs** (server `dy,dir,jump,force,dx`; LC500
  `dir,force,dy,dx,jump`) and the server's `faceDirection` is a raw 3-bit dir
  while LC500 maps it through `ANGLE_TO_DIR`. Terminator `2047` matches on both.

## B.3 Update-mask block — the big one

### Mask flag assignments (COMPLETELY reshuffled between revs)

Server builds the mask in `appendUpdateMaskData` (`player-sync-task.ts:186-225`);
464 reads it in `Class73.method1166` (`client/src`, verified bit-for-bit). LC500
reads it in `getPlayerPosExtended` (`Client.ts:7616-7718`).

| Purpose | 464 / server bit | 464 read (Class73) | LC500 bit | LC500 read (Client.ts) |
|---|---|---|---|---|
| **"2nd mask byte follows"** | **`0x10`** | mask≥0x100 branch | **`0x2`** | `if (m & 0x2) m += g1()<<8` @7624 |
| CHAT (full: colour/effects/rights/qc) | `0x1` | @147 | `0x1` | @7714 |
| HIT (single) | `0x100` | @70 | `0x80` | @7698 |
| HIT_2 (double) | `0x2` | @200 | `0x100` | @7707 |
| ANIMATION | `0x20` | @139 | `0x8` | @7678 |
| GRAPHICS / spotanim | `0x200` | @81 | `0x200` | @7663 |
| FACE_COORDINATE | `0x4` | @101 | `0x10` | @7658 |
| FACE_ENTITY | `0x8` | @95 | *(not in the block read @7616-7718)* |
| FORCE_MOVEMENT / exactmove | `0x400` | @107 | `0x400` | @7646 |
| FORCED_CHAT / overhead string | `0x80` | @124 | `0x4` (`gjstr`) | @7631 |
| APPEARANCE | `0x40` | @212 | `0x40` | @7688 |

Only `0x1` (chat), `0x40` (appearance), `0x200` (graphics), `0x400`
(force-move) share a bit number; everything else moved. **The
extended-byte flag is the killer**: server sets `0x10` and writes a 2-byte LE
mask whenever `mask ≥ 0x100`; LC500 tests `0x2`. Example: an appearance+hit tick
= `0x40|0x100` → server ORs `0x10` → writes `[0x50,0x01]`; LC500 reads `0x50`,
sees `0x50 & 0x2 == 0`, never reads the high byte, and desyncs the whole block.

### Block body write order + encodings (server, all matched by 464)
Server writes present blocks in this fixed order (`player-sync-task.ts:230-521`),
each verified against `Class73.method1166`:

- **HIT (0x100)**: `byteS(dmg) byteS(type) byteA(hp) byteA(maxHp)` — 464 @70-79.
- **GRAPHICS (0x200)**: `Short(id)` + int2 `[b16,b24,b0,b8]` — 464 @81-90.
- **FACE_ENTITY (0x8)**: `LEShort(index; +32768 for players, 65535 clear)` — 464 @95.
- **FACE_COORDINATE (0x4)**: `LEShortA(x*2+1) LEShortA(y*2+1)` — 464 @101-105.
- **FORCE_MOVEMENT (0x400)**: `byteS(sx) byteS(sy) byteS(ex) byteA(ey)
  ShortA(startDelay) Short(endDelay) byteC(dir)` — 464 @107-120 (cited in server @274-285).
- **FORCED_CHAT (0x80)**: null-terminated string — 464 @124.
- **ANIMATION (0x20)**: `LEShort(id) byteC(delay)` — 464 @139-144.
- **CHAT (0x1)**: `LEShortA(colour<<8|effects) byteA(rights) byte(len)` + packed
  bytes **reversed** — 464 @147-152.
- **HIT_2 (0x2)**: `byteA(dmg) byteS(type) byteS(hp) byteS(maxHp)` — 464 @200-210.
- **APPEARANCE (0x40)**: `byteA(size)` + body — 464 @212-220 → `Player.method391`.

LC500's `getPlayerPosExtended` reads the analogous fields but (a) under the
different bit numbers above, (b) in **mask-bit iteration order, not the server's
write order** (e.g. it reads chat/exactmove/facecoord/gfx/anim/appearance/hits in
its own sequence @7631-7718), and (c) with rev-500 `g*_alt*` encodings that don't
all line up (e.g. LC500 face-coord uses `g2_alt2/g2_alt3` = ShortA/`[lo-128,hi]`,
server uses `LEShortA`). Because the *order blocks appear on the wire* is fixed by
the sender, the receiver must consume them in that same order; the mask-bit
remap + write-order mismatch means the streams are not interchangeable.

### Appearance body tail (MOBA)
Server appends one extra byte at the end of the appearance body — `%champ_team`
(varp 1300) — which the **464** `Player.method391` was patched to read
(`player-sync-task.ts:492-499`). LC500 `ClientPlayer.setAppearance` is stock and
will either ignore or mis-length that trailing byte. Any LC500-side appearance
parser must account for the extra team byte after `combatLevel + 0(short)`.

---

# Reconciliation (concrete)

No shim exists, so pick one side per packet and make it speak the other's dialect.
Given the project is porting LC500 onto the existing 464 server, the low-risk path
is **adapt the LC500 handlers to the 464 wire format** (mirrors how the rest of
`web-client` was already modified to `g*_alt*`/`method`-style reads):

**Packet A — rebuild**
1. Route server opcode **221 → `rebuildPacket(false)`** and **222 →
   `rebuildPacket(true)`** in the LC500 dispatch (currently 79 / 21).
2. RebuildNormal: read **regionY (ShortA) FIRST**, then the XTEA block, then
   `regionX(LEShort) localX(Short) level(byte) localY(Short)` — i.e. reorder
   `rebuildPacket(false)` to the A.1 464 column and switch the XTEA read from
   `g4_alt1` (LE) to the int1 middle-endian layout.
3. RebuildRegion: move `localX/localY` into the header (after `regionY level
   regionX localY localX`), drop them from the tail, and fix header encodings
   (level byteC, regionX/regionY LEShortA). Grid + BE-int XTEA already match.

**Packet B — player sync**
1. Route server opcode **90 → `getPlayerPos()`** (currently 116).
2. Local-player teleport: reorder the type-3 bits to
   `[level(2), localX(7), jump(1), localY(7), update(1)]`.
3. New-player add: reorder to `[dy(5), faceDir(3), jump(1), forceMask(1), dx(5)]`
   and stop remapping faceDir through `ANGLE_TO_DIR` (or make the server pre-map).
4. Update mask: adopt the **464 bit table** (extended=`0x10`, CHAT`0x1`,
   HIT`0x100`, HIT_2`0x2`, ANIM`0x20`, FACE_COORD`0x4`, FACE_ENTITY`0x8`,
   FORCED_CHAT`0x80`) and read the blocks in the **server write order** listed in
   B.3 with the matching `byteS/byteA/ShortA/LEShortA/int2` encodings.
5. Appearance body: extend the LC500 appearance parser to read the trailing
   `%champ_team` byte.

Alternative (heavier): add a rev-500 encoder path on the server for these three
opcodes. Not recommended while the client is the moving target — it would fork the
outbound handler that the 464 desktop client still depends on.
