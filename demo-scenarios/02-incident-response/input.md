# Demo 2: Incident Response

> **Run this demo**: `bash demo-scenarios/02-incident-response/run.sh`

## The Incident

Paste the following into Claude Code:

---

**P1 INCIDENT: Payment processing failing for 3% of transactions**

We've had elevated payment failures since 16:32 UTC today. The error rate jumped from 0.03% to 3.1%. Customers are seeing "Payment processing failed" errors.

Affected service: payment-service (prod)
Alert: `payment.error_rate > 1%` fired at 16:34 UTC
Last deploy: payment-service v1.5.0 at 16:00 UTC (today)

Initial investigation suggests SQS messages are piling up in the processing queue.

I need immediate triage and a fix plan.

---

## What Should Happen

1. **Planner agent** → immediately invokes `k8s-triage` skill and `mcp__nexus-platform__create_incident` (P1), reads CLAUDE.md incident protocol

2. **MCP: create_incident** → incident record created, planner gets incident ID

3. **k8s-triage skill** → produces triage report: check pod status, events, logs, rollout history

4. **Planner** → identifies that v1.5.0 was just deployed, recommends feature flag disable first, then rollback if needed

5. **Backend engineer agent** → reads payment-service code changes in v1.5.0 to identify the bug

6. **Security reviewer** → confirms the proposed fix doesn't introduce new vulnerabilities

7. **Release manager** → produces hotfix rollout plan using `prepare-release-notes` skill

8. **MCP: update_incident** → timeline updates added as investigation progresses

9. **MCP: resolve_incident** → incident resolved, resolution documented

10. **Stop hook** → `build-postmortem` skill auto-triggered, prompts for session memory capture

## Expected Output Files

- Incident record created via nexus-platform MCP
- `docs/reviews/k8s-triage-{date}-payment-p1.md`
- `docs/postmortems/PM-{date}-payment-processing-failures.md`
- `.claude/memory/session-log.md` (updated with incident learnings)

## Capabilities Showcased

| Capability | How It Manifests |
|-----------|-----------------|
| **Memory** | CLAUDE.md incident protocol applied: create incident, assign IC, DLQ drain after restart |
| **Skills** | `k8s-triage` at triage time, `build-postmortem` at session end |
| **Hooks** | `stop-save-memory.sh` fires → postmortem prompt + session memory captured |
| **Agents** | planner, backend-engineer, security-reviewer, release-manager chain |
| **MCP** | `create_incident`, `update_incident`, `resolve_incident`, `get_service_status` all called |
