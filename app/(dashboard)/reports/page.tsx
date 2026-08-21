import Link from "next/link";
import { AlertTriangle, Download } from "lucide-react";
import { BreakdownPanel, ReportMetric } from "@/components/reporting";
import { getOperationsReport } from "@/lib/reports";

type SearchParams = Promise<{ from?: string; to?: string; range?: string }>;

export default async function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const report = await getOperationsReport(params);
  const exportQuery = new URLSearchParams({ from: report.from, to: report.to }).toString();
  const resolvedRate = report.summary.tickets ? Math.round((report.summary.resolvedTickets / report.summary.tickets) * 1000) / 10 : 0;

  return <section className="page reports-page">
    <div className="page-title"><div><p className="eyebrow">OPERATIONAL REPORTING</p><h2>Reports</h2><p className="page-copy">Review service demand, case resolution, appointment activity, and WhatsApp delivery performance.</p></div><Link className="button" href={`/reports/export?${exportQuery}`}><Download size={16}/> Export CSV</Link></div>
    <div className="report-toolbar">
      <div className="report-presets" aria-label="Report period"><Link href="/reports?range=7" className={params.range === "7" ? "selected" : ""}>7 days</Link><Link href="/reports?range=30" className={!params.from && (!params.range || params.range === "30") ? "selected" : ""}>30 days</Link><Link href="/reports?range=90" className={params.range === "90" ? "selected" : ""}>90 days</Link><Link href="/reports?range=365" className={params.range === "365" ? "selected" : ""}>1 year</Link></div>
      <form className="date-filter"><label>From<input type="date" name="from" defaultValue={report.from} max={report.to}/></label><label>To<input type="date" name="to" defaultValue={report.to} min={report.from}/></label><button className="secondary" type="submit">Apply dates</button></form>
    </div>
    <p className="report-period">Showing {report.rangeLabel}: {new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(new Date(`${report.from}T00:00:00+03:00`))} – {new Intl.DateTimeFormat("en-UG", { dateStyle: "medium" }).format(new Date(`${report.to}T23:59:59+03:00`))}</p>
    <div className="report-metrics"><ReportMetric label="Applications updated" value={report.summary.applications.toLocaleString("en-UG")} note="Records updated during the period"/><ReportMetric label="Support tickets" value={report.summary.tickets.toLocaleString("en-UG")} note={`${resolvedRate}% resolved`}/><ReportMetric label="Appointments booked" value={report.summary.appointments.toLocaleString("en-UG")} note="Office visits created during the period"/><ReportMetric label="Resolution time" value={report.summary.averageResolutionHours === null ? "—" : `${report.summary.averageResolutionHours}h`} note="Average ticket resolution time"/><ReportMetric label="WhatsApp delivery" value={`${report.summary.deliveryRate}%`} note={`${report.summary.deliveredMessages} messages sent, delivered, or read`}/></div>
    <div className="report-grid"><BreakdownPanel eyebrow="APPLICATIONS" title="Status distribution" rows={report.applicationsByStatus}/><BreakdownPanel eyebrow="APPLICATIONS" title="Application types" rows={report.applicationsByType}/><BreakdownPanel eyebrow="SUPPORT" title="Ticket status" rows={report.ticketsByStatus}/><BreakdownPanel eyebrow="APPOINTMENTS" title="Booking status" rows={report.appointmentsByStatus}/><BreakdownPanel eyebrow="APPOINTMENTS" title="Bookings by centre" rows={report.appointmentsByCentre}/><BreakdownPanel eyebrow="WHATSAPP" title="Resolution-message delivery" rows={report.messagesByDelivery}/><BreakdownPanel eyebrow="CENTRE NETWORK" title="Active centres by district" rows={report.centresByDistrict}/><BreakdownPanel eyebrow="CONTENT — LIFETIME" title="FAQ views by category" rows={report.faqViewsByCategory}/></div>
    {report.failedNotifications.length > 0 && <article className="panel report-failures"><div className="panel-head"><div><p className="eyebrow">NEEDS ATTENTION</p><h2>Failed citizen notifications</h2></div><AlertTriangle size={19}/></div><div className="table-wrap"><table><thead><tr><th>Ticket</th><th>Attempts</th><th>Last error</th></tr></thead><tbody>{report.failedNotifications.map((failure) => <tr key={failure.ticketId}><td><Link href={`/tickets/${failure.ticketId}`}>{failure.ticketId}</Link></td><td>{failure.attempts}</td><td>{failure.error}</td></tr>)}</tbody></table></div></article>}
  </section>;
}
