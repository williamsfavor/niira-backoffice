import "server-only";
import { adminSupabase } from "./admin-supabase";

const TZ = "Africa/Kampala";
const dayKey = (value: string | Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export async function getDashboardOverview() {
  const client = adminSupabase();
  const today = dayKey(new Date());
  const start = new Date(`${today}T00:00:00+03:00`);
  const end = new Date(`${today}T23:59:59.999+03:00`);
  const trendStart = new Date(start); trendStart.setDate(trendStart.getDate() - 13);
  const [applicationsToday, openTickets, activeCenters, activeFaqs, appointmentsToday, recentTickets, centers, applicationsTrend, appointmentsTrend, appStatuses, ticketStatuses] = await Promise.all([
    client.from("applications").select("application_id", { count: "exact", head: true }).gte("last_update", start.toISOString()).lte("last_update", end.toISOString()),
    client.from("tickets").select("ticket_id", { count: "exact", head: true }).neq("status", "Resolved"),
    client.from("centers").select("id", { count: "exact", head: true }).eq("is_active", true),
    client.from("faqs").select("id", { count: "exact", head: true }).eq("is_active", true),
    client.from("appointments").select("appointment_id,customer_name,phone_number,status,centers(name),appointment_slots!inner(starts_at)", { count: "exact" }).gte("appointment_slots.starts_at", start.toISOString()).lte("appointment_slots.starts_at", end.toISOString()).limit(5),
    client.from("tickets").select("ticket_id,issue_text,status,created_at,phone_number").order("created_at", { ascending: false }).limit(5),
    client.from("centers").select("id,name,district,is_active").order("name").limit(6),
    client.from("applications").select("last_update").gte("last_update", trendStart.toISOString()).lte("last_update", end.toISOString()).limit(5000),
    client.from("appointments").select("created_at").gte("created_at", trendStart.toISOString()).lte("created_at", end.toISOString()).limit(5000),
    client.from("applications").select("status").limit(5000),
    client.from("tickets").select("status").limit(5000),
  ]);
  const all = [applicationsToday, openTickets, activeCenters, activeFaqs, appointmentsToday, recentTickets, centers, applicationsTrend, appointmentsTrend, appStatuses, ticketStatuses];
  const error = all.find((result) => result.error)?.error;
  if (error) throw new Error(`Unable to load dashboard: ${error.message}`);
  const trend = Array.from({ length: 14 }, (_, index) => { const date = new Date(trendStart); date.setDate(date.getDate() + index); return { date: dayKey(date), applications: 0, appointments: 0 }; });
  const byDay = new Map(trend.map((row) => [row.date, row]));
  for (const row of applicationsTrend.data ?? []) { const target = row.last_update && byDay.get(dayKey(row.last_update)); if (target) target.applications += 1; }
  for (const row of appointmentsTrend.data ?? []) { const target = byDay.get(dayKey(row.created_at)); if (target) target.appointments += 1; }
  const distribution = (rows: Array<{ status: string }>) => [...rows.reduce((map, row) => map.set(row.status, (map.get(row.status) ?? 0) + 1), new Map<string, number>())].map(([name, value]) => ({ name, value }));
  return {
    applicationsToday: applicationsToday.count ?? 0, openTickets: openTickets.count ?? 0, activeCenters: activeCenters.count ?? 0,
    activeFaqs: activeFaqs.count ?? 0, appointmentsToday: appointmentsToday.count ?? 0,
    recentTickets: recentTickets.data ?? [], centers: centers.data ?? [], appointments: appointmentsToday.data ?? [], trend,
    applicationStatuses: distribution(appStatuses.data ?? []), ticketStatuses: distribution(ticketStatuses.data ?? []), refreshedAt: new Date().toISOString(),
  };
}
