# Nexus Platform — AI Delivery Control Tower

> **[CAPABILITY: MEMORY — CLAUDE.md]**
> This file is loaded into every Claude Code session for this project.
> It is the primary mechanism for persisting architectural rules, conventions,
> and team preferences across all sessions and all agents. Claude reads this
> before doing anything else in the project.

## Project Overview

Nexus Platform is a B2B SaaS company with three core services:

| Service | Language | Responsibility |
|---------|----------|---------------|
| `payment-service` | TypeScript/Node.js | Transaction processing, SEPA, refunds |
| `user-service` | TypeScript/Node.js | Accounts, auth, permissions |
| `notification-service` | Python/FastAPI | Webhooks, alerts, delivery retries |
| `api-gateway` | TypeScript/Node.js | Routing, rate limiting, auth middleware |

Infrastructure: Kubernetes on AWS EKS, Postgres RDS, Redis, SQS.

---

## Feature Delivery Workflow

When given a new feature request, **always follow this agent workflow in order**. Do not skip straight to coding.

1. **Use the `planner` subagent** — decompose the requirement, identify affected services, generate acceptance criteria, produce a delivery plan at `docs/delivery-plans/`
2. **Use the `architect` subagent** — check architecture principles, invoke the `write-adr` skill for any cross-service decision, invoke `design-sequence-diagram` skill for new multi-service flows
3. **Use the `backend-engineer` subagent** — implement the code, applying all conventions from memory
4. **Use the `test-engineer` subagent** — write unit, integration, and contract tests; invoke `create-contract-tests` skill if a service boundary changed
5. **Use the `security-reviewer` subagent** — always if payment-service is involved; invoke `payments-risk-review` skill
6. **Use the `release-manager` subagent** — invoke `prepare-release-notes` skill, produce rollout plan, register deployment via nexus-platform MCP

Each agent must complete and hand off before the next begins. Announce which agent is active at the start of each step.

---

## Architecture Principles

1. **Services communicate via typed events over SQS, never direct HTTP calls** between backend services. HTTP is only for client-facing APIs.
2. **Every cross-service contract must have a Pact contract test.** No exceptions.
3. **Every architecture decision that affects more than one service requires an ADR** in `/docs/adrs/`. Use the `write-adr` skill.
4. **Feature flags via LaunchDarkly** — never deploy code with a hard-coded boolean for unreleased features.
5. **All DB migrations are backward-compatible and run before the deploy.** Never migrate and deploy atomically.
6. **No direct DB access from API handlers.** Always go through a repository layer.
7. **Secrets via AWS Secrets Manager only.** Never in env files committed to git.

---

## Coding Conventions

### TypeScript (all TS services)
- Use **ULID not UUID** for all entity IDs (`ulid` package). This is non-negotiable.
- No `any` types. Use `unknown` and narrow with type guards.
- Use **Result types** (`neverthrow`) instead of throwing exceptions in service logic.
- Barrel exports from `src/index.ts` for each module.
- All async functions return `Promise<Result<T, E>>` not `Promise<T>`.
- Test files co-located: `foo.service.ts` → `foo.service.test.ts`.

### Python (notification-service)
- Python 3.12+, use `uv` for package management.
- All endpoints use Pydantic v2 models.
- Use `structlog` for structured logging (not `print`, not standard `logging`).
- Type hints required on all functions. Run `mypy --strict`.
- Test with `pytest`, fixtures in `conftest.py`.

### API Design
- API versioning via URL path: `/v1/`, `/v2/` — never via headers.
- All responses wrapped: `{ data: T, meta: { requestId, timestamp } }`.
- Error responses: `{ error: { code, message, details[] } }`.
- Use ULID for `requestId` in response meta.

---

## Testing Conventions

- Unit tests: pure logic, no I/O, mock at the repository boundary.
- Integration tests: hit a real database (local Docker), no mocks for infra.
- Contract tests: Pact provider/consumer per service boundary.
- E2E tests: `tests/e2e/` using real services in Docker Compose.
- **Coverage gate: 80% minimum.** PRs fail CI below this.
- Never mock the database in integration tests. Use Docker.

---

## Service Ownership

| Service | Team | Slack Channel | On-call |
|---------|------|---------------|---------|
| payment-service | Payments | #payments-eng | payments-oncall |
| user-service | Platform | #platform-eng | platform-oncall |
| notification-service | Platform | #platform-eng | platform-oncall |
| api-gateway | Platform | #platform-eng | platform-oncall |

---

## Release Rules

1. **Never deploy on Fridays or the day before a public holiday.**
2. All releases require a release checklist (use `prepare-release-notes` skill).
3. Payments service changes require a security review (use `payments-risk-review` skill).
4. Rollout: canary 5% → 25% → 100%. Minimum 30 min between steps.
5. All releases must have a rollback plan documented before deploy.
6. Feature flags must be tested in disabled state before enabling in prod.

---

## Deployment Environments

| Env | Namespace | Branch | Auto-deploy |
|-----|-----------|--------|-------------|
| dev | `nexus-dev` | `main` | Yes |
| staging | `nexus-staging` | `release/*` | Yes |
| prod | `nexus-prod` | tagged releases | Manual approval |

---

## Known Integration Quirks

- **payment-service ↔ user-service**: The `userId` field in payment events is a ULID string, but older endpoints still accept UUID format. New code must use ULID only.
- **notification-service retry**: Uses exponential backoff with jitter. Max 5 retries, then dead-letter queue to SQS `nexus-dlq`.
- **SQS message size**: Max 256KB. Payloads over 10KB must use S3 pointer pattern (store in S3, send S3 key in SQS).
- **LaunchDarkly SDK**: Always initialize with `waitForInitialization()` — do not assume it's ready synchronously.

---

## Incident Protocol

1. Declare P1 in #incidents Slack channel immediately.
2. Create incident record via `nexus-platform` MCP tool `create_incident`.
3. Designate Incident Commander and Communications Lead.
4. After resolution: run `build-postmortem` skill within 48 hours.
5. All postmortems go in `/docs/postmortems/` and are blameless.
6. Learnings from postmortems must be captured in auto-memory within the session.

---

## Claude Code Usage in This Project

This project is the reference implementation for Claude Code capabilities:

- **Memory**: This file + `.claude/rules/` for project-wide and domain-specific rules
- **Skills**: `.claude/skills/` for repeatable specialist tasks
- **Hooks**: `.claude/hooks/` for automated guardrails and post-action automation
- **Agents**: `.claude/agents/` for specialist subagents (planner, architect, etc.)
- **MCP**: `mcp-servers/nexus-platform/` for the custom internal platform MCP server
- **Plugins**: `plugins/` for packaged capability sets (governance, payments)
- **Agent SDK**: `orchestrator/` for the Python backend that runs workflows programmatically

See `capability-matrix.md` at the repo root for a full mapping.
