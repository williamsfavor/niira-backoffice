import Link from "next/link";
import { notFound } from "next/navigation";
import { toggleFaqResult, updateFaqResult } from "@/app/actions/operations";
import { ActionForm } from "@/components/action-form";
import { EntityDialog } from "@/components/entity-dialog";
import { SearchableMultiSelect } from "@/components/searchable-multi-select";
import { Status } from "@/components/ui";
import { requireBackofficeAdmin } from "@/lib/backoffice-auth";
import { getFaqDetail, getFaqOptions } from "@/lib/faqs";

const categories = ["Status", "Collection", "Requirements", "Timeline", "Troubleshooting"];

export default async function FaqDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = await requireBackofficeAdmin("faqs:read");
  const [faq, options] = await Promise.all([getFaqDetail(id), getFaqOptions(id)]);
  if (!faq) notFound();
  const writable = admin.permissions.includes("faqs:write");
  return <section className="page detail">
    <Link className="back-link" href="/faqs">← Back to FAQs</Link>
    <div className="detail-title"><div><p className="eyebrow">{faq.category}</p><h2>{faq.question}</h2></div><div className="row-actions"><Status value={faq.is_active ? "Active" : "Inactive"} />
      {writable && <EntityDialog edit title="Edit FAQ" trigger="Edit"><ActionForm action={updateFaqResult} className="form-grid dialog-form-grid" submitLabel="Save changes" pendingLabel="Saving FAQ…"><input type="hidden" name="id" value={faq.id} /><label className="full">Question<input name="question" defaultValue={faq.question} required /></label><label className="full">Answer<textarea name="answer" defaultValue={faq.answer} required /></label><label>Category<select name="category" defaultValue={faq.category}>{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label>Keywords<input name="keywords" defaultValue={faq.keywords.join(", ")} /></label><label>Priority<input name="priority" type="number" min="1" defaultValue={faq.priority} /></label><div className="full"><SearchableMultiSelect name="related_faq_ids" options={options} selected={faq.related_faq_ids} /></div><label className="check"><input name="is_active" type="checkbox" defaultChecked={faq.is_active} /> Active</label></ActionForm></EntityDialog>}
      {writable && <ActionForm action={toggleFaqResult} submitLabel={faq.is_active ? "Deactivate" : "Activate"} pendingLabel="Updating…" buttonClassName="secondary"><input type="hidden" name="id" value={faq.id} /><input type="hidden" name="is_active" value={String(!faq.is_active)} /></ActionForm>}
    </div></div>
    <article className="panel faq-answer"><p>{faq.answer}</p><dl><div><dt>Keywords</dt><dd>{faq.keywords.join(", ") || "—"}</dd></div><div><dt>Priority</dt><dd>{faq.priority}</dd></div><div><dt>Views</dt><dd>{faq.view_count}</dd></div></dl></article>
    <section className="related-faqs"><div className="panel-head"><div><p className="eyebrow">RELATED CONTENT</p><h2>Related FAQs</h2></div></div>{faq.related.length ? <div className="related-grid">{faq.related.map((item: { id: string; question: string; category: string; is_active: boolean }) => <Link href={`/faqs/${item.id}`} key={item.id}><small>{item.category}</small><strong>{item.question}</strong><Status value={item.is_active ? "Active" : "Inactive"} /></Link>)}</div> : <p className="muted">No related FAQs have been selected.</p>}</section>
  </section>;
}
