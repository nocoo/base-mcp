// ---------------------------------------------------------------------------
// Entity-Driven MCP Framework — Tool Registration Engine
//
// Reads an EntityConfig and registers all CRUD tools + extra tools on an
// McpServer instance. This is the bridge between the framework and the SDK.
// ---------------------------------------------------------------------------

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { EntityConfig, EntityContext, CustomToolConfig } from "./types.js";
import { createCrudHandlers } from "./handlers.js";

/**
 * Register CRUD tools for an entity on an MCP server.
 *
 * Generates 5 tools: list_*, get_*, create_*, update_*, delete_*
 * where * is the entity's plural name.
 */
export function registerEntityTools<T extends { id: string }, TRepos = unknown>(
  server: McpServer,
  config: EntityConfig<T, TRepos>,
  ctx: EntityContext<TRepos>,
): void {
  const plural = config.plural ?? config.name + "s";
  const handlers = createCrudHandlers(config);

  // ---- list ----
  server.tool(
    `list_${plural}`,
    config.descriptions?.list ?? `List all ${plural}.`,
    {
      ...(config.schemas?.list ?? {}),
      ...(config.projection
        ? {
            include: z
              .array(z.string())
              .optional()
              .describe(
                "Opt-in fields excluded by default. Use 'full' for all fields.",
              ),
          }
        : {}),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((args: any) => handlers.handleList(ctx, args)) as any,
  );

  // ---- get ----
  server.tool(
    `get_${config.name}`,
    config.descriptions?.get ??
      `Get a single ${config.display} by id or slug (exactly one required).`,
    { id: z.string().optional(), slug: z.string().optional() },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((args: any) => handlers.handleGet(ctx, args)) as any,
  );

  // ---- create (only if dataLayer.create exists) ----
  if (config.dataLayer.create) {
    server.tool(
      `create_${config.name}`,
      config.descriptions?.create ?? `Create a new ${config.display}.`,
      config.schemas?.create ?? {},
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args: any) => handlers.handleCreate(ctx, args)) as any,
    );
  }

  // ---- update (only if dataLayer.update exists) ----
  if (config.dataLayer.update) {
    server.tool(
      `update_${config.name}`,
      config.descriptions?.update ??
        `Update an existing ${config.display} by id or slug (exactly one required).`,
      {
        id: z.string().optional(),
        slug: z.string().optional(),
        ...(config.schemas?.update ?? {}),
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args: any) => handlers.handleUpdate(ctx, args)) as any,
    );
  }

  // ---- delete (only if dataLayer.delete exists) ----
  if (config.dataLayer.delete) {
    server.tool(
      `delete_${config.name}`,
      config.descriptions?.delete ??
        `Delete a ${config.display} by id or slug (exactly one required). Irreversible.`,
      { id: z.string().optional(), slug: z.string().optional() },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((args: any) => handlers.handleDelete(ctx, args)) as any,
    );
  }
}

/**
 * Register a custom tool on an MCP server.
 */
export function registerCustomTool<TRepos = unknown>(
  server: McpServer,
  tool: CustomToolConfig<TRepos>,
  ctx: EntityContext<TRepos>,
): void {
  server.tool(
    tool.name,
    tool.description,
    tool.schema.shape,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ((args: any) => tool.handler(ctx, args)) as any,
  );
}
