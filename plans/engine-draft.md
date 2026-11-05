# Engine Draft — Process Plan

This is the detailed Process plan for the [timetable scheduler draft plan](draftplan.md). It starts after Ingest has turned the user-uploaded PDF guideline(s) and XLSX workbook into validated canonical JSON. Keep this plan separate in this folder, as required by the README planning convention.

## Purpose and flow

The Engine is where scheduling starts. It reads the Ingest JSON, organizes input data and guideline constraints into the scheduling model, creates and independently validates candidate timetables, then passes the completed schedule and its evidence to the rating tools.

```text
User uploads PDF + XLSX
        ↓
Ingest extracts/normalizes/validates → canonical JSON
        ↓
Engine reads JSON → categorizes data and constraints → solves schedule
        ↓
Independent schedule validation → rating/evidence review
        ↓
1. Clean timetable   2. Rating score   3. Rating analysis
```

## Engine responsibilities

The Engine must:

1. Read only a supported, schema-versioned Ingest JSON package; reject malformed or unsupported input with source-aware errors.
2. Categorize imported data into the timetable model and translate guideline rules into explicit constraints.
3. Assign teachers and rooms where those assignments are not supplied, subject to the known data and documented owner decisions.
4. Place contiguous class blocks into the Monday–Friday schedule while satisfying hard constraints.
5. Validate the completed candidate with the independent validator before calling it clean or exporting it.
6. Build rating evidence from the finished schedule and validation output, invoke the rating tools, and produce the score and analysis data for the Review Process page.

The Engine must not guess unresolved source values or weaken a hard guideline to force a schedule. If no valid schedule can be made, return an unschedulable result with implicated rules and source references; do not publish it as clean.

## Data categorization

After reading JSON, map records into these engine categories:

| Category | Examples | Scheduling use |
|---|---|---|
| Calendar | Monday–Friday, periods per day, level-specific latest period | Defines the available grid and each level's bounds. |
| Cohorts | Levels and student groups | Detects group clashes; identifies merged theory/activity and split practical attendance. |
| Subjects | Periods per week, theory/practical/activity, general/department category, room class | Creates required session blocks and resource needs. |
| Fixed constraints | Day/period pins, activity windows, lunch rules | Restricts valid days and start periods. |
| Teachers | Role, max load, availability, supplied subject links if any | Assignment and no-double-booking/load checks. |
| Rooms | Room ID/name, type, availability | Room assignment and no-double-booking checks. |
| Guideline rules | H1–H20, stable ID, rule parameters, source PDF/page | Hard constraints and validation evidence. |
| Open questions | Unconfirmed totals, room-label conflicts, missing assignments/metadata | Blocks affected decisions or appears as a warning; never silently converted into facts. |

Preserve source references from the Ingest JSON through assignments, validation findings, and rating evidence. Reuse the schedule/session shape and rule IDs documented in `../conflict tools/README.md`; add a versioned adapter if the Ingest JSON shape differs. Do not duplicate or subtly alter the independent validator's rule meanings.

## Scheduling process

Implement the engine in plain JavaScript ES modules using reusable modules. The solver must also run locally without Express, a browser, remote services, or a database.

1. **Preflight:** validate schema version and required data; summarize counts and unresolved questions. Stop with a clear diagnostic if essential inputs are missing.
2. **Expand sessions:** derive required attendance units from subject kind: theory/activity are merged for the level's groups; practical subjects require a separate block for each group. Preserve the required duration as one contiguous block.
3. **Build domains:** enumerate legal placements from weekday/period limits, fixed pins, lunch choices, room classes, teacher/room availability, and known hard constraints.
4. **Assign resources:** assign teachers and rooms only when the input or owner decisions allow it. Honor role load bands and max loads; if the workbook does not identify a teacher for a subject, expose that assignment as an engine decision/input and explain it in the report.
5. **Place blocks:** use a deterministic constraint solver (most-constrained block first, forward checking, and documented tie-breaking). Optimize soft preferences only after hard constraints are respected: compact group days, balanced load, and room preferences. A fixed seed/configuration should reproduce the same result.
6. **Validate independently:** run the candidate through the independent H1–H20 validator. A candidate with any hard violation is not clean. Include rule IDs, affected entities/slots, and source provenance in the validation report.
7. **Handle failure:** if search cannot find a valid timetable, return `unschedulable` with direct conflicts and unresolved inputs that may explain them. Do not claim a mathematically minimal conflict set unless a separate method proves it.
8. **Review and score:** only after a schedule result exists, assemble evidence for the criteria rubric and run the rating tools. Use the same rating-tool scorer and rubric definitions; do not recreate the scoring formula in the engine or frontend.

