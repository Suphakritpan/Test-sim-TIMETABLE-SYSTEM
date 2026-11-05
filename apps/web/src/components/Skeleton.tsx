import { th } from "../i18n/th";

/* ============================================================
   Skeleton Loading Components
   Uses only design tokens from tokens.css via components.css
   No hardcoded colors or sizes — all via CSS variables
============================================================ */

// Base skeleton element
export function Skeleton({ className = "", style, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`sl-skeleton ${className}`} style={style} {...props} />;
}

// Skeleton for page header (breadcrumb + title + description + optional badge)
export function PageHeaderSkeleton({ showBadge = false }: { showBadge?: boolean }) {
  return (
    <header className="sl-main__head sl-enter">
      <div>
        <Skeleton className="sl-skeleton--text sl-skeleton--title" style={{ width: "120px", marginBottom: "var(--space-1)" }} />
        <Skeleton className="sl-skeleton--title" style={{ width: "280px", marginBottom: "var(--space-1)" }} />
        <Skeleton className="sl-skeleton--text" style={{ width: "400px" }} />
      </div>
      {showBadge && <Skeleton className="sl-skeleton--badge" />}
    </header>
  );
}

// Skeleton for card container
export function CardSkeleton({ children, className = "", style, ...props }: { children?: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <section className={`sl-card sl-enter ${className}`} style={style} {...props}>
      {children}
    </section>
  );
}

// Skeleton for empty state
export function EmptyStateSkeleton() {
  return (
    <div className="sl-empty sl-enter">
      <Skeleton className="sl-skeleton--avatar sl-skeleton--circle" style={{ marginBottom: "var(--space-3)" }} />
      <Skeleton className="sl-skeleton--title" style={{ width: "180px", marginBottom: "var(--space-2)" }} />
      <Skeleton className="sl-skeleton--text" style={{ width: "300px", marginBottom: "var(--space-3)" }} />
      <Skeleton className="sl-skeleton--btn" />
    </div>
  );
}

// Skeleton for stat card (large number + label)
export function StatCardSkeleton({ count = 6 }: { count?: number }) {
  const items = Array.from({ length: count }, (_, i) => (
    <div key={i} className="sl-card--flat sl-enter" style={{ padding: "var(--space-3)", textAlign: "center" }}>
      <Skeleton className="sl-skeleton--stat" style={{ margin: "0 auto var(--space-2)" }} />
      <Skeleton className="sl-skeleton--text" style={{ width: "80px", margin: "0 auto" }} />
    </div>
  ));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)" }}>
      {items}
    </div>
  );
}

// Skeleton for table with header and rows
export function TableSkeleton({ columns = 4, rows = 5 }: { columns?: number; rows?: number }) {
  const headerCells = Array.from({ length: columns }, (_, i) => (
    <th key={i} scope="col"><Skeleton className="sl-skeleton--text" style={{ width: i === 0 ? "120px" : "80px" }} /></th>
  ));
  const bodyRows = Array.from({ length: rows }, (_, r) => (
    <tr key={r} className="row">
      {Array.from({ length: columns }, (_, c) => (
        <td key={c} className={c > 0 ? "num" : ""}><Skeleton className="sl-skeleton--text" style={{ width: c === 0 ? "120px" : "80px" }} /></td>
      ))}
    </tr>
  ));
  return (
    <div className="sl-tablewrap">
      <table className="sl-table">
        <thead><tr>{headerCells}</tr></thead>
        <tbody>{bodyRows}</tbody>
      </table>
    </div>
  );
}

// Skeleton for meta strip (key-value pairs)
export function MetaStripSkeleton({ items = 5 }: { items?: number }) {
  const metaItems = Array.from({ length: items }, (_, i) => (
    <div key={i} style={{ display: "flex", flexDirection: "column", gap: "var(--space-1)", minWidth: 0 }}>
      <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "100px" }} />
      <Skeleton className="sl-skeleton--title" style={{ width: "160px" }} />
    </div>
  ));
  return (
    <div className="sl-meta" style={{ marginBottom: "var(--space-4)" }}>
      {metaItems}
    </div>
  );
}

