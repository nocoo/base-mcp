// ---------------------------------------------------------------------------
// Entity-Driven MCP Framework — ID/Slug Resolution
// ---------------------------------------------------------------------------

export type IdOrSlug = { id?: string; slug?: string };

export type ResolveResult =
  | { type: "id"; value: string }
  | { type: "slug"; value: string }
  | { error: string };

/**
 * Validate that exactly one of id or slug is provided.
 * Both → error. Neither → error.
 */
export function validateIdOrSlug(args: IdOrSlug): ResolveResult {
  if (args.id && args.slug)
    return { error: "Provide either id or slug, not both." };
  if (args.id) return { type: "id", value: args.id };
  if (args.slug) return { type: "slug", value: args.slug };
  return { error: "Either id or slug is required." };
}

/**
 * Resolve an entity by id or slug. Returns the entity or an error object.
 * Decoupled from specific entities — takes lookup functions as parameters.
 *
 * @param args - Object with id or slug
 * @param getById - Function to lookup by id
 * @param getBySlug - Function to lookup by slug
 * @param displayName - Human-readable name for error messages
 */
export async function resolveEntity<T>(
  args: IdOrSlug,
  getById: (id: string) => Promise<T | null>,
  getBySlug: (slug: string) => Promise<T | null>,
  displayName?: string,
): Promise<T | { error: string }> {
  const v = validateIdOrSlug(args);
  if ("error" in v) return v;
  const entity =
    v.type === "id" ? await getById(v.value) : await getBySlug(v.value);
  if (!entity) {
    const label = displayName ?? "Entity";
    return { error: `${label} not found: ${v.value}` };
  }
  return entity;
}

/**
 * Type guard to check if a resolve result is an error.
 */
export function isResolveError<T>(
  result: T | { error: string },
): result is { error: string } {
  return (
    typeof result === "object" &&
    result !== null &&
    "error" in result &&
    typeof (result as { error: unknown }).error === "string"
  );
}
