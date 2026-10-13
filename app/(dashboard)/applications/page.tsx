import { Search } from "lucide-react";
import { NavigationSubmitButton } from "@/components/action-form";
import { ApplicationsTable } from "@/components/data-table";
import { Pagination } from "@/components/pagination";
import { getApplicationFilterOptions, getApplications, type ApplicationParams } from "@/lib/applications";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<ApplicationParams> }) {
  const params = await searchParams;
  const admin = await requireBackofficeAdmin("applications:read");
  const [result, options] = await Promise.all([getApplications(params, admin.role), getApplicationFilterOptions()]);
  const { rows, filters, total, page, pageSize, pageCount } = result;
  return <section className="page">
    <p className="eyebrow">READ-ONLY NIRA RECORDS</p><h2>Application lookup</h2><p className="page-copy">Find citizens across the full application register. Application data remains read-only.</p>
    <form className="table-toolbar">
      <label className="table-search"><Search size={16} /><input name="q" defaultValue={filters.q} placeholder="Application ID, name, or phone" /></label>
      <label>Status<select name="status" defaultValue={filters.status}><option value="all">All statuses</option>{options.statuses.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Type<select name="type" defaultValue={filters.type}><option value="all">All types</option>{options.types.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Stage<select name="stage" defaultValue={filters.stage}><option value="all">All stages</option>{options.stages.map((option) => <option key={option}>{option}</option>)}</select></label>
      <label>Sort<select name="sort" defaultValue={filters.sort}><option value="last_update">Last updated</option><option value="application_id">Application ID</option><option value="status">Status</option><option value="application_type">Type</option></select></label>
      <label>Direction<select name="direction" defaultValue={filters.direction}><option value="desc">Descending</option><option value="asc">Ascending</option></select></label>
      <label>Rows<select name="size" defaultValue={String(pageSize)}><option>10</option><option>20</option><option>50</option></select></label>
      <NavigationSubmitButton>Apply</NavigationSubmitButton>
    </form>
    <article className="panel data-panel"><div className="table-summary"><span>{total.toLocaleString("en-UG")} applications</span><small>Page {page} of {pageCount}</small></div><ApplicationsTable rows={rows} /><Pagination pathname="/applications" params={{ q: filters.q, status: filters.status, type: filters.type, stage: filters.stage, sort: filters.sort, direction: filters.direction, size: String(pageSize) }} page={page} pageCount={pageCount} pageSize={pageSize} total={total} /></article>
  </section>;
}
