# base-mcp

MCP server framework (`@nocoo/base-mcp`) with OAuth 2.1 helpers, entity-driven CRUD tools, Streamable HTTP support, and testing utilities for Node >=26 (library only; no standalone deployed service).
Docs: [README.md](README.md) · [Integration Guide](docs/integration.md) · [Retrospective](Retrospective.md)

## Commands

Run from root with `pnpm@10.33.0` and Node >=26 (CI uses Node 26.12.1). Tests require no production services or secrets.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck       # S1: strict TypeScript 7
pnpm run lint            # S2: Biome check-only, 0 warnings
pnpm run build           # B1: emits dist/ and .d.ts (tests excluded)
pnpm run test            # Vitest run
pnpm run test:coverage   # L1: >=95% statements/branches/functions/lines
```

`build` emits the package and type declarations; a passing `typecheck` alone is insufficient for publication.

## Layout

- `src/auth/` (`./auth`, re-exported by `.`): OAuth 2.1 metadata, origins, PKCE, and bearer token helpers.
- `src/framework/` (`./framework`, re-exported by `.`): Entity CRUD tool builders, projection, ID/slug resolution, and data adapters.
- `src/server/` (`.`): MCP server factory (`createMcpServer`).
- `src/testing/` (`./testing`): Mock contexts, result parsers, and in-memory token stores.

## Invariants

- **Contract first**: Raise weaker hooks, CI, or config enforcement instead of lowering this contract.
- **Toolchain**: Use `pnpm@10.33.0` and committed `pnpm-lock.yaml`; never invent a `bun.lock` for stale hooks.
- **Peer dependencies**: Keep `@modelcontextprotocol/sdk` and `zod` in `peerDependencies`, never duplicated as runtime dependencies.
- **Packaging & version**: `package.json` is the version source of truth (display with `v` prefix). Publish only `dist/` and `README.md`; `dist/` stays gitignored and `prepublishOnly` runs `pnpm build`.
- **Auth boundaries**: Consumers host HTTP and own credentials (e.g., `AUTH_URL`). OAuth discovery under `/.well-known/` stays public; callback redirects must pass loopback-only validation.
- **API & test isolation**: Preserve entity-driven projection, ID/slug resolution, response conventions, and auth helpers. Library tests must use fake credentials and local in-memory stores.
- **Release**: Authorized npm maintainers only (with explicit approval): commit version, push to `main`, wait for CI, run `pnpm publish --publish-branch main`, then confirm via `npm view @nocoo/base-mcp version`.
- **Release guardrails**: Default publish branch is `master`. Never use `--no-git-checks` or publish commits absent from `origin/main`; no release script, changelog generator, or automatic GitHub release exists.

## Quality & Local Gates

Follows `system1-quality`; CI runs `.github/workflows/ci.yml` -> `.github/workflows/quality-slots.yml`, which owns slot definitions and the pinned `base-ci` revision (`quality / Z1: Gate` required on `main`). Status vocabulary: `enforced`, `planned`, `manual`, `N/A`.

- **Coverage & lint**: `L1` enforces Vitest/V8 >=95% across statements, branches, functions, and lines on `src/**/*.ts` (excluding `src/**/*.test.ts` and `src/**/index.ts`); Biome errors on `.skip`/`.only`.
- **Exceptions (`N/A`)**: `L2 Runtime` (Node MCP library, not a Cloudflare Worker) and `L4 E2E` (library with no browser UI).
- **Gaps (`planned`)**: `L3 Integration` (no real local HTTP MCP/OAuth transport acceptance runner yet) and `P1 Package` (no `ci:package` / `package-check` CI gate wired yet).
- **Local hooks**: Installed via `prepare` (`husky`, `.husky/`); hooks are check-only, use `pnpm` and `pnpm-lock.yaml`, and must never be disabled or bypassed with `--no-verify`.
- **Pre-commit (`enforced`, <30s)**: Checks staged index snapshot (`G1` staged Gitleaks, `S1`, `S2`, `L1` coverage); staged `package.json` and `pnpm-lock.yaml` must match installed worktree copies.
- **Pre-push**: Runs `build`, `test:coverage`, `lint`, `typecheck`, and `G2` (`osv-scanner` on `pnpm-lock.yaml`). Target <3min; `planned` gap: inspects working tree (not stdin push refs) and omits `L3`.

## Retrospective

Record incident narratives in [Retrospective.md](Retrospective.md); promote recurring project constraints to `Invariants` above and enforceable safeguards to tests or hooks.
