#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadRubric } from "./score.mjs";
import { stringifyCsvRow } from "./csv.mjs";

const HERE = fileURLToPath(new URL(".", import.meta.url));
const RUBRIC = join(HERE, "rubric_techstack.csv");
const EXCLUDE_DIRS = new Set([
  ".git", "node_modules", "dist", "build", "coverage", "rating tools",
  "start folder", "reports", ".vscode", ".github",
]);
const CODE_EXT = new Set([".js", ".mjs", ".cjs", ".jsx"]);
const TS_EXT = new Set([".ts", ".tsx"]);
const OTHER_LANG = new Map([
  [".py", "Python"], [".go", "Go"], [".java", "Java"], [".rs", "Rust"],
  [".rb", "Ruby"], [".php", "PHP"], [".cs", "C#"], [".kt", "Kotlin"],
]);
const LOCKFILES = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb"];

function walk(root) {
  const files = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (!EXCLUDE_DIRS.has(entry.name)) visit(join(directory, entry.name));
      } else if (entry.isFile() && !EXCLUDE_DIRS.has(entry.name)) {
        files.push(join(directory, entry.name));
      }
    }
  }
  visit(root);
  return files;
}

function rel(root, path) {
  return relative(root, path).split("\\").join("/");
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function loadPackage(root) {
  const path = join(root, "package.json");
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readText(path));
  } catch (error) {
    if (error instanceof SyntaxError) return { __parse_error__: true };
    throw error;
  }
}

function dependencies(pkg) {
  if (!pkg) return {};
  return Object.assign(
    {},
    pkg.dependencies || {},
    pkg.devDependencies || {},
    pkg.peerDependencies || {},
  );
}

function sourceFiles(root, extensions = CODE_EXT) {
  return walk(root).filter((path) => extensions.has(extname(path)));
}

function jsText(root) {
  return sourceFiles(root).map((path) => readText(path).toLowerCase()).join("\n");
}

function hasDir(root, ...names) {
  const wanted = new Set(names.map((name) => name.toLowerCase()));
  return walkDirectories(root).filter((path) => wanted.has(basename(path).toLowerCase()));
}

function walkDirectories(root) {
  const directories = [];
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || EXCLUDE_DIRS.has(entry.name)) continue;
      const path = join(directory, entry.name);
      directories.push(path);
      visit(path);
    }
  }
  visit(root);
  return directories;
}

function status(earned, maximum, absent = false) {
  if (earned === maximum) return "PASS";
  if (earned > 0) return "PARTIAL";
  return absent ? "ABSENT" : "FAIL";
}

function checkTT1(root, pkg) {
  if (!pkg) return ["ABSENT", 0, ["no package.json — no application exists yet"]];
  const evidence = [];
  let earned = 0;
  const engine = pkg.engines?.node;
  if (engine) {
    evidence.push(`package.json engines.node = ${JSON.stringify(engine)}`);
    earned = 8;
  }
  for (const file of [".nvmrc", ".node-version"]) {
    const path = join(root, file);
    if (existsSync(path)) {
      evidence.push(`${file} = ${JSON.stringify(readText(path).trim())}`);
      earned = 8;
    }
  }
  if (!evidence.length) {
    evidence.push("package.json present but no Node version pin (engines.node/.nvmrc)");
    earned = 4;
  }
  return [status(earned, 8), earned, evidence];
}

