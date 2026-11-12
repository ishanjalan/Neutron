# ADR-0004: Keep ESLint + Prettier; do not adopt Biome

- Status: accepted
- Date: 2026-11-12
- Related: ADR-0009

## Context

Biome (evaluated at 2.6.7) would replace both tools with one faster one. Neutron is almost entirely
Svelte 5 components.

## Decision

Keep ESLint and Prettier. Findings from the trial:

- Biome's Svelte support is experimental, and it has no Svelte-specific lint rules.
- ESLint's Svelte plugin catches rules this codebase actually hit: `prefer-svelte-reactivity`,
  `no-navigation-without-resolve`, `require-each-key`.
- Adopting it would reformat nearly every `.svelte` file, burying real changes in diff noise.
- Speed is not a problem at this repo size.

## Consequences

Two tools stay installed and configured. Lint and format keep working on `.svelte` files.

## Revisit if

Biome gains first-class Svelte linting and formatting, or lint time becomes a real cost.
