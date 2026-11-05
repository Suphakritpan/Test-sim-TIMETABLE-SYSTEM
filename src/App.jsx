import { useMemo, useRef, useState } from "react";

const STEPS = [
  { id: "ingest", number: "01", label: "Ingest", caption: "Source files" },
  { id: "engine", number: "02", label: "Engine", caption: "Run readiness" },
  { id: "review", number: "03", label: "Review", caption: "Outputs & evidence" },
];

const SOURCES = [
  {
    id: "guideline",
    title: "Guideline document",
    description: "Scheduling rules and system requirements",
    required: true,
    accept: ".pdf,application/pdf",
    kind: "PDF",
  },
  {
    id: "workbook",
    title: "Timetable workbook",
    description: "Subjects, groups, teachers, and rooms",
    required: true,
    accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    kind: "XLSX",
  },
  {
    id: "overrides",
    title: "JSON overrides",
    description: "Optional reviewed decisions or extra constraints",
    required: false,
    accept: ".json,application/json",
    kind: "JSON",
  },
];

const INITIAL_FILES = { guideline: null, workbook: null, overrides: null };

function Icon({ name, size = 18 }) {
  const paths = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    upload: <><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M4 20h16" /></>,
    play: <><path d="m8 5 12 7-12 7V5Z" /></>,
    chart: <><path d="M4 19V5" /><path d="M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>,
    check: <><path d="m5 12 4 4L19 6" /></>,
    alert: <><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18.5A1.7 1.7 0 0 0 3.3 21h17.4a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a2 2 0 0 0-3.4 0Z" /></>,
    file: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8M8 17h8" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 1 2.5 2.5 1-2.5 1L19 21l-1-2.5-2.5-1 2.5-1L19 14Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validFile(file, source) {
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  return source.id === "guideline"
    ? extension === "pdf"
    : source.id === "workbook"
      ? extension === "xlsx"
      : extension === "json";
}

