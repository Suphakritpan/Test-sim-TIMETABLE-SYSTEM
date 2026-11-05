# Tech-stack conformance report — 2026-11-05

Scanned root: `/home/beggardev/Desktop/Test-sim-TIMETABLE-SYSTEM`

**Score 67/100 (67%) — NOT YET CONFORMANT — blocker items not built or only partial**

Blockers not yet satisfied: TT4

| ID | Severity | Status | Points | Item |
|---|---|---|---|---|
| TT1 | required | PASS | 8/8 | Node.js LTS pinned |
| TT2 | blocker | PASS | 10/10 | Plain JavaScript (ES modules) only |
| TT3 | blocker | PASS | 8/8 | Single backend language |
| TT4 | blocker | ABSENT | 0/10 | Express is the solver/backend server |
| TT5 | required | PARTIAL | 7/10 | Reusable rule/solver modules |
| TT6 | required | PASS | 8/8 | Locally callable without the server |
| TT7 | required | PASS | 8/8 | React + Vite in plain JavaScript |
| TT8 | required | PARTIAL | 1/6 | Frontend consumes the shared API contract |
| TT9 | required | ABSENT | 0/8 | Same routes and shapes with deterministic fixtures |
| TT10 | required | PASS | 4/4 | Canonical schema + JSON payloads |
| TT11 | required | PARTIAL | 2/3 | Boundary validation |
| TT12 | recommended | PARTIAL | 1/3 | CSV/XLSX/PDF exports |
| TT13 | required | ABSENT | 0/4 | Repository boundary |
| TT14 | required | PASS | 4/4 | Explicit dependency manifests |
| TT15 | required | PASS | 4/4 | Local and container runs |
| TT16 | recommended | PASS | 2/2 | Stack/contract changes documented |

## Evidence per item

### TT1 — Node.js LTS pinned  ·  PASS (8/8)
Requirement: Node.js on a supported LTS release, declared via engines.node, .nvmrc or .node-version
- package.json engines.node = ">=22.12.0"

### TT2 — Plain JavaScript (ES modules) only  ·  PASS (10/10)
Requirement: No TypeScript and no .ts/.tsx sources; package.json type=module; .js/.mjs sources
- package.json "type": "module" (ES modules)
- 20 JS-family sources, no .ts/.tsx
- typescript not declared

### TT3 — Single backend language  ·  PASS (8/8)
Requirement: No second backend language (.py/.go/.java/.rs/.rb/.php/.cs) in product code
- product tree is JavaScript only (20 sources; rating tools/ excluded as tooling)

### TT4 — Express is the solver/backend server  ·  ABSENT (0/10)
Requirement: Express declared as a dependency and used for HTTP routes
- express not declared and no server source — backend not started yet

### TT5 — Reusable rule/solver modules  ·  PARTIAL (7/10)
Requirement: Rules, scheduling, validation and import/export live in separate modules, not inside route handlers
- rules/constraints: not found
- solver/scheduling: src/engine/solver.mjs
- validation: conflict tools/validate.mjs, conflict tools/validate.test.mjs
- ingest/import: src/ingest, src/ingest/cli.mjs, src/ingest/index.mjs, src/ingest/ingest.test.mjs, src/ingest/read-workbook.mjs

### TT6 — Locally callable without the server  ·  PASS (8/8)
Requirement: A CLI entry (bin or npm script) runs the scheduler with no API or website
- npm scripts: engine

### TT7 — React + Vite in plain JavaScript  ·  PASS (8/8)
Requirement: React and Vite declared; vite config present; no TSX sources
- react ^19.1.1 declared
- vite declared
- vite config present
- no TSX sources (plain JS/JSX)

### TT8 — Frontend consumes the shared API contract  ·  PARTIAL (1/6)
Requirement: Website calls /api/*; no duplicated scheduling or validation rules in the frontend
- 16 frontend source files
- no /api/* calls found in frontend
- possible duplicated rules in frontend: double-book

### TT9 — Same routes and shapes with deterministic fixtures  ·  ABSENT (0/8)
Requirement: BeggarDev mock exposes the same Express routes and response shapes, backed by JSON fixtures
- no mock/ or fixtures/ directory — mock backend not started

### TT10 — Canonical schema + JSON payloads  ·  PASS (4/4)
Requirement: One documented, versioned schema module; JSON is the interchange format
- schema module: src/ingest/schema.mjs
- 1 JSON data files

### TT11 — Boundary validation  ·  PARTIAL (2/3)
Requirement: Imported data and API payloads are validated at the boundary (zod/ajv/joi/valibot)
- hand-written validation module: conflict tools/validate.mjs
- no schema library (zod/ajv/joi/valibot) declared

### TT12 — CSV/XLSX/PDF exports  ·  PARTIAL (1/3)
Requirement: Export writers for CSV, XLSX and PDF exist or are declared
- xlsx: xlsx

### TT13 — Repository boundary  ·  ABSENT (0/4)
Requirement: JSON-first storage behind a small repository interface so SQLite can be added without touching the scheduler or API
- no repository/store module found
- no repository boundary yet — JSON is written directly by modules

### TT14 — Explicit dependency manifests  ·  PASS (4/4)
Requirement: Dependencies declared per manifest with a lockfile; no undeclared or global deps
- package.json declares 5 dependencies
- lockfile: package-lock.json

### TT15 — Local and container runs  ·  PASS (4/4)
Requirement: Local modules run without the website or remote service; Dockerfile and Compose document reproducible ingest, test, and development runs
- npm scripts available: build, check:stack, dev, engine, ingest, preview, score:criteria, test
- README documents a local run path
- Dockerfile defines a container image
- docker-compose.yml and documented Docker Compose commands provide container workflows

### TT16 — Stack/contract changes documented  ·  PASS (2/2)
Requirement: README stack section stays current and every change is recorded in log.md
- README has a Shared tech stack section
- log.md records change entries

## Notes

- `rating tools/` is excluded from the product scan: it is build-time tooling, not product backend code.
- ABSENT means the artefact does not exist yet; FAIL means it exists and breaks the stack. ABSENT scores 0 but should be read as 'not yet built', not 'built wrong'.
