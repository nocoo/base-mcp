// ---------------------------------------------------------------------------
// OAuth 2.1 PKCE (Proof Key for Code Exchange) Verification
// ---------------------------------------------------------------------------

/**
 * Verify a PKCE S256 code_challenge against a code_verifier.
 *
 * The code_challenge is created by: base64url(sha256(code_verifier))
 * We recompute this from the verifier and compare.
 *
 * @param codeVerifier - The original random string (43-128 chars)
 * @param codeChallenge - The base64url-encoded SHA-256 hash
 * @returns True if the verifier matches the challenge
 */
export async function verifyPkceS256(
  codeVerifier: string,
  codeChallenge: string,
): Promise<boolean> {
  if (!codeVerifier || !codeChallenge) return false;

  const encoded = new TextEncoder().encode(codeVerifier);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const base64url = btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return base64url === codeChallenge;
}

/**
 * Generate a PKCE code_verifier (for testing purposes).
 *
 * In production, this is typically done client-side.
 *
 * @param length - Length of the verifier (43-128 chars, default 64)
 * @returns A random code_verifier string
 */
export function generateCodeVerifier(length = 64): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => chars[b % chars.length])
    .join("");
}

/**
 * Generate a PKCE code_challenge from a code_verifier (for testing purposes).
 *
 * @param codeVerifier - The code_verifier to hash
 * @returns The base64url-encoded SHA-256 hash
 */
export async function generateCodeChallenge(
  codeVerifier: string,
): Promise<string> {
  const encoded = new TextEncoder().encode(codeVerifier);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Check if a redirect URI is a loopback address (allowed for native apps).
 *
 * Per RFC 8252, native apps can use http:// with loopback addresses:
 * - localhost
 * - 127.0.0.1
 * - [::1]
 *
 * @param uri - The redirect_uri to check
 * @returns True if it's a valid loopback URI
 */
export function isLoopbackRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);
    if (url.protocol !== "http:") return false;
    const host = url.hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
  } catch {
    return false;
  }
}
