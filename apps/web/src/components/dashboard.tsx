import Image from "next/image";
import Link from "next/link";
import { Icon } from "@/components/icons";

const modes = [
  { key: "education", title: "Education", detail: "Explain an idea through illustrated scenes and calm narration.", action: "Start topic" },
  { key: "software", title: "Software showcase", detail: "Show what your application can do with clean UI wireframes.", action: "Start tour" },
  { key: "branding", title: "Product branding", detail: "Bring your physical or digital product into focus with narrative depth.", action: "Start showcase" },
] as const;

function MobileStudioIllustration() {
  return <div className="mobile-studio-art" aria-hidden="true"><div className="mini-video-window"><div className="mini-window-dots"><i /><i /><i /></div><span className="mini-window-scene" /><div className="mini-window-track" /></div><div className="mini-audio"><div className="mini-waveform">{[12, 20, 28, 16, 24, 12].map((height, i) => <span key={i} style={{ height }} />)}</div><div className="mini-audio-track"><i /><span /></div></div></div>;
}

function PhoneIllustration() {
  return <div className="sample-phone" aria-hidden="true"><div className="phone-notch" /><div className="phone-header">Make My Marriage <span>♡</span></div><div className="phone-hero"><span>♧</span><i /><i /></div><div className="phone-rows">{[0, 1, 2].map(n => <div key={n}><span /><div><i /><i /></div></div>)}</div><div className="phone-home" /></div>;
}

export function Dashboard() {
  return <div className="dashboard-content">
    <section className="dashboard-hero" aria-labelledby="dashboard-title">
      <div className="hero-copy"><span className="studio-label"><span className="status-dot" />Studio workspace</span><h1 id="dashboard-title">Bring your next idea to life.</h1><p>Turn an idea or product into a narrated video with crafted visuals and natural pacing.</p></div>
      <div className="studio-art"><Image src="/illustrations/studio.svg" width={240} height={140} alt="" priority /></div>
      <MobileStudioIllustration /><div className="hero-actions"><Link href="/preview/create" className="button button-primary"><Icon name="plus" />Create video</Link><Link href="/preview/videos" className="button button-quiet">View library <Icon name="arrow-right" width="18" height="18" /></Link></div>
    </section>
    <section className="video-types" aria-labelledby="types-title"><div className="types-heading"><h2 id="types-title"><span className="desktop-types-label">Start with a template direction</span><span className="mobile-types-label">Choose a video type</span></h2><p>AI handles the rest.</p></div><div className="mode-grid">{modes.map(mode => <Link key={mode.key} href={"/preview/create?mode=" + mode.key} className="mode-card" aria-label={mode.action + ": " + mode.title}><div className="mode-art"><Image className="desktop-mode-image" src={"/illustrations/" + mode.key + ".svg"} width={160} height={88} alt="" loading="eager" /><Image className="mobile-mode-image" src={"/illustrations/" + mode.key + "-mobile.svg"} width={40} height={40} alt="" loading="eager" /></div><div className="mode-copy"><h3>{mode.title}</h3><p>{mode.detail}</p></div><div className="mode-action"><span>{mode.action}</span><Icon name="arrow-right" width="18" height="18" /></div></Link>)}</div></section>
    <section className="recent-projects" aria-labelledby="recent-title"><div className="recent-heading"><div><h2 id="recent-title">Recent projects</h2><span className="sample-badge">Sample project data</span></div><Link className="view-all" href="/preview/videos">View all <Icon name="arrow-right" width="17" height="17" /></Link></div>
      <div className="project-grid">
        <article className="project-card"><div className="project-thumbnail solar-thumbnail"><Image src="/illustrations/solar.svg" width={440} height={248} loading="eager" alt="Illustrated solar-powered home, sample project thumbnail" /><span className="project-status status-ready"><span className="status-dot" />Ready</span><span className="thumbnail-play" aria-hidden="true"><Icon name="play" width="24" height="24" /></span><span className="aspect-badge">16:9</span></div><div className="project-copy"><h3>How solar panels power a home</h3><p>Education · 60 sec · Landscape · 720p</p><div className="project-note ready-note"><span className="status-dot" />Available for 6 more days</div></div><div className="project-footer"><span>Created Oct 24, 2026</span><button type="button" className="button button-secondary" disabled aria-describedby="sample-actions-note"><Icon name="play-circle" width="18" height="18" />Open video</button></div></article>
        <article className="project-card"><div className="project-thumbnail phone-thumbnail"><PhoneIllustration /><span className="project-status status-draft"><span className="status-dot" />Draft</span><span className="aspect-badge">9:16</span></div><div className="project-copy"><h3>Make My Marriage overview</h3><p>Software · 60 sec · Portrait · 720p</p><div className="project-note draft-note"><span className="status-dot" />Draft · Continue setup.</div></div><div className="project-footer"><span>Last edited 2 hours ago</span><button type="button" className="button button-primary" disabled aria-describedby="sample-actions-note"><Icon name="edit" width="18" height="18" />Continue</button></div></article>
      </div>
    </section>
    <div className="dashboard-retention"><p><span className="status-dot" />1 of 3 saved-video slots used</p><p><Icon name="clock" width="16" height="16" />Videos are kept for 7 days</p></div>
    <p className="dashboard-preview-note" id="sample-actions-note">Design preview — profile, processing status and projects are sample data. Sample videos cannot be opened or edited yet.</p>
  </div>;
}
