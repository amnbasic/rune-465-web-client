# S2 map: `obj` (item config) — LC500 → 465 cache

Goal: make the Lost City 500 web-client fetch + decode **obj** (item) configs from the
465 cache that `js5-update-server.ts` serves, instead of from its native Lost City
split-per-type archive.

All findings below are **probe-verified against the live server** (127.0.0.1:43594,
JS5 handshake v464) and traced to file:line in all three sources. No guesses.

---

## (a) 465 cache addressing for obj — as the server actually serves it

| property | value | evidence |
|---|---|---|
| index (idx) | **2** (the config archive) | ref-table `255:2` served, probe OK |
| group | **10** (`OBJ_ARCHIVE_ID`) | `js5-update-server.ts:178` |
| file | **obj id**, flat — one file per obj (file id == obj id) | probe below |
| files in group 10 | **11736** | probe: `group 10 -> childCount 11736` |
| remapped? | **No.** `CONFIG_GROUP_REMAP` only remaps client-group 9←cache 6 (loc) and 7←9 (npc). Obj is identity. | `js5-update-server.ts:195-198` |
| served via | `fileOverrides '2:10'` + `applyConfigOverlays(OBJ_ARCHIVE_ID, 'obj')` | `js5-update-server.ts:1654-1655`, `1133` |
| obj overlays | raw pre-encoded client-format bytes from `data/pack/client/config/obj.{dat,idx}` overlaid onto group-10 entries by id (no server-side opcode re-encode) | `js5-update-server.ts:1375-1508` |

Live idx2 group map (probe, `protocol=6 flags=0 archiveCount=24`):

```
group 6  -> 26208   (loc)
group 9  -> 26208   (npc)
group 10 -> 11736   (obj)   <-- target
group 12 -> 6953    (seq)
group 16 -> 1053    (varp)
2:10 container = gzip, 143250 B (all 11736 files, strip-packed)
```

**Cross-check from the 464 Java client's own fetch path** (this is the client the server
was built to feed, so its addressing == the cache's real layout):

- `Class4_Sub23.method633(objId)` → `Class4_Sub17.aClass19_2323.method746(10, key, objId)`
  — `client/src/Class4_Sub23.java:46`
- `Class19.method746(arg0=group, arg1=key, arg2=file)` → `method758(null, group, false, file)`
  — `client/src/Class19.java:399-404`
- ⇒ group **10**, file **objId**, no `id>>8`/`id&0xff` split. Flat one-file-per-obj. Confirmed.

---

## (b) How LC500 fetches obj now (the Lost City split-per-type layout)

- `ObjType.configClient` is set by `ObjType.init(memServer, config, countFont, models)`
  — `web-client/src/config/ObjType.ts:102-109`.
- Caller passes **archive 19**: `ObjType.init(Client.memServer, configObj, …)` where
  `configObj = Client.configObj = this.openJs5(19, …)`
  — `Client.ts:1003` (open), `1035`/`1169` (bind), `1204` (call).
- Lookup `ObjType.list` — `ObjType.ts:126`:
  ```ts
  ObjType.configClient.getFile(ObjType.getGroupId(id), ObjType.getFileId(id));
  ```
  - `getGroupId(id) = id & 0xff`  — `ObjType.ts:111-113`
  - `getFileId(id)  = id >>> 8`   — `ObjType.ts:115-117`

- **Gotcha (parameter order):** `Js5.getFile` is declared `getFile(file, group)` and does
  `return this.fetchFile(null, group, file)` — `Js5.ts:192, 223`. So the **first** positional
  arg is the *file* and the **second** is the *group*.
  Passing `getFile(getGroupId(id)=id&0xff, getFileId(id)=id>>8)` therefore means
  **file = `id & 0xff`, group = `id >>> 8`** in **archive 19** — i.e. 256 files per group,
  the OSRS split-per-256 obj layout. (The helper names read backwards vs. what they do.)
- `numDefinitions = (getGroupCount()-1)*256 + getFileIdLimit(getGroupCount()-1)`
  — `ObjType.ts:106-107`. Correct only for the archive-19 256-per-group shape.

---

## (c) s2Redirect — concrete edit to read idx2 / group 10 / file=objId

Three coordinated edits. The cache holds obj **flat** in one group, so both the addressing
helpers *and* `numDefinitions` must change (not just the archive source).

**1. clientConfig source** — `web-client/src/client/Client.ts:1204`
(`configs` == `Client.configs` == `openJs5(2)` == idx2, already bound locally at `Client.ts:1159`
and full-downloaded at `Client.ts:1176`):

```ts
// FROM
ObjType.init(Client.memServer, configObj, Client.countFont, models);
// TO
ObjType.init(Client.memServer, configs, Client.countFont, models);
```

