import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { runsApi, type RunResponse, type RunStatus, type RunCreate } from "../api/client";
import { th } from "../i18n/th";

const statusLabels: Record<RunStatus, string> = {
  queued: th.runStatus.queued,
  planning: th.runStatus.planning,
  solving: th.runStatus.solving,
  verifying: th.runStatus.verifying,
  verified: th.runStatus.verified,
  infeasible: th.runStatus.infeasible,
  cancelled: th.runStatus.cancelled,
  failed: th.runStatus.failed,
};

const statusBadgeClass: Record<RunStatus, string> = {
  queued: "sl-badge--mute",
  planning: "sl-badge--info",
  solving: "sl-badge--info",
  verifying: "sl-badge--info",
  verified: "sl-badge--ok",
  infeasible: "sl-badge--warn",
  cancelled: "sl-badge--mute",
  failed: "sl-badge--bad",
};

export function Page3Scheduler() {
  const queryClient = useQueryClient();
  const [seed, setSeed] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const eventSource = useRef<EventSource | null>(null);

  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs"],
    queryFn: () => runsApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: (data: RunCreate) => runsApi.create(data),
    onSuccess: (newRun) => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      setSelectedRunId(newRun.id);
      connectSSE(newRun.id);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => runsApi.cancel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      disconnectSSE();
    },
  });

  // SSE connection for real-time progress
  const connectSSE = (runId: string) => {
    disconnectSSE();
    const es = new EventSource(runsApi.events(runId));
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        queryClient.setQueryData(["runs", runId], (old: RunResponse | undefined) => ({
          ...old,
          ...data,
          progress: { ...old?.progress, ...data.progress },
        }));
      } catch {
        // Ignore parse errors
      }
    };
    es.onerror = () => {
      es.close();
      eventSource.current = null;
    };
    eventSource.current = es;
  };

  const disconnectSSE = () => {
    if (eventSource.current) {
      eventSource.current.close();
      eventSource.current = null;
    }
  };

  useEffect(() => {
    return () => disconnectSSE();
  }, []);

  const handleRun = () => {
    createMutation.mutate({ seed: seed || undefined });
  };

  const handleCancel = (id: string) => {
    cancelMutation.mutate(id);
  };

  const handleViewTimetable = (id: string) => {
    setSelectedRunId(id);
    // Navigate to timetable page with runId
    window.location.href = `/timetable?runId=${id}`;
  };

  const selectedRun = (runs?.runs || []).find((r) => r.id === selectedRunId) || runs?.runs?.[0] || null;

  if (isLoading) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.schedulerTitle}</h1>
            <p>{th.schedulerDescription}</p>
          </div>
        </header>
        <section className="sl-card"><p>{th.loading}</p></section>
      </div>
    );
  }

  return (
    <div className="sl-enter">
      <header className="sl-main__head">
        <div>
          <p className="sl-label">{th.appName.toUpperCase()}</p>
          <h1>{th.schedulerTitle}</h1>
          <p>{th.schedulerDescription}</p>
        </div>
      </header>

      {/* Run Controls */}
      <section className="sl-card">
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.schedulerTitle}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}>
          <div className="sl-field" style={{ flex: 1, minWidth: "200px" }}>
            <label className="sl-label" htmlFor="seed">{th.seedLabel}</label>
            <input
              id="seed"
              type="text"
              className="sl-input sl-mono"
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder={th.seedPlaceholder}
            />
          </div>
          <button
            className="sl-btn sl-btn--pri"
            onClick={handleRun}
            disabled={createMutation.isPending}
            style={{ minWidth: "160px" }}
          >
            {createMutation.isPending ? (
              <>
                <span className="sl-spin" aria-hidden="true"></span>
                {th.loading}
              </>
            ) : (
              th.runScheduler
            )}
          </button>
          {selectedRun && selectedRun.status !== "verified" && selectedRun.status !== "infeasible" && selectedRun.status !== "cancelled" && selectedRun.status !== "failed" && (
            <button
              className="sl-btn sl-btn--danger"
              onClick={() => handleCancel(selectedRun.id)}
              disabled={cancelMutation.isPending}
            >
              {th.cancelRun}
            </button>
          )}
        </div>
      </section>

      {/* Progress */}
      {selectedRun && (
        <section className="sl-card">
          <div className="sl-card__head">
            <h3 className="sl-card__title">{th.progressTitle}</h3>
            <span className={`sl-badge ${statusBadgeClass[selectedRun.status]}`}>
              {statusLabels[selectedRun.status]}
            </span>
          </div>

          {selectedRun.progress && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)" }}>
                <p className="sl-label">{th.progressPhase}</p>
                <p className="sl-mono" style={{ fontSize: "18px", fontWeight: 600 }}>{selectedRun.progress.phase}</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)" }}>
                <p className="sl-label">{th.progressIterations}</p>
                <p className="figure sl-num" style={{ fontSize: "24px" }}>{selectedRun.progress.iterations.toLocaleString()}</p>
              </div>
              {selectedRun.progress.bestScore !== undefined && (
                <div className="sl-card--flat" style={{ padding: "var(--space-3)" }}>
                  <p className="sl-label">{th.progressBestScore}</p>
                  <p className="figure sl-num" style={{ fontSize: "24px" }}>{selectedRun.progress.bestScore.toFixed(2)}</p>
                </div>
              )}
              {selectedRun.progress.currentScore !== undefined && (
                <div className="sl-card--flat" style={{ padding: "var(--space-3)" }}>
                  <p className="sl-label">{th.progressCurrentScore}</p>
                  <p className="figure sl-num" style={{ fontSize: "24px" }}>{selectedRun.progress.currentScore.toFixed(2)}</p>
                </div>
              )}
            </div>
          )}

          <div className="sl-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={selectedRun.progress?.iterations ? Math.min(100, selectedRun.progress.iterations / 10) : 0}>
            <i style={{ "--v": `${Math.min(100, (selectedRun.progress?.iterations || 0) / 10)}%` } as React.CSSProperties}></i>
          </div>
          <p className="sl-help" style={{ marginTop: "var(--space-2)", textAlign: "center" }}>
            {th.progressPhase}: {selectedRun.progress?.phase || th.runStatus.queued}
          </p>
        </section>
      )}

      {/* Results */}
      {selectedRun && (selectedRun.status === "verified" || selectedRun.status === "infeasible" || selectedRun.status === "failed") && (
        <section className="sl-card">
          <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.resultsTitle}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
            <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
              <div className="figure sl-num" style={{ fontSize: "36px", color: selectedRun.status === "verified" ? "var(--accent)" : "var(--danger)" }}>
                {selectedRun.score?.placedItems || 0}
              </div>
              <p className="sl-help">{th.placedItems} {th.totalItems} {selectedRun.score?.totalItems || 0}</p>
            </div>
            <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
              <div className="figure sl-num" style={{ fontSize: "36px", color: "var(--danger)" }}>
                {selectedRun.score?.teacherConflicts || 0 + (selectedRun.score?.roomConflicts || 0) + (selectedRun.score?.groupConflicts || 0)}
              </div>
              <p className="sl-help">{th.conflicts}</p>
            </div>
            <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
              <div className="figure sl-num" style={{ fontSize: "36px", color: "var(--amber)" }}>
                {selectedRun.score?.softPenalty?.toFixed(1) || 0}
              </div>
              <p className="sl-help">{th.penaltyScore}</p>
            </div>
            <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
              <div className="figure sl-num" style={{ fontSize: "36px" }}>
                {(selectedRun.timing?.durationMs || 0) / 1000}s
              </div>
              <p className="sl-help">{th.duration}</p>
            </div>
          </div>

          {selectedRun.status === "infeasible" && selectedRun.error && (
            <div className="sl-card--flat" style={{ background: "var(--danger-soft)", border: "var(--border-bold) solid var(--danger)", padding: "var(--space-3)", borderRadius: "var(--radius-lg)", marginBottom: "var(--space-4)" }}>
              <p className="sl-label" style={{ color: "var(--danger)" }}>{th.runStatus.infeasible}</p>
              <p>{selectedRun.error.message}</p>
              {selectedRun.error.details && selectedRun.error.details.length > 0 && (
                <ul style={{ marginTop: "var(--space-2)", paddingLeft: "var(--space-4)" }}>
                  {selectedRun.error.details.map((d, i) => (
                    <li key={i} className="sl-help">{String(d)}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
            <button className="sl-btn sl-btn--pri" onClick={() => handleViewTimetable(selectedRun.id)}>
              {th.viewTimetable}
            </button>
            <button className="sl-btn" onClick={handleRun}>
              {th.runAgain}
            </button>
            <a href="/ai-results" className="sl-btn">
              {th.aiResults}
            </a>
          </div>
        </section>
      )}

      {/* Runs History */}
      <section className="sl-card">
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.runs}</h3>

        {(!runs || !runs.runs || runs.runs.length === 0) && (
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">⚙️</div>
            <h2>{th.noRuns}</h2>
            <p className="sl-help">{th.schedulerDescription}</p>
          </div>
        )}

        {runs && runs.runs && runs.runs.length > 0 && (
          <div className="sl-tablewrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th scope="col">ID</th>
                  <th scope="col">Seed</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col">จัดครบ</th>
                  <th scope="col">ชน</th>
                  <th scope="col">โทษ</th>
                  <th scope="col">เวลา</th>
                  <th scope="col">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {runs.runs.slice().reverse().map((run) => (
                  <tr key={run.id} className={run.id === selectedRunId ? "is-selected" : ""}>
                    <td className="sl-mono">{run.id.slice(0, 8)}…</td>
                    <td className="sl-mono">{run.seed}</td>
                    <td><span className={`sl-badge ${statusBadgeClass[run.status]}`}>{statusLabels[run.status]}</span></td>
                    <td className="num">{run.score?.placedItems || 0} / {run.score?.totalItems || 0}</td>
                    <td className="num">
                      {(run.score?.teacherConflicts || 0) + (run.score?.roomConflicts || 0) + (run.score?.groupConflicts || 0)}
                    </td>
                    <td className="num">{run.score?.softPenalty?.toFixed(1) || 0}</td>
                    <td className="sl-mono">
                      {run.timing?.durationMs ? `${(run.timing.durationMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        {run.status === "verified" && (
                          <button className="sl-btn sl-btn--sm sl-btn--pri" onClick={() => handleViewTimetable(run.id)}>
                            {th.viewTimetable}
                          </button>
                        )}
                        {run.status === "solving" || run.status === "planning" || run.status === "verifying" ? (
                          <button className="sl-btn sl-btn--sm sl-btn--danger" onClick={() => handleCancel(run.id)}>
                            {th.cancelRun}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}