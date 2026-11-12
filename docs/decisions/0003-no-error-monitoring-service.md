# ADR-0003: No third-party error monitoring (Sentry removed)

- Status: accepted
- Date: 2026-11-12
- Related: commit `c083ad8` (PR #4)

## Context

Squish carried `@sentry/sveltekit`, client/server hooks, and monitoring helpers, but no DSN was
configured anywhere, so nothing was ever reported. It still cost bundle size: the Squish app entry
chunk was 266 KB and dropped to 1 KB once removed (measured). The apps process user files entirely
in the browser, and the sites advertise that files never leave the device.

## Decision

Remove Sentry and the unused monitoring code. Do not add an error-reporting service. Page views are
counted with GoatCounter only.

Rejected: configuring Sentry properly. It would send error data (URLs, stack traces, possibly file
names) to a third party, conflicts with the privacy promise, and has a running cost at scale.

## Consequences

Smaller bundles and one less dependency to patch. We do not hear about production errors unless a
user reports them or the e2e/a11y gates catch them.

## Revisit if

The apps gain a backend, or a bug class appears that users cannot report. Any replacement must be
self-hosted or strictly anonymous and must not capture file names or contents.
