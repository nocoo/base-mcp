// ---------------------------------------------------------------------------
// OAuth Token Management Utilities
// ---------------------------------------------------------------------------

/**
 * Generate a secure random token.
 *
 * @param length - Number of random bytes (default 32, produces 64 hex chars)
 * @returns Hex-encoded random token
 */
export function generateToken(length = 32): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Hash a token using SHA-256.
 *
 * Tokens should be stored as hashes, never in plaintext.
 *
 * @param token - The plaintext token
 * @returns SHA-256 hash as hex string
 */
export async function hashToken(token: string): Promise<string> {
  const encoded = new TextEncoder().encode(token);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a token preview (first 8 characters).
 *
 * Used for logging and display without exposing the full token.
 *
 * @param token - The plaintext token
 * @returns First 8 characters
 */
export function tokenPreview(token: string): string {
  return token.slice(0, 8);
}

/**
 * Extract bearer token from Authorization header.
 *
 * @param authHeader - The Authorization header value
 * @returns The token, or null if invalid
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

// ---------------------------------------------------------------------------
// Token Validation Types
// ---------------------------------------------------------------------------

export interface TokenValidationSuccess {
  valid: true;
  token: {
    id: string;
    user_id: string;
    client_id: string;
    scope: string;
  };
}

export interface TokenValidationError {
  valid: false;
  error: string;
  status: number;
}

export type TokenValidationResult = TokenValidationSuccess | TokenValidationError;

/**
 * Token store interface for validation.
 *
 * Implement this interface to connect to your token storage.
 */
export interface TokenStore {
  /**
   * Find a token by its hash.
   * @returns Token record or null if not found
   */
  findByHash(hash: string): Promise<{
    id: string;
    user_id: string;
    client_id: string;
    scope: string;
    revoked: boolean;
    expires_at: string | null;
  } | null>;

  /**
   * Update last_used_at timestamp.
   */
  updateLastUsed(id: string): Promise<void>;
}

/**
 * Validate an MCP bearer token.
 *
 * @param store - Token storage implementation
 * @param authHeader - The Authorization header value
 * @returns Validation result
 */
export async function validateMcpToken(
  store: TokenStore,
  authHeader: string | null,
): Promise<TokenValidationResult> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return {
      valid: false,
      error: "Missing or invalid Authorization header",
      status: 401,
    };
  }

  const hash = await hashToken(token);
  const record = await store.findByHash(hash);

  if (!record) {
    return {
      valid: false,
      error: "Invalid token",
      status: 401,
    };
  }

  if (record.revoked) {
    return {
      valid: false,
      error: "Token has been revoked",
      status: 401,
    };
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return {
      valid: false,
      error: "Token has expired",
      status: 401,
    };
  }

  // Update last used timestamp (fire-and-forget)
  store.updateLastUsed(record.id).catch(() => {
    // Ignore errors updating last_used_at
  });

  return {
    valid: true,
    token: {
      id: record.id,
      user_id: record.user_id,
      client_id: record.client_id,
      scope: record.scope,
    },
  };
}
