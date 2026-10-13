"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import type { ActionResult } from "@/lib/list";
import { useEntityDialogClose } from "./entity-dialog";

export type StatefulAction = (previous: ActionResult, formData: FormData) => Promise<ActionResult>;

export function SubmitButton({ children, pendingLabel = "Saving…", className = "button", disabled = false }: { children: React.ReactNode; pendingLabel?: string; className?: string; disabled?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={className} type="submit" disabled={disabled || pending} aria-busy={pending}>{pending && <LoaderCircle className="button-spinner" size={15} aria-hidden="true" />}{pending ? pendingLabel : children}</button>;
}

export function NavigationSubmitButton({ children, pendingLabel = "Applying…", className = "secondary" }: { children: React.ReactNode; pendingLabel?: string; className?: string }) {
  const [pending, setPending] = useState(false);
  return <button className={className} type="submit" disabled={pending} aria-busy={pending} onClick={(event) => {
    if (event.currentTarget.form?.reportValidity()) setPending(true);
  }}>{pending && <LoaderCircle className="button-spinner" size={15} aria-hidden="true" />}{pending ? pendingLabel : children}</button>;
}

export function ActionForm({ action, children, submitLabel, pendingLabel, className, buttonClassName = "button", buttonWrapClassName, resetOnSuccess = false, hideSubmit = false }: { action: StatefulAction; children: React.ReactNode; submitLabel: string; pendingLabel?: string; className?: string; buttonClassName?: string; buttonWrapClassName?: string; resetOnSuccess?: boolean; hideSubmit?: boolean }) {
  const [state, formAction] = useActionState(action, { ok: false });
  const closeDialog = useEntityDialogClose();
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state.ok) return;
    if (resetOnSuccess) formRef.current?.reset();
    if (closeDialog) { const timeout = window.setTimeout(closeDialog, 650); return () => window.clearTimeout(timeout); }
  }, [closeDialog, resetOnSuccess, state.ok]);
  return <form ref={formRef} action={formAction} className={className}>
    {children}
    {state.error && <p className="form-error" role="alert">{state.error}</p>}
    {state.fieldErrors && <ul className="field-errors" role="alert">{Object.entries(state.fieldErrors).map(([field, message]) => <li key={field}><strong>{readable(field)}:</strong> {message}</li>)}</ul>}
    {state.warning && <p className="form-warning" role="status">{state.warning}</p>}
    {state.ok && state.message && <p className="form-success" role="status">{state.message}</p>}
    {!hideSubmit && <div className={buttonWrapClassName ?? "action-submit"}><SubmitButton className={buttonClassName} pendingLabel={pendingLabel}>{submitLabel}</SubmitButton></div>}
  </form>;
}

function readable(value: string) { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
