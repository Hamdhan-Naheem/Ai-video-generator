# Education topic visuals — 12 November 2026

New Education planning supports two allowlisted, data-driven animation components. The teacher, captions, measured narration timing, ivory/forest foundation and existing generic diagram remain shared. Existing exported videos and cached stories are preserved; this enhancement applies when a new story is planned.

| Topic | Supported visual | Boundary |
|---|---|---|
| Bubble sort / general sorting-algorithm introduction | An actual ascending bubble-sort trace: input, adjacent comparisons/swaps, sorted result | Other named algorithms such as quicksort/merge sort remain generic. General sorting lessons must explicitly identify the animated example as bubble sort. Integer values, duplicate identities and comparisons are computed locally, not supplied as executable steps by Gemini. |
| LLM / language-model inference | Simplified input tokens, contextual processing, illustrative next token, append/repeat | Not a real tokenizer, trained-model trace, probability estimate or training simulation. Explicit fine-tuning/training-only topics remain generic. |
| Other topics | Existing diagram illustration | No promise of arbitrary AI-written animation or topic-specific footage. |

## Data and execution

`SceneSchema.animation` is optional for backward compatibility. New selected-topic planner requests require a bounded animation object on every scene. The discriminator is `bubble-sort` or `llm-flow`; each has a fixed phase enumeration. Arrays, numbers and plain-text labels are bounded; extra fields, URLs, code and unsupported kinds are rejected. All animated scenes retain one example and ordered phases. The planner validates topic choice; the shared worker request schema also validates sequence consistency.

The existing `worker_execute` plan path and JSONB scene visual/checkpoint manifests carry this data. No table, public form input, API endpoint, ownership rule, database migration or provider quota changes are needed. The generated OpenAPI component catalog includes the optional scene data. Deploy the matching web API and worker code together; an old API parser does not understand the new property.

The renderer computes correct bubble-sort comparisons and smoothly moves the two swapped bars, separating their vertical paths to keep labels readable. Multiple compare scenes share one continuous trace. Sorting phases finish in ascending order without changing values. LLM stages retain the same example tokens/continuation and show an explicit illustrative label. Animation follows scene timing; exact word-to-swap/attention synchronization is not claimed. No arbitrary model-authored code, HTML, remote image URL or shader is executed.

## Preview and manual checks

Run `node --import tsx scripts/render-topic-fixtures.ts --clips` from the repository root. Outputs under ignored `.cache/topic-visual-previews` are synthetic silent fixtures, not live generated narration. The temporary local bundle is removed afterward.

- Inspect landscape/portrait sorting previews: input values persist, adjacent values compare, inverted pairs swap, equal pairs retain stable identity, and recap is sorted. Labels remain readable during swaps.
- Inspect LLM previews: token/context/prediction/append phases differ; the example remains consistent and the illustrative disclaimer is visible.
- For a later controlled live test, use a new draft titled **How bubble sort orders numbers** or **How a large language model predicts the next token**. Existing completed videos will not change. Do not repeatedly regenerate to verify layouts.
- Generic hydroelectric/solar/other accepted exports must remain compatible. Current previews use silent fixture audio and no lip-sync claim; actual narration, planning quality, native captions and final download still need live acceptance before deployment.

See PROJECT-TRACKER.md for actual verification results and remaining release gates. This addition does not implement all sorting algorithms, custom visual authoring or a new generation mode, and does not complete W-30.
