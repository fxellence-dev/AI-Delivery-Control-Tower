# Skill: write-adr

> **[CAPABILITY: SKILLS]**
> Skills are reusable, invocable instruction sets for Claude Code.
> Invoke this skill with `/write-adr` or by asking Claude to "write an ADR".
> The architect agent auto-invokes this skill for any cross-service decision.

## When to Use

Invoke this skill when:
- A change affects more than one service
- A new technology, library, or pattern is being introduced
- An existing architecture decision is being reversed or updated
- A significant trade-off was made during implementation

## Output

Produce a Markdown file at `docs/adrs/ADR-{NNN}-{kebab-case-title}.md` where NNN is the next sequential number (check existing ADRs to determine NNN).

## Template

```markdown
# ADR-{NNN}: {Title}

**Date**: {YYYY-MM-DD}
**Status**: Proposed | Accepted | Deprecated | Superseded by ADR-XXX
**Deciders**: {list of roles/agents involved}
**Context Tags**: {payment-service | user-service | notification-service | infra | security | performance}

## Context

{Describe the problem or situation that requires a decision. Include:
- What forces are at play (technical constraints, team conventions, business requirements)
- Why the current approach is insufficient
- What triggered this decision}

## Decision

{State the decision in a single clear sentence, then elaborate.}

We will {action} because {reason}.

{Explain implementation details, key trade-offs accepted, and what is explicitly out of scope.}

## Consequences

### Positive
- {What becomes better, easier, or safer as a result}

### Negative
- {What becomes harder, more complex, or what debt is incurred}

### Risks
- {What could go wrong and how to mitigate}

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|----------------|
| {Alt 1} | {Why not} |
| {Alt 2} | {Why not} |

## Implementation Notes

{Concrete steps, affected files, migration path if applicable}

## Related ADRs

- ADR-{X}: {Title} — {how it relates}
```

## Rules

1. ADRs are immutable once accepted — never edit the body. If a decision changes, write a new ADR that supersedes the old one.
2. The Status field must be updated when an ADR is superseded.
3. Always reference the ADR number in commit messages when implementing the decision.
4. Keep the "Decision" section to one paragraph — this is what people skim.
