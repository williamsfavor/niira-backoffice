import { describe, expect, it } from "vitest";
import { loadClampedPage, normalizeListParams, paginationRange } from "@/lib/list";

describe("list parameter normalization", () => {
  it("bounds invalid paging and allows only whitelisted sorting", () => {
    expect(normalizeListParams({ page: "-4", size: "999", sort: "unsafe", direction: "sideways", q: "  Joan   K  " }, ["name"], "name"))
      .toEqual({ q: "Joan K", page: 1, pageSize: 10, sort: "name", direction: "desc" });
  });

  it("calculates an inclusive database range", () => {
    expect(paginationRange(3, 20)).toEqual({ from: 40, to: 59 });
  });

  it("reloads the last valid page when a URL page is out of range", async () => {
    const requested: number[] = [];
    const result = await loadClampedPage(9, 10, async (page) => { requested.push(page); return { data: page === 3 ? ["last"] : [], error: null, count: 25 }; });
    expect(requested).toEqual([9, 3]);
    expect(result).toMatchObject({ data: ["last"], page: 3, pageCount: 3, total: 25 });
  });
});
