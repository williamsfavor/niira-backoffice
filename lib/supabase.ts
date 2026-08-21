import { createClient } from "@supabase/supabase-js";
import type { DashboardData } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function getDashboardData(): Promise<DashboardData> {
  if (!supabase) throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [apps, tickets, centers, faqs, appointments, appointmentSlots, notifications] = await Promise.all([
    supabase.from("applications").select("application_id,applicant_name,phone_number,application_type,status,current_stage,last_update").order("last_update", { ascending: false }).limit(20),
    supabase.from("tickets").select("ticket_id,issue_text,status,created_at,phone_number").order("created_at", { ascending: false }),
    supabase.from("centers").select("id,name,district,address,hours,is_active").order("district"),
    supabase.from("faqs").select("id,category,question,answer,priority,view_count,is_active").order("priority"),
    supabase.from("appointments").select("appointment_id,customer_name,phone_number,status,service_type,created_at,centers(name),appointment_slots(starts_at)").order("created_at", { ascending: false }).limit(30),
    supabase.from("appointment_slots").select("id,slot_reference,starts_at,is_active,centers(name)").order("starts_at", { ascending: true }).limit(50),
    supabase.from("notification_outbox").select("aggregate_id,status,delivery_status,attempts,last_error,created_at").eq("event_type", "ticket_resolved").order("created_at", { ascending: false }).limit(100)
  ]);
  const error = apps.error || tickets.error || centers.error || faqs.error || appointments.error || appointmentSlots.error || notifications.error;
  if (error) throw new Error(`Unable to load operational data from Supabase: ${error.message}`);
  const applicationRows = apps.data ?? [];
  const ticketRows = tickets.data ?? [];
  const centerRows = centers.data ?? [];
  const faqRows = faqs.data ?? [];
  const appointmentRows = appointments.data ?? [];
  const notificationByTicket = new Map<string, { status: string; delivery_status: string | null; attempts: number; last_error: string | null }>();
  for (const notification of notifications.data ?? []) {
    if (!notificationByTicket.has(notification.aggregate_id)) notificationByTicket.set(notification.aggregate_id, notification);
  }
  return {
    applicationsToday: applicationRows.filter((app) => app.last_update && new Date(app.last_update) >= today).length,
    openTickets: ticketRows.filter((ticket) => ticket.status !== "Resolved").length,
    activeCenters: centerRows.filter((center) => center.is_active).length,
    activeFaqs: faqRows.filter((faq) => faq.is_active).length,
    appointmentsToday: appointmentRows.filter((appointment) => new Date(appointment.created_at) >= today).length,
    recentTickets: ticketRows.map((ticket) => ({ ...ticket, resolutionNotification: notificationByTicket.get(ticket.ticket_id) ?? null })) as DashboardData["recentTickets"], applications: applicationRows,
    centers: centerRows, faqs: faqRows,
    appointments: appointmentRows.map((appointment) => ({
      ...appointment,
      centers: Array.isArray(appointment.centers) ? appointment.centers[0] ?? null : appointment.centers,
      appointment_slots: Array.isArray(appointment.appointment_slots) ? appointment.appointment_slots[0] ?? null : appointment.appointment_slots
    })) as DashboardData["appointments"],
    appointmentSlots: (appointmentSlots.data ?? []).map((slot) => ({
      ...slot,
      centers: Array.isArray(slot.centers) ? slot.centers[0] ?? null : slot.centers,
    })) as DashboardData["appointmentSlots"]
  };
}

export async function getRecord(table: string, idColumn: string, id: string) {
  if (!supabase) throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  const { data, error } = await supabase.from(table).select("*").eq(idColumn, id).maybeSingle();
  if (error) throw new Error(`Unable to load record from Supabase: ${error.message}`);
  return data;
}
