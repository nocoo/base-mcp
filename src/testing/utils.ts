// ---------------------------------------------------------------------------
// Testing Utilities for MCP Framework
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { EntityContext } from "../framework/types.js";

/**
 * Create a mock EntityContext for testing.
 *
 * @param repos - The repos object to inject
 * @returns EntityContext with the given repos
 */
export function createMockContext<TRepos>(repos: TRepos): EntityContext<TRepos> {
  return { repos };
}

/**
 * Parse the JSON content from a CallToolResult.
 *
 * @param result - The tool result to parse
 * @returns Parsed JSON data, or null if not parseable
 */
export function parseToolResult(result: CallToolResult): unknown {
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return null;
  try {
    return JSON.parse(textContent.text);
  } catch {
    return textContent.text;
  }
}

/**
 * Assert that a tool result is an error.
 *
 * @param result - The tool result to check
 * @returns True if the result is an error
 */
export function isToolError(result: CallToolResult): boolean {
  return result.isError === true;
}

/**
 * Get the error message from a tool result.
 *
 * @param result - The tool result
 * @returns The error message, or null if not an error
 */
export function getToolErrorMessage(result: CallToolResult): string | null {
  if (!result.isError) return null;
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || textContent.type !== "text") return null;
  return textContent.text;
}

/**
 * Create a mock token store for testing validateMcpToken.
 */
export interface MockTokenStoreOptions {
  token?: {
    id: string;
    user_id: string;
    client_id: string;
    scope: string;
    revoked?: boolean;
    expires_at?: string | null;
  } | null;
}

export function createMockTokenStore(options: MockTokenStoreOptions = {}) {
  const { token = null } = options;
  return {
    findByHash: async () =>
      token
        ? {
            ...token,
            revoked: token.revoked ?? false,
            expires_at: token.expires_at ?? null,
          }
        : null,
    updateLastUsed: async () => {},
  };
}