// Skeleton for import page (upload area + required sheets list)
export function Page1ImportSkeleton() {
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton showBadge />
      <CardSkeleton>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "var(--space-4)" }}>
          <div className="sl-card sl-enter" style={{ minHeight: "200px", border: "var(--border-std) dashed var(--line-strong)", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Skeleton className="sl-skeleton--avatar sl-skeleton--circle" style={{ marginBottom: "var(--space-3)" }} />
            <Skeleton className="sl-skeleton--title" style={{ width: "160px", marginBottom: "var(--space-1)" }} />
            <Skeleton className="sl-skeleton--text" style={{ width: "280px" }} />
          </div>
          <div className="sl-card--flat sl-enter" style={{ padding: "var(--space-3)", background: "var(--glass-strong)" }}>
            <Skeleton className="sl-skeleton--text" style={{ width: "160px", marginBottom: "var(--space-3)" }} />
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", fontSize: "14px", marginBottom: "var(--space-2)" }}>
                <Skeleton className="sl-skeleton--icon sl-skeleton--circle" />
                <Skeleton className="sl-skeleton--text" style={{ width: "100px" }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
          <Skeleton className="sl-skeleton--btn" />
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)", marginLeft: "auto" }}>
            <Skeleton className="sl-skeleton--text" style={{ width: "120px" }} />
            <div style={{ display: "flex", gap: "var(--space-3)" }}>
              <Skeleton className="sl-skeleton--btn" style={{ width: "140px" }} />
              <Skeleton className="sl-skeleton--btn" style={{ width: "140px" }} />
              <Skeleton className="sl-skeleton--btn" style={{ width: "140px" }} />
              <Skeleton className="sl-skeleton--btn" style={{ width: "140px" }} />
            </div>
          </div>
        </div>
      </CardSkeleton>
    </div>
  );
}

// Skeleton for requests page (form + table)
export function Page2RequestsSkeleton() {
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton />
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "180px" }} />
        <Skeleton className="sl-skeleton--input" style={{ marginBottom: "var(--space-3)" }} />
        <Skeleton className="sl-skeleton--input" style={{ marginBottom: "var(--space-3)" }} />
        <div style={{ display: "flex", gap: "var(--space-3)" }}>
          <Skeleton className="sl-skeleton--btn" />
          <Skeleton className="sl-skeleton--btn" />
        </div>
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "200px" }} />
        <TableSkeleton columns={4} rows={5} />
      </CardSkeleton>
    </div>
  );
}

