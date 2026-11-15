# base-mcp

MCP server framework (`@nocoo/base-mcp`) with OAuth 2.1 helpers, entity CRUD tools, Streamable HTTP support and testing utilities.
Profile: cli-library.
Human overview: [README.md](README.md). Frameworks must not rewrite this file. Maintain this root `AGENTS.md` as the only project handbook; do not create a `CLAUDE.md` alias, copy or import.

## Sources of Truth

This file is the contract; hooks, CI and configuration enforce it. Raise weaker enforcement instead of lowering this contract.

| Fact          | Where                                                        |
| ------------- | ------------------------------------------------------------ |
| Human docs    | [README.md](README.md)                                       |
| Version       | `package.json` version; display with a `v` prefix            |
| Enforcement   | `.github/workflows/ci.yml`, `vitest.config.ts`, `biome.json` |
| Install       | `packageManager: pnpm@10.33.0`, `pnpm-lock.yaml`             |
| Machine rules | Global `AGENTS.md` and `rules/`                              |
| Accidents     | [Retrospective.md](Retrospective.md)                         |

## Project Invariants

- Use pnpm and its committed lockfile; never invent a `bun.lock` to satisfy stale hooks.
- Publish `dist/` and README; `dist/` stays gitignored. `prepublishOnly` runs `pnpm build`.
- `@modelcontextprotocol/sdk` and `zod` remain peer dependencies rather than duplicated runtime dependencies.
- Consumers host HTTP and own credentials such as `AUTH_URL`. OAuth discovery under `/.well-known/` stays public; callback redirects must pass the loopback-only validation.
- Preserve entity-driven projection, ID/slug resolution, response conventions and authorization helpers. Library tests must use fake credentials and local in-memory stores.
- The `prepare` script installs Husky. Hooks invoke pnpm and scan the committed `pnpm-lock.yaml`; preserve the declared package manager.

## Stack / Layout

| Component                     | Choice                                                      |
| ----------------------------- | ----------------------------------------------------------- |
| Language                      | Strict TypeScript 7; test files excluded from emitted build |
| Runtime                       | Library for Node ≥26; CI uses Node 26.12.1                  |
| Install / lint                | pnpm 10.33.0; Biome, zero warnings                          |
| Tests                         | Vitest/V8; no standalone deployed application               |
| `src/auth/`                   | OAuth, origins, PKCE and tokens                             |
| `src/framework/`              | Entity CRUD tools and data adapters                         |
| `src/server/`, `src/testing/` | Server factory and mock contexts/token stores               |

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

Quality follows `system1-quality` (v1.3.0) with 12 canonical slots (`impl`, `todo`, `na`) and `nocoo/base-ci` v2026.15 (`777bbe4f9bacab8a91d8c01974480a6ee23d28e0`) in native mode (`quality-slots.yml`).

| Slot             | Required proof                                                           | Status            | Current enforcement / gap                                                                           |
| ---------------- | ------------------------------------------------------------------------ | ----------------- | --------------------------------------------------------------------------------------------------- |
| S1: Types        | Strict TypeScript (`pnpm run typecheck`)                                 | enforced (`impl`) | `.husky/pre-commit` index snapshot & CI `s1-types`                                                  |
| S2: Lint         | Biome check-only (`pnpm run lint`)                                       | enforced (`impl`) | `.husky/pre-commit` index snapshot & CI `s2-lint`                                                   |
| S3: Workflow     | `actionlint` + 40-char SHA pinning                                       | enforced (`impl`) | CI `s3-workflow`                                                                                    |
| G1: Secrets      | Gitleaks scan (`.gitleaks.toml`)                                         | enforced (`impl`) | Staged `gitleaks protect` in pre-commit & CI `g1-secrets`                                           |
| G2: Dependencies | `osv-scanner` (`osv-scanner.toml`, `pnpm-lock.yaml`)                     | enforced (`impl`) | Pre-push & CI `g2-dependencies`                                                                     |
| B1: Build        | Emitted package and declarations (`pnpm run build`)                      | enforced (`impl`) | `prepublishOnly` & CI `b1-build`                                                                    |
| L1: Unit         | Vitest statements/branches/functions/lines each ≥95%, no `.skip`/`.only` | enforced (`impl`) | `.husky/pre-commit` index snapshot (`test:coverage`) & CI `l1-unit` (measured <30s on Node 26.12.1) |
| L2: Runtime      | Cloudflare Worker / platform runtime bindings                            | N/A (`na`)        | Node MCP library, not a Cloudflare Worker project                                                   |
| L3: Integration  | Real local HTTP exercising MCP/OAuth transport integration               | planned (`todo`)  | Current tests exercise modules/server construction; no real HTTP transport acceptance runner exists |
| L4: E2E          | Browser / UI journey                                                     | N/A (`na`)        | Library with no browser UI                                                                          |
| P1: Package      | `ci:package` / `package-check` command                                   | planned (`todo`)  | Publishes `@nocoo/base-mcp` to npm; package CI gate not yet wired                                   |
| Z1: Gate         | Aggregate all `impl` slots & SHA consistency                             | enforced (`impl`) | CI `z1-gate` (`quality / Z1: Gate`)                                                                 |

CI runs `.github/workflows/ci.yml` -> `./.github/workflows/quality-slots.yml` (`v2026.15` composite actions), gated on `quality / Z1: Gate`.
The installed pre-commit gates unified L1 on the index snapshot (types, check-only lint, coverage at the required thresholds, plus staged Gitleaks); pre-push runs pnpm build/coverage/lint/typecheck plus OSV against `pnpm-lock.yaml`.
Target local gates: L1 on the index snapshot in <30s (enforced on pre-commit); L3+G2 on the commits named by stdin push refs in <3min (pre-push still inspects the working tree). Never disable a configured hook to get a commit or push through.
Hooks are check-only; `--no-verify` is forbidden on commits and branch pushes.

## Operations / Release

Only authorized npm maintainers publish. Review and commit the intended version, push normally to `main`, wait for CI, then use `pnpm publish --publish-branch main`; the default publish-branch is otherwise `master`.
Do not use `--no-git-checks`, bypass broken installed hooks, or publish a version missing from `origin/main`. There is no release script, changelog generator or automatic GitHub release step.
`prepublishOnly` builds before publication. Confirm the result with `npm view @nocoo/base-mcp version`.

## Retrospective

Narratives remain in [Retrospective.md](Retrospective.md); recurring rules belong here, cross-project lessons in global rules/nmem, deterministic requirements in tests/hooks.

- Preserve the pnpm toolchain and four-metric 95% coverage thresholds; assess remaining L2 and pre-push snapshot gaps separately.
