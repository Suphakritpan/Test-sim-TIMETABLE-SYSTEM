import { z } from "zod";

// ============================================
// Base Types
// ============================================

export const DaySchema = z.number().int().min(1).max(5);
export const PeriodSchema = z.number().int().min(1);
export const RoomTypeSchema = z.enum(["lecture", "lab"]);
export const RequestLevelSchema = z.enum(["must", "try", "noop"]);

export const TeacherSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
  maxPeriodsPerDay: z.number().int().positive(),
});

export const TeacherUnavailableSchema = z.object({
  teacherCode: z.string(),
  day: DaySchema,
  period: PeriodSchema,
});

export const RoomSchema = z.object({
  code: z.string().min(1),
  type: RoomTypeSchema,
  capacity: z.number().int().positive(),
});

export const GroupSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  semester: z.string().min(1),
  weekRange: z.string().min(1),
  advisor: z.string().optional(),
  studentCount: z.number().int().positive(),
});

export const SubjectSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  theoryPeriods: z.number().int().nonnegative(),
  practicePeriods: z.number().int().nonnegative(),
  labRoomCode: z.string().optional(),
});

export const TeachingItemSchema = z.object({
  id: z.string().min(1),
  subjectCode: z.string(),
  groupCode: z.string(),
  teacherCode: z.string(),
  theoryPeriods: z.number().int().nonnegative(),
  practicePeriods: z.number().int().nonnegative(),
});

export const SpecialRequestSchema = z.object({
  id: z.string().min(1),
  rawText: z.string().min(1),
  parsed: z.object({
    targetType: z.enum(["teacher", "group"]),
    targetCode: z.string(),
    condition: z.string(),
    level: RequestLevelSchema,
    reason: z.string().optional(),
  }).optional(),
  level: RequestLevelSchema,
  status: z.enum(["pending", "confirmed", "rejected"]),
});

// ============================================
// Import Types
// ============================================

export const ImportErrorSchema = z.object({
  sheet: z.string(),
  row: z.number().int().positive(),
  field: z.string(),
  message: z.string(),
  fix: z.string(),
  severity: z.enum(["error", "warning"]),
});

export const ImportPreviewResponseSchema = z.object({
  importId: z.string(),
  summary: z.object({
    teachers: z.number(),
    teacherUnavailable: z.number(),
    rooms: z.number(),
    groups: z.number(),
    subjects: z.number(),
    teachingItems: z.number(),
    specialRequests: z.number(),
  }),
  errors: z.array(ImportErrorSchema),
  warnings: z.array(ImportErrorSchema),
  preview: z.object({
    teachers: z.array(TeacherSchema).max(10),
    rooms: z.array(RoomSchema).max(10),
    groups: z.array(GroupSchema).max(10),
    subjects: z.array(SubjectSchema).max(10),
    teachingItems: z.array(TeachingItemSchema).max(10),
    specialRequests: z.array(SpecialRequestSchema).max(10),
  }),
});

export type ImportError = z.infer<typeof ImportErrorSchema>;
export type ImportPreviewResponse = z.infer<typeof ImportPreviewResponseSchema>;

// ============================================
// Rules Types
// ============================================

export const RuleParamSchema = z.record(z.string(), z.unknown());

export const RuleSchema = z.object({
  id: z.string().regex(/^R-\d{2}$/),
  name: z.string(),
  type: z.enum(["hard", "soft"]),
  weight: z.number().nonnegative().optional(),
  params: RuleParamSchema,
  description: z.string(),
});

export const RulesResponseSchema = z.object({
  rules: z.array(RuleSchema),
  version: z.number().int().positive(),
});

export type Rule = z.infer<typeof RuleSchema>;
export type RulesResponse = z.infer<typeof RulesResponseSchema>;

// ============================================
// Run/Solver Types
// ============================================

export const RunStatusSchema = z.enum([
  "queued",
  "planning",
  "solving",
  "verifying",
  "verified",
  "infeasible",
  "cancelled",
  "failed",
]);

export const RunCreateSchema = z.object({
  seed: z.string().optional(),
  rulesVersion: z.number().int().positive().optional(),
});

export const RunResponseSchema = z.object({
  id: z.string(),
  status: RunStatusSchema,
  seed: z.string(),
  rulesVersion: z.number().int().positive(),
  score: z.object({
    hardViolations: z.number().int().nonnegative(),
    softPenalty: z.number().nonnegative(),
    totalItems: z.number().int().positive(),
    placedItems: z.number().int().nonnegative(),
    teacherConflicts: z.number().int().nonnegative(),
    roomConflicts: z.number().int().nonnegative(),
    groupConflicts: z.number().int().nonnegative(),
  }).optional(),
  timing: z.object({
    startedAt: z.string().datetime(),
    finishedAt: z.string().datetime().optional(),
    durationMs: z.number().int().nonnegative().optional(),
  }).optional(),
  progress: z.object({
    phase: z.string(),
    iterations: z.number().int().nonnegative(),
    bestScore: z.number().optional(),
    currentScore: z.number().optional(),
  }).optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.array(z.unknown()).optional(),
  }).optional(),
  createdAt: z.string().datetime(),
});

export const RunListResponseSchema = z.object({
  runs: z.array(RunResponseSchema),
});

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type RunCreate = z.infer<typeof RunCreateSchema>;
export type RunResponse = z.infer<typeof RunResponseSchema>;
export type RunListResponse = z.infer<typeof RunListResponseSchema>;

// ============================================
// Verification Types
// ============================================

