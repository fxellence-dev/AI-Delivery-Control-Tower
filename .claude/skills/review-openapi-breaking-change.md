# Skill: review-openapi-breaking-change

> **[CAPABILITY: SKILLS]**
> Invoke with `/review-openapi-breaking-change` or ask Claude to "check for breaking API changes".
> The architect agent invokes this whenever an OpenAPI spec is modified.

## When to Use

Invoke when:
- Any `openapi.yaml` or `openapi.json` file is modified
- A PR changes API routes, request/response schemas, or authentication requirements

## Breaking vs Non-Breaking Changes

### Breaking (blocks merge without versioning plan)
- Removing an endpoint
- Removing a required or optional field from a response
- Adding a new required field to a request body
- Changing a field's type (e.g., `string` → `integer`)
- Changing a field's name
- Changing HTTP method for an endpoint
- Changing authentication requirement
- Narrowing an enum (removing allowed values)

### Non-Breaking (safe to merge)
- Adding a new endpoint
- Adding a new optional field to a response
- Adding a new optional field to a request
- Widening an enum (adding allowed values)
- Adding a new error code
- Improving documentation/descriptions only

## Output

Produce a review comment that can be posted on the PR:

```markdown
## OpenAPI Breaking Change Review

**Files reviewed**: {list of spec files}
**Consumer services**: {list of services that call this API}

### Summary: {BREAKING | NON-BREAKING | BREAKING WITH MIGRATION PATH}

---

### Breaking Changes Found

| # | Endpoint | Change Type | Field | Before | After |
|---|----------|-------------|-------|--------|-------|
| 1 | `POST /v1/payments` | Removed field | `metadata.source` | `string` | *(removed)* |
| 2 | `GET /v1/payments/:id` | Type changed | `amount` | `string` | `number` |

### Impact

**Consumers affected**: {list with contract test references}

**Migration required**:
- Version bump: v1 → v2 for affected endpoints
- Deprecation notice: v1 to be maintained for {X months}
- Consumer services must be updated: {list}

---

### Non-Breaking Changes

| Endpoint | Change |
|----------|--------|
| `GET /v1/payments` | Added optional `cursor` query param |

---

### Recommendation

{APPROVE | REQUEST CHANGES | NEEDS VERSIONING PLAN}

{Explanation of recommended action}
```

## Rules

1. If breaking changes are found, always recommend a versioning plan — never just block.
2. Check for consumer services by grepping for the affected endpoint path across all services.
3. Contract tests (Pact) are the ground truth — if a consumer test breaks, the change is breaking.
4. Post this review as a PR comment using the GitHub MCP tool.
