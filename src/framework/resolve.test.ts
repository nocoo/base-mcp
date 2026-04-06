import { describe, it, expect } from "vitest";
import { validateIdOrSlug, resolveEntity, isResolveError } from "./resolve.js";

// ---------------------------------------------------------------------------
// validateIdOrSlug
// ---------------------------------------------------------------------------

describe("validateIdOrSlug", () => {
  it("returns id result when only id is provided", () => {
    const result = validateIdOrSlug({ id: "abc-123" });
    expect(result).toEqual({ type: "id", value: "abc-123" });
  });

  it("returns slug result when only slug is provided", () => {
    const result = validateIdOrSlug({ slug: "my-tag" });
    expect(result).toEqual({ type: "slug", value: "my-tag" });
  });

  it("returns error when both id and slug are provided", () => {
    const result = validateIdOrSlug({ id: "abc", slug: "my-tag" });
    expect(result).toEqual({
      error: "Provide either id or slug, not both.",
    });
  });

  it("returns error when neither id nor slug is provided", () => {
    const result = validateIdOrSlug({});
    expect(result).toEqual({ error: "Either id or slug is required." });
  });

  it("treats empty string id as falsy (no id)", () => {
    const result = validateIdOrSlug({ id: "", slug: "my-tag" });
    expect(result).toEqual({ type: "slug", value: "my-tag" });
  });

  it("treats empty string slug as falsy (no slug)", () => {
    const result = validateIdOrSlug({ id: "abc", slug: "" });
    expect(result).toEqual({ type: "id", value: "abc" });
  });
});

// ---------------------------------------------------------------------------
// resolveEntity
// ---------------------------------------------------------------------------

describe("resolveEntity", () => {
  const getById = async (id: string) =>
    id === "id-1" ? { id: "id-1", name: "Found" } : null;
  const getBySlug = async (slug: string) =>
    slug === "found-slug" ? { id: "id-1", name: "Found" } : null;

  it("resolves entity by id", async () => {
    const result = await resolveEntity({ id: "id-1" }, getById, getBySlug);
    expect(result).toEqual({ id: "id-1", name: "Found" });
  });

  it("resolves entity by slug", async () => {
    const result = await resolveEntity(
      { slug: "found-slug" },
      getById,
      getBySlug,
    );
    expect(result).toEqual({ id: "id-1", name: "Found" });
  });

  it("returns error when entity not found by id", async () => {
    const result = await resolveEntity({ id: "missing" }, getById, getBySlug);
    expect(result).toEqual({ error: "Entity not found: missing" });
  });

  it("returns error when entity not found by slug", async () => {
    const result = await resolveEntity(
      { slug: "missing" },
      getById,
      getBySlug,
    );
    expect(result).toEqual({ error: "Entity not found: missing" });
  });

  it("uses displayName in not-found error", async () => {
    const result = await resolveEntity(
      { id: "missing" },
      getById,
      getBySlug,
      "Tag",
    );
    expect(result).toEqual({ error: "Tag not found: missing" });
  });

  it("returns error when both id and slug provided", async () => {
    const result = await resolveEntity(
      { id: "id-1", slug: "found-slug" },
      getById,
      getBySlug,
    );
    expect(result).toEqual({
      error: "Provide either id or slug, not both.",
    });
  });

  it("returns error when neither provided", async () => {
    const result = await resolveEntity({}, getById, getBySlug);
    expect(result).toEqual({ error: "Either id or slug is required." });
  });
});

// ---------------------------------------------------------------------------
// isResolveError
// ---------------------------------------------------------------------------

describe("isResolveError", () => {
  it("returns true for error objects", () => {
    expect(isResolveError({ error: "Something went wrong" })).toBe(true);
  });

  it("returns false for valid entities", () => {
    expect(isResolveError({ id: "1", name: "Test" })).toBe(false);
  });

  it("returns false for null", () => {
    expect(isResolveError(null)).toBe(false);
  });

  it("returns false for primitives", () => {
    expect(isResolveError("string")).toBe(false);
    expect(isResolveError(42)).toBe(false);
    expect(isResolveError(undefined)).toBe(false);
  });

  it("returns false for objects with non-string error property", () => {
    expect(isResolveError({ error: 123 })).toBe(false);
    expect(isResolveError({ error: null })).toBe(false);
  });
});
