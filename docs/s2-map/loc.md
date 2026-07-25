# S2 map — LocType (loc / object config)

How to make the Lost City 500 (LC500) web client fetch + decode **loc** configs from the
465 cache that the RuneJS JS5 update-server serves. Read-only investigation; the only
concrete change proposed is to `web-client/src/config/LocType.ts` + one line in `Client.ts`.

All facts below were opened in the tree or observed live via the JS5 probe against the
running server (127.0.0.1:43594). Nothing here is guessed.

---

## (a) 465 cache addressing for loc — as the server actually serves it

The served cache is a **classic (idx2-config) 465 cache**, not a detached-config cache. All
config types live under **cache index 2 (idx2)** as *groups*, and each config *instance* is a
**flat file** inside its group (file id == config id).

Server truth — `server/src/server/update/js5-update-server.ts`:
- `CACHE_LOC_GROUP = 6` (locs live in idx2 group 6 in the raw 465 cache) — line 170
- `CLIENT_LOC_GROUP = 9` (the 464 client reads locs from idx2 group 9) — line 174
- `CONFIG_GROUP_REMAP = { 9: 6, 7: 9 }` — line 195: client group **9 ← cache group 6** (locs);
  client group 7 ← cache group 9 (NPC entities, re-encoded).
- `remapConfigGroups()` (line 821) copies cache group 6's **container bytes verbatim**
  (`fileOverrides.set('2:9', getFile(2, 6))`, line 887) and copies group 6's child-id list into
  the group-9 slot of the served idx2 reference table (lines 899-901). **There is no loc byte
  transformation** — no `convertLocEntries` exists (only NPC/IDKit are re-encoded via
  `convertNpcEntries` / `convertIdkitBinaryToNpcType`). So the client receives **raw 465 loc
  binary**.

Live probe of the served idx2 reference table (255:2), decoded
(`scratchpad/probe-loc.ts`):
```
protocol=6 flags=0 archiveCount=24
groups present: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25
  group 6: childCount=26208  ids 0..26207   (locs, flat: file id == loc id)
  group 9: childCount=26208  ids 0..26207   (== group 6 — remap applied)
  group 7: childCount=6201   ids 0..6200    (NPC-as-LocType, re-encoded)
```

**=> Loc id N is served at: cache index 2, group 9, file N (flat, 0..26207).**
(Underlying source is group 6; the server mirrors 6 → 9 so the 464 client's hard-coded group 9
read works.)

This matches the 464 Java client exactly — `MenuBuilder.method1155(_, locId)`
(`client/src/MenuBuilder.java:611`):
```java
byte[] is = PacketBuffer.aClass19_2691.method746(9, (byte) 92, arg1 /* = locId */);
```
`Class19.method746(int group, byte _, int file)` → `method758(null, group=9, false, file=locId)`
(`client/src/Class19.java:399`). Group is the constant **9**; file is the **raw loc id**.

---

## (b) How LC500 fetches loc now (the mismatch)

LC500 assumes a **detached-config cache** (each config type = its own top-level index, RS3-style):
`web-client/src/client/Client.ts:1000` `Client.configLoc = this.openJs5(16)` and line 1202
`LocType.init(configLoc, models, …)`. So `LocType.clientConfig` = **cache index 16**.

Addressing in `web-client/src/config/LocType.ts`:
```ts
static getGroupId(id) { return id & 0xff; }   // line 113
static getFileId(id)  { return id >>> 8; }     // line 117
// list(), line 128:
const data = LocType.clientConfig.getFile(LocType.getGroupId(id), LocType.getFileId(id));
```

**Naming footgun (verified in `Js5.ts`):** the two overloads are `getFile(file, group)` (lines
191-224) and the impl does `return this.fetchFile(null, group, file)` (line 223), with
`fetchFile(arg0, arg1=group, arg2=file)` proven by line 377 `isFileValid(arg2, arg1)` and line 380
`unpacked[arg1][arg2]`. So the **1st positional of `getFile` is the file, the 2nd is the group.**
Therefore in LC500's `list()`:
- `getGroupId(id)` (= `id & 0xff`) is passed as the **file**,
- `getFileId(id)` (= `id >>> 8`) is passed as the **group**.

The method names are inverted relative to what they actually feed. LC500 currently reads
**index 16, group = id>>8, file = id&0xff** — a 256-files-per-group split. `NpcType.ts:81-96`
uses the same convention with `id & 0x7f` / `id >>> 7`.

Two independent reasons this fails against the served cache:
1. **Wrong index.** The served 465 cache keeps loc config in idx2 group 9, not in a dedicated
   idx16. `Client.configLoc = openJs5(16)` targets an index that in a classic 465 cache is not the
   loc config at all.
