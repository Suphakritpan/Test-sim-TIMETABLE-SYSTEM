import { validateSchedule } from "../../conflict tools/validate.mjs"
import { roomClassPermits } from "../ingest/schema.mjs"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]
const key = (resourceId, day, period) => `${resourceId}|${day}|${period}`

function isUnavailable(resource, day, start, length) {
  return (resource.unavailable ?? []).some((window) =>
    window.day === day
    && Array.from({ length }, (_, offset) => start + offset)
      .some((period) => period >= window.startPeriod && period <= window.endPeriod))
}

function createDomains(model) {
  const levelById = new Map(model.levels.map((level) => [level.id, level]))
  const roomsByType = model.rooms.slice().sort((a, b) => a.id.localeCompare(b.id))
  return model.blocks.map((block) => {
    const subject = model.subjects.find((item) => item.id === block.subjectId)
    const permitted = roomClassPermits[block.roomClass] ?? []
    const roomOptions = roomsByType.filter((room) => permitted.includes(room.type))
    const level = levelById.get(block.levelId)
    const fixed = block.kind === "activity"
      ? { day: "Thu", startPeriod: 6, endPeriod: 7 }
      : block.pin
    const placements = []
    const days = fixed ? [fixed.day] : DAYS
    for (const day of days) {
      const first = fixed?.startPeriod ?? 1
      const last = fixed?.startPeriod ?? level.maxPeriod - block.length + 1
      for (let startPeriod = first; startPeriod <= last; startPeriod += 1) {
        if (startPeriod + block.length - 1 > level.maxPeriod) continue
        if (fixed && fixed.endPeriod - fixed.startPeriod + 1 !== block.length) continue
        for (const room of roomOptions) placements.push({ day, startPeriod, room })
      }
    }
    return { block, subject, placements }
  })
}

function availablePlacements(domain, state, model) {
  const { block } = domain
  const teacher = state.teacherById.get(block.teacherId)
  return domain.placements.filter(({ day, startPeriod, room }) => {
    if (isUnavailable(teacher, day, startPeriod, block.length)
        || isUnavailable(room, day, startPeriod, block.length)) return false
    const periods = Array.from({ length: block.length }, (_, offset) => startPeriod + offset)
    if (periods.some((period) =>
      state.teacherBusy.has(key(block.teacherId, day, period))
      || block.groupIds.some((groupId) => state.groupBusy.has(key(groupId, day, period))))) {
      return false
    }
    if (room.type !== "EXTERNAL" && periods.some((period) =>
      state.roomBusy.has(key(room.id, day, period)))) return false
    const teacherLoad = state.teacherLoad.get(block.teacherId) ?? 0
    const maxLoad = teacher.maxTeachingLoad
    if (Number.isFinite(maxLoad) && teacherLoad + block.length > maxLoad) return false
    return model.calendar.days.includes(day)
  })
}

function markPlacement(state, block, placement, add) {
  const { day, startPeriod, room } = placement
  for (let offset = 0; offset < block.length; offset += 1) {
    const period = startPeriod + offset
    const teacherKey = key(block.teacherId, day, period)
    const roomKey = key(room.id, day, period)
    state.teacherBusy[add ? "add" : "delete"](teacherKey)
    if (room.type !== "EXTERNAL") state.roomBusy[add ? "add" : "delete"](roomKey)
    for (const groupId of block.groupIds) {
      const groupKey = key(groupId, day, period)
      state.groupBusy[add ? "add" : "delete"](groupKey)
      if (add) {
        state.groupPeriods.get(groupId).get(day).add(period)
      } else {
        state.groupPeriods.get(groupId).get(day).delete(period)
      }
    }
  }
  const currentLoad = state.teacherLoad.get(block.teacherId) ?? 0
  state.teacherLoad.set(block.teacherId, currentLoad + (add ? block.length : -block.length))
  if (add) state.placements.set(block.id, placement)
  else state.placements.delete(block.id)
}

