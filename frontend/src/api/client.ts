import type { ApiError, RunSolution } from "../types/contract";

export class ApiRequestError extends Error {
  readonly code: string;

  constructor(error: ApiError, status: number) {
    super(`${error.message} (${error.code}, HTTP ${status})`);
    this.name = "ApiRequestError";
    this.code = error.code;
  }
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    const error: ApiError = isApiError(body)
      ? body
      : { code: "E-API-001", message: "เซิร์ฟเวอร์ส่งข้อมูลผิดรูปแบบ" };
    throw new ApiRequestError(error, response.status);
  }

  return body as T;
}

function isApiError(value: unknown): value is ApiError {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.code === "string" && typeof candidate.message === "string";
}

export function verifyRun(runId: string): Promise<RunSolution> {
  return requestJson<RunSolution>(`/api/runs/${encodeURIComponent(runId)}/verify`);
}
