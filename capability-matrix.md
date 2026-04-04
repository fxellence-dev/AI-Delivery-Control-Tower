# Capability Matrix

> Jump directly to any Claude Code capability and see exactly which files demonstrate it.

## Quick Navigation

| Capability | Files | Demo Scenarios |
|-----------|-------|---------------|
| [Memory — CLAUDE.md](#memory--claudemd) | `CLAUDE.md` | All 3 |
| [Memory — Rules](#memory--rules) | `.claude/rules/*.md` | All 3 |
| [Memory — Auto Memory](#memory--auto-memory) | `.claude/hooks/stop-save-memory.sh`, `.claude/memory/` | Demo 2 |
| [Skills](#skills) | `.claude/skills/*.md` | All 3 |
| [Hooks — PreToolUse](#hooks--pretooluse) | `.claude/hooks/pre-tool-use-bash.sh` | Any Bash command |
| [Hooks — PostToolUse](#hooks--posttooluse) | `.claude/hooks/post-tool-use-edit.sh`, `post-test-fail.sh` | Demo 1 |
| [Hooks — Stop](#hooks--stop) | `.claude/hooks/stop-save-memory.sh` | Demo 2 |
| [Agents](#agents) | `.claude/agents/*.md` | All 3 |
| [MCP — Custom Server](#mcp--custom-server) | `mcp-servers/nexus-platform/` | All 3 |
| [MCP — Official Servers](#mcp--official-servers) | `.claude/settings.json` | Demo 1, 3 |
| [Plugins](#plugins) | `plugins/*/` | Demo 3 |
| [Agent SDK](#agent-sdk) | `orchestrator/` | Phase 3 |

---

## Memory — CLAUDE.md

**File**: `CLAUDE.md`

**What it demonstrates**: Project-wide persistent instructions. Loaded at the start of every Claude Code session. Agents read this before doing anything else.

**Key moments**:
- Backend engineer uses ULID (not UUID) because CLAUDE.md says so — without being reminded
- Release manager blocks Friday deploys because CLAUDE.md says so
- After an incident, the CLAUDE.md known quirk about `nexus-dlq` manual drain is applied

**Anatomy of CLAUDE.md in this project**:
- Service ownership table → planner knows which team to tag
- Architecture principles → architect checks these before every decision
- Coding conventions → backend engineer applies ULID, Result types, logging patterns
- Release rules → release manager applies no-Friday rule, canary percentages
- Known integration quirks → backend engineer knows about DLQ, SQS size limits, ULID/UUID legacy

---

## Memory — Rules

**Files**: `.claude/rules/typescript.md`, `.claude/rules/python.md`, `.claude/rules/kubernetes.md`, `.claude/rules/payments.md`

**What it demonstrates**: File-type-specific rule overrides. Claude loads the most specific matching rule for the file being edited. These supplement CLAUDE.md with domain-specific detail.

**Key moments**:
- When editing a `.ts` file → `typescript.md` loaded → ULID pattern, neverthrow, Zod enforced
- When editing a `.py` file → `python.md` loaded → structlog, Pydantic v2, mypy enforced
- When editing a K8s manifest → `kubernetes.md` loaded → resource limits required, prod namespace warning
- When touching payment code → `payments.md` loaded → PCI-DSS hard rules applied

**Rule precedence**: `.claude/rules/{domain}.md` > `CLAUDE.md`. Specific beats general.

---

## Memory — Auto Memory

**Files**: `.claude/hooks/stop-save-memory.sh`, `.claude/memory/session-log.md`

**What it demonstrates**: Session-level memory capture. The Stop hook fires at end of every session and appends a template to `session-log.md`. Claude fills in decisions, patterns, and corrections made during the session.

**Key moments** (Demo 2):
- Incident resolved → `resolve_incident` MCP called
- Stop hook fires → session log template appended
- Claude writes: "MEMORY: SQS queue depth is a leading indicator of payment timeouts"
- Future sessions load `session-log.md` and know this pattern

---

## Skills

**Files**: `.claude/skills/*.md`

| Skill File | Invoked By | Output |
|-----------|-----------|--------|
| `write-adr.md` | architect agent, `/write-adr` | `docs/adrs/ADR-NNN-*.md` |
| `generate-acceptance-criteria.md` | planner agent, `/generate-acceptance-criteria` | AC block in delivery plan |
| `create-contract-tests.md` | test-engineer agent, `/create-contract-tests` | Pact test files |
| `review-openapi-breaking-change.md` | architect agent, `/review-openapi-breaking-change` | PR review comment |
| `prepare-release-notes.md` | release-manager agent, `/prepare-release-notes` | `docs/releases/*.md` |
| `build-postmortem.md` | stop hook, `/build-postmortem` | `docs/postmortems/PM-*.md` |
| `payments-risk-review.md` | security-reviewer agent, `/payments-risk-review` | `docs/reviews/payment-risk-*.md` |
| `k8s-triage.md` | planner agent in incident mode, `/k8s-triage` | Triage report |
| `design-sequence-diagram.md` | architect agent, `/design-sequence-diagram` | `docs/diagrams/*.md` |
| `review-helm-chart.md` | platform-reviewer agent, `/review-helm-chart` | Review checklist |

**What makes a skill different from a regular prompt**:
- Skills are named, versioned, and discoverable via `/skill-name`
- Skills produce standardized output formats (templates)
- Skills can be auto-invoked by agents (architect auto-invokes write-adr)
- Skills are testable — you can run a skill against known input and verify output

---

## Hooks — PreToolUse

**File**: `.claude/hooks/pre-tool-use-bash.sh`

**What it demonstrates**: Safety guardrails that run BEFORE Claude executes a Bash command.

**Rules enforced**:
- `rm -rf` → blocked
- `kubectl delete` against `nexus-prod` → blocked with explanation
- `DROP TABLE/DATABASE` → blocked
- Force push to protected branches → blocked
- `kubectl apply` to prod → allowed but warned

**Try it**: Ask Claude to run `rm -rf sample-services/` — the hook blocks it.

---

## Hooks — PostToolUse

**Files**: `.claude/hooks/post-tool-use-edit.sh`, `.claude/hooks/post-test-fail.sh`

**What they demonstrate**:

`post-tool-use-edit.sh` — runs after every file edit:
- TypeScript: `eslint --fix` + `tsc --noEmit`
- Python: `ruff check --fix` + `ruff format` + `mypy`
- YAML: syntax validation

`post-test-fail.sh` — runs after every Bash command that exits non-zero:
- Detects if the command was a test runner (jest/vitest/pytest)
- Extracts and surfaces the failure summary
- Gives Claude structured failure info to work with

**Key moment** (Demo 1): Every Python file the backend-engineer agent edits triggers ruff — Claude sees lint output inline and fixes issues in the same turn.

---

## Hooks — Stop

**File**: `.claude/hooks/stop-save-memory.sh`

**What it demonstrates**: End-of-session memory capture. Fires when Claude Code session ends.

**Key moment** (Demo 2): After the incident is resolved, the Stop hook fires. It appends a session entry template to `.claude/memory/session-log.md` and prompts Claude to fill in: decisions made, patterns learned, corrections applied, context for next session.

---

## Agents

**Files**: `.claude/agents/*.md`

Each agent file has a YAML frontmatter header (`name`, `description`, `tools`) and a system prompt that defines the agent's identity, process, and rules.

| Agent | File | Key Responsibilities |
|-------|------|---------------------|
| planner | `planner.md` | Decompose requirements, generate ACs, create delivery plan |
| architect | `architect.md` | ADRs, sequence diagrams, contract change identification |
| backend-engineer | `backend-engineer.md` | Implementation following memory rules |
| test-engineer | `test-engineer.md` | Unit, integration, contract tests |
| security-reviewer | `security-reviewer.md` | OWASP review, payments-risk-review skill |
| release-manager | `release-manager.md` | Release notes, rollout plan, deployment registration |

**Agent delegation pattern**: The main Claude instance delegates to each agent via the Agent tool. Each agent has access to only the tools it needs (listed in frontmatter). Agents can invoke skills but cannot delegate to other agents.

**Key moment** (Demo 1): Claude announces "I'm going to use the planner agent..." → runs planner → announces "Now the architect..." → etc. You see the full agent chain.

---

## MCP — Custom Server

**Files**: `mcp-servers/nexus-platform/src/`

**What it demonstrates**: Building an MCP server from scratch. The `nexus-platform` server is the primary educational artifact.

**Structure**:
```
src/
  index.ts           ← Server setup, tool/resource registration
  tools/
    services.ts      ← list_services, get_service_status
    deployments.ts   ← create_deployment, rollback_deployment, set_feature_flag
    incidents.ts     ← create_incident, update_incident, resolve_incident, list_incidents
  resources/
    runbooks.ts      ← nexus://runbooks/* URI scheme
```

**How to build your own**: Read `src/index.ts` — every line is annotated explaining the MCP pattern.

---

## MCP — Official Servers

**Files**: `.claude/settings.json` (mcpServers section), `mcp-servers/README.md`

**What it demonstrates**: Using pre-built MCP servers from the ecosystem.

| Server | Package | Used For |
|--------|---------|---------|
| GitHub | `@modelcontextprotocol/server-github` | PR creation, issue tracking |
| PostgreSQL | `@modelcontextprotocol/server-postgres` | Workflow state queries |

See `mcp-servers/README.md` for setup instructions.

---

## Plugins

**Files**: `plugins/engineering-governance/`, `plugins/payments-platform/`

**What it demonstrates**: Packaging skills + agents + rules as installable units.

| Plugin | Bundles |
|--------|---------|
| `engineering-governance` | 5 skills + architect + test-engineer agents |
| `payments-platform` | 2 skills + security-reviewer agent + payments.md rule |

**Key moment** (Demo 3): Installing `payments-platform` plugin gives Claude PCI-DSS rules, compliance review skill, and security agent in one step — before reading a line of code, Claude already knows the rules.

---

## Agent SDK

**Files**: `orchestrator/` (Phase 3)

**What it demonstrates**: Using the Anthropic Agent SDK to build a programmatic workflow orchestrator — not just Claude Code in a terminal.

The orchestrator:
- Accepts feature requests via REST API
- Runs the planner → architect → backend → test → security → release agent chain
- Stores workflow state in PostgreSQL
- Streams agent activity via WebSocket to the Next.js dashboard
- Allows human approval gates between agent steps

See `orchestrator/src/` for the FastAPI + Agent SDK implementation.
