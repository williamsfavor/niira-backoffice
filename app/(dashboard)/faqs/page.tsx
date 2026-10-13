import Link from "next/link";
import { Search } from "lucide-react";
import { createFaqResult, toggleFaqResult } from "@/app/actions/operations";
import { ActionForm, NavigationSubmitButton } from "@/components/action-form";
import { EntityDialog } from "@/components/entity-dialog";
import { Pagination } from "@/components/pagination";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";
import { Status } from "@/components/ui";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { getFaqOptions, getFaqs, type FaqParams } from "@/lib/faqs";

const categories = ["Status", "Collection", "Requirements", "Timeline", "Troubleshooting"];

function FaqForm({ options }: { options: Awaited<ReturnType<typeof getFaqOptions>> }) {
  return <ActionForm action={createFaqResult} className="form-grid dialog-form-grid" submitLabel="Save FAQ" pendingLabel="Saving FAQ…">
    <label className="full">Question<input name="question" required /></label>
    <label className="full">Answer<textarea name="answer" required /></label>
    <label>Category<select name="category">{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label>Keywords<input name="keywords" placeholder="status, tracking, application" /></label>
    <label>Priority<input name="priority" type="number" min="1" defaultValue="100" /></label>
    <div className="full"><SearchableMultiSelect name="related_faq_ids" options={options} /></div>
    <label className="check"><input name="is_active" type="checkbox" defaultChecked /> Active in WhatsApp search</label>
  </ActionForm>;
}

export default async function FaqsPage({ searchParams }: { searchParams: Promise<FaqParams> }) {
  const params = await searchParams;
  const admin = await requireBackofficeAdmin("faqs:read");
  const [result, options] = await Promise.all([getFaqs(params), getFaqOptions()]);
  const writable = admin.permissions.includes("faqs:write");
  return <section className="page">
    <div className="page-title"><div><p className="eyebrow">SELF-SERVICE CONTENT</p><h2>FAQs & content</h2><p className="page-copy">Search and maintain answers delivered through the WhatsApp FAQ flow.</p></div>{writable && <EntityDialog title="Create WhatsApp FAQ" trigger="New FAQ"><FaqForm options={options} /></EntityDialog>}</div>
    <form className="table-toolbar">
      <label className="table-search"><Search size={16} /><input name="q" defaultValue={result.filters.q} placeholder="Question, answer, or keyword" /></label>
      <label>Category<select name="category" defaultValue={result.filters.category}><option value="all">All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>Status<select name="status" defaultValue={result.filters.status}><option value="all">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
      <label>Sort<select name="sort" defaultValue={result.filters.sort}><option value="priority">Priority</option><option value="view_count">Views</option><option value="updated_at">Updated</option><option value="question">Question</option></select></label>
      <label>Direction<select name="direction" defaultValue={result.filters.direction}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      <label>Rows<select name="size" defaultValue={String(result.pageSize)}><option>10</option><option>20</option><option>50</option></select></label>
      <NavigationSubmitButton>Apply</NavigationSubmitButton>
    </form>
    <article className="panel data-panel">
      <div className="table-summary"><span>{result.total} FAQs</span><small>Page {result.page} of {result.pageCount}</small></div>
      <div className="table-wrap"><table><thead><tr><th>Question</th><th>Category</th><th>Priority</th><th>Views</th><th>Related</th><th>Status</th><th>Actions</th></tr></thead><tbody>{result.rows.map((faq) => <tr key={faq.id}><td><Link href={`/faqs/${faq.id}`}><strong>{faq.question}</strong></Link><p className="answer-preview">{faq.answer}</p></td><td>{faq.category}</td><td>{faq.priority}</td><td>{faq.view_count}</td><td>{faq.related_faq_ids.length}</td><td><Status value={faq.is_active ? "Active" : "Inactive"} /></td><td>{writable && <ActionForm action={toggleFaqResult} submitLabel={faq.is_active ? "Deactivate" : "Activate"} pendingLabel="Updating…" buttonClassName="secondary"><input type="hidden" name="id" value={faq.id} /><input type="hidden" name="is_active" value={String(!faq.is_active)} /></ActionForm>}</td></tr>)}</tbody></table></div>
      <Pagination pathname="/faqs" params={{ q: result.filters.q, category: result.filters.category, status: result.filters.status, sort: result.filters.sort, direction: result.filters.direction, size: String(result.pageSize) }} page={result.page} pageCount={result.pageCount} pageSize={result.pageSize} total={result.total} />
    </article>
  </section>;
}
