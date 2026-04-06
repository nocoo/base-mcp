import { describe, it, expect } from "vitest";
import { createMcpServer } from "./create-server.js";

describe("createMcpServer", () => {
  it("creates an McpServer instance with name and version", () => {
    const server = createMcpServer({
      name: "test-server",
      version: "1.0.0",
    });

    expect(server).toBeDefined();
    // McpServer doesn't expose name/version directly, but we can check it was created
    expect(typeof server.tool).toBe("function");
    expect(typeof server.connect).toBe("function");
  });

  it("enables tools capability by default", () => {
    const server = createMcpServer({
      name: "test-server",
      version: "1.0.0",
    });

    // We can register a tool without error
    expect(() => {
      server.tool("test_tool", "A test tool", {}, async () => ({
        content: [{ type: "text", text: "ok" }],
      }));
    }).not.toThrow();
  });

  it("accepts custom capabilities", () => {
    const server = createMcpServer({
      name: "test-server",
      version: "1.0.0",
      capabilities: {
        tools: true,
        resources: true,
        prompts: false,
      },
    });

    expect(server).toBeDefined();
  });

  it("can disable tools capability", () => {
    const server = createMcpServer({
      name: "test-server",
      version: "1.0.0",
      capabilities: {
        tools: false,
      },
    });

    expect(server).toBeDefined();
  });
});
