import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Permission } from "@/lib/permissions";

vi.mock("server-only", () => ({}));

let normalizeReportParams: typeof import("@/lib/report-builder").normalizeReportParams;
let reportFilterSummary: typeof import("@/lib/report-builder").reportFilterSummary;

beforeAll(async () => {
  ({ normalizeReportParams, reportFilterSummary } = await import("@/lib/report-builder"));
});

const permissions: Permission[] = ["applications:read", "centers:read", "appointments:read"];

describe("report contracts", () => {
  it("does not select a dataset that the administrator cannot read", () => {
    const normalized = normalizeReportParams({ dataset: "audit_logs" }, permissions);
    expect(normalized.dataset.key).toBe("applications");
    expect(normalized.available.map((dataset) => dataset.key)).toEqual(["applications", "appointments", "slots", "centers"]);
  });

  it("whitelists columns, statuses, sorting, and dataset-specific filters", () => {
    const normalized = normalizeReportParams({
      dataset: "applications",
      columns: ["application_id", "password", "application_id"],
      status: "DROP TABLE applications",
      sort: "password",
      type: "Unexpected type",
      stage: "Card Production",
    }, permissions);
    expect(normalized.columns).toEqual(["application_id"]);
    expect(normalized.status).toBe("all");
    expect(normalized.sort).toBe("last_update");
    expect(normalized.filterValues).toEqual({ type: "", stage: "Card Production" });
  });

  it("rejects malformed UUID filters and normalizes inverted valid dates", () => {
    const normalized = normalizeReportParams({ dataset: "appointments", center: "not-a-uuid", service: "a8f66820-38ad-4e3b-aef1-4fc8904f9154", from: "2026-10-20", to: "2026-10-01" }, permissions);
    expect(normalized.filterValues).toMatchObject({ center: "", service: "a8f66820-38ad-4e3b-aef1-4fc8904f9154" });
    expect([normalized.from, normalized.to]).toEqual(["2026-10-01", "2026-10-20"]);
  });

  it("includes dataset filters in the export summary", () => {
    const normalized = normalizeReportParams({ dataset: "centers", district: "Kampala" }, permissions);
    expect(reportFilterSummary(normalized)).toContain("district=Kampala");
  });
});
