# Contributing to MainTek

Thanks for helping. This page covers the mechanics; design discussions happen in issues.

## Set up

Follow the Quick start in the [README](README.md). You need Node 20+, npm 10+ and Docker.
`npm install` at the root installs every workspace.

## Branch and PR flow

1. Branch from `main`. Name it `<area>/<short-description>`, for example `web/kanban-dnd`.
2. Keep PRs focused. One feature or fix per PR, with a description that says what changed
   and how you verified it.
3. Commit messages follow Conventional Commits with the app as scope:
   `feat(web): ...`, `fix(api): ...`, `deps: ...`, `docs: ...`.
4. CI must be green: typecheck, lint, `npm audit` on production deps, and the marketing
   Playwright suite.
5. Merging to `main` deploys to production on Railway automatically. If a change needs a
   migration or a new environment variable, call it out in the PR description.

## Before you push

```bash
npm run typecheck
npm run lint
npm test --workspace=@maintek/api
```

## Database changes

- Change the entity, then `npm run migration:generate --workspace=@maintek/api -- src/database/migrations/<Name>`.
- Review the generated SQL. Prefer `IF NOT EXISTS` / `IF EXISTS` so migrations are safe to
  re-run, and never edit a migration that has shipped to `main`.
- Migrations run automatically when the API boots, in both development and production.

## Docs

- The root and per-app READMEs describe how to run things. Keep them accurate when you
  change a script, port, or environment variable.
- Longer guides live in the GitHub wiki, whose source is `docs/wiki/`. Edit the markdown
  there and run `scripts/publish-wiki.sh` (or let the maintainer do it after merge).
- Runbooks for operations (backups, Railway, staging) live in `docs/`.

## Reporting security issues

Email the maintainers rather than opening a public issue.
