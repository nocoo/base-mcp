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

## Full Integration Guide

This guide covers the complete setup for integrating MCP with OAuth 2.1 authentication in a Next.js/Hono app.

### Architecture Overview

```
┌─────────────────┐     ┌──────────────────────────────────────┐
│   MCP Client    │     │           Your App                    │
│ (Claude Code,   │     │  ┌─────────────────────────────────┐  │
│  Cursor, etc.)  │────▶│  │ /.well-known/oauth-auth-server │  │  OAuth Discovery
│                 │     │  └─────────────────────────────────┘  │
│                 │     │                                        │
│                 │────▶│  /api/mcp/register  (Client Reg)      │
│                 │────▶│  /api/mcp/authorize (Auth Start)      │
│                 │────▶│  /api/mcp/callback  (Auth Complete)   │
│                 │────▶│  /api/mcp/token     (Token Exchange)  │
│                 │     │                                        │
│                 │────▶│  /api/mcp           (MCP Endpoint)    │
└─────────────────┘     └──────────────────────────────────────┘
```

### Step 1: OAuth Discovery Endpoint

Create `/.well-known/oauth-authorization-server` to expose OAuth metadata.

**CRITICAL**: This endpoint must NOT be protected by authentication.

```typescript
// src/app/.well-known/oauth-authorization-server/route.ts
import { getOAuthMetadata } from "@nocoo/base-mcp/auth";
import { NextResponse } from "next/server";

export function GET() {
  // Use environment variable or derive from request
  const issuer = process.env.AUTH_URL ?? "http://localhost:3000";
  const metadata = getOAuthMetadata(issuer);

  return NextResponse.json(metadata, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
```

The metadata includes:
- `authorization_endpoint`: `/api/mcp/authorize`
- `token_endpoint`: `/api/mcp/token`
- `registration_endpoint`: `/api/mcp/register`

### Step 2: Middleware Configuration

Ensure `/.well-known/` is publicly accessible without authentication:

```typescript
// middleware.ts or proxy-logic.ts
const PUBLIC_PATHS = [
  "/login",
  "/terms",
  "/privacy",
  "/.well-known/",  // OAuth metadata - must be public
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}
```

### Step 3: OAuth Endpoints

#### 3.1 Dynamic Client Registration (`/api/mcp/register`)

```typescript
// src/app/api/mcp/register/route.ts
import { isLoopbackRedirectUri } from "@nocoo/base-mcp/auth";
import { createMcpClient } from "@/data/mcp-clients"; // Your data layer

export async function POST(request: Request) {
  const body = await request.json();

  // Validate redirect_uris (loopback only for security)
  for (const uri of body.redirect_uris) {
    if (!isLoopbackRedirectUri(uri)) {
      return errorResponse("Only loopback redirect URIs are allowed");
    }
  }

  const client = await createMcpClient(db, {
    client_name: body.client_name,
    redirect_uris: body.redirect_uris,
    grant_types: body.grant_types ?? ["authorization_code"],
  });

  return jsonResponse({
    client_id: client.client_id,
    client_name: client.client_name,
    redirect_uris: JSON.parse(client.redirect_uris),
    grant_types: JSON.parse(client.grant_types),
    token_endpoint_auth_method: "none",
  }, 201);
}
```

#### 3.2 Authorization (`/api/mcp/authorize`)

```typescript
// src/app/api/mcp/authorize/route.ts
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;

  // Required OAuth params
  const responseType = params.get("response_type"); // Must be "code"
  const clientId = params.get("client_id");
  const redirectUri = params.get("redirect_uri");
  const codeChallenge = params.get("code_challenge");
  const codeChallengeMethod = params.get("code_challenge_method"); // Must be "S256"
  const state = params.get("state");

  // Store auth session keyed by state
  await createAuthSession(db, {
    state,
    client_id: clientId,
    redirect_uri: redirectUri,
    code_challenge: codeChallenge,
    code_challenge_method: codeChallengeMethod,
    scope,
    expires_at: now + AUTH_CODE_TTL,
  });

  // Check if user already authenticated
  const session = await auth();
  if (session?.user?.email) {
    return NextResponse.redirect(`/api/mcp/callback?state=${state}`);
  }

  // Redirect to login
  return NextResponse.redirect(`/login?callbackUrl=/api/mcp/callback?state=${state}`);
}
```

#### 3.3 Callback (`/api/mcp/callback`)

