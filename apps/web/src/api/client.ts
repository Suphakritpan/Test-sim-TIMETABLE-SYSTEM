import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { useAuthStore } from "../hooks/useAuthStore";
import type {
  ImportPreviewResponse,
  RulesResponse,
  Rule,
  RunCreate,
  RunResponse,
  RunListResponse,
  VerifyResponse,
  SummaryResponse,
  ComparisonResult,
  TimetableViewResponse,
  SpecialRequest,
  LoginResponse,
} from "../types/api";

// ============================================
// Helper to extract data from axios response
// ============================================
function unwrap<T>(promise: Promise<AxiosResponse<T>>): Promise<T> {
  return promise.then((res) => res.data);
}

// ============================================
// Axios Instance
// ============================================

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE,
    timeout: 30000,
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  // Request interceptor - add auth token
  client.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      const token = useAuthStore.getState().accessToken;
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response interceptor - handle 401, refresh token
  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = useAuthStore.getState().refreshToken;
          if (refreshToken) {
            const response = await axios.post(
              `${API_BASE}/auth/refresh`,
              { refreshToken },
              { withCredentials: true }
            );
            const { accessToken, refreshToken: newRefreshToken } = response.data;
            useAuthStore.getState().setTokens(accessToken, newRefreshToken);
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            return client(originalRequest);
          }
        } catch {
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}

export const apiClient = createApiClient();

// ============================================
// API Error Class
// ============================================

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details: unknown[];

  constructor(message: string, code: string, status: number, details: unknown[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static fromAxiosError(error: AxiosError): ApiError {
    if (error.response?.data && typeof error.response.data === "object") {
      const data = error.response.data as {
        code?: string;
        message?: string;
        details?: unknown[];
      };
      return new ApiError(
        data.message || error.message,
        data.code || "E-UNKNOWN",
        error.response.status,
        data.details || []
      );
    }
    return new ApiError(error.message, "E-NETWORK", error.response?.status || 0);
  }
}

// ============================================
// Query Keys
// ============================================

export const queryKeys = {
  // Auth
  me: ["auth", "me"] as const,

  // Import
  importPreview: (importId: string) => ["import", "preview", importId] as const,
  importTemplates: ["import", "templates"] as const,
  importSamples: ["import", "samples"] as const,

  // Rules
  rules: ["rules"] as const,

  // Runs
  runs: ["runs"] as const,
  run: (id: string) => ["runs", id] as const,
  runVerify: (id: string) => ["runs", id, "verify"] as const,
  runExplain: (id: string) => ["runs", id, "explain"] as const,
  runSummary: (id: string) => ["runs", id, "summary"] as const,
  runCompare: (id: string) => ["runs", id, "compare"] as const,

  // Timetable Views
  timetableView: (runId: string, kind: string, key: string) =>
    ["runs", runId, "views", kind, key] as const,

  // Special Requests
  requests: ["requests"] as const,
} as const;

// ============================================
// API Functions (returning unwrapped data)
// ============================================

// Auth
export const authApi = {
  login: (username: string, password: string) =>
    unwrap(apiClient.post<LoginResponse>("/auth/login", { username, password })),

  logout: () => unwrap(apiClient.post("/auth/logout")),

  refresh: (refreshToken: string) =>
    unwrap(apiClient.post<{ accessToken: string; refreshToken: string }>("/auth/refresh", { refreshToken })),

  me: () => unwrap(apiClient.get<LoginResponse["user"]>("/auth/me")),
};

// Import
export const importApi = {
  getTemplates: () => unwrap(apiClient.get("/templates/blank")),
  getSamples: () => unwrap(apiClient.get("/samples")),

  preview: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return unwrap(
      apiClient.post<ImportPreviewResponse>("/import/preview", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    );
  },

  confirm: (importId: string) => unwrap(apiClient.post(`/import/${importId}/confirm`)),

  getPreview: (importId: string) => unwrap(apiClient.get<ImportPreviewResponse>(`/import/${importId}/preview`)),
};

// Rules
export const rulesApi = {
  get: () => unwrap(apiClient.get<RulesResponse>("/rules")),
  update: (rules: Rule[], version: number) => unwrap(apiClient.put("/rules", { rules, version })),
};

// Runs
export const runsApi = {
  list: () => unwrap(apiClient.get<RunListResponse>("/runs")),
  create: (data: RunCreate) => unwrap(apiClient.post<RunResponse>("/runs", data)),
  get: (id: string) => unwrap(apiClient.get<RunResponse>(`/runs/${id}`)),
  cancel: (id: string) => unwrap(apiClient.post(`/runs/${id}/cancel`)),
  verify: (id: string) => unwrap(apiClient.get<VerifyResponse>(`/runs/${id}/verify`)),
  explain: (id: string) => unwrap(apiClient.get(`/runs/${id}/explain`)),
  summary: (id: string) => unwrap(apiClient.get<SummaryResponse>(`/runs/${id}/summary`)),
  compare: (id: string) => unwrap(apiClient.post<ComparisonResult>(`/compare`, { runId: id })),
  export: (id: string, format: "xlsx" | "pdf", viewKind?: string, viewKey?: string) =>
    unwrap(
      apiClient.post(`/runs/${id}/export`, { format, viewKind, viewKey }, {
        responseType: "blob",
      })
    ),
  events: (id: string) => `${API_BASE}/runs/${id}/events`, // SSE endpoint
};

// Timetable Views
export const timetableApi = {
  getView: (runId: string, kind: string, key: string) =>
    unwrap(apiClient.get<TimetableViewResponse>(`/runs/${runId}/views/${kind}/${key}`)),
};

// Special Requests
export const requestsApi = {
  list: () => unwrap(apiClient.get<SpecialRequest[]>("/requests")),
  create: (data: { rawText: string }) => unwrap(apiClient.post<SpecialRequest>("/requests", data)),
  update: (id: string, data: Partial<SpecialRequest>) => unwrap(apiClient.put<SpecialRequest>(`/requests/${id}`, data)),
  parse: (text: string) => unwrap(apiClient.post<SpecialRequest>("/requests/parse", { text })),
  confirm: (id: string) => unwrap(apiClient.post(`/requests/${id}/confirm`)),
  delete: (id: string) => unwrap(apiClient.delete(`/requests/${id}`)),
};

// Re-export types for convenience
export type {
  ImportPreviewResponse,
  ImportError,
  Rule,
  RulesResponse,
  RunStatus,
  RunCreate,
  RunResponse,
  RunListResponse,
  Violation,
  VerifyResponse,
  ViewKind,
  TimetableCell,
  TimetableViewResponse,
  ExportRequest,
  ComparisonResult,
  SummaryResponse,
  LoginRequest,
  LoginResponse,
  SampleSize,
  TeacherSchema,
  TeacherUnavailableSchema,
  RoomSchema,
  GroupSchema,
  SubjectSchema,
  TeachingItemSchema,
  SpecialRequest,
} from "../types/api";