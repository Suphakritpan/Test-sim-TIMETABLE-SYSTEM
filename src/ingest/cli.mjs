// Ingest CLI + reusable core.
//   node src/ingest/cli.mjs --pdf <guideline.pdf> --xlsx <data.xlsx> --out <dir>
//        [--overrides <json>] [--guideline-text <txt>] [--json] [--no-strict-counts]
//
// The same core (`ingest`) is what an Express route must call. No server, browser,
// network or database is required to run it.

import { createHash } from "node:crypto"
import { readFile } from "node:fs/promises"
import { pathToFileURL } from "node:url"
import { resolve } from "node:path"

import { extractGuidelineText, readGuidelineTextFile } from "./pdf-text.mjs"
import { readWorkbook } from "./read-workbook.mjs"
import {
  mapSubjectRows,
  mapTeacherRows,
  buildRooms,
  buildConstraints,
  buildCanonicalPackage,
  levelRecord,
  groupRecords,
} from "./map-sources.mjs"
import { validateIngestPackage } from "./validate-input.mjs"
import { writeCanonicalPackage, writeImportReport } from "./write-package.mjs"
import { schemaVersion } from "./schema.mjs"

export const DEFAULT_EXPECTED = { subjects: 33, teachers: 5, rooms: 6, groups: 6, levels: 3 }

const sha256 = (buf) => createHash("sha256").update(buf).digest("hex")

// The eight owner questions from draftplan.md §10. No dates: the package must stay
// byte-identical between runs.
export const OPEN_QUESTIONS = [
  { id: "Q1", question: "The workbook prints 50 (ปวช.1) and 48 (ปวช.3) but the subject rows sum to 36 and 34 periods per group. Which figure is authoritative?", blocks: ["ingest totals check", "engine capacity check"] },
  { id: "Q2", question: "The workbook assigns no teacher to any subject. Does the department supply teacher↔subject links, or must the engine decide and record them?", blocks: ["engine resource assignment"] },
  { id: "Q3", question: "All three levels have an activity course pinned to Thursday 6–7 in room 'แผนกวิชา'. Are these separate rooms, or one shared assembly slot?", blocks: ["engine placement", "room double-booking check"] },
  { id: "Q4", question: "Do activity/scout courses count toward a teacher's department hours? Guideline item 10 exempts only รายวิชาสามัญ.", blocks: ["engine load bands"] },
  { id: "Q5", question: "What are the clock times for periods 1–11 (needed for the 17:30 / 19:30 presentation, not for solving)?", blocks: ["exports"] },
  { id: "Q6", question: "Is the lunch period fixed per level, or may the scheduler choose any of periods 4, 5, 6 per day?", blocks: ["engine placement"] },
  { id: "Q7", question: "For COM_OR_LAB subjects (คณิตศาสตร์คอมพิวเตอร์, โครงงานด้านช่างเทคนิคคอมพิวเตอร์, เทคโนโลยีอากาศยานไร้คนขับ), may the solver choose COM vs LAB?", blocks: ["engine resource assignment"] },
  { id: "Q8", question: "General-room labels look swapped in ปวช.2/ปวช.3 (Thai-language course in ห้องเรียนภาษาไทย vs English course, and vice versa). Is that intentional?", blocks: ["ingest normalization", "exports"] },
]

function parseArgs(argv) {
  const args = { out: "output", json: false, strictCounts: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === "--pdf") args.pdf = argv[++i]
    else if (a === "--xlsx") args.xlsx = argv[++i]
    else if (a === "--out") args.out = argv[++i]
    else if (a === "--overrides") args.overrides = argv[++i]
    else if (a === "--guideline-text") args.guidelineText = argv[++i]
    else if (a === "--json") args.json = true
    else if (a === "--no-strict-counts") args.strictCounts = false
    else if (a === "--help" || a === "-h") args.help = true
  }
  return args
}

const USAGE = `Usage: node src/ingest/cli.mjs --pdf <guideline.pdf> --xlsx <data.xlsx> --out <dir>
       [--overrides <json>] [--guideline-text <pre-extracted.txt>] [--json] [--no-strict-counts]

Exit codes: 0 clean, 1 blocking errors, 2 usage, 3 missing PDF extraction tooling.`

