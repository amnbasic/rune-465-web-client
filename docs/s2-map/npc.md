# S2 map — NpcType (npc config)

How to make the Lost City 500 (LC500) web client fetch + decode **npc** configs from the
465 cache that the RuneJS JS5 update-server serves. Read-only investigation.

All facts below were opened in the tree or observed live via the JS5 probe against the
running server (127.0.0.1:43594). Nothing here is guessed.

> **Headline (why NPC is *not* a clean client-only redirect like loc was):** unlike locs —
> whose raw 465 bytes survive the server's 464-compat remap unchanged at idx2 group 9 — the
> server **destroys** the native NpcType bytes on the wire: it (1) shadows the native NPC group
> (idx2 g9) with loc bytes, and (2) re-encodes the NPC bytes to **LocType** into idx2 g7. So
> **no served group carries raw NpcType NPC data today.** A working NpcType.ts redirect therefore
> has a hard *server-side* prerequisite (below), in addition to the client edit.

---

## (a) 465 cache addressing for npc — as the cache stores it vs. as the server serves it

The served cache is a **classic (idx2-config) 465 cache**. All config types live under **cache
index 2 (idx2)** as *groups*; each config instance is a **flat file** inside its group
(file id == config id). Live probe of the served idx2 ref-table (255:2),
`scratchpad/probe2.ts`:

```
idx2 protocol=6 flags=0 archiveCount=24
  group 3:  childCount=84      (IDKit -> converted to NpcType by the server)
  group 6:  childCount=26208   (locs, flat: file id == loc id)
  group 7:  childCount=6201    (NPCs -> re-encoded to LocType by the server)
  group 9:  childCount=26208   (== group 6 : loc bytes; native NPCs are shadowed here)
```

**Native 465 layout (before the server transforms it):** NPC id `N` lives at **idx2, group 9,
file N** (flat, raw NpcType binary — the same shape as loc@group6). The probe shows the raw
group-9 child count is **6201** (visible now at the g7 slot, which the remap copied from cache
g9).

**Server transform** — `server/src/server/update/js5-update-server.ts`:

| step | line | effect on wire |
|------|------|----------------|
| `CACHE_NPC_GROUP = 9`, `CACHE_LOC_GROUP = 6` | 170-171 | native cache: npc@g9, loc@g6 |
| `CLIENT_NPC_ENTITY_GROUP = 7` | 175 | 464 client reads NPC-as-LocType from g7 |
| `CONFIG_GROUP_REMAP = { 9: 6, 7: 9 }` | 195-198 | served **g9 ← cache g6 (LOCS)**; served **g7 ← cache g9 (raw NPCs)** |
| `remapConfigGroups()` | 821 | sets `fileOverrides['2:9'] = getFile(2,6)` (loc bytes) and `['2:7'] = getFile(2,9)` (raw npc bytes), rewrites the g9/g7 ref-table child lists |
| `convertNpcEntries()` | 1337 | reads served g7 (raw NpcType), runs `convertNpcBinaryToLocType(src, i)` per entry, **overwrites `2:7` with LocType** |
| `convertIdkitEntries()` | 1176 | reads g3 (raw 465 IDKit), `convertIdkitBinaryToNpcType`, overwrites `2:3` — **84 body-part entries only, NOT npc defs** |
| `populateNpcDefinitions()` | 1228 | **DEAD CODE — never called** (constructor lines 651-663 call remap → convertIdkit → convertNpc only; grep: no `this.populateNpcDefinitions()` call site). It was purpose-built to merge raw NpcType npc defs into g3, but is not wired. |

**Net idx2 the client actually receives:**

| served group | format | contents |
|---|---|---|
| 2:3 | **NpcType binary** | IDKit body parts (84 entries) — *not* npcs |
| 2:6 | LocType binary | locs (native) |
| 2:7 | **LocType binary** | npcs re-encoded as LocType (6201) |
| 2:9 | LocType binary | locs (shadows the native npc group) |

**=> The only NpcType-format bytes the server emits are group 3 (IDKit). Raw NpcType *npc*
definitions are served nowhere; npc data reaches the wire only as LocType@g7.**

This matches the 464 Java client, which consumes npcs as **LocType** (`aLocType_3617`) from g7,
and uses its "NpcType decoder" *only* for player body parts: `Isaac.method889(id)`
(`client/src/Isaac.java:50`) fetches idkit via
`GroundDecoration.aClass19_1218.method746(3, _, id)` (line 57) — **idx2 group 3, file = id** —
then decodes with `IdkType.method585/method590` (`client/src/IdkType.java:297/384`).

