# S2 map — FLO (FloType = overlay) + FLU (FluType = underlay)

Goal: make the Lost City 500 (LC500) web-client fetch + decode **floor** configs from the
465 cache that RuneJS's JS5 update-server serves. LC500 splits floor into two types:

- **FloType = floor OVERLAY** (roads, water, paths — the painted-on tile texture/colour)
- **FluType = floor UNDERLAY** (the base terrain-blend ground colour)

**Bottom line: flo AND flu need NO redirect and NO decoder change.** LC500 already fetches
overlay from `archive 2 / group 4 / file=id` and underlay from `archive 2 / group 1 / file=id`
(flat, one file per id), which is byte-for-byte what the server serves from the 465 cache.
Verified live: the served overlay files use only opcodes `{1,2,5,7}` and the served underlay
files use only opcode `{1}` — every one of which LC500's decoder handles identically to the
464-Java reference. The extra opcodes LC500 knows (overlay 3/8/9/10/11/12/13/14; underlay
2/3) are forward-compat and **never appear** in this cache. This page is the proof so a
future session doesn't "fix" a non-problem.

The common trap: confusing top-level **archive/index numbers** with **group numbers inside
idx2**. Overlay lives in **group 4 of idx2**, not archive 4 (`Client.jagFX`); underlay lives
in **group 1 of idx2**, not archive 1 (`Client.bases`).

---

## (a) 465 cache addressing for flo/flu — as the server serves it

| Type | Index | Group | File | Files in cache |
|---|---|---|---|---|
| **FloType (overlay)** | `idx2` (config) | `4` | `overlayId` (flat) | 124 |
| **FluType (underlay)** | `idx2` (config) | `1` | `underlayId` (flat) | 80 |

- File addressing is **flat** — file = id, no `id>>8` / `id&0xff` split. Each id is a
  separate child file inside the group; the group is one gzip container holding all files
  concatenated (Js5 multi-file trailer).
- idx2 reference table: **protocol 6, flags 0**.

Verified live against the running update-server (handshake v464 accepted, then parsed the
served `255:2` ref-table and unpacked `2:4` / `2:1`):

```
idx2 protocol 6 flags 0 groupCount 24
  group 1 (underlay/Flu): childCount=80
  group 4 (overlay/Flo):  childCount=124
  ...
2:4 OVERLAY  124 files, payloadLen=1202  opcode histogram {1:82, 2:18, 5:29, 7:2}
  file[0]  len=5  01 aaaaaa 00                    (opcode1 colour=0xaaaaaa)
  file[50] len=10 05 01 ff00ff 07 827944 00       (op5 occlude-off, op1 colour=magenta→-1, op7 mapcolour)
2:1 UNDERLAY  80 files, payloadLen=721   opcode histogram {1:80}
  file[0]  len=5  01 282820 00                    (opcode1 colour=0x282820)
  file[50] len=5  01 2f2b1f 00
```

→ **Served overlay uses ONLY opcodes {1,2,5,7}. Served underlay uses ONLY opcode {1}.**

Server code path (all in `server/src/server/update/js5-update-server.ts`):

- `CacheStore.getFile(cacheId, fileId)` reads `main_file_cache.idx{cacheId}` directly, so a
  client request for archive `2` maps 1:1 to on-disk `idx2`. No index-number remap.
- `remapConfigGroups()` (line 821) + `CONFIG_GROUP_REMAP` (line 195): **only groups 9 (loc)
  and 7 (npc-entity) are remapped**. Groups **1 (underlay)** and **4 (overlay)** are NOT in
  the remap table → served straight from the 465 cache, unmodified. The remap rebuilds the
  idx2 ref-table but preserves every non-remapped group's child metadata (confirmed live:
  the served ref-table still reports g1=80, g4=124 children).

---

## (b) How LC500 fetches flo/flu now

Archive source — both types bind to `Client.configs`:

- `Client.configs = this.openJs5(2, …)` — `Client.ts:986`. `openJs5(2)` builds a `Js5Loader`
  (extends `Js5`) whose net requests go to cacheId **2** (idx2).
- `FloType.init(configs)` — `Client.ts:1199`; `FluType.init(configs)` — `Client.ts:1200`.
  (`configs` here is the same `Client.configs`; `Client.configs: Js5Loader` declared at
  `Client.ts:154`.)

Group / file formula:

- **FloType** (`web-client/src/config/FloType.ts`):
  - `FloType.numDefinitions = configClient.getFileIdLimit(4)` — line 23 → **group 4**.
  - `FloType.list(id)`: `configClient.getFile(id, 4)` — line 33. `Js5.getFile(file, group)`
    → group **4**, file **id** (flat). (`Js5.ts:192` overload `getFile(file, group)`;
    resolves to `fetchFile(null, group=4, file=id)`.)
- **FluType** (`web-client/src/config/FluType.ts`):
  - `FluType.list(id)`: `configClient.getFile(id, 1)` — line 30 → group **1**, file **id**.

So LC500's **native addressing already equals** the served 465 layout: overlay 2:4:id,
underlay 2:1:id.

---

## (c) s2Redirect — the concrete LC500 edit

**NONE.** No edit to `FloType.ts` or `FluType.ts` is required.

- clientConfig source: keep `FloType.configClient = Client.configs` (openJs5(2)). Unchanged.
- getGroupId: overlay stays constant **4** (`getFile(id, 4)`); underlay stays constant **1**
  (`getFile(id, 1)`). Unchanged.
- getFileId: stays **id** (flat) for both. Unchanged.

LC500 already points exactly where the server serves the 465 overlay/underlay data, and the
server passes those groups through untouched. This is the desired end state, not a coincidence
to be "corrected".

---

## (d) s3FormatDelta — 464 Java decode vs LC500 decode

