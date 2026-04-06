# AI Delivery Control Tower (ADCT)

**A reference project for Claude Code** — demonstrating memory, skills, hooks, agents, MCP, and plugins in a real product context.

Not a toy demo. A working engineering copilot for a fictional B2B SaaS company (Nexus Platform) that teams would genuinely use.

> **Read the full write-up**: [Your Team is Using Claude Wrong — Here's How to Fix It](https://medium.com/@amitmahajan.cloud/your-team-is-using-claude-wrong-heres-how-to-fix-it-c77b89ba3195)

---

## What This Is

A full Claude Code reference implementation that shows developers **exactly how to use every major capability**:

| Capability | Where | What It Does |
|-----------|-------|-------------|
| **Memory (CLAUDE.md)** | `CLAUDE.md` | Architecture rules, coding conventions, release policies — loaded in every session |
| **Memory (Rules)** | `.claude/rules/` | File-type-specific rules (TypeScript, Python, K8s, Payments/PCI-DSS) |
| **Memory (Auto)** | `.claude/memory/session-log.md` | Decisions captured at session end via Stop hook |
| **Skills** | `.claude/skills/` | 10 reusable specialist capabilities (ADR writing, contract tests, risk review...) |
| **Hooks** | `.claude/hooks/` | 4 lifecycle hooks (safety guardrails, auto-lint, test-fail detection, session memory) |
| **Agents** | `.claude/agents/` | 6 custom subagents (planner, architect, backend, tester, security, release) |
| **MCP Custom** | `mcp-servers/nexus-platform/` | Custom MCP server built from scratch — the main teaching artifact |
| **MCP Official** | `.claude/settings.json` | GitHub + Postgres official MCP servers |
| **Plugins** | `plugins/` | 2 installable capability packs (engineering-governance, payments-platform) |
| **Agent SDK** | `orchestrator/` | Python backend that runs workflows programmatically (Phase 3) |

---

## Quick Start

```bash
# 1. Clone and enter
cd adct/

# 2. Run environment check + Demo 1 orientation
bash demo-runner.sh

# 3. Open Claude Code in this directory
claude

# 4. Paste the Demo 1 requirement from demo-scenarios/01-feature-delivery/input.md
```

---

## The 3 Demos

### Demo 1: Feature Delivery (start here)
**Requirement**: "Add webhook retry logic to the notification service with exponential backoff and dead-letter queue support"

**Showcases**: All 7 capabilities in one workflow. The full 6-agent chain executes.

```bash
bash demo-scenarios/01-feature-delivery/run.sh
```

### Demo 2: Incident Response
**Requirement**: "P1 — Payment processing failing for 3% of transactions since last deploy"

**Showcases**: Incident MCP tools, k8s-triage skill, Stop hook → postmortem auto-trigger, memory capture.

```bash
bash demo-scenarios/02-incident-response/run.sh
```

### Demo 3: Security Audit (plugins showcase)
**Requirement**: "Audit payment-service for PCI-DSS compliance before Q1 release"

**Showcases**: Plugin install, PCI-DSS rules from memory, payments-risk-review skill, security-reviewer agent.

```bash
bash demo-scenarios/03-security-audit/run.sh
```

---

## Project Structure

```
adct/
├── CLAUDE.md                       ← [MEMORY] Always loaded — architecture rules
├── .claude/
│   ├── settings.json               ← [HOOKS + MCP] Hook bindings + MCP server config
│   ├── rules/                      ← [MEMORY] typescript.md, python.md, kubernetes.md, payments.md
│   ├── skills/                     ← [SKILLS] 10 skill files
│   ├── agents/                     ← [AGENTS] 6 agent definitions
│   └── hooks/                      ← [HOOKS] 4 shell scripts
├── mcp-servers/
│   └── nexus-platform/             ← [MCP] Custom MCP server — build this to learn MCP
├── plugins/
│   ├── engineering-governance/     ← [PLUGINS] ADR + contract tests + arch review
│   └── payments-platform/          ← [PLUGINS] PCI-DSS compliance pack
├── sample-services/
│   ├── payment-service/            ← TypeScript/Node.js — target for Demo 1, 3
│   ├── user-service/               ← TypeScript/Node.js
│   └── notification-service/       ← Python/FastAPI — primary target for Demo 1
├── orchestrator/                   ← [AGENT SDK] Python + Anthropic SDK (Phase 3)
├── demo-scenarios/                 ← 3 runnable end-to-end scenarios
├── capability-matrix.md            ← Every capability mapped to its file
└── demo-runner.sh                  ← One-script setup
```

---

## Capability Deep Dives

### Memory

Claude Code loads memory in this order:
1. `CLAUDE.md` — project-wide rules (always loaded)
2. `.claude/rules/{type}.md` — file-type rules (loaded when Claude edits a matching file)
3. `.claude/memory/session-log.md` — accumulated session learnings (if it exists)

**The key insight**: Claude doesn't need to be reminded of your conventions each time. Put them in memory once, they apply forever.

**Demo moment**: Backend engineer uses ULID (not UUID) on first attempt because `.claude/rules/typescript.md` says so. No reminder needed.

### Skills

Skills live in `.claude/skills/` as `.md` files. Each defines:
- When to invoke the skill
- What output to produce (always a specific file format)
- Rules and constraints

Invoke: `/skill-name` or agents auto-invoke relevant skills.

**The key insight**: Skills standardize the output format of repetitive specialist tasks. An ADR written by the `write-adr` skill always has the same structure.

### Hooks

Hooks are shell scripts configured in `.claude/settings.json`. They fire on lifecycle events.

| Hook | Event | File |
|------|-------|------|
| `PreToolUse:Bash` | Before every shell command | `pre-tool-use-bash.sh` |
| `PostToolUse:Edit\|Write` | After every file edit | `post-tool-use-edit.sh` |
| `PostToolUse:Bash` | After every shell command | `post-test-fail.sh` |
| `Stop` | Session end | `stop-save-memory.sh` |

**The key insight**: Hooks let you build guardrails and automation that run even when Claude is operating autonomously via the Agent SDK.

### Custom Agents

Agent files in `.claude/agents/` define specialist subagents with:
- YAML frontmatter: `name`, `description`, `tools`
- System prompt: identity, process, rules

Claude delegates to agents via the Agent tool. Each agent has its own context and tool access.

**The key insight**: Agents split complex multi-step work between specialists. The planner doesn't write code; the backend engineer doesn't write ADRs. Each does one thing well.

### MCP — Building Your Own

`mcp-servers/nexus-platform/` is the main educational artifact. It shows the complete pattern:

```typescript
// 1. Create a server
const server = new Server({ name: 'my-server', version: '1.0.0' }, { capabilities: { tools: {} } });

// 2. Register tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: [...] }));
server.setRequestHandler(CallToolRequestSchema, async (request) => { /* handle */ });

// 3. Register resources (optional)
server.setRequestHandler(ListResourcesRequestSchema, async () => ({ resources: [...] }));

// 4. Connect via stdio
await server.connect(new StdioServerTransport());
```

Configure in `.claude/settings.json`:
```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "node",
      "args": ["./dist/index.js"]
    }
  }
}
```

### Plugins

Plugins package skills + agents + rules into installable units:

```bash
# Adds 2 skills + 1 agent + 1 rule file
claude plugin install ./plugins/payments-platform
```

Each plugin has a `plugin.json` manifest describing what it includes.

**The key insight**: Plugins let you share compliance packs, domain knowledge, and specialist capabilities across teams and repos as a single install.

---

## Three Phases

| Phase | What's Working | How to Use |
|-------|---------------|------------|
| **Phase 1 — CLI MVP** | Everything in `.claude/`, MCP server, 3 sample services, Demo 1 | `claude` in this directory |
| **Phase 2 — Full** | All 10 skills, all 6 agents, both plugins, Demo 2 | Same |
| **Phase 3 — Platform** | `orchestrator/` (Agent SDK) + `dashboard/` (Next.js) | `docker compose up` |

---

## For Developers New to Claude Code

**Start here** → `CLAUDE.md` (see how memory works)
**Then** → `.claude/skills/write-adr.md` (see how skills work)
**Then** → `.claude/hooks/pre-tool-use-bash.sh` (see how hooks work)
**Then** → `.claude/agents/planner.md` (see how agents work)
**Then** → `mcp-servers/nexus-platform/src/index.ts` (see how to build MCP servers)
**Then** → `plugins/payments-platform/plugin.json` (see how plugins work)
**Finally** → Run Demo 1 and watch it all work together

**The full map**: `capability-matrix.md`

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| payment-service, user-service | TypeScript 5, Node.js, Express, ULID, neverthrow, Zod, Pino |
| notification-service | Python 3.12, FastAPI, Pydantic v2, structlog, python-ulid |
| Custom MCP server | TypeScript, @modelcontextprotocol/sdk |
| Orchestrator (Phase 3) | Python 3.12, FastAPI, anthropic SDK |
| Dashboard (Phase 3) | Next.js 15, TypeScript, Tailwind |
| Package managers | pnpm (JS), uv (Python) |

---

## License

MIT — use this as a starting point for your own team's Claude Code setup.
