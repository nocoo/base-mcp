import { describe, it, expect } from "vitest";
import { validateOrigin, isLoopbackHost } from "./origin.js";

// ---------------------------------------------------------------------------
// validateOrigin
// ---------------------------------------------------------------------------

describe("validateOrigin", () => {
  const siteUrl = "https://example.com";

  it("allows null origin (CLI clients)", () => {
    const result = validateOrigin(null, siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows same-site origin", () => {
    const result = validateOrigin("https://example.com", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows localhost", () => {
    const result = validateOrigin("http://localhost:3000", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows 127.0.0.1", () => {
    const result = validateOrigin("http://127.0.0.1:8080", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows [::1]", () => {
    const result = validateOrigin("http://[::1]:9000", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows vscode-file:// protocol", () => {
    const result = validateOrigin("vscode-file://vscode-app/index.html", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows electron:// protocol", () => {
    const result = validateOrigin("electron://app/main", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("allows tauri:// protocol", () => {
    const result = validateOrigin("tauri://localhost", siteUrl);
    expect(result.valid).toBe(true);
  });

  it("rejects external web origins", () => {
    const result = validateOrigin("https://evil.com", siteUrl);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.error).toBe("Origin not allowed");
      expect(result.status).toBe(403);
    }
  });

  it("rejects spoofed loopback domains", () => {
    const result = validateOrigin("http://localhost.evil.com", siteUrl);
    expect(result.valid).toBe(false);
  });

  it("handles siteUrl with trailing slash", () => {
    const result = validateOrigin("https://example.com", "https://example.com/");
    expect(result.valid).toBe(true);
  });

  it("handles siteUrl with path", () => {
    const result = validateOrigin("https://example.com", "https://example.com/api");
    expect(result.valid).toBe(true);
  });

  it("rejects cross-subdomain origins", () => {
    const result = validateOrigin("https://sub.example.com", siteUrl);
    expect(result.valid).toBe(false);
  });

  it("rejects different port as different origin", () => {
    const result = validateOrigin("https://example.com:8443", siteUrl);
    expect(result.valid).toBe(false);
  });

  it("rejects http when site is https", () => {
    const result = validateOrigin("http://example.com", siteUrl);
    expect(result.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isLoopbackHost
// ---------------------------------------------------------------------------

describe("isLoopbackHost", () => {
  it("returns true for localhost", () => {
    expect(isLoopbackHost("localhost")).toBe(true);
  });

  it("returns true for 127.0.0.1", () => {
    expect(isLoopbackHost("127.0.0.1")).toBe(true);
  });

  it("returns true for [::1]", () => {
    expect(isLoopbackHost("[::1]")).toBe(true);
  });

  it("returns false for other addresses", () => {
    expect(isLoopbackHost("example.com")).toBe(false);
    expect(isLoopbackHost("192.168.1.1")).toBe(false);
    expect(isLoopbackHost("localhost.evil.com")).toBe(false);
  });
});
