import Link from "next/link";
import { ArrowUpRight, Building2, CircleHelp, Ticket } from "lucide-react";
import { Metric, Status } from "@/components/ui";
import { getDashboardData } from "@/lib/supabase";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return <><section className="intro"><div><h2>Today at a glance</h2><p>Monitor citizen support, collection access, and appointment demand from one place.</p></div><Link className="button" href="/applications">Find an application <ArrowUpRight size={16}/></Link></section>
  <section className="metrics"><Metric label="Status checks today" value={data.applicationsToday} note="Application records updated today"/><Metric label="Open escalations" value={data.openTickets} note="Needs support-team attention" tone="amber"/><Metric label="Active collection centres" value={data.activeCenters} note="Available in WhatsApp location search" tone="green"/><Metric label="Appointments today" value={data.appointmentsToday} note="Office visits confirmed by citizens" tone="purple"/></section>
  <section className="grid"><article className="panel span-2"><div className="panel-head"><div><p className="eyebrow">SUPPORT QUEUE</p><h2>Recent escalations</h2></div><Link href="/tickets">View all</Link></div><div className="ticket-list">{data.recentTickets.slice(0,5).map((ticket) => <div className="ticket" key={ticket.ticket_id}><div className="ticket-icon"><Ticket size={18}/></div><div><strong>{ticket.ticket_id}</strong><p>{ticket.issue_text}</p><small>{ticket.phone_number}</small></div><Status value={ticket.status}/></div>)}</div></article>
  <article className="panel"><div className="panel-head"><div><p className="eyebrow">CONTENT</p><h2>FAQ coverage</h2></div><Link href="/faqs"><CircleHelp size={18}/></Link></div><div className="big-number">{data.activeFaqs}<span>active answers</span></div><p className="muted">Keep high-traffic questions current so citizens can self-serve on WhatsApp.</p></article>
  <article className="panel span-2"><div className="panel-head"><div><p className="eyebrow">COLLECTION NETWORK</p><h2>Centre availability</h2></div><Link href="/centers">Manage centres</Link></div><div className="centres">{data.centers.map((center) => <div key={center.id}><Building2 size={18}/><strong>{center.name}</strong><p>{center.district} · {center.is_active ? "Active" : "Inactive"}</p></div>)}</div></article>
  <article className="panel"><p className="eyebrow">SERVICE HEALTH</p><h2>WhatsApp bot</h2><div className="health"><i/> Receiving messages</div><p className="muted">Supabase-powered operational data is connected when environment variables are configured.</p></article></section></>;
}