// Skeleton for scheduler page (controls + progress + results + history)
export function Page3SchedulerSkeleton() {
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton />
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "200px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "flex-end" }}>
          <div className="sl-field sl-enter" style={{ flex: 1, minWidth: "200px" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ marginBottom: "var(--space-1)", width: "80px" }} />
            <Skeleton className="sl-skeleton--input sl-mono" />
          </div>
          <Skeleton className="sl-skeleton--btn" style={{ minWidth: "160px" }} />
          <Skeleton className="sl-skeleton--btn sl-btn--danger" style={{ minWidth: "160px" }} />
        </div>
      </CardSkeleton>
      <CardSkeleton>
        <div className="sl-card__head">
          <Skeleton className="sl-skeleton--title" style={{ width: "140px" }} />
          <Skeleton className="sl-skeleton--badge" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="sl-card--flat sl-enter" style={{ padding: "var(--space-3)" }}>
              <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "80px", marginBottom: "var(--space-1)" }} />
              <Skeleton className="sl-skeleton--stat" />
            </div>
          ))}
        </div>
        <Skeleton className="sl-skeleton--progress" style={{ marginBottom: "var(--space-2)" }} />
        <Skeleton className="sl-skeleton--text" style={{ width: "200px", margin: "0 auto" }} />
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "160px" }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-3)", marginBottom: "var(--space-4)" }}>
          {[1,2,3,4].map(i => (
            <div key={i} className="sl-card--flat sl-enter" style={{ padding: "var(--space-3)", textAlign: "center" }}>
              <Skeleton className="sl-skeleton--stat" style={{ fontSize: "36px", margin: "0 auto var(--space-2)" }} />
              <Skeleton className="sl-skeleton--text" style={{ width: "120px", margin: "0 auto" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Skeleton className="sl-skeleton--btn sl-btn--pri" />
          <Skeleton className="sl-skeleton--btn" />
          <Skeleton className="sl-skeleton--btn" />
        </div>
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "120px" }} />
        <TableSkeleton columns={8} rows={6} />
      </CardSkeleton>
    </div>
  );
}

// Skeleton for timetable page (meta + controls + grid)
export function Page4TimetableSkeleton() {
  const maxPeriod = 14;
  const DAYS = [th.monday, th.tuesday, th.wednesday, th.thursday, th.friday];
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton />
      <MetaStripSkeleton items={5} />
      <div className="sl-card sl-enter" style={{ marginBottom: "var(--space-4)", padding: "var(--space-3)" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "60px" }} />
            <Skeleton className="sl-skeleton--input" style={{ width: "200px" }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "40px" }} />
            <Skeleton className="sl-skeleton--input" style={{ width: "220px" }} />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: "200px" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "80px" }} />
            <Skeleton className="sl-skeleton--input" />
          </label>
          <Skeleton className="sl-skeleton--btn" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", marginTop: "var(--space-3)", paddingTop: "var(--space-3)", borderTop: "var(--border-hair) solid var(--line)" }}>
          {[th.legend.pass, th.legend.review, th.legend.fix, th.legend.confirmed, th.legend.moved].map((_, i) => (
            <Skeleton key={i} className="sl-skeleton--badge" />
          ))}
        </div>
      </div>
      <section className="sl-card sl-enter" style={{ overflow: "hidden" }}>
        <div className="sl-tablewrap" style={{ border: "none", background: "transparent", borderRadius: 0 }}>
          <table className="sl-tt" role="grid" aria-label={th.timetableTitle}>
            <thead>
              <tr>
                <th scope="col" style={{ width: "80px" }}><Skeleton className="sl-skeleton--text" style={{ width: "60px" }} /></th>
                {DAYS.map((_, i) => <th key={i} scope="col"><Skeleton className="sl-skeleton--text" style={{ width: "60px" }} /></th>)}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: maxPeriod }, (_, p) => (
                <tr key={p}>
                  <th scope="row" className="sl-mono" style={{ width: "80px", position: "sticky", left: 0, background: "var(--glass-strong)", zIndex: 1 }}>
                    <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "60px" }} />
                  </th>
                  {DAYS.map((_, dayIndex) => {
                    if (p === 5 && dayIndex === 0) {
                      return <td key={dayIndex} colSpan={5} className="sl-skeleton sl-skeleton--cell" style={{ height: "64px", background: "var(--code)" }} />;
                    }
                    if (p >= 5 && p < 7) return null;
                    return <td key={dayIndex}><Skeleton className="sl-skeleton sl-skeleton--cell" style={{ height: "64px" }} /></td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Skeleton className="sl-skeleton--text" style={{ marginTop: "var(--space-3)", width: "240px", margin: "var(--space-3) auto 0" }} />
      </section>
    </div>
  );
}

// Skeleton for AI results page (selector + comparison table + method cards)
export function Page5AIResultsSkeleton() {
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton />
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <div className="sl-card__head">
          <Skeleton className="sl-skeleton--title" style={{ width: "180px" }} />
          <Skeleton className="sl-skeleton--badge" />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: "280px" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "60px" }} />
            <Skeleton className="sl-skeleton--input" style={{ flex: 1 }} />
          </label>
          <Skeleton className="sl-skeleton--btn sl-btn--pri" />
        </div>
      </CardSkeleton>
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <div className="sl-card__head">
          <Skeleton className="sl-skeleton--title" style={{ width: "180px" }} />
          <Skeleton className="sl-skeleton--badge" />
        </div>
        <TableSkeleton columns={4} rows={4} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--space-4)", marginTop: "var(--space-4)" }}>
          {[1,2].map(i => (
            <div key={i} className="sl-card--flat sl-enter" style={{ padding: "var(--space-4)" }}>
              <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-2)", width: "160px" }} />
              <Skeleton className="sl-skeleton--text" style={{ width: "240px", marginBottom: "var(--space-2)" }} />
              <Skeleton className="sl-skeleton--text" style={{ width: "200px" }} />
            </div>
          ))}
        </div>
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "120px" }} />
        <Skeleton className="sl-skeleton--text" style={{ width: "280px" }} />
      </CardSkeleton>
    </div>
  );
}