2. **Wrong shape.** Even pointed at the right index, LC500 uses a 2-D `id>>8 / id&0xff` split; the
   server serves a flat `file = loc id` group.

---

## (c) s2Redirect — the concrete edit

Point `LocType.clientConfig` at idx2 (`Client.configs`, already `openJs5(2)` at Client.ts:986) and
make the addressing flat group-9.

**Edit 1 — `web-client/src/client/Client.ts:1202`** (the `configs` local already exists at line 1159):
```ts
// was: LocType.init(configLoc, models, Client.memServer, Client.lowMem);
LocType.init(configs, models, Client.memServer, Client.lowMem);
```

**Edit 2 — `web-client/src/config/LocType.ts:113-119`** — swap the two formulas so `list()`'s
`getFile(getGroupId(id), getFileId(id))` resolves to `getFile(file = locId, group = 9)` →
`fetchFile(null, group = 9, file = locId)`:
```ts
static getGroupId(id: number): number {
    return id;      // 1st positional of getFile == FILE  -> flat loc id
}

static getFileId(id: number): number {
    return 9;       // 2nd positional of getFile == GROUP -> idx2 loc-config group
}
```
No change to `list()` itself, nor to `getFile`. (The names stay wrong-but-consistent with the rest
of LC500; a clarifying comment is worth adding.)

`configLoc = openJs5(16)` can stay opened but becomes unused by loc; `configs` (idx2) must be
fully downloaded before `LocType.init` — it already is (`configs.requestFullDownload()`,
Client.ts:1176).

Verification after the edit: `LocType.list(4483)` (hub_chest) should return `name == "Chest"` /
non-null model; `LocType.list(23960)` (hub_crafting_table) should decode. Both are ids the 464
client patches in `MenuBuilder.method1155`, so they exist in group 9.

---

## (d) s3FormatDelta — 464 Java decode vs LC500 decode (opcode level)

Both decoders read the **same raw 465 loc bytes**. The 464 client's `LocType.method352`
(`client/src/LocType.java:302`) is annotated *"465 cache format opcodes (rewritten from 464
format)"* — it is already a 465 decoder. LC500's `LocType.decodeInner`
(`web-client/src/config/LocType.ts:161`) is the OSRS "oldscape" loc decoder.

### Byte layout is identical on every shared opcode — no field-width divergence.
Column = bytes consumed. `u16`=2, `u8`/`s8`=1, `s16`=2, `str`=null-terminated string.

