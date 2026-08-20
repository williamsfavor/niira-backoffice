import { createClient } from "@supabase/supabase-js";
import type { DashboardData } from "./types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

const demo: DashboardData = {
  applicationsToday: 48, openTickets: 6, activeCenters: 3, activeFaqs: 9, appointmentsToday: 3,
  recentTickets: [{ ticket_id: "TKT-2026-000001", issue_text: "My application has been processing longer than expected.", status: "Open", created_at: new Date().toISOString(), phone_number: "+256701234567" }],
  applications: [
    { application_id: "5714501490460202", applicant_name: "Amina Nakato", application_type: "Renewal", status: "Processing", current_stage: "Card Production", last_update: new Date().toISOString() },
    { application_id: "5714501490460203", applicant_name: "Brian Okello", application_type: "New", status: "Ready", current_stage: "Ready for collection", last_update: new Date().toISOString() },
    { application_id: "5714501490460204", applicant_name: "Sarah Achieng", application_type: "Correction", status: "Rejected", current_stage: "Application review", last_update: new Date().toISOString() }
  ],
  centers: [
    { id: "1", name: "Kampala Central Collection Centre", district: "Kampala", address: "King George VI Way, Kampala", hours: "Mon–Fri, 8:00 AM–5:00 PM", is_active: true },
    { id: "2", name: "Jinja Collection Centre", district: "Jinja", address: "Main Street, Jinja", hours: "Mon–Fri, 8:00 AM–5:00 PM", is_active: true },
    { id: "3", name: "Mbarara Collection Centre", district: "Mbarara", address: "High Street, Mbarara", hours: "Mon–Fri, 8:00 AM–5:00 PM", is_active: true }
  ],
  faqs: [{ id: "1", category: "Status", question: "How do I check my application status?", answer: "Send your 16-digit Application ID to this WhatsApp number.", priority: 1, view_count: 0, is_active: true }],
  appointments: []
};

export async function getDashboardData(): Promise<DashboardData> {
  if (!supabase) return demo;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [apps, tickets, centers, faqs, appointments] = await Promise.all([
    supabase.from("applications").select("application_id,applicant_name,application_type,status,current_stage,last_update").order("last_update", { ascending: false }).limit(20),
    supabase.from("tickets").select("ticket_id,issue_text,status,created_at,phone_number").order("created_at", { ascending: false }),
    supabase.from("centers").select("id,name,district,address,hours,is_active").order("district"),
    supabase.from("faqs").select("id,category,question,answer,priority,view_count,is_active").order("priority"),
    supabase.from("appointments").select("appointment_id,customer_name,phone_number,status,service_type,created_at,centers(name),appointment_slots(starts_at)").order("created_at", { ascending: false }).limit(30)
  ]);
  if (apps.error || tickets.error || centers.error || faqs.error || appointments.error) return demo;
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
