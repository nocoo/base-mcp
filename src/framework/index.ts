// Framework exports

export { type CrudHandlers, createCrudHandlers } from "./handlers.js";
export { projectFields } from "./projection.js";
export { registerCustomTool, registerEntityTools } from "./register.js";
export {
  type IdOrSlug,
  isResolveError,
  type ResolveResult,
  resolveEntity,
  validateIdOrSlug,
} from "./resolve.js";
export { error, ok } from "./response.js";
export type {
  CustomToolConfig,
  DataLayer,
  EntityConfig,
  EntityContext,
  EntityDescriptions,
  EntityHooks,
  EntitySchemas,
  ProjectionConfig,
  ToolHandler,
} from "./types.js";
