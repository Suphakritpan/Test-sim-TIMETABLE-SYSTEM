# Development Journey — Ingest → Engine

Status: **BUILD ORDER** (stage-by-stage journey; not a record of completed work)
Date: 2026-11-05
Owner level: same as [`draftplan.md`](draftplan.md) — read the overview there, the *why* in
[`ingest-draft.md`](ingest-draft.md) and [`engine-draft.md`](engine-draft.md),
and the *order of work and gates* here.

This file does not replace the two subplans. It sequences them into one continuous journey:
every step states what goes in, what comes out, how the step is proven finished, what usually
breaks, and its current status in this repository.

Status legend: **DONE** (exists and verified) · **PARTIAL** (artifact exists, incomplete) ·
**PLANNED** (not started) · **BLOCKED** (needs an owner decision first).

---

## 0. Where we are on the path

| Stage | Step range | Status | Evidence in repo |
|---|---|---|---|
| J0 Prerequisites | J0.1–J0.3 | DONE | `package.json` pins `engines.node >=22.12.0` + `xlsx@0.18.5`, lockfile committed, ES modules, `npm ci` clean |
| Ingest | J1.1–J1.9 | DONE | `src/ingest/` (7 modules, `schema.mjs` … `cli.mjs`), 11 tests, `npm run ingest` writes `output/canonical.json` + `output/import-report.md` |
| Ingest acceptance | J1.10 | PARTIAL | counts, rule coverage, provenance and byte-determinism verified by tests; owner questions Q1–Q8 still unanswered |
| Engine | J2.1–J2.8 | PARTIAL | local model, explicit assignment gate, deterministic solver, CLI, validator handoff; source run blocked by unresolved inputs |
| Engine acceptance | J2.9 | PLANNED | score/evidence bridge and source-data acceptance remain |
| Handoff to Output | J3.1 | PARTIAL | interactive React/Vite workflow shell; no API, ingest service, or generated outputs |

Existing components the journey plugs into, not yet wired:

- `../conflict tools/validate.mjs` + `cli.mjs` — independent H1–H20 validator, 24 tests, schema v1
  documented in `../conflict tools/README.md`. This is the **certifier**, not the solver.
- `rating tools/rubric.csv` (33 items / 100) and `rubric_techstack.csv` (16 items / 100) with
  `score.mjs` / `check_techstack.mjs` — the **scorers**. Engine must call them, never re-implement them.
- `src/` — interactive React/Vite Ingest → Engine → Review prototype. File selections and
  readiness diagnostics work locally; parsing, API calls, and schedule generation are not wired.

---

## 1. The journey at a glance

```text
 J0  prerequisites        manifest, Node LTS pin, ES modules
      │
 J1  INGEST               PDF text ──► rule records ┐
      │                   XLSX rows ──► entities    ├──► canonical JSON package + import report
      │                   (schema first, then parsers)
      ▼
 J2  ENGINE               canonical JSON ──► engine model ──► solver ──► candidate
      │                                              │
      │                                              └──► independent validator (0 hard violations)
      ▼
 J3  OUTPUT               clean timetable ──► exports / API / mock / website
      │
      └──► rating tools: criteria score (schedule-derived) + tech-stack report (repo-derived)
```

The rule that governs the whole path: **each stage may only trust what the previous stage
proved.** Engine trusts a schema-versioned, validated package — not raw PDF text. Output trusts
a candidate that the independent validator certified — not the solver's own claim.

---

## 2. J0 — Prerequisites (before any ingest code)

### J0.1 — Repository skeleton and manifest

- **In:** shared stack decision in `../README.md`.
- **Work:** create `package.json` (`"type": "module"`, `engines.node` pinned to the supported LTS,
  scripts per module), commit the lockfile, choose the XLSX dependency (e.g. `xlsx`/`exceljs`)
  and pin it. Choose the validator library now (e.g. `zod`) — it is used at every boundary.
- **Out:** manifest + lockfile + lockfile-driven install.
- **Gate:** `npm ci` clean on a fresh clone; rating tools TT1 and TT14 flip from ABSENT to PASS.
- **Breaks when:** the ESM/`require` mix is ignored; `pdftotext` gets vendored as an npm package
  to avoid the system dependency; a second runtime (Python, a native OR-Tools service) sneaks in.
- **Status:** DONE — `package.json` pins `engines.node >=22.12.0` and `xlsx@0.18.5`, the
  lockfile is committed, `npm ci --dry-run` resolves cleanly, and `npm run ingest|test` work.
  TT1/TT14 pass; Express (TT4) is still the open blocker.

