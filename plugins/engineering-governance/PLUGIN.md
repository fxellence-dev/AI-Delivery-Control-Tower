# Engineering Governance Plugin

> **[CAPABILITY: PLUGINS]**
> Plugins package skills, agents, and rules into installable units.
> Install this plugin to add architectural governance capabilities to any Claude Code project.

## What This Plugin Provides

| Capability | Type | Description |
|-----------|------|-------------|
| `write-adr` | Skill | Write Architecture Decision Records |
| `generate-acceptance-criteria` | Skill | Generate ACs from requirements |
| `create-contract-tests` | Skill | Write Pact consumer/provider contract tests |
| `review-openapi-breaking-change` | Skill | Detect breaking API changes |
| `design-sequence-diagram` | Skill | Create Mermaid sequence diagrams |
| `architect` agent | Agent | Staff architect subagent |
| `test-engineer` agent | Agent | Test specialist subagent |

## Install

```bash
# From the ADCT repo root
claude plugin install ./plugins/engineering-governance

# Or from a registry (future)
claude plugin install @nexus/engineering-governance
```

## When to Use Each Capability

### write-adr
Use when making a significant architecture decision:
```
/write-adr We're switching from REST to event-driven for payment → notification communication
```

### create-contract-tests
Use when a cross-service API changes:
```
/create-contract-tests payment-service consumes user-service GET /v1/users/:id
```

### review-openapi-breaking-change
Use before merging any OpenAPI spec change:
```
/review-openapi-breaking-change on user-service/openapi.yaml
```

### architect agent
Invoke for complex cross-service changes:
```
Use the architect agent to review the webhook retry architecture change
```

## Plugin Design Pattern

This plugin demonstrates the recommended pattern for packaging Claude Code capabilities:

1. **Skills** handle repeatable, documented tasks (ADR writing, test generation)
2. **Agents** handle complex, multi-step specialist work (architectural review)
3. **Rules** enforce file-type-specific conventions (no rules in this plugin — use project-level .claude/rules/)
4. **plugin.json** describes what's included and how to install it

The plugin is self-contained — you can copy the skills and agent files to any project's `.claude/` directory without modification.