function checkTT2(root, pkg) {
  const typescriptFiles = walk(root).filter((path) => TS_EXT.has(extname(path)));
  const deps = dependencies(pkg);
  const evidence = [];
  let earned = 0;
  if (typescriptFiles.length) {
    evidence.push(`TypeScript sources present: ${typescriptFiles.slice(0, 5).map((path) => rel(root, path)).join(", ")}`);
    return ["FAIL", 0, evidence];
  }
  if ("typescript" in deps) {
    evidence.push("typescript declared in package.json dependencies");
    return ["FAIL", 0, evidence];
  }
  const sources = sourceFiles(root);
  if (!sources.length && !pkg) {
    return ["ABSENT", 0, ["no JavaScript sources and no manifest — nothing to conform yet"]];
  }
  if (pkg?.type === "module") {
    evidence.push('package.json "type": "module" (ES modules)');
    earned += 5;
  } else if (sources.length && sources.every((path) => extname(path) === ".mjs")) {
    evidence.push(`all ${sources.length} sources are .mjs (ES modules by extension)`);
    earned += 5;
  } else if (pkg) {
    evidence.push('package.json has no "type": "module"');
  }
  if (sources.length) {
    evidence.push(`${sources.length} JS-family sources, no .ts/.tsx`);
    earned += 3;
  }
  if (!("typescript" in deps)) {
    evidence.push("typescript not declared");
    earned += 2;
  }
  return [status(earned, 10), earned, evidence];
}

function checkTT3(root, pkg) {
  const offenders = new Map();
  for (const path of walk(root)) {
    const language = OTHER_LANG.get(extname(path));
    if (language) {
      const files = offenders.get(language) ?? [];
      files.push(rel(root, path));
      offenders.set(language, files);
    }
  }
  const sources = sourceFiles(root);
  if (offenders.size) {
    const evidence = [...offenders.entries()]
      .map(([language, files]) => `${language}: ${files.slice(0, 4).join(", ")}`);
    return ["FAIL", 0, [...evidence, "second backend language(s) present in product tree"]];
  }
  if (!sources.length && !pkg) {
    return ["ABSENT", 0, ["no product code in any language — nothing to violate yet"]];
  }
  return ["PASS", 8, [`product tree is JavaScript only (${sources.length} sources; rating tools/ excluded as tooling)`]];
}

