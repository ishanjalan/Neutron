# ADR-0008: Recover from stale cached HTML after a deploy

- Status: accepted
- Date: 2026-11-12 (written retrospectively)
- Related: commit `4d336c7`; inline script in each `app.html`; `tests/e2e/smoke/` stale-reload test

## Context

Apps are static sites on GitHub Pages. After a deploy, a visitor holding cached HTML requests script
chunks whose hashed filenames no longer exist (404), and the page breaks. There is no server we
control to fix cache headers.

## Decision

Each `app.html` carries a small inline script. On a module-script 404, a `vite:preloadError`, or a
dynamic-import failure it reloads the page once. A 60-second `sessionStorage` guard
(`neutron-stale-reload`) prevents reload loops.

## Consequences

Visitors recover from a deploy without manual cache clearing. The script is duplicated across four
`app.html` files and must be changed in all of them. A real outage (not a stale deploy) reloads once
and then shows the normal failure.

## Revisit if

Hosting moves to a platform where we control cache headers.
