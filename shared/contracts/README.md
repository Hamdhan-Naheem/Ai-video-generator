# Shared contracts — W-03

`index.ts` is the pure browser/server entry point. It imports only Zod and sibling schema files: no filesystem, environment, provider SDK, worker or privileged database dependency. The existing Zod installation is reused; no dependency was added. Web consumers use the `@contracts` alias. Node tooling uses TypeScript through the existing `tsx` runner. Explicit `.ts` sibling imports and `allowImportingTsExtensions` support both no-emit TypeScript checks and Next.js bundling; this is not a prebuilt JavaScript package.

## Contract boundaries

- `DraftInputSchema`: mode is required to select a strict variant. Other generation fields can be absent or blank, but supplied values still obey enums, lengths, mode-specific fields, source roles/counts, uniqueness and text budgets. Preserve incomplete text instead of discarding it. An empty enum selection must be omitted when mapping a form to a draft. This standalone input is not an HTTP project-create body; endpoint adapters must supply/check the selected outer mode.
- `GenerationInputSchema`: complete input for a server-frozen revision. Requires title/topic/audience as appropriate, Intended use, software description/source, or product name/non-logo image. Branding description remains optional. Education rejects media. Sources contain asset IDs and roles only; paths, URLs and ownership fields are rejected.
- `PreferencesSchema` / `DraftPreferencesSchema`: complete versus partial settings, with numeric 60/75/90 and landscape/portrait. Voice IDs are opaque catalog identifiers; parsing does not prove availability or licensing eligibility.
- `AcknowledgmentsSchema` / `GenerationRequestSchema`: both acknowledgments must be literal true for the current policy. The HTTP generation body references the draft version, preferences and acknowledgments. It never accepts replacement input/source objects: the server must read the owned draft before validating/freeze/enqueue.
- `auth.ts`: strict signup/signin/password-change, method-specific deletion reauthentication request and safe user/session/result shapes. New passwords preserve exactly 12–128 characters; current/signin passwords preserve 1–128 to allow verification of existing credentials. Confirm actual provider policy during auth implementation. Display names trim surrounding whitespace, preserve international characters/punctuation and enforce 1–80 Unicode code points. Email parsing does not prove mailbox ownership.
- `responses.ts`: safe user-facing job/error shapes, canonical decimal strings for large counters, known/unknown scene totals, strict nested properties and UTC timestamps. No raw provider response, storage key, credential or worker state is accepted as an extra DTO property. Response callers must still select/sanitize human-readable strings; validating a shape cannot detect every secret embedded in a message. `makeValidationError` deliberately uses fixed messages and allowlisted field paths, never raw Zod text/input or attacker property names.

Content budgets match existing browser UTF-16 `maxlength` and counters; display names use Unicode code points. The generated schemas include `x-character-count` to document this distinction. Software description + feature highlights share 4,000 units. Branding brief + benefits + brand details + CTA + intended audience share that budget. Education brief + learning objective share it; reference notes have their separate 10,000 limit. No implicit trimming/discarding of reference notes or factual supplemental text. Required names/title/topic are trimmed on complete input; incomplete drafts retain text.

Actual file sizes, codecs, decoding, upload completion, ownership, RLS, idempotency, quotas, worker lifecycle and provider eligibility are **not** established by parsing an asset ID or request. Those checks belong to later integration milestones. No auth route, backend endpoint or database is implemented by this module.

## Generated catalog and checks

From the project root:

```powershell
npm run contracts:generate
npm run contracts:check
npm run typecheck
npm test
```

`openapi.json` is a generated OpenAPI 3.1 component catalog, including input JSON Schemas. Its `paths` is intentionally empty: this does not claim functioning endpoints or a complete HTTP specification. It must not be edited manually. Cross-field/whitespace/custom refinements remain enforced by runtime Zod schemas even when JSON Schema cannot express them. `contracts:check` fails if the catalog drifts, and is part of the root `check` command.

`test/contracts.test.ts` covers complete/incomplete inputs, wrong-mode and privilege fields, media-role/count rules, budgets, exact passwords, Unicode names, redirect safety, safe DTOs and validation-error redaction. Existing preview browser tests verify these schemas actually run in browser code. The UI still uses page-local data and disabled backend actions.