function checkTT4(_root, pkg, js) {
  const deps = dependencies(pkg);
  const evidence = [];
  let earned = 0;
  if (!pkg) return ["ABSENT", 0, ["no package.json — backend not started"]];
  if ("express" in deps) {
    evidence.push(`express ${deps.express} declared`);
    earned += 7;
  } else {
    // No Express at all means the backend has not been started: that is missing work,
    // not a stack violation. FAIL is reserved for a contradicting implementation.
    return ["ABSENT", 0, ["express not declared and no server source — backend not started yet"]];
  }
  if (/require\(['"]express['"]\)|from\s+['"]express['"]/.test(js)) {
    evidence.push("express imported in source");
    earned += 3;
  } else if ("express" in deps) {
    evidence.push("express not yet imported (no server code)");
  }
  return [status(earned, 10), earned, evidence];
}

function checkTT5(root) {
  const sources = sourceFiles(root);
  if (!sources.length) return ["ABSENT", 0, ["no JavaScript sources — no modules to separate"]];
  const roles = [
    ["rules/constraints", /rule|constraint/i],
    ["solver/scheduling", /solver|schedul|place|assign/i],
    ["validation", /validate|validator/i],
    ["ingest/import", /ingest|import|parse|read/i],
  ];
  const evidence = [];
  let found = 0;
  for (const [role, pattern] of roles) {
    const directories = hasDir(root, ...role.split("/"));
    const roleFiles = directories.flatMap((directory) =>
      walk(directory).filter((path) => CODE_EXT.has(extname(path))));
    const named = sources.filter((path) => pattern.test(basename(path, extname(path))));
    if (directories.length || named.length) {
      found += 1;
      const locations = [
        ...directories.slice(0, 2).map((path) => rel(root, path)),
        ...roleFiles.slice(0, 2).map((path) => rel(root, path)),
        ...named.slice(0, 2).map((path) => rel(root, path)),
      ];
      evidence.push(`${role}: ${[...new Set(locations)].join(", ")}`);
    } else {
      evidence.push(`${role}: not found`);
    }
  }
  const earned = new Map([[4, 10], [3, 7], [2, 4], [1, 2]]).get(found) ?? 0;
  return [status(earned, 10), earned, evidence];
}

function checkTT6(root, pkg) {
  const evidence = [];
  const bins = pkg?.bin;
  if (pkg && bins && (typeof bins === "string" || Object.keys(bins).length)) {
    return ["PASS", 8, [`bin entry: ${JSON.stringify(bins)}`]];
  }
  const scripts = pkg?.scripts || {};
  const local = Object.keys(scripts).filter((name) =>
    ["solve", "schedule", "cli", "generate", "build:timetable", "import"].includes(name.toLowerCase()));
  if (local.length) return ["PASS", 8, [`npm scripts: ${local.join(", ")}`]];
  const entries = sourceFiles(root).filter((path) =>
    extname(path) !== ".jsx"
    && /^(cli|solve|main|schedule)$/i.test(basename(path, extname(path))));
  if (entries.length) {
    evidence.push(`standalone entry: ${entries.slice(0, 3).map((path) => rel(root, path)).join(", ")}`);
    evidence.push(pkg
      ? "no npm script or bin wired to it yet"
      : "runnable with `node <entry>` but no package.json bin/script yet");
    return ["PARTIAL", 5, evidence];
  }
  if (pkg && "start" in scripts) {
    return ["PARTIAL", 3, ["only a server 'start' script — not runnable without the API"]];
  }
  return [pkg ? "FAIL" : "ABSENT", 0, ["no CLI entry — scheduling cannot run locally"]];
}

function checkTT7(root, pkg) {
  const deps = dependencies(pkg);
  if (!pkg) return ["ABSENT", 0, ["no package.json — website not started"]];
  const evidence = [];
  let earned = 0;
  const tsx = walk(root).filter((path) => extname(path) === ".tsx");
  if ("react" in deps) {
    evidence.push(`react ${deps.react} declared`);
    earned += 4;
  } else evidence.push("react not declared");
  if ("vite" in deps || "@vitejs/plugin-react" in deps) {
    evidence.push("vite declared");
    earned += 2;
  }
  if (readdirSync(root).some((name) => /^vite\.config\./.test(name))) {
    evidence.push("vite config present");
    earned += 1;
  }
  if (tsx.length) evidence.push(`TSX sources present (${tsx.length}) — stack requires plain JS`);
  else if ("react" in deps) {
    evidence.push("no TSX sources (plain JS/JSX)");
    earned += 1;
  }
  return [status(earned, 8), earned, evidence];
}

function checkTT8(root) {
  if (!sourceFiles(root).length) return ["ABSENT", 0, ["no sources — frontend/contract not implemented"]];
  const webDirs = hasDir(root, "web", "website", "frontend", "client", "ui", "src");
  const webFiles = [...new Set(webDirs.flatMap((directory) =>
    walk(directory).filter((path) => CODE_EXT.has(extname(path)))))];
  if (!webFiles.length) return ["ABSENT", 0, ["no website sources — contract consumption not implemented"]];
  const webText = webFiles.slice(0, 200).map((path) => readText(path).toLowerCase()).join("\n");
  let earned = 1;
  const evidence = [`${webFiles.length} frontend source files`];
  if (/fetch\(\s*[`'"]\/?api\/|axios\.(get|post)\(\s*[`'"]\/?api\//.test(webText)) {
    evidence.push("frontend calls /api/* endpoints");
    earned += 4;
  } else evidence.push("no /api/* calls found in frontend");
  const duplicates = ["double-book", "max_period", "constraint("].filter((keyword) => webText.includes(keyword));
  if (!duplicates.length) {
    evidence.push("no rule implementations duplicated in frontend");
    earned += 1;
  } else evidence.push(`possible duplicated rules in frontend: ${duplicates.join(", ")}`);
  return [status(earned, 6), earned, evidence];
}

function checkTT9(root) {
  const mockDirs = hasDir(root, "mock", "mocks", "fixtures");
  if (!mockDirs.length) return ["ABSENT", 0, ["no mock/ or fixtures/ directory — mock backend not started"]];
  const jsFiles = [...new Set(mockDirs.flatMap((directory) =>
    walk(directory).filter((path) => extname(path) === ".js")))];
  const jsonFiles = [...new Set(mockDirs.flatMap((directory) =>
    walk(directory).filter((path) => extname(path) === ".json")))];
  const evidence = [];
  let earned = 0;
  if (jsFiles.length) {
    evidence.push(`mock code: ${jsFiles.slice(0, 3).map((path) => rel(root, path)).join(", ")}`);
    earned += 4;
  }
  if (jsonFiles.length >= 2) {
    evidence.push(`${jsonFiles.length} fixture files`);
    earned += 2;
  }
  const mockText = jsFiles.map((path) => readText(path).toLowerCase()).join("\n");
  if (/app\.(get|post)\(|router\.(get|post)\(/.test(mockText)) {
    evidence.push("mock exposes Express routes");
    earned += 2;
  }
  return [status(Math.min(earned, 8), 8), Math.min(earned, 8), evidence];
}

function checkTT10(root, js) {
  if (!sourceFiles(root).length) return ["ABSENT", 0, ["no schema module — data contract not implemented"]];
  const evidence = [];
  let earned = 0;
  const schema = sourceFiles(root).filter((path) => basename(path).toLowerCase().includes("schema"));
  const jsonFiles = walk(root).filter((path) => extname(path) === ".json"
    && !["package.json", "package-lock.json"].includes(basename(path)));
  if (schema.length) {
    evidence.push(`schema module: ${schema.slice(0, 3).map((path) => rel(root, path)).join(", ")}`);
    earned += 2;
  } else if (js.includes("schemaversion")) {
    evidence.push("schemaVersion declared in source, but no dedicated schema module");
    earned += 1;
  } else evidence.push("no schema module found");
  if (jsonFiles.length) {
    evidence.push(`${jsonFiles.length} JSON data files`);
    earned += 2;
  } else evidence.push("no JSON fixtures/payloads committed");
  return [status(earned, 4), earned, evidence];
}

function checkTT11(root, pkg, js) {
  const validators = ["zod", "ajv", "joi", "valibot", "yup", "superstruct"];
  if (!pkg) return ["ABSENT", 0, ["no package.json — no boundary validation"]];
  const deps = dependencies(pkg);
  const hit = validators.filter((validator) => validator in deps);
  const evidence = [];
  let earned = 0;
  if (hit.length) {
    evidence.push(`validator declared: ${hit.join(", ")}`);
    earned += 2;
    if (hit.some((validator) => js.includes(validator))) {
      evidence.push("validator imported in source");
      earned += 1;
    }
  } else {
    // The stack requires boundary validation, not a specific library: a hand-written
    // validation module with structured diagnostics counts, at partial credit.
    const module = sourceFiles(root).find((path) => /validate|validator|schema/i.test(basename(path)));
    if (module) {
      evidence.push(`hand-written validation module: ${rel(root, module)}`);
      evidence.push("no schema library (zod/ajv/joi/valibot) declared");
      earned += 2;
    } else {
      evidence.push("no boundary validation module or schema library found");
      return ["ABSENT", 0, evidence];
    }
  }
  return [status(earned, 3), earned, evidence];
}

function checkTT12(pkg, js) {
  const deps = dependencies(pkg);
  if (!pkg) return ["ABSENT", 0, ["no package.json — no export writers"]];
  const sheet = ["exceljs", "xlsx", "sheetjs"].filter((name) => name in deps);
  const pdf = ["pdfkit", "jspdf", "puppeteer", "playwright", "pdf-lib"].filter((name) => name in deps);
  const evidence = [];
  let earned = 0;
  if (sheet.length) {
    evidence.push(`xlsx: ${sheet.join(", ")}`);
    earned += 1;
  }
  if (pdf.length) {
    evidence.push(`pdf: ${pdf.join(", ")}`);
    earned += 1;
  }
  if (js.includes("csv") || "papaparse" in deps || "csv-stringify" in deps) {
    evidence.push("csv exporter referenced");
    earned += 1;
  }
  if (!evidence.length) evidence.push("no CSV/XLSX/PDF tooling declared");
  return [status(earned, 3), earned, evidence];
}

function checkTT13(root) {
  if (!sourceFiles(root).length) {
    return ["ABSENT", 0, ["no persistence layer — JSON fixtures not yet behind a repository"]];
  }
  const repositories = sourceFiles(root).filter((path) => /repo(sitory)?|store|storage/i.test(basename(path)));
  const productionSources = sourceFiles(root).filter((path) => !basename(path).toLowerCase().includes("test"));
  const productionText = productionSources.map((path) => readText(path).toLowerCase()).join("\n");
  const hasWrites = ["writefile", "createreadstream", "sqlite", "localstorage"]
    .some((word) => productionText.includes(word));
  const dataDirs = hasDir(root, "data", "db", "fixtures", "store");
  const evidence = [];
  let earned = 0;
  if (repositories.length) {
    evidence.push(`repository module: ${repositories.slice(0, 3).map((path) => rel(root, path)).join(", ")}`);
    earned += 3;
  } else evidence.push("no repository/store module found");
  if (!repositories.length) {
    return ["ABSENT", 0, [...evidence, "no repository boundary yet — JSON is written directly by modules"]];
  }
  if (dataDirs.length || productionText.includes("sqlite")) {
    evidence.push("JSON data store present behind the boundary");
    earned += 1;
  }
  return [status(earned, 4), earned, evidence];
}

function checkTT14(root, pkg) {
  if (!pkg) return ["ABSENT", 0, ["no package.json — dependencies not declared"]];
  const evidence = [];
  let earned = 2;
  evidence.push(`package.json declares ${Object.keys(dependencies(pkg)).length} dependencies`);
  const locks = LOCKFILES.filter((file) => existsSync(join(root, file)));
  if (locks.length) {
    evidence.push(`lockfile: ${locks.join(", ")}`);
    earned += 2;
  } else evidence.push("no lockfile");
  return [status(earned, 4), earned, evidence];
}

function checkTT15(root, pkg) {
  const evidence = [];
  let earned = 0;
  const scripts = pkg?.scripts || {};
  const readme = join(root, "README.md");
  const docs = existsSync(readme) ? readText(readme).toLowerCase() : "";
  if (Object.keys(scripts).length) {
    evidence.push(`npm scripts available: ${Object.keys(scripts).sort().join(", ")}`);
    earned += 2;
  }
  if (/local|without (the )?(website|server|api)/.test(docs)) {
    evidence.push("README documents a local run path");
    earned += 2;
  }
  if (!evidence.length) return ["ABSENT", 0, ["no scripts and no local-run documentation"]];
  return [status(earned, 4), earned, evidence];
}

function checkTT16(root) {
  const evidence = [];
  let earned = 0;
  const readme = join(root, "README.md");
  if (existsSync(readme) && readText(readme).toLowerCase().includes("shared tech stack")) {
    evidence.push("README has a Shared tech stack section");
    earned += 1;
  }
  const log = join(root, "log.md");
  if (existsSync(log) && readText(log).split(/\r?\n/).length > 5) {
    evidence.push("log.md records change entries");
    earned += 1;
  }
  if (!evidence.length) return ["ABSENT", 0, ["no stack section and no log"]];
  return [status(earned, 2), earned, evidence];
}

const CHECKS = new Map([
  ["TT1", (root, pkg, js) => checkTT1(root, pkg, js)],
  ["TT2", (root, pkg, js) => checkTT2(root, pkg, js)],
  ["TT3", (root, pkg, js) => checkTT3(root, pkg, js)],
  ["TT4", (root, pkg, js) => checkTT4(root, pkg, js)],
  ["TT5", (root, pkg, js) => checkTT5(root, pkg, js)],
  ["TT6", (root, pkg, js) => checkTT6(root, pkg, js)],
  ["TT7", (root, pkg, js) => checkTT7(root, pkg, js)],
  ["TT8", (root, pkg, js) => checkTT8(root, pkg, js)],
  ["TT9", (root, pkg, js) => checkTT9(root, pkg, js)],
  ["TT10", (root, pkg, js) => checkTT10(root, js)],
  ["TT11", (root, pkg, js) => checkTT11(root, pkg, js)],
  ["TT12", (root, pkg, js) => checkTT12(pkg, js)],
  ["TT13", (root) => checkTT13(root)],
  ["TT14", (root, pkg) => checkTT14(root, pkg)],
  ["TT15", (root, pkg) => checkTT15(root, pkg)],
  ["TT16", (root) => checkTT16(root)],
]);

const DOC_DEVIATIONS = [
  [/\.py\b/i, "Python module filenames in the plan"],
  [/\bOR-?Tools\b|CP-?SAT/i, "OR-Tools/CP-SAT — no official JavaScript CP-SAT; would need a second runtime"],
  [/\bFastAPI\b|\bPydantic\b/i, "Python web stack"],
  [/\bTypeScript\b|\.tsx\b/i, "TypeScript"],
  [/\bDjango\b|\bFlask\b/i, "Python web framework"],
];
const NEGATION = /\b(do not|don't|never|no second|no native|no official|forbid|instead|avoid|not introduce|replace|kills?|prohibit|not supported)\b/i;

export function scanDocs(root) {
  const findings = [];
  const docs = readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".md")
      && entry.name.toLowerCase() !== "log.md")
    .map((entry) => join(root, entry.name));
  for (const path of docs) {
    readText(path).split(/\r?\n/).forEach((line, index) => {
      if (NEGATION.test(line)) return;
      for (const [pattern, issue] of DOC_DEVIATIONS) {
        if (pattern.test(line)) {
          findings.push({
            file: rel(root, path),
            line: index + 1,
            issue,
            text: line.trim().slice(0, 160),
          });
        }
      }
    });
  }
  return findings;
}

export async function build(rootPath) {
  const root = resolve(rootPath);
  const pkg = loadPackage(root);
  const js = jsText(root);
  const rubric = await loadRubric(RUBRIC);
  const items = rubric.map((row) => {
    const check = CHECKS.get(row.id);
    if (!check) throw new Error(`No tech-stack check is implemented for ${row.id}.`);
    const [itemStatus, earned, evidence] = check(root, pkg, js);
    return { ...row, status: itemStatus, earned, evidence };
  });
  const total = items.reduce((sum, item) => sum + item.earned, 0);
  const maximum = items.reduce((sum, item) => sum + item.max, 0);
  const blockers = items.filter((item) => item.severity === "blocker");
  const blockersFailed = blockers.filter((item) => item.status === "FAIL").map((item) => item.id);
  const blockersOpen = blockers.filter((item) => ["ABSENT", "PARTIAL"].includes(item.status))
    .map((item) => item.id);
  const gatePass = blockersFailed.length === 0 && blockersOpen.length === 0;
  let verdict;
  if (blockersFailed.length) verdict = "NON-CONFORMANT — blocker violations present";
  else if (blockersOpen.length) verdict = "NOT YET CONFORMANT — blocker items not built or only partial";
  else verdict = "CONFORMANT — all blocker items pass";
  return {
    root,
    date: new Date().toISOString().slice(0, 10),
    total,
    max: maximum,
    pct: Math.round((100 * total / maximum + Number.EPSILON) * 10) / 10,
    gate_pass: gatePass,
    verdict,
    blockers_failed: blockersFailed,
    blockers_open: blockersOpen,
    items,
    doc_deviations: scanDocs(root),
    absent: items.filter((item) => item.status === "ABSENT").length,
  };
}

export function printScorecard(result) {
  console.log(`tech-stack conformance — ${result.root}`);
  console.log(`date ${result.date}   score ${result.total}/${result.max} (${result.pct}%)`);
  console.log(`verdict: ${result.verdict}`);
  if (result.blockers_failed.length) console.log(`blocker violations: ${result.blockers_failed.join(", ")}`);
  if (result.blockers_open.length) console.log(`blockers not yet satisfied: ${result.blockers_open.join(", ")}`);
  console.log();
  console.log(`${"id".padStart(4)} ${"sev".padStart(11)} ${"status".padStart(8)} ${"pts".padStart(7)}  item`);
  for (const item of result.items) {
    console.log(`${item.id.padStart(4)} ${item.severity.padStart(11)} ${item.status.padStart(8)} ${`${item.earned}/${item.max}`.padStart(7)}  ${item.item}`);
  }
  console.log();
  for (const item of result.items) {
    console.log(`${item.id} [${item.status}] ${item.item}`);
    for (const evidence of item.evidence) console.log(`    - ${evidence}`);
  }
  if (result.doc_deviations.length) {
    console.log("\ndoc-level stack deviations (plan the builders will follow):");
    for (const item of result.doc_deviations) {
      console.log(`  ${item.file}:${item.line}  ${item.issue}`);
      console.log(`      ${item.text}`);
    }
  }
}

export function toMarkdown(result) {
  const lines = [
    `# Tech-stack conformance report — ${result.date}`,
    "",
    `Scanned root: \`${result.root}\``,
    "",
    `**Score ${result.total}/${result.max} (${result.pct}%) — ${result.verdict}**`,
    "",
  ];
  if (result.blockers_failed.length) {
    lines.push(`Blocker violations: ${result.blockers_failed.join(", ")}`, "");
  }
  if (result.blockers_open.length) {
    lines.push(`Blockers not yet satisfied: ${result.blockers_open.join(", ")}`, "");
  }
  lines.push("| ID | Severity | Status | Points | Item |", "|---|---|---|---|---|");
  for (const item of result.items) {
    lines.push(`| ${item.id} | ${item.severity} | ${item.status} | ${item.earned}/${item.max} | ${item.item} |`);
  }
  lines.push("", "## Evidence per item", "");
  for (const item of result.items) {
    lines.push(`### ${item.id} — ${item.item}  ·  ${item.status} (${item.earned}/${item.max})`);
    lines.push(`Requirement: ${item.requirement}`);
    for (const evidence of item.evidence) lines.push(`- ${evidence}`);
    lines.push("");
  }
  if (result.doc_deviations.length) {
    lines.push("## Doc-level stack deviations", "", "| File | Line | Issue | Text |", "|---|---|---|---|");
    for (const finding of result.doc_deviations) {
      lines.push(`| ${finding.file} | ${finding.line} | ${finding.issue} | \`${finding.text.slice(0, 120)}\` |`);
    }
    lines.push("");
  }
  lines.push(
    "## Notes",
    "",
    "- `rating tools/` is excluded from the product scan: it is build-time tooling, not product backend code.",
    "- ABSENT means the artefact does not exist yet; FAIL means it exists and breaks the stack. ABSENT scores 0 but should be read as 'not yet built', not 'built wrong'.",
    "",
  );
  return lines.join("\n");
}

function parseArgs(args) {
  const options = { root: resolve(HERE, ".."), json: false, writeReport: false };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--root") {
      if (!args[index + 1]) throw new Error("--root requires a directory path.");
      options.root = args[++index];
    } else if (args[index] === "--json") options.json = true;
    else if (args[index] === "--write-report") options.writeReport = true;
    else throw new Error(`Unknown option: ${args[index]}`);
  }
  return options;
}

export async function main(args = process.argv.slice(2)) {
  try {
    const options = parseArgs(args);
    const root = resolve(options.root);
    if (!existsSync(root)) throw new Error(`${root} does not exist.`);
    const result = await build(root);
    if (options.json) console.log(JSON.stringify(result, null, 2));
    else printScorecard(result);
    if (options.writeReport) {
      const output = join(HERE, "reports");
      mkdirSync(output, { recursive: true });
      const markdownPath = join(output, "techstack-report.md");
      const scoresPath = join(output, "techstack-scores.csv");
      writeFileSync(markdownPath, toMarkdown(result), "utf8");
      const rows = [
        stringifyCsvRow(["id", "score", "evidence"]),
        ...result.items.map((item) => stringifyCsvRow([
          item.id,
          item.earned,
          item.evidence.join(" | ").slice(0, 300),
        ])),
      ];
      writeFileSync(scoresPath, `${rows.join("\n")}\n`, "utf8");
      console.log(`\nwrote ${markdownPath}\nwrote ${scoresPath}`);
    }
    return result.gate_pass ? 0 : 1;
  } catch (error) {
    console.error(`error: ${error.message}`);
    return 2;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
