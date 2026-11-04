"use client";

import { LIMITS, TopicSchema, IntendedUseSchema } from "@contracts";
import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckboxField, ChoiceField, SelectField, TextAreaField, TextField } from "@/components/form-fields";
import { Icon } from "@/components/icons";
import { VideoSettings } from "@/components/video-settings";
import { Button, PreviewNote } from "@/components/ui";

export function EducationForm() {
  const [topic, setTopic] = useState("");
  const [audience, setAudience] = useState("beginner");
  const [intendedUse, setIntendedUse] = useState("");
  const [objective, setObjective] = useState("");
  const [notes, setNotes] = useState("");
  const [duration, setDuration] = useState("60");
  const [orientation, setOrientation] = useState("landscape");
  const [rights, setRights] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const touch = (field: string) => setTouched(current => ({ ...current, [field]: true }));
  const topicError = touched.topic && !TopicSchema.safeParse(topic).success ? "Enter a topic you want to explain." : undefined;
  const useError = touched.intendedUse && !IntendedUseSchema.safeParse(intendedUse).success ? "Choose how you intend to use this video." : undefined;
  const rightsError = touched.rights && !rights ? "Confirm you have permission to use your reference material." : undefined;
  const processingError = touched.processing && !processing ? "Acknowledge external AI processing before generating." : undefined;

  function preventSubmission(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched({ topic: true, intendedUse: true, rights: true, processing: true });
  }

  return <div className="education-page">
    <Link className="back-link" href="/preview/create"><Icon name="arrow-left" width="17" height="17" />All video types</Link>
    <section className="education-intro ui-panel" aria-labelledby="education-title">
      <div><span className="education-mode"><Icon name="layers" width="14" height="14" />Education mode</span><h1 id="education-title">Create an education video</h1><p>Choose a topic. AI turns it into a clear, narrated explanation.</p></div>
      <div className="education-art"><Image src="/illustrations/education-intro.svg" width={220} height={100} alt="" priority /></div>
    </section>
    <p className="education-preview-label">Form preview · Inputs stay on this page only. Leaving or refreshing clears them.</p>

    <form className="education-workspace" onSubmit={preventSubmission} noValidate aria-label="Education video details">
      <div className="education-source ui-panel">
        <section className="education-section education-topic" aria-label="Topic">
          <TextAreaField id="education-topic" name="topic" label="What would you like to explain?" required maxLength={LIMITS.topic} rows={4} value={topic} onChange={event => setTopic(event.target.value)} onBlur={() => touch("topic")} error={topicError} placeholder="How do solar panels turn sunlight into electricity?" hint="Be specific about the concept, mechanism, or principle you want taught." />
        </section>
        <section className="education-section education-audience" aria-label="Audience selection">
          <ChoiceField label="Audience" name="audience" required value={audience} onChange={setAudience} hint="Determines vocabulary, pace and explanatory depth." options={[
            { value: "beginner", label: "Beginner", description: "Clear terms & everyday analogies" },
            { value: "school", label: "School learner", description: "Structured, step-by-step explanation" },
            { value: "adult", label: "General adult", description: "Practical examples with clear explanations" },
          ]} />
        </section>
        <section className="education-section education-use" aria-label="Intended use selection">
          <SelectField id="education-use" name="intendedUse" label="Intended use" required value={intendedUse} onChange={event => setIntendedUse(event.target.value)} onBlur={() => touch("intendedUse")} error={useError} hint="Helps determine which narration services are eligible. It does not guarantee licensing suitability.">
            <option value="">Choose intended use</option><option value="personal-learning">Personal learning</option><option value="promotional">Promotional</option>
          </SelectField>
        </section>
        <details className="education-section education-optional">
          <summary><span>Optional details<small>Learning objective &amp; reference notes</small></span></summary>
          <div className="education-optional-fields">
            <TextField id="education-objective" name="learningObjective" label="Learning objective" maxLength={LIMITS.objective} value={objective} onChange={event => setObjective(event.target.value)} placeholder="Understand how sunlight is converted into electricity." hint="What should the viewer understand by the end? Maximum 500 characters." />
            <TextAreaField id="education-notes" name="referenceNotes" label="Reference notes" maxLength={LIMITS.notes} rows={5} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Paste factual definitions, formulas or specific sequence requirements…" hint="Paste factual notes you want the explanation to follow." />
          </div>
        </details>
      </div>

      <aside className="education-settings-column" aria-label="Video settings and automatic features">
        <VideoSettings prefix="education" duration={duration} onDurationChange={setDuration} orientation={orientation} onOrientationChange={setOrientation} />
        <section className="education-automatic ui-panel" aria-labelledby="automatic-title"><h2 id="automatic-title"><Icon name="layers" width="18" height="18" />Automatic generation</h2><p>Includes AI narration, automatic captions, illustrated scenes and a cartoon teacher synced with your topic.</p><ul>{["2D cartoon teacher", "Synchronized captions", "Illustrated scenes"].map(feature => <li key={feature}><Icon name="check" width="13" height="13" />{feature}</li>)}</ul></section>
      </aside>

        <section className="education-section education-acknowledgments" aria-label="Permissions and processing">
          <CheckboxField id="education-rights" name="rightsAcknowledged" label="I have permission to use any reference material I provide." required checked={rights} onChange={event => setRights(event.target.checked)} onBlur={() => touch("rights")} error={rightsError} />
          <CheckboxField id="education-processing" name="processingAcknowledged" label="I understand my inputs are processed by external AI services." required checked={processing} onChange={event => setProcessing(event.target.checked)} onBlur={() => touch("processing")} error={processingError} />
          <p className="education-retention"><Icon name="clock" width="16" height="16" />Generated media is kept for 7 days.</p>
        </section>
        <div className="education-actions">
          <div className="education-action-buttons"><Button variant="secondary" disabled aria-describedby="education-action-hint">Save draft</Button><Button type="submit" disabled aria-describedby="education-action-hint">Generate video<Icon name="arrow-right" width="18" height="18" /></Button></div>
          <p id="education-action-hint" className="field-hint">Draft saving and generation are not connected in this preview, even when all required fields are filled.</p>
        </div>
    </form>
    <PreviewNote>Education form UI only. No account, saved draft, upload or generation service is connected.</PreviewNote>
  </div>;
}
