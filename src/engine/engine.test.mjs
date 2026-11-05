import test from "node:test"
import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { buildEngineModel, runEngine, solveSchedule } from "./index.mjs"

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"]

function dailyFixture() {
  const subjects = weekdays.map((day, index) => ({
    id: `S${index + 1}`,
    name: `Subject ${index + 1}`,
    levelId: "L1",
    periods: 1,
    kind: "theory",
    category: "department",
    roomClass: "DEPARTMENT",
    groupIds: ["G1"],
    pin: { day, startPeriod: 1, endPeriod: 1 },
    sourceRef: { file: "fixture.xlsx", sheet: "L1", row: index + 2 },
  }))
  return {
    schemaVersion: 1,
    levels: [{ id: "L1", maxPeriod: 5 }],
    groups: [{ id: "G1", levelId: "L1" }],
    subjects,
    teachers: [{ id: "T1", role: "other", maxTeachingLoad: 50, unavailability: [] }],
    rooms: [],
    departmentRooms: [{ id: "D1", name: "Department", type: "DEPARTMENT" }],
    constraints: [
      ...Array.from({ length: 20 }, (_, index) => ({ id: `H${index + 1}` })),
      { id: "S1" },
      { id: "S2" },
    ],
    unresolvedQuestions: [],
  }
}

test("expands practical attendance into one block per group and merges theory", () => {
  const pkg = dailyFixture()
  pkg.groups.push({ id: "G2", levelId: "L1" })
  pkg.subjects = [
    { ...pkg.subjects[0], id: "THEORY", groupIds: ["G1", "G2"] },
    { ...pkg.subjects[1], id: "PRACTICAL", kind: "practical", groupIds: ["G1", "G2"] },
  ]
  const { model, errors } = buildEngineModel(pkg, {
    teacherBySubject: { THEORY: "T1", PRACTICAL: "T1" },
  })
  assert.deepEqual(errors, [])
  assert.deepEqual(model.blocks.map(({ subjectId, groupIds }) => [subjectId, groupIds]), [
    ["PRACTICAL", ["G1"]],
    ["PRACTICAL", ["G2"]],
    ["THEORY", ["G1", "G2"]],
  ])
})

test("blocks without explicit teacher assignments instead of guessing", () => {
  const result = runEngine(dailyFixture())
  assert.equal(result.status, "blocked")
  assert.equal(result.diagnostics[0].code, "TEACHER_ASSIGNMENTS_REQUIRED")
  assert.equal(result.diagnostics[0].subjects.length, 5)
  assert.equal(result.diagnostics[0].unresolvedQuestion, "Q2")
})

test("solves, independently validates, and reproduces the same schedule", () => {
  const pkg = dailyFixture()
  const options = { teacherBySubject: Object.fromEntries(pkg.subjects.map((subject) => [subject.id, "T1"])) }
  const first = runEngine(pkg, options)
  const second = runEngine(pkg, options)

  assert.equal(first.status, "complete")
  assert.equal(first.certification, "clean")
  assert.equal(first.validation.valid, true)
  assert.deepEqual(first.schedule, second.schedule)
  assert.deepEqual(first.schedule.lunches.map((lunch) => lunch.period), [4, 4, 4, 4, 4])
})

test("reports invalid schema versions as input errors", () => {
  const result = runEngine({ ...dailyFixture(), schemaVersion: 2 })
  assert.equal(result.status, "invalid-input")
  assert.match(result.diagnostics[0].message, /schemaVersion 2/)
})

test("names the room conflict when pinned activities require one room simultaneously", () => {
  const subjects = ["L1", "L2"].map((levelId, index) => ({
    id: `S${index + 1}`,
    levelId,
    periods: 2,
    kind: "activity",
    category: "department",
    roomClass: "DEPARTMENT",
    groupIds: [],
  }))
  const model = {
    calendar: { days: weekdays, periodsPerDay: 9 },
    levels: [{ id: "L1", maxPeriod: 9 }, { id: "L2", maxPeriod: 9 }],
    groups: [],
    subjects,
    teachers: [
      { id: "T1", maxTeachingLoad: 10, unavailable: [] },
      { id: "T2", maxTeachingLoad: 10, unavailable: [] },
    ],
    rooms: [{ id: "DEPT", type: "DEPARTMENT", unavailable: [] }],
    lunchPeriods: [4, 5, 6],
    blocks: subjects.map((subject, index) => ({
      id: `B${index + 1}`,
      subjectId: subject.id,
      levelId: subject.levelId,
      groupIds: [],
      teacherId: `T${index + 1}`,
      length: 2,
      kind: "activity",
      category: "department",
      roomClass: "DEPARTMENT",
      sourceRef: { file: "fixture.xlsx", sheet: subject.levelId, row: 1 },
    })),
  }
  const result = solveSchedule(model)

  assert.equal(result.status, "unschedulable")
  assert.equal(result.conflicts[0].ruleId, "H13")
  assert.deepEqual(result.conflicts[0].blockIds, ["B1", "B2"])
  assert.equal(result.conflicts[0].sourceRefs.length, 2)
})

test("CLI writes a validated result for explicit assignments", () => {
  const directory = mkdtempSync(join(tmpdir(), "timetable-engine-"))
  try {
    const pkg = dailyFixture()
    const inputPath = join(directory, "canonical.json")
    const assignmentsPath = join(directory, "assignments.json")
    const outputPath = join(directory, "result.json")
    writeFileSync(inputPath, JSON.stringify(pkg))
    writeFileSync(assignmentsPath, JSON.stringify({
      teacherBySubject: Object.fromEntries(pkg.subjects.map((subject) => [subject.id, "T1"])),
    }))
    const cliPath = fileURLToPath(new URL("./cli.mjs", import.meta.url))
    const run = spawnSync(process.execPath, [
      cliPath,
      "--input", inputPath,
      "--assignments", assignmentsPath,
      "--out", outputPath,
    ], { encoding: "utf8" })

    assert.equal(run.status, 0, run.stderr)
    const result = JSON.parse(readFileSync(outputPath, "utf8"))
    assert.equal(result.status, "complete")
    assert.equal(result.validation.valid, true)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})
