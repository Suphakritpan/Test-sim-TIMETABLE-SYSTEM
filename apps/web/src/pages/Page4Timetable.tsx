import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { timetableApi, runsApi, type TimetableViewResponse, type TimetableCell, type ViewKind } from "../api/client";
import { th } from "../i18n/th";

const DAYS = [th.monday, th.tuesday, th.wednesday, th.thursday, th.friday];

const viewOptions: { value: ViewKind; label: string }[] = [
  { value: "group", label: th.viewGroup },
  { value: "teacher", label: th.viewTeacher },
  { value: "room", label: th.viewRoom },
  { value: "subject", label: th.viewSubject },
];

const levelBadges: Record<TimetableCell["level"], { class: string; label: string }> = {
  pass: { class: "", label: th.legend.pass },
  review: { class: "sl-badge--warn", label: th.legend.review },
  fix: { class: "sl-badge--bad", label: th.legend.fix },
  confirmed: { class: "sl-badge--ok", label: th.legend.confirmed },
  moved: { class: "sl-badge--mute", label: th.legend.moved },
};

interface SortableCellProps {
  cell: TimetableCell;
  day: number;
  period: number;
  onMove: (cell: TimetableCell, newDay: number, newPeriod: number) => void;
  isVerifying: boolean;
}

function SortableCell({ cell, day, period, onMove, isVerifying }: SortableCellProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `${cell.sessionId}-${day}-${period}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const badge = levelBadges[cell.level];

  // Extract TNN from tnn field or compute from cell type
  const tnn = cell.tnn || (cell.type === "practice" ? "ป." : "ท.");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sl-cell ${cell.type === "practice" ? "sl-cell--practice" : "sl-cell--theory"} ${badge.class} ${isDragging ? "is-dragging" : ""} ${isVerifying ? "is-verifying" : ""}`}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={`${cell.subjectName} ${th.cellCode} ${cell.subjectCode} ${th.cellRoom} ${cell.roomCode} ${th.cellTeacher} ${cell.teacherName}`}
    >
      {badge.label !== th.legend.pass && (
        <span className={`sl-badge ${badge.class}`}>{badge.label}</span>
      )}
      <span className="sl-cell__code">{cell.type === "practice" ? "ป." : "ท."}{cell.subjectCode}</span>
      <small>{cell.subjectName}</small>
      <small>
        {cell.roomCode}{" "}
        <span className="sl-cell__tnn">{tnn}</span>
      </small>
      <button className="sl-cell__teacher" type="button" onClick={(e) => e.stopPropagation()}>
        {cell.teacherName}
      </button>
    </div>
  );
}

