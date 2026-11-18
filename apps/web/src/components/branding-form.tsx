"use client";

import Image from "next/image";
import Link from "next/link";
import {useState} from "react";
import {LIMITS,NameSchema,IntendedUseSchema,countCharacters,DraftInputSchema} from "@contracts";
import {CatalogSettings} from "@/components/catalog-settings";
import {VideoSettings} from "@/components/video-settings";
import {SourceUploads} from "@/components/source-uploads";
import {CheckboxField,SelectField,TextAreaField,TextField} from "@/components/form-fields";
import {Button,Notice,PreviewNote} from "@/components/ui";
import {Icon} from "@/components/icons";
import type {DraftFormBinding} from "@/components/draft-form";

export function BrandingForm({draft}:{draft?:DraftFormBinding}={}){
 const saved=draft?.input.mode==="branding"?draft.input:undefined;
 const [name,setName]=useState(saved?.productName??""),[description,setDescription]=useState(saved?.brief??""),[benefits,setBenefits]=useState((saved?.benefits??[]).join("\n")),[brand,setBrand]=useState(saved?.brandDetails??"");
 const [intendedUse,setIntendedUse]=useState<string>(saved?.intendedUse??"");
 const [duration,setDuration]=useState(String(draft?.preferences.targetSeconds??60)),[orientation,setOrientation]=useState<string>(draft?.preferences.orientation??"landscape"),[voice,setVoice]=useState(draft?.preferences.voiceProfileId??"Kore");
 const [rights,setRights]=useState(false),[processing,setProcessing]=useState(false),[touched,setTouched]=useState<Record<string,boolean>>({}),[dropMessage,setDropMessage]=useState("");
 const lines=benefits===""?[]:benefits.split("\n");
 const benefitError=lines.length>LIMITS.benefits || lines.some(line=>countCharacters(line)>LIMITS.benefit)?"Use up to 8 benefit lines, with 200 characters or fewer per line.":undefined;
 const total=[description,brand,...lines,saved?.callToAction??"",saved?.intendedAudience??""].reduce((sum,value)=>sum+countCharacters(value),0);
 const budgetError=total>LIMITS.brief?"Product description, benefits and brand details must total 4,000 characters or fewer.":undefined;
 const touch=(key:string)=>setTouched(current=>({...current,[key]:true}));
 const input={...saved,mode:"branding" as const,productName:name,brief:description,benefits:lines,brandDetails:brand,intendedUse:intendedUse||undefined,sources:saved?.sources??[]};
 function save(){if(!DraftInputSchema.safeParse(input).success){setTouched(current=>({...current,benefits:true}));return;}draft?.onSave(input,{...draft.preferences,targetSeconds:Number(duration),orientation,voiceProfileId:voice});}
 return <div className="software-page education-page branding-page">
  <Link className="back-link" href={draft?"/projects/new":"/preview/create"}><Icon name="arrow-left" width="17" height="17"/>All video types</Link>
  <section className="software-intro" aria-labelledby="branding-title"><div><span className="education-mode"><Icon name="layers" width="14" height="14"/>Product branding</span><h1 id="branding-title">Create a product branding video</h1><p>Add your product details and images. We’ll turn them into a narrated product video.</p></div><Image src="/illustrations/select-branding.svg" width={200} height={120} alt=""/></section>
  <p className="education-preview-label">{draft?"Text and settings are saved only when you choose Save draft. File attachments are saved as you upload.":"Form preview · Inputs stay on this page only. Leaving or refreshing clears them."}</p>
  {draft&&<Notice><strong>Coming soon:</strong> Product branding generation will be available in a future release. You can prepare and save a draft now.</Notice>}
    <form className="education-workspace software-workspace" aria-label="Product branding details" onChange={draft?.onDirty} onSubmit={event=>{event.preventDefault();setTouched({name:true,intendedUse:true,rights:true,processing:true});}} noValidate>
   <fieldset className="draft-fields" disabled={draft?.pending}>
    <div className="education-source ui-panel software-source">
     <section className="education-section software-details" aria-label="Product details">
      {draft&&<TextField label="Project title" maxLength={LIMITS.title} value={draft.title} onChange={event=>draft.onTitleChange(event.target.value)} hint="Optional. A blank title is saved as Untitled product branding video."/>}
      <TextField id="branding-name" label="Product name" name="productName" required maxLength={LIMITS.name} value={name} onChange={event=>setName(event.target.value)} onBlur={()=>touch("name")} error={touched.name&&!NameSchema.safeParse(name).success?"Enter your product name.":undefined} placeholder="e.g. Everyday Carry Backpack" hint="Maximum 120 characters."/>
      <TextAreaField id="branding-description" label="What is your product?" name="brief" maxLength={LIMITS.brief} rows={3} value={description} onChange={event=>setDescription(event.target.value)} hint="Optional. Describe the product, who it is for and what it does." placeholder="Describe your product using factual information." aria-describedby="branding-budget"/>
      <TextAreaField id="branding-benefits" label="Benefits to highlight" name="benefits" rows={3} value={benefits} onChange={event=>setBenefits(event.target.value)} error={benefitError} hint="Optional. One benefit per line, up to 8 lines and 200 characters per line. Include only supported benefits." placeholder="Describe benefits supported by your product information…" aria-describedby="branding-budget"/>
      <TextAreaField id="branding-brand" label="Brand details" name="brandDetails" maxLength={LIMITS.brief} rows={2} value={brand} onChange={event=>setBrand(event.target.value)} error={budgetError} hint="Optional. Add your brand name, preferred colors and tone." placeholder="e.g. Brand identity, palette, voice…" aria-describedby="branding-budget"/>
      <p className="software-budget" id="branding-budget">{total.toLocaleString("en-US")} / 4,000 characters shared across description, benefits and brand details{saved?.callToAction||saved?.intendedAudience?", including saved audience and call to action":""}.</p>
      <SelectField id="branding-use" label="Intended use" name="intendedUse" required value={intendedUse} onChange={event=>setIntendedUse(event.target.value)} onBlur={()=>touch("intendedUse")} error={touched.intendedUse&&!IntendedUseSchema.safeParse(intendedUse).success?"Choose how you intend to use this video.":undefined} hint="Helps determine which narration services are eligible. It does not guarantee licensing suitability."><option value="">Choose intended use</option><option value="personal-learning">Personal learning</option><option value="promotional">Promotional</option></SelectField>
     </section>
     <section className="education-section software-media" aria-labelledby="branding-images-title"><h2 id="branding-images-title">Product images <span className="required-marker" aria-hidden="true">*</span></h2><p className="software-media-description">At least one product photo is required for generation. A logo alone is not enough.</p><p className="software-privacy"><Icon name="lock" width="16" height="16"/><span>Remove private information and personal data before uploading. Uploads are private; external AI analysis starts only after you acknowledge processing and choose Generate.</span></p><ul className="software-file-limits" aria-label="File requirements"><li>JPEG, PNG or WebP: up to 8 images, 5 MB each.</li><li>60 MB combined upload limit. Recordings are not supported for Branding.</li></ul>
      {draft?<SourceUploads draft={draft}/>:<><div className="software-upload-zone" onDragOver={event=>event.preventDefault()} onDrop={event=>{event.preventDefault();setDropMessage("No file was opened or uploaded. Uploading is not connected in this preview.");}}><span className="software-upload-icon"><Icon name="plus-circle" width="26" height="26"/></span><h3>Add product images</h3><p id="branding-upload-hint">File selection, drag and drop, and uploading are not connected in this preview.</p><Button variant="secondary" disabled aria-describedby="branding-upload-hint">Choose files</Button></div><p className="software-upload-status" role="status">{dropMessage||"No images added. No files are read or sent from this preview."}</p></>}
     </section>
    </div>
    <aside className="education-settings-column" aria-label="Video settings and automatic features">{draft?<CatalogSettings prefix="branding" duration={duration} onDurationChange={setDuration} orientation={orientation} onOrientationChange={setOrientation} voice={voice} onVoiceChange={setVoice}/>:<VideoSettings prefix="branding" duration={duration} onDurationChange={setDuration} orientation={orientation} onOrientationChange={setOrientation}/>}<section className="education-automatic ui-panel"><h2><Icon name="layers" width="18" height="18"/>Automatic generation</h2><p>Includes AI narration, automatic captions and scenes based on your supplied product images.</p></section></aside>
    <section className="education-section education-acknowledgments" aria-label="Permissions and processing"><CheckboxField id="branding-rights" label="I have permission to use any reference material I provide." required checked={rights} onChange={event=>setRights(event.target.checked)} onBlur={()=>touch("rights")} error={touched.rights&&!rights?"Confirm you have permission to use your reference material.":undefined}/><CheckboxField id="branding-processing" label="I understand my inputs are processed by external AI services." required checked={processing} onChange={event=>setProcessing(event.target.checked)} onBlur={()=>touch("processing")} error={touched.processing&&!processing?"Acknowledge external AI processing before generating.":undefined}/><p className="education-retention"><Icon name="clock" width="16" height="16"/>Generated media is available for 7 days after completion. Download your video before it expires. Downloaded copies stay on your device.</p></section>
    <div className="education-actions"><div className="education-action-buttons"><Button id="draft-save-button" variant="secondary" pending={draft?.pending} pendingLabel="Saving draft…" disabled={!draft||draft.conflict||draft.uploadBusy||!!benefitError||!!budgetError} onClick={save} aria-describedby="branding-action-hint">Save draft</Button><Button type="submit" disabled aria-describedby="branding-action-hint">Generate video<Icon name="arrow-right" width="18" height="18"/></Button></div><p className="field-hint" id="branding-action-hint">{draft?"Coming soon: Product branding generation will be available in a future release. You can save this draft now.":"Uploads, saving, voice playback and generation are not connected in this preview."}</p></div>
   </fieldset>
  </form>
  {!draft&&<PreviewNote>Product Branding form UI only. No account, stored files, saved draft or generation service is connected.</PreviewNote>}
 </div>;
}
