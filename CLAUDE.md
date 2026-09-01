# base-mcp

MCP server framework (`@nocoo/base-mcp`): OAuth 2.1 helpers, entity-driven CRUD tools, Streamable HTTP, testing utils.
Profile: cli-library
Direction: [README.md](README.md). No `docs/` tree. Frameworks must not rewrite this file.

## Sources of Truth

This file is the **contract**. Hooks, CI, and config are **enforcement**. If they disagree, that is a failure — raise enforcement; never lower this file to a weaker hook.

| Fact | Where |
|---|---|
| Agent handbook | this file |
| Human docs | README.md |
| Version | `package.json` `"version"` |
| Enforcement | `.husky/*`, `.github/workflows/ci.yml`, `vitest.config.ts`, `biome.json` |
| Machine rules | global `AGENTS.md`, `rules/git-commit.md` |
| Accidents | [Retrospective.md](Retrospective.md) |
| Env files | omit (consumers own `AUTH_URL`) |

## Project Invariants

- Package manager is **pnpm** (`packageManager` `pnpm@10.33.0`, `pnpm-lock.yaml`). There is no `bun.lock`.
- Ship `files: ["dist", "README.md"]`. `dist/` is gitignored. `prepublishOnly` runs `pnpm build`.
- Peer deps: `@modelcontextprotocol/sdk` and `zod`. Do not add them as runtime deps.
- OAuth discovery `/.well-known/` must be public on the consumer app. Loopback redirect URIs only (`isLoopbackRedirectUri`).
- Coverage thresholds are 90% statements/lines/functions, 85% branches — not 95%. Excludes `src/**/*.test.ts` and `src/**/index.ts`.
- `.husky/*` still call `bun run` and `osv-scanner --lockfile=bun.lock`. `package.json` has no `prepare` script. Do not treat those hooks as a working pnpm gate.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | TypeScript 7 strict |
| Package manager | pnpm 10 |
| Runtime | library (Node ≥18); consumers host HTTP |
| Lint | Biome `check --error-on-warnings .` (`noSkippedTests`/`noFocusedTests` error) |
| Tests | Vitest L1 (90/85/90/90) |
| Data | none |

```
src/auth/        OAuth 2.1, origin, PKCE, tokens
src/framework/   entity CRUD tools
src/server/      createMcpServer
src/testing/     mock context / token store
```

## Commands

```bash
pnpm install
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test
pnpm run test:coverage
```

## Verification

Status: `enforced` | `planned` | `manual` | `N/A`. `enforced` Evidence = hook/CI/config/script. `planned` has no Evidence. `manual` = human checklist.

Org gaps to raise later (do not lower this file): index-snapshot pre-commit; stdin-range pre-push; hooks on pnpm (not bun); G2 osv on `pnpm-lock.yaml`; gitleaks in CI; coverage 95%; `prepare` to install husky.

Today: CI (pnpm, Node 22) runs `build`, `typecheck`, `lint`, `test:coverage`. No gitleaks, no osv. pre-commit is `bun run typecheck/lint/test` + `gitleaks protect --staged`. pre-push is `bun run build && test:coverage && lint && typecheck` then osv on missing `bun.lock`.

| Change | Proof | Status | Evidence |
|---|---|---|---|
| Logic | L1 vitest ≥90% stmt/line/func, 85% branches | enforced | CI → `pnpm run test:coverage`; `vitest.config.ts`. pre-commit `bun run test` has no thresholds and may not run |
| API L2 | — | N/A | — |
| UI L3 | — | N/A | — |
| Types / lint | tsc + Biome 0 warning | enforced | CI → `typecheck`, `lint`. tsc excludes `**/*.test.ts` |
| G2 secrets | gitleaks | planned | pre-commit file calls `gitleaks protect --staged`; CI does not |
| G2 deps | osv-scanner | planned | pre-push file targets missing `bun.lock`; CI does not run osv |
| `.skip` / `.only` | Biome error | enforced | `biome.json`; CI `lint` |
| Bundler | `tsc` → `dist/` | enforced | CI → `pnpm run build`; `prepublishOnly` |
| Docs | README if public API changes | manual | human review |
| Release | version + `pnpm publish` | manual | operator; `prepublishOnly` builds |

| Hook | Org bar | Status | Evidence |
|---|---|---|---|
| pre-commit | index snapshot for G1+L1 | planned | — |
| pre-push | stdin ref range | planned | — |

`--no-verify` forbidden on commits and branch pushes. Tag-only may skip.

## Operations / Release

- Entry: bump `package.json` `"version"`, then `pnpm publish`. Who: npm publish rights on `@nocoo/base-mcp`.
- `prepublishOnly` runs `pnpm build`. There is no release script, changelog generator, or GitHub release step.
- Live-check: `npm view @nocoo/base-mcp version`.

## Retrospective

| Kind | Where |
|---|---|
| Accident narrative | [Retrospective.md](Retrospective.md) |
| Recurring project rule | one line here (cap ~10) |
| Cross-project | nmem / global rules |
| Checkable rule | hook or test |

- Package manager is pnpm; do not add a `bun.lock` to make the current hooks look valid.
- Coverage bar is 90/85, not 95.