### The 464 Java decoders (obfuscated), for reference

- **Overlay = `Class4_Sub20_Sub9`** (JODE name). Loaded by
  `Class4_Sub6.method184(id)` → `Class1.aClass19_67.method746(4, _, id)` = config archive
  **group 4, file id** (`Class4_Sub6.java:214`; `method746(group,_,file)`→`method758(null,group,_,file)`
  at `Class19.java:399`). Decode loop `method476`/`method479` (`Class4_Sub20_Sub9.java:133-169`);
  HSL derived post-decode in `method480`/`method481`.
- **Underlay = the class JODE mislabels `RS2Font`** (it carries the 4 HSL fields
  anInt2785/2766/2778/2784 = hue/sat/light/chroma; the "font" name is a decompiler artifact).
  Loaded by `GraphicsBufferProducer.method697(id-1)` →
  `SceneGraph.aClass19_2483.method746(1, _, id)` = config archive **group 1, file id**
  (`GraphicsBufferProducer.java:391`; consumed in the terrain blend at `SceneBuilder.java:352`).
  Decode loop `method339`/`method344` (`RS2Font.java:284-371`); HSL in `method343`.
- Read primitives: `StreamBuffer.method248` = unsigned tribyte (g3, `StreamBuffer.java:2278`);
  `.get()` = u8 (g1).

### Overlay (FloType) opcode tables

| opcode | 464 `Class4_Sub20_Sub9` | LC500 `FloType.decodeInner` (FloType.ts:56) | same? |
|---|---|---|---|
| 1 | colour = g3 → raw rgb (`anInt3025`) | colour = `getHsl(g3)` (packed HSL) | read same (repr differs) |
| 2 | texture/material = g1 (`anInt3027`) | material = g1 | ✅ |
| 3 | — | material = g2 (65535→-1) | LC500-only |
| 5 | occlude=false (`aBoolean3040`) | occlude=false | ✅ |
| 7 | mapcolour = g3 → raw rgb (`anInt3023`) | mapcolour = `getHsl(g3)` | read same (repr differs) |
| 8 | — | `defaultWater = id` (no bytes) | LC500-only |
| 9 | — | materialscale = g2 (discarded) | LC500-only |
| 10 | — | hardshadow (no bytes) | LC500-only |
| 11 | — | priority = g1 (discarded) | LC500-only |
| 12 | — | blend (no bytes) | LC500-only |
| 13 | — | waterfogcolour = g3 | LC500-only |
| 14 | — | waterfogscale = g1 | LC500-only |

- 464 handles `{1,2,5,7}`; LC500 handles `{1,2,3,5,7,8,9,10,11,12,13,14}` (superset).
- **Overlapping opcodes {1,2,5,7} read identical byte widths** — no wire divergence.
- **Representation difference** (not a format bug): 464 stores the raw rgb in opcode 1/7 and
  derives HSL lazily (`method481`, transparent magenta `0xff00ff` → special-cased). LC500
  applies `getHsl` at decode time (`FloType.getHsl`, `0xff00ff` → `-1`), storing packed
  HSL-16. Same input bytes, equivalent render result.
- **The served cache overlay uses only {1,2,5,7}** → LC500's superset is dormant; even the
  464 decoder would consume this exact data without desync.

### Underlay (FluType) opcode tables

| opcode | 464 `RS2Font` (mislabelled underlay) | LC500 `FluType.decodeInner` (FluType.ts:53) | same? |
|---|---|---|---|
| 1 | colour = g3 (`anInt2776`) → HSL via `method343` | colour = g3, then `getHsl` (hue/sat/light/chroma) | ✅ identical |
| 2 | — | material = g2 (65535→-1) | LC500-only |
| 3 | — | materialscale = g2 (discarded) | LC500-only |

- 464 handles `{1}` only; LC500 handles `{1,2,3}` (superset).
- Opcode 1 decode is **byte-identical AND HSL-algorithm-identical**: both compute
  lightness=(max+min)/2·256, chroma (·512, clamped ≥1), hue=hueVal/6·chroma, saturation·256.
  (Compare `RS2Font.method343:301-352` with `FluType.getHsl:69-127`.)
- **The served cache underlay uses only {1}** → LC500's opcode 2/3 are dormant.

### Delta verdict

No decode change needed. LC500's FloType/FluType are opcode-superset decoders whose
overlapping opcodes match the 464 reference bit-for-bit, and the 465 cache only exercises the
overlapping subset. This is the S3 "anti-Frankenstein" gate passing for floor configs:
addressing aligns, and the byte stream the server serves is fully within LC500's decoder.

---

## Provenance

- Live probe scripts (scratchpad, throwaway): parsed served `255:2` ref-table + unpacked
  `2:4`/`2:1` via the Js5 file-split trailer, dumped per-file opcode histograms. Base probe:
  `web-client/tools/js5-probe.ts`.
- 464 Java: `client/src/Class4_Sub20_Sub9.java` (overlay), `client/src/RS2Font.java` +
  `client/src/GraphicsBufferProducer.java:391` + `client/src/SceneBuilder.java:352` (underlay),
  `client/src/Class4_Sub6.java:214` + `client/src/Class19.java:399` (addressing).
- LC500: `web-client/src/config/FloType.ts`, `web-client/src/config/FluType.ts`,
  `web-client/src/client/Client.ts:986,1199-1200`, `web-client/src/js5/Js5.ts:192`.
- Server: `server/src/server/update/js5-update-server.ts:195` (`CONFIG_GROUP_REMAP`),
  `:821` (`remapConfigGroups`).

**Confidence: high** — served bytes were unpacked and opcode-histogrammed live; both decoders
were read in full; addressing was traced end-to-end (client formula → server serve path →
on-disk idx2).