export const ViolationSchema = z.object({
  ruleId: z.string(),
  ruleName: z.string(),
  type: z.enum(["hard", "soft"]),
  severity: z.enum(["error", "warning"]),
  message: z.string(),
  entities: z.array(z.object({
    type: z.enum(["teacher", "room", "group", "subject"]),
    code: z.string(),
    name: z.string().optional(),
  })),
  details: z.record(z.string(), z.unknown()).optional(),
});

export const VerifyResponseSchema = z.object({
  runId: z.string(),
  status: RunStatusSchema,
  passed: z.boolean(),
  violations: z.array(ViolationSchema),
  summary: z.object({
    hardViolations: z.number().int().nonnegative(),
    softViolations: z.number().int().nonnegative(),
    totalPenalty: z.number().nonnegative(),
  }),
});

export type Violation = z.infer<typeof ViolationSchema>;
export type VerifyResponse = z.infer<typeof VerifyResponseSchema>;

// ============================================
// Timetable View Types
// ============================================

export const ViewKindSchema = z.enum(["group", "teacher", "room", "subject"]);

export const TimetableCellSchema = z.object({
  sessionId: z.string(),
  subjectCode: z.string(),
  subjectName: z.string(),
  type: z.enum(["theory", "practice"]),
  roomCode: z.string(),
  roomName: z.string().optional(),
  teacherCode: z.string(),
  teacherName: z.string(),
  groupCode: z.string().optional(),
  groupName: z.string().optional(),
  day: DaySchema,
  startPeriod: PeriodSchema,
  periods: z.number().int().positive(),
  tnn: z.string().optional(), // ท-ป-น
  level: z.enum(["pass", "review", "fix", "confirmed", "moved"]),
  penalties: z.array(z.object({
    ruleId: z.string(),
    ruleName: z.string(),
    penalty: z.number(),
  })).optional(),
  isOverlap: z.boolean().optional(),
  movedFrom: z.object({
    day: DaySchema,
    period: PeriodSchema,
  }).optional(),
});

export const TimetableViewResponseSchema = z.object({
  runId: z.string(),
  kind: ViewKindSchema,
  key: z.string(), // groupCode, teacherCode, roomCode, or subjectCode
  meta: z.object({
    code: z.string(),
    name: z.string(),
    semester: z.string().optional(),
    weekRange: z.string().optional(),
    advisor: z.string().optional(),
  }).optional(),
  grid: z.object({
    days: z.number().int().min(5).max(5),
    periods: z.number().int().positive(),
    lunchBreak: z.object({
      startPeriod: PeriodSchema,
      endPeriod: PeriodSchema,
      label: z.string(),
    }).optional(),
    totalPeriodsPerWeek: z.number().int().positive(),
  }),
  cells: z.array(TimetableCellSchema),
});

export type ViewKind = z.infer<typeof ViewKindSchema>;
export type TimetableCell = z.infer<typeof TimetableCellSchema>;
export type TimetableViewResponse = z.infer<typeof TimetableViewResponseSchema>;

// ============================================
// Export Types
// ============================================

export const ExportRequestSchema = z.object({
  format: z.enum(["xlsx", "pdf"]),
  viewKind: ViewKindSchema.optional(),
  viewKey: z.string().optional(),
});

export type ExportRequest = z.infer<typeof ExportRequestSchema>;

// ============================================
// AI Comparison Types
// ============================================

export const ComparisonResultSchema = z.object({
  baseline: z.object({
    hardViolations: z.number().int().nonnegative(),
    softPenalty: z.number().nonnegative(),
    placedItems: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    method: z.string(),
  }),
  team: z.object({
    hardViolations: z.number().int().nonnegative(),
    softPenalty: z.number().nonnegative(),
    placedItems: z.number().int().nonnegative(),
    durationMs: z.number().int().nonnegative(),
    method: z.string(),
    aiUsed: z.boolean(),
    aiConfig: z.record(z.string(), z.unknown()).optional(),
  }),
  sameSeed: z.boolean(),
  seed: z.string(),
});

export type ComparisonResult = z.infer<typeof ComparisonResultSchema>;

// ============================================
// Summary Types
// ============================================

export const SummaryResponseSchema = z.object({
  runId: z.string(),
  roomUsagePercent: z.number(),
  teacherLoads: z.array(z.object({
    teacherCode: z.string(),
    teacherName: z.string(),
    periods: z.number().int().nonnegative(),
    maxPeriodsPerDay: z.number().int().positive(),
    exceededDays: z.number().int().nonnegative(),
  })),
  groupFreePeriods: z.array(z.object({
    groupCode: z.string(),
    groupName: z.string(),
    freePeriods: z.number().int().nonnegative(),
    totalPeriods: z.number().int().positive(),
  })),
  requestResults: z.array(z.object({
    requestId: z.string(),
    rawText: z.string(),
    level: RequestLevelSchema,
    result: z.enum(["full", "partial", "none"]),
    reason: z.string().optional(),
  })),
});

export type SummaryResponse = z.infer<typeof SummaryResponseSchema>;

// ============================================
// Auth Types
// ============================================

export const LoginRequestSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    role: z.enum(["admin", "teacher", "student"]),
    name: z.string(),
  }),
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

// ============================================
// Template/Sample Types
// ============================================

export const SampleSizeSchema = z.enum(["small", "medium", "large"]);

export type SampleSize = z.infer<typeof SampleSizeSchema>;
export type SpecialRequest = z.infer<typeof SpecialRequestSchema>;