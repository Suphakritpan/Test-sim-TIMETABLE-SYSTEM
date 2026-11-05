import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { runsApi, type SummaryResponse, type RunResponse } from "../api/client";
import { th } from "../i18n/th";

export function Page6Summary() {
  const [selectedRunId, setSelectedRunId] = useState<string>("");

  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: () => runsApi.list(),
  });

  const { data: summary, isLoading } = useQuery({
    queryKey: ["summary", selectedRunId],
    queryFn: () => runsApi.summary(selectedRunId),
    enabled: !!selectedRunId,
  });

  const exportPdfMutation = useMutation({
    mutationFn: ({ runId }: { runId: string }) => runsApi.export(runId, "pdf"),
    onSuccess: (blob, { runId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timetable-${runId}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const exportExcelMutation = useMutation({
    mutationFn: ({ runId }: { runId: string }) => runsApi.export(runId, "xlsx"),
    onSuccess: (blob, { runId }) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `timetable-${runId}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    },
  });

  const verifiedRuns = runs?.runs.filter((r) => r.status === "verified" || r.status === "infeasible") || [];

  if (verifiedRuns.length === 0) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.summaryTitle}</h1>
            <p>{th.summaryDescription}</p>
          </div>
        </header>
        <section className="sl-card">
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">📊</div>
            <h2>ยังไม่มีข้อมูลสรุป</h2>
            <p className="sl-help">ต้องมีรอบการจัดตารางที่ verified หรือ infeasible อย่างน้อย 1 รอบ</p>
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
          <h1>{th.summaryTitle}</h1>
          <p>{th.summaryDescription}</p>
        </div>
      </header>

      {/* Run Selector */}
      <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>เลือกรอบการจัดตาราง</h3>
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
                  {run.id.slice(0, 8)}… · Seed: {run.seed} · {statusLabels[run.status]} · {new Date(run.createdAt).toLocaleString("th-TH")}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {selectedRunId && isLoading && (
        <section className="sl-card"><p>{th.loading}</p></section>
      )}

      {summary && (
        <>
          {/* Room Usage */}
          <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
            <div className="sl-card__head">
              <h3 className="sl-card__title">{th.roomUsage}</h3>
              <div className="figure sl-num" style={{ fontSize: "36px", color: "var(--accent)" }}>
                {th.roomUsagePercent.replace("{percent}", summary.roomUsagePercent.toFixed(1))}
              </div>
            </div>
          </section>

          {/* Teacher Loads */}
          <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.teacherLoad}</h3>
            <div className="sl-tablewrap">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th scope="col">{th.teacherName}</th>
                    <th scope="col" className="num">{th.teacherPeriods}</th>
                    <th scope="col" className="num">{th.teacherMaxPerDay}</th>
                    <th scope="col" className="num">{th.teacherExceeded}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.teacherLoads.map((t, i) => (
                    <tr key={i} className={t.exceededDays > 0 ? "is-conflict" : ""}>
                      <td>{t.teacherName} <span className="sl-mono">({t.teacherCode})</span></td>
                      <td className="num sl-mono">{t.periods}</td>
                      <td className="num sl-mono">{t.maxPeriodsPerDay}</td>
                      <td className="num">
                        {t.exceededDays > 0 ? (
                          <span className="sl-badge sl-badge--bad">{t.exceededDays} วัน</span>
                        ) : (
                          <span className="sl-badge sl-badge--ok">0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Group Free Periods */}
          <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.groupFreePeriods}</h3>
            <div className="sl-tablewrap">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th scope="col">{th.groupName}</th>
                    <th scope="col" className="num">{th.freePeriods}</th>
                    <th scope="col" className="num">{th.totalPeriods}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.groupFreePeriods.map((g, i) => (
                    <tr key={i}>
                      <td>{g.groupName} <span className="sl-mono">({g.groupCode})</span></td>
                      <td className="num sl-mono">{g.freePeriods}</td>
                      <td className="num sl-mono">{g.totalPeriods}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Request Results */}
          <section className="sl-card" style={{ marginBottom: "var(--space-4)" }}>
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>{th.requestResults}</h3>
            <div className="sl-tablewrap">
              <table className="sl-table">
                <thead>
                  <tr>
                    <th scope="col">คำขอ</th>
                    <th scope="col">ระดับ</th>
                    <th scope="col">ผลลัพธ์</th>
                    <th scope="col">เหตุผล</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.requestResults.map((r, i) => {
                    const resultBadge = r.result === "full" ? "sl-badge--ok" : r.result === "partial" ? "sl-badge--warn" : "sl-badge--bad";
                    const resultLabel = r.result === "full" ? th.requestResultFull : r.result === "partial" ? th.requestResultPartial : th.requestResultNone;
                    return (
                      <tr key={i}>
                        <td className="sl-mono">{r.rawText}</td>
                        <td>
                          {r.level === "must" && <span className="sl-badge sl-badge--bad">{th.requestLevelMust}</span>}
                          {r.level === "try" && <span className="sl-badge sl-badge--warn">{th.requestLevelTry}</span>}
                          {r.level === "noop" && <span className="sl-badge sl-badge--mute">{th.requestLevelNoop}</span>}
                        </td>
                        <td><span className={`sl-badge ${resultBadge}`}>{resultLabel}</span></td>
                        <td>{r.reason || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Export Buttons */}
          <section className="sl-card">
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>ส่งออกข้อมูล</h3>
            <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <button
                className="sl-btn sl-btn--pri"
                onClick={() => exportPdfMutation.mutate({ runId: selectedRunId })}
                disabled={exportPdfMutation.isPending}
              >
                {exportPdfMutation.isPending ? (
                  <>
                    <span className="sl-spin" aria-hidden="true"></span>
                    {th.pdfGenerating}
                  </>
                ) : (
                  th.exportPDF
                )}
              </button>
              <button
                className="sl-btn"
                onClick={() => exportExcelMutation.mutate({ runId: selectedRunId })}
                disabled={exportExcelMutation.isPending}
              >
                {exportExcelMutation.isPending ? (
                  <>
                    <span className="sl-spin" aria-hidden="true"></span>
                    {th.excelGenerating}
                  </>
                ) : (
                  th.exportExcel
                )}
              </button>
              {summary.runId && (
                <span className="sl-help" style={{ alignSelf: "center" }}>
                  {th.exportDisabled}
                </span>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const statusLabels: Record<string, string> = {
  queued: "รอคิว",
  planning: "วางแผน",
  solving: "กำลังจัด",
  verifying: "กำลังตรวจ",
  verified: "ผ่านการตรวจ",
  infeasible: "จัดไม่ได้",
  cancelled: "ยกเลิกแล้ว",
  failed: "ล้มเหลว",
};