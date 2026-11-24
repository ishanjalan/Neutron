# ADR-0011: Quality is one slider with plain-language levels and sampled size estimates

- Status: accepted (Squash done; Squish to follow the same pattern)
- Date: 2026-11-24
- Related: `packages/ui/src/components/QualitySlider.svelte`, `apps/squash/src/lib/utils/estimate.ts`

## Context

Squash offered five buttons (Tiny, Web, Social, High, Max Quality). They did not say what they
produce. Measured on 8 s of 1080p stock footage: they are mediabunny's five relative quality levels,
giving 245 kbps, 491 kbps, 959 kbps, 2.6 Mbps and 7.1 Mbps. "Web" (described as "Balanced") was the
second-lowest. The size estimate on each card used fixed bitrates and was 1.4–2.6x too high. The
`crf` and `targetBitrate` fields in the code did nothing, because WebCodecs has no CRF.

Established patterns checked (vendor docs and product pages, not hands-on): HandBrake ships a few
named presets plus one constant-quality slider and tells users to preview a short clip first;
Clipchamp names exports by resolution and purpose; VEED and Kapwing show a live estimated size next
to a compression control; FreeConvert separates "target a file size" from "target a quality";
Squoosh shows a live size and a before/after divider. Adobe Media Encoder's estimate is only exact
for constant-bitrate exports, so estimates must be labelled approximate.

## Decision

- One slider, smallest file to best quality, with plain names (Smallest, Small, Balanced, High, Best)
  and a one-line description. Stored setting values are unchanged, so saved settings still work, and
  the default stays on the level it always was (now called Small).
- Beside it, the predicted size and percent saved for the user's own video, produced by encoding one
  or two short samples at every level and extrapolating to the full duration. The selected level is
  measured first. On the test clip the estimates were within 2–8% of the real full encodes; that is
  one smooth clip, not a guarantee. Labelled "≈"; the real size replaces it after compressing.
- Resolution sits next to the slider, not behind Advanced. Target size stays a separate mode and
  disables the slider while it is set.
- The component lives in `@neutron/ui` so Squish can use the same control with its own stops.

Rejected: keeping five unlabelled buttons; a formula-only estimate (content varies too much);
showing no estimate (HandBrake's choice; fine for pros, not for the one-click audience here).

## Consequences

The first estimate takes a few seconds (the encoder's cold start is about 3.5 s here, then roughly
1 s per level), shown as "Estimating size…". Sampling stops when a real compression starts. Only the
first waiting video is sampled; a batch total is extrapolated from it. The old FAQ claims about
specific savings were removed because they had never been verified (ADR-0006).

## Revisit if

Estimates drift from real sizes on typical footage, or users ask for a before/after sample preview.
