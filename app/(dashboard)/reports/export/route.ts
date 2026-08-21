import { requireBackofficeUser } from "@/lib/backoffice-auth";
import { getOperationsReport } from "@/lib/reports";

function csvCell(value: string | number) {
  let text = String(value);
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  await requireBackofficeUser();
  const url = new URL(request.url);
  const report = await getOperationsReport({ from: url.searchParams.get("from") ?? undefined, to: url.searchParams.get("to") ?? undefined });
  const rows: Array<Array<string | number>> = [
    ["Report period", `${report.from} to ${report.to}`, ""],
    ["Summary", "Applications updated", report.summary.applications],
    ["Summary", "Support tickets", report.summary.tickets],
    ["Summary", "Resolved tickets", report.summary.resolvedTickets],
    ["Summary", "Appointments booked", report.summary.appointments],
    ["Summary", "WhatsApp delivery rate", `${report.summary.deliveryRate}%`],
    ["Summary", "Average resolution hours", report.summary.averageResolutionHours ?? ""],
  ];
  const sections: Array<[string, Array<{ label: string; value: number }>]> = [
    ["Application status", report.applicationsByStatus], ["Application type", report.applicationsByType], ["Ticket status", report.ticketsByStatus], ["Appointment status", report.appointmentsByStatus], ["Appointments by centre", report.appointmentsByCentre], ["Message delivery", report.messagesByDelivery], ["Active centres by district", report.centresByDistrict], ["FAQ views by category (lifetime)", report.faqViewsByCategory],
  ];
  for (const [section, values] of sections) for (const value of values) rows.push([section, value.label, value.value]);
  const csv = [["Section", "Metric", "Value"], ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Response(`\uFEFF${csv}`, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="nira-report-${report.from}-to-${report.to}.csv"`, "cache-control": "no-store" } });
}