// Skeleton for summary page (selector + room usage + teacher loads + group free + requests + export)
export function Page6SummarySkeleton() {
  return (
    <div className="sl-enter">
      <PageHeaderSkeleton />
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "200px" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-3)", alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", flex: 1, minWidth: "280px" }}>
            <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ width: "60px" }} />
            <Skeleton className="sl-skeleton--input" style={{ flex: 1 }} />
          </label>
        </div>
      </CardSkeleton>
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <div className="sl-card__head">
          <Skeleton className="sl-skeleton--title" style={{ width: "140px" }} />
          <Skeleton className="sl-skeleton--stat" style={{ fontSize: "36px" }} />
        </div>
      </CardSkeleton>
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "180px" }} />
        <TableSkeleton columns={4} rows={6} />
      </CardSkeleton>
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "180px" }} />
        <TableSkeleton columns={3} rows={6} />
      </CardSkeleton>
      <CardSkeleton style={{ marginBottom: "var(--space-4)" }}>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "180px" }} />
        <TableSkeleton columns={4} rows={5} />
      </CardSkeleton>
      <CardSkeleton>
        <Skeleton className="sl-skeleton--title" style={{ marginBottom: "var(--space-3)", width: "140px" }} />
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          <Skeleton className="sl-skeleton--btn sl-btn--pri" />
          <Skeleton className="sl-skeleton--btn" />
          <Skeleton className="sl-skeleton--text" style={{ alignSelf: "center", width: "200px" }} />
        </div>
      </CardSkeleton>
    </div>
  );
}

// Skeleton for login page
export function LoginPageSkeleton() {
  return (
    <div className="sl-ground" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "var(--space-4)" }}>
      <div className="sl-card sl-enter" style={{ width: "100%", maxWidth: "400px" }}>
        <div className="sl-card__head sl-enter" style={{ justifyContent: "center", marginBottom: "var(--space-5)" }}>
          <Skeleton className="sl-skeleton--avatar sl-skeleton--circle" style={{ width: "40px", height: "40px" }} />
        </div>
        <Skeleton className="sl-skeleton--title" style={{ textAlign: "center", marginBottom: "var(--space-2)", width: "140px", margin: "0 auto var(--space-2)" }} />
        <Skeleton className="sl-skeleton--text" style={{ textAlign: "center", marginBottom: "var(--space-5)", width: "240px", margin: "0 auto var(--space-5)" }} />
        <form>
          <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ marginBottom: "var(--space-1)", width: "80px" }} />
          <Skeleton className="sl-skeleton--input" style={{ marginBottom: "var(--space-3)" }} />
          <Skeleton className="sl-skeleton--text sl-skeleton--meta" style={{ marginBottom: "var(--space-1)", width: "80px" }} />
          <Skeleton className="sl-skeleton--input" style={{ marginBottom: "var(--space-4)" }} />
          <Skeleton className="sl-skeleton--btn sl-btn--pri" style={{ width: "100%" }} />
        </form>
        <Skeleton className="sl-skeleton--text" style={{ textAlign: "center", marginTop: "var(--space-4)", fontSize: "12px", width: "200px", margin: "var(--space-4) auto 0" }} />
      </div>
    </div>
  );
}