import "server-only";

import { adminSupabase } from "./admin-supabase";

export type TicketListParams = { q?: string; status?: string; sort?: string; direction?: string; page?: string; size?: string; ticket?: string };
export type TicketRow = {
  ticket_id: string;
  phone_number: string;
  application_id: string | null;
  issue_text: string;
  status: "Open" | "InProgress" | "Resolved";
  assigned_to: string | null;
  resolution_note: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  assignee: { name: string; email: string } | null;
  notification: { status: string; delivery_status: string | null; attempts: number; last_error: string | null } | null;
};

export type TicketDetail = TicketRow & {
  messages: Array<{ id: string; body: string; visibility: string; message_type: string; channel: string; created_at: string; creator: { name: string; email: string } | null }>;
  notifications: Array<{ id: string; event_type: string; status: string; delivery_status: string | null; attempts: number; provider_sid: string | null; provider_error_code: string | null; last_error: string | null; created_at: string; sent_at: string | null; updated_at: string }>;
  audits: Array<{ id: number; action: string; before_data: Record<string, unknown> | null; after_data: Record<string, unknown> | null; reason: string | null; created_at: string; actor: { name: string; email: string } | null }>;
};

const statusValues = new Set(["Open", "InProgress", "Resolved"]);
const sortFields = { created: "created_at", updated: "updated_at", status: "status", reference: "ticket_id" } as const;

function firstRelation<T>(value: T | T[] | null): T | null { return Array.isArray(value) ? value[0] ?? null : value; }

export function normalizeTicketParams(params: TicketListParams) {
  const size = [10, 20, 50].includes(Number(params.size)) ? Number(params.size) : 10;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const status = statusValues.has(params.status || "") ? params.status! : "all";
  const sort = Object.hasOwn(sortFields, params.sort || "") ? params.sort! as keyof typeof sortFields : "created";
  const direction = params.direction === "asc" ? "asc" : "desc";
  const q = (params.q || "").replace(/[^a-zA-Z0-9+\-\s]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60);
  return { q, status, sort, direction, page, size };
}

export async function getTickets(params: TicketListParams) {
  const filters = normalizeTicketParams(params);
  const client = adminSupabase();
  const fetchPage = (page: number) => {
    let query = client.from("tickets").select("ticket_id,phone_number,application_id,issue_text,status,assigned_to,resolution_note,created_at,updated_at,resolved_at,assignee:admin_users!tickets_assigned_to_fkey(name,email)", { count: "exact" });
    if (filters.status !== "all") query = query.eq("status", filters.status);
    if (filters.q) query = query.or(`ticket_id.ilike.%${filters.q}%,phone_number.ilike.%${filters.q}%,issue_text.ilike.%${filters.q}%`);
    const from = (page - 1) * filters.size;
    return query.order(sortFields[filters.sort], { ascending: filters.direction === "asc" }).range(from, from + filters.size - 1);
  };
  let { data, error, count } = await fetchPage(filters.page);
  if (error) throw new Error(`Unable to load tickets: ${error.message}`);
  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / filters.size));
  if (filters.page > pages) {
    filters.page = pages;
    const finalPage = await fetchPage(filters.page);
    data = finalPage.data;
    error = finalPage.error;
    if (error) throw new Error(`Unable to load tickets: ${error.message}`);
  }
  const rows = data ?? [];
  const ids = rows.map((ticket) => ticket.ticket_id);
  const notifications = ids.length ? await client.from("notification_outbox").select("aggregate_id,status,delivery_status,attempts,last_error,created_at").in("aggregate_id", ids).order("created_at", { ascending: false }) : { data: [], error: null };
  if (notifications.error) throw new Error(`Unable to load ticket notifications: ${notifications.error.message}`);
  const notificationByTicket = new Map<string, TicketRow["notification"]>();
  for (const notification of notifications.data ?? []) if (!notificationByTicket.has(notification.aggregate_id)) notificationByTicket.set(notification.aggregate_id, notification);
  return {
    rows: rows.map((ticket) => ({ ...ticket, assignee: firstRelation(ticket.assignee), notification: notificationByTicket.get(ticket.ticket_id) ?? null })) as TicketRow[],
    filters,
    total,
    pages,
  };
}

export async function getTicketDetail(ticketId: string): Promise<TicketDetail | null> {
  const client = adminSupabase();
  const [ticket, messages, notifications, audits] = await Promise.all([
    client.from("tickets").select("*,assignee:admin_users!tickets_assigned_to_fkey(name,email)").eq("ticket_id", ticketId).maybeSingle(),
    client.from("ticket_messages").select("id,body,visibility,message_type,channel,created_at,creator:admin_users!ticket_messages_created_by_fkey(name,email)").eq("ticket_id", ticketId).order("created_at", { ascending: true }),
    client.from("notification_outbox").select("id,event_type,status,delivery_status,attempts,provider_sid,provider_error_code,last_error,created_at,sent_at,updated_at").eq("aggregate_id", ticketId).order("created_at", { ascending: true }),
    client.from("audit_logs").select("id,action,before_data,after_data,reason,created_at,actor:admin_users!audit_logs_actor_admin_id_fkey(name,email)").eq("entity_type", "ticket").eq("entity_id", ticketId).order("created_at", { ascending: true }),
  ]);
  const error = ticket.error || messages.error || notifications.error || audits.error;
  if (error) throw new Error(`Unable to load ticket details: ${error.message}`);
  if (!ticket.data) return null;
  const latestNotification = notifications.data?.at(-1) ?? null;
  return {
    ...ticket.data,
    assignee: firstRelation(ticket.data.assignee),
    notification: latestNotification ? { status: latestNotification.status, delivery_status: latestNotification.delivery_status, attempts: latestNotification.attempts, last_error: latestNotification.last_error } : null,
    messages: (messages.data ?? []).map((message) => ({ ...message, creator: firstRelation(message.creator) })),
    notifications: notifications.data ?? [],
    audits: (audits.data ?? []).map((audit) => ({ ...audit, actor: firstRelation(audit.actor) })),
  } as TicketDetail;
}
