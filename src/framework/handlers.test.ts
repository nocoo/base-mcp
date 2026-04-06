import { describe, it, expect, vi } from "vitest";
import { createCrudHandlers } from "./handlers.js";
import type { EntityConfig, EntityContext } from "./types.js";

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

interface TestEntity {
  id: string;
  name: string;
  content?: string;
}

interface TestRepos {
  items: TestEntity[];
}

function createMockContext(items: TestEntity[] = []): EntityContext<TestRepos> {
  return { repos: { items } };
}

function parseResult(result: { content: Array<{ type: string; text?: string }> }): unknown {
  const textContent = result.content.find((c) => c.type === "text");
  if (!textContent || !("text" in textContent)) return null;
  return JSON.parse(textContent.text as string);
}

function createTestConfig(
  overrides: Partial<EntityConfig<TestEntity, TestRepos>> = {},
): EntityConfig<TestEntity, TestRepos> {
  return {
    name: "item",
    display: "Test Item",
    plural: "items",
    dataLayer: {
      list: async (ctx) => ctx.repos.items,
      getById: async (ctx, id) => ctx.repos.items.find((i) => i.id === id) ?? null,
      getBySlug: async () => null,
      create: async (ctx, input) => {
        const entity = { id: "new-id", ...input } as TestEntity;
        ctx.repos.items.push(entity);
        return entity;
      },
      update: async (ctx, id, input) => {
        const idx = ctx.repos.items.findIndex((i) => i.id === id);
        if (idx === -1) return null;
        ctx.repos.items[idx] = { ...ctx.repos.items[idx], ...input };
        return ctx.repos.items[idx];
      },
      delete: async (ctx, id) => {
        const idx = ctx.repos.items.findIndex((i) => i.id === id);
        if (idx === -1) return false;
        ctx.repos.items.splice(idx, 1);
        return true;
      },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// handleList
// ---------------------------------------------------------------------------

describe("handleList", () => {
  it("returns all items", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([
      { id: "1", name: "First" },
      { id: "2", name: "Second" },
    ]);

    const result = await handlers.handleList(ctx, {});
    const data = parseResult(result) as TestEntity[];

    expect(data).toHaveLength(2);
    expect(data[0].name).toBe("First");
  });

  it("applies projection to omit fields", async () => {
    const config = createTestConfig({
      projection: {
        omit: ["content"],
        groups: { full: ["content"] },
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([
      { id: "1", name: "First", content: "Long text..." },
    ]);

    const result = await handlers.handleList(ctx, {});
    const data = parseResult(result) as Array<Record<string, unknown>>;

    expect(data[0]).not.toHaveProperty("content");
    expect(data[0]).toHaveProperty("name", "First");
  });

  it("restores fields when include group specified", async () => {
    const config = createTestConfig({
      projection: {
        omit: ["content"],
        groups: { full: ["content"] },
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([
      { id: "1", name: "First", content: "Long text..." },
    ]);

    const result = await handlers.handleList(ctx, { include: ["full"] });
    const data = parseResult(result) as Array<Record<string, unknown>>;

    expect(data[0]).toHaveProperty("content", "Long text...");
  });

  it("returns empty array when no items", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleList(ctx, {});
    const data = parseResult(result);

    expect(data).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// handleGet
// ---------------------------------------------------------------------------

describe("handleGet", () => {
  it("resolves entity by id", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "First" }]);

    const result = await handlers.handleGet(ctx, { id: "1" });
    const data = parseResult(result) as TestEntity;

    expect(data.name).toBe("First");
  });

  it("returns error when entity not found", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleGet(ctx, { id: "missing" });

    expect(result.isError).toBe(true);
    expect(result.content[0]).toHaveProperty("text", "Test Item not found: missing");
  });

  it("returns error when both id and slug provided", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "First" }]);

    const result = await handlers.handleGet(ctx, { id: "1", slug: "first" });

    expect(result.isError).toBe(true);
  });

  it("returns error when neither id nor slug provided", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleGet(ctx, {});

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// handleCreate
// ---------------------------------------------------------------------------

describe("handleCreate", () => {
  it("creates entity and returns it", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleCreate(ctx, { name: "New Item" });
    const data = parseResult(result) as TestEntity;

    expect(data.name).toBe("New Item");
    expect(data.id).toBe("new-id");
    expect(ctx.repos.items).toHaveLength(1);
  });

  it("calls beforeCreate hook", async () => {
    const beforeCreate = vi.fn().mockImplementation(async (_ctx, input) => ({
      ...input,
      name: input.name + " (modified)",
    }));
    const config = createTestConfig({ hooks: { beforeCreate } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleCreate(ctx, { name: "Original" });
    const data = parseResult(result) as TestEntity;

    expect(beforeCreate).toHaveBeenCalled();
    expect(data.name).toBe("Original (modified)");
  });

  it("calls afterCreate hook (best-effort)", async () => {
    const afterCreate = vi.fn();
    const config = createTestConfig({ hooks: { afterCreate } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    await handlers.handleCreate(ctx, { name: "New" });

    expect(afterCreate).toHaveBeenCalled();
  });

  it("continues on afterCreate hook failure", async () => {
    const afterCreate = vi.fn().mockRejectedValue(new Error("Hook failed"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const config = createTestConfig({ hooks: { afterCreate } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleCreate(ctx, { name: "New" });

    expect(result.isError).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("returns error when create not supported", async () => {
    const config = createTestConfig({
      dataLayer: {
        list: async () => [],
        getById: async () => null,
        // No create defined
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleCreate(ctx, { name: "New" });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// handleUpdate
// ---------------------------------------------------------------------------

describe("handleUpdate", () => {
  it("updates entity by id", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "Original" }]);

    const result = await handlers.handleUpdate(ctx, { id: "1", name: "Updated" });
    const data = parseResult(result) as TestEntity;

    expect(data.name).toBe("Updated");
    expect(ctx.repos.items[0].name).toBe("Updated");
  });

  it("returns error when entity not found", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleUpdate(ctx, { id: "missing", name: "Updated" });

    expect(result.isError).toBe(true);
  });

  it("strips id from update input", async () => {
    const updateSpy = vi.fn().mockImplementation(async (_ctx, id, input) => {
      return { id, ...input };
    });
    const config = createTestConfig({
      dataLayer: {
        list: async () => [],
        getById: async (_ctx, id) => (id === "1" ? { id: "1", name: "Test" } : null),
        update: updateSpy,
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    await handlers.handleUpdate(ctx, { id: "1", name: "Updated", extra: "field" });

    // id should not be in the input passed to update
    expect(updateSpy).toHaveBeenCalledWith(ctx, "1", { name: "Updated", extra: "field" });
  });

  it("calls beforeUpdate hook with existing entity", async () => {
    const beforeUpdate = vi.fn().mockImplementation(async (_ctx, _id, input) => input);
    const config = createTestConfig({ hooks: { beforeUpdate } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "Original" }]);

    await handlers.handleUpdate(ctx, { id: "1", name: "Updated" });

    expect(beforeUpdate).toHaveBeenCalledWith(
      ctx,
      "1",
      { name: "Updated" },
      expect.objectContaining({ id: "1", name: "Original" }),
    );
  });

  it("returns error when update not supported", async () => {
    const config = createTestConfig({
      dataLayer: {
        list: async () => [],
        getById: async () => ({ id: "1", name: "Test" }),
        // No update defined
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleUpdate(ctx, { id: "1", name: "Updated" });

    expect(result.isError).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// handleDelete
// ---------------------------------------------------------------------------

describe("handleDelete", () => {
  it("deletes entity by id", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "ToDelete" }]);

    const result = await handlers.handleDelete(ctx, { id: "1" });
    const data = parseResult(result) as { deleted: boolean };

    expect(data.deleted).toBe(true);
    expect(ctx.repos.items).toHaveLength(0);
  });

  it("returns error when entity not found", async () => {
    const config = createTestConfig();
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleDelete(ctx, { id: "missing" });

    expect(result.isError).toBe(true);
  });

  it("calls beforeDelete hook", async () => {
    const beforeDelete = vi.fn();
    const config = createTestConfig({ hooks: { beforeDelete } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "ToDelete" }]);

    await handlers.handleDelete(ctx, { id: "1" });

    expect(beforeDelete).toHaveBeenCalledWith(
      ctx,
      "1",
      expect.objectContaining({ id: "1" }),
    );
  });

  it("calls afterDelete hook", async () => {
    const afterDelete = vi.fn();
    const config = createTestConfig({ hooks: { afterDelete } });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([{ id: "1", name: "ToDelete" }]);

    await handlers.handleDelete(ctx, { id: "1" });

    expect(afterDelete).toHaveBeenCalledWith(ctx, "1");
  });

  it("returns error when delete not supported", async () => {
    const config = createTestConfig({
      dataLayer: {
        list: async () => [],
        getById: async () => ({ id: "1", name: "Test" }),
        // No delete defined
      },
    });
    const handlers = createCrudHandlers(config);
    const ctx = createMockContext([]);

    const result = await handlers.handleDelete(ctx, { id: "1" });

    expect(result.isError).toBe(true);
  });
});
