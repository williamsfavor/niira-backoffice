"use client";

import { useTransition } from "react";
import { LoaderCircle } from "lucide-react";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  const [pending, startTransition] = useTransition();
  return <section className="data-error"><p className="eyebrow">DATA CONNECTION ERROR</p><h2>Supabase data could not be loaded</h2><p>{error.message}</p><button className="button" disabled={pending} aria-busy={pending} onClick={() => startTransition(reset)}>{pending && <LoaderCircle className="button-spinner" size={15} aria-hidden="true"/>}{pending ? "Trying again…" : "Try again"}</button></section>;
}