---

## (b) How LC500 fetches npc now (the mismatch)

LC500 assumes a **detached-config cache** (each config type = its own top-level index, RS3/OSRS
split-index style): `web-client/src/client/Client.ts:1002`
`Client.configNpc = this.openJs5(18)`, wired at line 1203 `NpcType.init(configNpc, models)`.
So `NpcType.configClient` = **cache index 18**.

Addressing in `web-client/src/config/NpcType.ts`:
```ts
static getGroupId(id) { return id & 0x7f; }   // line 82
static getFileId(id)  { return id >>> 7; }     // line 86
// list(), line 96:
const data = NpcType.configClient.getFile(NpcType.getGroupId(id), NpcType.getFileId(id));
```

**getFile arg-order footgun (verified in `Js5.ts`):** overloads are `getFile(file, group)`
(`web-client/src/js5/Js5.ts:191-193`) and the impl ends `return this.fetchFile(null, group, file)`
(line 223). So the **1st positional is the file, the 2nd is the group.** Every working idx2
decoder confirms this:
- `IdkType.list` → `getFile(id, 3)` (`IdkType.ts:45`) = file=id, group=3 (IDKit)
- `FluType.list` → `getFile(id, 1)` (`FluType.ts:30`) = group 1 (underlay)
- `FloType.list` → `getFile(id, 4)` (`FloType.ts:33`) = group 4 (overlay)

So NpcType currently reads **index 18, group = id>>7, file = id & 0x7f** (128-file split).

**Two independent reasons this fails against the served cache:**
1. **Index 18 does not exist.** The served 465 master (255:255) is `compLen=128` = `archiveCount*8`
   → **16 top-level archives (idx0-15) only**. Live probe of 255:16 / 255:18 / 255:20 / 255:22
   all **time out** (`scratchpad/probe3.ts`): the server has no such archive, returns null, sends
   nothing. `openJs5(16..26)` (configLoc..materials) all target non-existent indices — the whole
   split-config assumption is wrong for a classic 465 cache. NPC config never loads today.
2. **Wrong shape even if pointed right.** The server serves a flat `file = npc id` group; LC500
   uses a 2-D `id>>7 / id&0x7f` split.

---

## (c) s2Redirect — the concrete edit (client) + its server prerequisite

### Client edit — target the native 465 npc group (idx2 g9), flat file=id

**Edit 1 — `web-client/src/client/Client.ts:1203`** (`configs` = `openJs5(2)` already exists at
line 986 and is fully downloaded before init):
```ts
// was: NpcType.init(configNpc, models);
NpcType.init(configs, models);
```

**Edit 2 — `web-client/src/config/NpcType.ts:81-87`** — make `list()`'s
`getFile(getGroupId(id), getFileId(id))` resolve to `getFile(file = npcId, group = 9)` →
`fetchFile(null, group = 9, file = npcId)`, mirroring `IdkType.list`'s `getFile(id, 3)`:
```ts
static getGroupId(id: number): number {
    return id;      // 1st positional of getFile == FILE  -> flat npc id
}

static getFileId(id: number): number {
    return 9;       // 2nd positional of getFile == GROUP -> idx2 npc-config group
}
```
(Names stay wrong-but-consistent with the rest of LC500 — same inversion loc.md documents. Add a
clarifying comment. `configNpc = openJs5(18)` becomes unused by npc.)

### Server prerequisite — REQUIRED, because g9 currently carries loc bytes

With the edit alone, `getFile(id, 9)` returns **loc** bytes (the remap shadow) and the NpcType
decoder desyncs. The 464 Java client and LC500 want **incompatible** idx2 layouts from the same
socket (464: loc@9, npc-as-LocType@7, idkit-as-NpcType@3 — LC500: native loc@6, npc@9, idkit@3
raw). So the server must **version-gate** its 464-compat transform: when the JS5 handshake is the
LC500 revision (not 464), serve the **native, un-remapped, un-converted** cache
(`remapConfigGroups` + `convertNpcEntries` + `convertIdkitEntries` skipped). Then:
- npc@g9 = raw NpcType (this redirect works),
- loc → LC500's LocType redirect should target **g6** natively (loc.md's g9 is the 464-shadow
  copy; it only works for loc because loc bytes are byte-identical through the remap),
- idkit@g3 = raw 465 IDKit, which LC500's `IdkType.decodeInner` (opcode 1=type u8, 2=models,
  3=disable, 40/41 recol/retex, 60-69 head) **already decodes natively** — the server's
  IDKit→NpcType conversion is a 464-only crutch LC500 does not need.

