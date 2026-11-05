# Rating Tools

Two scoring instruments for this project:

1. **Criteria rubric** — how the competition judges score the system (`../criteria.pdf`, 100 pts).
2. **Tech-stack rubric** — whether what we build matches the shared stack in `../README.md` (100 pts).

Both are 100-point rubrics scored by the same Node.js engine (`score.mjs`). The stack rubric
is also checked mechanically by `check_techstack.mjs`, so its score is reproducible rather
than opinion.

## Contents

| File | Purpose |
|---|---|
| `rubric.csv` | 33 judged items from `criteria.pdf` — `id, section, section_title_th, item_th, item_en, max` |
| `rubric_techstack.csv` | 16 stack-conformance items — `id, section, item, requirement, severity, max, check` |
| `csv.mjs` | Shared CSV parser/writer for quoted, Unicode rubric and score files |
| `score.mjs` | Renders and scores either rubric; emits blank score templates |
| `check_techstack.mjs` | Scans the repo and scores `rubric_techstack.csv` with evidence per item |
| `reports/techstack-report.md` | Latest generated stack report (evidence per item, doc deviations) |
| `reports/techstack-scores.csv` | Latest scores in `id,score,evidence` form (re-scoreable by `score.mjs`) |
| `rating-tools.test.mjs` | Tests CSV handling, scoring, rubric totals, and stack scan |
| `scores.csv` | *(create it)* your filled-in marks for the criteria rubric |

## Instrument 1 — criteria.pdf (100 pts)

| Section | Items | Points |
|---|---|---|
| 1. ความถูกต้องตามข้อกำหนดการจัดตารางสอน | 12 | 40 |
| 2. ความครบถ้วนและคุณภาพของตารางสอน | 4 | 15 |
| 3. ความสามารถและการทำงานของระบบ | 5 | **15** |
| 4. การประยุกต์ใช้เทคนิคปัญญาประดิษฐ์ (AI) | 10 | 20 |
| 5. การนำเสนอและการตรวจสอบผลงาน | 2 | 10 |
| **Total** | **33** | **100** |

**Documented discrepancy:** the PDF prints **35** for section 3, but its sub-items
(4+4+3+2+2) sum to **15**, which is what makes the stated 100 total work. `rubric.csv`
uses 15. Confirm with the judges if the form is reused officially.

## Instrument 2 — shared tech stack (100 pts)

Items mirror `../README.md` §Shared tech stack. Severities: **blocker** (a violation makes
the build non-conformant), **required**, **recommended**.

| ID | Item | Sev | Pts |
|---|---|---|---|
| TT1 | Node.js LTS pinned | required | 8 |
| TT2 | Plain JavaScript (ES modules) only | blocker | 10 |
| TT3 | Single backend language | blocker | 8 |
| TT4 | Express is the solver/backend server | blocker | 10 |
| TT5 | Reusable rule/solver modules | required | 10 |
| TT6 | Locally callable without the server | required | 8 |
| TT7 | React + Vite in plain JavaScript | required | 8 |
| TT8 | Frontend consumes the shared API contract | required | 6 |
| TT9 | Mock: same routes/shapes, deterministic fixtures | required | 8 |
| TT10 | Canonical schema + JSON payloads | required | 4 |
| TT11 | Boundary validation | required | 3 |
| TT12 | CSV/XLSX/PDF exports | recommended | 3 |
| TT13 | Repository boundary (JSON first, SQLite addable) | required | 4 |
| TT14 | Explicit manifests + lockfile | required | 4 |
| TT15 | Local run independent of website/remote | required | 4 |
| TT16 | Stack/contract changes documented | recommended | 2 |

### Verdict semantics

| Status | Meaning |
|---|---|
| `PASS` | artefact exists and satisfies the item |
| `PARTIAL` | artefact exists but is incomplete |
| `ABSENT` | artefact does not exist yet — scored 0, read as "not built" |
| `FAIL` | artefact exists and **breaks** the stack |

The gate is separate from the score: `CONFORMANT` only when every blocker is `PASS`;
`NON-CONFORMANT` when any blocker is `FAIL`; otherwise `NOT YET CONFORMANT`.

## Usage

