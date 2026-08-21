import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Search, SlidersHorizontal } from "lucide-react";
import { Status } from "@/components/ui";
import { TicketModal } from "@/components/ticket-modal";
import { getTicketDetail, getTickets, type TicketListParams } from "@/lib/tickets";

function href(params: TicketListParams, overrides: Record<string, string | number | null>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...params, ...overrides })) if (value !== null && value !== "" && value !== "all") query.set(key, String(value));
  const serialized = query.toString();
  return serialized ? `/tickets?${serialized}` : "/tickets";
}

export default async function TicketsPage({ searchParams }: { searchParams: Promise<TicketListParams> }) {
  const params = await searchParams;
  const [result, selectedTicket] = await Promise.all([getTickets(params), params.ticket ? getTicketDetail(params.ticket) : Promise.resolve(null)]);
  const { rows, filters, total, pages } = result;
  const closeHref = href(params, { ticket: null });
  const sortHref = (sort: string) => href(params, { sort, direction: filters.sort === sort && filters.direction === "desc" ? "asc" : "desc", page: 1, ticket: null });
  const formatDate = (value: string) => new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(value));

  return <section className="page tickets-page">
    <div className="page-title"><div><p className="eyebrow">CITIZEN ESCALATIONS</p><h2>Support tickets</h2><p className="page-copy">Search, review, respond, assign, and change status without combining separate actions.</p></div></div>
    <form className="table-toolbar">
      <label className="table-search"><Search size={16}/><input name="q" defaultValue={filters.q} placeholder="Search ticket, phone, or issue"/></label>
      <label><SlidersHorizontal size={15}/><select name="status" defaultValue={filters.status}><option value="all">All statuses</option><option value="Open">Open</option><option value="InProgress">In progress</option><option value="Resolved">Resolved</option></select></label>
      <label>Rows<select name="size" defaultValue={String(filters.size)}><option value="10">10</option><option value="20">20</option><option value="50">50</option></select></label>
      <input type="hidden" name="sort" value={filters.sort}/><input type="hidden" name="direction" value={filters.direction}/>
      <button className="secondary" type="submit">Apply</button>{(filters.q || filters.status !== "all") && <Link className="toolbar-clear" href="/tickets">Clear</Link>}
    </form>
    <article className="panel data-panel"><div className="table-summary"><span>{total.toLocaleString("en-UG")} ticket{total === 1 ? "" : "s"}</span><small>Page {filters.page} of {pages}</small></div><div className="table-wrap"><table className="standard-table"><thead><tr><th><Link href={sortHref("reference")}>Reference</Link></th><th>Citizen</th><th>Issue</th><th><Link href={sortHref("status")}>Status</Link></th><th>Assigned to</th><th><Link href={sortHref("created")}>Created</Link></th><th>WhatsApp</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((ticket) => { const openHref = href(params, { ticket: ticket.ticket_id }); const messageState = ticket.notification?.delivery_status || ticket.notification?.status; return <tr key={ticket.ticket_id}><td><Link className="mono ticket-link" href={openHref} scroll={false}>{ticket.ticket_id}</Link></td><td>{ticket.phone_number}</td><td><Link className="issue-link" href={openHref} scroll={false}>{ticket.issue_text}</Link></td><td><Status value={ticket.status}/></td><td>{ticket.assignee?.name || "Unassigned"}</td><td>{formatDate(ticket.created_at)}</td><td>{messageState ? <span className={`notification-state ${messageState.toLowerCase()}`}>{messageState}</span> : "—"}</td><td><Link className="table-action" href={openHref} scroll={false}>View</Link></td></tr>})}</tbody></table>{rows.length === 0 && <div className="empty table-empty"><h3>No tickets found</h3><p>Change the search or status filter and try again.</p></div>}</div>
      <footer className="table-pagination"><span>Showing {total ? (filters.page - 1) * filters.size + 1 : 0}–{Math.min(filters.page * filters.size, total)} of {total}</span><div><Link className={filters.page <= 1 ? "disabled" : ""} aria-label="First page" href={href(params, { page: 1, ticket: null })}><ChevronsLeft size={16}/></Link><Link className={filters.page <= 1 ? "disabled" : ""} aria-label="Previous page" href={href(params, { page: Math.max(1, filters.page - 1), ticket: null })}><ChevronLeft size={16}/></Link><span>{filters.page} / {pages}</span><Link className={filters.page >= pages ? "disabled" : ""} aria-label="Next page" href={href(params, { page: Math.min(pages, filters.page + 1), ticket: null })}><ChevronRight size={16}/></Link><Link className={filters.page >= pages ? "disabled" : ""} aria-label="Last page" href={href(params, { page: pages, ticket: null })}><ChevronsRight size={16}/></Link></div></footer>
    </article>
    {selectedTicket && <TicketModal ticket={selectedTicket} closeHref={closeHref}/>}
  </section>;
}
