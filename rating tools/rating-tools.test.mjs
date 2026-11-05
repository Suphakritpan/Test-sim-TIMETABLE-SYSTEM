import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCsv, stringifyCsvRow } from "./csv.mjs";
import { build } from "./check_techstack.mjs";
import { checkRubric, loadRubric, loadScores, report } from "./score.mjs";

const here = new URL(".", import.meta.url);

test("CSV parser handles quoted commas, escaped quotes, and embedded newlines", () => {
  const rows = parseCsv('\uFEFFid,evidence\r\nA,"a, ""quoted"" value\ncontinued"\r\n');
  assert.deepEqual(rows, [{ id: "A", evidence: 'a, "quoted" value\ncontinued' }]);
  assert.equal(stringifyCsvRow(["A", 'a, "quoted"\ncontinued']),
    'A,"a, ""quoted""\ncontinued"');
});

test("both published rubrics total 100 points", async () => {
  for (const name of ["rubric.csv", "rubric_techstack.csv"]) {
    const rubric = await loadRubric(new URL(name, here));
    assert.equal(rubric.reduce((sum, item) => sum + item.max, 0), 100);
    assert.equal(checkRubric(rubric, name), 0);
  }
});

test("scoring reports sections and validates score IDs and bounds", async () => {
  const rubric = [
    { id: "A", section: 1, title: "First", max: 3 },
    { id: "B", section: 2, title: "Second", max: 2 },
  ];
  const directory = mkdtempSync(join(tmpdir(), "rating-score-"));
  try {
    const path = join(directory, "scores.csv");
    writeFileSync(path, "id,score,evidence\nA,2.5,\"good, clear evidence\"\nB,1,valid\nA,5,out-of-range\nUNKNOWN,1,typo\n");
    const { scores, errors, missing } = await loadScores(path, rubric);
    assert.equal(errors.length, 2);
    assert.deepEqual(missing, []);
    assert.equal(scores.A.evidence, "good, clear evidence");
    assert.deepEqual(report(rubric, scores), {
      sections: [
        { section: 1, title: "First", score: 2.5, max: 3, pct: 83.3 },
        { section: 2, title: "Second", score: 1, max: 2, pct: 50 },
      ],
      total: 3.5,
      max: 5,
      pct: 70,
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("tech-stack scan excludes rating tooling and returns all rubric items", async () => {
  const result = await build(fileURLToPath(new URL("../", here)));
  assert.equal(result.items.length, 16);
  assert.equal(result.max, 100);
  // State-independent invariants: the tooling itself must never be scanned as product code,
  // and every item must carry evidence.
  for (const item of result.items) {
    assert.ok(item.evidence.length > 0, `${item.id} reported no evidence`);
    assert.ok(["PASS", "PARTIAL", "FAIL", "ABSENT"].includes(item.status), `${item.id} bad status`);
  }
  assert.equal(result.items.find((item) => item.id === "TT3").status, "PASS");
  // The schema module and JSON contract now exist in src/ingest, so TT10 must not be absent.
  assert.notEqual(result.items.find((item) => item.id === "TT10").status, "ABSENT");
  // No Express backend yet, so the blocker gate cannot pass.
  assert.ok(result.blockers_failed.length + result.blockers_open.length > 0);
});

test("checker recognizes a synthetic project that satisfies all stack items", async () => {
  const root = mkdtempSync(join(tmpdir(), "rating-stack-pass-"));
  const files = {
    "package.json": JSON.stringify({
      type: "module",
      engines: { node: ">=22" },
      dependencies: {
        express: "^5", react: "^19", vite: "^6", "@vitejs/plugin-react": "^4",
        zod: "^3", exceljs: "^4", pdfkit: "^0.16", papaparse: "^5",
      },
      scripts: { solve: "node cli.mjs" },
    }),
    "package-lock.json": "{}",
    "README.md": "# Shared tech stack\nRun locally without the website or server.",
    "log.md": "# Log\n1\n2\n3\n4\n5\n6",
    "vite.config.mjs": "export default {};",
    "schema.mjs": "import { z } from 'zod'; export const schemaVersion = 1; export const schema = z.object({});",
    "server.mjs": "import express from 'express'; const app = express(); app.get('/api/items', () => {});",
    "rules/constraints.mjs": "export const rule = true;",
    "solver/scheduling.mjs": "export const schedule = true;",
    "validation/validate.mjs": "export const validate = true;",
    "ingest/import.mjs": "export const parse = true;",
    "cli.mjs": "console.log('csv');",
    "web/page.jsx": "fetch('/api/items');",
    "mock/server.js": "const app = {}; app.get('/api/items', () => {});",
    "fixtures/one.json": "{}",
    "fixtures/two.json": "{}",
    "repositories/repository.mjs": "import { writeFile } from 'node:fs'; writeFile('data.json', '');",
  };
  try {
    for (const [path, content] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(join(target, ".."), { recursive: true });
      writeFileSync(target, content);
    }
    const result = await build(root);
    assert.equal(result.total, 100);
    assert.equal(result.gate_pass, true);
    assert.deepEqual(result.blockers_failed, []);
    assert.deepEqual(result.blockers_open, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
