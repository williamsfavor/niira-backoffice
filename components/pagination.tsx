import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export function Pagination({ pathname, params, page, pageCount, pageSize, total }: { pathname: string; params: Record<string, string | undefined>; page: number; pageCount: number; pageSize: number; total: number }) {
  const href = (nextPage: number) => { const query = new URLSearchParams(); for (const [key, value] of Object.entries(params)) if (value && value !== "all") query.set(key, value); query.set("page", String(nextPage)); return `${pathname}?${query}`; };
  const disabled = (value: boolean) => value ? "disabled" : "";
  return <footer className="table-pagination"><span>Showing {total ? (page - 1) * pageSize + 1 : 0}–{Math.min(page * pageSize, total)} of {total}</span><div><Link className={disabled(page <= 1)} aria-disabled={page <= 1} aria-label="First page" href={href(1)}><ChevronsLeft size={16}/></Link><Link className={disabled(page <= 1)} aria-disabled={page <= 1} aria-label="Previous page" href={href(Math.max(1, page - 1))}><ChevronLeft size={16}/></Link><span>{page} / {pageCount}</span><Link className={disabled(page >= pageCount)} aria-disabled={page >= pageCount} aria-label="Next page" href={href(Math.min(pageCount, page + 1))}><ChevronRight size={16}/></Link><Link className={disabled(page >= pageCount)} aria-disabled={page >= pageCount} aria-label="Last page" href={href(pageCount)}><ChevronsRight size={16}/></Link></div></footer>;
}
