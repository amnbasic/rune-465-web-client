# S2 map — SEQ (SeqType / animation-sequence config)

Goal: make the Lost City 500 (LC500) web-client fetch + decode **seq** (animation
sequence) configs from the 465 cache that RuneJS's JS5 update-server serves.

**Bottom line: seq needs BOTH a fetch redirect AND a decoder fix.**

1. **Redirect (S2):** LC500 currently reads seq from **top-level archive 20** (`Client.configSeq
   = openJs5(20)`), splitting the id into `group = id>>7, file = id&0x7f`. The server serves
   seq from **`idx2` / group `12` / file = seqId (flat)**. So LC500 must fetch from
   `Client.configs` (`openJs5(2)`), group `12`, file `id` — exactly like `VarpType` does for
   group 16.
2. **Decoder fix (S3):** the served bytes are **464-format**. LC500's `decode` is opcode-identical
   to 464 for opcodes **1–12**, but **opcode 13 (sound) uses a different, newer wire format** and
   LC500 has an extra **opcode 14** that the cache never emits. Opcode 13 must be rewritten to the
   464 layout or 123 of the 6953 seqs mis-parse.

Both claims are verified **live** against the running update-server (probe scripts in
scratchpad): all 6953 served seq entries decode cleanly under 464 rules; exactly 123 (the ones
carrying opcode 13) fail under the current LC500 rules; 0 use opcode 14.

---

## (a) 465 cache addressing for seq — as the server serves it

- **Index (archive):** `idx2` (the config index).
- **Group:** `12` (SEQ type-group inside idx2).
- **File:** `seqId` — **flat**, no `id>>8`/`id&0xff` split. childIds are the contiguous range
  `0 … 6952`.
- **Container:** one gzip group holding all 6953 seq files (Js5 file-split trailer, `numChunks=1`).

Verified live (`scratchpad/seq-probe.ts` + `seq-decode-test.ts` against the running server):

```
idx2 groups present: 1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,18,19,20,21,22,23,24,25
group 12 (seq) archIdx=11 childCount=6953  childIds flat 0..6952 (strictly ascending)
2:12  compType=2(gzip) compLen=142317  decompressed=873311  numStripsTrailer=1
```

Server code path (all in `server/src/server/update/js5-update-server.ts`):

- `SEQ_ARCHIVE_ID = 12` — line 179 (comment: "seqs are archive 12 in both"). NB the constant
  is named `*_ARCHIVE_ID` but it is an **idx2 group**, not a top-level index.
- `remapConfigGroups()` (line 821) + `CONFIG_GROUP_REMAP` (line 195): only groups **9** (loc)
  and **7** (npc-entity) are remapped. **Group 12 (seq) is NOT remapped** — served as-is from
  the 465 cache.
- `applySeqOverlays()` → `applyConfigOverlays(12, 'seq')` — lines 1658-1659 / 1375: overlays
  `data/pack/client/config/seq.{dat,idx}` entries onto idx2 group 12, keyed by `entryId =
  childIds[i] = seqId` (line 1501-1503), and rebuilds the group + idx2 ref-table + CRC. The
  overlaid bytes are copied in verbatim (`packEntry`), i.e. they stay in the **464 seq opcode
  format** — the same format the 464 Java client decodes.

So the effective served addressing for seq id `N` is: **`getFile(255,2)` ref-table → group 12
child list; group container `2:12`; file index `N` within it (flat).**

### 464 Java client — the reference decoder (proves the served format)

- Fetch: `WallObject.method1093(id, _)` — `client/src/WallObject.java:45`:
  `Class4_Sub20_Sub7_Sub4.aClass19_3371.method746(12, (byte)99, id)` → config archive
  (`aClass19_3371` = idx2), **group `12`, file = `id`** (flat; no split). Result wrapped in a
  `StreamBuffer` and handed to `method620`.
- Decode loop: `Class4_Sub20_Sub17.method620` (`client/src/Class4_Sub20_Sub17.java:486`) — read
  `get()` opcodes, break on 0, dispatch to `method622`.
- Per-opcode decode: `Class4_Sub20_Sub17.method622` (line 503).
- StreamBuffer read widths: `get()`=**g1** (line 1864), `method209`=**g2 BE** (1767),
  `method248`=**g3 BE / 24-bit** (2278), `method219`=g4 (1885).

---

## (b) How LC500 fetches seq now

Files: `web-client/src/config/SeqType.ts`, `web-client/src/js5/Js5.ts`,
`web-client/src/client/Client.ts`.

