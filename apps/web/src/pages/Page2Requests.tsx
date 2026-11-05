import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { requestsApi, type SpecialRequest } from "../api/client";
import { th } from "../i18n/th";

const emptyRequest = {
  rawText: "",
  parsed: undefined,
  level: "try" as const,
  status: "pending" as const,
};

export function Page2Requests() {
  const queryClient = useQueryClient();
  const [newRequestText, setNewRequestText] = useState("");
  const [showManualForm, setShowManualForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<SpecialRequest> | null>(null);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["requests"],
    queryFn: () => requestsApi.list(),
  });

  const parseMutation = useMutation({
    mutationFn: (text: string) => requestsApi.parse(text),
    onSuccess: (data) => {
      setNewRequestText("");
      setShowManualForm(true);
      setEditData(data);
    },
    onError: () => {
      setShowManualForm(true);
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: { rawText: string; parsed?: SpecialRequest["parsed"]; level: SpecialRequest["level"] }) =>
      requestsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setShowManualForm(false);
      setEditData(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SpecialRequest> }) =>
      requestsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setEditingId(null);
      setEditData(null);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: (id: string) => requestsApi.confirm(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => requestsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requests"] }),
  });

  const handleParse = () => {
    if (newRequestText.trim()) parseMutation.mutate(newRequestText.trim());
  };

  const handleSave = (data: { rawText: string; parsed?: SpecialRequest["parsed"]; level: SpecialRequest["level"] }) => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getLevelBadge = (level: SpecialRequest["level"]) => {
    switch (level) {
      case "must":
        return <span className="sl-badge sl-badge--bad">{th.requestLevelMust}</span>;
      case "try":
        return <span className="sl-badge sl-badge--warn">{th.requestLevelTry}</span>;
      case "noop":
        return <span className="sl-badge sl-badge--mute">{th.requestLevelNoop}</span>;
    }
  };

  const getStatusBadge = (status: SpecialRequest["status"]) => {
    switch (status) {
      case "confirmed":
        return <span className="sl-badge sl-badge--ok">ยืนยันแล้ว</span>;
      case "rejected":
        return <span className="sl-badge sl-badge--bad">ปฏิเสธ</span>;
      default:
        return <span className="sl-badge sl-badge--info">รอดำเนินการ</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.requestsTitle}</h1>
            <p>{th.requestsDescription}</p>
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
          <h1>{th.requestsTitle}</h1>
          <p>{th.requestsDescription}</p>
        </div>
      </header>

      {/* Add Request Form */}
      <section className="sl-card">
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>
          {editingId ? "แก้ไขคำขอ" : th.addRequest}
        </h3>

        {!showManualForm && !editingId ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <div className="sl-field">
              <label className="sl-label" htmlFor="request-text">{th.requestText}</label>
              <textarea
                id="request-text"
                className="sl-input"
                rows={3}
                value={newRequestText}
                onChange={(e) => setNewRequestText(e.target.value)}
                placeholder={th.requestTextPlaceholder}
              />
            </div>
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <button
                className="sl-btn sl-btn--pri"
                onClick={handleParse}
                disabled={!newRequestText.trim() || parseMutation.isPending}
              >
                {parseMutation.isPending ? (
                  <>
                    <span className="sl-spin" aria-hidden="true"></span>
                    {th.loading}
                  </>
                ) : (
                  th.parseRequest
                )}
              </button>
              <button className="sl-btn" onClick={() => setShowManualForm(true)}>
                {th.manualForm}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const rawText = formData.get("rawText") as string;
              const level = formData.get("level") as SpecialRequest["level"];
              handleSave({ rawText, parsed: editData?.parsed || undefined, level });
            }}
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
          >
            <div className="sl-field">
              <label className="sl-label" htmlFor="rawText">{th.requestText}</label>
              <textarea
                id="rawText"
                name="rawText"
                className="sl-input"
                rows={3}
                defaultValue={editData?.rawText || newRequestText}
                required
              />
            </div>

            {editData?.parsed && (
              <div className="sl-split">
                <div className="sl-split__pane">
                  <span className="sl-label">{th.requestText}</span>
                  <p>{editData.rawText}</p>
                </div>
                <div className="sl-split__pane">
                  <span className="sl-label">{th.parsedPreview}</span>
                  <p className="sl-mono">
                    {editData.parsed.targetType === "teacher" ? "ครู" : "กลุ่ม"} {editData.parsed.targetCode} ·
                    {editData.parsed.condition}
                    {getLevelBadge(editData.parsed.level)}
                  </p>
                </div>
              </div>
            )}

            <fieldset className="sl-field">
              <legend className="sl-label">{th.requestGroups.must}</legend>
              <div className="chips" style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                {["must", "try", "noop"].map((level) => (
                  <label
                    key={level}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-1)",
                      padding: "var(--space-1) var(--space-2)",
                      borderRadius: "var(--radius-pill)",
                      border: "var(--border-std) solid var(--line-strong)",
                      background: "var(--glass-strong)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="level"
                      value={level}
                      defaultChecked={editData?.level === level || (!editData && level === "try")}
                      style={{ accentColor: "var(--accent)" }}
                    />
                    {th.requestGroups[level as keyof typeof th.requestGroups]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "flex-end" }}>
              <button type="button" className="sl-btn" onClick={() => { setShowManualForm(false); setEditingId(null); setEditData(null); }}>
                {th.cancel}
              </button>
              <button type="submit" className="sl-btn sl-btn--pri" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? th.save : th.confirmRequest}
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Requests List */}
      <section className="sl-card">
        <h3 className="sl-card__title" style={{ marginBottom: "var(--space-3)" }}>รายการคำขอทั้งหมด</h3>

        {(!requests || requests.length === 0) && (
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">📝</div>
            <h2>{th.noRequests}</h2>
            <p className="sl-help">{th.requestsDescription}</p>
          </div>
        )}

        {requests && requests.length > 0 && (
          <div className="sl-tablewrap">
            <table className="sl-table">
              <thead>
                <tr>
                  <th scope="col">คำขอ</th>
                  <th scope="col">ระดับ</th>
                  <th scope="col">สถานะ</th>
                  <th scope="col">การดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((req) => (
                  <tr key={req.id} className="row">
                    <td>
                      <p className="sl-mono" style={{ maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {req.rawText}
                      </p>
                      {req.parsed && (
                        <p className="sl-help" style={{ marginTop: "var(--space-1)" }}>
                          <span className="sl-badge sl-badge--info">{req.parsed.targetType === "teacher" ? "ครู" : "กลุ่ม"} {req.parsed.targetCode}</span>
                          {req.parsed.condition}
                        </p>
                      )}
                    </td>
                    <td>{getLevelBadge(req.level)}</td>
                    <td>{getStatusBadge(req.status)}</td>
                    <td>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        {req.status !== "confirmed" && (
                          <>
                            <button
                              className="sl-btn sl-btn--sm"
                              onClick={() => { setEditingId(req.id); setEditData(req); setShowManualForm(true); }}
                            >
                              {th.editRequest}
                            </button>
                            <button
                              className="sl-btn sl-btn--sm sl-btn--pri"
                              onClick={() => confirmMutation.mutate(req.id)}
                              disabled={confirmMutation.isPending}
                            >
                              {th.confirmRequest}
                            </button>
                          </>
                        )}
                        <button
                          className="sl-btn sl-btn--sm sl-btn--danger"
                          onClick={() => deleteMutation.mutate(req.id)}
                          disabled={deleteMutation.isPending}
                        >
                          {th.deleteRequest}
                        </button>
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