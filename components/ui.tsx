export function Status({ value }: { value: string }) { return <span className={`status ${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>; }
export function Metric({ label, value, note, tone = "blue" }: { label: string; value: number; note: string; tone?: string }) { return <article className={`metric ${tone}`}><p>{label}</p><strong>{value}</strong><small>{note}</small></article>; }
export function Empty({ children }: { children: React.ReactNode }) { return <div className="empty">{children}</div>; }
