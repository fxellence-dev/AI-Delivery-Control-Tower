# Demo 3: Security Audit (PCI-DSS)

> **Run this demo**: `bash demo-scenarios/03-security-audit/run.sh`

## The Audit Request

Paste the following into Claude Code (with the `payments-platform` plugin installed):

---

**Security Audit: payment-service PCI-DSS Compliance Review**

We need to audit the payment-service before the Q1 release. Our QSA has flagged three areas to review:

1. Audit trail completeness — does every payment state transition get logged?
2. Data handling — are we certain no card data is leaking into logs?
3. Refund authorization — are refunds properly authorized and linked to original payments?

Please run a full compliance review and produce a report suitable for our QSA.

---

## What Should Happen

1. **Plugin check**: Because `payments-platform` plugin is installed, `.claude/rules/payments.md` is loaded automatically — Claude knows the PCI-DSS rules before reading a line of code

2. **Security reviewer agent** activates → immediately invokes `payments-risk-review` skill

3. **payments-risk-review skill** → works through the full checklist:
   - Scans for PAN in log statements (should find none — `cardLast4` only)
   - Checks audit log calls in `payment.service.ts` → finds them for create and refund
   - Verifies idempotency keys on payment creation
   - Checks HTTPS validation in any outbound calls

4. **Architect agent** → writes an ADR for any findings that need architectural fixes

5. **Backend engineer** → implements fixes for any findings

6. **Test engineer** → writes security-focused tests

7. **Security reviewer** → re-runs `payments-risk-review` to confirm findings resolved

8. **Report produced** → `docs/reviews/payment-risk-2026-Q1.md`

## Expected Output Files

- `docs/reviews/payment-risk-2026-Q1.md` — review report for QSA
- Any ADRs for architectural findings
- Updated `payment.service.ts` if fixes needed
- Security test additions

## Capabilities Showcased

| Capability | How It Manifests |
|-----------|-----------------|
| **Plugins** | `payments-platform` plugin provides rules + skill + agent in one install |
| **Memory** | `.claude/rules/payments.md` (from plugin) → Claude knows PCI rules before reading code |
| **Skills** | `payments-risk-review` skill produces structured compliance checklist |
| **Agents** | security-reviewer (from plugin), architect, backend-engineer, test-engineer |
| **MCP** | `nexus-platform.get_service_status` to check payment-service current state |

## What Makes This "Plugin" vs "Just a Skill"

The `payments-platform` plugin demonstrates the difference:

- **Without plugin**: You'd have to manually add the `payments-risk-review` skill, the `payments.md` rules, and the `security-reviewer` agent to the project
- **With plugin**: One `claude plugin install ./plugins/payments-platform` adds all three
- **The plugin ensures consistency**: Any engineer who checks out the repo gets the same compliance capabilities automatically — the plugin.json is committed to the repo
