# Project Process Savepoint

> **Archived snapshot.** Superseded by [`handoff.md`](handoff.md) and the current-status
> section of [`log.md`](log.md). The historical status and paths below reflect the savepoint
> date and are not current implementation claims.

**Snapshot date:** 2026-11-05  
**Purpose:** Preserve the project history and current handoff for review by the project
owner and current/future agents. This snapshot is based on `log.md`, the current
project plans, and the clarifications made during this work session. It is not a claim
that the timetable system is complete.

## 1. Project start and source preparation

1. The project was framed as a timetable scheduler with three delivery modes:
   local use, a deterministic mock backend owned by BeggarDev, and a website.
2. The source materials were collected: the timetable workbook, the scheduling
   guideline PDF, and the competition criteria PDF. The project notes identify the
   workbook as `data.xlsx`, the guideline as `guildlines.pdf` in their historical
   references, and the criteria as `criteria.pdf`. The guideline file is currently
   named `guideline.pdf` in `start folder/`.
3. The source documents were organized in the workspace. During the conversation,
   the criteria, workbook, and guideline were grouped in `start folder/`.
4. The project owner established that changes should be recorded in `log.md`, and
   later requested that each agent identify itself in its entries.

## 2. Initial requirements and project direction

5. The initial project overview and draft plan were written. They set the objective:
   create a conflict-free weekly timetable, check it independently, and produce
   views and exports.
6. The draft plan inventoried the workbook as 33 subject rows across three levels,
   six student groups, five teachers, and six department rooms. It documented
   unresolved input problems, including printed totals that do not match row sums,
   missing teacher-to-subject assignments, missing room metadata, unspecified
   clock times, and inconsistent general-classroom labels.
7. The plan extracted hard constraints H1–H20, described the two-stage
   assign-and-place solver direction, and listed the target deliverables and
   milestones.
8. The shared stack was revised to the current project direction: Node.js on LTS,
   plain JavaScript ES modules, Express for the backend, React/Vite for the website,
   JSON-first data and deterministic fixtures, with a repository boundary that can
   later support SQLite. This is the stack to follow; earlier Python/FastAPI and
   TypeScript mentions in historical entries are superseded.

## 3. Evaluation and implementation planning

9. A criteria rubric was created from `criteria.pdf`: 33 items totaling 100 points.
   The documents record that section 3 is printed as 35 points, although its
   sub-items total 15 and the complete form totals 100; the rubric uses 15 pending
   confirmation from judges.
10. The plan was expanded into Input → Process → Output stages and given concrete
    input-stage acceptance criteria: preserve source provenance, validate inputs,
    report ambiguities, and produce deterministic canonical JSON.
11. Detailed plans were split into separate files under `plans/`:
    - `ingest-draft.md` describes PDF/XLSX ingestion, canonical schema,
      validation, import diagnostics, and local CLI requirements.
    - `engine-draft.md` describes the planned process/engine flow from
      canonical input through scheduling, independent validation, and review.
12. The plan was aligned with JavaScript by calling out the need to avoid
    Python-specific solver recommendations and filenames in future implementation.

## 4. Rating tools: creation, expansion, and stack alignment

13. The original rating utility scored the competition criteria rubric.
14. The rating suite was expanded to include a second 16-item, 100-point
    tech-stack rubric, with blocker/required/recommended severities and a
    reproducible source scan.
15. The initial tech-stack assessment scored the project **30/100 — NOT YET
    CONFORMANT**. TT4 (Express backend) remained an open blocker. The report
    distinguished partial work from missing product components.
16. The project owner clarified that the rating tools themselves should conform to
    the JavaScript stack. Both Python scripts were then replaced with dependency-free
    Node.js ES modules, a shared CSV parser/writer, and tests. The docs and generated
    stack report were updated. The current 30/100 result is unchanged by that
    tooling migration.
17. The rating tests verify CSV handling, both rubric totals, score validation,
    current stack assessment, and a synthetic fully conformant project. The latest
    recorded test run passed all five rating-tool tests.
18. An interactive React/Vite frontend shell was added ahead of the actual Ingest
    and Engine services. It supports browser-local PDF/XLSX/JSON selection, JSON
    syntax preview, run-seed controls, readiness diagnostics, and navigation to
    planned review outputs. It explicitly does not parse the source PDF/XLSX, call
    an API, generate a schedule, or score a run. Browser interaction verified the
    source-selection flow, readiness block, and Review page.

