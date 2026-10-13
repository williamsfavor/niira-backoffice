"use client";

import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from "@headlessui/react";
import { Plus, X } from "lucide-react";
import { createContext, useContext, useMemo, useState } from "react";

const DialogCloseContext = createContext<(() => void) | null>(null);
export function useEntityDialogClose() { return useContext(DialogCloseContext); }

export function EntityDialog({ title, trigger, children, edit = false }: { title: string; trigger: string; children: React.ReactNode; edit?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useMemo(() => () => setOpen(false), []);
  return <><button type="button" className={edit ? "secondary" : "button"} onClick={() => setOpen(true)}>{!edit && <Plus size={16}/>} {trigger}</button><Dialog open={open} onClose={setOpen} className="entity-dialog"><DialogBackdrop className="entity-dialog-backdrop"/><div className="entity-dialog-wrap"><DialogPanel className="entity-dialog-panel"><header className="entity-dialog-head"><DialogTitle>{title}</DialogTitle><button className="icon-button" type="button" onClick={close} aria-label={`Close ${title}`}><X size={20}/></button></header><DialogCloseContext.Provider value={close}><div className="entity-dialog-body">{children}</div></DialogCloseContext.Provider></DialogPanel></div></Dialog></>;
}
