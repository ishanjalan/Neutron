# ADR-0007: Squash "target size" is a ceiling the encoder is fitted to

- Status: accepted
- Date: 2026-11-12 (written retrospectively)
- Related: commit `0b0fdae`; `apps/squash/src/lib/utils/target-plan.ts`, `compress.ts`

## Context

The target-size setting existed in the UI but did not actually drive the encoder. WebCodecs encoders
take a bitrate, not a file size, and rate control overshoots and undershoots.

## Decision

Treat the target as a maximum. `target-plan.ts` derives a video bitrate from duration, audio and a
0.95 safety factor, never above the source bitrate, and picks the largest resolution rung that keeps
bits-per-pixel acceptable for the codec (30 fps cap unless the user chose otherwise). `compress.ts`
then measures the result and re-plans, up to 3 passes, keeping the largest result at or under the
target. If an encode lands well under (below 80% of target) it asks for proportionally more. A fit
report is shown on the card, including when the target could not be met.

## Consequences

Output is predictable and honest about misses. Compression can take up to three encodes, so it is
slower than quality presets. Very small targets on long videos fall back to a 240p floor and may
fail, which the UI reports.

## Revisit if

A browser encoder exposes real constant-size or two-pass rate control.
