import "server-only";

import { adminSupabase } from "./admin-supabase";

const PAGE_SIZE = 1000;
const KAMPALA_OFFSET = "+03:00";

type QueryResult<T> = { data: T[] | null; error: { message: string } | null };
type BreakdownItem = { label: string; value: number };

export type ReportParams = { from?: string; to?: string; range?: string };
export type OperationsReport = {
  from: string;
  to: string;
  rangeLabel: string;
  summary: {
    applications: number;
    tickets: number;
    resolvedTickets: number;
    appointments: number;
    deliveredMessages: number;
    deliveryRate: number;
    averageResolutionHours: number | null;
  };
  applicationsByStatus: BreakdownItem[];
  applicationsByType: BreakdownItem[];
  ticketsByStatus: BreakdownItem[];
  appointmentsByStatus: BreakdownItem[];
  appointmentsByCentre: BreakdownItem[];
  messagesByDelivery: BreakdownItem[];
  centresByDistrict: BreakdownItem[];
  faqViewsByCategory: BreakdownItem[];
  failedNotifications: Array<{ ticketId: string; error: string; attempts: number }>;
};

function kampalaDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Kampala", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function validDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00${KAMPALA_OFFSET}`).getTime()));
}

export function resolveReportRange(params: ReportParams) {
  const today = kampalaDate(new Date());
  const days = [7, 30, 90, 365].includes(Number(params.range)) ? Number(params.range) : 30;
  const defaultFromDate = new Date(`${today}T00:00:00${KAMPALA_OFFSET}`);
  defaultFromDate.setDate(defaultFromDate.getDate() - (days - 1));
  const from = validDate(params.from) ? params.from! : kampalaDate(defaultFromDate);
  const to = validDate(params.to) ? params.to! : today;
  if (new Date(`${from}T00:00:00${KAMPALA_OFFSET}`) > new Date(`${to}T23:59:59${KAMPALA_OFFSET}`)) {
    return { from: to, to, start: `${to}T00:00:00${KAMPALA_OFFSET}`, end: `${to}T23:59:59.999${KAMPALA_OFFSET}`, rangeLabel: "1 day" };
  }
  const inclusiveDays = Math.floor((new Date(`${to}T12:00:00${KAMPALA_OFFSET}`).getTime() - new Date(`${from}T12:00:00${KAMPALA_OFFSET}`).getTime()) / 86_400_000) + 1;
  return { from, to, start: `${from}T00:00:00${KAMPALA_OFFSET}`, end: `${to}T23:59:59.999${KAMPALA_OFFSET}`, rangeLabel: `${inclusiveDays} day${inclusiveDays === 1 ? "" : "s"}` };
}

async function collect<T>(load: (from: number, to: number) => Promise<QueryResult<T>>) {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await load(from, from + PAGE_SIZE - 1);
    if (result.error) throw new Error(result.error.message);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function breakdown(values: Array<string | null | undefined>, fallback = "Not specified") {
  const counts = new Map<string, number>();
  for (const value of values) {
    const label = value?.trim() || fallback;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()].map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value || left.label.localeCompare(right.label));
}

export async function getOperationsReport(params: ReportParams = {}): Promise<OperationsReport> {
  const client = adminSupabase();
  const range = resolveReportRange(params);

  const [applications, tickets, appointments, notifications, centres, faqs] = await Promise.all([
    collect<{ status: string; application_type: string | null }>(async (from, to) => client.from("applications").select("status,application_type").gte("last_update", range.start).lte("last_update", range.end).order("last_update").range(from, to)),
    collect<{ ticket_id: string; status: string; created_at: string; resolved_at: string | null }>(async (from, to) => client.from("tickets").select("ticket_id,status,created_at,resolved_at").gte("created_at", range.start).lte("created_at", range.end).order("created_at").range(from, to)),
    collect<{ status: string; centers: { name: string } | Array<{ name: string }> | null }>(async (from, to) => client.from("appointments").select("status,centers(name)").gte("created_at", range.start).lte("created_at", range.end).order("created_at").range(from, to)),
    collect<{ aggregate_id: string; status: string; delivery_status: string | null; attempts: number; last_error: string | null }>(async (from, to) => client.from("notification_outbox").select("aggregate_id,status,delivery_status,attempts,last_error").eq("event_type", "ticket_resolved").gte("created_at", range.start).lte("created_at", range.end).order("created_at").range(from, to)),
    collect<{ district: string; is_active: boolean }>(async (from, to) => client.from("centers").select("district,is_active").range(from, to)),
    collect<{ category: string; view_count: number; is_active: boolean }>(async (from, to) => client.from("faqs").select("category,view_count,is_active").range(from, to)),
  ]);

  const resolvedTickets = tickets.filter((ticket) => ticket.status === "Resolved");
  const resolutionDurations = resolvedTickets
    .filter((ticket) => ticket.resolved_at)
    .map((ticket) => (new Date(ticket.resolved_at!).getTime() - new Date(ticket.created_at).getTime()) / 3_600_000)
    .filter((hours) => Number.isFinite(hours) && hours >= 0);
  const deliveredMessages = notifications.filter((notification) => ["sent", "delivered", "read"].includes((notification.delivery_status || "").toLowerCase())).length;
  const appointmentCentres = appointments.map((appointment) => Array.isArray(appointment.centers) ? appointment.centers[0]?.name : appointment.centers?.name);
  const faqCategoryViews = new Map<string, number>();
  for (const faq of faqs.filter((item) => item.is_active)) faqCategoryViews.set(faq.category, (faqCategoryViews.get(faq.category) ?? 0) + (faq.view_count || 0));

  return {
    from: range.from,
    to: range.to,
    rangeLabel: range.rangeLabel,
    summary: {
      applications: applications.length,
      tickets: tickets.length,
      resolvedTickets: resolvedTickets.length,
      appointments: appointments.length,
      deliveredMessages,
      deliveryRate: notifications.length ? Math.round((deliveredMessages / notifications.length) * 1000) / 10 : 0,
      averageResolutionHours: resolutionDurations.length ? Math.round((resolutionDurations.reduce((total, hours) => total + hours, 0) / resolutionDurations.length) * 10) / 10 : null,
    },
    applicationsByStatus: breakdown(applications.map((application) => application.status)),
    applicationsByType: breakdown(applications.map((application) => application.application_type)),
    ticketsByStatus: breakdown(tickets.map((ticket) => ticket.status)),
    appointmentsByStatus: breakdown(appointments.map((appointment) => appointment.status)),
    appointmentsByCentre: breakdown(appointmentCentres),
    messagesByDelivery: breakdown(notifications.map((notification) => notification.delivery_status || notification.status)),
    centresByDistrict: breakdown(centres.filter((centre) => centre.is_active).map((centre) => centre.district)),
    faqViewsByCategory: [...faqCategoryViews.entries()].map(([label, value]) => ({ label, value })).sort((left, right) => right.value - left.value),
    failedNotifications: notifications.filter((notification) => notification.status === "Failed" || ["failed", "undelivered"].includes((notification.delivery_status || "").toLowerCase())).map((notification) => ({ ticketId: notification.aggregate_id, error: notification.last_error || "Twilio did not provide an error description.", attempts: notification.attempts })),
  };
}
