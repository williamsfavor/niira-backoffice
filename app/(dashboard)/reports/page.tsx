import Link from "next/link";
import { Columns3, Download, Search, SlidersHorizontal } from "lucide-react";
import { NavigationSubmitButton } from "@/components/action-form";
import { Pagination } from "@/components/pagination";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { getReportPreview, normalizeReportParams, reportFieldLabel, type ReportParams } from "@/lib/report-builder";
import { getCenterFilterOptions, getCenterOptions } from "@/lib/centers";
import { getServiceOptions } from "@/lib/services";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<ReportParams> }) {
  const params = await searchParams;
  const admin = await requireBackofficeAdmin("reports:read");
  const preliminary = normalizeReportParams(params, admin.permissions);
  const needsRelations = preliminary.dataset.key === "appointments" || preliminary.dataset.key === "slots";
  const [result, centers, services, districts] = await Promise.all([
    getReportPreview(params, admin.permissions, admin.role !== "super_admin"),
    needsRelations ? getCenterOptions(false) : Promise.resolve([]),
    needsRelations ? getServiceOptions(false) : Promise.resolve([]),
    preliminary.dataset.key === "centers" ? getCenterFilterOptions() : Promise.resolve([]),
  ]);
  const { normalized } = result;
  const query = new URLSearchParams();
  query.set("dataset", normalized.dataset.key);
  query.set("columns", normalized.columns.join(","));
  for (const key of ["q", "status", "from", "to", "sort", "direction"] as const) {
    const value = normalized[key]; if (value && value !== "all") query.set(key, String(value));
  }
  for (const filter of normalized.dataset.filters ?? []) { const value = normalized.filterValues[filter.key]; if (value) query.set(filter.key, value); }
  const paginationParams = Object.fromEntries(query.entries());

  return <section className="page reports-page">
    <div className="page-title"><div><p className="eyebrow">GUIDED DATA REPORTING</p><h2>Reports</h2><p className="page-copy">Choose an approved dataset and fields, preview the exact filtered rows, then export the same result.</p></div><div className="row-actions"><Link className="secondary" href={`/reports/export?${query}&format=csv`}><Download size={15} /> CSV</Link><Link className="secondary" href={`/reports/export?${query}&format=xlsx`}><Download size={15} /> Excel</Link><Link className="button" href={`/reports/export?${query}&format=pdf`}><Download size={15} /> PDF</Link></div></div>
    <form className="panel report-builder-grid">
      <header className="report-builder-head">
        <div><span className="report-builder-icon"><SlidersHorizontal size={17} /></span><div><h3>Configure report</h3><p>Filters apply to both the preview and every export format.</p></div></div>
        <Link href="/reports">Reset filters</Link>
      </header>
      <div className="report-filter-grid">
        <label className="report-field"><span>Dataset</span><select name="dataset" defaultValue={normalized.dataset.key}>{normalized.available.map((dataset) => <option key={dataset.key} value={dataset.key}>{dataset.label}</option>)}</select></label>
        <label className="report-field report-search-field"><span>Search</span><div><Search size={16} /><input name="q" defaultValue={normalized.q} placeholder="Search this dataset" /></div></label>
        {normalized.dataset.statusField && <label className="report-field"><span>Status</span><select name="status" defaultValue={normalized.status}><option value="all">All statuses</option>{normalized.dataset.statuses?.map((status) => <option key={status}>{status}</option>)}</select></label>}
        {normalized.dataset.filters?.map((filter) => <label className="report-field" key={filter.key}><span>{filter.label}</span>{filter.values ? <select name={filter.key} defaultValue={normalized.filterValues[filter.key]}><option value="">Any</option>{filter.values.map((value) => <option key={value}>{value}</option>)}</select> : filter.key === "center" ? <select name="center" defaultValue={normalized.filterValues.center}><option value="">Any centre</option>{centers.map((center) => <option key={center.id} value={center.id}>{center.name}</option>)}</select> : filter.key === "service" ? <select name="service" defaultValue={normalized.filterValues.service}><option value="">Any service</option>{services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}</select> : filter.key === "district" ? <select name="district" defaultValue={normalized.filterValues.district}><option value="">Any district</option>{districts.map((district) => <option key={district}>{district}</option>)}</select> : <input name={filter.key} defaultValue={normalized.filterValues[filter.key]} placeholder={`Filter by ${filter.label.toLowerCase()}`} />}</label>)}
        <label className="report-field"><span>Sort by</span><select name="sort" defaultValue={normalized.sort}>{normalized.dataset.fields.filter((field) => field.sortable).map((field) => <option key={field.key} value={field.key}>{field.label}</option>)}</select></label>
        <label className="report-field"><span>From date</span><input type="date" name="from" defaultValue={normalized.from} /></label>
        <label className="report-field"><span>To date</span><input type="date" name="to" defaultValue={normalized.to} /></label>
        <label className="report-field"><span>Order</span><select name="direction" defaultValue={normalized.direction}><option value="desc">Newest / highest first</option><option value="asc">Oldest / lowest first</option></select></label>
        <label className="report-field"><span>Rows per page</span><select name="size" defaultValue={String(normalized.pageSize)}><option>10</option><option>20</option><option>50</option><option>100</option></select></label>
      </div>
      <fieldset className="report-column-picker">
        <legend className="sr-only">Report columns</legend>
        <div className="report-column-head"><div><Columns3 size={17} /><div><strong>Choose columns</strong><small>Select the information to include in the preview and export.</small></div></div><span>{normalized.columns.length} selected</span></div>
        <div className="report-column-grid">{normalized.dataset.fields.map((field) => <label key={field.key}><input type="checkbox" name="columns" value={field.key} defaultChecked={normalized.columns.includes(field.key)} /><span>{field.label}</span></label>)}</div>
      </fieldset>
      <footer className="report-builder-actions"><p>Results stay read-only and respect your administrator permissions.</p><NavigationSubmitButton className="button" pendingLabel="Building report…">Build report</NavigationSubmitButton></footer>
    </form>
    <article className="panel data-panel">
      <div className="table-summary"><span>{result.total.toLocaleString("en-UG")} rows</span><small>Page {result.page} of {result.pageCount}</small></div>
      <div className="table-wrap"><table><thead><tr>{normalized.columns.map((column) => <th key={column}>{reportFieldLabel(normalized.dataset.key, column)}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index}>{normalized.columns.map((column) => <td key={column}>{displayValue(row[column])}</td>)}</tr>)}</tbody></table>{!result.rows.length && <div className="empty table-empty"><h3>No report rows</h3><p>Adjust the filters or date range and run the report again.</p></div>}</div>
      <Pagination pathname="/reports" params={paginationParams} page={result.page} pageCount={result.pageCount} pageSize={result.pageSize} total={result.total} />
    </article>
  </section>;
}

function displayValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) return new Intl.DateTimeFormat("en-UG", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Kampala" }).format(new Date(value));
  return String(value);
}
