import { Search } from "lucide-react";
import { ApplicationsTable } from "@/components/data-table";
import { getDashboardData } from "@/lib/supabase";

export default async function ApplicationsPage() { const data = await getDashboardData(); return <section className="page"><p className="eyebrow">READ-ONLY NIRA RECORDS</p><h2>Application lookup</h2><p className="page-copy">Find a citizen’s application by their 16-digit reference or phone number. Status data is visible here but is never edited from the back office.</p><div className="search"><Search size={18}/><input placeholder="Search application ID or phone number"/><button>Search</button></div><article className="panel"><div className="panel-head"><h2>Recent application records</h2><span className="read-only">Read only</span></div><ApplicationsTable rows={data.applications}/></article></section>; }
