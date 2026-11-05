import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { validateSchedule } from "./validate.mjs";

const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function basicFixture() {
  const groups = [
    { id: "g1", levelId: "l1" },
    { id: "g2", levelId: "l1" },
  ];
  const subjects = weekdays.map((day, index) => ({
    id: `s${index + 1}`,
    name: `Subject ${index + 1}`,
    levelId: "l1",
    periods: 1,
    kind: "theory",
    category: "department",
    roomClass: "DEPARTMENT",
    groupIds: groups.map((group) => group.id),
  }));
  return {
    schemaVersion: 1,
    calendar: { days: weekdays, periodsPerDay: 9 },
    levels: [{ id: "l1", name: "Level 1", maxPeriod: 9 }],
    groups,
    subjects,
    teachers: [{ id: "t1", role: "other", maxTeachingLoad: 40, unavailable: [] }],
    rooms: [{ id: "r1", type: "DEPARTMENT", unavailable: [] }],
    lunches: weekdays.map((day) => ({ levelId: "l1", day, period: 4 })),
    sessions: weekdays.map((day, index) => ({
      id: `x${index + 1}`,
      subjectId: `s${index + 1}`,
      groupIds: groups.map((group) => group.id),
      teacherId: "t1",
      roomId: "r1",
      day,
      startPeriod: 1,
      length: 1,
    })),
  };
}

function ruleIds(data) {
  return new Set(validateSchedule(data).violations.map((item) => item.ruleId));
}

function loadFixture(role, count, category = "department") {
  const data = basicFixture();
  data.groups = [{ id: "g1", levelId: "l1" }];
  data.levels[0].maxPeriod = 9;
  data.rooms = [{ id: "r1", type: "EXTERNAL", unavailable: [] }];
  data.teachers = [{
    id: "t1",
    role,
    maxTeachingLoad: 50,
    unavailable: [],
  }];
  data.subjects = [];
  data.sessions = [];
  const availableSlots = weekdays.flatMap((day) =>
    [1, 2, 3, 5, 6, 7, 8, 9].map((period) => ({ day, period })));
  for (let index = 0; index < count; index += 1) {
    const id = `load-${index + 1}`;
    const { day, period } = availableSlots[index];
    data.subjects.push({
      id,
      name: id,
      levelId: "l1",
      periods: 1,
      kind: "theory",
      category,
      roomClass: "GENERAL",
      groupIds: ["g1"],
    });
    data.sessions.push({
      id: `session-${id}`,
      subjectId: id,
      groupIds: ["g1"],
      teacherId: "t1",
      roomId: "r1",
      day,
      startPeriod: period,
      length: 1,
    });
  }
  return data;
}

test("accepts a complete conflict-free schedule", () => {
  const report = validateSchedule(basicFixture());
  assert.equal(report.valid, true);
  assert.deepEqual(report.violations, []);
});

test("H1 catches sessions past a level's end period", () => {
  const data = basicFixture();
  data.levels[0].maxPeriod = 1;
  data.sessions[0].length = 2;
  assert.ok(ruleIds(data).has("H1"));
});

test("H2 does not impose a teacher break", () => {
  const data = basicFixture();
  data.levels.push({ id: "l2", name: "Level 2", maxPeriod: 9 });
  data.groups.push({ id: "g3", levelId: "l2" });
  data.subjects.push({
    id: "s6",
    name: "Second level",
    levelId: "l2",
    periods: 1,
    kind: "theory",
    category: "department",
    roomClass: "DEPARTMENT",
    groupIds: ["g3"],
  });
  data.sessions.push({
    id: "x6",
    subjectId: "s6",
    groupIds: ["g3"],
    teacherId: "t1",
    roomId: "r1",
    day: "Mon",
    startPeriod: 4,
    length: 1,
  });
  data.lunches.push(...weekdays.map((day) => ({
    levelId: "l2",
    day,
    period: 5,
  })));
  assert.ok(!ruleIds(data).has("H2"));
});

test("H3 checks the declared lunch slot is free", () => {
  const data = basicFixture();
  data.sessions[1].startPeriod = 4;
  data.lunches[1].period = 4;
  assert.ok(ruleIds(data).has("H3"));
});

test("H4 pins activities to Thursday periods 6–7", () => {
  const data = basicFixture();
  data.subjects[0].kind = "activity";
  data.sessions[0].startPeriod = 2;
  assert.ok(ruleIds(data).has("H4"));
});

test("H5 enforces merged theory attendance", () => {
  const data = basicFixture();
  data.sessions[0].groupIds = ["g1"];
  assert.ok(ruleIds(data).has("H5"));
});

test("H5 requires practical sessions to be split by group", () => {
  const data = basicFixture();
  data.subjects[0].kind = "practical";
  assert.ok(ruleIds(data).has("H5"));

  const split = basicFixture();
  split.subjects[0].kind = "practical";
  split.sessions[0].groupIds = ["g1"];
  split.sessions.push({
    ...split.sessions[0],
    id: "split-g2",
    groupIds: ["g2"],
    day: "Tue",
    startPeriod: 2,
  });
  assert.ok(!ruleIds(split).has("H5"));
});

test("H6 enforces head role department-hour bands", () => {
  assert.ok(ruleIds(loadFixture("head_dept", 5)).has("H6"));
  assert.ok(ruleIds(loadFixture("head_work", 5)).has("H6"));
});

test("H7 enforces regular teacher department-hour bands", () => {
  assert.ok(ruleIds(loadFixture("regular", 5)).has("H7"));
});

