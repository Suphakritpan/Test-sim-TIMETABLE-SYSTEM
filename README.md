# Test-sim-TIMETABLE-SYSTEM

## Start here, project agents

This repository builds a timetable scheduler in three forms: local, mock, and website. **BeggarDev owns the mock backend.** Start with these documents before changing code:

1. [`plans/handoff.md`](plans/handoff.md) — current implementation status, known blockers, and next work.
2. [`plans/development-journey.md`](plans/development-journey.md) — ordered build stages and evidence-based completion gates.
3. [`plans/draftplan.md`](plans/draftplan.md) — source-data inventory, domain model, scheduling guidelines, and open questions.
4. The specific requirements for your work: [`plans/ingest-draft.md`](plans/ingest-draft.md), [`plans/engine-draft.md`](plans/engine-draft.md), or [`plans/review-page-requirement.md`](plans/review-page-requirement.md).
5. [`plans/log.md`](plans/log.md) — current status summary and chronological change history.

Component references:

- `src/ingest/` — implemented PDF/XLSX-to-JSON import modules and CLI.
- `src/engine/` — local scheduler core, deterministic placement search, independent validator adapter, and CLI.
- [`conflict tools/README.md`](<conflict tools/README.md>) — independent H1–H20 timetable validator. It checks a proposed schedule; it is not the scheduling engine.
- [`rating tools/README.md`](<rating tools/README.md>) — competition and tech-stack scoring tools.
- `src/App.jsx` and `src/styles.css` — React/Vite workflow prototype. It is not connected to ingest, an API, or a scheduler yet.

## Current state

- **Ingest:** implemented as reusable Node.js ES modules. `npm run ingest` reads the supplied guideline PDF and workbook, validates source data, and writes `output/canonical.json` and `output/import-report.md`. Latest recorded run found 33 subjects, 6 groups, 5 teachers, 6 rooms, 13 pins, and H1–H20 plus S1/S2.
- **Ingest acceptance:** partial until the owner resolves source questions, especially printed totals 50/48 versus row sums 36/34 and missing teacher-to-course assignments. See `plans/draftplan.md` §10.
- **Engine:** first implementation slice exists: canonical model/block expansion, required explicit teacher mapping, deterministic MRV placement, and independent validation. The current workbook still blocks a run because Q2 has no teacher assignments; Q3 also identifies a fixed shared-room collision. Do not describe this as an accepted schedule generator yet.
- **Frontend:** interactive workflow shell exists; real ingest/API/schedule/review data is not wired in.
- **Backend/mock/exports:** Express routes, BeggarDev's deterministic mock integration, and timetable export flow remain to be built.
- **Tech-stack rating:** see the latest generated score in `rating tools/reports/techstack-report.md`; Express (TT4) remains the blocker until the API server is implemented.
- **Review page:** the agreed charts, switchable matrices, data contract, and acceptance requirements are in `plans/review-page-requirement.md`.

The latest implementation truth is in `plans/handoff.md`; older status entries in `plans/log.md` are historical snapshots.

## Shared tech stack

Agents should use this stack across local, mock, and website work so components can be combined consistently:

- **Runtime and language:** Node.js on a supported LTS release, using plain JavaScript (ES modules). Do not introduce TypeScript or a second backend language.
- **Solver and backend:** Express. Keep timetable rules, scheduling, validation, and file import/export in reusable JavaScript modules so the logic can run locally and through the API.
- **Website:** React with plain JavaScript, built with Vite. The website should call the shared API contract rather than duplicate scheduling rules or rating calculations.
- **Mock backend:** BeggarDev owns this component. Use the same Express routes and response shapes as the real backend, backed by deterministic JSON fixtures.
- **Containerization:** Docker and Docker Compose provide repeatable local ingest, test, development, and engine workflows. The image includes `pdftotext` and runs as a non-root user.
- **Data and storage:** JSON for API payloads and fixtures; start JSON-first behind a repository boundary so SQLite can be added without changing the scheduler or API contract. Provide CSV, XLSX, and PDF exports as the product requires.
- **Dependencies:** keep dependencies explicit in manifests and lockfiles. Document any proposed stack change in this README and `plans/log.md`.

## Local commands

```sh
npm ci                      # install from the lockfile
npm run ingest              # PDF + XLSX → output/canonical.json + output/import-report.md
npm run engine -- --input output/canonical.json --assignments assignments.json --out output/engine-result.json
npm test                    # validator, rating-tool, ingest, and engine suites
npm run dev                 # Vite development server
npm run build               # production frontend build
npm run check:stack         # refresh the tech-stack report
```

`npm run ingest` needs the system `pdftotext` command (Poppler) for the guideline PDF. It supports `--guideline-text <pre-extracted.txt>` as a fallback. Generated `output/` files are gitignored and can be regenerated.

The engine CLI requires an explicit JSON mapping of every subject ID to a teacher ID. It
does not infer missing teacher assignments. Its deterministic search returns a schedule
only after the independent H1–H20 validator accepts it; owner questions and the rating
bridge remain separate acceptance work.

## Docker

The image is `node:22-bookworm-slim` plus `poppler-utils` (so `pdftotext` exists), runs as a
non-root user, and carries the whole project. This is the recommended way to run the project on
Windows, because it removes both platform differences at once (Poppler and line endings).

```sh
docker build -t timetable-system .                              # build
docker run --rm -v "$PWD/output:/app/output" timetable-system    # npm run ingest (default CMD)
docker compose --profile test run --rm test                      # full suite
docker compose --profile dev up dev                              # Vite on http://localhost:5173
docker compose --profile engine run --rm engine                  # engine run (needs output/assignments.json)
```

On Windows PowerShell, mount with `-v "${PWD}\output:/app/output"`. Generated artifacts land in
`output/` on the host through the mount; the container itself is disposable.

## Windows notes

The code is portable: paths go through `node:path`, the only subprocess is `pdftotext` (launched
with an argument array, never a shell string), and tests use `os.tmpdir()`. Two things differ:

- **`pdftotext` is not shipped with Windows.** Install Poppler (`scoop install poppler`,
  `choco install poppler -y`), or skip it with the supported fallback:
  `node src/ingest/cli.mjs --guideline-text output/guideline.txt --xlsx "start folder\data.xlsx" --out output`.
  That path is verified and produces the same package body; only the `sources` block records
  `format: "text"` instead of `"pdf"`.
- **Line endings and console encoding.** `.gitattributes` forces LF in the working tree so the
  CRLF autocrlf setting cannot break the byte-for-byte ingest determinism. Thai text in `cmd.exe`
  may need `chcp 65001` to display correctly; the files are UTF-8 either way.

Docker Desktop with Linux containers avoids both. Node 22.12+ is required natively.

## Documentation and change logging

Keep project-level plans, drafts, handoffs, and the change log together under [`plans/`](plans/). The root README is the project entry point; component-specific README files stay beside their code. Every future specific plan belongs in its own Markdown file under `plans/` and should be linked from the relevant overview.

Every agent must record each change it is responsible for in [`plans/log.md`](plans/log.md), with its agent name in the entry. Preserve old history; do not guess authorship for unattributed historical entries. Update the current-status section when implementation status materially changes.
