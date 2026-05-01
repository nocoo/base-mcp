// ---------------------------------------------------------------------------
// Registration Engine — Unit Tests
// Verifies that registerEntityTools correctly registers tools on McpServer.
// ---------------------------------------------------------------------------

import { describe, it, expect, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { registerEntityTools, registerCustomTool } from "./register.js";
import type { EntityConfig, EntityContext, CustomToolConfig } from "./types.js";
import { ok } from "./response.js";

// ---------------------------------------------------------------------------
// Minimal mock entity
// ---------------------------------------------------------------------------

interface MockEntity {
  id: string;
  name: string;
  slug: string;
}

interface MockRepos {
  entities: MockEntity[];
}

const mockEntity: MockEntity = { id: "m-1", name: "Test", slug: "test" };

function createMockContext(): EntityContext<MockRepos> {
  return { repos: { entities: [mockEntity] } };
}

function createTestConfig(
  overrides?: Partial<EntityConfig<MockEntity, MockRepos>>,
): EntityConfig<MockEntity, MockRepos> {
  return {
    name: "widget",
    display: "Widget",
    plural: "widgets",
    dataLayer: {
      list: vi.fn(async () => [mockEntity]),
      getById: vi.fn(async () => mockEntity),
      getBySlug: vi.fn(async () => mockEntity),
      create: vi.fn(async () => mockEntity),
      update: vi.fn(async () => mockEntity),
      delete: vi.fn(async () => true),
    },
    schemas: {
      list: { status: z.string().optional() },
      create: { name: z.string() },
      update: { name: z.string().optional() },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("registerEntityTools", () => {
  it("registers 5 CRUD tools with default naming", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig();

    registerEntityTools(server, config, ctx);

    expect(toolSpy).toHaveBeenCalledTimes(5);
    const toolNames = toolSpy.mock.calls.map((call) => call[0]);
    expect(toolNames).toEqual([
      "list_widgets",
      "get_widget",
      "create_widget",
      "update_widget",
      "delete_widget",
    ]);
  });

  it("uses custom plural name", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig({ plural: "gadgets" });

    registerEntityTools(server, config, ctx);

    const toolNames = toolSpy.mock.calls.map((call) => call[0]);
    expect(toolNames[0]).toBe("list_gadgets");
  });

  it("adds include param to list tool when projection is configured", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig({
      projection: {
        omit: ["heavy"],
        groups: { heavy: ["heavy"] },
      },
    });

    registerEntityTools(server, config, ctx);

    // The list tool schema (3rd arg) should have an include field
    const listCall = toolSpy.mock.calls.find((c) => c[0] === "list_widgets");
    expect(listCall).toBeDefined();
    const schema = listCall![2] as Record<string, unknown>;
    expect(schema).toHaveProperty("include");
  });

  it("uses custom descriptions when provided", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig({
      descriptions: { list: "Custom list description." },
    });

    registerEntityTools(server, config, ctx);

    const listCall = toolSpy.mock.calls.find((c) => c[0] === "list_widgets");
    expect(listCall![1]).toBe("Custom list description.");
  });

  it("skips create tool when dataLayer.create is undefined", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig({
      dataLayer: {
        list: vi.fn(async () => [mockEntity]),
        getById: vi.fn(async () => mockEntity),
        // No create, update, delete
      },
    });

    registerEntityTools(server, config, ctx);

    expect(toolSpy).toHaveBeenCalledTimes(2); // list + get only
    const toolNames = toolSpy.mock.calls.map((call) => call[0]);
    expect(toolNames).toEqual(["list_widgets", "get_widget"]);
  });

  it("registered callbacks invoke handlers correctly", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig();

    registerEntityTools(server, config, ctx);

    // Extract the callback (4th arg) for list tool and invoke it
    const listCall = toolSpy.mock.calls.find((c) => c[0] === "list_widgets");
    const callback = listCall![3] as (args: Record<string, unknown>) => Promise<unknown>;
    const result = await callback({});
    expect(result).toBeDefined();
    expect(config.dataLayer.list).toHaveBeenCalled();
  });

  it("get/create/update/delete callbacks invoke their handlers", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const config = createTestConfig();

    registerEntityTools(server, config, ctx);

    const getCb = toolSpy.mock.calls.find((c) => c[0] === "get_widget")![3] as (
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    await getCb({ id: "m-1" });
    expect(config.dataLayer.getById).toHaveBeenCalled();

    const createCb = toolSpy.mock.calls.find((c) => c[0] === "create_widget")![3] as (
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    await createCb({ name: "x" });
    expect(config.dataLayer.create).toHaveBeenCalled();

    const updateCb = toolSpy.mock.calls.find((c) => c[0] === "update_widget")![3] as (
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    await updateCb({ id: "m-1", name: "y" });
    expect(config.dataLayer.update).toHaveBeenCalled();

    const deleteCb = toolSpy.mock.calls.find((c) => c[0] === "delete_widget")![3] as (
      args: Record<string, unknown>,
    ) => Promise<unknown>;
    await deleteCb({ id: "m-1" });
    expect(config.dataLayer.delete).toHaveBeenCalled();
  });
});

describe("registerCustomTool", () => {
  it("registers a custom tool", () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const handler = vi.fn(async () => ok({ success: true }));
    const tool: CustomToolConfig<MockRepos> = {
      name: "special_action",
      description: "Do something special",
      schema: z.object({ target: z.string() }),
      handler,
    };

    registerCustomTool(server, tool, ctx);

    expect(toolSpy).toHaveBeenCalledTimes(1);
    expect(toolSpy.mock.calls[0][0]).toBe("special_action");
    expect(toolSpy.mock.calls[0][1]).toBe("Do something special");
  });

  it("custom tool callback invokes handler", async () => {
    const server = new McpServer({ name: "test", version: "0.0.1" });
    const toolSpy = vi.spyOn(server, "tool");
    const ctx = createMockContext();
    const handler = vi.fn(async () => ok({ success: true }));
    const tool: CustomToolConfig<MockRepos> = {
      name: "special_action",
      description: "Do something special",
      schema: z.object({ target: z.string() }),
      handler,
    };

    registerCustomTool(server, tool, ctx);

    const callback = toolSpy.mock.calls[0][3] as (args: Record<string, unknown>) => Promise<unknown>;
    await callback({ target: "foo" });

    expect(handler).toHaveBeenCalledWith(ctx, { target: "foo" });
  });
});
