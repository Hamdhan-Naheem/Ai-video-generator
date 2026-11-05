"use client";

import { DURATIONS, type CapabilitiesDto, type VoicesDto } from "@contracts";
import {VoiceSample} from "@/components/voice-sample";
import { ChoiceField, SelectField } from "@/components/form-fields";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui";

export function VideoSettings({ prefix, duration, onDurationChange, orientation, onOrientationChange, catalog, voice="Kore", onVoiceChange }: {
  catalog?:{capabilities:CapabilitiesDto;voices:VoicesDto};
  voice?:string;onVoiceChange?:(value:string)=>void;
  prefix: string;
  duration: string;
  onDurationChange: (value: string) => void;
  orientation: string;
  onOrientationChange: (value: string) => void;
}) {
  const titleId = prefix + "-settings-title";
  const playbackHintId = prefix + "-playback-hint";
  return <section className="education-settings ui-panel" aria-labelledby={titleId}>
    <div className="education-panel-heading"><h2 id={titleId}>Video settings</h2><span>720p · 30 fps</span></div>
    <ChoiceField label="Duration" name="targetSeconds" compact value={duration} onChange={onDurationChange} options={(catalog?.capabilities.durations??DURATIONS).map(seconds => ({ value: String(seconds), label: `${seconds} sec`, description: seconds === 60 ? "Concise" : seconds === 75 ? "Standard" : "In-depth" }))} />
    <div className="education-orientation"><ChoiceField label="Format & orientation" name="orientation" compact value={orientation} onChange={onOrientationChange} options={[
      { value: "landscape", label: "Landscape", description: "16:9 horizontal" }, { value: "portrait", label: "Portrait", description: "9:16 vertical" },
    ].filter(option=>!catalog || catalog.capabilities.orientations.includes(option.value as "landscape"|"portrait"))} /></div>
    {catalog ? <><SelectField id={prefix+"-voice"} name="voiceProfileId" label="Narration voice" value={voice} onChange={event=>onVoiceChange?.(event.target.value)} hint={catalog.voices.items.find(item=>item.id===voice)?.description}>{!catalog.voices.items.some(item=>item.id===voice)&&<option value={voice} disabled>Previously saved voice (unavailable)</option>}{catalog.voices.items.map(item=><option key={item.id} value={item.id} disabled={!item.available}>{item.label} — English</option>)}</SelectField><VoiceSample hintId={playbackHintId} url={catalog.voices.items.find(item=>item.id===voice&&item.available)?.previewUrl??null}/></> : <><SelectField id={prefix+"-voice"} name="voiceProfileId" label="Narration voice" defaultValue="kore" hint="Kore is the primary English voice. An eligible fallback may use a different voice; results will identify the voice used."><option value="kore">Kore — English</option></SelectField><div className="education-voice-preview"><span><Icon name="play-circle" width="18" height="18"/>Voice sample</span><Button variant="secondary" disabled aria-describedby={playbackHintId}>Preview voice</Button></div><p className="field-hint" id={playbackHintId}>Voice playback is not connected in this preview.</p></>}
    <div className="education-language"><span>Language</span><span><Icon name="lock" width="13" height="13" />English (Fixed)</span></div>
  </section>;
}
