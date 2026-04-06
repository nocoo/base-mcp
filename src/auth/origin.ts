// ---------------------------------------------------------------------------
// Origin Validation for DNS Rebinding Protection
// ---------------------------------------------------------------------------

export type OriginValidationResult =
  | { valid: true }
  | { valid: false; error: string; status: number };

/**
 * Validate the Origin header for DNS rebinding protection.
 *
 * MCP servers using HTTP transport need to protect against DNS rebinding attacks.
 * This function validates that the request origin is allowed.
 *
 * Allowed origins:
 * - null (CLI clients, curl, etc.)
 * - Same site (matches siteUrl)
 * - Loopback addresses (localhost, 127.0.0.1, [::1])
 * - Non-web protocols (vscode-file://, electron://, tauri://)
 *
 * @param origin - The Origin header value (may be null)
 * @param siteUrl - The allowed site URL (e.g., "https://example.com")
 * @returns Validation result with error details if invalid
 */
export function validateOrigin(
  origin: string | null,
  siteUrl: string,
): OriginValidationResult {
  // Null origin is allowed (CLI clients, curl, etc.)
  if (!origin) return { valid: true };

  // Same site is allowed
  try {
    const siteOrigin = new URL(siteUrl).origin;
    if (origin === siteOrigin) return { valid: true };
  } catch {
    // Invalid siteUrl - continue with other checks
  }

  // Non-web protocols are allowed (desktop apps)
  if (!origin.startsWith("http://") && !origin.startsWith("https://")) {
    return { valid: true };
  }

  // Check for loopback addresses
  try {
    const url = new URL(origin);
    const host = url.hostname;
    if (host === "localhost" || host === "127.0.0.1" || host === "[::1]") {
      return { valid: true };
    }
  } catch {
    // Invalid origin URL
  }

  // All other origins are rejected
  return {
    valid: false,
    error: "Origin not allowed",
    status: 403,
  };
}

/**
 * Check if a hostname is a loopback address.
 *
 * @param hostname - The hostname to check
 * @returns True if loopback
 */
export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}