| op | 464 method352 | LC500 decodeInner | bytes | notes |
|----|---------------|-------------------|-------|-------|
| 1  | cnt u8; n×(model u16, **type u8 discarded**) | cnt g1; n×(model g2, **shape g1 stored**) | 1+3n | same width; LC500 keeps shape (correct), 464 drops it |
| 2  | name (method212) | name gjstr | str | |
| 5  | cnt u8; n×model u16 | cnt g1; n×model g2 | 1+2n | shapeless models |
| 14 | width=u8 (anInt2791) | width=g1 | 1 | |
| 15 | u8 **discarded** ("sizeY") | length=g1 | 1 | 464 drops length |
| 17 | aBoolean2804=false | blockrange=false; blockwalk=0 | 0 | |
| 18 | no-data flag (grouped) | blockrange=false | 0 | |
| 19 | u8 **discarded** ("hasActions") | active=g1 | 1 | 464 drops active |
| 21 | no-data flag | skewType=1 | 0 | |
| 22 | no-data flag | sharelight=true | 0 | |
| 23 | no-data flag | occlude=true | 0 | |
| 24 | anim u16 (65535→-1) | anim g2 (65535→-1) | 2 | |
| 27 | no-data flag | blockwalk=1 | 0 | |
| 28 | wallwidth u8 (anInt2837) | wallwidth g1 | 1 | |
| 29 | ambient s8 (method229) | ambient g1b | 1 | |
| 30-34 | op strings (method212), "hidden"→null | op[code-30] gjstr, "hidden"→null | str | |
| 39 | contrast s8×5 | contrast g1b×5 | 1 | |
| 40 | cnt u8; n×(src u16, dst u16) | cnt g1; n×(src g2, dst g2) | 1+4n | recolour |
| 41 | cnt u8; n×(src u16, dst u16) | cnt g1; n×(src g2, dst g2) | 1+4n | retexture |
| 42 | **unhandled** | cnt g1; n×(palette s8) | 1+1n | see coverage note |
| 60 | u16 **discarded** ("groundDecorationSprite") | mapfunction=g2 | 2 | |
| 62 | no-data flag (grouped) | mirror=true | 0 | |
| 64 | aBoolean2835=false | shadow=false | 0 | |
| 65 | resizex u16 (anInt2822) | resizex g2 | 2 | |
| 66 | resizey u16 (anInt2833) | resizey g2 | 2 | |
| 67 | u16 **discarded** ("scaleZ") | resizez g2 | 2 | 464 drops resizez |
| 68 | mapscene u16 (anInt2814) | mapscene g2 | 2 | |
| 69 | u8 **discarded** | forceapproach g1 | 1 | |
| 70 | s16 **discarded** (method238) | offsetx g2b | 2 | 464 drops offsets |
| 71 | s16 **discarded** | offsety g2b | 2 | |
| 72 | s16 **discarded** | offsetz g2b | 2 | |
| 73 | aBoolean2826=true | forcedecor=true | 0 | |
| 74 | aBoolean2804=false | breakroutefinding=true | 0 | |
| 75 | u8 **discarded** | raiseobject g1 | 1 | |
| 77 | varbit u16; varp u16; cnt u8; (cnt+1)×u16 | multivarbit g2; multivarp g2; cnt g1; (cnt+1)×g2 | 2+2+1+2(cnt+1) | 65535→-1 throughout; same order (varbit, varp) |
| 78 | u16 + u8 **discarded** ("bgsound+range") | bgsound_sound g2; bgsound_range g1 | 3 | |
| 79 | u16; u16; u8; cnt u8; cnt×u16 (→anIntArray2836) | mindelay g2; maxdelay g2; range g1; cnt g1; cnt×g2 | 2+2+1+1+2n | identical wire; 464 repurposes the id array |
| 80 | **custom** 6×u16 walk/turn anims | — | 12 | **NPC-as-LocType only (group 7); never in real locs** |
| 81 | **unhandled** | skewType=2; skewAmount=(g1·256) | 1 | |
| 82 | **unhandled** | (empty) | 0 | |
| 88 | **unhandled** | (empty) | 0 | |
| 89 | **unhandled** | randomanimframe=false | 0 | |
| 90 | **unhandled** | field2799=true | 0 | |
| 91 | **unhandled** | members=true | 0 | |
| 92 | **unhandled** | varbit g2; varp g2; default g2; cnt g1; (cnt+1)×g2 | 2+2+2+1+2(cnt+1) | multiloc w/ default |
| 93 | **unhandled** | skewType=3; skewAmount g2b | 2 | |
| 94 | **unhandled** | skewType=4 | 0 | |
| 95 | **unhandled** | skewType=5 | 0 | |
| 249| **unhandled** | params: cnt g1; n×(isStr g1, key g3, val g4/gjstr) | var | |

### Conclusion for the LC500 port
- **LC500's decoder is a strict superset of the 464 decoder, and every opcode both handle has an
  identical byte layout.** There is **no blocking format delta** — `decodeInner` needs **no
  change**. LC500 will parse the served 465 loc bytes without stream desync.
- The differences are all in LC500's favour: 464 *discards* many fields it still reads
  (shape@1, length@15, active@19, mapfunction@60, resizez@67, forceapproach@69, offsets@70-72,
  raiseobject@75) and does **not** handle 42, 81, 82, 88, 89, 90, 91, 92, 93, 94, 95, 249 at all
  (those would desync the *464* client if present — they never desync LC500).
- 464's only extra opcode is the custom **80** (NPC walk/turn anims), which appears **only** in the
  NPC-as-LocType group 7, never in real locs (group 9). Irrelevant to the loc port.
- The one residual risk: an opcode present in the 465 loc bytes that LC500 does *not* handle would
  desync LC500. LC500's handled set is the full OSRS loc set (≤95 + 249), a superset of the
  2008/rev-465 loc opcode set, so this is not expected. To close it fully, unpack idx2 group 9 and
  scan a sample of loc files for any opcode outside LC500's set (not done here — the group
  container holds all 26208 files and needs Js5 group-unpack).

---

## Files cited
- `client/src/LocType.java:287` `method349` (decode loop), `:302` `method352` (opcode table)
- `client/src/MenuBuilder.java:604-635` `method1155` (loc fetch: group 9, file=id)
- `client/src/Class19.java:399` `method746(group, _, file)` → `method758(null, group, false, file)`
- `web-client/src/config/LocType.ts:105` `init`, `:113-119` `getGroupId/getFileId`, `:122` `list`, `:161` `decodeInner`
- `web-client/src/js5/Js5.ts:191-224` `getFile` overloads, `:376` `fetchFile(_, group, file)`
- `web-client/src/client/Client.ts:986` `configs=openJs5(2)`, `:1000` `configLoc=openJs5(16)`, `:1202` `LocType.init`
- `server/src/server/update/js5-update-server.ts:169-198` group constants + `CONFIG_GROUP_REMAP`, `:821` `remapConfigGroups`
- Live: `scratchpad/probe-loc.ts` (idx2 ref-table decode)
