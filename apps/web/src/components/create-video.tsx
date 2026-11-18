"use client";

import Image from "next/image";
import { EducationForm } from "@/components/education-form";
import {BrandingForm} from "@/components/branding-form";
import { SoftwareForm } from "@/components/software-form";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Notice, PreviewNote } from "@/components/ui";

const modes = [
  { key: "education", title: "Education", description: "Explain a topic with illustrated scenes, narration and a 2D teacher.", hint: "Start with a topic and audience.", action: "Create education video", heading: "Create an education video" },
  { key: "software", title: "Software showcase", description: "Show how your application works using screenshots or a screen recording.", hint: "Start with your app details and visuals.", action: "Create software showcase", heading: "Create a software showcase" },
  { key: "branding", title: "Product branding", description: "Introduce your product with images, clear benefits and narration.", hint: "Start with your product details and images.", action: "Create branding video", heading: "Create a product branding video" },
] as const;

export function CreateVideo({live=false}: {live?:boolean}={}) {
  const params = useSearchParams();
  const selected = params.get("mode");
  const mode = modes.find(item => item.key === selected);
  if (!live && mode?.key === "education") return <EducationForm />;
  if (!live && mode?.key === "software") return <SoftwareForm />;
  if (!live && mode?.key === "branding") return <BrandingForm />;
  return <div className="create-selection">
    <div className="page-heading"><div><h1>Create video</h1><p>{live?"Create an Education video, or prepare a draft for an upcoming video mode.":"Choose the kind of video you want to create."}</p></div></div>
    {selected && !mode && <Notice error>That video type isn’t available. Choose one of the three types below.</Notice>}
    <div className="selection-grid">{modes.map(item => <article className="selection-card" key={item.key}>
      <div className="selection-top"><div className="selection-art"><Image src={`/illustrations/select-${item.key}.svg`} width={200} height={120} alt="" loading="eager" /></div><h2>{item.title}</h2></div>
      <p className="selection-description">{item.description}{live&&item.key!=="education"&&" Generation will be available in a future release."}</p><span className="selection-hint">{live&&item.key!=="education"?"Coming soon":item.hint}</span>
      <Link className="button button-primary selection-action" href={`${live?"/projects/new":"/preview/create"}?mode=${item.key}`}>{live&&item.key!=="education"?`Prepare ${item.title.toLowerCase()} draft`:item.action}<Icon name="arrow-right" width="18" height="18" /></Link>
    </article>)}</div>
    <div className="selection-guidance"><Icon name="info" width="18" height="18" /><p>You can review your details and video settings before generating.</p></div>
    {live?<Notice>Education is the only video generation mode currently available. Software showcase and Product branding generation are coming in a future release; you can prepare drafts for them now.</Notice>:<PreviewNote>All three video types open form previews. Uploads, draft saving, voice playback and generation are unavailable in these design previews.</PreviewNote>}
  </div>;
}
