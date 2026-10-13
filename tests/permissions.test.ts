import { describe, expect, it } from "vitest";
import { can } from "@/lib/permissions";

describe("role permissions", () => {
  it("keeps content editors out of settings mutations", () => {
    expect(can("content_editor", "faqs:write")).toBe(true);
    expect(can("content_editor", "settings:write")).toBe(false);
  });

  it("allows support agents to manage ticket workflow but not applications", () => {
    expect(can("support_agent", "tickets:write")).toBe(true);
    expect(can("support_agent", "applications:read")).toBe(true);
    expect(can("support_agent", "centers:write")).toBe(false);
  });
});
