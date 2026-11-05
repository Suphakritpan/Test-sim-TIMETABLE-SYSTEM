// Ingest tests: unit checks for the Thai-source parsers, then an end-to-end run on the
// real workbook/guideline in `start folder/` (counts, pins, provenance, determinism).

import { test } from "node:test"
import assert from "node:assert/strict"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

import { normalizeCode, parseDayPeriod, classifyKind, classifyRoom, parseGroupTitle, maxPeriodFor } from "./schema.mjs"
import { ingest, OPEN_QUESTIONS } from "./cli.mjs"

const ROOT = resolve(import.meta.dirname, "..", "..")
const PDF = join(ROOT, "start folder", "guideline.pdf")
const XLSX = join(ROOT, "start folder", "data.xlsx")

async function withOutDir(fn) {
  const dir = await mkdtemp(join(tmpdir(), "ingest-test-"))
  try {
    return await fn(dir)
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}

test("normalizeCode repairs spacing without losing digits", () => {
  assert.equal(normalizeCode("21909 - 1001"), "21909-1001")
  assert.equal(normalizeCode("20000 -1603"), "20000-1603")
  assert.equal(normalizeCode("20000 - 2001"), "20000-2001")
  assert.equal(normalizeCode("21909-1010"), "21909-1010")
  assert.equal(normalizeCode("รายวิชาสามัญ"), null)
  assert.equal(normalizeCode(""), null)
})

test("parseDayPeriod reads Thai weekday spellings and ranges", () => {
  assert.deepEqual(parseDayPeriod("จัดอยู่ในวันจันทร์คาบที่ 1-2"), { day: "Mon", startPeriod: 1, endPeriod: 2, width: 2 })
  assert.deepEqual(parseDayPeriod("จัดอยู่ในวันอังคารคาบที่ 6-7"), { day: "Tue", startPeriod: 6, endPeriod: 7, width: 2 })
  assert.deepEqual(parseDayPeriod("จัดอยู่ในวันพุธคาบที่ 3-5"), { day: "Wed", startPeriod: 3, endPeriod: 5, width: 3 })
  // "พฤหัส" and "พฤหัสบดี" are the same day
  assert.deepEqual(parseDayPeriod("จัดอยู่ในวันพฤหัสคาบที่ 8-9"), { day: "Thu", startPeriod: 8, endPeriod: 9, width: 2 })
  assert.deepEqual(parseDayPeriod("ต้องว่างวันพุธคาบที่ 1-4"), { day: "Wed", startPeriod: 1, endPeriod: 4, width: 4 })
  assert.equal(parseDayPeriod(""), null)
  assert.equal(parseDayPeriod("ไม่มีกำหนด"), null)
})

test("classifyKind separates theory, practical and activity", () => {
  assert.equal(classifyKind("ทฤษฎี", "ภาษาไทยเพื่อการสื่อสาร"), "theory")
  assert.equal(classifyKind("ปฏิบัติ", "งานไฟฟ้าและอิเล็กทรอนิกส์เบื้องต้น"), "practical")
  assert.equal(classifyKind("ทฤษฎี", "กิจกรรมลูกเสือวิสามัญ 1"), "activity")
  assert.equal(classifyKind("ทฤษฎี", "กิจกรรมองค์การวิชาชีพ 2"), "activity")
  assert.equal(classifyKind("อื่น ๆ", "x"), null)
})

test("classifyRoom maps the source room phrases to room classes", () => {
  assert.equal(classifyRoom("ใช้ห้องคอมพิวเตอร์").roomClass, "COM")
  assert.equal(classifyRoom("ใช้ห้องปฏิบัติการ").roomClass, "LAB")
  assert.equal(classifyRoom("ใช้ห้องคอมพิวเตอร์หรือห้องปฏิบัติการ").roomClass, "COM_OR_LAB")
  assert.equal(classifyRoom("ห้องเรียนภาษาไทย").roomClass, "GENERAL")
  assert.equal(classifyRoom("ห้องเรียนภาษาไทย").roomLabel, "ห้องเรียนภาษาไทย")
  assert.equal(classifyRoom("แผนกวิชา").roomClass, "DEPARTMENT")
  assert.equal(classifyRoom(""), null)
})

test("parseGroupTitle expands the level's group list", () => {
  assert.deepEqual(parseGroupTitle("2 กลุ่ม ทค.1/1-2"), ["ทค.1/1", "ทค.1/2"])
  assert.deepEqual(parseGroupTitle("2 กลุ่ม ทค.3/1-2"), ["ทค.3/1", "ทค.3/2"])
  assert.deepEqual(parseGroupTitle("no groups here"), [])
})

test("maxPeriodFor follows guideline item 1", () => {
  assert.equal(maxPeriodFor("ปวช.1"), 9)
  assert.equal(maxPeriodFor("ปวช.2"), 11)
  assert.equal(maxPeriodFor("ปวช.3"), 11)
})

test("ingest reproduces the source workbook exactly", async () => {
  await withOutDir(async (dir) => {
    const res = await ingest({ pdfPath: PDF, xlsxPath: XLSX, outDir: dir })
    assert.equal(res.ok, true, `ingest reported errors: ${JSON.stringify(res.errors)}`)

    assert.deepEqual(res.counts, {
      subjects: 33, teachers: 5, rooms: 6, externalRooms: 5, departmentRooms: 1,
      groups: 6, levels: 3, constraints: 22,
    })

    const pkg = JSON.parse(await readFile(res.canonicalPath, "utf8"))
    assert.equal(pkg.schemaVersion, 1)

    // every subject keeps provenance and original values
    for (const s of pkg.subjects) {
      assert.ok(s.sourceRef?.sheet && s.sourceRef?.row, `subject ${s.id} lost provenance`)
      assert.ok(s.originalValues?.code, `subject ${s.id} lost its original code`)
    }
    // normalizations were recorded, not applied silently
    assert.ok(pkg.normalizations.some((n) => n.kind === "subject-code"))
    // H1–H20 + S1,S2 coverage
    const ids = new Set(pkg.constraints.map((c) => c.id))
    for (let i = 1; i <= 20; i++) assert.ok(ids.has(`H${i}`), `missing H${i}`)
    assert.ok(ids.has("S1") && ids.has("S2"))
  })
})

test("ingest derives per-level period totals and pins from the source", async () => {
  await withOutDir(async (dir) => {
    const res = await ingest({ pdfPath: PDF, xlsxPath: XLSX, outDir: dir })
    const byLevel = Object.fromEntries(res.levels.map((l) => [l.levelId, l]))
    assert.equal(byLevel["ปวช.1"].derivedPeriods, 36)
    assert.equal(byLevel["ปวช.2"].derivedPeriods, 37)
    assert.equal(byLevel["ปวช.3"].derivedPeriods, 34)
    // printed totals disagree with the rows — kept as a warning, not silently trusted
    assert.equal(byLevel["ปวช.1"].printedTotal, 50)
    assert.equal(byLevel["ปวช.3"].printedTotal, 48)
    assert.ok(res.warnings.some((w) => w.code === "W_PRINTED_TOTAL"))

    const pins = res.package.subjects.filter((s) => s.pin)
    assert.equal(pins.length, 13)
    // activity courses are pinned to Thursday 6–7
    for (const s of pins.filter((p) => p.kind === "activity")) {
      assert.equal(s.pin.day, "Thu")
      assert.equal(s.pin.startPeriod, 6)
      assert.equal(s.pin.endPeriod, 7)
    }
    // groups come from the sheet titles, not from a hardcoded list
    assert.deepEqual(res.package.groups.map((g) => g.id), ["ทค.1/1", "ทค.1/2", "ทค.2/1", "ทค.2/2", "ทค.3/1", "ทค.3/2"])
  })
})

test("ingest is deterministic: two runs produce identical bytes", async () => {
  await withOutDir(async (dirA) => {
    await withOutDir(async (dirB) => {
      const a = await ingest({ pdfPath: PDF, xlsxPath: XLSX, outDir: dirA })
      const b = await ingest({ pdfPath: PDF, xlsxPath: XLSX, outDir: dirB })
      const [ja, jb] = await Promise.all([
        readFile(a.canonicalPath, "utf8"),
        readFile(b.canonicalPath, "utf8"),
      ])
      assert.equal(ja, jb, "canonical.json changed between runs")
      const [ra, rb] = await Promise.all([
        readFile(a.reportPath, "utf8"),
        readFile(b.reportPath, "utf8"),
      ])
      assert.equal(ra, rb, "import-report.md changed between runs")
      // out dirs differ, so nothing absolute may leak into the artifacts
      assert.ok(!ja.includes(dirA), "absolute output path leaked into canonical.json")
    })
  })
})

test("ingest refuses a missing workbook instead of writing an empty package", async () => {
  await withOutDir(async (dir) => {
    const res = await ingest({ pdfPath: PDF, xlsxPath: join(ROOT, "start folder", "nope.xlsx"), outDir: dir })
    assert.equal(res.ok, false)
    assert.ok(res.errors.some((e) => e.code === "E_READ_XLSX"))
    assert.equal(res.package, null)
  })
})

test("open questions are carried without volatile timestamps", () => {
  assert.equal(OPEN_QUESTIONS.length, 8)
  for (const q of OPEN_QUESTIONS) {
    assert.ok(q.id && q.question)
    assert.equal(q.date, undefined, `${q.id} must not carry a timestamp (determinism)`)
  }
})
