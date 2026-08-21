"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, MessageSquareText, Send, Settings2, UserRound, X } from "lucide-react";
import { changeTicketStatus, claimTicket, retryResolutionNotification, sendTicketMessage } from "@/app/actions/operations";
import type { TicketDetail } from "@/lib/tickets";
import { Status } from "./ui";

const formatDateTime = (value: string | null) => value ? new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(value)) : "—";
const readable = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TicketModal({ ticket, closeHref }: { ticket: TicketDetail; closeHref: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [tab, setTab] = useState<"details" | "communication" | "actions" | "history">("details");
  const [nextStatus, setNextStatus] = useState(ticket.status);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  const history = useMemo(() => {
    const events = [
      { id: "created", at: ticket.created_at, title: "Ticket created", detail: ticket.issue_text, tone: "system" },
      ...ticket.audits.map((audit) => ({ id: `audit-${audit.id}`, at: audit.created_at, title: readable(audit.action), detail: audit.reason || `Recorded by ${audit.actor?.name || "an administrator"}.`, tone: "action" })),
      ...ticket.notifications.map((notification) => ({ id: `notification-${notification.id}`, at: notification.updated_at, title: `WhatsApp ${notification.delivery_status || notification.status}`, detail: notification.last_error || `${readable(notification.event_type)} · ${notification.provider_sid || "Awaiting provider reference"}`, tone: notification.status === "Failed" ? "failed" : "message" })),
    ];
    return events.sort((left, right) => new Date(left.at).getTime() - new Date(right.at).getTime());
  }, [ticket]);

  function close() { router.push(closeHref, { scroll: false }); }

  const notificationState = ticket.notification?.delivery_status || ticket.notification?.status;
  const hasFailedNotification = ticket.notifications.some((notification) => notification.status === "Failed" || ["failed", "undelivered"].includes((notification.delivery_status || "").toLowerCase()));

  return <dialog ref={dialogRef} className="ticket-dialog" onCancel={(event) => { event.preventDefault(); close(); }}>
    <div className="ticket-modal-head"><div><div className="ticket-modal-title"><span className="mono">{ticket.ticket_id}</span><Status value={ticket.status}/>{notificationState && <span className={`notification-state ${notificationState.toLowerCase()}`}>WhatsApp: {notificationState}</span>}</div><p>{ticket.issue_text}</p></div><button type="button" className="icon-button" onClick={close} aria-label="Close ticket"><X size={20}/></button></div>
    <nav className="ticket-tabs" aria-label="Ticket sections">{(["details", "communication", "actions", "history"] as const).map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{readable(item)}</button>)}</nav>
    <div className="ticket-modal-body">
      {tab === "details" && <div className="ticket-details-grid"><section><h3>Ticket information</h3><dl><div><dt>Reference</dt><dd className="mono">{ticket.ticket_id}</dd></div><div><dt>Application</dt><dd>{ticket.application_id || "Not linked"}</dd></div><div><dt>Status</dt><dd><Status value={ticket.status}/></dd></div><div><dt>Assigned to</dt><dd>{ticket.assignee?.name || "Unassigned"}</dd></div></dl></section><section><h3>Citizen information</h3><dl><div><dt>WhatsApp number</dt><dd>{ticket.phone_number}</dd></div><div><dt>Created</dt><dd>{formatDateTime(ticket.created_at)}</dd></div><div><dt>Last updated</dt><dd>{formatDateTime(ticket.updated_at)}</dd></div><div><dt>Resolved</dt><dd>{formatDateTime(ticket.resolved_at)}</dd></div></dl></section><section className="ticket-issue"><h3>Reported issue</h3><p>{ticket.issue_text}</p></section>{ticket.resolution_note && <section className="ticket-resolution"><h3>Resolution</h3><p>{ticket.resolution_note}</p></section>}</div>}
      {tab === "communication" && <div className="communication-layout"><div className="message-thread">{ticket.messages.length ? ticket.messages.map((message) => <article className={`ticket-message ${message.visibility.toLowerCase()}`} key={message.id}><header><div><MessageSquareText size={15}/><strong>{message.message_type === "InternalNote" ? "Internal note" : message.message_type}</strong></div><time>{formatDateTime(message.created_at)}</time></header><p>{message.body}</p><small>{message.creator?.name || "System"} · {message.visibility}</small></article>) : <div className="report-empty">No staff responses have been recorded yet.</div>}</div><form action={sendTicketMessage} className="ticket-compose"><input type="hidden" name="ticket_id" value={ticket.ticket_id}/><div><label htmlFor="visibility">Message type</label><select id="visibility" name="visibility" defaultValue="Citizen"><option value="Citizen">WhatsApp response to citizen</option><option value="Internal">Internal note</option></select></div><label htmlFor="message">Message<textarea id="message" name="message" maxLength={1000} placeholder="Write a clear response or internal note…" required/></label><p>Sending a response does not change the ticket status.</p><button className="button" type="submit"><Send size={15}/> Save message</button></form></div>}
      {tab === "actions" && <div className="ticket-actions-grid"><form action={changeTicketStatus} className="ticket-action-card"><div className="ticket-action-title"><Settings2 size={18}/><div><h3>Change status</h3><p>Status changes are separate from staff responses.</p></div></div><input type="hidden" name="ticket_id" value={ticket.ticket_id}/><label>Status<select name="status" value={nextStatus} onChange={(event) => setNextStatus(event.target.value as typeof nextStatus)}><option value="Open">Open</option><option value="InProgress">In progress</option><option value="Resolved">Resolved</option></select></label>{nextStatus === "Resolved" && <label>Resolution<textarea name="resolution_note" defaultValue={ticket.resolution_note || ""} placeholder="Explain what resolved the citizen’s issue." required/></label>}<button className="button" type="submit">Update status</button></form><section className="ticket-action-card"><div className="ticket-action-title"><UserRound size={18}/><div><h3>Assignment</h3><p>{ticket.assignee ? `Assigned to ${ticket.assignee.name}.` : "No support agent has claimed this ticket."}</p></div></div>{!ticket.assignee && <form action={claimTicket}><input type="hidden" name="ticket_id" value={ticket.ticket_id}/><button className="secondary" type="submit">Assign to me</button></form>}</section>{hasFailedNotification && <section className="ticket-action-card failed-card"><div className="ticket-action-title"><Send size={18}/><div><h3>Retry WhatsApp</h3><p>The last citizen notification failed. Retry all unsent messages for this ticket.</p></div></div><form action={retryResolutionNotification}><input type="hidden" name="ticket_id" value={ticket.ticket_id}/><button className="secondary" type="submit">Retry failed messages</button></form></section>}</div>}
      {tab === "history" && <div className="ticket-timeline">{history.map((event) => <article key={event.id} className={event.tone}><i/><div><header><strong>{event.title}</strong><time><Clock3 size={13}/>{formatDateTime(event.at)}</time></header><p>{event.detail}</p></div></article>)}</div>}
    </div>
  </dialog>;
}
