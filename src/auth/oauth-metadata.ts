// ---------------------------------------------------------------------------
// OAuth 2.1 Authorization Server Metadata
// ---------------------------------------------------------------------------

export interface OAuthMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  response_types_supported: string[];
  grant_types_supported: string[];
  code_challenge_methods_supported: string[];
  token_endpoint_auth_methods_supported: string[];
  scopes_supported?: string[];
}

export interface OAuthMetadataOptions {
  /** Base path for OAuth endpoints (default: "/api/mcp") */
  basePath?: string;
  /** Supported scopes (default: ["mcp:full"]) */
  scopes?: string[];
  /** Enable dynamic client registration endpoint */
  enableRegistration?: boolean;
}

/**
 * Generate OAuth 2.1 Authorization Server Metadata.
 *
 * This metadata is served at `/.well-known/oauth-authorization-server`
 * and allows MCP clients to discover OAuth endpoints.
 *
 * @param issuer - The base URL of the authorization server (e.g., "https://example.com")
 * @param options - Optional configuration
 * @returns OAuth metadata object
 */
export function getOAuthMetadata(
  issuer: string,
  options: OAuthMetadataOptions = {},
): OAuthMetadata {
  const {
    basePath = "/api/mcp",
    scopes = ["mcp:full"],
    enableRegistration = true,
  } = options;

  // Remove trailing slash from issuer
  const base = issuer.replace(/\/$/, "");

  const metadata: OAuthMetadata = {
    issuer: base,
    authorization_endpoint: `${base}${basePath}/authorize`,
    token_endpoint: `${base}${basePath}/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: scopes,
  };

  if (enableRegistration) {
    metadata.registration_endpoint = `${base}${basePath}/register`;
  }

  return metadata;
}
