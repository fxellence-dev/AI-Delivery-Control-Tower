# Payments Platform Plugin

> **[CAPABILITY: PLUGINS]**
> The payments-platform plugin bundles PCI-DSS compliance capabilities.
> Install this on any repository that handles payment card data.

## What This Plugin Provides

| Capability | Type | Description |
|-----------|------|-------------|
| `payments-risk-review` | Skill | Full PCI-DSS compliance review checklist |
| `build-postmortem` | Skill | Blameless postmortem template and workflow |
| `security-reviewer` agent | Agent | Security specialist who auto-runs payments-risk-review |
| `payments.md` rule | Rule | PCI-DSS hard rules enforced by Claude in every session |

## Install

```bash
claude plugin install ./plugins/payments-platform
```

This copies:
- `.claude/skills/payments-risk-review.md`
- `.claude/skills/build-postmortem.md`
- `.claude/agents/security-reviewer.md`
- `.claude/rules/payments.md`

## PCI-DSS Rules Enforced

After installing this plugin, Claude will enforce these rules in every session on the target repo:

1. **No PAN logging** — Claude will not write code that logs raw card numbers
2. **No CVV storage** — Claude will flag any attempt to store CVV after authorization
3. **Audit trail required** — Claude will add audit log calls to every payment state change
4. **Idempotency required** — Claude will add idempotency-key handling to payment creation endpoints
5. **HTTPS validation** — Claude will validate that webhook endpoints use HTTPS

## Demo: Running a Payment Risk Review

In the ADCT Demo 3 (security audit):

```
User: Audit payment-service for PCI-DSS compliance before Q1 release

Claude: [reads .claude/rules/payments.md from plugin]
        [invokes security-reviewer agent]
        [agent invokes payments-risk-review skill]
        [produces report at docs/reviews/payment-risk-2026-04-04-q1-audit.md]
```

## Why This Is a Plugin (Not Just a Skill)

Because PCI-DSS compliance is a **cross-cutting concern** that affects:
- What code Claude writes (the `payments.md` rule)
- What code Claude reviews (the `payments-risk-review` skill)
- How Claude responds to incidents (the `build-postmortem` skill)
- Which agent Claude delegates to for payment code (the `security-reviewer` agent)

Bundling these into a plugin means any team can install the full compliance pack in one step.

## ⚠️ Important

This plugin provides automated guidance and checks. It does **not** replace:
- Human security review by a qualified security engineer
- Formal PCI-DSS QSA assessment
- Penetration testing
- Security code review tools (SAST/DAST)
