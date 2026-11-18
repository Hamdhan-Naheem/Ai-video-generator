# Security controls and release safeguards

Updated 12 November 2026. These controls are implemented locally for the Education showcase; hosted configuration, operational controls and final release acceptance remain separate gates. See [initial review](PREDEPLOY-REVIEW.md), [tracker](PROJECT-TRACKER.md) and [release plan](EDUCATION-RELEASE.md).

## Account and request protection

- Supabase verifies identity; database functions derive ownership from the authenticated user. RLS, restricted table grants and fixed security-definer search paths remain in force. Provider and service credentials stay in server/worker configuration.
- Mutations require the exact configured Origin, a current session-bound CSRF token and JSON. The API counts body bytes, validates strict contracts and returns sanitized errors.
- Sign-in and sign-up share PostgreSQL-backed 60-second windows: eight attempts per normalized email, 60 per network identity and 240 globally. Instances share the same counters. Denied requests return 429 with bounded Retry-After; unavailable protection fails closed with 503.
- Only the server service role can call `consume_auth_attempt`. Emails and network identities are stored as domain-separated HMAC hashes, not raw addresses. Expired windows are removed during subsequent requests; saturating a broader window does not allocate new subject rows.
- Local development ignores caller-supplied forwarding headers. Hosted attribution trusts Vercel's overwritten X-Forwarded-For only when running on that platform, accepts one valid IP and normalizes IPv6. Other hosting/proxy arrangements fail closed until implemented. [Vercel request headers](https://vercel.com/docs/headers/request-headers).
- The application limiter supplements Supabase Auth. Direct Auth endpoints, native rate settings, disabled Google provider state and hosted configuration must be verified during W-31; an application limiter cannot gate direct Auth requests. [Supabase Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits).

## Bounded metadata and AI work

The user requested lower safeguards and approved the generation-history follow-up. All bounds are enforced in the database, including direct authenticated RPC paths. Existing data is preserved; reaching a history limit does not automatically delete records.

| Resource | Local safeguard | Behavior |
|---|---|---|
| Active saved drafts | 20 per account | Removed/deleted input is excluded from the active count |
| Project records | 50 per account | Removed/deleted project records still count; ordinary draft edits and legitimate receipt replay remain available |
| Create-draft receipts | 50 per account | No silent cleanup of receipts needed for lost-response reconciliation |
| Draft JSON | 64 KiB for new/changed input | An unchanged larger legacy input can still have its title/preferences edited; legacy content can shrink to fit |
| Stored generation revisions | 50 per account | Includes failed, cancelled, expired and logically deleted history |
| New generation jobs | 12 per account per UTC day | Cancellations still count; retry updates the same job and does not consume a new-admission slot |
| External AI requests | 12 per account and 24 globally per UTC day | Combined Gemini planning, Gemini TTS and ElevenLabs dispatches; failed/uncertain requests count conservatively |
| Source upload allocation history | 100 records per account | Includes removed allocations so repeated tiny-file add/remove cannot grow metadata indefinitely; existing file sizes/counts/byte reservations stay unchanged |

Daily windows reset at **00:00 UTC**. Each video uses several provider requests; the request count is not a promise of that many videos. Existing per-job attempt/repair/time budgets, one processing slot, output limits, and the approved 200 MB account/400 MB global byte allowances remain unchanged. No provider credential allowance was increased.

Provider counters are independent of result deletion and job receipt keys. The migration includes existing dispatches from its current UTC day rather than resetting real usage. Actual dispatch is checked transactionally under the established global-first locking order before a network request. A denied dispatch does not call a provider or activate a fallback to evade the limit. A new job ID cannot reset the daily counter.

At the daily AI limit, saved input and valid completed work remain. Cached-only render/storage recovery remains eligible even when the AI window is full; the dispatch guard still blocks any actual new provider call. Recovery explains the UTC reset and offers **Check daily allowance**. Earlier job safety, expiry, uncertain-outcome and lifetime budgets must still pass before retry is allowed. History caps refer users to the creator rather than purging private metadata or disabling all edits.

