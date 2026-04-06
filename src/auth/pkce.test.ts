import { describe, it, expect } from "vitest";
import {
  verifyPkceS256,
  generateCodeVerifier,
  generateCodeChallenge,
  isLoopbackRedirectUri,
} from "./pkce.js";

// ---------------------------------------------------------------------------
// verifyPkceS256
// ---------------------------------------------------------------------------

describe("verifyPkceS256", () => {
  it("returns true for a valid verifier/challenge pair", async () => {
    // Known test vector
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const challenge = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";

    const result = await verifyPkceS256(verifier, challenge);
    expect(result).toBe(true);
  });

  it("returns false when challenge does not match verifier", async () => {
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const wrongChallenge = "wrong-challenge-value";

    const result = await verifyPkceS256(verifier, wrongChallenge);
    expect(result).toBe(false);
  });

  it("returns false for empty verifier", async () => {
    const result = await verifyPkceS256("", "some-challenge");
    expect(result).toBe(false);
  });

  it("returns false for empty challenge", async () => {
    const result = await verifyPkceS256("some-verifier", "");
    expect(result).toBe(false);
  });

  it("works with generated verifier/challenge pairs", async () => {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);

    const result = await verifyPkceS256(verifier, challenge);
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateCodeVerifier
// ---------------------------------------------------------------------------

describe("generateCodeVerifier", () => {
  it("generates a string of default length 64", () => {
    const verifier = generateCodeVerifier();
    expect(verifier).toHaveLength(64);
  });

  it("generates a string of specified length", () => {
    const verifier = generateCodeVerifier(128);
    expect(verifier).toHaveLength(128);
  });

  it("generates unique values", () => {
    const v1 = generateCodeVerifier();
    const v2 = generateCodeVerifier();
    expect(v1).not.toBe(v2);
  });

  it("only contains allowed characters", () => {
    const verifier = generateCodeVerifier(1000);
    const allowed = /^[A-Za-z0-9\-._~]+$/;
    expect(verifier).toMatch(allowed);
  });
});

// ---------------------------------------------------------------------------
// generateCodeChallenge
// ---------------------------------------------------------------------------

describe("generateCodeChallenge", () => {
  it("generates base64url-encoded string without padding", async () => {
    const verifier = "test-verifier";
    const challenge = await generateCodeChallenge(verifier);

    // Should not contain +, /, or =
    expect(challenge).not.toContain("+");
    expect(challenge).not.toContain("/");
    expect(challenge).not.toContain("=");
  });

  it("is deterministic for same input", async () => {
    const verifier = "test-verifier";
    const c1 = await generateCodeChallenge(verifier);
    const c2 = await generateCodeChallenge(verifier);
    expect(c1).toBe(c2);
  });
});

// ---------------------------------------------------------------------------
// isLoopbackRedirectUri
// ---------------------------------------------------------------------------

describe("isLoopbackRedirectUri", () => {
  it("returns true for http://localhost", () => {
    expect(isLoopbackRedirectUri("http://localhost/callback")).toBe(true);
  });

  it("returns true for http://localhost with port", () => {
    expect(isLoopbackRedirectUri("http://localhost:8080/callback")).toBe(true);
  });

  it("returns true for http://127.0.0.1", () => {
    expect(isLoopbackRedirectUri("http://127.0.0.1/callback")).toBe(true);
  });

  it("returns true for http://127.0.0.1 with port", () => {
    expect(isLoopbackRedirectUri("http://127.0.0.1:3000/callback")).toBe(true);
  });

  it("returns true for http://[::1]", () => {
    expect(isLoopbackRedirectUri("http://[::1]/callback")).toBe(true);
  });

  it("returns true for http://[::1] with port", () => {
    expect(isLoopbackRedirectUri("http://[::1]:9000/callback")).toBe(true);
  });

  it("returns false for https://localhost (must be http)", () => {
    expect(isLoopbackRedirectUri("https://localhost/callback")).toBe(false);
  });

  it("returns false for external URLs", () => {
    expect(isLoopbackRedirectUri("http://example.com/callback")).toBe(false);
  });

  it("returns false for invalid URLs", () => {
    expect(isLoopbackRedirectUri("not-a-url")).toBe(false);
  });

  it("returns false for spoofed hostnames", () => {
    expect(isLoopbackRedirectUri("http://localhost.evil.com/callback")).toBe(
      false,
    );
  });

  it("returns false for custom schemes", () => {
    expect(isLoopbackRedirectUri("myapp://callback")).toBe(false);
  });
});
