import Link from "next/link";
import { notFound } from "next/navigation";
import { getApplicationDetail } from "@/lib/applications";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { StageProgress } from "@/components/stage-progress";
import { Status } from "@/components/ui";

const date = (value: string | null) => value ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(value)) : "—";

export default async function ApplicationDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireBackofficeAdmin("applications:read");
  const application = await getApplicationDetail(id, admin.role);
  if (!application) notFound();
  return <section className="page detail"><Link className="back-link" href="/applications">← Back to applications</Link><div className="detail-title"><div><p className="eyebrow">READ-ONLY NIRA RECORD</p><h2>Application {application.application_id}</h2></div><Status value={application.status}/></div><article className="detail-grid"><div><small>Applicant</small><p>{application.applicant_name || "—"}</p></div><div><small>Phone number</small><p>{application.phone_number || "—"}</p></div><div><small>Application type</small><p>{application.application_type || "—"}</p></div><div><small>Current stage</small><p>{application.current_stage || "—"}</p></div><div><small>Submitted</small><p>{date(application.submitted_date)}</p></div><div><small>Last updated</small><p>{date(application.last_update)}</p></div>{application.rejection_reason && <div className="detail-full"><small>Rejection reason</small><p>{application.rejection_reason}</p></div>}<div className="detail-full"><small>Assigned collection centre</small><p>{application.assigned_center ? <Link href={`/centers/${application.assigned_center.id}`}>{application.assigned_center.name} · {application.assigned_center.district}</Link> : "Not assigned"}</p></div></article><StageProgress stages={application.stages}/></section>;
}