function SourceCard({ source, file, onFile, onRemove, overrideStatus }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function chooseFile(candidate) {
    if (!candidate) return;
    if (!validFile(candidate, source)) {
      onFile(null, `Choose a ${source.kind} file for ${source.title.toLowerCase()}.`);
      return;
    }
    onFile(candidate, "");
  }

  return (
    <section
      className={`source-card ${dragging ? "is-dragging" : ""} ${file ? "has-file" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        chooseFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="source-card-top">
        <div className={`file-mark file-mark-${source.kind.toLowerCase()}`}>
          <Icon name="file" size={19} />
        </div>
        <span className={`source-kind kind-${source.kind.toLowerCase()}`}>{source.kind}</span>
      </div>
      <div className="source-heading">
        <div>
          <h3>{source.title}</h3>
          <p>{source.description}</p>
        </div>
        {source.required && <span className="required-tag">Required</span>}
      </div>
      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={source.accept}
        aria-label={`Select ${source.title}`}
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event) => {
          chooseFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      {file ? (
        <div className="selected-file">
          <div className="selected-file-icon"><Icon name="check" size={16} /></div>
          <div className="selected-file-info">
            <strong title={file.name}>{file.name}</strong>
            <span>{formatBytes(file.size)} · selected locally</span>
            {source.id === "overrides" && overrideStatus && (
              <span className={overrideStatus.ok ? "inline-success" : "inline-error"}>
                {overrideStatus.message}
              </span>
            )}
          </div>
          <button className="icon-button" type="button" aria-label={`Remove ${file.name}`} onClick={onRemove}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ) : (
        <button className="drop-target" type="button" onClick={() => inputRef.current?.click()}>
          <span className="drop-icon"><Icon name="upload" size={17} /></span>
          <span><strong>Choose a file</strong> or drop it here</span>
        </button>
      )}
    </section>
  );
}

function StepPill({ index, active, complete, onClick, step }) {
  return (
    <button
      className={`step-pill ${active ? "is-active" : ""} ${complete ? "is-complete" : ""}`}
      type="button"
      onClick={onClick}
      aria-current={active ? "step" : undefined}
      aria-label={`Step ${Number(step.number)}: ${step.label}, ${step.caption}`}
    >
      <span className="step-number">{complete ? <Icon name="check" size={14} /> : step.number}</span>
      <span className="step-copy"><strong>{step.label}</strong><small>{step.caption}</small></span>
      {index < STEPS.length - 1 && <span className="step-connector" />}
    </button>
  );
}

function IngestPage({ files, selectedOverride, overrideBusy, onNext, onSourceFile }) {
  const hasRequiredFiles = Boolean(files.guideline && files.workbook);
  const allPresent = hasRequiredFiles && (!files.overrides || selectedOverride?.ok) && !overrideBusy;

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> INPUT WORKSPACE</div>
          <h1>Bring your sources together.</h1>
          <p className="page-lede">Start with the timetable rules and workbook. We’ll keep each source visible so you can review it before the engine is ready.</p>
        </div>
        <div className="stage-state"><span className="state-dot state-neutral" /> Ingest connection pending</div>
      </div>

      <div className="notice notice-info">
        <span className="notice-icon"><Icon name="spark" size={17} /></span>
        <div><strong>Source selection only</strong><p>This early frontend keeps files in your browser. It does not parse PDFs or workbooks, upload data, or create canonical JSON yet.</p></div>
      </div>

      <div className="section-title-row">
        <div><h2>Source files</h2><p>Add the required source documents to prepare the ingest handoff.</p></div>
        <span className="section-count">{Object.values(files).filter(Boolean).length} of 3 added</span>
      </div>
      <div className="source-grid">
        {SOURCES.map((source) => (
          <SourceCard
            key={source.id}
            source={source}
            file={files[source.id]}
            overrideStatus={source.id === "overrides" ? selectedOverride : null}
            onFile={(file, error) => onSourceFile(source.id, file, error)}
            onRemove={() => onSourceFile(source.id, null, "")}
          />
        ))}
      </div>

      <div className="ingest-bottom">
        <div className="privacy-note"><span className="privacy-dot" /> Files stay on this device until an ingest service is connected.</div>
        <button
          className="button button-primary"
          type="button"
          disabled={!allPresent}
          onClick={onNext}
        >
          Continue to engine setup <Icon name="arrow" size={16} />
        </button>
      </div>

      {!hasRequiredFiles && (
        <div className="source-hint"><Icon name="clock" size={16} /> Add both required files to continue. You can add JSON overrides later.</div>
      )}
    </>
  );
}

function EnginePage({ readyForHandoff, seed, setSeed, engineCheck, onCheck, onReview }) {
  const blockers = useMemo(() => {
    const items = [
      { label: "Canonical ingest package", detail: "Schema-validated JSON from ingest", ready: false },
      { label: "Teacher and room assignments", detail: "Required before the engine can place sessions", ready: false },
      { label: "Scheduling engine", detail: "Solver implementation is not connected", ready: false },
      { label: "Independent validation", detail: "H1–H20 validator exists; schedule handoff is pending", ready: false },
    ];
    if (!readyForHandoff) {
      items.unshift({
        label: "Required source files",
        detail: "Select a guideline PDF and timetable XLSX on the Ingest step",
        ready: false,
      });
    } else {
      items.unshift({
        label: "Required source files",
        detail: "Both files are selected in this browser session; they have not been parsed",
        ready: true,
      });
    }
    return items;
  }, [readyForHandoff]);

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> PROCESS WORKSPACE</div>
          <h1>Set up an engine run.</h1>
          <p className="page-lede">Choose a reproducible run seed and check what’s needed before timetable generation can begin.</p>
        </div>
        <div className="stage-state"><span className="state-dot state-neutral" /> Engine not connected</div>
      </div>

      <div className="notice notice-warn">
        <span className="notice-icon"><Icon name="alert" size={17} /></span>
        <div><strong>This is a readiness check, not a solve.</strong><p>The scheduler is still being built. This page will not invent assignments or display a generated timetable.</p></div>
      </div>

      <div className="engine-layout">
        <section className="panel run-config">
          <div className="panel-heading">
            <div className="panel-heading-icon"><Icon name="play" size={18} /></div>
            <div><h2>Run configuration</h2><p>Saved with this browser session only</p></div>
          </div>
          <label className="field-label" htmlFor="seed">Reproducibility seed</label>
          <div className="input-with-caption">
            <input id="seed" inputMode="numeric" type="number" min="0" max="2147483647" value={seed} onChange={(event) => setSeed(event.target.value)} />
            <span>Same seed = same search order</span>
          </div>
          <label className="field-label" htmlFor="engine-mode">Solve mode</label>
          <select id="engine-mode" defaultValue="deterministic">
            <option value="deterministic">Deterministic constraint search</option>
            <option value="preview" disabled>Fast preview (not available yet)</option>
          </select>
          <label className="check-row">
            <input type="checkbox" defaultChecked />
            <span className="custom-check"><Icon name="check" size={12} /></span>
            <span><strong>Require independent validation</strong><small>Never label a schedule clean without H1–H20 validation.</small></span>
          </label>
          <button className="button button-primary button-wide" type="button" onClick={onCheck}>
            <Icon name="play" size={15} /> Check run readiness
          </button>
          <p className="config-footnote">No timetable will be generated by this prototype.</p>
        </section>

        <section className="panel readiness-panel">
          <div className="panel-heading readiness-heading">
            <div><div className="eyebrow">PRE-FLIGHT</div><h2>What’s ready?</h2></div>
            <span className="blocked-count">{blockers.filter((item) => !item.ready).length} pending</span>
          </div>
          <div className="readiness-list">
            {blockers.map((item, index) => (
              <div className="readiness-item" key={item.label}>
                <span className={`readiness-symbol ${item.ready ? "ready" : ""}`}>
                  {item.ready ? <Icon name="check" size={14} /> : String(index + 1).padStart(2, "0")}
                </span>
                <div><strong>{item.label}</strong><span>{item.detail}</span></div>
                <span className={`readiness-status ${item.ready ? "status-ready" : ""}`}>{item.ready ? "Selected" : "Pending"}</span>
              </div>
            ))}
          </div>
          {engineCheck && (
            <div className="readiness-result" role="status">
              <Icon name="alert" size={16} />
              <div><strong>Run blocked — {blockers.filter((item) => !item.ready).length} engine dependencies remain.</strong><span>{engineCheck}</span></div>
            </div>
          )}
          <button className="text-button" type="button" onClick={onReview}>See planned outputs <Icon name="arrow" size={15} /></button>
        </section>
      </div>
    </>
  );
}

function ReviewPage({ hasGuideline, hasWorkbook, lastCheck, onGoIngest, onGoEngine }) {
  const outputs = [
    { number: "01", title: "Clean timetable", description: "Group, teacher, room, and subject views after independent validation.", state: "Waiting for engine" },
    { number: "02", title: "Rating score", description: "Competition criteria score with item-level evidence and unscored items.", state: "Waiting for a schedule" },
    { number: "03", title: "Rating analysis", description: "Conflicts, unresolved source questions, and next actions by responsibility.", state: "Waiting for evidence" },
  ];

  return (
    <>
      <div className="page-intro">
        <div>
          <div className="eyebrow"><span className="eyebrow-dot" /> OUTPUT WORKSPACE</div>
          <h1>A clear view of what comes next.</h1>
          <p className="page-lede">The review page is prepared for the engine outputs. Nothing is scored or certified until it has evidence.</p>
        </div>
        <div className="stage-state"><span className="state-dot state-neutral" /> No run results yet</div>
      </div>

      <div className="review-summary">
        <div className="review-summary-icon"><Icon name="chart" size={20} /></div>
        <div className="review-summary-copy"><strong>Review follows a validated run</strong><span>Scores and analysis will come from the shared rating tools—not calculations in this frontend.</span></div>
        <div className="summary-mini"><span className={hasGuideline ? "mini-ready" : ""}></span><span className={hasWorkbook ? "mini-ready" : ""}></span><span></span></div>
      </div>

      <div className="section-title-row review-title-row">
        <div><h2>Planned outputs</h2><p>These sections are placeholders for the ingest and engine handoff.</p></div>
        <span className="section-count">3 outputs</span>
      </div>
      <div className="output-list">
        {outputs.map((output) => (
          <article className="output-card" key={output.number}>
            <span className="output-number">{output.number}</span>
            <div className="output-content"><h3>{output.title}</h3><p>{output.description}</p></div>
            <span className="output-state"><span className="state-dot state-neutral" />{output.state}</span>
          </article>
        ))}
      </div>

      <div className="review-footer">
        <div className="review-footer-copy">
          <span className="review-footer-icon"><Icon name="clock" size={17} /></span>
          <div><strong>{lastCheck ? "Latest check: run is blocked" : "No engine check run yet"}</strong><span>{lastCheck || "Run a readiness check to see current prerequisites."}</span></div>
        </div>
        <div className="review-actions">
          <button className="button button-secondary" type="button" onClick={onGoIngest}>Review sources</button>
          <button className="button button-primary" type="button" onClick={onGoEngine}>Engine setup <Icon name="arrow" size={16} /></button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [activeStep, setActiveStep] = useState("ingest");
  const [files, setFiles] = useState(INITIAL_FILES);
  const [selectedOverride, setSelectedOverride] = useState(null);
  const [seed, setSeed] = useState("20261105");
  const [engineCheck, setEngineCheck] = useState("");
  const [ingestMessage, setIngestMessage] = useState(null);
  const [overrideBusy, setOverrideBusy] = useState(false);

  async function setSourceFile(id, file, error) {
    setFiles((current) => ({ ...current, [id]: file }));
    setEngineCheck("");
    setIngestMessage(error ? { kind: "error", message: error } : null);
    if (id !== "overrides" || !file) {
      if (id === "overrides") setSelectedOverride(null);
      return;
    }
    setOverrideBusy(true);
    setSelectedOverride({ ok: false, message: "Checking JSON…" });
    try {
      const contents = JSON.parse(await file.text());
      const isObject = contents !== null && typeof contents === "object" && !Array.isArray(contents);
      setSelectedOverride({
        ok: isObject,
        message: isObject
          ? `JSON syntax OK${contents.schemaVersion ? ` · schema v${contents.schemaVersion}` : ""} · not schema-validated`
          : "Expected a JSON object at the file root.",
      });
    } catch {
      setSelectedOverride({ ok: false, message: "Could not parse JSON. Check the file syntax." });
    } finally {
      setOverrideBusy(false);
    }
  }

  const requiredSourcesReady = Boolean(files.guideline && files.workbook)
    && (!files.overrides || selectedOverride?.ok);

  function goToStep(step) {
    setActiveStep(step);
    setIngestMessage(null);
  }

  const activeIndex = STEPS.findIndex((step) => step.id === activeStep);
  const completedSteps = {
    ingest: false,
    engine: false,
    review: false,
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); goToStep("ingest"); }}>
          <span className="brand-mark"><span /><span /><span /><span /></span>
          <span className="brand-name">timetable<span>studio</span></span>
        </a>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="sidebar-nav" aria-label="Project workflow">
          {STEPS.map((step, index) => (
            <StepPill
              key={step.id}
              step={step}
              index={index}
              active={activeStep === step.id}
              complete={completedSteps[step.id]}
              onClick={() => goToStep(step.id)}
            />
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-project">
          <span className="project-avatar">TS</span>
          <div><strong>Timetable system</strong><span>Local workspace</span></div>
          <span className="project-menu">•••</span>
        </div>
        <div className="sidebar-version">EARLY FRONTEND · v0.1</div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Project</span><span className="crumb-slash">/</span><strong>{STEPS[activeIndex]?.label}</strong></div>
          <div className="topbar-right">
            <span className="local-badge"><span /> Local prototype</span>
            <button className="help-button" type="button" onClick={() => {
              setActiveStep("ingest");
              setIngestMessage({ kind: "info", message: "This frontend is an interactive shell. Ingest and Engine services are not connected yet." });
            }}>Help</button>
          </div>
        </header>

        <div className="content">
          <div className="workflow-progress" aria-label="Workflow progress">
            <div className="progress-track"><span style={{ width: `${((activeIndex + 1) / STEPS.length) * 100}%` }} /></div>
            <div className="progress-label"><span>WORKFLOW</span><span>STEP {String(activeIndex + 1).padStart(2, "0")} <i>/</i> 03</span></div>
          </div>

          {ingestMessage && activeStep === "ingest" && (
            <div className={`inline-notice ${ingestMessage.kind}`} role="status">
              <Icon name={ingestMessage.kind === "error" ? "alert" : "spark"} size={15} />
              <span>{ingestMessage.message}</span>
              <button type="button" className="notice-dismiss" aria-label="Dismiss message" onClick={() => setIngestMessage(null)}><Icon name="close" size={14} /></button>
            </div>
          )}

          {activeStep === "ingest" && (
            <IngestPage
              files={files}
              selectedOverride={selectedOverride}
              overrideBusy={overrideBusy}
              onSourceFile={setSourceFile}
              onNext={() => {
                if (overrideBusy) return;
                setEngineCheck("");
                setActiveStep("engine");
              }}
            />
          )}
          {activeStep === "engine" && (
            <EnginePage
              readyForHandoff={requiredSourcesReady}
              seed={seed}
              setSeed={setSeed}
              engineCheck={engineCheck}
              onCheck={() => {
                const message = requiredSourcesReady
                  ? "Sources selected only; ingest has not created a canonical package."
                  : "Required guideline PDF and workbook are not both selected.";
                setEngineCheck(message);
              }}
              onReview={() => goToStep("review")}
            />
          )}
          {activeStep === "review" && (
            <ReviewPage
              hasGuideline={Boolean(files.guideline)}
              hasWorkbook={Boolean(files.workbook)}
              lastCheck={engineCheck}
              onGoIngest={() => goToStep("ingest")}
              onGoEngine={() => goToStep("engine")}
            />
          )}

          <footer className="content-footer">
            <span>Timetable Studio <span className="footer-separator">·</span> local-first workflow</span>
            <span>Files stay in this browser <span className="privacy-lock">⌑</span></span>
          </footer>
        </div>
      </main>
    </div>
  );
}