test("H8 enforces computer and lab room types", () => {
  const data = basicFixture();
  data.subjects[0].roomClass = "COM";
  data.rooms[0].type = "COM";
  data.rooms[0].name = "COM5";
  assert.ok(ruleIds(data).has("H8"));
});

test("H9 requires general subjects to use external classrooms", () => {
  const data = basicFixture();
  data.subjects[0].category = "general";
  assert.ok(ruleIds(data).has("H9"));
});

test("H9 allows external classrooms to be reused", () => {
  const data = basicFixture();
  data.rooms[0].type = "EXTERNAL";
  data.subjects[0].category = "general";
  data.subjects[0].roomClass = "GENERAL";
  data.teachers.push({ id: "t2", role: "other", maxTeachingLoad: 40, unavailable: [] });
  data.subjects.push({
    ...data.subjects[0],
    id: "external-subject",
    groupIds: ["g2"],
  });
  data.sessions.push({
    ...data.sessions[0],
    id: "external-overlap",
    subjectId: "external-subject",
    groupIds: ["g2"],
    teacherId: "t2",
  });
  const report = validateSchedule(data);
  assert.ok(!report.violations.some((item) => item.ruleId === "H13"));
});

test("H10 catches split blocks for one attendance group", () => {
  const data = basicFixture();
  data.sessions.push({
    ...data.sessions[0],
    id: "split",
    day: "Tue",
    startPeriod: 2,
  });
  assert.ok(ruleIds(data).has("H10"));
});

test("H11 excludes general subjects from department load bands", () => {
  const data = loadFixture("regular", 40);
  for (const subject of data.subjects.slice(30)) subject.category = "general";
  assert.ok(!ruleIds(data).has("H7"));
  assert.ok(!ruleIds(data).has("H17"));
});

test("H12 catches teacher overlaps", () => {
  const data = basicFixture();
  data.sessions.push({
    ...data.sessions[0],
    id: "teacher-overlap",
    groupIds: ["g1"],
  });
  assert.ok(ruleIds(data).has("H12"));
});

test("H13 catches non-reusable room overlaps", () => {
  const data = basicFixture();
  data.rooms.push({ id: "r2", type: "DEPARTMENT", unavailable: [] });
  data.teachers.push({ id: "t2", role: "other", maxTeachingLoad: 40, unavailable: [] });
  data.subjects.push({
    ...data.subjects[0],
    id: "second-subject",
    groupIds: ["g2"],
  });
  data.sessions.push({
    ...data.sessions[0],
    id: "room-overlap",
    subjectId: "second-subject",
    groupIds: ["g2"],
    teacherId: "t2",
    roomId: "r1",
  });
  assert.ok(ruleIds(data).has("H13"));
});

test("H14 catches group overlaps", () => {
  const data = basicFixture();
  data.rooms.push({ id: "r2", type: "DEPARTMENT", unavailable: [] });
  data.teachers.push({ id: "t2", role: "other", maxTeachingLoad: 40, unavailable: [] });
  data.subjects.push({
    ...data.subjects[0],
    id: "second-subject",
    groupIds: ["g1"],
  });
  data.sessions.push({
    ...data.sessions[0],
    id: "group-overlap",
    subjectId: "second-subject",
    groupIds: ["g1"],
    teacherId: "t2",
    roomId: "r2",
  });
  assert.ok(ruleIds(data).has("H14"));
});

test("H15 checks exact subject period counts", () => {
  const data = basicFixture();
  data.sessions[0].length = 2;
  assert.ok(ruleIds(data).has("H15"));
});

test("H16 catches teacher and room unavailability", () => {
  const teacherCase = basicFixture();
  teacherCase.teachers[0].unavailable = [
    { day: "Mon", startPeriod: 1, endPeriod: 1 },
  ];
  assert.ok(ruleIds(teacherCase).has("H16"));

  const roomCase = basicFixture();
  roomCase.rooms[0].unavailable = [
    { day: "Tue", startPeriod: 1, endPeriod: 1 },
  ];
  assert.ok(ruleIds(roomCase).has("H16"));
});

test("H17 enforces the declared maximum teaching load", () => {
  const data = basicFixture();
  data.teachers[0].maxTeachingLoad = 4;
  assert.ok(ruleIds(data).has("H17"));
});

test("H18 requires each group to start at period 1 each day", () => {
  const data = basicFixture();
  data.sessions[2].startPeriod = 2;
  assert.ok(ruleIds(data).has("H18"));
});

test("H19 rejects weekend sessions", () => {
  const data = basicFixture();
  data.sessions[0].day = "Sat";
  assert.ok(ruleIds(data).has("H19"));
});

test("H20 requires classes every weekday", () => {
  const data = basicFixture();
  data.sessions = data.sessions.filter((session) => session.day !== "Fri");
  assert.ok(ruleIds(data).has("H20"));
});

test("CLI emits the JSON conflict report and a success exit code", () => {
  const directory = mkdtempSync(join(tmpdir(), "timetable-conflicts-"));
  try {
    const inputPath = join(directory, "schedule.json");
    const cliPath = fileURLToPath(new URL("./cli.mjs", import.meta.url));
    writeFileSync(inputPath, JSON.stringify(basicFixture()));
    const run = spawnSync(process.execPath, [cliPath, inputPath, "--json"], {
      encoding: "utf8",
    });
    assert.equal(run.status, 0, run.stderr);
    assert.equal(JSON.parse(run.stdout).valid, true);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
