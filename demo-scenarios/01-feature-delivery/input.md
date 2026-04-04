# Demo 1: Feature Delivery

> **Run this demo**: `bash demo-scenarios/01-feature-delivery/run.sh`

## The Requirement

Paste the following into Claude Code (or the dashboard in Phase 3):

---

**Feature Request: Webhook Retry Logic**

The notification-service currently attempts webhook deliveries once and marks them failed if the endpoint doesn't respond. This is causing customer complaints because transient failures (endpoint restarts, brief network issues) result in permanently lost webhooks.

**What we need:**
- Exponential backoff retry logic (base delay: 1 second, max 5 retries per CLAUDE.md)
- Jitter on retry delays to prevent thundering herd
- Dead-letter queue support: after max retries, move to `nexus-dlq` (existing SQS queue)
- Publish `webhook.delivered` or `webhook.delivery.failed` events to SQS after final outcome
- Payload size guard: payloads > 10KB must use S3 pointer pattern (per CLAUDE.md quirk)
- API endpoint to query delivery status and manually trigger retries

**Context:**
- This is the notification-service (Python/FastAPI)
- The `calculate_backoff` helper already exists in `delivery_service.py`
- User-service is not affected
- Payment-service publishes events that notification-service delivers

---

## What Should Happen

When you paste this requirement, Claude Code should:

1. **Planner agent** activates → decomposes the requirement, identifies notification-service as affected, checks CLAUDE.md for constraints (max 5 retries, SQS DLQ, S3 pointer pattern), generates acceptance criteria

2. **Architect agent** activates → reads CLAUDE.md + `.claude/rules/python.md`, determines this needs a sequence diagram, writes ADR-001 for the retry strategy choice, invokes `design-sequence-diagram` skill

3. **Backend engineer agent** activates → reads existing `delivery_service.py`, applies ULID pattern (already in use), implements retry logic wiring `calculate_backoff()`, adds SQS publishing, adds S3 pointer check

4. **Post-edit hook fires** after every file edited → ruff linting runs automatically on Python files

5. **Test engineer agent** activates → reads existing test patterns, writes unit tests for `calculate_backoff`, integration tests for the retry flow, invokes `create-contract-tests` skill for the SQS event schema

6. **Security reviewer agent** activates → checks that webhook endpoint URLs are HTTPS-only (already in Pydantic model), verifies no secrets in payload logging

7. **Release manager agent** activates → invokes `prepare-release-notes` skill, produces rollout plan, registers deployment via nexus-platform MCP tool

8. **Stop hook fires** → prompts to save session learnings to memory

## Expected Output Files

- `docs/adrs/ADR-001-exponential-backoff-webhook-retry.md`
- `docs/diagrams/webhook-retry-flow.md`
- `docs/delivery-plans/PLAN-{ulid}.md`
- `sample-services/notification-service/notification_service/services/delivery_service.py` (updated)
- `sample-services/notification-service/tests/test_delivery_service.py` (new)
- `docs/releases/v2.1.0.md`

## Capabilities Showcased

| Capability | How It Manifests |
|-----------|-----------------|
| **Memory** | CLAUDE.md → max 5 retries, S3 pointer for >10KB, nexus-dlq name applied without reminding |
| **Memory** | `.claude/rules/python.md` → structlog, Pydantic v2, ULID applied automatically |
| **Skills** | `write-adr`, `design-sequence-diagram`, `create-contract-tests`, `prepare-release-notes` all invoked |
| **Hooks** | `post-tool-use-edit.sh` fires after every Python file edit → ruff runs |
| **Hooks** | `stop-save-memory.sh` fires at session end → session log updated |
| **Agents** | All 6 agents execute in sequence: planner → architect → backend → tester → security → release |
| **MCP** | `nexus-platform.list_services` called by planner to check service topology |
| **MCP** | `nexus-platform.create_deployment` called by release-manager to register the deploy |
