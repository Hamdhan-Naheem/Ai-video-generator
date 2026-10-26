"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import { Icon } from "@/components/icons";

export function Button({ variant = "primary", className = "", pending = false, pendingLabel = "Working…", disabled, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "quiet"; pending?: boolean; pendingLabel?: string }) {
  return <button type="button" {...props} disabled={disabled || pending} aria-busy={pending || undefined} className={`button button-${variant} ${className}`}>{pending ? <><span className="ui-spinner" aria-hidden="true" />{pendingLabel}</> : children}</button>;
}

export function Notice({ children, error = false, tone = error ? "error" : "info", onRetry, retrying = false }: { children: ReactNode; error?: boolean; tone?: "info" | "success" | "warning" | "error"; onRetry?: () => void; retrying?: boolean }) {
  return <div className={`ui-notice ui-${tone}`}><div className="notice-message" role={tone === "error" ? "alert" : "status"}><Icon name={tone === "success" ? "check" : "info"} width="16" height="16" /><span>{children}</span></div>{onRetry && <Button variant="secondary" onClick={onRetry} pending={retrying} pendingLabel="Retrying…">Try again</Button>}</div>;
}

export function StatusBadge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "success" | "warning" | "error" }) {
  return <span className={`ui-status ui-status-${tone}`}><Icon name={tone === "success" ? "check" : tone === "neutral" ? "clock" : "info"} width="14" height="14" />{children}</span>;
}

export function PreviewNote({ children }: { children: ReactNode }) {
  return <p className="page-preview-note">Design preview · {children}</p>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLElement>("[data-initial-focus]")?.focus();
    } else if (!open && dialog.open) dialog.close();
  }, [open]);
  function trapTab(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const controls = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')].filter(element => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }
  return <dialog ref={ref} className="ui-dialog" aria-labelledby={titleId} onClose={onClose} onKeyDown={trapTab}>
    <div className="dialog-heading"><h2 id={titleId}>{title}</h2><button type="button" className="icon-button" aria-label="Close dialog" onClick={onClose}><Icon name="close" /></button></div>
    {children}
  </dialog>;
}
