"use client";

import { Plus } from "lucide-react";

export function DisclosureButton({ target, children }: { target: string; children: React.ReactNode }) {
  function openPanel() {
    const panel = document.getElementById(target);
    if (!(panel instanceof HTMLDetailsElement)) return;
    panel.open = true;
    panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <button className="button" type="button" onClick={openPanel}><Plus size={16} />{children}</button>;
}
