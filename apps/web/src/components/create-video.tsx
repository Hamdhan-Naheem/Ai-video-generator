"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/icons";
import { Notice, PreviewNote } from "@/components/ui";

const modes = [
  { key: "education", title: "Education", description: "Explain a topic with illustrated scenes, narration and a 2D teacher.", hint: "Start with a topic and audience.", action: "Create education video", heading: "Create an education video" },
  { key: "software", title: "Software showcase", description: "Show how your application works using screenshots or a screen recording.", hint: "Start with your app details and visuals.", action: "Create software showcase", heading: "Create a software showcase" },
  { key: "branding", title: "Product branding", description: "Introduce your product with images, clear benefits and narration.", hint: "Start with your product details and images.", action: "Create branding video", heading: "Create a product branding video" },
] as const;

export function CreateVideo() {
  const params = useSearchParams();
  const selected = params.get("mode");
  const mode = modes.find(item => item.key === selected);
  if (mode) return <div className="mode-destination">
    <Link className="back-link" href="/preview/create"><Icon name="arrow-left" width="17" height="17" />All video types</Link>
    <section className="mode-intro ui-panel"><div><span className="studio-label">{mode.title}</span><h1>{mode.heading}</h1><p>{mode.description}</p></div><Image src={`/illustrations/select-${mode.key}.svg`} width={200} height={120} alt="" /></section>
    <Notice>You selected {mode.title}. Its input form has been designed in Stitch and will be implemented in the next creation-form step. This preview does not collect inputs or generate a video.</Notice>
    <Link className="button button-secondary" href="/preview/create">Choose another video type</Link>
  </div>;
  return <div className="create-selection">
    <div className="page-heading"><div><h1>Create video</h1><p>Choose the kind of video you want to create.</p></div></div>
    {selected && <Notice error>That video type isn’t available. Choose one of the three types below.</Notice>}
    <div className="selection-grid">{modes.map(item => <article className="selection-card" key={item.key}>
      <div className="selection-top"><div className="selection-art"><Image src={`/illustrations/select-${item.key}.svg`} width={200} height={120} alt="" loading="eager" /></div><h2>{item.title}</h2></div>
      <p className="selection-description">{item.description}</p><span className="selection-hint">{item.hint}</span>
      <Link className="button button-primary selection-action" href={`/preview/create?mode=${item.key}`}>{item.action}<Icon name="arrow-right" width="18" height="18" /></Link>
    </article>)}</div>
    <div className="selection-guidance"><Icon name="info" width="18" height="18" /><p>You can review your details and video settings before generating.</p></div>
    <PreviewNote>Choose a type to preview its destination. Input forms and generation are upcoming features.</PreviewNote>
  </div>;
}
