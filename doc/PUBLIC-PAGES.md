# Public Education showcase pages — W-27

Implemented locally on 12 November 2026. `/` is now a public landing page, not a redirect to the dashboard. The actual workspace remains `/dashboard`; `/preview/*` remains explicit fixture-only design content. Public links never enter those fixtures.

## Content and references

- Approved Stitch project `11898319746861427028`: desktop screen `21637938d4454fb8b2879e5ef22945a0`, mobile `28b89829ddec47eb9da1dadc9922c0df`. The hero, three format cards, steps, specifications and call to action follow that composition. Copy reflects the Education-only release; desktop/mobile share `#F7F6F2`.
- Shared public shell, existing Brand/button styles, real email/password entry points, `/help`, `/privacy`, `/terms`, `/contact`, neutral 404 and linked account-access help. No new account recovery or Google capability is claimed.
- The creator explicitly approved publishing `naheemhamdhan77@gmail.com` for support/privacy and making the accepted hydroelectric Education demo public, including after deployment, on 12 November 2026. This address is intentionally public, not an application credential.
- Sample is a separate public copy at `apps/web/public/samples/hydroelectric-education.mp4`; original private `local-runs/education-demo` artifacts are preserved. The exact 3,201,635-byte landscape-clean export SHA-256 is `1caf5032e3e642f6b16c4f1b7c21c1317816a4288e5fdf7073f469227b041722`. Duration 60.011 seconds; 1280×720, 30 fps. Verified original Gemini/Kore narration; no solar/ElevenLabs sample was republished. The clean export avoids duplicated burned-in and native captions. English VTT copied; poster extracted locally from the approved file at 20 seconds.
- The approved example necessarily has public, unauthenticated static URLs and is an exception to private project media. It is not covered by private-media grants or the seven-day project-media expiry. Never place user uploads or other private run artifacts in this directory. No dynamic filesystem/media publishing endpoint was added.
- The MP4 is requested only after Load video sample; playback uses native controls, inline playback and captions, without autoplay. The poster is public. The illustration/template limitations are disclosed rather than suggesting all new topics match the accepted prototype.

## Boundaries

No new AI calls, cloud deployment, account changes, migrations, allowance increases, or messages to the public contact were performed. Existing account, ownership, private grants and worker controls remain intact. Robots stay `noindex` for the pre-release application. Provider privacy/terms links are informational, not a compliance certification. The privacy notice explicitly distinguishes generated-media access expiry, Storage cleanup, retained records, temporary local files and provider retention.

W-29 accessibility/shared-failure checks and remaining R-05 lifecycle/security/hosted acceptance gates still apply. A local screenshot or successful build is not hosted deployment acceptance.

## Hosted showcase voice preview

The hosted preview now has a 12-second mono 24 kHz PCM fallback at `apps/web/assets/voice/kore-showcase.wav`. It is derived solely from the already-public, explicitly approved hydroelectric MP4 above, whose source hash is verified before extraction. `assets/voice/provenance.json` records source/output hashes and size. No original private recording or generated user media was copied, and no AI request was made.

The existing authenticated `/api/v1/voices/Kore/preview` route prefers a valid private local sample when installed and otherwise reads this bounded curated fallback. It retains authentication, method validation, private/no-store responses and the fixed preview URL. Next.js file tracing explicitly includes only the curated fallback for the API route. The public source MP4 remains intentionally public; private sample originals remain ignored. Preview playback does not generate narration from the visitor's form.
