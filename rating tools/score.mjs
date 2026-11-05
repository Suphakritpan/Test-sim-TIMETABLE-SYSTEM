#!/usr/bin/env node
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readCsv, stringifyCsvRow } from "./csv.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_RUBRIC = resolve(HERE, "rubric.csv");
const EXPECTED_TOTAL = 100;

function parseArgs(args) {
  const options = { rubric: DEFAULT_RUBRIC, json: false, template: false, checkRubric: false };
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--rubric") {
      if (!args[index + 1]) throw new Error("--rubric requires a CSV path.");
      options.rubric = args[++index];
    } else if (arg === "--json") options.json = true;
    else if (arg === "--template") options.template = true;
    else if (arg === "--check-rubric") options.checkRubric = true;
    else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else positional.push(arg);
  }
  if (positional.length > 1) throw new Error("Provide only one scores CSV path.");
  options.scores = positional[0];
  return options;
}

function normalizeSection(value) {
  const text = String(value ?? "").trim();
  return /^\d+$/.test(text) ? Number(text) : text || "—";
}

export async function loadRubric(path) {
  const rows = await readCsv(path);
  if (rows.length === 0) throw new Error(`Rubric is empty: ${path}`);
  const required = ["id", "section", "max"];
  for (const column of required) {
    if (!(column in rows[0])) throw new Error(`Rubric is missing required column "${column}".`);
  }
  const ids = new Set();
  return rows.map((row, index) => {
    const id = row.id.trim();
    const rawMax = row.max.trim();
    const max = Number(rawMax);
    if (!id) throw new Error(`Rubric row ${index + 2} has an empty id.`);
    if (ids.has(id)) throw new Error(`Rubric contains duplicate id ${id}.`);
    if (!rawMax || !Number.isInteger(max) || max < 0) {
      throw new Error(`Rubric row ${index + 2} has invalid max ${JSON.stringify(row.max)}.`);
    }
    ids.add(id);
    const section = normalizeSection(row.section);
    return {
      ...row,
      id,
      section,
      max,
      title: (row.section_title_th || (typeof section === "string" ? section : "") || "—").trim(),
    };
  });
}

function compareSection(a, b) {
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return String(a).localeCompare(String(b));
}

export function sections(rubric) {
  const output = new Map();
  for (const row of rubric) {
    const section = output.get(row.section) ?? { title: row.title, max: 0, items: 0 };
    section.max += row.max;
    section.items += 1;
    output.set(row.section, section);
  }
  return new Map([...output.entries()].sort(([a], [b]) => compareSection(a, b)));
}

export function checkRubric(rubric, path) {
  const total = rubric.reduce((sum, row) => sum + row.max, 0);
  const sectionRows = sections(rubric);
  const ok = total === EXPECTED_TOTAL;
  console.log(`${basename(path)}: items=${rubric.length} total=${total} expected=${EXPECTED_TOTAL} -> ${ok ? "OK" : "MISMATCH"}`);
  for (const [section, info] of sectionRows) {
    console.log(`  section ${section}: ${String(info.items).padStart(2)} items, ${String(info.max).padStart(3)} pts  ${info.title}`);
  }
  return ok ? 0 : 1;
}

export async function loadScores(path, rubric) {
  const rows = await readCsv(path);
  if (rows.length === 0) throw new Error(`Scores file is empty: ${path}`);
  for (const column of ["id", "score", "evidence"]) {
    if (!(column in rows[0])) throw new Error(`Scores file is missing required column "${column}".`);
  }
  const byId = new Map(rubric.map((row) => [row.id, row]));
  const scores = {};
  const errors = [];
  rows.forEach((row, offset) => {
    const line = offset + 2;
    const id = (row.id ?? "").trim();
    const raw = (row.score ?? "").trim();
    const evidence = (row.evidence ?? "").trim();
    if (!id || id.startsWith("#")) return;
    if (!byId.has(id)) {
      errors.push(`line ${line}: unknown id ${JSON.stringify(id)}`);
      return;
    }
    if (raw === "") {
      errors.push(`line ${line}: ${id} has no score`);
      return;
    }
    const numericScore = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw);
    const value = Number(raw);
    if (!numericScore || !Number.isFinite(value)) {
      errors.push(`line ${line}: ${id} score ${JSON.stringify(raw)} is not a number`);
      return;
    }
    const maximum = byId.get(id).max;
    if (value < 0 || value > maximum) {
      errors.push(`line ${line}: ${id} score ${value} outside 0..${maximum}`);
      return;
    }
    scores[id] = { score: value, evidence };
  });
  const missing = rubric.filter((row) => !(row.id in scores)).map((row) => row.id);
  return { scores, errors, missing };
}

function round(value, digits) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function report(rubric, scores) {
  const sectionRows = sections(rubric);
  const perSection = new Map([...sectionRows.keys()].map((section) => [section, 0]));
  for (const row of rubric) {
    if (scores[row.id]) perSection.set(row.section, perSection.get(row.section) + scores[row.id].score);
  }
  const maximum = [...sectionRows.values()].reduce((sum, section) => sum + section.max, 0);
  const total = [...perSection.values()].reduce((sum, score) => sum + score, 0);
  return {
    sections: [...sectionRows.entries()].map(([section, info]) => ({
      section,
      title: info.title,
      score: round(perSection.get(section), 2),
      max: info.max,
      pct: round(100 * perSection.get(section) / info.max, 1),
    })),
    total: round(total, 2),
    max: maximum,
    pct: round(100 * total / maximum, 1),
  };
}

function formatNumber(number) {
  return Number.isInteger(number) ? String(number) : String(number);
}

function printReport(rubric, result, errors, missing) {
  const sectionRows = sections(rubric);
  console.log(`${"sec".padStart(4)} ${"items".padStart(6)} ${"score".padStart(6)} ${"max".padStart(4)} ${"%".padStart(6)}  title`);
  for (const section of result.sections) {
    const info = sectionRows.get(section.section);
    console.log(`${String(section.section).padStart(4)} ${String(info.items).padStart(6)} ${formatNumber(section.score).padStart(6)} ${String(section.max).padStart(4)} ${section.pct.toFixed(1).padStart(6)}  ${section.title}`);
  }
  console.log(`${"TOTAL".padStart(9)} ${formatNumber(result.total).padStart(6)} ${String(result.max).padStart(4)} ${result.pct.toFixed(1).padStart(6)}%`);
  if (errors.length) {
    console.log("\nERRORS:");
    for (const error of errors) console.log(`  - ${error}`);
  }
  if (missing.length) console.log(`\nUNSCORED (${missing.length}): ${missing.join(", ")}`);
}

export async function main(args = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(args);
    const rubricPath = isAbsolute(options.rubric) ? options.rubric : resolve(process.cwd(), options.rubric);
    const rubric = await loadRubric(rubricPath);
    if (options.checkRubric) return checkRubric(rubric, rubricPath);
    if (options.template) {
      console.log(stringifyCsvRow(["id", "score", "evidence"]));
      for (const row of rubric) console.log(stringifyCsvRow([row.id, "", ""]));
      return 0;
    }
    if (!options.scores) throw new Error("Provide a scores.csv, or use --template / --check-rubric.");
    const scorePath = resolve(process.cwd(), options.scores);
    const { scores, errors, missing } = await loadScores(scorePath, rubric);
    const result = report(rubric, scores);
    if (options.json) {
      console.log(JSON.stringify({ ...result, errors, missing }, null, 2));
    } else {
      printReport(rubric, result, errors, missing);
    }
    return errors.length ? 2 : 0;
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
