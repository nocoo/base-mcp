import { describe, it, expect } from "vitest";
import { getOAuthMetadata } from "./oauth-metadata.js";

describe("getOAuthMetadata", () => {
  it("returns correct structure with default options", () => {
    const metadata = getOAuthMetadata("https://example.com");

    expect(metadata).toEqual({
      issuer: "https://example.com",
      authorization_endpoint: "https://example.com/api/mcp/authorize",
      token_endpoint: "https://example.com/api/mcp/token",
      registration_endpoint: "https://example.com/api/mcp/register",
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none"],
      scopes_supported: ["mcp:full"],
    });
  });

  it("uses issuer as base for all endpoints", () => {
    const metadata = getOAuthMetadata("https://api.myapp.com");

    expect(metadata.issuer).toBe("https://api.myapp.com");
    expect(metadata.authorization_endpoint).toContain("https://api.myapp.com");
    expect(metadata.token_endpoint).toContain("https://api.myapp.com");
  });

  it("removes trailing slash from issuer", () => {
    const metadata = getOAuthMetadata("https://example.com/");

    expect(metadata.issuer).toBe("https://example.com");
    expect(metadata.authorization_endpoint).toBe(
      "https://example.com/api/mcp/authorize",
    );
  });

  it("supports custom basePath", () => {
    const metadata = getOAuthMetadata("https://example.com", {
      basePath: "/oauth",
    });

    expect(metadata.authorization_endpoint).toBe(
      "https://example.com/oauth/authorize",
    );
    expect(metadata.token_endpoint).toBe("https://example.com/oauth/token");
  });

  it("supports custom scopes", () => {
    const metadata = getOAuthMetadata("https://example.com", {
      scopes: ["read", "write", "admin"],
    });

    expect(metadata.scopes_supported).toEqual(["read", "write", "admin"]);
  });

  it("excludes registration endpoint when disabled", () => {
    const metadata = getOAuthMetadata("https://example.com", {
      enableRegistration: false,
    });

    expect(metadata.registration_endpoint).toBeUndefined();
  });

  it("only supports S256 code challenge method", () => {
    const metadata = getOAuthMetadata("https://example.com");

    expect(metadata.code_challenge_methods_supported).toEqual(["S256"]);
  });

  it("only supports authorization_code and refresh_token grants", () => {
    const metadata = getOAuthMetadata("https://example.com");

    expect(metadata.grant_types_supported).toEqual([
      "authorization_code",
      "refresh_token",
    ]);
  });

  it("only supports none for token endpoint auth", () => {
    const metadata = getOAuthMetadata("https://example.com");

    expect(metadata.token_endpoint_auth_methods_supported).toEqual(["none"]);
  });
});
