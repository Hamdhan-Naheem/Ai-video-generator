# Create video, My videos and Settings reference review

> Current status: the three Stitch-based visual previews are implemented and verified; built-result user review is pending. Mode-specific input forms and backend features remain planned. See PROJECT-TRACKER.md.

26 October 2026. User accepted the compact Dashboard and requested the remaining three placeholder pages be matched to their Stitch designs, after confirming the references. This handoff records reference discovery, not completed page implementation or backend features.

## Live Stitch references

Project: 11898319746861427028. Screen identifiers below were retrieved through the connected Stitch service.

| Screen | Desktop | Mobile |
|---|---|---|
| Create video selection (new draft) | 290babb026054769bcca94dbdcb96fd7 | efb389600f7648988f179731eaf5ea34 |
| Create education video | 95651f3752184e0bbe8544e097b813ab | 594496ae09684f1881d4a67d67288791 |
| Create software showcase | e56dcb5487ae4aadb63745ed699cb60a | 310986568ea94b92a20a92c1c5fc0145 |
| Create product branding video | 08b309b6ead04966bb23ffe7bbcb8fb4 | 7ffc106b97554969b3790f8bec200c60 |
| My videos | 42b9e012f321469b80a055778b1e77ca | 1de721e7c46442d381cd8061a4547bdd |
| Settings (email/password) | 8438188bc1b943b3b0e170260c961155 | 62fa9f13aaa541d48addc2db2729ae7a |
| Settings (Google account) | bc825c5c16254b32bad525d2962f062e | e624bbaa01c74d2a976c58d9a8f88b4b |

Shown for this review: original education mobile, library desktop/mobile and Settings mobile exports. Desktop education/Settings screenshot exports are incomplete; their downloaded HTML source was rendered locally as supplemental references with scripts/event handlers removed, installed Tailwind CSS and locally supplied Manrope. These are source-rendered previews, not original screenshot bytes or pixel-perfect reproduction claims. No generated application JavaScript was executed. The first local render attempts required browser spawn permission, a correct file-URL path and the CSS compiler dependency callback; final reference rendering succeeded.

## Layout to implement after confirmation

- Create video: mode-specific introductory panel, source form, shared duration/orientation/voice/language settings, optional details, permissions/AI consent, retention notice and draft/generate actions. Desktop uses source/settings columns; mobile stacks the same fields. Use corresponding software/branding references for their fields, not education inputs for every mode. Preserve mode selection from Dashboard and create entry navigation.
- My videos: title/create action, saved-output capacity and retention, separate saved-version and draft sections, image/metadata/status/actions and menus; responsive rows on desktop/cards on mobile. Empty and expired variants remain in the original inventory.
- Settings: profile (name editable/email read-only), auth-method-aware security, session and separated destructive account section. Google-only settings must not request an application password.

## Existing user decisions that override export defects

- Keep compact shell: sidebar 192px, desktop top bar 48px, desktop gutter 24px and mobile header 52px. Keep #F7F6F2 canvas and shared corresponding colors at all viewports.
- Restore missing mobile audience/format/voice labels from the real controls; untouched inputs are blank and acknowledgments unchecked. Add required Intended use, keep product description optional and follow UI-RECONCILIATION.md rather than copying stale screenshot bugs.
- Use one project thumbnail across desktop/mobile despite drift between exported library art. Preview data/actions must be explicitly fixtures until backend implementation. Do not claim real saves, uploads, generation, sessions, signout or deletion from visual-only work.

Confirmation of these three page references is pending. No app code or Stitch designs changed in this review. Once confirmed, replace the three generic preview pages incrementally using reusable form/status/dialog components and verify the actual desktop/mobile pages against these references. Backend milestones remain separate in PROJECT-TRACKER.md.

## Missing selection page designed first — 26 October 2026

The user correctly clarified that existing Education/Software/Branding references are input forms, not the Create video entry/selection page. A fresh live screen inventory confirmed that the selection page was missing. User requested Stitch design before application implementation.

Created desktop screen 290babb026054769bcca94dbdcb96fd7 (Create video — Choose a video type) and compact mobile screen efb389600f7648988f179731eaf5ea34 (Create video selection — Compact mobile revision) in project 11898319746861427028. These are the current candidates for review. Desktop screenshot resource: files/b3d5c22f36ec416abb05c75169eaf063; desktop HTML: files/0400b73d00ce478aad0b6dcda5262a1b. Compact mobile screenshot: files/b2be583e7b6a4e6bb67c0ae7a6fe93eb; mobile HTML: files/c1e63d4ac6c240d488fe18487fac2d8f (all resources relative to this Stitch project).

The first mobile draft c26ba2043d1342f7b2b8725a213a46c2 had a wrapping wordmark/oversized status pill and wide art banners. A targeted edit reported success but its retrieved image and source remained unchanged. A new compact mobile revision was then generated and its actual screenshot/source inspected. Preserve the first draft as history; do not use it as the implementation reference.

The entry page has a heading/subtitle and exactly three cards: Education, Software showcase, Product branding. Desktop arranges cards in one row; mobile stacks compact cards with 64px illustration/title rows and full-width actions. Shared canvas #F7F6F2, white panels and forest accents, compact desktop navigation and mobile header/status/bottom navigation. At implementation, reuse the already approved shared filled-play logo/icon assets rather than introducing logo drift. No input fields, upload, video settings, consent, Generate action or generation starts on this page.

Navigation flow: Create video entry → choose a video type → corresponding existing mode-specific form → review settings/acknowledgments → explicit Generate. Dashboard mode cards may continue directly to their corresponding form. Each form’s All video types link returns to the selection page. This is a navigation layer, not a new generation mode or manual generation wizard.

Desktop and final compact mobile screenshots were shown for user review. Approval remains pending; no application source was changed, no existing form or Dashboard screen was intentionally edited, and no video-generation/provider or cloud-configuration actions occurred. Only this handoff and PROJECT-TRACKER.md were updated in the application repository. Next: confirm the new selection design, implement that entry page first, then implement the existing three input forms and remaining page layouts incrementally.

## Implementation follow-up — 26 October 2026

The user subsequently authorized moving the new Create video selection, My videos and Settings layouts into the application. These three visual previews are implemented using the previously accepted compact Dashboard chrome. The source references above remain their design basis. The desktop selection vectors and draft-interface illustration were extracted as reviewed static SVG assets; original HTML/scripts were not executed or imported into application code. The existing Dashboard solar thumbnail is reused in the library across desktop/mobile.

Create entry is /preview/create; mode links preserve ?mode=education|software|branding and show an explicit upcoming-form destination with All video types navigation. My videos and Settings now render their designed sections instead of foundation cards. Sample-only account/library boundaries are visible; no fake API success is shown. Settings updates only a local preview name; refresh resets it. Real mode forms, auth actions, data storage and generation remain later work.

All 16 browser checks and the final web/pipeline checks passed; screenshots reviewed at desktop/mobile widths, with 320px checks. User review of the built result remains pending. W-02 is partially implemented, not complete. See PROJECT-TRACKER.md for exact limits and next feature.

