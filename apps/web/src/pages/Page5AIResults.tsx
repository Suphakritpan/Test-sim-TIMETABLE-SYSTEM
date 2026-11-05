import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { runsApi, type ComparisonResult } from "../api/client";
import { th } from "../i18n/th";

export function Page5AIResults() {
  const queryClient = useQueryClient();
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: () => runsApi.list(),
  });

  const compareMutation = useMutation({
    mutationFn: (runId: string) => runsApi.compare(runId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
    },
  });

  const { data: comparison } = useQuery({
    queryKey: ["comparison", selectedRunId],
    queryFn: () => runsApi.compare(selectedRunId),
    enabled: !!selectedRunId,
  });

  const verifiedRuns = runs?.runs.filter((r) => r.status === "verified") || [];

  if (verifiedRuns.length === 0) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.aiResultsTitle}</h1>
            <p>{th.aiResultsDescription}</p>
          </div>
        </header>
        <section className="sl-card">
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">🤖</div>
            <h2>ยังไม่มีข้อมูลเปรียบเทียบ</h2>
            <p className="sl-help">ต้องมีรอบการจัดตารางที่ verified อย่างน้อย 1 รอบ</p>
            <a href="/scheduler" className="sl-btn sl-btn--pri">{th.runScheduler}</a>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="sl-enter">
      <header className="sl-main__head">
        <div>
          <p className="sl-label">{th.appName.toUpperCase()}</p>
          <h1>{th.aiResultsTitle}</h1>
          <p>{th.aiResultsDescription}</p>
        </div>
      </header>

      {/* Run Selector */}
      <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.comparisonTitle}</h3>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: "280px" }}>
            <span className="sl-label">{th.runs}</span>
            <select
              className="sl-select"
              value={selectedRunId}
              onChange={(e) => setSelectedRunId(e.target.value)}
            >
              <option value="">{th.overview}</option>
              {verifiedRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.id.slice(0, 8)}… · Seed: {run.seed} · {new Date(run.createdAt).toLocaleString("th-TH")}
                </option>
              ))}
            </select>
          </label>
          <button
            className="sl-btn sl-btn--pri"
            onClick={() => selectedRunId && compareMutation.mutate(selectedRunId)}
            disabled={!selectedRunId || compareMutation.isPending}
          >
            {compareMutation.isPending ? (
              <>
                <span className="sl-spin" aria-hidden="true"></span>
                {th.loading}
              </>
            ) : (
              th.runComparison
            )}
          </button>
        </div>
      </section>

      {/* Comparison Results */}
      {comparison && (
        <>
          <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
            <div className="sl-card__head">
              <h3 className="sl-card__title">{th.comparisonTitle}</h3>
              <span className={`sl-badge ${comparison.sameSeed ? "sl-badge--ok" : "sl-badge--warn"}`}>
                {comparison.sameSeed ? th.sameSeed : "Seed ต่างกัน"}
              </span>
            </div>

            <div className="sl-tablewrap">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th scope="col">เมตริก</th>
                    <th scope="col" className="num">{th.baselineMethod}</th>
                    <th scope="col" className="num">{th.teamMethod}</th>
                    <th scope="col" className="num">ความต่าง</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{th.metrics.hardViolations}</td>
                    <td className="num sl-mono">{comparison.baseline.hardViolations}</td>
                    <td className="num sl-mono">{comparison.team.hardViolations}</td>
                    <td className="num sl-mono" style={{ color: comparison.team.hardViolations <= comparison.baseline.hardViolations ? "var(--accent)" : "var(--danger)" }}>
                      {comparison.team.hardViolations - comparison.baseline.hardViolations >= 0 ? "+" : ""}
                      {comparison.team.hardViolations - comparison.baseline.hardViolations}
                    </td>
                  </tr>
                  <tr>
                    <td>{th.metrics.softPenalty}</td>
                    <td className="num sl-mono">{comparison.baseline.softPenalty.toFixed(2)}</td>
                    <td className="num sl-mono">{comparison.team.softPenalty.toFixed(2)}</td>
                    <td className="num sl-mono" style={{ color: comparison.team.softPenalty <= comparison.baseline.softPenalty ? "var(--accent)" : "var(--danger)" }}>
                      {comparison.team.softPenalty - comparison.baseline.softPenalty >= 0 ? "+" : ""}
                      {(comparison.team.softPenalty - comparison.baseline.softPenalty).toFixed(2)}
                    </td>
                  </tr>
                  <tr>
                    <td>{th.metrics.placedItems}</td>
                    <td className="num sl-mono">{comparison.baseline.placedItems}</td>
                    <td className="num sl-mono">{comparison.team.placedItems}</td>
                    <td className="num sl-mono" style={{ color: comparison.team.placedItems >= comparison.baseline.placedItems ? "var(--accent)" : "var(--danger)" }}>
                      {comparison.team.placedItems - comparison.baseline.placedItems >= 0 ? "+" : ""}
                      {comparison.team.placedItems - comparison.baseline.placedItems}
                    </td>
                  </tr>
                  <tr>
                    <td>{th.metrics.duration}</td>
                    <td className="num sl-mono">{(comparison.baseline.durationMs / 1000).toFixed(1)}s</td>
                    <td className="num sl-mono">{(comparison.team.durationMs / 1000).toFixed(1)}s</td>
                    <td className="num sl-mono">
                      {((comparison.team.durationMs - comparison.baseline.durationMs) / 1000).toFixed(1)}s
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
              <div className="sl-card--flat" style={{ padding: "var(--space-4)" }}>
                <h4 style={{ marginBottom: "var(--space-2)" }}>{th.baselineMethod}</h4>
                <p className="sl-help">{comparison.baseline.method}</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-4)" }}>
                <h4 style={{ marginBottom: "var(--space-2)" }}>{th.teamMethod}</h4>
                <p className="sl-help">{comparison.team.method}</p>
                {comparison.team.aiUsed && (
                  <div style={{ marginTop: "var(--space-2)", padding: "var(--space-2)", background: "var(--amber-soft)", borderRadius: "var(--radius-md)" }}>
                    <p className="sl-label" style={{ color: "var(--amber-text)" }}>{th.aiUsed}</p>
                    <pre className="sl-mono" style={{ fontSize: "11px", overflow: "auto" }}>{JSON.stringify(comparison.team.aiConfig, null, 2)}</pre>
                  </div>
                )}
                {!comparison.team.aiUsed && (
                  <p className="sl-label" style={{ color: "var(--ink-3)", marginTop: "var(--space-2)" }}>{th.aiNotUsed}</p>
                )}
              </div>
            </div>
          </section>

          <section className="sl-card">
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>Seed: {comparison.seed}</h3>
            <p className="sl-help">รันซ้ำด้วย seed เดียวกันจะได้ผลลัพธ์เหมือนเดิมทุกครั้ง (Deterministic)</p>
          </section>
        </>
      )}

      {!comparison && selectedRunId && (
        <section className="sl-card">
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">🤖</div>
            <h2>{th.noComparison}</h2>
            <p className="sl-help">กดปุ่ม "รันการเปรียบเทียบ" เพื่อเริ่มเปรียบเทียบ</p>
          </div>
        </section>
      )}
    </div>
  );
}