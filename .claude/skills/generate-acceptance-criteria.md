# Skill: generate-acceptance-criteria

> **[CAPABILITY: SKILLS]**
> Invoke with `/generate-acceptance-criteria` or ask Claude to "generate ACs" for a feature.
> The planner agent auto-invokes this after decomposing a requirement.

## When to Use

Invoke this skill when:
- A new feature or change request is described in natural language
- A Jira ticket exists but has vague or missing acceptance criteria
- You need to align on what "done" means before writing code

## Output

Produce a structured acceptance criteria block that can be pasted into:
- A Jira ticket description
- A GitHub issue
- A PR description
- A `docs/features/{feature-name}.md` file

## Format

```markdown
## Acceptance Criteria: {Feature Name}

**Feature**: {One-sentence description}
**Service(s) Affected**: {list}
**Priority**: P1 | P2 | P3

### Functional Requirements

- [ ] **AC-1**: Given {context}, when {action}, then {expected outcome}
- [ ] **AC-2**: Given {context}, when {action}, then {expected outcome}
- [ ] **AC-3**: (edge case) Given {context}, when {action}, then {expected outcome}

### Non-Functional Requirements

- [ ] **NFR-1**: Response time under {X}ms at P99 under normal load
- [ ] **NFR-2**: No increase in error rate during rollout
- [ ] **NFR-3**: Feature flag controlled — can be disabled without redeploy

### Security & Compliance

- [ ] **SEC-1**: {Authentication/authorization requirement}
- [ ] **SEC-2**: {PCI/GDPR/audit trail requirement if applicable}

### Testing Requirements

- [ ] Unit tests covering all new business logic paths
- [ ] Integration test for the happy path end-to-end
- [ ] Contract test if a service contract changes
- [ ] Performance test if throughput requirements are specified

### Out of Scope

- {What this feature explicitly does NOT cover — prevents scope creep}

### Definition of Done

- [ ] All ACs marked complete
- [ ] PR reviewed and merged
- [ ] Deployed to staging and smoke tested
- [ ] Feature flag enabled in staging
- [ ] Release notes prepared
```

## Rules

1. Write ACs in Given/When/Then format — never "the system should...".
2. Every feature touching payment-service must have at least one SEC AC for audit trail.
3. If the feature involves a new API endpoint, include an AC for the error cases (400, 401, 404, 500).
4. Mark the "out of scope" section — this prevents gold-plating.
