import { buildEngineModel } from "./model.mjs"
import { solveSchedule } from "./solver.mjs"

export { buildEngineModel } from "./model.mjs"
export { solveSchedule } from "./solver.mjs"

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value)

export function runEngine(pkg, options = {}) {
  const { model, errors, missingAssignments = [] } = buildEngineModel(pkg, options)
  if (errors.length) {
    return {
      status: "invalid-input",
      diagnostics: errors.map((message) => ({ code: "ENGINE_INPUT", message })),
      schedule: null,
      validation: null,
    }
  }
  if (!isRecord(options.teacherBySubject) || missingAssignments.length > 0) {
    return {
      status: "blocked",
      counts: {
        levels: pkg.levels.length,
        groups: pkg.groups.length,
        subjects: pkg.subjects.length,
        teachers: pkg.teachers.length,
        rooms: pkg.rooms.length,
        missingTeacherAssignments: missingAssignments.length,
      },
      diagnostics: [{
        code: "TEACHER_ASSIGNMENTS_REQUIRED",
        message: "Every subject needs an explicit teacher assignment; the source workbook does not supply these links.",
        subjects: missingAssignments,
        unresolvedQuestion: "Q2",
      }],
      schedule: null,
      validation: null,
    }
  }

  const result = solveSchedule(model, options)
  const unresolvedQuestions = model.unresolvedQuestions
    .filter((question) => ["Q1", "Q3", "Q4", "Q6", "Q7"].includes(question.id))
  const ownerReviewRequired = result.status === "complete" && unresolvedQuestions.length > 0
  return {
    ...result,
    counts: {
      levels: model.levels.length,
      groups: model.groups.length,
      subjects: model.subjects.length,
      teachers: model.teachers.length,
      rooms: model.rooms.length,
      blocks: model.blocks.length,
    },
    certification: result.status === "complete"
      ? ownerReviewRequired ? "owner-review-required" : "clean"
      : null,
    ownerReviewRequired,
    unresolvedQuestions,
    review: null,
  }
}
