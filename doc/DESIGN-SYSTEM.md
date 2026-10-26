# AI Video Studio — visual foundation

**Date:** 24 October 2026  
**Palette:** Forest & Ivory — selected by the user.  
**Status:** Visual foundation saved in Stitch; individual screen layouts require review.  
**Stitch project:** `11898319746861427028` · **Design-system asset:** `assets/3283859971905571040`.

## 1. Visual intent

Calm, simple and elegant creative workspace. Use intentional spacing, clear text and small purposeful accents so the video/source imagery can carry the visual variety. Keep each screen focused on its immediate task. Avoid decorative gradients, glass effects, giant metric cards, ornamental AI symbols and unnecessary visual density.

## 2. Color tokens

| Token | Value | Usage |
|---|---|---|
| canvas | `#F7F6F2` | Warm ivory page background |
| surface | `#FFFFFF` | Cards, menus and controls |
| primary | `#235B4E` | Main action, selected/focus emphasis |
| primary-hover | `#194B40` | Hover on filled primary controls |
| on-primary | `#FFFFFF` | Text/icons over primary fill |
| text | `#202722` | Main copy and headings |
| text-secondary | `#5E665F` | Supporting copy and metadata |
| border-subtle | `#DCDDD5` | Decorative separators and surface boundaries |
| control-border | `#79847C` | Essential input boundaries; validate at actual size |
| selection | `#E9F0EB` | Selected navigation/soft emphasis |
| success-text / fill | `#216347` / `#EAF3ED` | Ready status with text/icon |
| waiting-text / fill | `#80531B` / `#FAF0DF` | Waiting and actionable warnings |
| error-text / fill | `#A33232` / `#FBEAEA` | Validation and destructive feedback |

Primary-button white text contrast calculated at 7.84:1, main text/canvas 14.13:1, secondary text/canvas 5.48:1. These token checks do not establish full accessibility conformance. All real controls/focus/statuses still need review. Never rely on color alone for status.

## 3. Typography and spacing

- Manrope throughout, sans-serif fallback. Body weight 400, labels 500, headings 600.
- Page title 32/40 px; section title 22/30 px; body 16/24 px; labels/metadata 14/20 px. Mobile page titles may use 28/36 px after responsive review.
- 8 px base rhythm. 24–32 px between sections, 32–40 px desktop content gutters, 16–20 px mobile gutters.
- Buttons/inputs about 44 px high, 10 px radius; project panels/cards 12 px radius. Stitch's base shape token is ROUND_TWELVE; component instructions retain the 10 px control specification.
- Use thin dividers and minimal shadows. Menus may use modest elevation to show layering. No heavy colored shadows.
- Visible keyboard focus, persistent labels, disabled state explanation and reduced-motion behavior are required at implementation. Essential actions must remain available without hover.

## 4. Application shell

Desktop reference uses a narrow light sidebar (approximately 224 px): Dashboard, Create video, My videos, Settings. Small profile menu at bottom. No team workspace selector, operator navigation for ordinary users, pricing or upgrades. Active navigation uses a subtle forest-tinted background and clear text/icon.

Responsive navigation has been reviewed: use the shared compact mobile header and four-item bottom navigation. Mobile must preserve access to all four destinations without shrinking desktop text/cards into unreadable columns. Light appearance is the current design scope; no dark-mode switch is introduced here.

## 5. Components and copy

- One clear main task per screen. Primary actions use forest; secondary actions use neutral outline or text styles.
- Mode options share one coherent treatment; do not assign unrelated bright colors to each mode.
- Status chips combine labels with color. Availability is understandable user copy, not a dump of worker/provider internals.
- Long titles wrap or truncate with access to full text; thumbnail art supports recognition rather than dominating the page.
- Use short practical messages. Avoid claims of instant/unlimited generation, perfect factual accuracy, paid credits, or unmeasured completion percentages.
- The authenticated dashboard is distinct from landing, creation, detailed progress and result screens. These feature pages will be designed individually.

## 6. Review boundary

The user's selection approves Forest & Ivory as the palette. It does not approve an unseen dashboard or every future component. The first dashboard is a design fixture, with no functioning backend and no live generation. Other visual-direction proposals remain historical comparisons in [visual directions](UI-VISUAL-DIRECTIONS.md). Product requirements continue in [PRD](PRD.md), [architecture](SYSTEM-ARCHITECTURE.md), [API](API-DESIGN.md) and [database design](DATABASE-DESIGN.md).

## 7. Reviewed screen handoff — 25 October 2026

See [UI reconciliation](UI-RECONCILIATION.md) for the screen inventory. Earlier first-dashboard review boundaries above describe historical sequence, not a current restriction on implementation.

- One shared approved logo: white play triangle on forest-green rounded square, AI Video Studio. No palette name, workspace branding, invented version number or extra status claims in product chrome.
- Icons: Dashboard four-square grid; Create video plus-circle; My videos stacked play frames; Settings outline gear. Active desktop navigation uses selection wash; unavailable pages select no unrelated destination.
- Share header/sidebar/profile and mobile bottom bar; enforce canvas token on every route. Read-only fields remain readable. Same thumbnail asset across desktop/mobile.
- Shared centered responsive modals: max-width about 440px, 16px mobile outer margins, short-screen scrolling and keyboard-reachable actions; dim all background including bottom navigation. Focus trapping, initial focus, announcements and 44px targets need runtime validation.
- Empty inputs have no password-dot fixtures in the normal state. Consent starts unchecked. Disabled buttons use neutral styling and server-backed availability. Avoid relying on small screenshot text as proof of accessible contrast/size.

## 8. Desktop/mobile color parity — 26 October 2026

The user explicitly confirmed that mobile must use the same approved desktop background and all corresponding color tokens. Canvas is #F7F6F2, surfaces #FFFFFF, primary #235B4E and selected navigation #E9F0EB at every viewport. Do not reproduce the mint tint visible in some mobile Stitch fixtures. Responsive breakpoints change arrangement, spacing and navigation presentation, not the palette. Use shared CSS custom properties/design tokens; verify computed colors and representative desktop/mobile screenshots during implementation. No further Stitch redesign is required for this correction.
## 9. Compact shell refinement — 26 October 2026

User requested a smaller sidebar/top bar and removal of the wide gap beside Dashboard. This supersedes the earlier approximate 224px sidebar/centered content guidance: desktop sidebar 192px, navigation labels 13px/icons 17px, brand mark 28px and top bar 48px. Keep navigation targets at least 44px high. Main content fills the remaining workspace and starts 24px from the sidebar at desktop widths, without an auto-centered max-width container. Mobile retains 16px content gutters and bottom navigation; its header is 52px with a compact logo/profile. Palette and designed Dashboard content remain unchanged.
