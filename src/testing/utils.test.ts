import { describe, it, expect } from "vitest";
import {
  createMockContext,
  parseToolResult,
  isToolError,
  getToolErrorMessage,
  createMockTokenStore,
} from "./utils.js";
import { ok, error } from "../framework/response.js";

// ---------------------------------------------------------------------------
// createMockContext
// ---------------------------------------------------------------------------

describe("createMockContext", () => {
  it("creates context with given repos", () => {
    const repos = { items: [1, 2, 3] };
    const ctx = createMockContext(repos);

    expect(ctx.repos).toBe(repos);
    expect(ctx.repos.items).toEqual([1, 2, 3]);
  });

  it("works with typed repos", () => {
    interface MyRepos {
      users: { id: string }[];
    }
    const repos: MyRepos = { users: [{ id: "1" }] };
    const ctx = createMockContext(repos);

    expect(ctx.repos.users[0].id).toBe("1");
  });
});

// ---------------------------------------------------------------------------
// parseToolResult
// ---------------------------------------------------------------------------

describe("parseToolResult", () => {
  it("parses JSON from ok result", () => {
    const result = ok({ name: "Test", count: 42 });
    const data = parseToolResult(result);

    expect(data).toEqual({ name: "Test", count: 42 });
  });

  it("parses arrays", () => {
    const result = ok([1, 2, 3]);
    const data = parseToolResult(result);

    expect(data).toEqual([1, 2, 3]);
  });

  it("returns text for error messages", () => {
    const result = error("Something went wrong");
    const data = parseToolResult(result);

    expect(data).toBe("Something went wrong");
  });

  it("returns null for empty content", () => {
    const result = { content: [] };
    const data = parseToolResult(result);

    expect(data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isToolError
// ---------------------------------------------------------------------------

describe("isToolError", () => {
  it("returns true for error results", () => {
    const result = error("Failed");
    expect(isToolError(result)).toBe(true);
  });

  it("returns false for ok results", () => {
    const result = ok({ success: true });
    expect(isToolError(result)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getToolErrorMessage
// ---------------------------------------------------------------------------

describe("getToolErrorMessage", () => {
  it("returns message from error result", () => {
    const result = error("Something went wrong");
    expect(getToolErrorMessage(result)).toBe("Something went wrong");
  });

  it("returns null for ok result", () => {
    const result = ok({ success: true });
    expect(getToolErrorMessage(result)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createMockTokenStore
// ---------------------------------------------------------------------------

describe("createMockTokenStore", () => {
  it("returns null token by default", async () => {
    const store = createMockTokenStore();
    const token = await store.findByHash("any");
    expect(token).toBeNull();
  });

  it("returns configured token", async () => {
    const store = createMockTokenStore({
      token: {
        id: "t-1",
        user_id: "u-1",
        client_id: "c-1",
        scope: "mcp:full",
      },
    });
    const token = await store.findByHash("any");

    expect(token).not.toBeNull();
    expect(token?.user_id).toBe("u-1");
    expect(token?.revoked).toBe(false);
    expect(token?.expires_at).toBeNull();
  });

  it("respects revoked flag", async () => {
    const store = createMockTokenStore({
      token: {
        id: "t-1",
        user_id: "u-1",
        client_id: "c-1",
        scope: "mcp:full",
        revoked: true,
      },
    });
    const token = await store.findByHash("any");

    expect(token?.revoked).toBe(true);
  });

  it("updateLastUsed is a no-op", async () => {
    const store = createMockTokenStore();
    await expect(store.updateLastUsed("any")).resolves.toBeUndefined();
  });
});
