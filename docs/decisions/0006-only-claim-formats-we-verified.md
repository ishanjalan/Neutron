# ADR-0006: Only claim format support that has been verified

- Status: accepted
- Date: 2026-11-12 (written retrospectively)
- Related: commits `4e3518d`, `9516c57`, `62ea62a`

## Context

Squash and Swirl claimed to support AVI. Real files did not work. Page copy and FAQs elsewhere also
contained factual errors (`9516c57`). Browser encoding support also varies: for audio export, MP3
works through our own WASM encoder, while FLAC and Vorbis cannot be encoded in the browser at all.

## Decision

A format, codec, limit or capability may appear in the UI, FAQ or README only after it has been
exercised with a real file in a real browser (Chrome stable, via Playwright) and the output analysed
(ffprobe). Unsupported things are removed from copy, not hidden behind caveats. Support is also
feature-detected at runtime (`canEncodeAudio`, filters such as `isSupportedVideo`) rather than
assumed.

## Consequences

Claims stay true but are narrower. Adding a format means adding a fixture and a check, not only copy.
Headless Chromium lacks H.264, so verification uses the installed Chrome channel.

## Revisit if

Mediabunny or the browsers add a format and a real-file check passes.
