# Current Project Handoff

Last updated: **2026-11-05**. This is the current handoff for the next developer agent. Read the root [`README.md`](../README.md) for the project entry point and use this file as the current status summary. [`log.md`](log.md) retains the chronological history; older status statements there are historical, not current.

## Project goal

Build a timetable scheduler for local, mock, and website use. The flow is **PDF/XLSX input → validated canonical JSON → scheduling engine → independent validation → timetable, rating score, and rating analysis**. BeggarDev owns the mock backend.

## Current implementation status

| Area | Current status | Evidence / location |
|---|---|---|
| Shared runtime | Node.js ES modules, plain JavaScript, React/Vite dependencies and lockfile exist. | `package.json`, `package-lock.json` |
| Docker | Image and Compose services build; the container test service passes, and default Compose ingest writes canonical JSON/report using containerized `pdftotext`. | `Dockerfile`, `docker-compose.yml` |
| Ingest | Implemented as a reusable local CLI/core. It extracts guideline text with `pdftotext`, reads XLSX, maps/validates records, and writes canonical JSON plus an import report. | `src/ingest/`; `npm run ingest` |
| Ingest acceptance | Mechanically passes expected counts and deterministic output, but owner decisions remain open and a deliberately corrupted workbook fixture is not covered. Overall status is **PARTIAL**. | `development-journey.md` J1.10 |
| Conflict validator | Independent H1–H20 schedule validator and CLI exists. It validates a candidate; it does not generate one. | `conflict tools/` |
| Rating tools | JavaScript tools and two rubrics exist: competition criteria and tech-stack conformance. | `rating tools/` |
| Engine | First implementation slice exists: schema-v1 model/block expansion, required explicit teacher mapping, deterministic MRV placement, local CLI, and independent validator handoff. **Not accepted for source data:** Q2 teacher assignments are absent, Q3 has three simultaneous activities requiring one department room, and owner-dependent load/lunch decisions remain. | `src/engine/`; `npm test`; `engine-draft.md` |
| Frontend | React/Vite workflow prototype exists with local file-selection and readiness UI. It is not wired to ingest, an API, a scheduler, or live review data. | `src/App.jsx`, `src/styles.css` |
| Express/API and mock | Not implemented. BeggarDev owns the mock; its routes and fixtures must match the eventual API contract. | TT4 remains an open blocker |
| Schedule exports and Review Process page | Requirements are documented; live schedule exports, API-backed matrices/charts, and review data integration are not implemented. | `review-page-requirement.md` |
| Tech-stack score | Latest report: **67/100, NOT YET CONFORMANT**; TT4 (Express backend) is the unsatisfied blocker. TT6 and TT15 account for the local engine CLI and Docker/Compose workflows. | `rating tools/reports/techstack-report.md` |

The detailed, evidence-based work sequence is [`development-journey.md`](development-journey.md). Do not describe the Engine as complete just because its plan and independent validator exist.

## Important unresolved input questions

Resolve these with the project owner/department or preserve them as explicit warnings; do not silently guess:

1. Workbook printed totals 50/48 versus subject-row sums 36/34.
2. Teacher-to-subject assignments are absent from the source workbook; agree whether the owner supplies them or the engine assigns them.
3. All three levels pin activity at Thursday periods 6–7 in `แผนกวิชา`; confirm whether this is a shared assembly or requires separate rooms/rotation.
4. Confirm whether activity periods count in teacher load bands.
5. Exact period clock times are unspecified.
6. Confirm whether lunch is chosen per level/day among periods 4–6 or fixed.
7. Confirm whether `COM_OR_LAB` courses can use either room class.
8. Confirm whether the swapped general classroom labels are intentional.

Full wording and source context are in [`draftplan.md`](draftplan.md) §10; machine-readable unresolved questions are also produced by Ingest.

## Recommended next work

1. Obtain an owner-approved subject-to-teacher mapping, then run the Engine on canonical input and investigate the H13 Q3 collision with the mapped resources.
2. Get owner decisions for Q1–Q4, Q6, and Q7, especially teacher assignment strategy, simultaneous activity rooms, and activity load accounting.
3. Extend the initial solver with load-aware resource assignment, lunch/availability pruning, direct named conflicts, and source-scale feasibility fixtures.
4. Finish the schema-v1 boundary contract between `src/ingest/` and the independent validator; see J0.3/J2.7 in `development-journey.md`.
5. Add the Express integration around reusable local modules to satisfy TT4, without moving scheduling logic into route handlers.
6. Build output and review integration against [`review-page-requirement.md`](review-page-requirement.md), then BeggarDev's deterministic mock and frontend API connection.

## Latest recorded verification

Latest verification checked during this status review:

- `npm test`: 46 tests passed across validator, rating tools, Ingest, and Engine.
- `npm run build`: passed.
- `npm run check:stack`: refreshed the report to 67/100; it exits nonzero because Express TT4 remains a blocker.
- Docker Compose config and image build passed; `docker compose --profile test run --rm test` passed 46/46, and `docker compose run --rm ingest` produced the canonical package and import report.
- The engine CLI/core was checked against `output/canonical.json`: it correctly blocks because all 33 subject-to-teacher assignments are absent (Q2).
- The most recent recorded ingest produced 33 subjects, 6 groups, 5 teachers, 6 rooms, 13 pins, and 22 rule records; two generated JSON/report runs were byte-identical.

Use `npm ci`, `npm run ingest`, `npm test`, `npm run dev`, `npm run build`, and `npm run check:stack` as documented in the root README when a task calls for setup or verification.

## Change discipline

Keep project-level plans, drafts, journey, handoff, and log in this `plans/` folder. Every agent records its own changes in `log.md` using its name. Preserve the historic entries; update its current-status section when implementation state changes materially. Component-specific README files stay with their component directories.