The allocation-history ceiling is an internal metadata safeguard. Conservative broad-bucket upload byte reservations, physical cleanup/late-upload protection and exact-path upload rights are also retained. A small declared file does not reduce the pre-existing safety reservation to one byte.

## Browser and dependencies

- The proxy generates a fresh cryptographic nonce per request and forwards the CSP to Next.js so framework bootstrap scripts receive matching nonces. The root document renders dynamically; one static nonce is not shared by cached HTML.
- Production script policy uses nonces and strict-dynamic without unsafe-inline scripts or unsafe-eval. Development-only eval/WebSocket allowances are excluded from production. Inline styles remain allowed for current React styles; this is an intentional residual policy choice, not a claim that every CSP directive is maximally restrictive.
- Media and connection origins allow the configured Supabase origin, local assets and required blob URLs. There is no blanket HTTPS media/connect allowlist. Frame ancestors are denied, objects/base URI are blocked, forms remain same-origin, and referrers and browser capabilities are restricted. HSTS is issued for configured HTTPS origins; hosted TLS behavior still needs verification.
- Remotion packages were aligned to 4.0.543. The lint-only typescript-estree chain uses a targeted minimatch 11.0.1 override until an upstream-compatible release removes the need. Next.js was not downgraded; no force-fix was used. Use Node 24 for the existing web toolchain.
- Fresh dependency audit reports zero known advisories after the updates. This does not audit native helper binaries or establish that every dependency is vulnerability-free. Preserve the lockfile and run appropriate renderer/web checks on later updates.

## Verification and manual checks

Automated evidence and any remaining issues are recorded in the dated tracker entry. The new SQL tests roll back; the concurrency script creates only synthetic records and removes its own rows, including only its simulated contribution to the global daily counter. It does not call AI providers. Legacy pagination fixtures deliberately model accounts created before the cap under transaction-local table locks; browser roles gain no bypass.

Manual checks on the local application:

1. Sign in, open Dashboard, create/save/reopen an Education draft, and confirm Settings/Sign out still work on desktop/mobile.
2. Open an existing result, play it, turn captions on, download MP4/SRT/VTT and check the account menu. Deletion should still preserve the saved draft and stop new media access.
3. If a daily allowance is reached, read the reset explanation and use Check daily allowance after 00:00 UTC. Do not generate extra videos merely to exhaust the quota for testing; the SQL fixtures cover boundaries without spending provider allowance.
4. Check that a blocked save/admission preserves the form. The UI should explain capacity rather than navigate to a preview fixture or silently create duplicates.
5. Verify the configured hosted domains, direct Auth limits, CSP/media/CORS behavior and all required maintenance/worker scheduling during W-31. Local evidence does not complete those checks.

Full account/project lifecycle, safe operator recovery and pause controls, isolated fresh/upgrade migration acceptance, hosted backups/logging, staged load checks and bounded real Education generation remain tracked release work. No deployment is implied by this hardening pass.

Confirmed sign-in/sign-up and intentional sign-out now replace the document using an allowlisted internal destination. This clears prior-account client/router state and gives the new document a fresh nonce. Same-tab logout clears its workspace before navigation; other tabs receive the existing signed-out broadcast and replace their documents. Genuine expiry still follows the session-expired flow; independent browser sessions are preserved.

## W30 operational boundary — 13 November 2026

The new operator API/CLI has no automatic role grant or service-key login. Active protected database roles are required; a cheap early guard precedes shared locks and a locked recheck prevents demotion races. Internal RPC execution stays private; operators retain ordinary owner RLS on tester content. No raw scripts/media/credential hashes are projected. Valid mutation attempts share a ten/minute bound, with exact receipts, safe fixed reason codes and bounded/retained metadata. Existing generation budgets are immutable here. Paused admission/claims do not cancel current work; expired repair checks both exact leases/slot/instance and preserves costs/checkpoints. Uncertain provider work stops for review. CLI config is private plaintext, never baked/published; TLS/redirect restrictions, ephemeral cookies, CSRF and signout handling are documented in [operator guide](OPERATOR-CONTROLS.md). All local checks there passed; hosted release sign-off remains W31.
