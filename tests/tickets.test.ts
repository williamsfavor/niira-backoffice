import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("ticket search contract", () => {
  it("normalizes filter values and searches reference, phone, and issue text", async () => {
    const { normalizeTicketParams, ticketSearchExpression } = await import("@/lib/tickets");
    const normalized = normalizeTicketParams({ q: "  TKT-100,broken()  ", status: "invalid", assignment: "unassigned", overdue: "true" });
    expect(normalized).toMatchObject({ q: "TKT-100 broken", status: "all", assignment: "unassigned", overdue: "true" });
    expect(ticketSearchExpression(normalized.q)).toBe("ticket_id.ilike.%TKT-100 broken%,phone_number.ilike.%TKT-100 broken%,issue_text.ilike.%TKT-100 broken%");
  });
});