### J0.2 — Owner decisions register

- **In:** the eight open questions in `draftplan.md` §10.
- **Work:** record each as `{id, question, owner, answer, date}` in the package's
  `unresolvedQuestions`; mark which ones block which stage. Three of them decide whether the
  engine can finish at all: printed totals 50/48 vs derived 36/34, teacher↔subject assignment,
  and the three-level Thu 6–7 activity clash.
- **Out:** a questions file that survives re-import.
- **Gate:** every blocking question either answered or explicitly carried as a documented risk.
- **Breaks when:** a question is "answered" inside code by picking a convenient value.
- **Status:** BLOCKED — needs the project owner/department.

### J0.3 — Contract freeze for schema v1

- **In:** entity model in `draftplan.md` §3 and validator schema v1 in `../conflict tools/README.md`.
- **Work:** decide which shape wins where they differ, or write the adapter boundary explicitly.
  Two JSON shapes for a "session" is the most likely defect to poison the whole journey.
- **Out:** one canonical `schemaVersion` and a documented mapping to the validator's input.
- **Gate:** a sample package validates and a sample schedule validates against it.
- **Status:** PARTIAL — schema v1 lives in `src/ingest/schema.mjs` (enums, Thai parsers, role
  bands) with validator-compatible rule IDs. The adapter from this package to the validator's
  session shape is still missing (J2.7).

---

## 3. J1 — Ingest: sources to canonical JSON

Goal: reproducible, traceable, validated JSON. Ingest **never** schedules and **never**
resolves a disputed value.

**Implemented** in `src/ingest/` — schema, readers, mappers, boundary validation, writer and CLI,
with 11 tests in `src/ingest/ingest.test.mjs`. Run it with `npm run ingest`.

### J1.1 — Source inventory and provenance registry

- **In:** `start folder/data.xlsx`, `start folder/guideline.pdf` (referenced historically as
  `guildlines.pdf`), `criteria.pdf`.
- **Work:** enumerate what exists before parsing it: four workbook sheets (`ปวช.1`, `ปวช.2`,
  `ปวช.3`, `ครู`), repeated header rows, a section marker row per block, and the two printed
  totals. Record `{file, sheet, row}` for each record and `{file, section, item}` for each rule.
- **Out:** `sources[]` with sha256 per file, plus `sourceRef` on every entity.
- **Expected counts, asserted:** 33 subjects (12 / 11 / 10), 6 groups, 5 teachers, 6 rooms.
- **Breaks when:** merged title rows are read as data; the second header row is counted as a
  subject; the totals cell (`50`, `48`) becomes a course.
- **Status:** DONE — `map-sources.mjs` stamps `sourceRef {file, sheet, row}` and `originalValues`
  on every subject; the CLI's `expectedCounts` makes any drift a blocking error, and the tests
  assert the counts.

### J1.2 — PDF text extraction (`pdftotext -layout`)

- **In:** guideline PDF.
- **Work:** shell out with an argument array (never string interpolation), write the `.txt`
  intermediate into the output directory, treat empty or garbled text as blocking.
- **Out:** `output/guideline.txt` + extraction diagnostics.
- **Gate:** the 19 scheduling rules and 2 system rules are visible with item numbers; a missing
  binary, unreadable PDF, or empty extraction fails loudly.
- **Breaks when:** extraction "succeeds" with mojibake and the rule mapper finds nothing; or the
  text is parsed by line-position regexes instead of a reviewed mapping.
- **Status:** DONE — `pdf-text.mjs` runs `pdftotext -layout`, exits with code 3 and an install hint
  when the binary is absent, rejects empty text, and requires 11 anchor phrases from the reviewed
  mapping to appear. `--guideline-text <txt>` covers machines without poppler. Verified on this
  machine: 37 lines, 21 numbered items, all anchors found.

### J1.3 — Guideline rules become structured constraint records (H1–H20)

- **In:** extracted text + the reviewed catalogue in `draftplan.md` §4.
- **Work:** one record per rule: `{id, text, parameters, severity, citation}`. The reviewed
  catalogue is the source of truth; the PDF text is the citation.
- **Out:** 20 hard rules (H1–H20, validator-compatible IDs) + system rules S1/S2.
- **Gate:** ingest fails if a required rule ID is missing.
- **Breaks when:** parameters stay in prose (e.g. H3 without `allowedPeriods:[4,5,6]`, H5 without a
  `kind → attendance` map). Parameters must be data — engine and validator both read them.
