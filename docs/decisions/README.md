# Decisions

Architecture Decision Records (ADRs): one short file per decision that is hard to reverse or easy to
forget the reason for. They exist so that people, and Claude in later sessions, can look up _why_
something is the way it is instead of reconstructing it from commit history.

## Rules

- **Read before you change.** Before changing tooling, dependencies policy, deployment, or an app's
  core behaviour, scan the index below and open anything relevant.
- **Write when deciding.** Add an ADR in the same PR as the decision. Copy [template.md](template.md),
  use the next number, add it to the index.
- **Never rewrite history.** An accepted ADR is not edited except to fix typos or change its status.
  To change a decision, write a new ADR and mark the old one `superseded by ADR-NNNN`.
- **Keep it short.** One page. State what was decided, why, and what would make us revisit it.
- **Format:** a trimmed [MADR](https://adr.github.io/madr/). Statuses: `proposed` → `accepted` →
  `deprecated` or `superseded by ADR-NNNN`.

## Index

| ADR                                            | Decision                                                                     | Status   |
| ---------------------------------------------- | ---------------------------------------------------------------------------- | -------- |
| [0001](0001-record-decisions-in-the-repo.md)   | Record decisions in the repo                                                 | accepted |
| [0002](0002-heic-lives-in-squish.md)           | HEIC converter app retired; HEIC handled inside Squish                       | accepted |
| [0003](0003-no-error-monitoring-service.md)    | No third-party error monitoring (Sentry removed)                             | accepted |
| [0004](0004-keep-eslint-prettier-not-biome.md) | Keep ESLint + Prettier; do not adopt Biome                                   | accepted |
| [0005](0005-pnpm-supply-chain-settings.md)     | pnpm 12 with opt-in install scripts and a 24h release-age gate               | accepted |
| [0006](0006-only-claim-formats-we-verified.md) | Only claim format support that has been verified                             | accepted |
| [0007](0007-squash-target-size-semantics.md)   | Squash "target size" is a ceiling the encoder is fitted to                   | accepted |
| [0008](0008-stale-deploy-recovery.md)          | Recover from stale cached HTML after a deploy                                | accepted |
| [0009](0009-knip-for-dead-code.md)             | knip is the dead-code tool; Rev-dep not adopted yet                          | accepted |
| [0010](0010-privacy-safe-event-counting.md)    | Count failures and downloads as GoatCounter events, by route and bucket only | accepted |

ADRs 0002–0009 were written retrospectively on 2026-11-12 from commit history and the session where
each decision was made. Their commits are listed in each file.