export async function ingest(options = {}) {
  const {
    pdfPath,
    xlsxPath,
    outDir = "output",
    overridesPath,
    guidelineTextPath,
    expectedCounts = DEFAULT_EXPECTED,
    strictCounts = true,
  } = options

  if (!xlsxPath) throw new Error("ingest() requires xlsxPath")
  if (!pdfPath && !guidelineTextPath) throw new Error("ingest() requires pdfPath or guidelineTextPath")

  const errors = []
  const warnings = []
  const normalizations = []
  const sources = []

  // ---- 1. guideline text
  const doc = guidelineTextPath
    ? await readGuidelineTextFile(guidelineTextPath, outDir)
    : await extractGuidelineText(pdfPath, outDir)
  if (doc.error) {
    return { ok: false, errors: [{ code: doc.code, severity: "blocking", message: doc.message }], warnings, sources, counts: null, package: null }
  }
  if (pdfPath) {
    const buf = await readFile(resolve(pdfPath)).catch(() => null)
    sources.push({ file: pdfPath, format: "pdf", textArtifact: "guideline.txt", sha256: buf ? sha256(buf) : null })
  } else {
    sources.push({ file: guidelineTextPath, format: "text", textArtifact: "guideline.txt" })
  }

  // ---- 2. workbook
  const wb = await readWorkbook(xlsxPath)
  if (wb.error) {
    return { ok: false, errors: [{ code: wb.code, severity: "blocking", message: wb.message }], warnings, sources, counts: null, package: null }
  }
  const xlsxBuf = await readFile(resolve(xlsxPath)).catch(() => null)
  const xlsxHash = xlsxBuf ? sha256(xlsxBuf) : null

  // ---- 3. map sheets
  const levelIds = []
  const groups = []
  const subjects = []
  const printedTotals = new Map()
  let teachers = []
  const teacherSheetNames = []

  for (const sheet of wb.sheets) {
    const firstCell = String(sheet.rawRows[0]?.raw?.[0] ?? "").trim()
    const isTeacherSheet = /ครู/.test(sheet.name) || /รายชื่อครู/.test(firstCell)
    if (isTeacherSheet) {
      teacherSheetNames.push(sheet.name)
      const mapped = mapTeacherRows({ sheet, sourceFile: xlsxPath })
      teachers = teachers.concat(mapped.teachers)
      warnings.push(...mapped.warnings)
      sources.push({ file: xlsxPath, format: "xlsx", sheet: sheet.name, sha256: xlsxHash })
      continue
    }

    const mapped = mapSubjectRows({ sheet, sourceFile: xlsxPath })
    if (!mapped.subjects.length) {
      warnings.push({
        code: "W_EMPTY_SHEET",
        message: `Sheet "${sheet.name}" produced no subject rows.`,
        sourceRef: { file: xlsxPath, sheet: sheet.name },
      })
    }
    if (!levelIds.includes(mapped.levelId)) levelIds.push(mapped.levelId)
    for (const g of mapped.groups) if (!groups.some((x) => x.id === g)) groups.push({ id: g, levelId: mapped.levelId })
    subjects.push(...mapped.subjects)
    printedTotals.set(mapped.levelId, mapped.printedTotal)
    normalizations.push(...mapped.normalizations)
    warnings.push(...mapped.warnings)
    sources.push({ file: xlsxPath, format: "xlsx", sheet: sheet.name, sha256: xlsxHash })
  }

  // ---- 4. rooms, rules, levels
  const { rooms, departmentRooms, externalRooms } = buildRooms(subjects)
  const { constraints, hardRuleIds, systemRuleIds } = buildConstraints(pdfPath || guidelineTextPath)
  const levels = levelIds.map(levelRecord)

  // ---- 5. per-level derived period totals (printed vs derived, draftplan §2.1)
  const levelSummary = levels.map((lvl) => {
    const own = subjects.filter((s) => s.levelId === lvl.id)
    const derivedPeriods = own.reduce((sum, s) => sum + (Number.isFinite(s.periods) ? s.periods : 0), 0)
    const printedTotal = printedTotals.get(lvl.id) ?? null
    if (printedTotal !== null && printedTotal !== derivedPeriods) {
      warnings.push({
        code: "W_PRINTED_TOTAL",
        message: `${lvl.id}: workbook prints ${printedTotal} periods but the subject rows total ${derivedPeriods}. Kept as open question Q1; the row sum is used.`,
        sourceRef: { file: xlsxPath, sheet: lvl.id },
      })
    }
    return { levelId: lvl.id, subjects: own.length, derivedPeriods, printedTotal }
  })

  // ---- 6. optional committee overrides
  let overrides = null
  if (overridesPath) {
    try {
      overrides = JSON.parse(await readFile(resolve(overridesPath), "utf8"))
      sources.push({ file: overridesPath, format: "json", sha256: null })
    } catch (err) {
      errors.push({ code: "E_OVERRIDES", severity: "blocking", message: `Cannot read overrides ${overridesPath}: ${err.message}` })
    }
  }

  // ---- 7. package + validation
  const pkg = buildCanonicalPackage({
    sources,
    levels,
    groups,
    subjects,
    teachers,
    rooms,
    departmentRooms,
    externalRooms,
    constraints,
    unresolvedQuestions: OPEN_QUESTIONS,
    normalizations,
  })
  if (overrides) pkg.overrides = overrides

  const validation = validateIngestPackage(pkg, {
    expectedCounts: strictCounts ? expectedCounts : undefined,
  })
  errors.push(...validation.errors)
  warnings.push(...validation.warnings)

  const counts = {
    subjects: subjects.length,
    teachers: teachers.length,
    rooms: rooms.length,
    externalRooms: externalRooms.length,
    departmentRooms: departmentRooms.length,
    groups: groups.length,
    levels: levels.length,
    constraints: constraints.length,
  }

  // ---- 8. write artifacts (canonical.json must not contain the error list, so the
  // package stays stable whether or not validation passed)
  const canonicalPath = await writeCanonicalPackage(pkg, outDir)
  const reportPath = await writeImportReport(
    {
      schemaVersion,
      sources,
      counts,
      expectedCounts: strictCounts ? expectedCounts : null,
      coverage: { hardRules: hardRuleIds.length, systemRules: systemRuleIds.length },
      levels: levelSummary,
      pins: subjects
        .filter((s) => s.pin)
        .map((s) => ({ id: s.id, name: s.name, levelId: s.levelId, ...s.pin, roomClass: s.roomClass, roomLabel: s.roomLabel })),
      teachers,
      normalizations,
      errors,
      warnings,
      guidelineChecks: doc.checks,
      unresolvedQuestions: OPEN_QUESTIONS,
    },
    outDir
  )

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    counts,
    levels: levelSummary,
    canonicalPath,
    reportPath,
    guidelineTextPath: doc.txtPath,
    guidelineChecks: doc.checks,
    package: pkg,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    console.log(USAGE)
    return 0
  }
  if (!args.xlsx || (!args.pdf && !args.guidelineText)) {
    console.error(USAGE)
    return 2
  }

  const result = await ingest({
    pdfPath: args.pdf,
    xlsxPath: args.xlsx,
    outDir: args.out,
    overridesPath: args.overrides,
    guidelineTextPath: args.guidelineText,
    strictCounts: args.strictCounts,
  }).catch((err) => ({ ok: false, errors: [{ code: "E_INTERNAL", message: err.message }], warnings: [], counts: null }))

  if (args.json) {
    console.log(JSON.stringify({
      ok: result.ok,
      counts: result.counts,
      errors: result.errors,
      warnings: result.warnings,
      canonicalPath: result.canonicalPath,
      reportPath: result.reportPath,
    }, null, 2))
  } else {
    if (result.counts) {
      console.log(`[ingest] subjects=${result.counts.subjects} teachers=${result.counts.teachers} ` +
                  `rooms=${result.counts.rooms} groups=${result.counts.groups} levels=${result.counts.levels}`)
    }
    if (result.guidelineChecks) console.log(`[ingest] ${result.guidelineChecks.message}`)
    for (const w of result.warnings) console.warn(`[ingest] warning ${w.code}: ${w.message}`)
    for (const e of result.errors) console.error(`[ingest] ERROR ${e.code}: ${e.message}`)
    if (result.canonicalPath) console.log(`[ingest] wrote ${result.canonicalPath}`)
    if (result.reportPath) console.log(`[ingest] wrote ${result.reportPath}`)
    console.log(`[ingest] ${result.ok ? "clean" : "FAILED"}`)
  }

  if (result.errors.some((e) => e.code === "E_PDFTOTEXT_MISSING")) return 3
  return result.ok ? 0 : 1
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href
if (invokedDirectly) {
  main().then((code) => process.exit(code))
}