function diagnoseEmptyDomain(domain, state) {
  const { block, placements } = domain
  const conflicts = new Map()
  const add = (ruleId, message, blockedBy = []) => {
    const current = conflicts.get(ruleId) ?? {
      ruleId,
      message,
      blockIds: new Set([block.id]),
      sourceRefs: new Set(block.sourceRef ? [JSON.stringify(block.sourceRef)] : []),
    }
    for (const other of blockedBy) {
      current.blockIds.add(other.id)
      if (other.sourceRef) current.sourceRefs.add(JSON.stringify(other.sourceRef))
    }
    conflicts.set(ruleId, current)
  }
  const existingBlocks = [...state.placements.keys()]
    .map((id) => state.blockById.get(id))

  if (placements.length === 0) {
    if (block.kind === "activity") {
      add("H4", `Activity ${block.subjectId} has no placement in Thursday periods 6–7.`)
    } else {
      add("H1", `Subject ${block.subjectId} has no placement within its level's period limit.`)
    }
  }
  for (const { day, startPeriod, room } of placements) {
    const periods = Array.from({ length: block.length }, (_, offset) => startPeriod + offset)
    const groupBlockers = existingBlocks.filter((other) =>
      other.groupIds.some((groupId) => block.groupIds.includes(groupId))
      && periods.some((period) => {
        const placement = state.placements.get(other.id)
        return placement.day === day
          && period >= placement.startPeriod
          && period < placement.startPeriod + other.length
      }))
    if (groupBlockers.length) add("H14", `Group time is occupied for ${block.subjectId}.`, groupBlockers)

    const teacherBlockers = existingBlocks.filter((other) =>
      other.teacherId === block.teacherId
      && periods.some((period) => {
        const placement = state.placements.get(other.id)
        return placement.day === day
          && period >= placement.startPeriod
          && period < placement.startPeriod + other.length
      }))
    if (teacherBlockers.length) add("H12", `Teacher ${block.teacherId} is already booked.`, teacherBlockers)

    const roomBlockers = existingBlocks.filter((other) => {
      const placement = state.placements.get(other.id)
      return placement.room.id === room.id
        && room.type !== "EXTERNAL"
        && placement.day === day
        && periods.some((period) =>
          period >= placement.startPeriod && period < placement.startPeriod + other.length)
    })
    if (roomBlockers.length) add("H13", `Room ${room.id} is already booked.`, roomBlockers)

    const teacher = state.teacherById.get(block.teacherId)
    if (isUnavailable(teacher, day, startPeriod, block.length)
        || isUnavailable(room, day, startPeriod, block.length)) {
      add("H16", `A required resource is unavailable for ${block.subjectId}.`)
    }
    if (Number.isFinite(teacher.maxTeachingLoad)
        && (state.teacherLoad.get(block.teacherId) ?? 0) + block.length > teacher.maxTeachingLoad) {
      add("H17", `Teacher ${block.teacherId} would exceed the maximum teaching load.`)
    }
  }
  return [...conflicts.values()].map((conflict) => ({
    ruleId: conflict.ruleId,
    message: conflict.message,
    blockIds: [...conflict.blockIds].sort(),
    sourceRefs: [...conflict.sourceRefs].map((sourceRef) => JSON.parse(sourceRef)),
  }))
}

function hasRequiredDailyStart(state, remainingDomains) {
  for (const [groupId, days] of state.groupPeriods) {
    for (const day of DAYS) {
      if (days.get(day).has(1)) continue
      const possible = remainingDomains.some(({ block }) =>
        block.groupIds.includes(groupId)
        && (block.pin?.day === undefined || block.pin.day === day)
        && (block.kind !== "activity" || day === "Thu")
        && (block.pin?.startPeriod === undefined || block.pin.startPeriod === 1)
        && (block.kind !== "activity" || block.length === 2 && day === "Thu" && 6 === 1))
      if (!possible) return false
    }
  }
  return true
}

function createSchedule(model, state) {
  const sessions = model.blocks.map((block) => {
    const placement = state.placements.get(block.id)
    return {
      id: block.id,
      subjectId: block.subjectId,
      groupIds: block.groupIds,
      teacherId: block.teacherId,
      roomId: placement.room.id,
      day: placement.day,
      startPeriod: placement.startPeriod,
      length: block.length,
      sourceRef: block.sourceRef,
    }
  })
  const lunches = []
  for (const level of model.levels) {
    const groupIds = model.groups
      .filter((group) => group.levelId === level.id)
      .map((group) => group.id)
    for (const day of DAYS) {
      const period = model.lunchPeriods.find((candidate) =>
        groupIds.every((groupId) => !state.groupBusy.has(key(groupId, day, candidate))))
      if (period === undefined) return null
      lunches.push({ levelId: level.id, day, period })
    }
  }
  return {
    schemaVersion: 1,
    calendar: model.calendar,
    levels: model.levels,
    groups: model.groups,
    subjects: model.subjects,
    teachers: model.teachers,
    rooms: model.rooms,
    lunches,
    sessions,
  }
}