**2. getGroupId / getFileId** — `web-client/src/config/ObjType.ts:111-117`.
Because `Js5.getFile(file, group)` takes **(file, group)** and `list()` calls
`getFile(getGroupId(id), getFileId(id))`, the helper that feeds the *first* arg must return
the **file** (the obj id) and the one feeding the *second* arg must return the **group** (10):

```ts
static getGroupId(id: number): number {
    return id;   // FILE within config group 10 (flat, one file per obj)
}

static getFileId(id: number): number {
    return 10;   // idx2 config GROUP for objs (OBJ_ARCHIVE_ID)
}
```

> Do **not** intuit-swap these. `getFile`'s positional order is `(file, group)`, so
> `getGroupId` → file and `getFileId` → group. The net `fetchFile(null, 10, id)` is what
> matches the 464 client's `method746(10, key, objId)`.

**3. numDefinitions** — `web-client/src/config/ObjType.ts:106-107` (inside `init`).
idx2 group 10 is a single flat group of 11736 files; the 256-per-group math would give
`~25*256+1` (wrong). Replace with the group's file count:

```ts
// FROM
const groups = ObjType.configClient.getGroupCount() - 1;
ObjType.numDefinitions = groups * 256 + ObjType.configClient.getFileIdLimit(groups);
// TO
ObjType.numDefinitions = ObjType.configClient.getFileIdLimit(10);
```

Nothing else in `ObjType.ts` needs to change — the decoder already matches (see (d)).

---

## (d) s3FormatDelta — 464 Java decode vs LC500 decode

Sources:
- **464 Java:** `Class4_Sub20_Sub8.method465(byte, StreamBuffer, opcode)` (payload) +
  `method466` (driver loop) — `client/src/Class4_Sub20_Sub8.java:369-522`.
- **LC500:** `ObjType.decodeInner(code, buf)` — `web-client/src/config/ObjType.ts:164-298`.

### Field-by-field equivalence for shared opcodes (verified via constructor defaults)

Every opcode present in the 464 decoder maps to the **same field with the same payload** in
LC500 (default values matched to disambiguate the obfuscated `anIntNNNN`):

`1`=model(g2) · `2`=name(str) · `4`=zoom2d(g2) · `5`=xan2d(g2) · `6`=yan2d(g2) ·
`7`=xof2d(g2,signed) · `8`=yof2d(g2,signed) · `11`=stackable · `12`=cost(g4) · `16`=members ·
`23`=manwear(g2)+offY(g1) · `24`=manwear2(g2) · `25`=womanwear(g2)+offY(g1) · `26`=womanwear2(g2) ·
`30-34`=op[] · `35-39`=iop[] · `40`=recol pairs · `78`=manwear3 · `79`=womanwear3 ·
`90`=manhead · `91`=womanhead · `92`=manhead2 · `93`=womanhead2 · `95`=zan2d · `97`=certlink ·
`98`=certtemplate · `100-109`=countobj/countco · `110`=resizex · `111`=resizey · `112`=resizez ·
`113`=ambient(g1b) · `114`=contrast(g1b*5) · `115`=team(g1).

### Divergent opcodes

- **464 has, LC500 lacks:** *none.*
- **LC500 has, 464 lacks (superset only):** `41`(retex), `42`(recol_d_palette), `65`(stockmarket),
  `96`(dummyitem), `121`(lentlink), `122`(lenttemplate), `124`(unknown 11×6 shorts), `249`(params).
- **No opcode with conflicting semantics** exists between the two.

### What the served 465 data actually uses (empirical, all 11736 entries)

Ran the LC500 superset opcode-length walker over every file in group 10 of the live cache:

```
group10 childCount=11736 decodedOK=11736 empty=0 failed=0
opcodes present: 1,2,4,5,6,7,8,11,12,16,23,24,25,26,30,32,33,34,35,36,37,38,39,40,
                 78,79,90,91,92,93,95,97,98,100,101,102,103,104,105,106,107,108,
                 110,111,112,113,114,115
```

The served data uses **only** the 464-subset (all ≤115). **None** of the LC500-only opcodes
(`41,42,65,96,121,122,124,249`) occur. (Consistent with the fact that the same bytes feed the
464 Java client today, whose decoder stops at 115.)

### Verdict

**No decoder changes required.** LC500's `decodeInner` is a strict superset of the 464 decoder
with identical semantics on every shared opcode, and the 465 cache only emits opcodes in that
shared set. The `s2Redirect` (section c) is sufficient and complete; `decodeInner` decodes
100% of the served obj data as-is. `s3FormatDelta = none found`.

---

## Repro

```
cd web-client
bun run tools/js5-probe.ts 464                # handshake + 255:2 ref table
# scratch scripts used for this doc:
#   probe-obj.ts          -> lists idx2 group childCounts, fetches 2:10
#   probe-obj-opcodes.ts  -> unpacks group 10, walks all 11736 entries, dumps opcode set
```