- **clientConfig source:** `SeqType.configClient` is set by `SeqType.init(configSeq, anims,
  bases)` — `Client.ts:1206`. `configSeq` = `Client.configSeq = this.openJs5(20, true, true,
  false)` — `Client.ts:1004`. → **top-level archive index 20** (a dedicated LostCity-layout seq
  index). **The server does not serve seq there — it serves `idx2` group 12.**
- **getGroupId / getFileId (SeqType.ts:51-57):**
  ```ts
  static getGroupId(id) { return id & 0x7f; }   // 0..127
  static getFileId(id)  { return id >>> 7; }
  ```
- **fetch (SeqType.ts:66):** `SeqType.configClient.getFile(getGroupId(id), getFileId(id))`.
  ⚠️ **Arg-order trap:** `Js5.getFile(file, group)` (overload `Js5.ts:192`; two-arg form →
  `fetchFile(null, group, file)`). So the *first* arg is the **file**, the *second* is the
  **group**. The current call therefore resolves to **group = `id>>7`, file = `id&0x7f`** on
  index 20 (the helper NAMES are inverted relative to the slots they fill). This is the LostCity
  seq layout — **wrong for the 465 cache** on all three axes (index, group, file).
- **anims / bases:** `Client.anims = openJs5(0)`, `Client.bases = openJs5(1)` — used by
  `AnimFrameSet` for the actual frame/skeleton geometry (`SeqType.get`/`loadFrameset`,
  lines 281-318). **Out of scope for this page** (that is the frame-data S2 map, not seq config),
  but note it is a *separate* mapping that still needs its own verification.

---

## (c) s2Redirect — the concrete edit to `SeqType.ts` (+ one line in `Client.ts`)

Point the clientConfig at `idx2` and address group 12 / flat file, mirroring `VarpType`
(`getFile(id, 16)`).

**`Client.ts:1206`** — pass the idx2 config archive instead of the (unserved) index-20 archive:

```ts
// before:
SeqType.init(configSeq, anims, bases);
// after:
SeqType.init(configs, anims, bases);   // configs = Client.configs = openJs5(2) = idx2
```

(`configs` is already in scope at that call site — `Client.ts:1018`. `configSeq` becomes unused
for SeqType; leave the `openJs5(20)` line alone unless something else needs it — nothing does.)

**`SeqType.ts:51-57` + `:66`** — new group/file addressing. Because `getFile(file, group)` takes
**file first**, either (A) redefine the helpers so the existing call still lands correctly, or
(B) inline it like `VarpType`. Recommended (B), least error-prone:

```ts
// remove getGroupId/getFileId, or keep for clarity as constants:
static readonly GROUP = 12;                       // idx2 seq group

// SeqType.list(), line 66 — replace the getFile call:
const data = SeqType.configClient.getFile(id, SeqType.GROUP);   // file = id (flat), group = 12
```

If you keep the helper shape, the *correct* bodies are:

```ts
static getGroupId(id: number): number { return id; }   // → passed as getFile FILE arg
static getFileId(_id: number): number { return 12; }   // → passed as getFile GROUP arg
// list(): getFile(getGroupId(id), getFileId(id))  ==  getFile(id, 12)
```

(The names stay inverted vs their meaning — that is why inlining is cleaner.)

| Field | LC500 now | 465 server serves | Fix |
|---|---|---|---|
| clientConfig | `configSeq` = `openJs5(20)` | `idx2` | → `configs` = `openJs5(2)` |
| group | `id>>7` (index-20 group) | `idx2` group `12` | → constant `12` |
| file | `id&0x7f` | flat `id` | → `id` |

Prerequisite: the shared S2 JS5-download plumbing must make `openJs5(2)` actually reach the
server's `idx2` (not seq-specific; handled by the S2 transport work).

---

## (d) s3FormatDelta — opcode-level decode differences

**Opcodes 1–12 are byte-for-byte identical** between the 464 Java decoder
(`Class4_Sub20_Sub17.method622`) and LC500 `SeqType.decodeInner`. The only differences are
**opcode 13 (sound)** and **opcode 14**.

### Full opcode table