**Alternative (stay on the shared 464 stream, no version-gate):** wire the dead
`populateNpcDefinitions()` (js5-update-server.ts:1228) into the constructor *between*
`convertIdkitEntries()` and `convertNpcEntries()` (it reads g7 while still raw NpcType — see its
own comment, line 1243-1244). That merges raw NpcType npc defs into **g3** at file=npcId, and the
client redirect becomes `getFile(id, 3)`. **Caveat:** it appends IDKit after the npcs
(`merged[npcCount + i]`), so `IdkType.list(idkitId)` = `getFile(idkitId, 3)` would then read an
npc slot — player-appearance idkit lookups break unless IDKit is offset or kept in a separate
group. The version-gate is cleaner.

Verification after the edit (+ server prereq): `NpcType.list(1)` should decode a non-null
`name`; `NpcType.list(4412)` (`moba_turret`) exists in cache g9.

---

## (d) s3FormatDelta — 464 decode vs LC500 decode (opcode level)

Two 464-side references exist for the native 465 NpcType wire format, and LC500 agrees with both:

1. **`client/src/IdkType.java::method585`** (line 297) — the 464 client's "NpcType decoder",
   annotated *"465 cache format opcodes (rewritten from 464 format)"*. It is a **reduced**
   decoder (body-part subset): it *reads* the shared opcodes at the correct widths but keeps only
   models / body-part-type / recolours / head models and discards the rest.
2. **`server/src/server/update/js5-update-server.ts::convertNpcBinaryToLocType`** (line 364) — the
   server's own decoder of the native NPC bytes (what it re-encodes to LocType). This is the
   authoritative statement of the format the wire carries.

LC500's `NpcType.decodeInner` (`web-client/src/config/NpcType.ts:121`) is the full oldscape
NpcType decoder.

### Opcode table — bytes consumed on each. `u16`=2, `u8`/`s8`=1, `str`=null-terminated string.

| op | 464 `IdkType.method585` | server `convertNpcBinaryToLocType` | LC500 `decodeInner` | bytes | notes |
|----|---|---|---|-------|-------|
| 1  | cnt u8; n×model u16 | cnt u8; n×model u16 | cnt g1; n×model g2 | 1+2n | models — all agree |
| 2  | str (discarded) | str (name) | gjstr (name) | str | |
| 12 | u8 → **bodyPartType** | u8 → **size** | u8 → **size** | 1 | ⚠ only semantic difference: IdkType repurposes 12 as IDK body-part-type; on real npc bytes 12 = size — LC500 correct, matches server |
| 13 | u16 (discarded) | u16 (idleAnim) | u16 readyanim | 2 | |
| 14 | u16 (discarded) | u16 (walkAnim) | u16 walkanim | 2 | |
| 15 | — (unhandled) | — (aborts→null) | u16 turnleftanim | 2 | npc-only; neither 464 ref keeps it, LC500 does |
| 16 | — | — (aborts) | u16 turnrightanim | 2 | npc-only |
| 17 | 4×u16 (discarded) | 4×u16 (walk/back/left/right) | 4×u16 | 8 | |
| 30-34 | str (discarded) | str (actions) | gjstr op[], "hidden"→null | str | |
| 40 | cnt u8; n×(src u16, dst u16) | cnt u8; n×(src u16, dst u16) | cnt g1; n×(recol_s g2, recol_d g2) | 1+4n | recolour; **src-then-dst** in all three |
| 41 | — | — (aborts) | cnt g1; n×(retex_s g2, retex_d g2) | 1+4n | retexture — LC500 only |
| 42 | — | — (aborts) | cnt g1; n×(palette s8) | 1+1n | recol_d_palette — LC500 only |
| 60 | cnt u8; n×head u16 | cnt u8; n×head u16 | cnt g1; n×head g2 | 1+2n | head models — all agree |
| 93 | no-data flag | no-data (noMinimap) | minimap=false | 0 | |
| 95 | u16 (discarded) | u16 (combatLevel) | u16 vislevel | 2 | |
| 97 | u16 (discarded) | u16 (scaleX) | u16 resizeh | 2 | |
| 98 | u16 (discarded) | u16 (scaleY) | u16 resizev | 2 | |
| 99 | no-data (aBoolean3117) | no-data (skip) | alwaysontop=true | 0 | |
| 100| s8 (discarded) | s8 (lightness) | s8 ambient | 1 | |
| 101| s8 (discarded) | s8 (skip) | s8×5 contrast | 1 | same read width; LC500 ×5 |
| 102| u16 (discarded) | u16 (skip head icon) | u16 headicon | 2 | |
| 103| u16 (discarded) | u16 (turnSpeed) | u16 turnspeed | 2 | |
| 106| varbit u16; varp u16; cnt u8; (cnt+1)×u16 | same | multivarbit g2; multivarp g2; cnt g1; (cnt+1)×g2 | 2+2+1+2(cnt+1) | 65535→-1; **(varbit, varp)** order — all agree |
| 107| no-data flag | no-data (noClick) | active=false | 0 | |
| 118| — | — (aborts) | varbit u16; varp u16; **extra u16**; cnt u8; (cnt+1)×u16 | 2+2+2+1+2(cnt+1) | extended multinpc — LC500 only |
| 109| — | — (aborts) | walksmoothing=false | 0 | LC500 only |
| 111| — | — (aborts) | (spotshadow, no data) | 0 | LC500 only |
| 113| — | — (aborts) | 2×u16 (discard) | 4 | LC500 only |
| 114| — | — (aborts) | 2×s8 (discard) | 2 | LC500 only |
| 115| — | — (aborts) | u8×4 (field2350); u8×4 (field2329) | 2 | LC500 only |
| 119| — | — (aborts) | s8 walkflags (discard) | 1 | LC500 only |
| 249| — | — (aborts) | params: cnt u8; n×(isStr u8, key u24, val u32/str) | var | LC500 only |

