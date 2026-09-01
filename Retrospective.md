# Retrospective

Accident narratives for this repo.

Routing: narrative stays here. A project-specific rule that will recur may become one line in `CLAUDE.md`. Cross-project lessons go to nmem or a global rule. If it can be checked by a machine, add a hook or test instead of prose.

## Husky copied from Bun repos onto a pnpm package

- **What:** `.husky/pre-commit` and `pre-push` run `bun run …` and `osv-scanner --lockfile=bun.lock`. This repo is pnpm (`pnpm-lock.yaml`), has no `bun.lock`, and `package.json` has no `prepare`.
- **Why:** hooks were copied from a Bun 6DQ template without retargeting the package manager or lockfile.
- **Follow-up:** CLAUDE recurring rule. Do not add a fake `bun.lock`. Raise: rewrite hooks to `pnpm` + `pnpm-lock.yaml` and add `prepare`.