```typescript
// src/app/api/mcp/callback/route.ts
export async function GET(request: Request) {
  const state = new URL(request.url).searchParams.get("state");

  // Verify user is authenticated
  const session = await auth();
  if (!session?.user?.email) {
    return errorResponse("Authentication required", 401);
  }

  // Look up auth session
  const authSession = await getAuthSessionByState(db, state);
  if (!authSession) {
    return errorResponse("Invalid or expired session");
  }

  // Generate authorization code
  const code = randomBytes(32).toString("hex");
  await upgradeAuthSession(db, state, code, session.user.email);

  // Redirect to client's redirect_uri
  const redirectUrl = new URL(authSession.redirect_uri);
  redirectUrl.searchParams.set("code", code);
  redirectUrl.searchParams.set("state", state);

  return NextResponse.redirect(redirectUrl.toString());
}
```

#### 3.4 Token Exchange (`/api/mcp/token`)

```typescript
// src/app/api/mcp/token/route.ts
import { verifyPkceS256 } from "@nocoo/base-mcp/auth";

export async function POST(request: Request) {
  const body = await request.formData();
  const grantType = body.get("grant_type");

  if (grantType === "authorization_code") {
    const code = body.get("code");
    const codeVerifier = body.get("code_verifier");

    // Look up and validate auth code
    const authCode = await getAuthCodeByCode(db, code);

    // Verify PKCE
    const pkceValid = await verifyPkceS256(codeVerifier, authCode.code_challenge);
    if (!pkceValid) {
      return oauthError("invalid_grant", "PKCE verification failed");
    }

    // Issue tokens
    return jsonResponse({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_TTL,
      refresh_token: refreshToken,
      scope,
    });
  }

  if (grantType === "refresh_token") {
    // Handle refresh token exchange
  }
}
```

### Step 4: MCP Endpoint

```typescript
// src/app/api/mcp/route.ts
import { validateMcpToken, validateOrigin } from "@nocoo/base-mcp/auth";

export async function POST(request: Request) {
  const siteUrl = process.env.AUTH_URL ?? "http://localhost:3000";

  // Step 1: Validate Origin (DNS rebinding protection)
  const origin = request.headers.get("origin");
  const originResult = validateOrigin(origin, siteUrl);
  if (!originResult.valid) {
    return errorResponse(originResult.error, originResult.status);
  }

  // Step 2: Validate Bearer token
  const authResult = await validateMcpToken(
    db,
    request.headers.get("authorization"),
  );
  if (!authResult.valid) {
    return errorResponse(authResult.error, authResult.status);
  }

  // Step 3: Create MCP server and handle request
  const server = createMcpServer(db);
  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true, // Stateless mode
  });

  await server.connect(transport);
  return transport.handleRequest(request);
}
```

### Step 5: MCP Configuration Page

Create a user-facing page to help configure MCP clients:

```typescript
// src/app/mcp-tokens/mcp-tokens-client.tsx
"use client";

function getMcpUrl(): string {
  if (typeof window === "undefined") {
    return "https://your-app.com/api/mcp";
  }
  // Dynamic URL derivation - no hardcoding
  const { protocol, hostname, port } = window.location;
  let baseUrl = `${protocol}//${hostname}`;
  if (port && port !== "80" && port !== "443") {
    baseUrl += `:${port}`;
  }
  return `${baseUrl}/api/mcp`;
}

export function McpConfigPage() {
  const mcpUrl = useMemo(() => getMcpUrl(), []);

  const configs = {
    "claude-code": `{
  "mcpServers": {
    "your-app": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`,
    "claude-desktop": `{
  "mcpServers": {
    "your-app": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "${mcpUrl}"]
    }
  }
}`,
  };

  // Render configuration tabs...
}
```

**Key principles:**
- Never hardcode domains - derive from `window.location`
- Use `type: "http"` for Claude Code (supports Streamable HTTP natively)
- Use `mcp-remote` bridge for Claude Desktop (requires stdio)

### Summary Checklist

- [ ] `/.well-known/oauth-authorization-server` returns JSON without auth
- [ ] Middleware allows `/.well-known/` paths through without login
- [ ] `/api/mcp/register` validates loopback redirect URIs
- [ ] `/api/mcp/authorize` stores auth session and redirects to login
- [ ] `/api/mcp/callback` generates auth code after login
- [ ] `/api/mcp/token` verifies PKCE and issues tokens
- [ ] `/api/mcp` validates origin and bearer token
- [ ] MCP config page derives URL dynamically (no hardcoding)

---

## Quick Start (Entity-Driven CRUD)

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
app.post("/api/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // Stateless
    enableJsonResponse: true,
  });
  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});
```

---

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
