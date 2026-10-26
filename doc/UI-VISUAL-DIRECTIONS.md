# AI Video Studio — proposed visual directions

**Date:** 24 October 2026  
**Status:** Forest & Ivory selected by the user on 24 October 2026. This board remains a record of the earlier alternatives; see DESIGN-SYSTEM.md for the chosen foundation.

The user requested simple, elegant, distinctive UI with restrained color and minimal gradients. This exploration chooses the visual language before designing feature pages. Product features/authentication remain defined by [PRD](PRD.md) and [system architecture](SYSTEM-ARCHITECTURE.md).

## 1. Stitch exploration

Private project: **AI Video Studio — Visual Directions**, ID `11898319746861427028`.

One AI-generated comparison board uses the same small education-topic input, primary button and recent-project specimen for all three directions. Content is illustrative design data. It is not a functioning dashboard, generated-video evidence or selected brand. The existing Make My Marriage project was not edited.

## 2. Color and typography choices

| Token | Forest & Ivory (recommended) | Ink & Mist | Plum & Stone |
|---|---|---|---|
| Canvas | `#F7F6F2` | `#F5F7FA` | `#F8F6F8` |
| Surface | `#FFFFFF` | `#FFFFFF` | `#FFFFFF` |
| Primary action | `#235B4E` | `#315E91` | `#71516F` |
| Main text | `#202722` | `#202936` | `#2B252D` |
| Secondary text | `#5E665F` | `#596676` | `#6A606D` |
| Subtle border | `#DCDDD5` | `#DCE2E9` | `#E3DCE3` |
| Selected fill | `#E9F0EB` | `#EAF0F7` | `#F0E8F0` |
| Heading/body family | Manrope | Plus Jakarta Sans | DM Sans |
| Intended feel | Warm, calm creative workspace | Clear, precise, airy | Refined, expressive creative studio |

Forest & Ivory was recommended and has now been selected by the user. It gives video thumbnails and source imagery room to carry the expressive color, while the controls remain quiet. Ink & Mist is the more technical option; Plum & Stone puts more emphasis on a creative brand.

## 3. Shared visual rules

- Light theme first; flat solid fills, no gradients in this exploration. Dark mode requires a later explicit scope decision.
- Use primary color for the main action, focus and selected state. Do not color every card or mode differently.
- Distinguish hierarchy through typography, alignment and whitespace instead of decorative effects, heavy shadows or excess containers.
- Proposed heading scale: 28–32 px for page titles, 20–24 px for sections; 16 px body with 24 px line height; 14 px labels. Use 400 body, 500 labels and 600 headings, with restrained heading letter spacing. Avoid tiny low-contrast captions.
- Prefer one family throughout the app. Typography establishes identity without adding an unrelated decorative typeface.
- Start with 8 px spacing rhythm; 24–32 px between sections. Inputs/buttons about 44 px high, 10 px corner radius; surfaces 12 px radius. These are proposals to validate on the first real screen.
- Borders may separate surfaces subtly, but essential input boundaries/focus indicators must remain perceptible. Do not use a subtle decorative border as the only control indicator.
- Secondary actions use neutral outlined/text treatments; destructive actions use labeled red treatments. Status color is semantic and accompanied by text/icons, not a competing brand palette.
- A proposed common status set: success `#216347` on `#EAF3ED`, waiting `#80531B` on `#FAF0DF`, error `#A33232` on `#FBEAEA`. Final layout and accessibility review still required.
- Motion is short and functional, respects reduced-motion settings, and never makes loading look like measured progress. Avoid decorative looping animation.

## 4. Calculated contrast checks

Ratios below are calculated from the exact proposed sRGB tokens, not evidence of the generated screenshot using those tokens correctly.

| Pair | Forest & Ivory | Ink & Mist | Plum & Stone |
|---|---|---|---|
| White text / primary button | 7.84:1 | 6.69:1 | 6.76:1 |
| Main text / canvas | 14.13:1 | 13.67:1 | 13.90:1 |
| Secondary text / canvas | 5.48:1 | 5.46:1 | 5.57:1 |

These checks do not establish full WCAG conformance. Inspect actual font sizes, focus indicators, disabled states, semantic colors and rendered output before implementation.

## 5. Selected direction and next review

User selected Forest & Ivory. Its tokens and saved Stitch design system are documented in [visual foundation](DESIGN-SYSTEM.md). The first [dashboard](UI-DASHBOARD.md) is being designed for user review before other feature screens.

Do not automatically apply one proposal across all app screens. No live video-generation API call is required for this exploration; Stitch design generation is a separate service operation.
