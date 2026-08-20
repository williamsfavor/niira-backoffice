"use client";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return <section className="data-error"><p className="eyebrow">DATA CONNECTION ERROR</p><h2>Supabase data could not be loaded</h2><p>{error.message}</p><button className="button" onClick={reset}>Try again</button></section>;
}