- **Status:** DONE — `buildConstraints()` emits all 22 records with parameters and
  `citation {file, section, item}`. Page numbers are not recoverable from the text layer, so
  citations name the guideline section and item instead.

### J1.4 — XLSX raw read (no interpretation)

- **In:** workbook.
- **Work:** read sheets to raw row arrays with 1-based row numbers; keep header and section rows.
- **Out:** `rawRows[]` with `{sheet, rowIndex, raw}`.
- **Gate:** row numbers match what a human sees in Excel; each subject maps back to a sheet+row.
- **Breaks when:** repeated header rows are deduplicated away and the general/department boundary
  is lost — that boundary decides H11 (general subjects excluded from teacher loads).
- **Status:** DONE — `read-workbook.mjs` uses `sheet_to_json({header:1, defval:"", blankrows:true})`
  and preserves blank/section rows so the section markers survive.

### J1.5 — Canonical schema module (before parsers)

- **In:** the validator's schema v1 (`../conflict tools/README.md`).
- **Work:** one versioned module for enums, role bands, room-class permits, and the Thai parsers.
- **Out:** `src/ingest/schema.mjs` (+ a representative fixture produced by the first run).
- **Gate:** the package validates against it; TT10 passes in the stack scan.
- **Breaks when:** the schema is written after the parsers and quietly encodes workbook quirks
  instead of the domain.
- **Status:** DONE — `schema.mjs` exports `schemaVersion`, enums, `roleBands`, `roomClassPermits`
  and `normalizeCode` / `parseDayPeriod` / `classifyKind` / `classifyRoom` / `parseGroupTitle`.

### J1.6 — Mapping and normalization (only unambiguous changes)

- **In:** raw rows + rule records.
- **Work:** map to entities; normalize whitespace, code spacing, weekday spelling; keep originals.
- **Do not:** renumber the swapped general-subject rooms (ปวช.2/3), settle the 50/48 question, or
  invent teacher→subject links.
- **Out:** entities with `sourceRef` and `originalValues`.
- **Gate:** re-running the mapper is idempotent; changed values are enumerated in the report.
- **Breaks when:** "cleanup" silently changes a pin (`อังคารคาบที่ 6-7` read as one 2-period block
  vs two separate periods).
- **Status:** DONE — `21909 - 1001` → `21909-1001` and `พฤหัส` → Thu are normalized with the
  original preserved; both changes appear in `normalizations[]`. Room-label swaps are reported as
  `W_ROOM_LABEL_SWAP` (3 findings today), never corrected.

### J1.7 — Boundary validation and diagnostics

- **In:** mapped entities.
- **Work:** validate shape, types, ranges, references, duplicates, pin legality, availability,
  rule coverage and expected counts; emit `{code, severity, message, sourceRef}`.
- **Out:** `errors[]` (blocking) and `warnings[]`, sorted for stable output.
- **Gate:** each corrupted fixture produces its own code; a clean source produces zero blocking
  errors.
- **Breaks when:** warnings are promoted or demoted by convenience, or one record is reported
  twice under two codes.
- **Status:** DONE — `validate-input.mjs` blocks on E1–E19 (schema version, arrays, ids, enums,
  periods, level/group refs, pin ranges per level, same-level pin collisions, rule coverage,
  count mismatch) and warns on label swaps, printed-total mismatch, pin width and band drift.

### J1.8 — Deterministic output artifacts

- **In:** validated entities.
- **Work:** write `canonical.json` (sorted keys, no timestamps, no absolute paths) and
  `import-report.md` (sources+hashes, counts, per-level totals, pins, teachers, normalizations,
  blockers, warnings, guideline checks, open questions).
- **Out:** `output/canonical.json`, `output/import-report.md`.
- **Gate:** two runs on unchanged input are byte-identical.
- **Breaks when:** `Date.now()` or map iteration order leaks into the artifact.
- **Status:** DONE — a test runs ingest twice into different directories and compares both files
  byte-for-byte, including a check that the output path does not appear in the JSON.

### J1.9 — Local CLI and reusable core

- **In:** J1.1–J1.8 modules.
- **Work:** `cli.mjs` for `--pdf --xlsx --out [--overrides] [--guideline-text] [--json]
  [--no-strict-counts]`, plus `index.mjs` exporting the same `ingest()` function.