## 5. Separate validator work and scope clarification

18. A separate dependency-free timetable conflict validator and CLI were added for
    H1–H20, with structured conflict output and tests. The project log records this
    addition. Its teacher assignments and maximum loads remain explicit inputs
    because the source workbook does not define them.
19. The project owner clarified that the earlier request to “rebuild conflict tools”
    was intended to mean the **rating tools**, not the timetable conflict validator.
    The rating-tool migration in step 16 addressed that correction. The validator
    remains a separate project component and is not the rating-tool replacement.

## 6. Current state at this savepoint

- **Project direction and stack:** Documented in `../README.md`.
- **Overview and source analysis:** In `draftplan.md`; source questions remain open.
- **Detailed plans:** Input and engine drafts exist under `plans/`; these are plans,
  not completed implementations.
- **Frontend:** React/Vite scaffold builds and offers interactive pre-ingest,
  pre-engine screens. It is not yet connected to an ingest API or solver.
- **Rating tools:** JavaScript ES modules; both rubrics total 100 points; tests pass.
- **Tech-stack result:** 54/100, **NON-CONFORMANT**; Express/backend integration
  remains a blocker. The frontend and manifest requirements now pass, while
  API/mock, boundary validation, persistence, and export work remains.
- **Conflict validator:** Separate JavaScript tool. Its earlier test run passed 24
  tests covering the constraint checks and CLI.
- **End-to-end timetable:** Not yet demonstrated. No completed ingestion,
  canonical production dataset, solver run, independently certified timetable, or
  complete exports/mock/site workflow is recorded in the log.
- **Change history:** `log.md` remains the chronological source of project changes.

## 7. Remaining path from current state to final review

These are planned next stages, not work claimed as complete:

1. **Resolve or explicitly carry forward source questions.** Confirm which totals
   are authoritative, teacher assignments, activity-room handling, activity load
   accounting, lunch policy, flexible room choices, classroom-label discrepancies,
   and clock times where needed. Do not silently invent answers.
2. **Implement and verify ingestion.** Build the Node.js PDF/XLSX import path,
   versioned canonical schema, provenance, boundary validation, deterministic JSON
   package, warnings, and import report. Reconcile all 33 subject rows, six groups,
   and five teachers.
3. **Connect the frontend to real ingest.** Replace the source-selection-only
   prototype with the planned upload/import request and render validated import
   results, provenance, blocking errors, warnings, and owner questions.
4. **Implement the scheduler and hard-rule model.** Add reusable JavaScript
   constraint, assignment, placement, and reporting modules. Keep solver logic
   callable locally and independent of Express or the website.
5. **Validate independently.** Check generated schedules against H1–H20 using
   the separate validator, with tests for deliberately broken rules. Report
   unschedulable conflicts honestly; do not certify a schedule with hard violations.
6. **Produce and check a full timetable.** Solve all levels, verify period totals,
   teacher loads, room/group/teacher availability and non-overlap, and record
   reproducible run information.
7. **Build outputs.** Generate and reconcile master, group, teacher, room, and
   subject views, plus CSV/XLSX/PDF exports as required.
8. **Integrate the backend and mock.** Add Express routes around shared modules;
   BeggarDev’s mock must use the same request/response shapes and deterministic
   JSON fixtures.
9. **Connect the website.** Evolve the current plain-JavaScript React/Vite shell
   into working views against the
   shared API, including the planned review process that displays rubric scores
   and evidence without reimplementing scoring in the browser.
10. **Run final acceptance and demo.** Verify the end-to-end workflow, zero hard
   violations for a certified schedule, export consistency, stack rubric, and
   demo evidence. Update the plans and log with actual results and unresolved
   limitations before final review.

## 8. Review and handoff discipline

- Read this snapshot together with `log.md`, `../README.md`, `draftplan.md`, and the
  relevant plans; the log is the historical record and plans describe future work.
- Treat entries without an agent name as unattributed in the source log; do not
  infer an author.
- When work resumes, add dated, agent-attributed entries to `log.md`, update this
  savepoint when a major milestone changes, and distinguish implemented,
  tested, blocked, and merely planned work.