```bash
# criteria rubric (Node.js; no third-party dependencies)
node "rating tools/score.mjs" --check-rubric
node "rating tools/score.mjs" --template > "rating tools/scores.csv"
node "rating tools/score.mjs" "rating tools/scores.csv"
node "rating tools/score.mjs" "rating tools/scores.csv" --json

# tech-stack rubric
node "rating tools/check_techstack.mjs"
node "rating tools/check_techstack.mjs" --json
node "rating tools/check_techstack.mjs" --write-report
node "rating tools/check_techstack.mjs" --root /other/repo
node "rating tools/score.mjs" --rubric "rating tools/rubric_techstack.csv" --check-rubric
node "rating tools/score.mjs" --rubric "rating tools/rubric_techstack.csv" \
  "rating tools/reports/techstack-scores.csv"
```

`score.mjs` rejects unknown IDs and out-of-range marks (exit 2), so a typo cannot silently
inflate a total. `check_techstack.mjs` exits 0 when conformant, 1 otherwise, and 2 for a
usage or input error. Both use only Node.js built-ins and run independently of Express,
the website, or a remote service.

## Current rating — 2026-11-05 (after ingest landed)

**61/100 — NOT YET CONFORMANT.** TT4 (Express backend) is the only unsatisfied blocker; there are
no blocker *violations*. Ingest is implemented; the solver, API, mock and exporters are not.

What conforms:

- **TT1 (8/8)** — `package.json` pins `engines.node >=22.12.0`.
- **TT2 (10/10)** — plain JavaScript ES modules (`.mjs`); no TypeScript sources.
- **TT3 (8/8)** — no second backend language in the product tree.
- **TT7 (8/8)** — React + Vite declared, Vite config, plain JS/JSX sources.
- **TT10 (4/4)** — canonical schema module `src/ingest/schema.mjs` + JSON contract.
- **TT14 (4/4)** — dependencies declared, lockfile committed.
- **TT15 (4/4)** — local run scripts need no remote service.
- **TT16 (2/2)** — stack and changes documented.

Partial: **TT5 (4/10)** ingest + validation modules exist, rules/solver do not; **TT6 (5/8)**
`src/ingest/cli.mjs` and `npm run ingest` work but there is no `bin` entry (TT6 wants a wired
entry point); **TT8 (1/6)** the React shell makes no `/api/` calls yet; **TT11 (2/3)** hand-written
boundary validation instead of a schema library; **TT12 (1/3)** `xlsx` only, no PDF/CSV exporter.

Absent: **TT4** Express, **TT9** mock backend + fixtures, **TT13** repository boundary.

### Verdict semantics that changed in this pass

- TT4/TT11/TT13 now report **ABSENT** rather than **FAIL** when the component simply does not exist
  yet. `FAIL` is reserved for code that contradicts the stack (TypeScript, a second runtime, a
  duplicated rule engine), so "not built" no longer reads as "built wrong".
- TT11 accepts a hand-written validation module at partial credit, because the stack requires
  boundary validation, not a specific library.
- The doc-deviation scan no longer flags lines that *warn against* a deviation, and `../plans/log.md` is
  excluded (it is a history of superseded decisions).

Both earlier doc-level deviations are now fixed: `../plans/draftplan.md` §6 specifies a pure-JS DFS
fallback instead of OR-Tools CP-SAT, and §7's architecture block names `src/*.mjs` modules.
The current machine-readable evidence is in `reports/techstack-report.md`.

## Scoring discipline

- Score what is demonstrable in a live run, not what the design document promises.
- If an item cannot be checked at all, the form says award 0 — record the reason in `evidence`.
- Constraints that genuinely contradict each other are judged on the conflict analysis and the
  reported cause; keep that report with the submission.
- The criteria rubric measures the judges' view; the stack rubric measures our own build
  discipline. They are independent — a high stack score says nothing about section 1.

## Design notes / limitations

- `rating tools/` is **excluded** from the product scan because it is build-time tooling, not
  product backend code.
- `check_techstack.mjs` inspects manifests and source text only; it cannot prove that a module
  actually works. Its score is a floor, not a completion certificate.
- TT7/TT8/TT9 are presence heuristics (declared deps, `/api/` calls, route definitions). Review
  them by hand before quoting a green result.
- The checker is itself tested by construction: a synthetic repo that satisfies every item
  scores 100/100 `CONFORMANT` (shown during the rebuild), so the rubric is achievable and the
  zero-ish scores above reflect the project, not a broken instrument.