- **Out:** documented command, exit codes (0 clean, 1 blocking, 2 usage, 3 missing poppler).
- **Gate:** runs with no server, browser, network or database.
- **Breaks when:** logic lives inside the CLI (then an API and the tests duplicate it).
- **Status:** DONE — the core is `ingest(options)`; the CLI is a thin wrapper with a proper
  ESM main check. The Express route around it is still missing, which is what keeps TT4 open.

### J1.10 — Ingest acceptance gate

Ingest is finished only when all of this is printed by the tool itself, not asserted in prose:

- [x] 33 subject rows, 6 groups, 5 teachers, 6 rooms — blocking `E19` on any mismatch.
- [x] H1–H20 + S1/S2 present as records with guideline section + item citations (no page numbers
      are available from the text layer).
- [x] every entity carries a resolvable `sourceRef` (sheet + row).
- [x] open questions Q1–Q8 appear in `unresolvedQuestions` and in the import report.
- [~] corrupted input fails with actionable diagnostics: a missing workbook and unparseable pins
      are covered; a deliberately corrupted *workbook* fixture is not in the suite yet.
- [x] two runs are byte-identical.

**Status:** PARTIAL — the mechanical gate passes (`npm run ingest` is clean, deterministic, and
reports 33/6/5/6), but the counts cannot be called authoritative while Q1 (printed 50/48 vs rows
36/34) and Q2 (teacher↔subject links) are unanswered by the owner.

## 4. J2 — Engine: canonical JSON to a certified schedule

Goal: a timetable that is *clean by independent proof*, not by the solver's opinion.

### J2.1 — Preflight

- **In:** canonical package.
- **Work:** verify `schemaVersion` is supported, required arrays exist, refuse to run on an
  unresolved blocking question that affects the run (e.g. unknown teacher assignment strategy).
- **Out:** run summary `{counts, unresolved, seed, config}` + refusal with reason if not runnable.
- **Gate:** wrong schema version and missing teacher data each produce a specific refusal, not a
  half-built schedule.
- **Breaks when:** the engine "helpfully" defaults a missing teacher instead of refusing.
- **Status:** PARTIAL — `src/engine/model.mjs` validates the schema version and required arrays and blocks absent subject→teacher mappings as Q2; unresolved owner decisions are not inferred.

### J2.2 — Categorize into the engine model

- **In:** package.
- **Work:** build the eight categories from `engine-draft.md` §Data categorization:
  calendar (Mon–Fri, periods/day, per-level max), cohorts, subjects, fixed constraints, teachers,
  rooms, guideline rules, open questions. Carry `sourceRef` on every node.
- **Out:** an in-memory model + a printed category census (counts per category, unmatched records
  listed explicitly rather than dropped).
- **Gate:** sum of categorized records equals the package's counts; zero silently dropped.
- **Breaks when:** subject `kind`/`category`/`roomClass` triples are collapsed, so H5/H11/H8 lose
  the data they need later.
- **Status:** PARTIAL — `buildEngineModel()` carries source references, rules and open questions, but does not yet emit a full category census or account for every canonical field.

### J2.3 — Expand attendance units (session blocks)

- **In:** subjects + cohorts.
- **Work:** theory/activity → **one** block shared by the level's groups; practical → **one block
  per group**. Duration = subject `periods`, always contiguous (H10).
- **Out:** required-block list with durations: per level, ปวช.1 6 theory + 12 practical, ปวช.2 4 + 14,
  ปวช.3 5 + 10 (verified counts).
- **Gate:** total blocks × duration reconciles with the package's period totals and with
  `draftplan.md` §5.
- **Breaks when:** practical subjects are expanded once (under-counts rooms and teacher hours) or
  twice for theory (creates phantom clashes).
- **Status:** PARTIAL — theory/activity merge and per-group practical blocks are implemented and tested; period reconciliation against disputed Q1 totals remains open.

### J2.4 — Build domains (legal placements per block)

- **In:** blocks + fixed constraints + availability.
- **Work:** for each block enumerate legal `(day, startPeriod, room)` triples after applying:
  level max period (ปวช.1 ≤ 9, others ≤ 11), pins, Thu 6–7 activity window, lunch window {4,5,6}
  per level per day, teacher unavailability (ครู A free Wed 1–4), room class rules, and no
  straddling lunch.
- **Out:** domains per block, with the pruning reason recorded for empty domains.
- **Gate:** every block has ≥ 1 candidate before search starts; an empty domain is reported as a
  data problem, not a search failure.
