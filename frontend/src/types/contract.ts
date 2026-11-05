export type RunState = "queued" | "running" | "verified" | "failed";

export interface Placement {
  offeringId: string;
  teacherId: string;
  roomId: string;
  day: number;
  from: number;
  to: number;
}

export interface RunSolution {
  schemaVersion: "1.0";
  runId: string;
  seed: number;
  rulesVersion: number;
  stats: {
    hard: number;
    soft: number;
    generations: number;
    ms: number;
  };
  placements: Placement[];
}

export interface ApiError {
  code: string;
  message: string;
  details?: ReadonlyArray<Record<string, string | number>>;
}
