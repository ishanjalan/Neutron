# ADR-0010: Count failures and downloads as GoatCounter events, by route and bucket only

- Status: accepted
- Date: 2026-11-12
- Related: ADR-0003; `packages/utils/src/analytics.ts`

## Context

GoatCounter only showed where visitors came from. We want to know where people fail, without
breaking the promise that files never leave the device or adding a consent banner. GoatCounter
stores aggregate data without cookies or IP addresses and says a consent notice is probably not
needed; that is the vendor's position, not legal advice.

## Decision

Send three kinds of GoatCounter events, each named from a fixed vocabulary:

- `error: <route> (<bucket>)`: from `toast.error` (shared) and from the caught-error sites that show
  an error on a card. The bucket comes from `classifyFailure`: unsupported, too-large, memory,
  password, network, invalid-input, crash, other.
- `download: <route>`: from the shared `downloadBlob`.
- `crash: <route>`: uncaught errors and unhandled promise rejections.

Never send file names, file contents, error messages, URLs the user typed, or counts derived from
user input. Event names are built only from the route (plain path characters, 60 chars max, else
`other`) and a bucket. New events must follow the same rule.

Reading it: pageviews on a tool route minus `download:` on that route is the drop-off; `error:` says
which bucket explains it. Squish's own save paths (File System Access API) do not go through
`downloadBlob`, so its download count is a lower bound.

Rejected: sending the error message (can contain file names); a funnel with per-upload events (many
separate DropZone implementations; not worth the surface); a different analytics tool.

## Consequences

Event cardinality is small and bounded. Classification is keyword-based, so some failures land in
`other`: if `other` dominates, improve the patterns, not the privacy rule.

## Revisit if

We add accounts or a backend, or GoatCounter changes how events or personal data are handled.
