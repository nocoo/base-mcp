import { describe, it, expect, vi } from "vitest";
import {
  generateToken,
  hashToken,
  tokenPreview,
  extractBearerToken,
  validateMcpToken,
  type TokenStore,
} from "./token.js";

// ---------------------------------------------------------------------------
// generateToken
// ---------------------------------------------------------------------------

describe("generateToken", () => {
  it("generates a 64-character hex string by default", () => {
    const token = generateToken();
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[a-f0-9]+$/);
  });

  it("generates tokens of specified length", () => {
    const token = generateToken(16);
    expect(token).toHaveLength(32); // 16 bytes = 32 hex chars
  });

  it("generates unique tokens", () => {
    const t1 = generateToken();
    const t2 = generateToken();
    expect(t1).not.toBe(t2);
  });
});

// ---------------------------------------------------------------------------
// hashToken
// ---------------------------------------------------------------------------

describe("hashToken", () => {
  it("returns a 64-character hex string", async () => {
    const hash = await hashToken("test-token");
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[a-f0-9]+$/);
  });

  it("is deterministic", async () => {
    const h1 = await hashToken("same-input");
    const h2 = await hashToken("same-input");
    expect(h1).toBe(h2);
  });

  it("produces different hashes for different inputs", async () => {
    const h1 = await hashToken("input-1");
    const h2 = await hashToken("input-2");
    expect(h1).not.toBe(h2);
  });
});

// ---------------------------------------------------------------------------
// tokenPreview
// ---------------------------------------------------------------------------

describe("tokenPreview", () => {
  it("returns first 8 characters", () => {
    const preview = tokenPreview("abcdefghijklmnop");
    expect(preview).toBe("abcdefgh");
  });

  it("handles short tokens", () => {
    const preview = tokenPreview("abc");
    expect(preview).toBe("abc");
  });
});

// ---------------------------------------------------------------------------
// extractBearerToken
// ---------------------------------------------------------------------------

describe("extractBearerToken", () => {
  it("extracts token from valid Bearer header", () => {
    const token = extractBearerToken("Bearer my-token-123");
    expect(token).toBe("my-token-123");
  });

  it("is case-insensitive for Bearer", () => {
    const token = extractBearerToken("bearer my-token");
    expect(token).toBe("my-token");
  });

  it("returns null for null header", () => {
    const token = extractBearerToken(null);
    expect(token).toBeNull();
  });

  it("returns null for empty header", () => {
    const token = extractBearerToken("");
    expect(token).toBeNull();
  });

  it("returns null for non-Bearer auth", () => {
    const token = extractBearerToken("Basic dXNlcjpwYXNz");
    expect(token).toBeNull();
  });

  it("returns null for malformed Bearer header", () => {
    const token = extractBearerToken("Bearer");
    expect(token).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// validateMcpToken
// ---------------------------------------------------------------------------

describe("validateMcpToken", () => {
  const validToken = {
    id: "token-1",
    user_id: "user-1",
    client_id: "client-1",
    scope: "mcp:full",
    revoked: false,
    expires_at: null,
  };

  function createMockStore(token: typeof validToken | null): TokenStore {
    return {
      findByHash: vi.fn(async () => token),
      updateLastUsed: vi.fn(async () => {}),
    };
  }

  it("returns error for missing Authorization header", async () => {
    const store = createMockStore(validToken);
    const result = await validateMcpToken(store, null);

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.status).toBe(401);
      expect(result.error).toContain("Missing");
    }
  });

  it("returns error for invalid token", async () => {
    const store = createMockStore(null);
    const result = await validateMcpToken(store, "Bearer invalid-token");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.status).toBe(401);
      expect(result.error).toBe("Invalid token");
    }
  });

  it("returns error for revoked token", async () => {
    const store = createMockStore({ ...validToken, revoked: true });
    const result = await validateMcpToken(store, "Bearer some-token");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("revoked");
    }
  });

  it("returns error for expired token", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();
    const store = createMockStore({ ...validToken, expires_at: pastDate });
    const result = await validateMcpToken(store, "Bearer some-token");

    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toContain("expired");
    }
  });

  it("returns success for valid token", async () => {
    const store = createMockStore(validToken);
    const result = await validateMcpToken(store, "Bearer some-token");

    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.token.user_id).toBe("user-1");
      expect(result.token.client_id).toBe("client-1");
      expect(result.token.scope).toBe("mcp:full");
    }
  });

  it("updates last_used_at for valid token", async () => {
    const store = createMockStore(validToken);
    await validateMcpToken(store, "Bearer some-token");

    expect(store.updateLastUsed).toHaveBeenCalledWith("token-1");
  });

  it("continues even if updateLastUsed fails", async () => {
    const store = createMockStore(validToken);
    (store.updateLastUsed as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("DB error"),
    );

    const result = await validateMcpToken(store, "Bearer some-token");

    // Should still return valid result
    expect(result.valid).toBe(true);
  });

  it("accepts non-expired future token", async () => {
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const store = createMockStore({ ...validToken, expires_at: futureDate });
    const result = await validateMcpToken(store, "Bearer some-token");

    expect(result.valid).toBe(true);
  });
});
