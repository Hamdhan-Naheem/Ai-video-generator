"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Modal, Notice, PreviewNote } from "@/components/ui";

export function VideoLibrary() {
  const [dialog, setDialog] = useState<"video" | "draft" | null>(null);
  return <div className="library-page">
    <div className="page-heading"><div><h1>My videos</h1><p>Open your saved videos or continue a draft.</p></div><Link className="button button-primary" href="/preview/create"><Icon name="plus" />Create video</Link></div>
    <div className="library-summaries"><div className="ui-panel capacity-summary"><div><Icon name="layers" /><strong>1 of 3 saved-video slots used</strong><div className="slot-bars" aria-label="Sample capacity: one of three slots used"><i /><i /><i /></div></div><p>Drafts don’t use saved-video slots.</p></div><div className="retention-summary"><Icon name="clock" /><div><strong>7-day retention policy</strong><p>Generated videos are available for 7 days. Download them before they expire.</p></div></div></div>
    <section className="library-section" aria-labelledby="saved-videos-title"><h2 id="saved-videos-title">Saved videos <span className="count-badge">1</span></h2>
      <article className="library-row ui-panel"><div className="library-thumbnail"><Image src="/illustrations/solar.svg" width={440} height={248} loading="eager" alt="Illustrated solar-powered home, sample video" /><span className="aspect-badge">16:9</span><span className="thumbnail-play" aria-hidden="true"><Icon name="play" width="24" height="24" /></span></div>
        <div className="library-copy"><div className="library-tags"><span className="status-chip status-ready"><span className="status-dot" />Ready</span><span className="version-chip">Version 1</span></div><h3>How solar panels power a home</h3><p>Education · Beginner <span className="metadata-dot">·</span> 60 sec · Landscape (16:9) · 720p</p><span className="caption-chip"><Icon name="captions" width="16" height="16" />Captioned copy available</span><p className="expiry-line"><Icon name="clock" width="16" height="16" />Available until 31 Oct 2026, 18:30 (UTC+05:30) · Sample data</p></div>
        <div className="library-actions"><Button variant="quiet" onClick={() => setDialog("video")}><Icon name="play-circle" />Open video</Button><button className="icon-button" type="button" aria-label="Video actions" onClick={() => setDialog("video")}><Icon name="more" /></button></div>
      </article>
    </section>
    <section className="library-section" aria-labelledby="drafts-title"><h2 id="drafts-title">Drafts <span className="count-badge">1</span></h2><article className="library-row ui-panel"><div className="library-thumbnail draft-thumbnail"><Image src="/illustrations/library-draft.svg" width={220} height={120} loading="eager" alt="Sample task management interface" /><span className="aspect-badge">16:9</span></div><div className="library-copy"><div className="library-tags"><span className="status-chip status-draft">Draft</span><span className="version-chip">Software showcase</span></div><h3>Introduce my task management app</h3><p>Software showcase · 60 sec · Landscape (16:9)</p></div><div className="library-actions"><Link className="button button-primary" href="/preview/create?mode=software"><Icon name="edit" />Continue editing</Link><button className="icon-button" type="button" aria-label="Draft actions" onClick={() => setDialog("draft")}><Icon name="more" /></button></div></article></section>
    <PreviewNote>Projects, dates, captions and slot counts are sample data. No personal videos are loaded.</PreviewNote>
    <Modal open={dialog !== null} onClose={() => setDialog(null)} title={dialog === "draft" ? "Sample draft actions" : "Sample video"}><Notice>This is a design sample. Playback, downloads and deletion will be available after private video storage and account integration.</Notice><div className="dialog-actions"><Button variant="secondary" data-initial-focus onClick={() => setDialog(null)}>Close preview</Button></div></Modal>
  </div>;
}
