import { Status } from "./ui";

export function ApplicationsTable({ rows }: { rows: Array<{ application_id: string; applicant_name: string | null; application_type: string | null; status: string; current_stage: string | null; last_update: string | null }> }) {
  return <div className="table-wrap"><table><thead><tr><th>Application ID</th><th>Applicant</th><th>Type</th><th>Status</th><th>Current stage</th><th>Last update</th></tr></thead><tbody>{rows.map((row) => <tr key={row.application_id}><td className="mono">{row.application_id}</td><td>{row.applicant_name ?? "—"}</td><td>{row.application_type ?? "—"}</td><td><Status value={row.status}/></td><td>{row.current_stage ?? "—"}</td><td>{row.last_update ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(new Date(row.last_update)) : "—"}</td></tr>)}</tbody></table></div>;
}
