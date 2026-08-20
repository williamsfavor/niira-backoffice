export type TicketStatus = "Open" | "InProgress" | "Resolved";

export type DashboardData = {
  applicationsToday: number;
  openTickets: number;
  activeCenters: number;
  activeFaqs: number;
  appointmentsToday: number;
  recentTickets: Array<{ ticket_id: string; issue_text: string; status: TicketStatus; created_at: string; phone_number: string }>;
  applications: Array<{ application_id: string; applicant_name: string | null; phone_number: string | null; application_type: string | null; status: string; current_stage: string | null; last_update: string | null }>;
  centers: Array<{ id: string; name: string; district: string; address: string; hours: string | null; is_active: boolean }>;
  faqs: Array<{ id: string; category: string; question: string; answer: string; priority: number; view_count: number; is_active: boolean }>;
  appointments: Array<{ appointment_id: string; customer_name: string | null; phone_number: string; status: string; service_type: string; created_at: string; centers: { name: string } | null; appointment_slots: { starts_at: string } | null }>;
};
