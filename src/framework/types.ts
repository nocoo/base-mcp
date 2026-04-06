// ---------------------------------------------------------------------------
// Entity-Driven MCP Framework — Type Definitions
// ---------------------------------------------------------------------------

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodTypeAny, z } from "zod";

// ---- Field projection ----

export interface ProjectionConfig {
  /** Fields to omit from list responses by default. */
  omit: string[];
  /** Named groups of omitted fields. Key = group name, value = field names. */
  groups: Record<string, string[]>;
}

// ---- Entity Configuration ----

/**
 * Context passed to data layer functions.
 * Generic to allow different repo structures per project.
 */
export interface EntityContext<TRepos = unknown> {
  repos: TRepos;
}

/**
 * Data layer interface for an entity.
 * All methods receive the context and return promises.
 */
export interface DataLayer<T, TRepos = unknown> {
  list: (ctx: EntityContext<TRepos>, opts: Record<string, unknown>) => Promise<T[]>;
  getById: (ctx: EntityContext<TRepos>, id: string) => Promise<T | null>;
  getBySlug?: (ctx: EntityContext<TRepos>, slug: string) => Promise<T | null>;
  create?: (ctx: EntityContext<TRepos>, input: Record<string, unknown>) => Promise<T>;
  update?: (ctx: EntityContext<TRepos>, id: string, input: Record<string, unknown>) => Promise<T | null>;
  delete?: (ctx: EntityContext<TRepos>, id: string) => Promise<boolean>;
}

/**
 * Lifecycle hooks for entity operations.
 */
export interface EntityHooks<T, TRepos = unknown> {
  beforeCreate?: (ctx: EntityContext<TRepos>, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  afterCreate?: (ctx: EntityContext<TRepos>, result: T) => Promise<void>;
  beforeUpdate?: (
    ctx: EntityContext<TRepos>,
    id: string,
    input: Record<string, unknown>,
    existing: T
  ) => Promise<Record<string, unknown>>;
  afterUpdate?: (
    ctx: EntityContext<TRepos>,
    id: string,
    input: Record<string, unknown>,
    result: T
  ) => Promise<void>;
  beforeDelete?: (ctx: EntityContext<TRepos>, id: string, existing: T) => Promise<void>;
  afterDelete?: (ctx: EntityContext<TRepos>, id: string) => Promise<void>;
}

/**
 * Schema definitions for entity operations.
 */
export interface EntitySchemas {
  list?: Record<string, ZodTypeAny>;
  create?: Record<string, ZodTypeAny>;
  update?: Record<string, ZodTypeAny>;
}

/**
 * Description text for generated tools.
 */
export interface EntityDescriptions {
  list?: string;
  get?: string;
  create?: string;
  update?: string;
  delete?: string;
}

/**
 * Full entity configuration.
 */
export interface EntityConfig<T, TRepos = unknown> {
  /** Singular name (e.g., "product") */
  name: string;
  /** Human-readable display name (e.g., "理财产品") */
  display: string;
  /** Plural name for list operations (e.g., "products") */
  plural: string;
  /** Data access layer */
  dataLayer: DataLayer<T, TRepos>;
  /** Zod schemas for input validation */
  schemas?: EntitySchemas;
  /** Tool descriptions for MCP */
  descriptions?: EntityDescriptions;
  /** Field projection configuration */
  projection?: ProjectionConfig;
  /** Lifecycle hooks */
  hooks?: EntityHooks<T, TRepos>;
}

// ---- Tool Handler Types ----

export type ToolHandler<TRepos = unknown> = (
  ctx: EntityContext<TRepos>,
  args: Record<string, unknown>
) => Promise<CallToolResult>;

export interface CustomToolConfig<TRepos = unknown> {
  name: string;
  description: string;
  schema: z.ZodObject<Record<string, ZodTypeAny>>;
  handler: ToolHandler<TRepos>;
}
