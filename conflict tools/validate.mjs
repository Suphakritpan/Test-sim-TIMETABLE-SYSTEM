const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const LOAD_BANDS = {
  head_dept: { min: 24, max: 28, ruleId: "H6" },
  head_work: { min: 24, max: 28, ruleId: "H6" },
  regular: { min: 30, max: 38, ruleId: "H7" },
};

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

function makeViolation(ruleId, message, entityIds = [], slots = [], severity = "hard") {
  return {
    ruleId,
    severity,
    message,
    entityIds: [...new Set(entityIds.filter(Boolean))].sort(),
    slots: [...slots].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)
      || a.period - b.period),
  };
}

function slotRange(session) {
  return Array.from(
    { length: Math.max(0, session.length) },
    (_, offset) => session.startPeriod + offset,
  );
}

function occupancyKey(resourceId, day, period) {
  return JSON.stringify([resourceId, day, period]);
}

function attendanceKey(subjectId, groupIds) {
  return JSON.stringify([subjectId, sortedUnique(groupIds)]);
}

function sortedUnique(values) {
  return [...new Set(values)].sort();
}

function validateSchedule(data) {
  const violations = [];
  const add = (...args) => violations.push(makeViolation(...args));

  if (!isRecord(data)) {
    add("INPUT", "Input must be a JSON object.", [], [], "error");
    return result(violations);
  }

  const levels = list(data.levels);
  const groups = list(data.groups);
  const subjects = list(data.subjects);
  const teachers = list(data.teachers);
  const rooms = list(data.rooms);
  const sessions = list(data.sessions);
  const lunches = list(data.lunches);
  const days = list(data.calendar?.days);
  const levelById = new Map(levels.map((item) => [item?.id, item]));
  const groupById = new Map(groups.map((item) => [item?.id, item]));
  const subjectById = new Map(subjects.map((item) => [item?.id, item]));
  const teacherById = new Map(teachers.map((item) => [item?.id, item]));
  const roomById = new Map(rooms.map((item) => [item?.id, item]));
  const occupancy = { group: new Map(), teacher: new Map(), room: new Map() };
  const teacherLoads = new Map(teachers.map((teacher) => [
    teacher?.id,
    { total: 0, department: 0 },
  ]));
  const groupDayPeriods = new Map();
  const levelDayHasClass = new Map();
  const blocksByAttendance = new Map();

  const inputError = (message, entityIds = []) => add("INPUT", message, entityIds, [], "error");

  if (data.schemaVersion !== 1) {
    inputError(`Unsupported schemaVersion ${data.schemaVersion}; expected 1.`);
  }
  if (!Array.isArray(data.levels) || !Array.isArray(data.groups)
      || !Array.isArray(data.subjects) || !Array.isArray(data.teachers)
      || !Array.isArray(data.rooms) || !Array.isArray(data.sessions)
      || !Array.isArray(data.lunches) || !isRecord(data.calendar)
      || !Array.isArray(data.calendar.days)) {
    inputError("Expected arrays for calendar days, levels, groups, subjects, teachers, rooms, sessions, and lunches.");
  }

  for (const [label, rows] of [
    ["level", levels], ["group", groups], ["subject", subjects],
    ["teacher", teachers], ["room", rooms], ["session", sessions],
  ]) {
    const seen = new Set();
    for (const row of rows) {
      if (!isRecord(row) || typeof row.id !== "string" || row.id.trim() === "") {
        inputError(`Every ${label} must be an object with a non-empty string id.`);
        continue;
      }
      if (seen.has(row.id)) inputError(`Duplicate ${label} id ${row.id}.`, [row.id]);
      seen.add(row.id);
    }
  }

  if (!Number.isInteger(data.calendar?.periodsPerDay) || data.calendar.periodsPerDay < 1) {
    inputError("calendar.periodsPerDay must be a positive integer.");
  }
  if (days.length !== DAYS.length
      || new Set(days).size !== DAYS.length
      || days.some((day) => !DAYS.includes(day))
      || DAYS.some((day) => !days.includes(day))) {
    inputError("calendar.days must contain Mon, Tue, Wed, Thu, and Fri exactly.");
  }

  for (const level of levels) {
    if (!Number.isInteger(level?.maxPeriod) || level.maxPeriod < 1) {
      inputError(`Level ${level?.id ?? "(unknown)"} must have a positive integer maxPeriod.`,
        [level?.id]);
    } else if (Number.isInteger(data.calendar?.periodsPerDay)
        && level.maxPeriod > data.calendar.periodsPerDay) {
      inputError(`Level ${level.id} maxPeriod cannot exceed calendar.periodsPerDay.`,
        [level.id]);
    }
  }
  for (const group of groups) {
    if (!levelById.has(group?.levelId)) {
      inputError(`Group ${group?.id ?? "(unknown)"} references unknown level ${group?.levelId}.`,
        [group?.id, group?.levelId]);
    }
  }
  for (const subject of subjects) {
    if (!levelById.has(subject?.levelId)) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} references unknown level ${subject?.levelId}.`,
        [subject?.id, subject?.levelId]);
    }
    if (!Number.isInteger(subject?.periods) || subject.periods < 1) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} must have positive integer periods.`,
        [subject?.id]);
    }
    if (!["theory", "practical", "activity"].includes(subject?.kind)) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} has unsupported kind ${subject?.kind}.`,
        [subject?.id]);
    }
    if (!["general", "department"].includes(subject?.category)) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} has unsupported category ${subject?.category}.`,
        [subject?.id]);
    }
    if (!["COM", "LAB", "COM_OR_LAB", "GENERAL", "DEPARTMENT"].includes(subject?.roomClass)) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} has unsupported roomClass ${subject?.roomClass}.`,
        [subject?.id]);
    }
    if (!Array.isArray(subject?.groupIds) || subject.groupIds.length === 0) {
      inputError(`Subject ${subject?.id ?? "(unknown)"} must list at least one groupId.`,
        [subject?.id]);
    } else {
      if (new Set(subject.groupIds).size !== subject.groupIds.length) {
        inputError(`Subject ${subject.id} contains duplicate groupIds.`, [subject.id]);
      }
      for (const groupId of subject.groupIds) {
        if (!groupById.has(groupId)) {
          inputError(`Subject ${subject.id} references unknown group ${groupId}.`,
            [subject.id, groupId]);
        } else if (groupById.get(groupId).levelId !== subject.levelId) {
          inputError(`Subject ${subject.id} includes group ${groupId} from another level.`,
            [subject.id, groupId]);
        }
      }
    }
  }
  for (const teacher of teachers) {
    if (!Number.isFinite(teacher?.maxTeachingLoad) || teacher.maxTeachingLoad < 0) {
      inputError(`Teacher ${teacher?.id ?? "(unknown)"} must have a non-negative maxTeachingLoad.`,
        [teacher?.id]);
    }
  }
  for (const resource of [...teachers, ...rooms]) {
    if (resource?.unavailable !== undefined && !Array.isArray(resource.unavailable)) {
      inputError(`Resource ${resource?.id ?? "(unknown)"} unavailable must be an array.`,
        [resource?.id]);
      continue;
    }
    for (const window of list(resource?.unavailable)) {
      if (!DAYS.includes(window?.day)
          || !Number.isInteger(window?.startPeriod)
          || !Number.isInteger(window?.endPeriod)
          || window.startPeriod < 1
          || window.endPeriod < window.startPeriod
          || (Number.isInteger(data.calendar?.periodsPerDay)
            && window.endPeriod > data.calendar.periodsPerDay)) {
        inputError(`Resource ${resource.id} has an invalid unavailability window.`,
          [resource.id]);
      }
    }
  }
  for (const lunch of lunches) {
    if (!isRecord(lunch) || !levelById.has(lunch.levelId) || !DAYS.includes(lunch.day)
        || !Number.isInteger(lunch.period) || lunch.period < 1
        || (Number.isInteger(data.calendar?.periodsPerDay)
          && lunch.period > data.calendar.periodsPerDay)) {
      inputError("Each lunch must reference a known level and weekday and have an integer period.",
        [lunch?.levelId]);
    }
  }

  for (const session of sessions) {
    if (!isRecord(session)) continue;
    const subject = subjectById.get(session.subjectId);
    const level = subject && levelById.get(subject.levelId);
    const room = roomById.get(session.roomId);
    const teacher = teacherById.get(session.teacherId);

    if (!subject) inputError(`Session ${session.id} references unknown subject ${session.subjectId}.`,
      [session.id, session.subjectId]);
    if (!room) inputError(`Session ${session.id} references unknown room ${session.roomId}.`,
      [session.id, session.roomId]);
    if (!teacher) inputError(`Session ${session.id} references unknown teacher ${session.teacherId}.`,
      [session.id, session.teacherId]);
    if (!Array.isArray(session.groupIds) || session.groupIds.length === 0) {
      inputError(`Session ${session.id} must list at least one groupId.`, [session.id]);
    } else if (new Set(session.groupIds).size !== session.groupIds.length) {
      inputError(`Session ${session.id} contains duplicate groupIds.`, [session.id]);
    }
    for (const groupId of list(session.groupIds)) {
      if (!groupById.has(groupId)) {
        inputError(`Session ${session.id} references unknown group ${groupId}.`,
          [session.id, groupId]);
      }
    }
    if (!Number.isInteger(session.startPeriod) || session.startPeriod < 1
        || !Number.isInteger(session.length) || session.length < 1) {
      inputError(`Session ${session.id} must have positive integer startPeriod and length.`,
        [session.id]);
      continue;
    }
    if (typeof session.day !== "string") {
      inputError(`Session ${session.id} must have a string day.`, [session.id]);
      continue;
    }

    const periods = slotRange(session);
    const slots = periods.map((period) => ({ day: session.day, period }));
    if (!DAYS.includes(session.day)) {
      add("H19", `Session ${session.id} is scheduled outside Monday–Friday.`,
        [session.id], slots);
    }

    if (level && periods.at(-1) > level.maxPeriod) {
      add("H1", `Session ${session.id} ends after ${level.name ?? level.id}'s period ${level.maxPeriod} limit.`,
        [session.id, level.id], slots);
    }

    if (subject) {
      const attendanceGroups = sortedUnique(list(subject.groupIds));
      const sessionGroups = sortedUnique(list(session.groupIds));
      const groupKey = sessionGroups.join(",");
      const attendanceId = attendanceKey(subject.id, sessionGroups);
      const blocks = blocksByAttendance.get(attendanceId) ?? [];
      blocks.push(session);
      blocksByAttendance.set(attendanceId, blocks);

      const isMergedKind = subject.kind === "theory" || subject.kind === "activity";
      if ((isMergedKind && groupKey !== attendanceGroups.join(","))
          || (!isMergedKind && (sessionGroups.length !== 1
            || sessionGroups.some((groupId) => !attendanceGroups.includes(groupId))))) {
        add("H5", `${subject.kind} subject ${subject.id} has an invalid group split/merge.`,
          [subject.id, session.id, ...sessionGroups], slots);
      }

      if (subject.kind === "activity"
          && (session.day !== "Thu" || session.startPeriod !== 6 || session.length !== 2)) {
        add("H4", `Activity ${subject.id} must be scheduled Thursday periods 6–7.`,
          [subject.id, session.id], slots);
      }

      const expectedRoomTypes = {
        COM: ["COM"],
        LAB: ["LAB"],
        COM_OR_LAB: ["COM", "LAB"],
        GENERAL: ["EXTERNAL"],
        DEPARTMENT: ["DEPARTMENT"],
      };
      const permittedTypes = expectedRoomTypes[subject.roomClass];
      const computerRoom = room && ["COM1", "COM2", "COM3", "COM4"]
        .some((name) => name === room.id || name === room.name);
      const laboratory = room && ["LAB1", "LAB2"]
        .some((name) => name === room.id || name === room.name);
      if (!permittedTypes) {
        inputError(`Subject ${subject.id} has unsupported roomClass ${subject.roomClass}.`,
          [subject.id]);
      } else if (room && (!permittedTypes.includes(room.type)
          || (room.type === "COM" && !computerRoom)
          || (room.type === "LAB" && !laboratory))) {
        const ruleId = subject.category === "general" ? "H9" : "H8";
        add(ruleId, `Room ${room.name ?? room.id} (${room.type}) is not permitted for subject ${subject.id} (${subject.roomClass}).`,
          [subject.id, session.id, room.id]);
      }
      if (subject.category === "general" && room && room.type !== "EXTERNAL") {
        add("H9", `General subject ${subject.id} must use an external classroom.`,
          [subject.id, session.id, room.id]);
      }

      const load = teacherLoads.get(session.teacherId);
      if (load) {
        load.total += session.length;
        if (subject.category !== "general") load.department += session.length;
      }
    }

    for (const period of periods) {
      for (const groupId of new Set(list(session.groupIds))) {
        const key = occupancyKey(groupId, session.day, period);
        const entries = occupancy.group.get(key) ?? [];
        entries.push(session);
        occupancy.group.set(key, entries);
        const groupPeriods = groupDayPeriods.get(`${groupId}:${session.day}`) ?? [];
        groupPeriods.push(period);
        groupDayPeriods.set(`${groupId}:${session.day}`, groupPeriods);
        const group = groupById.get(groupId);
        if (group) levelDayHasClass.set(`${group.levelId}:${session.day}`, true);
      }
      if (session.teacherId) {
        const key = occupancyKey(session.teacherId, session.day, period);
        const entries = occupancy.teacher.get(key) ?? [];
        entries.push(session);
        occupancy.teacher.set(key, entries);
      }
      if (session.roomId && room?.type !== "EXTERNAL") {
        const key = occupancyKey(session.roomId, session.day, period);
        const entries = occupancy.room.get(key) ?? [];
        entries.push(session);
        occupancy.room.set(key, entries);
      }
    }

    for (const resource of [
      { kind: "teacher", item: teacher },
      { kind: "room", item: room },
    ]) {
      for (const window of list(resource.item?.unavailable)) {
        if (window?.day === session.day
            && Number.isInteger(window.startPeriod)
            && Number.isInteger(window.endPeriod)
            && periods.some((period) => period >= window.startPeriod && period <= window.endPeriod)) {
          add("H16", `Session ${session.id} overlaps unavailable ${resource.kind} ${resource.item.id}.`,
            [session.id, resource.item.id], slots);
        }
      }
    }
  }

  for (const [attendanceKey, blocks] of blocksByAttendance) {
    if (blocks.length > 1) {
      const subjectId = blocks[0].subjectId;
      add("H10", `Subject ${subjectId} has multiple blocks for the same attendance group(s).`,
        [subjectId, ...blocks.map((block) => block.id)],
        blocks.flatMap((block) => slotRange(block).map((period) => ({
          day: block.day, period,
        }))));
    }
  }

  for (const subject of subjects) {
    const expectedGroups = sortedUnique(list(subject.groupIds));
    const attendanceUnits = subject.kind === "practical"
      ? expectedGroups.map((groupId) => [groupId])
      : [expectedGroups];
    for (const unit of attendanceUnits) {
      const key = attendanceKey(subject.id, unit);
      const blocks = blocksByAttendance.get(key) ?? [];
      const actualPeriods = blocks.reduce((sum, block) => sum + block.length, 0);
      if (blocks.length !== 1 || actualPeriods !== subject.periods) {
        add("H15", `Subject ${subject.id} needs one ${subject.periods}-period block for group(s) ${unit.join(", ")}; found ${blocks.length} block(s) totaling ${actualPeriods} period(s).`,
          [subject.id, ...blocks.map((block) => block.id), ...unit],
          blocks.flatMap((block) => slotRange(block).map((period) => ({
            day: block.day, period,
          }))));
      }
    }

    if (subject.kind === "practical") {
      const covered = new Set(blocksByAttendance.keys());
      const missing = expectedGroups.filter((groupId) =>
        !covered.has(attendanceKey(subject.id, [groupId])));
      if (missing.length > 0) {
        add("H5", `Practical subject ${subject.id} must have a separate session for each group.`,
          [subject.id, ...missing]);
      }
    }
  }

  for (const [key, entries] of occupancy.teacher) {
    if (entries.length > 1) {
      const [teacherId, day, period] = JSON.parse(key);
      add("H12", `Teacher ${teacherId} is double-booked.`,
        [teacherId, ...entries.map((entry) => entry.id)], [{ day, period }]);
    }
  }
  for (const [key, entries] of occupancy.room) {
    if (entries.length > 1) {
      const [roomId, day, period] = JSON.parse(key);
      add("H13", `Room ${roomId} is double-booked.`,
        [roomId, ...entries.map((entry) => entry.id)], [{ day, period }]);
    }
  }
  for (const [key, entries] of occupancy.group) {
    if (entries.length > 1) {
      const [groupId, day, period] = JSON.parse(key);
      add("H14", `Group ${groupId} is double-booked.`,
        [groupId, ...entries.map((entry) => entry.id)], [{ day, period }]);
    }
  }

  for (const teacher of teachers) {
    const load = teacherLoads.get(teacher.id);
    const band = LOAD_BANDS[teacher.role];
    if (band && (load.department < band.min || load.department > band.max)) {
      add(band.ruleId, `Teacher ${teacher.id} has ${load.department} department periods; expected ${band.min}–${band.max}.`,
        [teacher.id]);
    }
    if (load.total > teacher.maxTeachingLoad) {
      add("H17", `Teacher ${teacher.id} has ${load.total} teaching periods; maximum is ${teacher.maxTeachingLoad}.`,
        [teacher.id]);
    }
  }

  for (const level of levels) {
    for (const day of DAYS) {
      const lunchEntries = lunches.filter((lunch) => lunch?.levelId === level.id
        && lunch?.day === day);
      const validLunch = lunchEntries.length === 1
        && [4, 5, 6].includes(lunchEntries[0].period);
      const lunch = lunchEntries[0];
      const groupsAtLunch = groups.filter((group) => group.levelId === level.id)
        .filter((group) => (groupDayPeriods.get(`${group.id}:${day}`) ?? [])
          .includes(lunch?.period));
      if (!validLunch || groupsAtLunch.length > 0) {
        add("H3", `Level ${level.id} needs exactly one lunch period (4, 5, or 6) on ${day}, with no group scheduled then.`,
          [level.id, ...lunchEntries.map((entry) => entry.id), ...groupsAtLunch.map((group) => group.id)],
          validLunch ? [{ day, period: lunch.period }] : []);
      }

      const levelGroups = groups.filter((group) => group.levelId === level.id);
      for (const group of levelGroups) {
        const periods = groupDayPeriods.get(`${group.id}:${day}`) ?? [];
        if (!periods.includes(1)) {
          add("H18", `Group ${group.id} does not start on period 1 on ${day}.`,
            [level.id, group.id], [{ day, period: 1 }]);
        }
        if (periods.length === 0) {
          add("H20", `Group ${group.id} has no class on ${day}.`,
            [level.id, group.id], []);
        }
      }
      if (!levelDayHasClass.get(`${level.id}:${day}`)) {
        add("H20", `Level ${level.id} has no class on ${day}.`, [level.id]);
      }
    }
  }

  violations.sort((a, b) => a.ruleId.localeCompare(b.ruleId)
    || a.entityIds.join(",").localeCompare(b.entityIds.join(","))
    || a.slots.map(({ day, period }) => `${day}:${period}`).join(",")
      .localeCompare(b.slots.map(({ day, period }) => `${day}:${period}`).join(",")));
  return result(violations);
}

function result(violations) {
  const summaryByRule = {};
  for (const violation of violations) {
    summaryByRule[violation.ruleId] = (summaryByRule[violation.ruleId] ?? 0) + 1;
  }
  return {
    valid: violations.length === 0,
    errorCount: violations.filter((item) => item.severity === "error").length,
    violationCount: violations.filter((item) => item.severity === "hard").length,
    summaryByRule,
    violations,
  };
}

export { validateSchedule };
