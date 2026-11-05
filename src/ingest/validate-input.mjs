// Boundary validation for the canonical ingest package.
// Blocking errors stop the run; warnings travel with the package for owner review.

import {
  schemaVersion,
  allowedKinds,
  allowedCategories,
  allowedRoomClasses,
  allowedRoomTypes,
  allowedDays,
  allowedRoles,
  lunchAllowedPeriods,
  maxPeriodFor,
  roleBands,
} from "./schema.mjs"

const E = (code, message, sourceRef) => ({ code, severity: "blocking", message, sourceRef })
const W = (code, message, sourceRef) => ({ code, severity: "warning", message, sourceRef })

const isPosInt = (v) => Number.isInteger(v) && v > 0

export function validateIngestPackage(pkg, { expectedCounts } = {}) {
  const errors = []
  const warnings = []

  if (pkg.schemaVersion !== schemaVersion) {
    return {
      errors: [E("E1", `Unsupported schemaVersion ${pkg.schemaVersion}; expected ${schemaVersion}.`)],
      warnings,
    }
  }

  for (const key of ["levels", "groups", "subjects", "teachers", "rooms", "constraints"]) {
    if (!Array.isArray(pkg[key])) errors.push(E("E2", `Package field "${key}" must be an array.`))
  }
  if (errors.length) return { errors, warnings }

  const levelIds = new Set(pkg.levels.map((l) => l.id))
  const groupIds = new Set(pkg.groups.map((g) => g.id))
  const roomIds = new Set(pkg.rooms.map((r) => r.id))

  // ---- levels / groups
  for (const lvl of pkg.levels) {
    if (!lvl.id) errors.push(E("E3", "Level is missing an id."))
    if (!isPosInt(lvl.maxPeriod) || lvl.maxPeriod > 11) {
      errors.push(E("E3", `Level ${lvl.id} has invalid maxPeriod ${lvl.maxPeriod}.`))
    }
    if (lvl.id && lvl.maxPeriod !== maxPeriodFor(lvl.id)) {
      warnings.push(W("W_MAXPERIOD", `Level ${lvl.id} maxPeriod ${lvl.maxPeriod} differs from the rule table (${maxPeriodFor(lvl.id)}).`))
    }
  }
  for (const g of pkg.groups) {
    if (!levelIds.has(g.levelId)) errors.push(E("E9", `Group ${g.id} references unknown level ${g.levelId}.`))
  }

  // ---- subjects
  const seenSubjects = new Set()
  for (const s of pkg.subjects) {
    const ref = s.sourceRef
    if (!s.id || typeof s.id !== "string") errors.push(E("E3", "Subject is missing an id.", ref))
    if (seenSubjects.has(s.id)) errors.push(E("E4", `Duplicate subject id ${s.id}.`, ref))
    seenSubjects.add(s.id)

    if (!levelIds.has(s.levelId)) errors.push(E("E9", `Subject ${s.id} references unknown level ${s.levelId}.`, ref))
    if (!allowedKinds.includes(s.kind)) errors.push(E("E5", `Subject ${s.id} has invalid kind "${s.kind}".`, ref))
    if (!allowedCategories.includes(s.category)) errors.push(E("E6", `Subject ${s.id} has invalid category "${s.category}".`, ref))
    if (!allowedRoomClasses.includes(s.roomClass)) errors.push(E("E7", `Subject ${s.id} has invalid roomClass "${s.roomClass}".`, ref))
    if (!isPosInt(s.periods) || s.periods > 11) errors.push(E("E8", `Subject ${s.id} has invalid periods "${s.periods}".`, ref))
    if (!Array.isArray(s.groupIds) || s.groupIds.length === 0) {
      errors.push(E("E10", `Subject ${s.id} has no groups.`, ref))
    } else {
      for (const gid of s.groupIds) {
        if (!groupIds.has(gid)) errors.push(E("E10", `Subject ${s.id} references unknown group ${gid}.`, ref))
      }
    }
    if (!ref || ref.sheet === undefined || ref.row === undefined) {
      errors.push(E("E16", `Subject ${s.id} is missing a sheet/row source reference.`, ref))
    }

    if (s.pin) {
      const { day, startPeriod, endPeriod } = s.pin
      if (!allowedDays.includes(day)) errors.push(E("E14", `Subject ${s.id} pin day "${day}" is not Mon–Fri.`, ref))
      const maxP = maxPeriodFor(s.levelId)
      if (!isPosInt(startPeriod) || startPeriod > maxP) {
        errors.push(E("E15", `Subject ${s.id} pin startPeriod ${startPeriod} is outside 1..${maxP}.`, ref))
      }
      if (!isPosInt(endPeriod) || endPeriod < startPeriod || endPeriod > maxP) {
        errors.push(E("E15", `Subject ${s.id} pin endPeriod ${endPeriod} is invalid for ${s.levelId} (max ${maxP}).`, ref))
      }
      if (isPosInt(startPeriod) && isPosInt(endPeriod) && endPeriod - startPeriod + 1 !== s.periods) {
        warnings.push(
          W(
            "W_PIN_WIDTH",
            `Subject ${s.id} is pinned days ${startPeriod}–${endPeriod} (${endPeriod - startPeriod + 1} periods) but declares ${s.periods} periods.`,
            ref
          )
        )
      }
    }
    if (s.category === "general" && s.roomClass !== "GENERAL") {
      warnings.push(W("W_GENERAL_ROOM", `General subject ${s.id} is not mapped to an external classroom.`, ref))
    }
  }

  // ---- same-level pin collisions (a data conflict, not a solver problem)
  const pinSlots = new Map()
  for (const s of pkg.subjects) {
    if (!s.pin) continue
    for (let p = s.pin.startPeriod; p <= s.pin.endPeriod; p++) {
      const key = `${s.levelId}|${s.pin.day}|${p}`
      if (pinSlots.has(key)) {
        const other = pinSlots.get(key)
        errors.push(E("E17", `Pinned subjects ${other} and ${s.id} both occupy ${s.pin.day} period ${p} in ${s.levelId}.`, s.sourceRef))
      } else {
        pinSlots.set(key, s.id)
      }
    }
  }

  // ---- teachers
  const seenTeachers = new Set()
  for (const t of pkg.teachers) {
    if (!t.id) errors.push(E("E3", "Teacher is missing an id.", t.sourceRef))
    if (seenTeachers.has(t.id)) errors.push(E("E4", `Duplicate teacher id ${t.id}.`, t.sourceRef))
    seenTeachers.add(t.id)
    if (!allowedRoles.includes(t.role)) errors.push(E("E11", `Teacher ${t.id} has invalid role "${t.role}".`, t.sourceRef))
    const band = roleBands[t.role]
    if (!band) {
      errors.push(E("E11", `Teacher ${t.id} has no load band for role "${t.role}".`, t.sourceRef))
    } else {
      if (t.minDepartmentHours !== band.min || t.maxDepartmentHours !== band.max) {
        warnings.push(
          W("W_LOAD_BAND", `Teacher ${t.id} band ${t.minDepartmentHours}–${t.maxDepartmentHours} differs from role band ${band.min}–${band.max}.`, t.sourceRef)
        )
      }
    }
    for (const u of t.unavailability || []) {
      if (!allowedDays.includes(u.day) || !isPosInt(u.startPeriod) || u.endPeriod < u.startPeriod) {
        errors.push(E("E12", `Teacher ${t.id} has an invalid unavailability window.`, t.sourceRef))
      }
    }
  }

  // ---- rooms
  const seenRooms = new Set()
  for (const r of pkg.rooms) {
    if (!r.id) errors.push(E("E3", "Room is missing an id."))
    if (seenRooms.has(r.id)) errors.push(E("E4", `Duplicate room id ${r.id}.`))
    seenRooms.add(r.id)
    if (!allowedRoomTypes.includes(r.type)) errors.push(E("E12", `Room ${r.id} has invalid type "${r.type}".`))
  }

  // ---- rule coverage: every hard rule and both system rules must be represented
  const constraintIds = new Set(pkg.constraints.map((c) => c.id))
  for (let i = 1; i <= 20; i++) {
    if (!constraintIds.has(`H${i}`)) errors.push(E("E18", `Required hard rule H${i} is missing from constraints.`))
  }
  for (const sid of ["S1", "S2"]) {
    if (!constraintIds.has(sid)) errors.push(E("E18", `Required system rule ${sid} is missing from constraints.`))
  }
  for (const c of pkg.constraints) {
    if (!c.citation?.item) warnings.push(W("W_NO_CITATION", `Constraint ${c.id} has no guideline item citation.`))
  }

  // ---- expected counts (the ingest acceptance gate)
  if (expectedCounts) {
    for (const [key, expected] of Object.entries(expectedCounts)) {
      const actual = pkg[key]?.length
      if (expected === null || expected === undefined) continue
      if (actual !== expected) {
        errors.push(E("E19", `Expected ${expected} ${key} from the source, found ${actual}.`))
      }
    }
  }

  errors.sort((a, b) => (a.code + a.message).localeCompare(b.code + b.message))
  warnings.sort((a, b) => (a.code + a.message).localeCompare(b.code + b.message))
  return { errors, warnings }
}