function enrichViolations(validation, schedule) {
  const sourceById = new Map()
  for (const subject of schedule.subjects) sourceById.set(subject.id, subject.sourceRef ?? null)
  for (const session of schedule.sessions) sourceById.set(session.id, session.sourceRef ?? null)
  return validation.violations.map((violation) => ({
    ...violation,
    sourceRefs: violation.entityIds
      .map((entityId) => sourceById.get(entityId))
      .filter(Boolean),
  }))
}

export function solveSchedule(model, { maxSearchNodes = 100_000 } = {}) {
  if (!Number.isInteger(maxSearchNodes) || maxSearchNodes < 1) {
    return {
      status: "invalid-input",
      algorithm: "deterministic-mrv-v1",
      diagnostics: ["maxSearchNodes must be a positive integer."],
      schedule: null,
      validation: null,
    }
  }
  const domains = createDomains(model)
  const state = {
    teacherById: new Map(model.teachers.map((teacher) => [teacher.id, teacher])),
    blockById: new Map(model.blocks.map((block) => [block.id, block])),
    teacherBusy: new Set(),
    roomBusy: new Set(),
    groupBusy: new Set(),
    teacherLoad: new Map(),
    groupPeriods: new Map(model.groups.map((group) => [
      group.id,
      new Map(DAYS.map((day) => [day, new Set()])),
    ])),
    placements: new Map(),
  }
  let visited = 0
  let terminalSchedule = null
  let lastConflicts = []

  function search(remaining) {
    if (visited >= maxSearchNodes) return false
    visited += 1
    if (remaining.length === 0) {
      if (!hasRequiredDailyStart(state, [])) return false
      const schedule = createSchedule(model, state)
      if (!schedule) return false
      const validation = validateSchedule(schedule)
      if (validation.valid) {
        terminalSchedule = schedule
        return true
      }
      return false
    }

    let selectedIndex = -1
    let selectedPlacements = null
    for (let index = 0; index < remaining.length; index += 1) {
      const placements = availablePlacements(remaining[index], state, model)
      if (placements.length === 0) {
        lastConflicts = diagnoseEmptyDomain(remaining[index], state)
        return false
      }
      if (selectedPlacements === null || placements.length < selectedPlacements.length
          || (placements.length === selectedPlacements.length
            && remaining[index].block.id.localeCompare(remaining[selectedIndex].block.id) < 0)) {
        selectedIndex = index
        selectedPlacements = placements
      }
    }
    const selected = remaining[selectedIndex]
    const next = remaining.filter((_, index) => index !== selectedIndex)
    for (const placement of selectedPlacements) {
      markPlacement(state, selected.block, placement, true)
      if (hasRequiredDailyStart(state, next) && search(next)) return true
      markPlacement(state, selected.block, placement, false)
      if (visited >= maxSearchNodes) break
    }
    return false
  }

  const solved = search(domains)
  if (!solved) {
    return {
      status: visited >= maxSearchNodes ? "search-limit" : "unschedulable",
      algorithm: "deterministic-mrv-v1",
      search: { visitedNodes: visited, maxSearchNodes },
      conflicts: lastConflicts.length ? lastConflicts : [{
        ruleId: "NO_VALID_SCHEDULE",
        message: "Search exhausted without a candidate accepted by the independent validator.",
        blockIds: model.blocks.map((block) => block.id),
        sourceRefs: model.blocks.map((block) => block.sourceRef).filter(Boolean),
      }],
      schedule: null,
      validation: null,
    }
  }

  const validation = validateSchedule(terminalSchedule)
  return {
    status: "complete",
    algorithm: "deterministic-mrv-v1",
    search: { visitedNodes: visited, maxSearchNodes },
    schedule: terminalSchedule,
    validation: {
      ...validation,
      violations: enrichViolations(validation, terminalSchedule),
    },
  }
}