- **Breaks when:** lunch is treated as "any free period" instead of a decision variable, which is
  exactly what makes ปวช.1 tight: six 4-hour blocks, 36 periods against 40 slots, and **no usable
  4-hour window on Tuesday** (Mon 1–4 and Tue 1–4/6–7 are pinned).
- **Status:** PARTIAL — weekday/start/room domains apply level limits, pins, activity window, resource availability and room classes; lunch is selected after placement rather than searched as a domain variable.

### J2.5 — Resource assignment (teacher, room)

- **In:** domains + teacher bands + room inventory.
- **Work:** assign teachers/rooms where the data allows. Bands: head of dept and head of work
  24–28 h, regular 30–38 h, total department load 153 h against a 138–170 h band. `COM_OR_LAB`
  prefers COM. If the workbook names no teacher, expose the assignment as an explicit engine
  decision with its rationale in the report.
- **Out:** assignment map + load table per teacher.
- **Gate:** all five teachers inside their bands; no assignment without a stated basis.
- **Breaks when:** the 153 h is spread evenly and lands two teachers outside their band (the band
  is not symmetric: 56 h is capped at 28 each, leaving 97 h across three regular teachers ≈ 32.3 h).
- **Status:** PARTIAL — teacher assignments must be explicit, and compatible rooms are selected deterministically; the engine does not infer assignments or balance teacher load.

### J2.6 — Placement search

- **In:** domains + assignments.
- **Work:** deterministic CSP: most-constrained block first (5-hour game course, then 4-hour
  practicals, then pinned theory), forward checking, documented tie-breaks, fixed seed. Optimise
  soft preferences only after hard constraints hold: compact days, balanced load, room preference.
  Pure JavaScript — no native CP-SAT dependency (see open item in `draftplan.md` §6).
- **Out:** candidate schedule + cost trace (iterations, cost components, seed).
- **Gate:** same input + seed ⇒ identical schedule; cost trace kept for the demo evidence.
- **Breaks when:** backlog ordering ignores that ปวช.1 is the tight level (solve it first); or the
  search returns the first feasible-and-ugly schedule with idle gaps that break H11/H18-style
  "no gaps" checks downstream.
- **Status:** PARTIAL — deterministic MRV depth-first placement and repeatability tests exist; soft-cost optimization, richer forward checking and source-scale feasibility remain.

### J2.7 — Independent validation handoff

- **In:** candidate schedule.
- **Work:** adapt the candidate to the validator's schema v1 and run `conflict tools/validate.mjs`
  (via `cli.mjs` or the module API). The engine does **not** decide validity.
