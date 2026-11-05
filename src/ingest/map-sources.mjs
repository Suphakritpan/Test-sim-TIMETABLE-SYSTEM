// Map workbook rows and the reviewed guideline rules into canonical records,
// keeping original values and provenance for every mapped value.

import {
  schemaVersion,
  normalizeCode,
  parseDayPeriod,
  classifyKind,
  classifyRoom,
  parseGroupTitle,
  maxPeriodFor,
  roleBands,
  kindAttendance,
  allowedDays,
  lunchAllowedPeriods,
  roomClassPermits,
} from "./schema.mjs"

const SECTION_GENERAL = /รายวิชาสามัญ/
const SECTION_DEPT = /รายวิชาของแผนก/
const HEADER_CODE = /รหัสวิชา/
const TEACHER_SHEET = /^(ครู|teachers?)$/i

const ROLE_MAP = [
  [/หัวหน้าแผนก/, "head_dept"],
  [/หัวหน้างาน/, "head_work"],
  [/ครูประจำ/, "regular"],
]

function cell(row, i) {
  const v = row[i]
  return v === null || v === undefined ? "" : typeof v === "string" ? v.trim() : String(v).trim()
}

function sourceRef(file, sheet, row) {
  return { file, sheet, row }
}

// ---------------------------------------------------------------- subjects
export function mapSubjectRows({ sheet, sourceFile }) {
  const levelId = sheet.name.trim()
  const subjects = []
  const normalizations = []
  const warnings = []
  let groups = []
  let section = null
  let printedTotal = null

  for (const { rowIndex, raw } of sheet.rawRows) {
    const cells = raw.map((_, i) => cell(raw, i))
    const nonEmpty = cells.filter((c) => c !== "")

    // Title row: "2 กลุ่ม ทค.1/1-2"
    if (!groups.length) {
      const parsed = parseGroupTitle(cells[0] || "")
      if (parsed.length) groups = parsed
    }
    // Section marker row: only one non-empty cell, "รายวิชาสามัญ" / "รายวิชาของแผนกวิชา"
    if (nonEmpty.length === 1) {
      if (SECTION_GENERAL.test(nonEmpty[0])) { section = "general"; continue }
      if (SECTION_DEPT.test(nonEmpty[0])) { section = "department"; continue }
    }
    if (HEADER_CODE.test(cells[0])) continue

    const code = normalizeCode(cells[0])
    if (!code) {
      // Totals row: no code, no name, a single numeric cell (e.g. 50 / 48)
      if (!cells[0] && !cells[1]) {
        const numeric = cells.find((c) => /^\d+$/.test(c))
        if (numeric) printedTotal = Number(numeric)
      }
      continue
    }
    if (cells[0] !== code) {
      normalizations.push({
        kind: "subject-code",
        from: cells[0],
        to: code,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }

    const name = cells[1]
    const periodsRaw = cells[2]
    const periods = Number(periodsRaw)
    const kind = classifyKind(cells[3], name)
    const room = classifyRoom(cells[5])
    const pinText = cells[4]
    let pin = null
    if (pinText) {
      const parsed = parseDayPeriod(pinText)
      if (parsed) {
        pin = { day: parsed.day, startPeriod: parsed.startPeriod, endPeriod: parsed.endPeriod }
        const dayTh = pinText.match(/วัน\s*(จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์)/)
        if (dayTh && dayTh[1] === "พฤหัส") {
          normalizations.push({
            kind: "weekday-spelling",
            from: "พฤหัส",
            to: "Thu (พฤหัสบดี)",
            sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
          })
        }
      } else {
        warnings.push({
          code: "W_PIN_UNPARSED",
          message: `Instruction "${pinText}" on ${sheet.name} row ${rowIndex} could not be parsed into a day/period pin.`,
          sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
        })
      }
    }

    if (!kind) {
      warnings.push({
        code: "W_KIND_UNKNOWN",
        message: `Subject ${code} has unrecognized ประเภทวิชา "${cells[3]}".`,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }
    if (!room) {
      warnings.push({
        code: "W_ROOM_UNKNOWN",
        message: `Subject ${code} has unrecognized ห้องที่ใช้สอน "${cells[5]}".`,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }
    if (!Number.isInteger(periods) || periods <= 0) {
      warnings.push({
        code: "W_PERIODS_INVALID",
        message: `Subject ${code} has non-positive ชั่วโมง "${periodsRaw}".`,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }

    // Flag the general-room label swaps seen in the source (an English course pinned to
    // the Thai classroom and vice versa). Reported, never auto-corrected.
    const label = room?.roomLabel || ""
    const labelSaysThai = /ภาษาไทย/.test(label)
    const labelSaysEnglish = /อังกฤษ/.test(label)
    if (label && ((labelSaysThai && /อังกฤษ/.test(name)) || (labelSaysEnglish && /ภาษาไทย/.test(name)))) {
      warnings.push({
        code: "W_ROOM_LABEL_SWAP",
        message: `General subject ${code} (${name}) is assigned ${label} — the room labels may be swapped in the source (open question Q8).`,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }

    subjects.push({
      id: code,
      name,
      levelId,
      periods,
      kind: kind || "theory",
      category: section === "general" ? "general" : "department",
      roomClass: room?.roomClass || "GENERAL",
      roomLabel: room?.roomLabel ?? null,
      attendance: kindAttendance[kind || "theory"],
      groupIds: groups.slice(),
      pin,
      sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      originalValues: {
        code: cells[0],
        name,
        periods: periodsRaw,
        kind: cells[3],
        requirement: pinText,
        room: cells[5],
      },
    })
  }

  return { levelId, groups, subjects, printedTotal, normalizations, warnings }
}

// ---------------------------------------------------------------- teachers
export function mapTeacherRows({ sheet, sourceFile }) {
  const teachers = []
  const warnings = []
  for (const { rowIndex, raw } of sheet.rawRows) {
    const name = cell(raw, 0)
    const roleTh = cell(raw, 1)
    const extra = cell(raw, 2)
    if (!name || /รายชื่อครู/.test(name)) continue
    const role = ROLE_MAP.find(([re]) => re.test(roleTh))?.[1] || null
    if (!role) {
      warnings.push({
        code: "W_ROLE_UNKNOWN",
        message: `Teacher "${name}" has unrecognized ตำแหน่ง "${roleTh}".`,
        sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
      })
    }
    const band = role ? roleBands[role] : null
    const unavailability = []
    if (extra) {
      const parsed = parseDayPeriod(extra)
      if (parsed) {
        unavailability.push({ day: parsed.day, startPeriod: parsed.startPeriod, endPeriod: parsed.endPeriod })
      } else {
        warnings.push({
          code: "W_TEACHER_CONSTRAINT_UNPARSED",
          message: `Teacher "${name}" constraint "${extra}" could not be parsed.`,
          sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
        })
      }
    }
    teachers.push({
      id: `T${teachers.length + 1}`,
      name,
      role: role || "regular",
      roleLabelTh: roleTh,
      minDepartmentHours: band?.min ?? null,
      maxDepartmentHours: band?.max ?? null,
      maxTeachingLoad: band?.max ?? null,
      unavailability,
      sourceRef: sourceRef(sourceFile, sheet.name, rowIndex),
    })
  }
  return { teachers, warnings }
}

// ---------------------------------------------------------------- rooms
export function buildRooms(subjects) {
  const rooms = [
    { id: "COM1", name: "COM1", type: "COM" },
    { id: "COM2", name: "COM2", type: "COM" },
    { id: "COM3", name: "COM3", type: "COM" },
    { id: "COM4", name: "COM4", type: "COM" },
    { id: "LAB1", name: "LAB1", type: "LAB" },
    { id: "LAB2", name: "LAB2", type: "LAB" },
  ]
  // Department assembly room (activity courses, Thursday 6–7).
  const departmentRooms = [{ id: "DEPT", name: "แผนกวิชา", type: "DEPARTMENT" }]
  // General subjects use reusable external classrooms (guideline item 8 / rule H9).
  const externalRooms = []
  const seen = new Map()
  for (const s of subjects) {
    if (s.roomClass !== "GENERAL" || !s.roomLabel) continue
    if (!seen.has(s.roomLabel)) {
      const id = `EXT${seen.size + 1}`
      seen.set(s.roomLabel, id)
      externalRooms.push({ id, name: s.roomLabel, type: "EXTERNAL", reusable: true })
    }
  }
  return { rooms, departmentRooms, externalRooms, roomClassPermits }
}

// ---------------------------------------------------------------- constraints
// IDs follow the independent validator's scheme (conflict tools/validate.mjs) so
// ingest, engine and validator speak the same rule language.
const RULES = [
  ["H1", 1, "ปวช.1 เรียนไม่เกินคาบ 9 ระดับอื่นไม่เกินคาบ 11", { maxPeriodByLevel: { "ปวช.1": 9, other: 11 } }],
  ["H2", 1, "ครูไม่มีคาบพักได้", { teacherBreakRequired: false }],
  ["H3", 2, "มีชั่วโมงพัก 1 ชั่วโมง พักได้คาบ 4, 5 หรือ 6 ทุกชั้นปี", { hours: 1, allowedPeriods: lunchAllowedPeriods }],
  ["H4", 3, "รายวิชากิจกรรมและลูกเสืออยู่ในคาบที่ 6-7 ของวันพฤหัสบดี", { day: "Thu", startPeriod: 6, endPeriod: 7, kinds: ["activity"] }],
  ["H5", 4, "วิชาทฤษฎีเรียนรวม 2 กลุ่ม วิชาปฏิบัติเรียนแยกกลุ่ม 1, 2", { theory: "merged", practical: "separate" }],
  ["H6", 5, "หัวหน้าแผนกและหัวหน้างานสอน 24–28 ชม.", { roles: ["head_dept", "head_work"], min: 24, max: 28 }],
  ["H7", 5, "ครูประจำแผนกสอน 30–38 ชม.", { roles: ["regular"], min: 30, max: 38 }],
  ["H8", 6, "ห้องคอมพิวเตอร์ 4 ห้อง (COM1–COM4) และห้องปฏิบัติการ 2 ห้อง (LAB1–LAB2) ใช้ให้ถูกประเภท", { computerRooms: ["COM1", "COM2", "COM3", "COM4"], labRooms: ["LAB1", "LAB2"] }],
  ["H9", 8, "รายวิชาสามัญใช้ห้องเรียนภายนอก ใช้ห้องซ้ำได้", { roomType: "EXTERNAL", reusable: true }],
  ["H10", 9, "ห้ามฉีกชั่วโมงเรียน ต้องเรียนติดต่อกัน", { contiguous: true }],
  ["H11", 10, "รายวิชาสามัญไม่นำมาคิดชั่วโมงครูในแผนก", { excludedCategory: "general" }],
  ["H12", 11, "ครูคนเดียวกันต้องไม่สอนซ้อนเวลา", { noTeacherOverlap: true }],
  ["H13", 12, "ห้องเรียนเดียวกันต้องไม่ถูกใช้ซ้อนเวลา", { noRoomOverlap: true }],
  ["H14", 13, "กลุ่มเรียนหรือนักศึกษาต้องไม่เรียนซ้อนเวลา", { noGroupOverlap: true }],
  ["H15", 14, "จำนวนคาบต้องครบตามที่กำหนด", { exactPeriods: true }],
  ["H16", 15, "ไม่จัดสอนในช่วงเวลาที่ครูหรือห้องไม่พร้อม", { respectUnavailability: true }],
  ["H17", 16, "ไม่เกินภาระสอนสูงสุดที่กำหนด", { respectMaxLoad: true }],
  ["H18", 17, "นักเรียนเริ่มเรียนในคาบที่ 1 ทุกชั้นปี", { startPeriod: 1 }],
  ["H19", 18, "จัดตารางในวันจันทร์-ศุกร์", { allowedDays }],
  ["H20", 19, "นักเรียนต้องมีเรียนทุกวัน", { classEveryWeekday: true }],
]

const SYSTEM_RULES = [
  ["S1", 1, "ระบบสามารถนำเข้าข้อมูล รายวิชา ครู ห้อง เวลา และโจทย์จากกรรมการ", { import: true }],
  ["S2", 2, "ระบบสามารถส่งออกตารางสอน ตารางรายบุคคล เว็บ และ PDF/Excel", { export: true }],
]

export function buildConstraints(sourceFile) {
  const hard = RULES.map(([id, item, text, parameters]) => ({
    id,
    text,
    severity: "hard",
    parameters,
    citation: { file: sourceFile, section: "แนวทางปฏิบัติในการจัดตารางสอน", item },
  }))
  const system = SYSTEM_RULES.map(([id, item, text, parameters]) => ({
    id,
    text,
    severity: "system",
    parameters,
    citation: { file: sourceFile, section: "แนวทางปฏิบัติในการจัดทำระบบ", item },
  }))
  return { constraints: [...hard, ...system], hardRuleIds: hard.map((r) => r.id), systemRuleIds: system.map((r) => r.id) }
}

// ---------------------------------------------------------------- package
export function buildCanonicalPackage(parts) {
  return {
    schemaVersion,
    generatedBy: "src/ingest",
    sources: parts.sources,
    levels: parts.levels,
    groups: parts.groups,
    subjects: parts.subjects,
    teachers: parts.teachers,
    rooms: parts.rooms,
    departmentRooms: parts.departmentRooms,
    externalRooms: parts.externalRooms,
    constraints: parts.constraints,
    unresolvedQuestions: parts.unresolvedQuestions,
    normalizations: parts.normalizations,
  }
}

export function levelRecord(levelId) {
  return { id: levelId, maxPeriod: maxPeriodFor(levelId) }
}

export function groupRecords(levelId, groups) {
  return groups.map((g) => ({ id: g, levelId }))
}

export { allowedDays, lunchAllowedPeriods }
