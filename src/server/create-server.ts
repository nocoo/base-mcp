// ---------------------------------------------------------------------------
// MCP Server Factory
// ---------------------------------------------------------------------------

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export interface McpServerConfig {
  /** Server name (e.g., "noheir") */
  name: string;
  /** Server version (e.g., "3.0.0") */
  version: string;
  /** Server capabilities (optional, sensible defaults provided) */
  capabilities?: {
    tools?: boolean;
    resources?: boolean;
    prompts?: boolean;
  };
}

/**
 * Create an MCP Server instance with the given configuration.
 *
 * This is a thin wrapper around the SDK's McpServer that provides
 * sensible defaults for the base-mcp framework.
 *
 * @param config - Server configuration
 * @returns Configured McpServer instance
 */
export function createMcpServer(config: McpServerConfig): McpServer {
  const { name, version, capabilities = {} } = config;

  // Default capabilities: tools enabled
  const serverCapabilities = {
    tools: capabilities.tools !== false ? {} : undefined,
    resources: capabilities.resources ? {} : undefined,
    prompts: capabilities.prompts ? {} : undefined,
  };

  return new McpServer(
    { name, version },
    { capabilities: serverCapabilities },
  );
}