export function Page4Timetable() {
  const queryClient = useQueryClient();
  const [viewKind, setViewKind] = useState<ViewKind>("group");
  const [viewKey, setViewKey] = useState("");
  const [search, setSearch] = useState("");
  const [orientation, setOrientation] = useState<"cols" | "rows">("cols");
  const [verifyingCells, setVerifyingCells] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Get runId from URL
  const urlParams = new URLSearchParams(window.location.search);
  const runId = urlParams.get("runId");

  const { data: runs } = useQuery({
    queryKey: ["runs"],
    queryFn: () => runsApi.list(),
  });

  const latestRunId = runs?.runs?.find((r) => r.status === "verified")?.id || runs?.runs?.[0]?.id;
  const effectiveRunId = runId || latestRunId;

  // Fetch available keys for current view kind - using a special "list" key
  const { data: viewListData } = useQuery({
    queryKey: ["timetable-view", effectiveRunId, viewKind, "list"],
    queryFn: () => timetableApi.getView(effectiveRunId!, viewKind, "list"),
    enabled: !!effectiveRunId,
  });

  // Fetch timetable grid
  const { data: timetable, isLoading } = useQuery({
    queryKey: ["timetable", effectiveRunId, viewKind, viewKey],
    queryFn: () => timetableApi.getView(effectiveRunId!, viewKind, viewKey),
    enabled: !!effectiveRunId && !!viewKey,
  });

  // Extract unique keys from cells for the dropdown
  const availableKeys = useMemo(() => {
    if (!timetable?.cells) return [];
    const keys = new Set<string>();
    timetable.cells.forEach((cell) => {
      switch (viewKind) {
        case "group":
          if (cell.groupCode) keys.add(cell.groupCode);
          break;
        case "teacher":
          keys.add(cell.teacherCode);
          break;
        case "room":
          keys.add(cell.roomCode);
          break;
        case "subject":
          keys.add(cell.subjectCode);
          break;
      }
    });
    return Array.from(keys).sort();
  }, [timetable?.cells, viewKind]);

  // Build names map for keys
  const keyNames = useMemo(() => {
    if (!timetable?.cells) return {};
    const names: Record<string, string> = {};
    timetable.cells.forEach((cell) => {
      switch (viewKind) {
        case "group":
          if (cell.groupCode && cell.groupName) names[cell.groupCode] = cell.groupName;
          break;
        case "teacher":
          if (!names[cell.teacherCode]) names[cell.teacherCode] = cell.teacherName;
          break;
        case "room":
          if (!names[cell.roomCode]) names[cell.roomCode] = cell.roomName || cell.roomCode;
          break;
        case "subject":
          if (!names[cell.subjectCode]) names[cell.subjectCode] = cell.subjectName;
          break;
      }
    });
    return names;
  }, [timetable?.cells, viewKind]);

  // Mutation for verifying move
  const verifyMutation = useMutation({
    mutationFn: async ({ sessionId, newDay, newPeriod }: { sessionId: string; newDay: number; newPeriod: number }) => {
      // Call API to verify the move
      const response = await fetch(`/api/runs/${effectiveRunId}/verify-move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, day: newDay, period: newPeriod }),
      });
      if (!response.ok) throw new Error("Move verification failed");
      return response.json();
    },
    onMutate: ({ sessionId }) => {
      setVerifyingCells((prev) => new Set(prev).add(sessionId));
    },
    onSuccess: (_data, { sessionId }) => {
      setVerifyingCells((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      setToast({ message: th.moveAccepted, type: "success" });
      queryClient.invalidateQueries({ queryKey: ["timetable", effectiveRunId] });
    },
    onError: (error, { sessionId }) => {
      setVerifyingCells((prev) => {
        const next = new Set(prev);
        next.delete(sessionId);
        return next;
      });
      setToast({ message: th.moveRejected.replace("{reason}", error.message), type: "error" });
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // active.id and over.id are UniqueIdentifier (string | number)
      const activeId = String(active.id);
      const overId = String(over.id);

      const activeParts = activeId.split("-");
      const overParts = overId.split("-");
      const sessionId = activeParts[0];
      const newDay = parseInt(overParts[1], 10);
      const newPeriod = parseInt(overParts[2], 10);

      verifyMutation.mutate({ sessionId, newDay, newPeriod });
    },
    [verifyMutation]
  );

  const handleKeyDown = (e: React.KeyboardEvent, cell: TimetableCell, day: number, period: number) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      // Start drag via keyboard - simplified for now
    }
  };

  // Auto-select first key if none selected
  useEffect(() => {
    if (availableKeys.length > 0 && !viewKey) {
      setViewKey(availableKeys[0]);
    }
  }, [availableKeys, viewKind]);

  // Clear toast after 3 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  if (!effectiveRunId) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.timetableTitle}</h1>
            <p>{th.timetableDescription}</p>
          </div>
        </header>
        <section className="sl-card">
          <div className="sl-empty">
            <div className="sl-empty__ic" aria-hidden="true">📅</div>
            <h2>{th.noData}</h2>
            <p className="sl-help">ไม่มีรอบการจัดตารางที่ผ่านการตรวจสอบ กรุณาจัดตารางก่อน</p>
            <a href="/scheduler" className="sl-btn sl-btn--pri">{th.runScheduler}</a>
          </div>
        </section>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="sl-enter">
        <header className="sl-main__head">
          <div>
            <p className="sl-label">{th.appName.toUpperCase()}</p>
            <h1>{th.timetableTitle}</h1>
            <p>{th.timetableDescription}</p>
          </div>
        </header>
        <section className="sl-card"><p>{th.loading}</p></section>
      </div>
    );
  }

  const grid = timetable?.grid;
  const cells = timetable?.cells || [];
  const meta = timetable?.meta;

  // Build cell map for quick lookup
  const cellMap = new Map<string, TimetableCell>();
  cells.forEach((cell) => {
    const key = `${cell.day}-${cell.startPeriod}-${cell.sessionId}`;
    cellMap.set(key, cell);
  });

  // Determine max period
  const maxPeriod = grid?.periods || 14;
  const lunchStart = grid?.lunchBreak?.startPeriod || 6;
  const lunchEnd = grid?.lunchBreak?.endPeriod || 7;

  // Generate period labels (assuming 60 min periods starting at 08:30)
  const periodLabels = Array.from({ length: maxPeriod }, (_, i) => {
    const period = i + 1;
    const startHour = 8 + Math.floor((period - 1 + 30) / 60);
    const startMin = ((period - 1) * 60 + 30) % 60;
    return `${period} ${startHour.toString().padStart(2, "0")}:${startMin.toString().padStart(2, "0")}`;
  });

  return (
    <div className="sl-enter">
      <header className="sl-main__head">
        <div>
          <p className="sl-label">{th.appName.toUpperCase()}</p>
          <h1>{th.timetableTitle}</h1>
          <p>{th.timetableDescription}</p>
        </div>
      </header>

      {/* Meta Strip */}
      {meta && (
        <div className="sl-meta" style={{ marginBottom: "var(--space-4)" }}>
          <div><dt>{th.cellCode}</dt><dd className="sl-mono">{meta.code}</dd></div>
          <div><dt>{th.cellSubject}</dt><dd>{meta.name}</dd></div>
          {meta.semester && <div><dt>ภาคเรียน</dt><dd>{meta.semester}</dd></div>}
          {meta.weekRange && <div><dt>สัปดาห์ที่มีผล</dt><dd>{meta.weekRange}</dd></div>}
          {meta.advisor && <div><dt>ครูที่ปรึกษา</dt><dd>{meta.advisor}</dd></div>}
        </div>
      )}

      {/* Controls */}
      <div className="sl-card" style={{ marginBottom: "var(--space-4)", padding: "var(--space-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <span className="sl-label">{th.viewBy}</span>
            <select
              className="sl-select"
              value={viewKind}
              onChange={(e) => { setViewKind(e.target.value as ViewKind); setViewKey(""); }}
            >
              {viewOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>

          {availableKeys.length > 0 && (
            <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <span className="sl-label">{viewKind === "group" ? "กลุ่ม" : viewKind === "teacher" ? "ครู" : viewKind === "room" ? "ห้อง" : "วิชา"}</span>
              <select
                className="sl-select"
                value={viewKey}
                onChange={(e) => setViewKey(e.target.value)}
              >
                {availableKeys.map((key) => (
                  <option key={key} value={key}>{key} - {keyNames[key] || ""}</option>
                ))}
              </select>
            </label>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: "200px" }}>
            <span className="sl-label">{th.searchPlaceholder}</span>
            <input
              type="text"
              className="sl-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={th.searchPlaceholder}
            />
          </label>

          <button className="sl-btn" onClick={() => setOrientation(orientation === "cols" ? "rows" : "cols")}>
            {th.toggleOrientation}
          </button>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "var(--border-hair) solid var(--line)" }}>
          {Object.entries(levelBadges).map(([level, badge]) => (
            <span key={level} className={`sl-badge ${badge.class}`}>
              <span style={{ width: "12px", height: "12px", borderRadius: "var(--radius-sm)", background: badge.class.includes("ok") ? "var(--accent)" : badge.class.includes("warn") ? "var(--amber)" : badge.class.includes("bad") ? "var(--danger)" : badge.class.includes("mute") ? "var(--ink-2)" : "transparent", display: "inline-block", marginRight: "var(--space-1)", verticalAlign: "middle" }}></span>
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      {/* Timetable Grid */}
      <section className="sl-card" style={{ overflow: "hidden" }}>
        <div className="sl-tablewrap" style={{ border: "none", background: "transparent", borderRadius: 0 }}>
          <table className={`sl-tt ${orientation === "rows" ? "sl-tt--rows" : ""}`} role="grid" aria-label={th.timetableTitle}>
            <thead>
              <tr>
                <th scope="col" style={{ width: "80px" }}>{orientation === "cols" ? th.periodLabel : th.cellSubject}</th>
                {orientation === "cols" ? (
                  DAYS.map((day, i) => (
                    <th key={i} scope="col">{day}</th>
                  ))
                ) : (
                  periodLabels.map((label, i) => (
                    <th key={i} scope="col" className="sl-mono">{label}</th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, p) => {
                const period = p + 1;
                const isLunch = period >= lunchStart && period < lunchEnd;

                return (
                  <tr key={period}>
                    <th scope="row" className="sl-mono" style={{ width: "80px", position: "sticky", left: 0, background: "var(--glass-strong)", zIndex: 1 }}>
                      {orientation === "cols" ? periodLabels[p] : `${th.periodLabel} ${period}`}
                    </th>
                    {orientation === "cols" ? (
                      DAYS.map((_, dayIndex) => {
                        const day = dayIndex + 1;
                        if (isLunch && dayIndex === 0) {
                          return (
                            <td key={day} colSpan={5} className="sl-cell--break" style={{ height: "64px" }}>
                              {th.lunchBreak} {grid?.lunchBreak?.label || "12:30–13:30"}
                            </td>
                          );
                        }
                        if (isLunch) return null;

                        const cell = Array.from(cellMap.values()).find(
                          (c) => c.day === day && c.startPeriod <= period && c.startPeriod + c.periods - 1 >= period
                        );

                        if (cell) {
                          const rowspan = cell.periods;
                          const isFirstPeriod = cell.startPeriod === period;

                          if (!isFirstPeriod) return null;

                          return (
                            <td key={cell.sessionId} rowSpan={rowspan} style={{ height: `${rowspan * 64}px`, verticalAlign: "top" }}>
                              <SortableCell
                                cell={cell}
                                day={day}
                                period={cell.startPeriod}
                                onMove={() => {}}
                                isVerifying={verifyingCells.has(cell.sessionId)}
                              />
                            </td>
                          );
                        }

                        return <td key={day} className="sl-cell--free" aria-label={th.noData}></td>;
                      })
                    ) : (
                      cells
                        .filter((c) => c.day === period)
                        .map((cell) => (
                          <td key={cell.sessionId} style={{ height: `${cell.periods * 64}px`, verticalAlign: "top" }}>
                            <SortableCell
                              cell={cell}
                              day={cell.day}
                              period={cell.startPeriod}
                              onMove={() => {}}
                              isVerifying={verifyingCells.has(cell.sessionId)}
                            />
                          </td>
                        ))
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {grid && (
          <p className="sl-help" style={{ marginTop: "var(--space-3)", textAlign: "center" }}>
            {th.totalPeriodsPerWeek.replace("{count}", grid.totalPeriodsPerWeek.toString())}
          </p>
        )}
      </section>

      {toast && (
        <div className="sl-toast sl-toast--in" role="status" style={{ position: "fixed", bottom: "var(--space-4)", right: "var(--space-4)", zIndex: 50 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            {toast.type === "success" ? (
              <>
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </>
            )}
          </svg>
          <div>
            <b>{toast.type === "success" ? th.moveAccepted : th.moveRejected.replace("{reason}", toast.message)}</b>
          </div>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* Grid rendered above */}
      </DndContext>
    </div>
  );
}