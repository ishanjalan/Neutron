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

Config lives in `knip.json`. Known benign reports it ignores: `tailwindcss` (imported from CSS) and `$app` (SvelteKit virtual module in tsconfig).

## Consequences

knip results are a report, not proof: verify each flagged file (grep for dynamic `new URL(...)` loads)
before deleting. Update 2026-11-12: all 13 flagged files were verified unreferenced and deleted
(`ghostscript.worker.ts` was not a false positive; the real worker is `ghostscript.comlink.ts`).
`pnpm knip` (files, dependencies, unlisted) now runs in `ci.yml` and fails on regressions. Unused
exports are not gated: they flag public API types and are noisy.

## Revisit if

Rev-dep's unused-export accuracy is
shown to match knip's.
