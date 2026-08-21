export function ReportMetric({ label, value, note }: { label: string; value: string | number; note: string }) {
  return <article className="report-metric"><p>{label}</p><strong>{value}</strong><small>{note}</small></article>;
}

export function BreakdownPanel({ title, eyebrow, rows }: { title: string; eyebrow: string; rows: Array<{ label: string; value: number }> }) {
  const maximum = Math.max(...rows.map((row) => row.value), 1);
  return <article className="panel report-breakdown"><div className="panel-head"><div><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></div></div>{rows.length ? <div className="bar-list">{rows.map((row) => <div className="bar-row" key={row.label}><div><span>{row.label}</span><strong>{row.value.toLocaleString("en-UG")}</strong></div><progress max={maximum} value={row.value} aria-label={`${row.label}: ${row.value}`}/></div>)}</div> : <p className="report-empty">No records in this date range.</p>}</article>;
}
