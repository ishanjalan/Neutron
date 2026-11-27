# ADR-0012: Failure events carry a cause from a fixed list

- Status: accepted
- Date: 2026-11-28
- Related: ADR-0010 (extends it); `failureCause` in `packages/utils/src/analytics.ts`

## Context

The first two weeks of events showed "unsupported" as Squash's main failure, but the word covers
very different problems (a source codec that cannot be decoded, a missing encoder, no WebCodecs, an
unreadable file), each needing a different response. We could not tell them apart.

## Decision

Add an optional cause to the event name: `error: <route> (<kind>: <cause>)`. Causes come only from
words chosen in code: `decode-<codec>` (codec from an allow-list, else `other`), `encode-<codec>`,
`encode-audio`, `no-webcodecs`, `unreadable-file`, `avi`, `heic`, and for too-large `resolution`,
`buffer`, `storage`. When nothing matches, no cause is sent. ADR-0010's rule stands: no file names,
contents, messages or user-typed values.

## Consequences

Old events without a cause and new ones with it appear as separate rows in GoatCounter. Causes for
"too-large" rest on keyword guesses, because we have no confirmed source for those failures yet.
Also fixed: the "WebCodecs not supported" path showed an error on the card but was never counted.

## Revisit if

Most failures still arrive without a cause: extend the list from reproduced cases, never by sending
the message.
