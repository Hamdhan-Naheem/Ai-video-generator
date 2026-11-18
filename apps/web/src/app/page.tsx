import Link from "next/link";
import { PublicShell } from "@/components/public-shell";
import { PublicSample } from "@/components/public-sample";

const formats = [
  { name: "Education", image: "education", text: "Explain a topic with narrated scenes, an illustrated teacher and timed captions." },
  { name: "Software showcase", image: "software", text: "Present software using screenshots or recordings. Generation is planned for a future release." },
  { name: "Product branding", image: "branding", text: "Present a product with images and supported benefits. Generation is planned for a future release." },
];
const steps = [
  ["Choose your topic", "Sign in and add your topic, audience and key points. Save a draft and return when you’re ready."],
  ["Generate your video", "Acknowledge AI processing, then generate. The workflow prepares the storyboard, narration, captions and animation."],
  ["Preview and download", "Review your completed video and download the MP4 and caption files while they’re available."],
];
export default function Home() {
  return <PublicShell><div className="public-width public-landing">
    <section className="public-hero" aria-labelledby="hero-title"><div>
      <span className="public-eyebrow">● Automated video generation</span>
      <h1 id="hero-title">Turn your ideas into narrated videos</h1>
      <p>Create educational explainers from your topic and notes, with AI narration, illustrated scenes and captions.</p>
      <div className="public-actions"><Link className="button button-primary" href="/sign-up">Create account</Link><Link className="button public-outline" href="/sign-in">Sign in</Link></div>
      <p className="public-fine">Education generation is available in this learning preview when the processing computer is online and capacity is available.</p>
    </div><PublicSample /></section>
    <section className="public-section" aria-labelledby="formats-title"><h2 id="formats-title">Three ways to create</h2><p className="public-subtitle">Start with Education. More generation formats are coming later.</p>
      <div className="public-formats">{formats.map((format, index) => <article className="public-format" key={format.name}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`/illustrations/${format.image}.svg`} alt="" width={360} height={210} loading="lazy" />
        <h3>{format.name}</h3>{index > 0 && <span className="public-badge">Coming soon</span>}<p>{format.text}</p>
        {index === 0 ? <Link href="/sign-in?next=%2Fprojects%2Fnew">Sign in to create <span aria-hidden="true">→</span></Link> : <small>Forms and drafts are available after sign-in; video generation is not enabled yet.</small>}
      </article>)}</div>
    </section>
    <section className="public-how public-section" aria-labelledby="how-title"><h2 id="how-title">How it works</h2><p className="public-subtitle">From your notes to a narrated educational video.</p><ol>{steps.map(([title, text]) => <li key={title}><h3>{title}</h3><p>{text}</p></li>)}</ol></section>
    <section className="public-section" aria-labelledby="expect-title"><h2 id="expect-title">What to expect</h2><p className="public-subtitle">The current Education release, without extra setup.</p>
      <dl className="public-specs">{[["Voice language", "English narration"], ["Target length", "60, 75 or 90 seconds"], ["Framing", "Landscape 16:9 or Portrait 9:16"], ["Resolution", "720p · 30 fps"], ["Downloads", "MP4, SRT and VTT captions"], ["Availability", "Generated media: 7 days"]].map(([term, detail]) => <div key={term}><dt>{term}</dt><dd>{detail}</dd></div>)}</dl>
      <aside className="public-notice"><strong>Availability note</strong><p>Processing depends on available capacity, AI provider limits and the creator’s processing computer being online. A 90-second video can take longer than 90 seconds to generate. Download completed files within seven days; your local downloads remain yours to keep.</p></aside>
    </section>
    <section className="public-cta"><h2>Create your first video</h2><p>Set up an account to turn your educational notes into a narrated video.</p><Link className="button button-primary" href="/sign-up">Create account</Link></section>
    <section className="public-faq public-section" aria-labelledby="questions-title"><h2 id="questions-title">A few helpful answers</h2><details><summary>Can I create Software or Branding videos?</summary><p>Not in this release. You can save those forms as drafts, but generation is Coming soon in a future release.</p></details><details><summary>Will my videos stay available forever?</summary><p>Generated media is available for seven days after a successful result. Download it before it expires. Drafts and account records follow a separate lifecycle.</p></details><details><summary>Do I need to keep this tab open?</summary><p>No. Submitted jobs continue independently of your tab. The processing computer must stay online, and provider or capacity limits can delay processing.</p></details><Link className="public-text-link" href="/help">Read the help guide →</Link></section>
  </div></PublicShell>;
}
