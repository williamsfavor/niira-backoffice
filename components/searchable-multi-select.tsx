"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";

type Option = { id: string; question: string; category?: string };

export function SearchableMultiSelect({ name, options, selected = [] }: { name: string; options: Option[]; selected?: string[] }) {
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? options.filter((option) => `${option.question} ${option.category || ""}`.toLowerCase().includes(needle)) : options;
  }, [options, query]);
  return <fieldset className="searchable-multi-select"><legend>Related FAQs</legend><label className="table-search"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search related FAQs" /></label><div>{visible.map((option) => <label key={option.id}><input type="checkbox" name={name} value={option.id} defaultChecked={selected.includes(option.id)} /><span><strong>{option.question}</strong>{option.category && <small>{option.category}</small>}</span></label>)}{!visible.length && <p className="muted">No matching FAQs.</p>}</div></fieldset>;
}
