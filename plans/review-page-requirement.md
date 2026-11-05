# Review Process Page Requirements

This document defines the standalone frontend and data requirements for the **Review Process** page. It builds on the Input flow in [`ingest-draft.md`](ingest-draft.md) and the scheduling/validation flow in [`engine-draft.md`](engine-draft.md). Those plans define how review data is produced; this document defines how users inspect it.

## Purpose

Let a user select a processing run and understand:

- how long each step took from upload through final output;
- whether the timetable covers the required courses and periods;
- how scheduling conflicts changed during engine attempts and whether the final timetable passes validation;
- how the project scores against the rating rubrics and what evidence or work remains;
- how teachers, courses, groups, rooms, and time slots relate.

The page presents measurements and evidence. It must not calculate schedules, change rubric scores, or infer missing source data.

## Page layout

1. **Run selector and summary:** select a run; show run ID, input package/schema version, creation time, final state, and whether the result is clean, invalid, or unschedulable.
2. **Four comparison charts:** pipeline timing, schedule completeness, conflict trend, and rating scores.
3. **Switchable relationship matrix:** one matrix displayed at a time, selected by tabs or a dropdown.
4. **Rating analysis:** item evidence, warnings, gaps, and next actions, grouped by rubric section and project responsibility/owner where assigned.

Every chart, matrix, and analysis result must identify the selected run. Changing runs refreshes all components together.

## Required charts

### Pipeline timing

Show the ordered pipeline stages: upload, PDF extraction, XLSX import, normalization, input validation, engine categorization, resource assignment, schedule placement, independent validation, rating, and output. For each recorded stage, present duration, status, and relevant input/output record counts. Show total elapsed time and completed stages out of recorded stages. Failures and retries must be visible; do not count a retry as a successful first pass.

### Schedule completeness

Compare required instruction periods with scheduled instruction periods, overall and by course/group. Identify missing or over-scheduled periods. Compute required attendance units according to the guideline model: merged theory/activity attendance and split practical attendance. Show the source/run used for the required total.

### Conflict trend

Plot hard-constraint violation counts by rule ID across recorded solver attempts/checkpoints, ending with the independent validator result. Clearly mark the final validation status. When only a final validation exists, show that single result and label history as unavailable; do not invent a trend.

### Rating scores

Show totals, percentages, and section scores for:

- the competition criteria rubric from `rating tools/rubric.csv`;
- the repository tech-stack rubric from `rating tools/rubric_techstack.csv`.

Include score/max, rubric/item IDs, scored/unscored state, and report timestamp. Keep the repository-level tech-stack result visually separate from a schedule run's competition-criteria evidence. Show partial, missing, or stale scores honestly; never imply an unscored item passed.

## Switchable relationship matrix

Provide a selector for these matrix variants. Preserve the selected run and applicable filters when users switch variants.

| Variant | Rows × columns | Cell content |
|---|---|---|
| Teacher × Course | Teachers × courses | Assigned sessions and periods; selecting a cell reveals group(s), room, and day/period blocks. |
| Course × Room | Courses × rooms | Assigned sessions/periods and room requirement/compatibility. |
| Room × Day/Period | Rooms × day/period slots | Occupied, free, or conflicting status with the scheduled course/group/teacher. |

Support filtering by teacher, course, group, room, and validation rule. Clicking a cell should highlight the corresponding sessions in related views and evidence. Distinguish **unknown/unassigned** from a measured zero. Do not estimate room capacity where the source data provides none.

## Data contract requirements

The page consumes a stable JSON review result through the shared API/mock contract. At minimum, the selected run's payload must provide:

- run metadata and input schema/version references;
- ordered stage events with stage ID, status, start/end or duration, input/output counts, warnings/errors, and retry relationship when applicable;
- required and scheduled period counts by course and attendance group;
- conflict snapshots keyed by solver attempt/checkpoint and H-rule ID, plus final independent validator status/findings;
- rating rubric identity/scope, timestamp, overall and section totals, and item-level score/max/status/evidence/gaps/next action;
- session relations containing course ID, group IDs, teacher ID (nullable when unknown), room ID (nullable when unknown), day, start period, and block length;
- source references and responsibility/owner labels where known.

The Express API and BeggarDev's mock backend must return the same shapes. Mock data should be deterministic and include representative states: clean run, invalid/unschedulable run, partial or unscored rubric evidence, and unknown teacher/room assignments. The frontend should render API values and must not recalculate score totals or validation outcomes.

## Data interpretation rules

- **Clean timetable** means the independent validator reports zero hard guideline violations. It does not mean every project-wide rating item passed.
- **Efficiency** is shown as measured duration, completion, occupancy, and conflict counts; do not collapse those into an undocumented composite score.
- Schedule-related rubric evidence may be tied to the run. Website, export, presentation, and repository-stack criteria require their own evidence and may remain unscored.
- A tech-stack report is repository-scoped and may be older than the selected schedule run. Show its own timestamp and stale/current state.
- Missing teacher-course assignment or room metadata remains unknown until provided or explicitly assigned by the engine.

## Acceptance criteria

- A user can select a run and see its metadata and final validation state.
- All four charts show the selected run and their source values; pipeline steps and retries are ordered and timed accurately.
- Schedule completeness accounts for merged and split attendance according to the guidelines.
- Conflict history is shown only when recorded, and final validator status is explicit.
- Both rating instruments show their totals and item-level scored/unscored evidence without browser-side score recalculation.
- Users can switch all three matrix variants while retaining applicable filters and run selection.
- Selecting matrix cells/filters links the same teacher/course/group/room/session across the page.
- Unknown values are distinguishable from zero, stale ratings are labeled, and a valid schedule is not presented as proof of full project-rubric completion.
- API and mock responses conform to the same documented JSON shape.
