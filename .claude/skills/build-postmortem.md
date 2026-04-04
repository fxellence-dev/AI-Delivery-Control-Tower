# Skill: build-postmortem

> **[CAPABILITY: SKILLS]**
> Invoke with `/build-postmortem` or ask Claude to "write a postmortem".
> The stop-save-memory.sh hook auto-invokes this skill after incident closure.
> Per CLAUDE.md: postmortems must be written within 48 hours of resolution.

## When to Use

Invoke this skill:
- After a P1 or P2 incident is resolved
- After a failed deploy that caused user impact
- After a significant data quality issue

## Inputs

Provide context:
- Incident timeline (from #incidents Slack, or incident record from nexus-platform MCP)
- Services affected
- Impact description (users affected, duration, revenue impact if known)

## Output

Produce `docs/postmortems/PM-{YYYY-MM-DD}-{kebab-title}.md`

## Template

```markdown
# Postmortem: {Incident Title}

**Date of Incident**: {YYYY-MM-DD}
**Duration**: {start time} → {end time} ({X hours Y minutes})
**Severity**: P1 | P2 | P3
**Status**: Draft | In Review | Published
**Author(s)**: {Incident Commander} + Claude (AI assistant)

---

## Summary

{2-3 sentence executive summary. What broke, for how long, and what the impact was.
No blame, no individuals called out — systems and processes only.}

---

## Impact

| Metric | Value |
|--------|-------|
| Users affected | {number or %} |
| Duration | {X hours Y minutes} |
| Transactions failed | {number} |
| Revenue impact | ${estimate} |
| SLA breach | Yes / No |

---

## Timeline

All times in UTC.

| Time | Event |
|------|-------|
| {HH:MM} | {What happened — system behavior, not speculation} |
| {HH:MM} | Alert fired: {alert name} |
| {HH:MM} | Incident declared by {role} |
| {HH:MM} | {Investigation step} |
| {HH:MM} | Root cause identified: {description} |
| {HH:MM} | Fix deployed to production |
| {HH:MM} | Monitoring confirmed recovery |
| {HH:MM} | Incident closed |

---

## Root Cause

{Describe the root cause in technical detail. Use the 5-Why method:}

**Why 1**: {Immediate cause}
**Why 2**: {Why did that happen?}
**Why 3**: {Why did that happen?}
**Why 4**: {Why did that happen?}
**Why 5**: {Root systemic cause}

**Root Cause**: {One clear sentence summarizing the systemic root cause}

---

## Contributing Factors

- {Factor 1 — e.g., lack of alerting on this metric}
- {Factor 2 — e.g., runbook was out of date}
- {Factor 3 — e.g., staging did not reproduce the load pattern}

---

## What Went Well

- {Things the team did right during incident response}
- {Processes that worked as expected}
- {Tooling that helped}

---

## What Went Poorly

- {Things that slowed detection or resolution}
- {Gaps in tooling, process, or documentation}

---

## Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| {Specific, measurable action} | {Team/role} | {YYYY-MM-DD} | P1 |
| Add alert for {metric} | Platform | {date} | P2 |
| Update runbook for {scenario} | {Team} | {date} | P2 |
| Add integration test for {case} | {Team} | {date} | P3 |

---

## Learnings Saved to Memory

{List the key patterns or facts being stored in auto-memory after this postmortem.
These will be available in future Claude sessions to prevent recurrence.}

- MEMORY: {Pattern learned — e.g., "SQS queue depth is a leading indicator of payment timeouts"}
- MEMORY: {Runbook update — e.g., "nexus-dlq must be drained manually after payment-service restart"}
```

## Rules

1. **Blameless** — never name individuals as the cause. Systems and processes fail, people respond.
2. Action items must be specific and measurable — "improve monitoring" is not an action item.
3. After writing the postmortem, extract MEMORY items and save them to auto-memory immediately.
4. The postmortem is not done until action items have owners and due dates.
5. Share in #postmortems Slack channel and link from the incident record in nexus-platform.