## Rating tools integration

The rating tools contain two distinct rubrics: the competition criteria (`rating tools/rubric.csv`) and the project tech-stack rubric (`rating tools/rubric_techstack.csv`). Treat their scopes separately:

- The competition criteria rubric includes timetable requirements and broader system/demo criteria. The Engine can produce evidence and candidate marks only for items supported by its schedule and validator output. Website, export, presentation, and other system criteria need their own evidence; a valid timetable alone cannot establish that the entire rubric passed.
- The tech-stack rubric assesses the repository/application, not an individual timetable run. Refresh or retrieve its latest report separately, and show its timestamp/status so a stale repository score is not presented as the result of the current schedule run.
- For either rubric, never award full marks without evidence. Represent missing evidence and unscored items explicitly. Keep owner/agent responsibility labels when provided.

Produce a machine-readable review result that includes rubric ID, item, section, score, maximum, evidence references, status, gaps, and suggested next action. Preserve the rating tools' totals and item IDs; the frontend displays their results and must not calculate new scores.

## Three outputs

### 1. Clean timetable

Return the completed timetable in the shared schedule JSON contract, plus readable timetable views for each group, teacher, and room. Mark it **Clean / guideline-valid** only when the independent validator reports zero hard violations. Include the validation summary and evidence mapping for every timetable-related rating criterion. The rating instruments include non-timetable work, so this label must not imply the whole system earned full marks.

### 2. Rating score — Review Process page

Show overall and per-section totals, percentage, and item-level score/max for the competition and tech-stack rubrics. Show each rubric's status and timestamp, including unscored items; label repository-level tech-stack results separately from schedule-run results.

### 3. Rating analysis — Review Process page

Show item-level evidence and source links, passed/partial/unscored status, schedule conflicts or source warnings, missing evidence, and concrete next actions grouped by project responsibility area/owner. Keep this analysis distinct from the numeric score so users can see why an item received its mark and what remains.

Outputs 2 and 3 appear on the same separate **Review Process** page, as score and analysis panels/tabs. The clean timetable remains its own schedule result/view.

The complete page layout, four charts, switchable matrices, data contract, and acceptance criteria are in [`review-page-requirement.md`](review-page-requirement.md).

## Shared stack and API expectations

- Plain JavaScript ES modules on the pinned Node.js LTS; no TypeScript or second backend runtime.
- Express owns the web/API entry point, while scheduling, validation adapters, and rating integration remain reusable modules callable locally.
- Persist JSON-first behind the repository boundary; avoid making the solver depend on a database.
- Return stable JSON response shapes for schedule result, validation, rating score, and rating analysis. BeggarDev's mock backend must return the same shapes with deterministic fixtures.
- The React/Vite frontend consumes these API/mock responses and presents the Review Process page; it does not implement scheduling or rating calculations.

## Completion criteria

- The engine consumes the Ingest JSON contract and categorizes all scheduling inputs and H1–H20 constraints with source traceability.
- A valid candidate satisfies every hard guideline rule in the independent validator; invalid candidates are never presented as clean.
- Results are deterministic for unchanged input/configuration, or clearly identify the seed/configuration used.
- Unsolvable cases return actionable conflicts and unresolved-input references.
- The post-schedule rating step uses the rating tools' rubrics and scorer, distinguishes schedule-specific from whole-system criteria, and never fabricates scores/evidence.
- The clean timetable, numeric rating score, and rating analysis are available as the three defined outputs; score and analysis are visible on the Review Process page.
- Local execution works independently from the web server, while Express and the mock backend expose the shared contracts.