- **Out:** validation report with per-rule results, affected entities/slots, and source refs.
- **Gate:** zero hard violations before the word "clean" is allowed anywhere — including the UI.
- **Breaks when:** the adapter changes rule meaning (e.g. treating merged theory sessions as two
  groups' sessions) or the engine re-implements a check instead of calling the validator. Existing
  tests in `conflict tools/validate.test.mjs` (24 passing) are the contract to keep green.
- **Status:** PARTIAL — candidates are sent through `conflict tools/validate.mjs`; accepted candidates carry the independent report and source references. End-to-end source acceptance remains blocked by owner inputs.

### J2.8 — Failure path (unschedulable)

- **In:** exhausted search or empty domain.
- **Work:** return `{status:"unschedulable", conflicts[], unresolvedInputs[]}` naming the rule IDs,
  the blocks, and the source refs. Do not claim a minimal conflict set without a method that proves it.
- **Out:** actionable failure report.
- **Gate:** a deliberately over-constrained fixture (e.g. two pins colliding) yields a named rule,
  not a crash or an empty timetable.
- **Status:** PARTIAL — returns `unschedulable` or `search-limit`, and names direct resource blockers such as H13; broader failure fixtures and source-scale diagnostics remain.

### J2.9 — Engine acceptance gate and rating bridge

- **In:** clean candidate + validation report.
- **Work:** produce the three outputs defined in `engine-draft.md`:
  1. **Clean timetable** — schedule JSON + per-group, per-teacher, per-room views.
  2. **Rating score** — run `rating tools/score.mjs` on the criteria rubric with evidence; attach
     the tech-stack report (`check_techstack.mjs`) with its timestamp, clearly labelled as a
     repository measurement, not a result of this run.
  3. **Rating analysis** — item-level evidence, passed/partial/unscored status, gaps, next actions.
- **Gate:** every timetable-derived criterion point has an evidence reference; unscored items are
  shown as unscored, never as zero-by-default or as full marks.
- **Breaks when:** the frontend recomputes scores, or a stale stack report is presented as the
  current run's result. Both are explicitly forbidden by the engine plan.
- **Status:** PARTIAL — scorers and reports exist; evidence assembly does not.

---

## 5. J3 — Handoff to Output (where the journey ends)

- **J3.1 — Output stage:** exports (CSV/XLSX/PDF), Express routes around the same modules,
  BeggarDev's mock with identical shapes, and React/Vite views including the Review Process page.
- **In:** clean timetable + score + analysis from J2.9.
- **Gate:** the exported views reconcile with the master schedule; the browser calculates nothing.
- **Status:** PARTIAL — an interactive React/Vite workflow shell, local ingest core, and first
  local scheduler slice exist. UI/API integration, source-data schedule acceptance, timetable
  views, exports, rating bridge, and mock parity remain; the full timetable-output subplan
  is not yet written.

---

## 6. Step dependencies

```text
J0.1 ──► J0.3 ──► J1.5 ──► J1.6 ──► J1.7 ──► J1.8 ──► J1.9 ──► J1.10
J0.2 ─────────────────────► (blocks J1.6 totals, J2.1, J2.5)
J1.1 ──► J1.2 ──► J1.3 ─┐
J1.1 ──► J1.4 ──────────┴──► J1.6
J1.10 ──► J2.1 ──► J2.2 ──► J2.3 ──► J2.4 ──► J2.5 ──► J2.6 ──► J2.7 ──► J2.9 ──► J3.1
                                                    └──► J2.8 (failure branch)
```

Critical path: **J0.1 → J1.5 → J1.6 → J1.8 → J1.10 → J2.4 → J2.6 → J2.7 → J2.9**.
The manifest is now partially in place; the next useful unblocks are the J0.2 owner decisions
and J0.3 contract freeze, followed by the J1 ingest implementation.

---

## 7. Non-negotiables carried through every step

1. **Provenance survives.** Any value in any artifact can be traced to a sheet+row or page.
2. **No invented facts.** Missing teacher links, disputed totals, and swapped room labels stay
   open questions — visible in the report, never defaulted silently.
3. **Determinism.** Same input + same config ⇒ same package, same schedule, same report ordering.
4. **Independent certification.** The solver never certifies itself; the validator never schedules.
5. **Scores are computed once, in one place.** `rating tools/` owns the formulas; engine and
   frontend pass data to them.
6. **Local-first.** Every step up to J3.1 must run on a developer machine with no server, no
   browser, and no database.
7. **Stack fidelity.** Plain JavaScript ES modules on pinned Node LTS; no TypeScript, no second
   runtime (this is what kills the OR-Tools CP-SAT idea in `draftplan.md` §6 — replace it with a
   pure-JS fallback).

---

## 8. Failure modes seen in this project's own data

| Symptom | Where it bites | Cause to guard against |
|---|---|---|
| Printed totals `50`/`48` vs derived `36`/`34` | J1.1, J1.6, J1.10 | totals row counted as a course, or believed over the rows |
| Teacher→subject links missing | J2.5 | engine fabricating an assignment to finish the run |
| Three levels pinned to Thu 6–7 in `แผนกวิชา` | J2.4 | one room assumed available to three levels at once |
| ปวช.1 ends at period 9 with six 4-hour blocks | J2.4, J2.6 | lunch placed where it destroys the only 4-hour window |
| `COM_OR_LAB` subjects | J2.5, J2.7 | engine and validator disagreeing on allowed room types |
| General rooms reusable, dept rooms not | J2.4 | double-booking a dept room because "it is just a practice room" |
| Workbook quirks (`21909 - 1001`, `พฤหัส`) | J1.6 | normalizing pins by accident while normalizing codes |

---

## 9. Definition of journey complete (ingest → certified schedule)

- [x] Fresh clone: `npm ci` succeeds with no global installs.
- [x] One command turns the PDF + XLSX into a byte-identical canonical package twice.
- [x] Package passes boundary validation and reports every open question (Q1–Q8).
- [ ] Engine produces a schedule for all three levels with all 33 subjects and correct period counts.
- [ ] Teacher loads inside 24–28 / 30–38, printed per teacher.
- [ ] Independent validator reports 0 hard violations; a broken-rule fixture is caught.
- [ ] Unschedulable fixture yields a named blocking rule.
- [ ] Criteria scores cite evidence per item; tech-stack report is timestamped and labelled separately.
- [ ] Every change recorded in `log.md` with the responsible agent's name.
