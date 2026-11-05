import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { UploadCloud, FileUp, Download, CheckCircle2, XCircle } from "lucide-react";
import { apiClient, importApi, type ImportPreviewResponse, type ImportError } from "../api/client";
import { th } from "../i18n/th";

export function Page1Import() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "preview">("upload");
  const [dragActive, setDragActive] = useState(false);

  const previewMutation = useMutation({
    mutationFn: (file: File) => importApi.preview(file),
    onSuccess: (data) => {
      setPreview(data);
      setActiveTab("preview");
    },
    onError: (error) => {
      console.error("Import preview failed:", error);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (importId: string) => importApi.confirm(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["runs"] });
      navigate("/scheduler");
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]?.name.endsWith(".xlsx")) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = () => {
    if (file) previewMutation.mutate(file);
  };

  const handleConfirm = () => {
    if (preview?.importId) confirmMutation.mutate(preview.importId);
  };

  const formatSeverity = (severity: ImportError["severity"]) =>
    severity === "error" ? th.severityError : th.severityWarning;

  return (
    <div className="sl-enter">
      <header className="sl-main__head">
        <div>
          <p className="sl-label">ขั้นที่ 1 จาก 6</p>
          <h1>{th.importTitle}</h1>
          <p>{th.importDescription}</p>
        </div>
        {preview && (
          <span className={`sl-badge ${preview.errors.some((e) => e.severity === "error") ? "sl-badge--bad" : "sl-badge--warn"}`}>
            {preview.errors.length > 0 ? th.errorsFound.replace("{count}", preview.errors.length.toString()) : th.noErrors}
          </span>
        )}
      </header>

      {activeTab === "upload" && (
        <section className="sl-card">
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-4)" }} className="sl-responsive-grid">
            <div
              className={`sl-card ${dragActive ? "is-hover" : ""}`}
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              style={{ cursor: "pointer", border: "var(--border-std) dashed var(--line-strong)", background: "transparent" }}
            >
              <input
                type="file"
                id="file-upload"
                accept=".xlsx"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <label htmlFor="file-upload" style={{ cursor: "pointer", width: "100%", display: "block" }}>
                <div className="sl-empty" style={{ minHeight: "200px" }}>
                  <div style={{ 
                    width: "48px", 
                    height: "48px", 
                    borderRadius: "50%", 
                    background: "var(--accent-soft)", 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "center", 
                    marginBottom: "var(--space-3)" 
                  }}>
                    <UploadCloud size={22} color="var(--accent)" />
                  </div>
                  <h2>{th.uploadFile}</h2>
                  <p className="sl-help">{th.dragDropHint}</p>
                </div>
              </label>
            </div>

            <div className="sl-card--flat" style={{ padding: "var(--space-3)", background: "var(--glass-strong)" }}>
              <h4 style={{ marginBottom: "var(--space-3)" }}>แผ่นงานที่ต้องมี</h4>
              <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                {[
                  { name: "ครู", found: preview?.summary.teachers > 0 },
                  { name: "ไม่สะดวก", found: preview?.summary.specialRequests > 0 },
                  { name: "ห้อง", found: preview?.summary.rooms > 0 },
                  { name: "กลุ่ม", found: preview?.summary.groups > 0 },
                  { name: "รายวิชา ท-ป-น", found: preview?.summary.subjects > 0 },
                  { name: "คำขอพิเศษ", found: preview?.summary.specialRequests > 0 },
                  { name: "รายการสอน", found: preview?.summary.teachingItems > 0 },
                ].map((item, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "14px" }}>
                    {item.found ? <CheckCircle2 size={16} color="var(--accent)" /> : <XCircle size={16} color="var(--danger)" />}
                    <span>{item.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
            <button className="sl-btn sl-btn--pri" onClick={handlePreview} disabled={!file || previewMutation.isPending}>
              {previewMutation.isPending ? (
                <>
                  <span className="sl-spin" aria-hidden="true"></span>
                  {th.loading}
                </>
              ) : (
                th.uploadFile
              )}
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginLeft: "auto" }}>
              <span className="sl-label" style={{ fontSize: "12px" }}>เริ่มจากไฟล์ตัวอย่าง</span>
              <div style={{ display: "flex", gap: "var(--space-3)" }}>
                <a href="/api/templates/blank" className="sl-btn" download style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Download size={16} /> {th.downloadTemplate}
                </a>
                <a href="/api/samples/small" className="sl-btn" download style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Download size={16} /> {th.sampleSmall}
                </a>
                <a href="/api/samples/medium" className="sl-btn" download style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Download size={16} /> {th.sampleMedium}
                </a>
                <a href="/api/samples/large" className="sl-btn" download style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <Download size={16} /> {th.sampleLarge}
                </a>
              </div>
            </div>
          </div>
        </section>
      )}

      {activeTab === "preview" && preview && (
        <>
          <section className="sl-card">
            <div className="sl-card__head">
              <h3 className="sl-card__title">{th.previewTitle}</h3>
              <span className={`sl-badge ${preview.errors.some((e) => e.severity === "error") ? "sl-badge--bad" : "sl-badge--ok"}`}>
                {preview.errors.length > 0 ? th.errorsFound.replace("{count}", preview.errors.length.toString()) : th.noErrors}
              </span>
            </div>

            {preview.warnings.length > 0 && (
              <div className="sl-tablewrap" style={{ marginBottom: "var(--space-4)" }}>
                <table className="sl-table">
                  <thead>
                    <tr>
                      <th scope="col">{th.sheetName}</th>
                      <th scope="col" className="num">{th.rowNumber}</th>
                      <th scope="col">{th.fieldName}</th>
                      <th scope="col">{th.errorMessage}</th>
                      <th scope="col">{th.fixSuggestion}</th>
                      <th scope="col"><span className="sl-badge sl-badge--warn">{th.severityWarning}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.warnings.map((err, i) => (
                      <tr key={i} className="row">
                        <td>{err.sheet}</td>
                        <td className="num">{err.row}</td>
                        <td className="sl-mono">{err.field}</td>
                        <td>{err.message}</td>
                        <td>{err.fix}</td>
                        <td><span className="sl-badge sl-badge--warn">{formatSeverity(err.severity)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.errors.length > 0 && (
              <div className="sl-tablewrap" style={{ marginBottom: "var(--space-4)" }}>
                <table className="sl-table">
                  <thead>
                    <tr>
                      <th scope="col">{th.sheetName}</th>
                      <th scope="col" className="num">{th.rowNumber}</th>
                      <th scope="col">{th.fieldName}</th>
                      <th scope="col">{th.errorMessage}</th>
                      <th scope="col">{th.fixSuggestion}</th>
                      <th scope="col"><span className="sl-badge sl-badge--bad">{th.severityError}</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.errors.map((err, i) => (
                      <tr key={i} className="row is-conflict">
                        <td>{err.sheet}</td>
                        <td className="num">{err.row}</td>
                        <td className="sl-mono">{err.field}</td>
                        <td>{err.message}</td>
                        <td>{err.fix}</td>
                        <td><span className="sl-badge sl-badge--bad">{formatSeverity(err.severity)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {preview.errors.length === 0 && preview.warnings.length === 0 && (
              <div className="sl-empty">
                <div className="sl-empty__ic" aria-hidden="true">✓</div>
                <h2>{th.noErrors}</h2>
                <p className="sl-help">{th.importSuccess}</p>
              </div>
            )}

            <div className="sl-card__head" style={{ marginTop: "var(--space-4)", borderTop: "var(--border-hair) solid var(--line)", paddingTop: "var(--space-4)" }}>
              <h3 className="sl-card__title">{th.confirmTitle}</h3>
              <p className="sl-help" style={{ flex: 1 }}>{th.confirmDescription}</p>
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
              <button className="sl-btn" onClick={() => setActiveTab("upload")}>{th.cancel}</button>
              <button
                className="sl-btn sl-btn--pri"
                onClick={handleConfirm}
                disabled={preview.errors.some((e) => e.severity === "error") || confirmMutation.isPending}
              >
                {confirmMutation.isPending ? (
                  <>
                    <span className="sl-spin" aria-hidden="true"></span>
                    {th.loading}
                  </>
                ) : (
                  th.confirmUseData
                )}
              </button>
            </div>
          </section>

          <section className="sl-card">
            <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>สรุปข้อมูลที่อ่านได้</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-3)" }}>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.teachers}</div>
                <p className="sl-help">ครู</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.rooms}</div>
                <p className="sl-help">ห้องเรียน</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.groups}</div>
                <p className="sl-help">กลุ่มเรียน</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.subjects}</div>
                <p className="sl-help">รายวิชา</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.teachingItems}</div>
                <p className="sl-help">รายการสอน</p>
              </div>
              <div className="sl-card--flat" style={{ padding: "var(--space-3)", textAlign: "center" }}>
                <div className="figure sl-num" style={{ fontSize: "32px" }}>{preview.summary.specialRequests}</div>
                <p className="sl-help">คำขอพิเศษ</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}