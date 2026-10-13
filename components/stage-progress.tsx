import { Check, Clock3, Circle, X } from "lucide-react";
import type { ApplicationStage } from "@/lib/operations-types";

export function StageProgress({ stages }: { stages: ApplicationStage[] }) {
  const complete = stages.filter((stage) => stage.status === "Complete").length;
  const percentage = stages.length ? Math.round((complete / stages.length) * 100) : 0;
  return <section className="stage-progress" aria-labelledby="stage-progress-title"><div className="stage-progress-head"><div><p className="eyebrow">APPLICATION PROGRESS</p><h3 id="stage-progress-title">{complete} of {stages.length} stages complete</h3></div><strong>{percentage}%</strong></div><progress max="100" value={percentage} aria-label={`${percentage}% complete`}/><ol>{stages.map((stage, index) => { const Icon = stage.status === "Complete" ? Check : stage.status === "Rejected" ? X : stage.status === "InProgress" ? Clock3 : Circle; const state = stage.status === "InProgress" ? "current" : stage.status.toLowerCase(); return <li className={state} key={`${stage.name}-${index}`}><span className="stage-marker"><Icon size={16}/></span><div className="stage-copy"><strong>{stage.name}</strong><small>{stage.status === "InProgress" ? "Current stage" : stage.status}</small>{stage.description && <p>{stage.description}</p>}</div></li>; })}</ol></section>;
}
