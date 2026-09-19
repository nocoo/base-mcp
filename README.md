<h1 align="center">base-mcp</h1>
<p align="center">为 MCP 服务提供实体 CRUD、OAuth 与 HTTP 集成工具。</p>
<p align="center"><a href="docs/README.en.md">English</a></p>

## 这是什么

`@nocoo/base-mcp` 是 MCP 服务开发库，为已有应用提供实体工具注册、OAuth 2.1 辅助函数与 Streamable HTTP 集成。消费项目负责 HTTP 服务、用户认证、数据层和凭据存储；本包不提供独立部署服务。

## 功能

- 声明实体与 schema，注册列表、查询、创建、更新和删除工具。
- 支持字段投影、ID／slug 解析、生命周期 hooks 与统一工具响应。
- 提供 PKCE、OAuth 元数据、loopback 回调地址、Origin 和 Bearer Token 校验工具。
- 提供 mock context、结果解析和测试 token store。

## 使用

包声明 Node.js 18+；SDK 与 Zod 由消费项目提供：

```sh
pnpm add @nocoo/base-mcp
pnpm add @modelcontextprotocol/sdk zod
```

```typescript
import { createMcpServer } from "@nocoo/base-mcp";
import { getOAuthMetadata } from "@nocoo/base-mcp/auth";

const server = createMcpServer({ name: "my-app", version: "1.0.0" });
const metadata = getOAuthMetadata("https://my-app.example");
```

随后注册实体数据适配器，连接 MCP SDK 的 Streamable HTTP transport。OAuth discovery 的 `/.well-known/` 路由保持公开；业务 MCP 路由仍须验证 Origin 和 Token。完整路由、CRUD 与授权示例见[集成说明](docs/integration.md)，其中应用数据层函数需要自行实现。

## 开发

使用 pnpm 10.33.0 与 `pnpm-lock.yaml`；CI 使用 Node.js 22.23.2。

```sh
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run lint
pnpm run build
```

`src/auth/` 管认证，`src/framework/` 管实体工具，`src/server/` 管服务创建，`src/testing/` 提供测试辅助。构建输出 `dist/` 与类型声明，`prepublishOnly` 会先构建。

## 测试

```sh
pnpm run test
pnpm run test:coverage
```

Vitest 检查认证辅助、实体 CRUD、投影和服务创建，使用假凭据与内存存储；当前仓库没有完整的真实 HTTP transport 验收流程。

## 技术栈

| 技术 | 用途 |
| --- | --- |
| TypeScript | 公共 API、类型声明与构建 |
| MCP SDK、Zod | 协议接入与输入 schema |
| pnpm、Biome | 依赖管理与静态检查 |
| Vitest | 模块行为与测试辅助验证 |

## 文档

- [OAuth、HTTP 与实体集成说明](docs/integration.md)。
- [公共导出](src/index.ts)与[认证入口](src/auth/index.ts)。
- [维护与发布说明](CLAUDE.md)。

## 许可证

`package.json` 声明 MIT；仓库当前未附独立 LICENSE 文本。
