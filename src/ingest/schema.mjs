// Canonical JSON schema for timetable ingest (schema v1).
// This is the versioned contract that the engine and the independent validator share.
// Do not add volatile values (timestamps, absolute paths) to anything that is compared.

export const schemaVersion = 1

export const allowedKinds = ["theory", "practical", "activity"]
export const allowedCategories = ["general", "department"]
export const allowedRoomClasses = ["COM", "LAB", "COM_OR_LAB", "GENERAL", "DEPARTMENT"]
export const allowedRoomTypes = ["COM", "LAB", "EXTERNAL", "DEPARTMENT"]
export const allowedDays = ["Mon", "Tue", "Wed", "Thu", "Fri"]
export const allowedRoles = ["head_dept", "head_work", "regular"]

export const lunchAllowedPeriods = [4, 5, 6]
export const maxPeriodByLevel = { "ปวช.1": 9 }
export const defaultMaxPeriod = 11

// Rule bands for department teaching hours (guideline item 5; validator rules H6/H7).
export const roleBands = {
  head_dept: { min: 24, max: 28, ruleId: "H6" },
  head_work: { min: 24, max: 28, ruleId: "H6" },
  regular: { min: 30, max: 38, ruleId: "H7" },
}

// roomClass -> permitted physical room types
export const roomClassPermits = {
  COM: ["COM"],
  LAB: ["LAB"],
  COM_OR_LAB: ["COM", "LAB"],
  GENERAL: ["EXTERNAL"],
  DEPARTMENT: ["DEPARTMENT"],
}

// attendance format by subject kind (guideline item 4 / rule H5)
export const kindAttendance = { theory: "merged", activity: "merged", practical: "separate" }

// ------------------------------------------------------------------ Thai tokens
const DAY_ALIASES = {
  จันทร์: "Mon", จ: "Mon", monday: "Mon", mon: "Mon",
  อังคาร: "Tue", อ: "Tue", tuesday: "Tue", tue: "Tue",
  พุธ: "Wed", พ: "Wed", wednesday: "Wed", wed: "Wed",
  พฤหัสบดี: "Thu", พฤหัส: "Thu", พฤ: "Thu", thursday: "Thu", thu: "Thu",
  ศุกร์: "Fri", ศ: "Fri", friday: "Fri", fri: "Fri",
}

export function normalizeDay(text) {
  if (!text) return null
  const t = String(text).trim()
  for (const [th, day] of Object.entries(DAY_ALIASES)) {
    if (t === th || t.toLowerCase() === th) return day
  }
  return null
}

// "21909 - 1001" -> "21909-1001"; "20000 -1603" -> "20000-1603"; invalid -> null
export function normalizeCode(raw) {
  if (raw === null || raw === undefined) return null
  const m = String(raw).trim().match(/^(\d{5})\s*-\s*(\d{4})$/)
  return m ? `${m[1]}-${m[2]}` : null
}

// "จัดอยู่ในวันจันทร์คาบที่ 1-2" -> { day:"Mon", startPeriod:1, endPeriod:2 }
// "ต้องว่างวันพุธคาบที่ 1-4"      -> { day:"Wed", startPeriod:1, endPeriod:4 }
export function parseDayPeriod(text) {
  if (!text) return null
  const m = String(text).match(
    /วัน\s*(จันทร์|อังคาร|พุธ|พฤหัสบดี|พฤหัส|ศุกร์)\s*(?:คาบที่|คาบ)\s*(\d{1,2})\s*(?:[-–—]\s*(\d{1,2}))?/
  )
  if (!m) return null
  const day = normalizeDay(m[1])
  if (!day) return null
  const startPeriod = Number(m[2])
  const endPeriod = m[3] !== undefined ? Number(m[3]) : startPeriod
  if (startPeriod < 1 || endPeriod < startPeriod) return null
  return { day, startPeriod, endPeriod, width: endPeriod - startPeriod + 1 }
}

// ประเภทวิชา + name -> kind (activity wins: activity/scout courses are listed as theory)
export function classifyKind(typeTh, name = "") {
  const t = `${name}`
  if (/กิจกรรม|ลูกเสือ/.test(t)) return "activity"
  if (/ปฏิบัติ/.test(typeTh || "")) return "practical"
  if (/ทฤษฎี/.test(typeTh || "")) return "theory"
  return null
}

// ห้องที่ใช้สอน -> { roomClass, roomLabel }
export function classifyRoom(roomTh) {
  const t = String(roomTh || "").trim()
  if (!t) return null
  if (t.includes("หรือ")) return { roomClass: "COM_OR_LAB", roomLabel: null }
  if (t.includes("ปฏิบัติการ")) return { roomClass: "LAB", roomLabel: null }
  if (t.includes("คอมพิวเตอร์")) return { roomClass: "COM", roomLabel: null }
  if (t.includes("แผนก")) return { roomClass: "DEPARTMENT", roomLabel: t }
  if (t.startsWith("ห้องเรียน")) return { roomClass: "GENERAL", roomLabel: t }
  return null
}

// "2 กลุ่ม ทค.1/1-2" -> ["ทค.1/1","ทค.1/2"]
export function parseGroupTitle(text) {
  if (!text) return []
  const m = String(text).match(/(\d+)\s*กลุ่ม\s*([^\s/]+)\/(\d+)\s*-\s*(\d+)/)
  if (!m) return []
  const count = Number(m[1])
  const dept = m[2]
  const first = Number(m[3])
  const last = Number(m[4])
  const groups = []
  for (let i = 0; i < count; i++) {
    const n = first + i
    if (n > last) break
    groups.push(`${dept}/${n}`)
  }
  return groups
}

export function maxPeriodFor(levelId) {
  return maxPeriodByLevel[levelId] ?? defaultMaxPeriod
}
