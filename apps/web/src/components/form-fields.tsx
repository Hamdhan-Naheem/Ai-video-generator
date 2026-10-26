"use client";

import { useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes, type SelectHTMLAttributes, type ReactNode } from "react";
import { Icon } from "@/components/icons";

type FieldProps = { label: ReactNode; hint?: string; error?: string; className?: string };
function descriptions(id: string, hint?: string, error?: string, extra?: string) {
  return [hint && id + "-hint", error && id + "-error", extra].filter(Boolean).join(" ") || undefined;
}
function Field({ id, label, hint, error, required, count, children, className = "" }: FieldProps & { id: string; required?: boolean; count?: string; children: ReactNode }) {
  return <div className={`form-field ${className}`}>
    <div className="field-heading"><label htmlFor={id}>{label}{required && <span className="required-marker" aria-hidden="true"> *</span>}</label>{count && <span className="field-count" aria-hidden="true">{count}</span>}</div>
    {children}
    {hint && <p className="field-hint" id={id + "-hint"}>{hint}</p>}
    {error && <p className="field-error" id={id + "-error"} role="alert"><Icon name="info" width="14" height="14" />{error}</p>}
  </div>;
}

export function TextField({ label, hint, error, className, id: suppliedId, "aria-describedby": describedBy, ...props }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <Field {...{ id, label, hint, error, className }} required={props.required}>
    <div className="field-control"><input {...props} id={id} className="form-control" aria-invalid={error ? true : undefined} aria-describedby={descriptions(id,hint,error,describedBy)} />{props.readOnly && <Icon name="lock" width="16" height="16" />}</div>
  </Field>;
}

export function TextAreaField({ label, hint, error, className, id: suppliedId, "aria-describedby": describedBy, ...props }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const limitHint = props.maxLength ? [hint, `Maximum ${props.maxLength} characters.`].filter(Boolean).join(" ") : hint;
  return <Field {...{ id, label, error, className }} hint={limitHint} required={props.required} count={props.maxLength && props.value !== undefined ? `${String(props.value ?? props.defaultValue ?? "").length} / ${props.maxLength}` : undefined}>
    <textarea {...props} id={id} className="form-control" aria-invalid={error ? true : undefined} aria-describedby={descriptions(id,limitHint,error,describedBy)} />
  </Field>;
}

export function SelectField({ label, hint, error, className, id: suppliedId, children, "aria-describedby": describedBy, ...props }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <Field {...{ id, label, hint, error, className }} required={props.required}>
    <select {...props} id={id} className="form-control" aria-invalid={error ? true : undefined} aria-describedby={descriptions(id,hint,error,describedBy)}>{children}</select>
  </Field>;
}

export function PasswordField({ label, hint, error, className, id: suppliedId, "aria-describedby": describedBy, ...props }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  const [visible, setVisible] = useState(false);
  return <Field {...{ id, label, hint, error, className }} required={props.required}>
    <div className="field-control password-control"><input {...props} id={id} type={visible ? "text" : "password"} className="form-control" aria-invalid={error ? true : undefined} aria-describedby={descriptions(id,hint,error,describedBy)} />
      <button type="button" className="password-toggle" disabled={props.disabled} aria-controls={id} aria-label={typeof label === "string" ? `${visible ? "Hide" : "Show"} ${label.toLowerCase()}` : `${visible ? "Hide" : "Show"} password`} aria-pressed={visible} onClick={() => setVisible(current => !current)}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg></button>
    </div>
  </Field>;
}

export function CheckboxField({ label, hint, error, className = "", id: suppliedId, "aria-describedby": describedBy, ...props }: FieldProps & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const generatedId = useId();
  const id = suppliedId ?? generatedId;
  return <div className={`form-field checkbox-field ${className}`}><label htmlFor={id}><input {...props} id={id} type="checkbox" aria-invalid={error ? true : undefined} aria-describedby={descriptions(id,hint,error,describedBy)} /><span>{label}{props.required && <span className="required-marker" aria-hidden="true"> *</span>}</span></label>{hint && <p className="field-hint" id={id + "-hint"}>{hint}</p>}{error && <p className="field-error" id={id + "-error"} role="alert">{error}</p>}</div>;
}

export function ChoiceField({ label, hint, error, name, value, options, onChange, required, disabled, compact = false }: FieldProps & { name: string; value: string; options: readonly { value: string; label: string; description?: string }[]; onChange: (value: string) => void; required?: boolean; disabled?: boolean; compact?: boolean }) {
  const id = useId();
  return <fieldset className="form-field choice-field" disabled={disabled} aria-describedby={descriptions(id,hint,error)} aria-invalid={error ? true : undefined}><legend>{label}{required && <span className="required-marker" aria-hidden="true"> *</span>}</legend>{hint && <p className="field-hint" id={id + "-hint"}>{hint}</p>}
    <div className={`choice-options${compact ? " choice-compact" : ""}`}>{options.map(option => <label key={option.value} className="choice-card"><input type="radio" name={name} value={option.value} checked={value === option.value} required={required} aria-describedby={descriptions(id,hint,error)} onChange={() => onChange(option.value)} /><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span></label>)}</div>
    {error && <p className="field-error" id={id + "-error"} role="alert">{error}</p>}
  </fieldset>;
}
