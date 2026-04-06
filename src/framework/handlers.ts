// ---------------------------------------------------------------------------
// Entity-Driven MCP Framework — Generic CRUD Handler Factory
//
// Given an EntityConfig, produces 5 typed handler functions:
// handleList, handleGet, handleCreate, handleUpdate, handleDelete
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { EntityConfig, EntityContext } from "./types.js";
import type { IdOrSlug } from "./resolve.js";
import { resolveEntity, isResolveError } from "./resolve.js";
import { ok, error } from "./response.js";
import { projectFields } from "./projection.js";

export interface CrudHandlers<TRepos> {
  handleList: (
    ctx: EntityContext<TRepos>,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  handleGet: (
    ctx: EntityContext<TRepos>,
    args: IdOrSlug,
  ) => Promise<CallToolResult>;
  handleCreate: (
    ctx: EntityContext<TRepos>,
    args: Record<string, unknown>,
  ) => Promise<CallToolResult>;
  handleUpdate: (
    ctx: EntityContext<TRepos>,
    args: IdOrSlug & Record<string, unknown>,
  ) => Promise<CallToolResult>;
  handleDelete: (
    ctx: EntityContext<TRepos>,
    args: IdOrSlug,
  ) => Promise<CallToolResult>;
}

export function createCrudHandlers<T extends { id: string }, TRepos = unknown>(
  config: EntityConfig<T, TRepos>,
): CrudHandlers<TRepos> {
  const { dataLayer, hooks, projection } = config;
  const displayName = config.display;

  // Helper: resolve with entity-specific not-found message
  async function resolve(
    ctx: EntityContext<TRepos>,
    args: IdOrSlug,
  ): Promise<T | { error: string }> {
    return resolveEntity(
      args,
      (id) => dataLayer.getById(ctx, id),
      dataLayer.getBySlug
        ? (slug) => dataLayer.getBySlug!(ctx, slug)
        : async () => null,
      displayName,
    );
  }

  // ---- list ----
  async function handleList(
    ctx: EntityContext<TRepos>,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    const result = await dataLayer.list(ctx, args);

    // Apply projection if configured
    const items = projection
      ? result.map((item) =>
          projectFields(
            item as Record<string, unknown>,
            projection,
            args.include as string[] | undefined,
          ),
        )
      : result;

    return ok(items);
  }

  // ---- get ----
  async function handleGet(
    ctx: EntityContext<TRepos>,
    args: IdOrSlug,
  ): Promise<CallToolResult> {
    const resolved = await resolve(ctx, args);
    if (isResolveError(resolved)) return error(resolved.error);
    return ok(resolved);
  }

  // ---- create ----
  async function handleCreate(
    ctx: EntityContext<TRepos>,
    args: Record<string, unknown>,
  ): Promise<CallToolResult> {
    if (!dataLayer.create) {
      return error(`${displayName} does not support creation`);
    }

    // Apply beforeCreate hook if defined
    const input = hooks?.beforeCreate
      ? await hooks.beforeCreate(ctx, args)
      : args;

    const entity = await dataLayer.create(ctx, input);

    // Apply afterCreate hook (best-effort)
    if (hooks?.afterCreate) {
      try {
        await hooks.afterCreate(ctx, entity);
      } catch (err) {
        console.error(
          `[MCP] ${displayName} afterCreate hook failed (best-effort):`,
          err,
        );
      }
    }

    return ok(entity);
  }

  // ---- update ----
  async function handleUpdate(
    ctx: EntityContext<TRepos>,
    args: IdOrSlug & Record<string, unknown>,
  ): Promise<CallToolResult> {
    if (!dataLayer.update) {
      return error(`${displayName} does not support updates`);
    }

    const resolved = await resolve(ctx, args);
    if (isResolveError(resolved)) return error(resolved.error);

    // Strip MCP identifier fields before any hook sees the args
    const { id: _id, slug: _slug, ...businessFields } = args;

    // Apply beforeUpdate hook if defined
    const input = hooks?.beforeUpdate
      ? await hooks.beforeUpdate(ctx, resolved.id, businessFields, resolved)
      : businessFields;

    const updated = await dataLayer.update(ctx, resolved.id, input);
    if (!updated) return error(`${displayName} not found: ${resolved.id}`);

    // Apply afterUpdate hook (best-effort)
    if (hooks?.afterUpdate) {
      try {
        await hooks.afterUpdate(ctx, resolved.id, businessFields, updated);
      } catch (err) {
        console.error(
          `[MCP] ${displayName} afterUpdate hook failed (best-effort):`,
          err,
        );
      }
    }

    return ok(updated);
  }

  // ---- delete ----
  async function handleDelete(
    ctx: EntityContext<TRepos>,
    args: IdOrSlug,
  ): Promise<CallToolResult> {
    if (!dataLayer.delete) {
      return error(`${displayName} does not support deletion`);
    }

    const resolved = await resolve(ctx, args);
    if (isResolveError(resolved)) return error(resolved.error);

    // Apply beforeDelete hook if defined
    if (hooks?.beforeDelete) {
      await hooks.beforeDelete(ctx, resolved.id, resolved);
    }

    await dataLayer.delete(ctx, resolved.id);

    // Apply afterDelete hook (best-effort)
    if (hooks?.afterDelete) {
      try {
        await hooks.afterDelete(ctx, resolved.id);
      } catch (err) {
        console.error(
          `[MCP] ${displayName} afterDelete hook failed (best-effort):`,
          err,
        );
      }
    }

    return ok({ deleted: true });
  }

  return { handleList, handleGet, handleCreate, handleUpdate, handleDelete };
}
