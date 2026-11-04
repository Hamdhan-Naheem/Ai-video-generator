"use client";

import { LIMITS, NameSchema, RequiredBriefSchema, IntendedUseSchema, SoftwareTextSchema, countCharacters } from "@contracts";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckboxField, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { VideoSettings } from "@/components/video-settings";
import { Icon } from "@/components/icons";
import { Button, PreviewNote } from "@/components/ui";

export function SoftwareForm() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState("");
  const [intendedUse, setIntendedUse] = useState("");
  const [duration, setDuration] = useState("60");
  const [orientation, setOrientation] = useState("landscape");
  const [rights, setRights] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [dropMessage, setDropMessage] = useState("");
  const touch = (field: string) => setTouched(current => ({ ...current, [field]: true }));
  const textCount = countCharacters(description) + countCharacters(features);
  const budgetError = !SoftwareTextSchema.safeParse({ brief: description, featureHighlights: features }).success ? "Description and features must total 4,000 characters or fewer." : undefined;
  function preventSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ name: true, description: true, intendedUse: true, rights: true, processing: true });
  }
  return <div className="software-page education-page">
    <Link className="back-link" href="/preview/create"><Icon name="arrow-left" width="17" height="17" />All video types</Link>
    <section className="software-intro" aria-labelledby="software-title"><div><span className="education-mode"><Icon name="layout" width="14" height="14" />Software showcase</span><h1 id="software-title">Create a software showcase</h1><p>Add your software details and visuals. We’ll turn them into a narrated walkthrough.</p></div><Image src="/illustrations/select-software.svg" width={200} height={120} alt="" /></section>
    <p className="education-preview-label">Form preview · Inputs stay on this page only. Leaving or refreshing clears them.</p>
    <form className="education-workspace software-workspace" onSubmit={preventSubmission} noValidate aria-label="Software showcase details">
      <div className="education-source ui-panel software-source">
        <section className="education-section software-details" aria-label="Software details">
          <TextField id="software-name" name="softwareName" label="Software name" required maxLength={LIMITS.name} value={name} onChange={event => setName(event.target.value)} onBlur={() => touch("name")} error={touched.name && !NameSchema.safeParse(name).success ? "Enter your software name." : undefined} placeholder="e.g. Acme Studio" hint="Maximum 120 characters." />
          <TextAreaField id="software-description" name="brief" label="What does your software do?" required maxLength={LIMITS.brief} rows={4} value={description} onChange={event => setDescription(event.target.value)} onBlur={() => touch("description")} error={touched.description && !RequiredBriefSchema.safeParse(description).success ? "Describe what your software does and who it helps." : undefined} hint="Describe its purpose and who it helps." aria-describedby="software-text-budget" placeholder="Explain the problem your software solves and its main workflow." />
          <TextAreaField id="software-features" name="featureHighlights" label="Features to highlight" maxLength={LIMITS.brief} rows={4} value={features} onChange={event => setFeatures(event.target.value)} error={budgetError} hint="Optional. Include only claims supported by your details and visuals." aria-describedby="software-text-budget" placeholder="Describe the features or workflow you want to demonstrate…" />
          <p id="software-text-budget" className="software-budget">{textCount.toLocaleString("en-US")} / 4,000 characters shared between description and features.</p>
          <SelectField id="software-use" name="intendedUse" label="Intended use" required value={intendedUse} onChange={event => setIntendedUse(event.target.value)} onBlur={() => touch("intendedUse")} error={touched.intendedUse && !IntendedUseSchema.safeParse(intendedUse).success ? "Choose how you intend to use this video." : undefined} hint="Helps determine which narration services are eligible. It does not guarantee licensing suitability."><option value="">Choose intended use</option><option value="personal-learning">Personal learning</option><option value="promotional">Promotional</option></SelectField>
        </section>
        <section className="education-section software-media" aria-labelledby="software-media-title">
          <h2 id="software-media-title">Screenshots or screen recordings <span className="required-marker" aria-hidden="true">*</span></h2>
          <p className="software-media-description">At least one screenshot or supported recording is required. Three or four screenshots are recommended.</p>
          <p className="software-privacy"><Icon name="lock" width="16" height="16" /><span>Remove passwords, private information and personal data before uploading. In the connected application, files will be uploaded privately; external AI analysis starts only after you acknowledge processing and choose Generate.</span></p>
          <ul className="software-file-limits" aria-label="File requirements"><li>JPEG, PNG or WebP: up to 8 screenshots, 5 MB each.</li><li>MP4 (H.264, optional AAC): one recording, up to 45 MB and 120 seconds.</li><li>60 MB combined upload limit. Recording audio will be muted.</li></ul>
          <div className="software-upload-zone" onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); setDropMessage("No file was opened or uploaded. File selection and uploading are not connected in this preview."); }}>
            <span className="software-upload-icon"><Icon name="plus-circle" width="26" height="26" /></span><h3>Add screenshots or screen recordings</h3><p id="software-upload-unavailable">File selection, drag and drop, and uploading are not connected in this preview.</p><Button variant="secondary" disabled aria-describedby="software-upload-unavailable">Choose files</Button>
          </div>
          <p className="software-upload-status" role="status">{dropMessage || "No files added. No files are read or sent from this preview."}</p>
        </section>
      </div>
      <aside className="education-settings-column" aria-label="Video settings and automatic features">
        <VideoSettings prefix="software" duration={duration} onDurationChange={setDuration} orientation={orientation} onOrientationChange={setOrientation} />
        <section className="education-automatic ui-panel" aria-labelledby="software-automatic-title"><h2 id="software-automatic-title"><Icon name="layers" width="18" height="18" />Automatic generation</h2><p>Includes AI narration, automatic captions and scenes based on your supplied software visuals.</p><p>Recordings can demonstrate actions. Still screenshots won’t be presented as live interactions.</p></section>
      </aside>
      <section className="education-section education-acknowledgments" aria-label="Permissions and processing">
        <CheckboxField id="software-rights" name="rightsAcknowledged" label="I have permission to use any reference material I provide." required checked={rights} onChange={event => setRights(event.target.checked)} onBlur={() => touch("rights")} error={touched.rights && !rights ? "Confirm you have permission to use your reference material." : undefined} />
        <CheckboxField id="software-processing" name="processingAcknowledged" label="I understand my inputs are processed by external AI services." required checked={processing} onChange={event => setProcessing(event.target.checked)} onBlur={() => touch("processing")} error={touched.processing && !processing ? "Acknowledge external AI processing before generating." : undefined} />
        <p className="education-retention"><Icon name="clock" width="16" height="16" />Generated media is kept for 7 days.</p>
      </section>
      <div className="education-actions"><div className="education-action-buttons"><Button variant="secondary" disabled aria-describedby="software-action-hint">Save draft</Button><Button type="submit" disabled aria-describedby="software-action-hint">Generate video<Icon name="arrow-right" width="18" height="18" /></Button></div><p className="field-hint" id="software-action-hint">Uploads, draft saving and generation are not connected in this preview, even when text fields are valid.</p></div>
    </form>
    <PreviewNote>Software form UI only. No account, stored files, saved draft or generation service is connected.</PreviewNote>
  </div>;
}
