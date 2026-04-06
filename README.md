# @nocoo/base-mcp

MCP Server development framework with OAuth 2.1, Entity-Driven CRUD, and Streamable HTTP transport support.

## Features

- **Entity-Driven CRUD Framework**: Declarative entity definitions → automatic MCP tool generation
- **OAuth 2.1 Support**: PKCE, Dynamic Client Registration, token management
- **DNS Rebinding Protection**: Origin validation for HTTP transport
- **Testing Utilities**: Mock context, result parsing, token store mocking

## Installation

```bash
pnpm add @nocoo/base-mcp
```

Peer dependencies:
```bash
pnpm add @modelcontextprotocol/sdk zod
```

## Quick Start

```typescript
import { createMcpServer, registerEntityTools, ok, error } from "@nocoo/base-mcp";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

// 1. Create MCP Server
const server = createMcpServer({
  name: "my-app",
  version: "1.0.0",
});

// 2. Define an Entity
const productEntity = {
  name: "product",
  display: "Product",
  plural: "products",
  dataLayer: {
    list: async (ctx, opts) => ctx.repos.products.list(opts),
    getById: async (ctx, id) => ctx.repos.products.getById(id),
    create: async (ctx, input) => ctx.repos.products.create(input),
    update: async (ctx, id, input) => ctx.repos.products.update(id, input),
    delete: async (ctx, id) => ctx.repos.products.delete(id),
  },
  schemas: {
    list: { category: z.string().optional() },
    create: { name: z.string(), price: z.number() },
    update: { name: z.string().optional(), price: z.number().optional() },
  },
};

// 3. Register Entity Tools
const ctx = { repos: createRepos(db) };
registerEntityTools(server, productEntity, ctx);

// 4. Handle HTTP requests (Hono/Cloudflare Worker example)
app.post("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});
```

## API Reference

### Server

```typescript
import { createMcpServer } from "@nocoo/base-mcp";

const server = createMcpServer({
  name: "my-server",
  version: "1.0.0",
  capabilities: { tools: true, resources: false },
});
```

### Framework

```typescript
import {
  // Entity registration
  registerEntityTools,
  registerCustomTool,
  createCrudHandlers,
  
  // Response builders
  ok,
  error,
  
  // Field projection
  projectFields,
  
  // ID/Slug resolution
  validateIdOrSlug,
  resolveEntity,
  isResolveError,
} from "@nocoo/base-mcp";
```

### Auth

```typescript
import {
  // PKCE
  verifyPkceS256,
  generateCodeVerifier,
  generateCodeChallenge,
  isLoopbackRedirectUri,
  
  // OAuth Metadata
  getOAuthMetadata,
  
  // Origin Validation
  validateOrigin,
  isLoopbackHost,
  
  // Token Management
  generateToken,
  hashToken,
  tokenPreview,
  extractBearerToken,
  validateMcpToken,
} from "@nocoo/base-mcp/auth";
```

### Testing

```typescript
import {
  createMockContext,
  parseToolResult,
  isToolError,
  getToolErrorMessage,
  createMockTokenStore,
} from "@nocoo/base-mcp/testing";
```

## Entity Configuration

```typescript
interface EntityConfig<T, TRepos> {
  name: string;           // Singular name (e.g., "product")
  display: string;        // Human-readable name
  plural: string;         // Plural name for list tool
  
  dataLayer: {
    list: (ctx, opts) => Promise<T[]>;
    getById: (ctx, id) => Promise<T | null>;
    getBySlug?: (ctx, slug) => Promise<T | null>;
    create?: (ctx, input) => Promise<T>;
    update?: (ctx, id, input) => Promise<T | null>;
    delete?: (ctx, id) => Promise<boolean>;
  };
  
  schemas?: {
    list?: Record<string, ZodType>;
    create?: Record<string, ZodType>;
    update?: Record<string, ZodType>;
  };
  
  descriptions?: {
    list?: string;
    get?: string;
    create?: string;
    update?: string;
    delete?: string;
  };
  
  projection?: {
    omit: string[];
    groups: Record<string, string[]>;
  };
  
  hooks?: {
    beforeCreate?: (ctx, input) => Promise<Record<string, unknown>>;
    afterCreate?: (ctx, entity) => Promise<void>;
    beforeUpdate?: (ctx, id, input, existing) => Promise<Record<string, unknown>>;
    afterUpdate?: (ctx, id, input, result) => Promise<void>;
    beforeDelete?: (ctx, id, existing) => Promise<void>;
    afterDelete?: (ctx, id) => Promise<void>;
  };
}
```

## License

MIT
