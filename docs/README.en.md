<h1 align="center">base-mcp</h1>
<p align="center">Entity CRUD, OAuth and HTTP integration utilities for MCP servers.</p>
<p align="center"><a href="../README.md">简体中文</a></p>

## What it does

`@nocoo/base-mcp` is an MCP server library for entity tool registration, OAuth 2.1 helpers and Streamable HTTP integration in existing applications. Consumers own HTTP hosting, user authentication, data access and credential storage; this package is not a standalone deployment.

## Features

- Register list, get, create, update and delete tools from entity definitions and schemas.
- Use field projection, ID/slug resolution, lifecycle hooks and consistent tool responses.
- Integrate PKCE, OAuth metadata, loopback redirect checks, Origin validation and Bearer token checks.
- Test with mock contexts, result parsers and a mock token store.

## Usage

The package declares Node.js 18+. Consumers supply the SDK and Zod:

```sh
pnpm add @nocoo/base-mcp
pnpm add @modelcontextprotocol/sdk zod
```

```typescript
import { createMcpServer } from "@nocoo/base-mcp";
import { getOAuthMetadata } from "@nocoo/base-mcp/auth";

const server = createMcpServer({ name: "my-app", version: "1.0.0" });
const metadata = getOAuthMetadata("https://my-app.example");
```

Register entity data adapters and connect the MCP SDK Streamable HTTP transport. Keep OAuth discovery under `/.well-known/` public while validating Origin and tokens on business MCP routes. The [integration guide](integration.md) covers routes, CRUD and authorization; application data-layer functions in those examples must be implemented by the consumer.

## Development

Use pnpm 10.33.0 and `pnpm-lock.yaml`; CI uses Node.js 22.23.2.

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run build
```

`src/auth/` owns auth, `src/framework/` entity tools, `src/server/` server creation, and `src/testing/` test helpers. Builds emit `dist/` and declarations; `prepublishOnly` builds before publication.

## Tests

```sh
pnpm run test
pnpm run test:coverage
```

Vitest checks authentication helpers, entity CRUD, projection and server creation with fake credentials and in-memory stores. The repository does not yet provide complete real-HTTP transport acceptance tests.

## Stack

| Technology | Role |
| --- | --- |
| TypeScript | Public API, declarations and builds |
| MCP SDK, Zod | Protocol integration and input schemas |
| pnpm, Biome | Dependencies and static checks |
| Vitest | Module behavior and test-helper checks |

## Documentation

- [OAuth, HTTP and entity integration](integration.md).
- [Public exports](../src/index.ts) and [auth entry](../src/auth/index.ts).
- [Maintenance and publication](../CLAUDE.md).

## License

`package.json` declares MIT. The repository currently has no separate LICENSE text.
