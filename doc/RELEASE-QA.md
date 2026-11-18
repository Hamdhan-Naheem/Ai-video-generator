# W-29 shared failure and accessibility release pass

Implemented locally on 12 November 2026. This is the Education showcase slice; hosted verification remains required.

## Behavior

- Shared account requests have a 20-second fetch deadline, including response-body reading, while also honoring caller cancellation. CSRF acquisition is separately bounded and only its in-flight read is shared. No mutation is automatically replayed.
- Connection failures and malformed responses produce sanitized, actionable messages. HTTP 401 triggers the existing session teardown even when the body is HTML/empty, except for rejected sign-in/sign-up attempts. Temporary 503/network failures do not trigger authentication teardown. A malformed successful JSON response is not accepted as a save receipt.
- A transient initial draft-read failure has a real retry action. Confirmed unavailable/unauthorized reads do not offer a misleading retry. The pending request is aborted when the draft workspace unmounts.
- Stale-version saves retain current fields/settings. Loading the latest saved draft now opens a confirmation with Keep editing initially focused. Failed reloads stay in the dialog and retain current edits. Successful replacement returns focus to the current draft status; replacing fields requires an explicit action.
- Failed draft saves focus the error summary so it is visible even when Save draft was below a long form. Existing field values and settings remain intact.
- Shared dialogs skip disabled/inert controls in the keyboard loop. During a non-dismissible pending action, focus moves to the dialog heading so disabling the focused button cannot strand focus on the document body. Escape is blocked while the action is pending and normal dismissal/focus return remains available afterward. Native dialogs remain free of `tabindex`, as required by the [HTML Standard](https://html.spec.whatwg.org/multipage/interactive-elements.html#the-dialog-element).
- Existing lost-create-response reconciliation, draft deletion idempotency, private-player position/caption restoration and session teardown are preserved.

## Automated acceptance

See `apps/web/e2e/release-resilience.spec.ts`, `shared-controls.spec.ts`, the existing draft/conflict/deletion tests, and selected `education-result.spec.ts` cases. New resilience cases use actual local Supabase Auth and saved projects. Network aborts, 503/HTML responses and a delayed reload are deliberately injected; they are not evidence of a live provider outage. Media tests use synthetic private fixture outputs and actual Storage grants; no AI generation is performed. Test users/projects/media are scoped and cleaned up.

- Retry after an initial 503; retain topic, optional notes, duration and orientation after background-session and save failures; explicit retry persists the edits without automatic duplicate PATCHes.
- Real stale-version conflict; cancel/Escape retains edits; reload failure is announced inside the dialog; pending Tab/Escape stays confined; successful replacement restores focus. Dialog fits 320 × 360; no horizontal document overflow.
- Non-JSON confirmed session failure removes the workspace without replaying unsaved edits.
- Existing shared-field labels, accessible descriptions/errors, arrow/space choices, password visibility, reverse Tab, Escape/focus return, reduced motion and 44-pixel control tests pass on desktop/mobile.
- Existing real two-editor conflict/session return, failed/lost-response deletion, private-media renewal with position preservation, real expired Storage-token denial/recovery, and active-playback session loss are rechecked.

These checks inspect keyboard/DOM behavior; they are not a WCAG certification or a substitute for screen-reader testing. Real remote devices, production cookies/origins and the deployed worker remain release acceptance work.

## Manual checks

Use the configured `http://127.0.0.1:3000` origin and a disposable draft. Do not choose Generate for these checks.

1. Edit a topic, optional notes, duration and orientation. Simulate an offline save in browser network tools, then reconnect. Check that edits remain and an explicit Save draft succeeds. Do not reload while testing unsaved edits.
2. Open the same draft in two tabs. Save a change in tab A, then save a stale change in tab B. In B, open Reload saved draft: Keep editing/Escape must preserve the edits. Replace with saved draft must load A’s saved content only after confirmation.
3. Navigate with Tab/Shift+Tab and radio arrow keys. Check visible focus, field labels, password visibility, dialog dismissal and focus return. At 320px width/short height, dialog content and all actions must remain reachable by scrolling. Try reduced-motion settings.
4. Delete only a disposable saved draft. Cancel must keep it; successful deletion must remove its card and focus the list heading. Existing generated results remain independent of editable drafts.
5. Open a retained result, play/pause, enable captions and use Reload player. Check position/caption continuity. After a private link expires, recovery must obtain a fresh grant for the same revision. Sign out while playing: playback must stop and private access require sign-in.

## Remaining release work

W-29 is scoped to the current Education application. Full W-24 version/project deletion, expanded account features, Google, Software/Branding generation and advanced features remain deferred or unfinished as tracked. Next is the essential W-24 local web-worker workspace/cache lifecycle slice, then essential W-30 protected operational controls and W-31 security/hosted setup/deployment acceptance. Do not mark R-05 Complete from this local pass or raise existing quotas. No new provider calls, deployment, migrations, paid activation, commit or push are part of W-29.
