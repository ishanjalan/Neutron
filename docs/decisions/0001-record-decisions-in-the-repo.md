# ADR-0001: Record decisions in the repo

- Status: accepted
- Date: 2026-11-12
- Related: [README](README.md), [template](template.md)

## Context

Neutron is maintained in occasional bursts by one person with Claude. Between sessions the reasons
behind decisions get lost: a question such as "why did we remove HEIC?" had to be answered by reading
commit messages across several months. Claude starts each session with no memory of earlier ones,
other than CLAUDE.md and its own notes.

## Decision

Keep one short ADR per significant decision in `docs/decisions/`, using a trimmed MADR template.
`CLAUDE.md` points to the folder; the index in the folder README is what gets read first, and
individual ADRs are opened only when relevant. ADRs are not imported into CLAUDE.md, because imported
files cost context in every session.

Rejected: a long architecture document as the only record (goes stale, mixes facts with reasons);
relying on commit messages (not searchable by topic); relying on Claude's personal memory files
(not visible to the repo, not reviewable).

## Consequences

Each decision costs a few minutes of writing. In return, later sessions can check intent before
changing something, and decisions can be reviewed in PRs like code.

## Revisit if

The folder grows past what an index can usefully summarise (roughly 50 ADRs), or the ADRs stop
being consulted.
