# ADR-0005: pnpm 12 with opt-in install scripts and a 24h release-age gate

- Status: accepted
- Date: 2026-11-12
- Related: commits `fb71f95`, `c083ad8`; `pnpm-workspace.yaml`

## Context

pnpm moved to 12.x. From pnpm 10 install scripts do not run unless approved, and from pnpm 11 an
unreviewed one fails the install. Settings now live in `pnpm-workspace.yaml`; a `pnpm` field in
`package.json` is ignored. pnpm also rejects packages younger than 24 hours (`minimumReleaseAge`).

## Decision

Adopt pnpm 12, pinned through `packageManager` (CI reads it via `pnpm/action-setup`). Keep the
defaults: every dependency install script is a deliberate entry in `allowBuilds` (`true` or `false`
after reading what it does), and a package younger than 24 hours is not installed. Patched
transitive versions go in `overrides`.

## Consequences

- A new dependency with an install script fails the install until reviewed.
- Brand-new releases, including ones already in the lockfile, fail until a day has passed. Fix by
  waiting, or `pnpm clean --lockfile && pnpm install` to re-resolve. Specific exceptions are listed
  under `minimumReleaseAgeExclude`.
- The lockfile has two YAML documents: pnpm's pinned binaries, then the dependency lock. Tools that
  parse it must handle both.
- Any automated updater (Renovate, Dependabot) must respect the same 24h age, or it will open PRs
  that cannot install.

## Revisit if

The age gate blocks urgent security fixes often enough to matter (use the exclude list), or pnpm
changes these defaults.
