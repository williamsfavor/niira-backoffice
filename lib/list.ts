export type ListParams = { q?: string; page?: string; size?: string; sort?: string; direction?: string };
export type PaginatedResult<T> = { rows: T[]; total: number; page: number; pageSize: number; pageCount: number };
export type ActionResult = { ok: boolean; error?: string; message?: string; warning?: string; fieldErrors?: Record<string, string> };

export function normalizeListParams(params: ListParams, allowedSorts: readonly string[], defaultSort: string) {
  const pageSize = [10, 20, 50].includes(Number(params.size)) ? Number(params.size) : 10;
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const sort = allowedSorts.includes(params.sort || "") ? params.sort! : defaultSort;
  const direction = params.direction === "asc" ? "asc" : "desc";
  const q = (params.q || "").replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100);
  return { q, page, pageSize, sort, direction };
}

export function paginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  return { from, to: from + pageSize - 1 };
}

export async function loadClampedPage<T>(requestedPage: number, pageSize: number, load: (page: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null; count: number | null }>) {
  let response = await load(requestedPage);
  const total = response.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, pageCount);
  if (!response.error && page !== requestedPage) response = await load(page);
  return { ...response, total, page, pageCount };
}

export function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "NA";
}
