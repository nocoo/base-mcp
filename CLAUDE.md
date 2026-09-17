# base-mcp

MCP server framework (`@nocoo/base-mcp`) with OAuth 2.1 helpers, entity CRUD tools, Streamable HTTP support and testing utilities.
Profile: cli-library.
Direction: [README.md](README.md). Frameworks must not rewrite this file.

## Sources of Truth

This file is the contract; hooks, CI and configuration enforce it. Raise weaker enforcement instead of lowering this contract.

| Fact | Where |
|---|---|
| Human docs | [README.md](README.md) |
| Version | `package.json` version; display with a `v` prefix |
| Enforcement | `.github/workflows/ci.yml`, `vitest.config.ts`, `biome.json` |
| Install | `packageManager: pnpm@10.33.0`, `pnpm-lock.yaml` |
| Machine rules | Global `AGENTS.md` and `rules/` |
| Accidents | [Retrospective.md](Retrospective.md) |

## Project Invariants

- Use pnpm and its committed lockfile; never invent a `bun.lock` to satisfy stale hooks.
- Publish `dist/` and README; `dist/` stays gitignored. `prepublishOnly` runs `pnpm build`.
- `@modelcontextprotocol/sdk` and `zod` remain peer dependencies rather than duplicated runtime dependencies.
- Consumers host HTTP and own credentials such as `AUTH_URL`. OAuth discovery under `/.well-known/` stays public; callback redirects must pass the loopback-only validation.
- Preserve entity-driven projection, ID/slug resolution, response conventions and authorization helpers. Library tests must use fake credentials and local in-memory stores.
- Existing `.husky/` files still invoke Bun and the missing `bun.lock`; no prepare script installs them. Do not describe these as a working pnpm gate.

## Stack / Layout

| Component | Choice |
|---|---|
| Language | Strict TypeScript 7; test files excluded from emitted build |
| Runtime | Library for Node ≥18; CI uses Node 22.23.2 |
| Install / lint | pnpm 10.33.0; Biome, zero warnings |
| Tests | Vitest/V8; no standalone deployed application |
| `src/auth/` | OAuth, origins, PKCE and tokens |
| `src/framework/` | Entity CRUD tools and data adapters |
| `src/server/`, `src/testing/` | Server factory and mock contexts/token stores |

## Commands

Run from the root with pnpm 10.33.0 and a supported Node runtime. Tests need no production services or secrets.

```bash
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test
pnpm run test:coverage
```

`build` emits the package and declarations. A passing typecheck alone is insufficient for publication.

## Verification

6DQ = L1/L2/L3 + G1/G2 + D1. Status: `enforced`, `planned`, `manual`, `N/A`.

| Dimension | Required proof | Status | Current enforcement / gap |
|---|---|---|---|
| L1 logic | Statements, branches, functions and lines each ≥95%; no `.skip` / `.only` | planned | CI invokes coverage but actual thresholds are 90/85/90/90; barrel/test exclusions remain. Biome forbids skipped/focused tests |
| L2 transport | Real local HTTP exercising MCP/OAuth transport integration | planned | Current tests exercise modules/server construction; no real HTTP transport acceptance runner exists |
| L3 user workflow | Standalone CLI or UI journey | N/A | This repository ships a library with no executable CLI or UI; consumer-facing transport behavior still requires L2 integration |
| G1 static | Strict types and check-only lint; zero errors/warnings | enforced | CI invokes `typecheck` and `lint`; compiler excludes test files |
| G2 security | Secret and dependency scans; missing scanner fails | enforced | Current pinned `base-ci/quality.yml` scans `pnpm-lock.yaml` with `osv-scanner.toml` and `.gitleaks.toml`; local hook repair remains planned |
| D1 isolation | Local fake state, separate from production/daily-dev, guarded teardown | planned | Unit mocks are in-memory; a guarded per-run local transport harness is still absent |
| Build | Emitted package/declarations | enforced | CI prepares with `pnpm run build`; `prepublishOnly` also builds |
| Docs / release | README API and intended version review | manual | Maintainer review and pnpm publication checks |

CI pins `nocoo/base-ci/.github/workflows/quality.yml@ad43150de3a2be2fa464b5cd2f921dc4fa9f8f0f`; the former claim that CI has no security scanners is obsolete.
The checked-in pre-commit calls Bun typecheck/lint/test plus staged Gitleaks; pre-push calls Bun build/coverage/lint/typecheck plus OSV against missing `bun.lock`. They are not installed by the manifest.
Target local gates remain planned: G1+L1 on an index snapshot in <30s; L2+G2 on the commits named by stdin push refs in <3min. Retarget and install hooks before relying on them. Never disable a configured hook to get a commit or push through.
Hooks are check-only; `--no-verify` is forbidden on commits and branch pushes.

## Operations / Release

Only authorized npm maintainers publish. Review and commit the intended version, push normally to `main`, wait for CI, then use `pnpm publish --publish-branch main`; the default publish-branch is otherwise `master`.
Do not use `--no-git-checks`, bypass broken installed hooks, or publish a version missing from `origin/main`. There is no release script, changelog generator or automatic GitHub release step.
`prepublishOnly` builds before publication. Confirm the result with `npm view @nocoo/base-mcp version`.

## Retrospective

Narratives remain in [Retrospective.md](Retrospective.md); recurring rules belong here, cross-project lessons in global rules/nmem, deterministic requirements in tests/hooks.
- Preserve the pnpm toolchain; the existing 90/85 thresholds are implementation gaps against the required four-metric 95% contract.
