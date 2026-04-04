# MCP Servers

> **[CAPABILITY: MCP]**

This directory contains MCP (Model Context Protocol) server implementations used by the ADCT reference project.

## What is an MCP Server?

An MCP server extends Claude with **tools** (actions Claude can take) and **resources** (data Claude can read) that go beyond the built-in file and bash tools.

When Claude Code connects to an MCP server:
- Tools appear in Claude's tool list alongside built-in tools like `Read`, `Bash`, `Edit`
- Resources can be read via the resource URI scheme (e.g., `nexus://runbooks/payment-service-restart`)

## Servers in This Directory

### `nexus-platform/` — Custom MCP Server (built from scratch)

This is the **main educational artifact**. It shows you exactly how to build an MCP server.

**Tools provided:**
| Tool | Purpose |
|------|---------|
| `list_services` | Get current status of all Nexus Platform services |
| `get_service_status` | Detailed pod health, error rates, deployment history |
| `create_deployment` | Register a deployment in the tracker |
| `rollback_deployment` | Initiate a service rollback |
| `set_feature_flag` | Enable/disable LaunchDarkly feature flags |
| `create_incident` | Declare a P1/P2/P3 incident |
| `update_incident` | Add timeline updates to an incident |
| `resolve_incident` | Mark incident resolved (triggers postmortem prompt) |
| `list_incidents` | Browse recent incidents |

**Resources provided:**
| URI | Content |
|-----|---------|
| `nexus://runbooks/payment-service-restart` | Safe restart procedure |
| `nexus://runbooks/notification-service-dlq-drain` | DLQ drain procedure |
| `nexus://runbooks/rollback-playbook` | General rollback playbook |

**How to run:**
```bash
cd mcp-servers/nexus-platform
npm install
npm run build
node dist/index.js  # Starts the MCP server on stdio
```

**How it's configured** (in `.claude/settings.json`):
```json
{
  "mcpServers": {
    "nexus-platform": {
      "type": "stdio",
      "command": "node",
      "args": ["./mcp-servers/nexus-platform/dist/index.js"]
    }
  }
}
```

## Official MCP Servers (pre-built)

These are pre-built servers from Anthropic's MCP ecosystem. You configure them in `.claude/settings.json` — no code to write.

### GitHub MCP Server
```bash
npx @modelcontextprotocol/server-github
```
Provides: PR creation, issue management, code review comments, repository browsing.

Configure with `GITHUB_PERSONAL_ACCESS_TOKEN`.

### PostgreSQL MCP Server
```bash
npx @modelcontextprotocol/server-postgres postgresql://user:pass@localhost/dbname
```
Provides: SQL queries, schema inspection, table browsing.

Used by: the orchestrator to query workflow state from Claude sessions.

## Building Your Own MCP Server

See `nexus-platform/src/index.ts` for a complete annotated example. The pattern is:

```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({ name: 'my-server', version: '1.0.0' }, { capabilities: { tools: {} } });

// Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{ name: 'my_tool', description: '...', inputSchema: { ... } }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  // Handle tool calls
});

// Connect
const transport = new StdioServerTransport();
await server.connect(transport);
```
