"use client";

import { useState } from "react";

export function PublicSample() {
  const [opened, setOpened] = useState(false);
  return <figure className="public-sample">
    <div className="public-sample-media">
      {opened ? <video aria-label="Hydroelectric Education sample" controls playsInline preload="metadata" poster="/samples/hydroelectric-poster.jpg" width={1280} height={720}>
        <source src="/samples/hydroelectric-education.mp4" type="video/mp4" />
        <track kind="captions" src="/samples/hydroelectric-education.vtt" srcLang="en" label="English" default />
        Your browser cannot play this video. <a href="/samples/hydroelectric-education.mp4">Download the sample</a>.
      </video> : <button className="public-sample-open" onClick={() => setOpened(true)} aria-label="Load Education video sample">
        {/* A local approved export, deliberately loaded only after an explicit action. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/samples/hydroelectric-poster.jpg" alt="Illustrated hydroelectric power station with an animated teacher" width={1280} height={720} />
        <span className="public-play" aria-hidden="true">▶</span><span className="public-sample-load">Load video sample</span>
      </button>}
    </div>
    <figcaption><strong>Hydroelectric power · 60-second example</strong><span>English Gemini narration · captions · landscape</span><small>Accepted prototype sample. The current Education workflow uses supported illustrated templates; results vary by topic. No audio plays automatically.</small></figcaption>
  </figure>;
}
