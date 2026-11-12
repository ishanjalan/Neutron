# ADR-0009: knip is the dead-code tool; Rev-dep not adopted yet

- Status: accepted
- Date: 2026-11-12
- Related: commit `c083ad8` (PR #4); ADR-0004

## Context

Tooling was getting heavy, and unused dependencies and files had piled up (inert Sentry, jsdom,
Valibot, a retired app). knip and Rev-dep were compared on this repo.

## Decision

Use knip for unused dependencies and files. It needs explicit entry patterns for SvelteKit 3 (it does
not auto-detect them), after which it ran in about 3 seconds and found real dead weight. Rev-dep
(3.3.0) reads `.svelte` imports and additionally finds circular imports and duplicated code, which
knip does not, but it is young, its benchmarks are self-reported, and its unused-export accuracy has
not been checked. Do not replace knip; consider Rev-dep only as a circular-import check.

Known knip false positive: `ghostscript.worker.ts` (loaded through `new URL(...)`).

## Consequences

knip results are a report, not proof: verify each flagged file before deleting. At the time of
writing, 13 flagged files remain unverified and Squish has 2 import cycles
(`images.svelte.ts` ↔ `detect-format.ts`; `auto-save` → `compress` → `download` → `auto-save`).

## Revisit if

A CI gate is added (start with unused dependencies only), or Rev-dep's unused-export accuracy is
shown to match knip's.
