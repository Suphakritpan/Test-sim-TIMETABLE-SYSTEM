import { allowedDays, lunchAllowedPeriods, roomClassPermits } from "../ingest/schema.mjs"

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value)

export function buildEngineModel(pkg, { teacherBySubject } = {}) {
  const errors = []
  if (!isRecord(pkg)) {
    return { errors: ["Canonical input must be a JSON object."], model: null }
  }
  const constraintIds = new Set(pkg.constraints.map((constraint) => constraint.id))
  for (const id of [
    ...Array.from({ length: 20 }, (_, index) => `H${index + 1}`),
    "S1",
    "S2",
  ]) {
    if (!constraintIds.has(id)) errors.push(`Canonical constraints are missing required rule ${id}.`)
  }
  if (pkg.schemaVersion !== 1) {
    errors.push(`Unsupported schemaVersion ${pkg.schemaVersion}; expected 1.`)
  }
  for (const key of ["levels", "groups", "subjects", "teachers", "rooms", "constraints"]) {
    if (!Array.isArray(pkg[key])) errors.push(`Canonical field "${key}" must be an array.`)
  }
  if (errors.length) return { errors, model: null }
  for (const key of ["levels", "groups", "subjects", "teachers", "rooms", "constraints"]) {
    if (pkg[key].some((row) => !isRecord(row))) {
      errors.push(`Every entry in canonical field "${key}" must be an object.`)
    }
  }
  if (errors.length) return { errors, model: null }
  if (!pkg.levels.length || !pkg.groups.length || !pkg.subjects.length || !pkg.teachers.length) {
    errors.push("Canonical input must contain at least one level, group, subject, and teacher.")
  }
  const levelIds = new Set()
  for (const level of pkg.levels) {
    if (typeof level.id !== "string" || !level.id || levelIds.has(level.id)) {
      errors.push(`Level id "${level.id}" must be a unique non-empty string.`)
    }
    if (!Number.isInteger(level.maxPeriod) || level.maxPeriod < 1) {
      errors.push(`Level ${level.id} must have a positive integer maxPeriod.`)
    } else if (level.maxPeriod > 11) {
      errors.push(`Level ${level.id} maxPeriod cannot exceed 11.`)
    }
    levelIds.add(level.id)
  }
  const groupIds = new Set()
  for (const group of pkg.groups) {
    if (typeof group.id !== "string" || !group.id || groupIds.has(group.id)) {
      errors.push(`Group id "${group.id}" must be a unique non-empty string.`)
    }
    if (!levelIds.has(group.levelId)) {
      errors.push(`Group ${group.id} references unknown level ${group.levelId}.`)
    }
    groupIds.add(group.id)
  }
  const subjectIds = new Set()
  for (const subject of pkg.subjects) {
    if (typeof subject.id !== "string" || !subject.id || subjectIds.has(subject.id)) {
      errors.push(`Subject id "${subject.id}" must be a unique non-empty string.`)
    }
    subjectIds.add(subject.id)
  }
  const teacherIds = new Set()
  for (const teacher of pkg.teachers) {
    if (typeof teacher.id !== "string" || !teacher.id || teacherIds.has(teacher.id)) {
      errors.push(`Teacher id "${teacher.id}" must be a unique non-empty string.`)
    }
    if (!Number.isFinite(teacher.maxTeachingLoad) || teacher.maxTeachingLoad < 0) {
      errors.push(`Teacher ${teacher.id} must have a non-negative maxTeachingLoad.`)
    }
    if (teacher.unavailability !== undefined && !Array.isArray(teacher.unavailability)) {
      errors.push(`Teacher ${teacher.id} unavailability must be an array.`)
    }
    teacherIds.add(teacher.id)
  }
  const rooms = [
    ...pkg.rooms,
    ...(Array.isArray(pkg.departmentRooms) ? pkg.departmentRooms : []),
    ...(Array.isArray(pkg.externalRooms) ? pkg.externalRooms : []),
  ]
  if ((pkg.departmentRooms !== undefined && !Array.isArray(pkg.departmentRooms))
      || (pkg.externalRooms !== undefined && !Array.isArray(pkg.externalRooms))) {
    errors.push("Optional departmentRooms and externalRooms fields must be arrays.")
  }
  for (const [field, values] of [
    ["departmentRooms", pkg.departmentRooms],
    ["externalRooms", pkg.externalRooms],
  ]) {
    if (Array.isArray(values) && values.some((room) => !isRecord(room))) {
      errors.push(`Every entry in canonical field "${field}" must be an object.`)
    }
  }
  const roomIds = new Set()
  for (const room of rooms) {
    if (typeof room.id !== "string" || !room.id || roomIds.has(room.id)) {
      errors.push(`Room id "${room.id}" must be a unique non-empty string.`)
    }
    if (!["COM", "LAB", "EXTERNAL", "DEPARTMENT"].includes(room.type)) {
      errors.push(`Room ${room.id} has unsupported type ${room.type}.`)
    }
    if (room.unavailable !== undefined && !Array.isArray(room.unavailable)) {
      errors.push(`Room ${room.id} unavailable must be an array.`)
    }
    roomIds.add(room.id)
  }
  if (!rooms.length) errors.push("Canonical input has no rooms available for scheduling.")
  for (const subject of pkg.subjects) {
    if (!Number.isInteger(subject.periods) || subject.periods < 1) {
      errors.push(`Subject ${subject.id} must have a positive integer period count.`)
    }
    if (!levelIds.has(subject.levelId)) {
      errors.push(`Subject ${subject.id} references unknown level ${subject.levelId}.`)
    }
    if (!Array.isArray(subject.groupIds) || subject.groupIds.length === 0) {
      errors.push(`Subject ${subject.id} must have at least one group.`)
    } else {
      for (const groupId of subject.groupIds) {
        const group = pkg.groups.find((item) => item.id === groupId)
        if (!group) errors.push(`Subject ${subject.id} references unknown group ${groupId}.`)
        else if (group.levelId !== subject.levelId) {
          errors.push(`Subject ${subject.id} includes group ${groupId} from another level.`)
        }
      }
    }
    if (!["theory", "practical", "activity"].includes(subject.kind)) {
      errors.push(`Subject ${subject.id} has unsupported kind ${subject.kind}.`)
    }
    if (!["general", "department"].includes(subject.category)) {
      errors.push(`Subject ${subject.id} has unsupported category ${subject.category}.`)
    }
    if (!roomClassPermits[subject.roomClass]) {
      errors.push(`Subject ${subject.id} has unsupported roomClass ${subject.roomClass}.`)
    }
    if (subject.kind === "activity" && subject.periods !== 2) {
      errors.push(`Activity ${subject.id} must be a two-period block under H4.`)
    }
    if (subject.pin) {
      const { day, startPeriod, endPeriod } = subject.pin
      if (!allowedDays.includes(day) || !Number.isInteger(startPeriod) || startPeriod < 1
          || !Number.isInteger(endPeriod) || endPeriod < startPeriod
          || endPeriod - startPeriod + 1 !== subject.periods) {
        errors.push(`Subject ${subject.id} has a pin that does not match its required block length.`)
      }
    }
  }
  if (errors.length) return { errors, model: null }

  const levels = pkg.levels.map((level) => ({ ...level, name: level.name ?? level.id }))
  const knownTeachers = teacherIds
  const assignmentMap = isRecord(teacherBySubject) ? teacherBySubject : {}
  const blocks = []
  const missingAssignments = []

  for (const subject of pkg.subjects) {
    const hasAssignment = Object.hasOwn(assignmentMap, subject.id)
    const teacherId = assignmentMap[subject.id]
    if (!hasAssignment) {
      missingAssignments.push({ subjectId: subject.id, sourceRef: subject.sourceRef ?? null })
      continue
    }
    if (typeof teacherId !== "string" || !knownTeachers.has(teacherId)) {
      errors.push(`Subject ${subject.id} references unknown teacher ${teacherId}.`)
      continue
    }
    const units = subject.kind === "practical"
      ? subject.groupIds.map((groupId) => [groupId])
      : [subject.groupIds.slice().sort()]
    for (const groupIds of units) {
      blocks.push({
        id: `block:${subject.id}:${groupIds.join("+")}`,
        subjectId: subject.id,
        levelId: subject.levelId,
        groupIds,
        teacherId,
        length: subject.periods,
        kind: subject.kind,
        category: subject.category,
        roomClass: subject.roomClass,
        pin: subject.pin ?? null,
        sourceRef: subject.sourceRef ?? null,
      })
    }
  }

  for (const subjectId of Object.keys(assignmentMap).sort()) {
    if (!pkg.subjects.some((subject) => subject.id === subjectId)) {
      errors.push(`Teacher assignment references unknown subject ${subjectId}.`)
    }
  }
  for (const block of blocks) {
    if (!levels.some((level) => level.id === block.levelId)) {
      errors.push(`Subject ${block.subjectId} references unknown level ${block.levelId}.`)
    }
  }

  if (errors.length || missingAssignments.length) {
    return { errors, model: null, missingAssignments }
  }

  const periodsPerDay = Math.max(...levels.map((level) => level.maxPeriod))
  return {
    errors: [],
    missingAssignments,
    model: {
      schemaVersion: 1,
      calendar: { days: allowedDays.slice(), periodsPerDay },
      levels,
      groups: pkg.groups,
      subjects: pkg.subjects,
      teachers: pkg.teachers.map((teacher) => ({
        ...teacher,
        unavailable: teacher.unavailability ?? [],
      })),
      rooms,
      constraints: pkg.constraints ?? [],
      unresolvedQuestions: pkg.unresolvedQuestions ?? [],
      blocks: blocks.sort((a, b) => a.id.localeCompare(b.id)),
      lunchPeriods: lunchAllowedPeriods.slice(),
    },
  }
}
