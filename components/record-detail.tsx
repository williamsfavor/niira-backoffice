import Link from "next/link";

export function RecordDetail({ title, back, record }: { title: string; back: string; record: Record<string, unknown> | null }) {
  if (!record) return <section className="data-error"><h2>{title} not found</h2><Link className="button" href={back}>Back to list</Link></section>;
  return <section className="page detail"><Link className="back-link" href={back}>← Back to list</Link><h2>{title}</h2><article className="detail-grid">{Object.entries(record).filter(([key]) => !["id", "created_at", "updated_at", "search_vector"].includes(key)).map(([key, value]) => <div key={key}><small>{key.replaceAll("_", " ")}</small><p>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "—")}</p></div>)}</article></section>;
}
