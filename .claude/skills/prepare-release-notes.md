# Skill: prepare-release-notes

> **[CAPABILITY: SKILLS]**
> Invoke with `/prepare-release-notes` or ask Claude to "prepare release notes".
> The release-manager agent auto-invokes this as the final step before any deploy.

## When to Use

Invoke this skill:
- Before deploying to staging (draft notes)
- Before deploying to production (final notes)
- When generating a changelog entry

## Inputs

Provide:
- Git log range: `git log --oneline {previous-tag}..HEAD`
- Affected services
- Target environment

## Output

Produce two files:
1. `docs/releases/{version}.md` — internal release notes with full details
2. `CHANGELOG.md` entry — customer-facing summary

## Internal Release Notes Template

```markdown
# Release {version} — {YYYY-MM-DD}

**Status**: Draft | Ready for Review | Approved
**Target Environment**: staging | production
**Deployment Window**: {start} → {end} (estimated)
**Rollout Strategy**: Canary 5% → 25% → 100%
**Rollback Plan**: See Section 6

---

## 1. What's Changing

### New Features
- **{feature-name}** ({service}): {One-line description}
  - PR: #{number}
  - Feature Flag: `{flag-key}` (default: disabled)

### Bug Fixes
- **{fix-description}** ({service}): {Impact of fix}
  - PR: #{number}
  - Fixes: #{issue-number}

### Internal / Infra
- {Internal change that doesn't affect users}

---

## 2. Services Affected

| Service | Current Version | New Version | Change Type |
|---------|----------------|-------------|-------------|
| payment-service | v1.4.2 | v1.5.0 | Feature |
| notification-service | v2.1.0 | v2.1.0 | No change |

---

## 3. Database Migrations

| Migration | Service | Type | Estimated Duration |
|-----------|---------|------|--------------------|
| {migration-file} | {service} | Add column (non-breaking) | < 1 min |

Migration order: Run BEFORE deploying the new service version.

---

## 4. Configuration Changes

| Key | Service | Old Value | New Value | Notes |
|-----|---------|-----------|-----------|-------|
| {env-var} | {service} | {old} | {new} | {note} |

---

## 5. Deployment Checklist

- [ ] Migrations run on staging
- [ ] Smoke tests pass on staging
- [ ] Feature flags verified in disabled state
- [ ] On-call team notified
- [ ] Rollback procedure documented (Section 6)
- [ ] Monitoring dashboards bookmarked
- [ ] Approved by: {name}

---

## 6. Rollback Plan

**Trigger**: > 1% error rate increase OR P99 latency > 2x baseline

**Steps**:
1. Disable feature flags: `{flag-key}` → off
2. If still degraded: redeploy previous version tag `{previous-tag}`
   ```bash
   kubectl set image deployment/payment-service app={registry}/{previous-tag} -n nexus-prod
   ```
3. If DB migration is blocking: {specific rollback SQL or "migration is additive, no rollback needed"}
4. Notify #incidents with: "Rolling back {version} due to {reason}"

---

## 7. Monitoring

Post-deploy watch for 30 minutes:
- Error rate: < 0.1% (baseline)
- P99 latency: < 500ms for payment processing
- SQS queue depth: stable (not growing)
- Dashboard: {grafana-link}
```

## CHANGELOG Entry Format (customer-facing)

```markdown
## [{version}] - {YYYY-MM-DD}

### Added
- {Customer-visible new feature in plain language}

### Fixed
- {Customer-visible bug fix}

### Changed
- {Breaking change with migration guide, if any}
```

## Rules

1. Always check for breaking API changes — list them prominently in section 1.
2. DB migrations must be run BEFORE the service deploy, never after.
3. The rollback plan is not optional. If you can't write a rollback, the release isn't ready.
4. Feature flags must be listed for every new feature. "No feature flag" is only acceptable for bug fixes.
