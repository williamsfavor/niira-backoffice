import { createClient } from "@supabase/supabase-js";
import type { DashboardData } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export async function getDashboardData(): Promise<DashboardData> {
  if (!supabase) throw new Error("Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [apps, tickets, centers, faqs, appointments] = await Promise.all([
    supabase.from("applications").select("application_id,applicant_name,application_type,status,current_stage,last_update").order("last_update", { ascending: false }).limit(20),
    supabase.from("tickets").select("ticket_id,issue_text,status,created_at,phone_number").order("created_at", { ascending: false }),
    supabase.from("centers").select("id,name,district,address,hours,is_active").order("district"),
    supabase.from("faqs").select("id,category,question,answer,priority,view_count,is_active").order("priority"),
    supabase.from("appointments").select("appointment_id,customer_name,phone_number,status,service_type,created_at,centers(name),appointment_slots(starts_at)").order("created_at", { ascending: false }).limit(30)
  ]);
  const error = apps.error || tickets.error || centers.error || faqs.error || appointments.error;
  if (error) throw new Error(`Unable to load operational data from Supabase: ${error.message}`);
  const applicationRows = apps.data ?? [];
  const ticketRows = tickets.data ?? [];
  const centerRows = centers.data ?? [];
  const faqRows = faqs.data ?? [];
  const appointmentRows = appointments.data ?? [];
  return {
    applicationsToday: applicationRows.filter((app) => app.last_update && new Date(app.last_update) >= today).length,
    openTickets: ticketRows.filter((ticket) => ticket.status !== "Resolved").length,
    activeCenters: centerRows.filter((center) => center.is_active).length,
    activeFaqs: faqRows.filter((faq) => faq.is_active).length,
    appointmentsToday: appointmentRows.filter((appointment) => new Date(appointment.created_at) >= today).length,
    recentTickets: ticketRows as DashboardData["recentTickets"], applications: applicationRows,
    centers: centerRows, faqs: faqRows,
    appointments: appointmentRows.map((appointment) => ({
      ...appointment,
      centers: Array.isArray(appointment.centers) ? appointment.centers[0] ?? null : appointment.centers,
      appointment_slots: Array.isArray(appointment.appointment_slots) ? appointment.appointment_slots[0] ?? null : appointment.appointment_slots
    })) as DashboardData["appointments"]
  };
}
