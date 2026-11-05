import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { authApi, apiClient } from "../api/client";
import { useAuthStore } from "../hooks/useAuthStore";
import { th } from "../i18n/th";

export function LoginPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const loginMutation = useMutation({
    mutationFn: (credentials: { username: string; password: string }) =>
      authApi.login(credentials.username, credentials.password),
    onSuccess: (data) => {
      setTokens(data.accessToken, data.refreshToken);
      setUser(data.user);
      navigate("/import");
    },
    onError: (error) => {
      setError(error.message || th.apiUnavailable);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ username, password });
  };

  return (
    <div className="sl-ground" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div className="sl-card" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="sl-card__head" style={{ justifyContent: "center", marginBottom: "var(--space-5)" }}>
          <span className="sl-rail__mark" aria-hidden="true">S</span>
        </div>
        <h1 style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>{th.appName}</h1>
        <p style={{ textAlign: "center", color: "var(--ink-2)", marginBottom: "var(--space-5)" }}>{th.railDescription}</p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="sl-card--flat" style={{ background: "var(--danger-soft)", border: "var(--border-std) solid var(--danger)", padding: "var(--space-3)", borderRadius: "var(--radius-md)", marginBottom: "var(--space-4)", color: "var(--danger)" }}>
              {error}
            </div>
          )}

          <div className="sl-field" style={{ marginBottom: "var(--space-3)" }}>
            <label className="sl-label" htmlFor="username">ชื่อผู้ใช้</label>
            <input
              id="username"
              type="text"
              className="sl-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              disabled={loginMutation.isPending}
            />
          </div>

          <div className="sl-field" style={{ marginBottom: "var(--space-4)" }}>
            <label className="sl-label" htmlFor="password">รหัสผ่าน</label>
            <input
              id="password"
              type="password"
              className="sl-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              disabled={loginMutation.isPending}
            />
          </div>

          <button
            className="sl-btn sl-btn--pri"
            type="submit"
            disabled={loginMutation.isPending}
            style={{ width: "100%" }}
          >
            {loginMutation.isPending ? (
              <>
                <span className="sl-spin" aria-hidden="true"></span>
                {th.loading}
              </>
            ) : (
              "เข้าสู่ระบบ"
            )}
          </button>
        </form>

        <p className="sl-help" style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "12px" }}>
          ระบบจัดตารางสอนอัตโนมัติ Slotline
        </p>
      </div>
    </div>
  );
}