| op | field (LC500) | 464 `method622` | LC500 `decodeInner` | same? |
|---|---|---|---|---|
| 0 | — (terminate) | break loop | `return` | ✅ |
| 1 | `delay` + `frames` | `n=g2`; `delay[n]` each g2; `frames[n]` each g2; `frames[i]+=g2<<16` | identical | ✅ |
| 2 | `loops` | `g2` | `g2` | ✅ |
| 3 | `walkmerge` | `n=g1`; `[n]` each g1; `[n]=9999999` | identical | ✅ |
| 4 | `reachforward` | `=true` | `=true` | ✅ |
| 5 | `priority` | `g1` | `g1` | ✅ |
| 6 | `replaceheldleft` | `g2` | `g2` | ✅ |
| 7 | `replaceheldright` | `g2` | `g2` | ✅ |
| 8 | `maxloops` | `g1` | `g1` | ✅ |
| 9 | `preanim_move` | `g1` | `g1` | ✅ |
| 10 | `postanim_move` | `g1` | `g1` | ✅ |
| 11 | `duplicatebehaviour` | `g1` | `g1` | ✅ |
| 12 | `iframes` | `n=g1`; `[n]` each g2; `[i]+=g2<<16` | identical | ✅ |
| 13 | `sound` | **`n=g1`; then `n × g3`** (one 24-bit packed int / frame, flat `int[]`) | **`n=g2`; per-frame `len=g1`; if len>0 `[g3, then (len-1)×g2]`** (nested `(Int32Array\|null)[]`) | ❌ **DIFF** |
| 14 | `field1993` | **absent** (unknown opcode → 464 desyncs) | `=true` | ❌ (LC500-only) |

Constructor defaults match on both sides (loops=-1, priority=5, maxloops=99,
replaceheld{left,right}=-1, preanim/postanim=-1, duplicatebehaviour=2).

### The opcode-13 divergence (the real bug)

- **464 / 465 cache format:** `count = g1`, then `count` × `g3` — a **flat** array where
  `sound[frame]` is a single packed 24-bit int, `0` meaning "no sound this frame"
  (`Class4_Sub20_Sub17.method622` line 546-551, `anIntArray3199[]`).
- **LC500 format:** `count = g2`, then per frame `len = g1`, and if `len>0` a sub-array of
  `[g3, g2, g2, …]` (primary id + `len-1` random variants) — the newer nested sound format
  (`SeqType.ts:139-152`).
- **Unpack semantics are the SAME on both clients**, only the container differs: the packed int
  decodes as `soundId = v>>8`, `loops = (v>>4)&7`, `location = v&0xf`
  (464 `Class24.java:288-291` `v>>8`; LC500 `Client.ts:2532-2535` `var5>>8`, `(var5>>4)&7`,
  `var5&0xf`). So LC500's *consumer* is already correct — it just needs `sound[frame]` populated
  from a flat g3 read.

**Concrete opcode-13 fix (consumer-compatible, minimal diff)** — replace `SeqType.ts:139-152`:

```ts
} else if (code === 13) {
    const count = dat.g1();                    // 464: g1 count (was g2)
    this.sound = new Array(count).fill(null);
    for (let i = 0; i < count; i++) {
        const packed = dat.g3();               // 464: one 24-bit packed int per frame
        if (packed !== 0) {                    // 464 guard: value 0 = no sound (Class24.java:289)
            this.sound[i] = Int32Array.of(packed);   // wrap so Client.ts:2532 sound[f][0] still works
        }
    }
}
```

This keeps the existing `sound: (Int32Array|null)[]` field type and the `triggerSeqSound`
consumer unchanged (each frame gets a length-1 variant array; the random-variant branch simply
never fires, which is correct — the 464 format has no per-frame variants).

### Opcode 14

No served seq uses it (verified: 0 / 6953). LC500's `code === 14 → field1993 = true` handler is
therefore **dead** for this cache. It is harmless (never reached), so it can be left as-is; the
464 format simply has no such field. (`field1993` gates a transparency/blend path in
`animateModel`; with the 465 cache it stays `false`, matching the 464 client which lacks the
field entirely.)

### Live proof (`scratchpad/seq-decode-test.ts`)

Unpacked all 6953 entries of `2:12` and ran both decoders:

```
childCount=6953 empty=0 nonEmpty=6953
464-rules   clean=6953  fail=0
LC500-rules clean=6830  fail=123      ← the 123 failures are exactly the seqs with opcode 13
seqs with opcode13 (464 clean-decode)=123
seqs with opcode14 (LC500 clean-decode)=0
```

Every served seq is valid 464-format; the current LC500 decoder desyncs on precisely the 123
sound-bearing seqs (first ids 80-84, 618-622, …) because it reads a g2 count where the cache
wrote a g1 count. After the opcode-13 fix, LC500 matches 6953/6953.

---

**Verification method:** read the 464 Java classes (`WallObject.method1093/method746`,
`Class4_Sub20_Sub17.method620/method622`, `StreamBuffer.get/method209/method248/method219`,
`Class24.java` sound consumer), read `SeqType.ts` / `Js5.ts` / `Client.ts` (fetch + consumer),
read `js5-update-server.ts` constants + remap + `applyConfigOverlays`, and ran two live probes
against the running update-server: `2:12` group fetch + ref-table parse (addressing) and a
full 6953-entry dual-decoder pass (format).
