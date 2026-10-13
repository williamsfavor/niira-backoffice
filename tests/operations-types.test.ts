import { describe, expect, it } from "vitest";
import { emptyWeeklyHours, normalizeUgandaPhone, parseStages, parseWeeklyHours, validateWeeklyHours, weeklyHoursSummary } from "@/lib/operations-types";

describe("application stages", () => {
  it("parses stored JSON and marks the current incomplete stage", () => {
    const stages = parseStages('[{"name":"Application received","status":"Complete"},{"name":"Card production","status":"Pending"}]', "Card production");
    expect(stages.map(({ status }) => status)).toEqual(["Complete", "InProgress"]);
  });

  it("falls back to a readable current stage when JSON is malformed", () => {
    expect(parseStages("not-json", "Ready for collection")).toEqual([{ name: "Ready for collection", status: "InProgress" }]);
  });
});

describe("weekly opening hours", () => {
  it("summarizes valid schedules", () => {
    const hours = parseWeeklyHours({ monday: { closed: false, opensAt: "08:00", closesAt: "17:00" } });
    expect(weeklyHoursSummary(hours)).toContain("Mon 08:00–17:00");
  });

  it("rejects overnight or backwards ranges", () => {
    const hours = emptyWeeklyHours();
    hours.monday = { closed: false, opensAt: "18:00", closesAt: "08:00" };
    expect(() => validateWeeklyHours(hours)).toThrow(/Monday needs an opening time earlier/);
  });
});

describe("Uganda phone normalization", () => {
  it.each([["701234567", "+256701234567"], ["0701234567", "+256701234567"], ["+256701234567", "+256701234567"]])("normalizes %s", (input, expected) => {
    expect(normalizeUgandaPhone(input)).toBe(expected);
  });

  it("rejects numbers outside the supported local format", () => {
    expect(() => normalizeUgandaPhone("555-1212")).toThrow(/nine local digits/);
  });
});
