"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { CheckboxField, ChoiceField, PasswordField, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { Button, Modal, Notice, PreviewNote, StatusBadge } from "@/components/ui";

export function ControlPreview() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("beginner");
  const [duration, setDuration] = useState("60");
  const [format, setFormat] = useState("landscape");
  const [permission, setPermission] = useState(false);
  const [touched, setTouched] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "pending" | "error" | "success">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function run(retry = false) {
    if (timer.current) return;
    setTouched(true);
    if (!topic.trim() || !permission) { document.getElementById(!topic.trim() ? "sample-topic" : "sample-permission")?.focus(); return; }
    setState("pending");
    timer.current = setTimeout(() => { timer.current = null; setState(retry ? "success" : "error"); }, 900);
  }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); run(); }
  return <div className="control-preview">
    <Link className="back-link" href="/preview/create">← All video types</Link>
    <div className="page-heading"><div><h1>Shared controls</h1><p>Stitch-based fields, feedback and dialogs for upcoming forms.</p></div></div>
    <Notice>Component preview only. Loading and retry below are simulated locally. Nothing is saved, sent to AI services or generated.</Notice>
    <form noValidate onSubmit={submit} className="control-preview-grid">
      <section className="ui-panel control-preview-panel" aria-labelledby="fields-title"><h2 id="fields-title">Form fields</h2>
        <TextAreaField id="sample-topic" label="What would you like to explain?" required maxLength={300} rows={4} value={topic} placeholder="How do solar panels turn sunlight into electricity?" hint="Be specific about the concept, mechanism, or principle you want taught." error={touched && !topic.trim() ? "Enter a topic to explain." : undefined} onChange={event => setTopic(event.target.value)} />
        <ChoiceField label="Audience" name="sample-audience" required value={audience} onChange={setAudience} hint="Determines vocabulary, pace and explanatory depth." options={[{value:"beginner",label:"Beginner",description:"Clear terms & everyday analogies"},{value:"school",label:"School learner",description:"Structured, step-by-step explanation"},{value:"adult",label:"General adult",description:"Practical examples"}]} />
        <details className="optional-fields"><summary>Optional details</summary><TextField label="Learning objective" maxLength={500} hint="What should the viewer understand by the end?" /><TextAreaField label="Reference notes" rows={3} hint="Paste factual notes you want the explanation to follow." /></details>
        <CheckboxField id="sample-permission" label="I have permission to use any reference material I provide." required checked={permission} onChange={event => setPermission(event.target.checked)} error={touched && !permission ? "Confirm your permission before running this example." : undefined} />
        <div className="control-preview-actions"><Button type="submit" pending={state === "pending"} pendingLabel="Checking example…">Run loading/error example</Button><Button variant="secondary" onClick={() => setOpen(true)}>Open dialog example</Button></div>
        <div className="feedback-slot">{state === "pending" && <p role="status">Running a local example…</p>}{state === "error" && <Notice tone="error" onRetry={() => run(true)}>Simulated request failed. Your inputs are preserved. Try again to preview recovery.</Notice>}{state === "success" && <Notice tone="success">Example recovered. No account, draft or video was created.</Notice>}</div>
      </section>
      <section className="ui-panel control-preview-panel" aria-labelledby="settings-title"><h2 id="settings-title">Video settings</h2>
        <ChoiceField label="Duration" name="sample-duration" compact value={duration} onChange={setDuration} options={[{value:"60",label:"60 sec",description:"Concise"},{value:"75",label:"75 sec",description:"Standard"},{value:"90",label:"90 sec",description:"In-depth"}]} />
        <ChoiceField label="Format & orientation" name="sample-format" compact value={format} onChange={setFormat} options={[{value:"landscape",label:"Landscape",description:"16:9 horizontal"},{value:"portrait",label:"Portrait",description:"9:16 vertical"}]} />
        <SelectField label="Narration voice" defaultValue="kore" hint="Sample option only; voice previews are not connected."><option value="kore">Kore — English</option></SelectField>
        <TextField label="Language" value="English" readOnly hint="English is fixed in this version." />
        <TextField label="Unavailable field" disabled value="Not connected" hint="Disabled example. This control cannot be edited yet." />
        <PasswordField label="Sample password" autoComplete="off" hint="Use sample text only. This field is not connected to an account." />
        <div className="control-preview-actions"><Button disabled>Generate video</Button><Button variant="quiet" onClick={() => setOpen(true)}>Cancel example</Button></div><p className="field-hint">Generation is unavailable in this component preview.</p>
        <div className="control-preview-statuses" aria-label="Example statuses"><StatusBadge>Draft</StatusBadge><StatusBadge tone="success">Ready</StatusBadge><StatusBadge tone="warning">Waiting</StatusBadge><StatusBadge tone="error">Failed</StatusBadge></div>
        <Notice tone="warning">Availability example: processing may wait until the worker is online.</Notice>
      </section>
    </form>
    <PreviewNote>W-02 shared controls. This is a component review page, not the Education creation form.</PreviewNote>
    <Modal open={open} onClose={() => setOpen(false)} title="Discard example inputs?"><p className="dialog-description">Dialog example only. Closing this dialog preserves your inputs.</p><div className="dialog-actions"><Button variant="secondary" data-initial-focus onClick={() => setOpen(false)}>Keep editing</Button><Button variant="danger" onClick={() => { setTopic(""); setPermission(false); setTouched(false); setState("idle"); if (timer.current) clearTimeout(timer.current); timer.current = null; setOpen(false); }}>Discard example inputs</Button></div></Modal>
  </div>;
}
