# Retrospective

Accident narratives for this repo.

Routing: narrative stays here. A project-specific rule that will recur may become one line in `AGENTS.md`. Cross-project lessons go to nmem or a global rule. If it can be checked by a machine, add a hook or test instead of prose.

## Husky copied from Bun repos onto a pnpm package

- **What:** `.husky/pre-commit` and `pre-push` run `bun run …` and `osv-scanner --lockfile=bun.lock`. This repo is pnpm (`pnpm-lock.yaml`), has no `bun.lock`, and `package.json` has no `prepare`.
- **Why:** hooks were copied from a Bun 6DQ template without retargeting the package manager or lockfile.
- **Follow-up:** root-handbook recurring rule. Do not add a fake `bun.lock`. Raise: rewrite hooks to `pnpm` + `pnpm-lock.yaml` and add `prepare`.


## 2026-10-02 — Restore the declared pnpm gates

Dependency-duty preparation found dormant Bun hooks scanning a nonexistent bun.lock despite the pnpm contract. The baseline coverage command passed its old threshold while branch coverage was only92.66%, below the documented95% contract. Retarget the preserved checks to pnpm and pnpm-lock.yaml, install Husky through prepare, raise the four thresholds to95%, and cover CRUD notification failures, lookup/update races and slug adapters. Never infer handbook compliance from a weaker green command.
