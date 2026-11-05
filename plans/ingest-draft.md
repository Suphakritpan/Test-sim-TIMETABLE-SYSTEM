# Ingest Draft — Input Plan

This is the detailed Input subplan for the [timetable scheduler draft plan](draftplan.md). Keep overview stages in `draftplan.md`; put each specific implementation plan in its own file in this folder.

## Purpose

Build the first executable path from the supplied `.pdf` guideline and `.xlsx` workbook to a canonical JSON package. The Process stage consumes this package; ingest does not schedule classes or make decisions about ambiguous source data.

## Components to build

Build these pieces in plain JavaScript ES modules:

| Piece | Responsibility |
|---|---|
| `src/ingest/cli.mjs` | Local command: accept PDF/XLSX paths, output directory, and optional JSON override; print a concise success/failure summary and exit nonzero on blocking errors. |
| `src/ingest/pdf-text.mjs` | Invoke the system `pdftotext -layout` command safely; save extracted text; return clear errors for missing executable, unreadable PDF, empty extraction, or failed command. |
| `src/ingest/read-workbook.mjs` | Read the source XLSX sheets into raw rows with sheet and row references. |
| `src/ingest/map-sources.mjs` | Map workbook rows and reviewed guideline rule definitions into canonical records while retaining original values and provenance. |
| `src/ingest/schema.mjs` | Export the versioned canonical schema and allowed values used by the importer, API, and later Process modules. |
| `src/ingest/validate-input.mjs` | Validate shape, required values, references, duplicates, rule coverage, pins, and availability; return structured errors and warnings. |
| `src/ingest/write-package.mjs` | Write stable JSON and a human-readable import report to the selected output directory. |
| `src/ingest/index.mjs` | Reusable `ingest({ pdfPaths, xlsxPath, overrides })` entry point; the CLI and Express adapter call the same core function. |

Choose and pin a JavaScript XLSX dependency in the package manifest/lockfile. `pdftotext` is an external system prerequisite: document how to check for it, and never shell-interpolate user-supplied paths. Keep extracted `.txt` files as inspectable intermediates. Because the guideline is a known document rather than an arbitrary PDF format, use the extracted text to verify a reviewed, structured mapping of the rules; do not depend on fragile PDF line positions or regexes alone to infer rule meaning.

## Canonical JSON package

Define and document one versioned shape, for example `schemaVersion`, `sources`, `levels`, `groups`, `subjects`, `teachers`, `rooms`, `timeslots`, `availability`, `constraints`, `unresolvedQuestions`, and `importReport`. Every imported entity/rule must carry a source reference (`file`, plus `sheet`/`row` or `page` and rule ID as applicable). Keep raw extracted PDF text as a separate artifact; include normalized rule ID/text and provenance in the package. Do not include invented teacher-subject assignments or fabricated room/time metadata.

## Guideline coverage

Represent the hard scheduling rules H1–H20 from §4 of `draftplan.md` as structured constraint records with IDs and source references. Include the two system requirements described by the source documents (import required timetable inputs and export the required timetable views/files) in the metadata/report so later stages can trace them. Ingest confirms that each required rule was captured and the supplied input is structurally usable; the Process validator is responsible for determining whether a generated schedule actually obeys the rules. Keep unsolved conflicts and source inconsistencies as explicit warnings/questions for owner review.

## Recommended implementation sequence

1. Pin the supported Node.js LTS version and add/update `package.json` plus the lockfile; use ES modules (`.mjs`) and plain JavaScript only.
2. Define the schema and representative JSON fixture before writing parsers; review the field names and unresolved values with BeggarDev/project owner.
3. Implement and inspect PDF text extraction, then map the known guideline rules with page references.
4. Implement XLSX raw-row reading, mapping, and normalization; compare imported row/record counts against §2 of `draftplan.md` and preserve source locations.
5. Add boundary validation and structured diagnostics (stable code, severity, message, source reference); distinguish blocking errors from review warnings.
6. Add deterministic JSON/report writing and the local CLI. Keep core modules callable without Express, a browser, network access, or a remote database.
7. Expose the same ingest core from an Express route when the backend is integrated. Keep that route thin; BeggarDev owns the mock backend and must use the same request/response shape with deterministic fixtures.
8. Document sample invocation, expected artifacts, `pdftotext` prerequisite, and how to resolve each warning. Record schema or contract changes in `../README.md` and `log.md`.

## Tech-stack scorecard alignment

This subplan targets the rating-tool checks: TT1–TT3 (pinned Node LTS, plain JavaScript/ES modules, single backend language), TT5–TT6 (reusable ingest core, local CLI independent of server), TT10–TT11 (canonical JSON schema and boundary validation), and TT13–TT15 (JSON-first repository boundary, manifest/lockfile, local operation). Integration with Express and BeggarDev's deterministic mock must be reviewed against TT4 and TT9; the ingest module itself must not introduce another backend runtime. Website integration remains subject to TT7–TT8.

## Completion criteria

One documented local command accepts the guideline PDF(s) and workbook, extracts PDF text using `pdftotext`, creates a schema-valid and deterministic JSON package plus report, accounts for all 33 subject rows and all required guideline rules, cites source locations, and clearly reports unresolved source issues. The same reusable core can then be called by the Express backend without changing the JSON contract.