### Conclusion for the LC500 port
- **LC500's `decodeInner` is a strict superset of both 464-side references, and every opcode all
  three handle has identical byte widths and the same field order (recolour src-then-dst @40;
  varbit-then-varp @106; count+ids @1/60).** There is **no divergent opcode semantics** and **no
  blocking format delta** — `decodeInner` needs **no change**. It will parse the served/native
  465 npc bytes without stream desync.
- The only "delta" is cosmetic: opcode **12** reads a `u8` in all three, but `IdkType` labels it
  body-part-type (because it decodes IDKit, not npcs). On real npc bytes 12 = size, which LC500
  and the server converter both use correctly.
- **LC500 is *more* complete than the server's own converter.** `convertNpcBinaryToLocType`
  **aborts (`return null`)** on opcodes 15, 16, 41, 42, 118, 109, 111, 113, 114, 115, 119, 249. If
  any real 465 npc entry uses one of those (retexture@41, palette-recolour@42, extended
  multinpc@118, params@249 are the plausible ones), that npc silently gets *no* LocType at g7 for
  the 464 client — but LC500 would decode it fine. Reading npc from raw g9 via NpcType (this
  redirect) therefore also *dodges* that lossy converter. This is a point in favour of the
  version-gated native path over decoding npcs-as-LocType@g7.

---

## Files cited
- `client/src/IdkType.java:297` `method585` (opcode table), `:384` `method590` (decode loop)
- `client/src/Isaac.java:50-63` `method889` (idkit/NpcType fetch), `:57` `method746(3, _, id)` = idx2 group 3, file=id
- `web-client/src/config/NpcType.ts:76` `init`, `:81-87` `getGroupId/getFileId`, `:90-106` `list`, `:121-260` `decodeInner`
- `web-client/src/config/IdkType.ts:32-45` `init`+`list` (`getFile(id, 3)` template), `:68-98` `decodeInner` (native 465 IDKit)
- `web-client/src/config/FluType.ts:30` / `FloType.ts:33` (`getFile(id, 1|4)` — confirms arg order)
- `web-client/src/js5/Js5.ts:191-224` `getFile(file, group)` → `fetchFile(null, group, file)` (:223)
- `web-client/src/client/Client.ts:986` `configs=openJs5(2)`, `:1002` `configNpc=openJs5(18)`, `:1203` `NpcType.init`
- `server/src/server/update/js5-update-server.ts:169-198` group constants + `CONFIG_GROUP_REMAP`, `:348` `NPC_MODEL_OVERRIDES`, `:364` `convertNpcBinaryToLocType`, `:821` `remapConfigGroups`, `:1176` `convertIdkitEntries`, `:1228` `populateNpcDefinitions` (DEAD), `:1337` `convertNpcEntries`
- Live: `scratchpad/probe2.ts` (idx2 ref-table + g3/6/7/9 decode), `scratchpad/probe3.ts` (255:16/18/20/22 timeout = no split indices)
```
