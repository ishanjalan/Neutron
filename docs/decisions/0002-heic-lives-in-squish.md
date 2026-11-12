# ADR-0002: HEIC converter app retired; HEIC handled inside Squish

- Status: accepted
- Date: 2026-11-12 (written retrospectively)
- Related: commits `1e3c99b`, `ff40a96`, `4701cea`, `40ed3e9`, `d25ed8d`, `c083ad8`

## Context

HEIC was originally a standalone app (`apps/heic`) with its own repo, CI job and deploy. Squish
already converts and compresses images and accepts HEIC, so the standalone app duplicated it.

## Decision

Retire the standalone app. Squish handles HEIC: it decodes with the browser's native
`createImageBitmap` where available and falls back to the lazily loaded `heic-to` (libheif, WASM,
LGPL-3.0, about 3 MB chunk) where it is not (`d25ed8d`). The old app was first turned into a redirect
(`1e3c99b`), dropped from CI, footer and app registry, and its leftover stub deleted in `c083ad8`.

This retired the _app_, not HEIC support. The intended entry point for people searching "HEIC to
JPG" is a `/heic` landing route inside Squish. That route was announced in `1e3c99b` but does not
exist today (`/Squish/heic` returns 404 while receiving real visits).

Update 2026-11-12: the `/heic` route now exists (`routes/heic`, config in `lib/landing-pages.ts`). It
is the normal Squish app with the output format preset to JPG for that visit only (the preset is
never saved over the visitor's own settings), its own title, description and canonical, and an
FAQ. The homepage links to it. Further landing pages should follow the same pattern.

## Consequences

One fewer app to build, test and deploy. The libheif chunk is only downloaded when needed.

## Revisit if

HEIC traffic justifies its own brand and domain again, or `heic-to` becomes unmaintained.
