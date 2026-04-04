# Skill: payments-risk-review

> **[CAPABILITY: SKILLS]**
> Invoke with `/payments-risk-review` or ask Claude to "run a payments risk review".
> The security-reviewer agent auto-invokes this for any payment-service change.
> This skill reads `.claude/rules/payments.md` as its baseline checklist.

## When to Use

Invoke this skill:
- Before any payment-service PR is merged
- When a new payment provider or method is being added
- After any incident involving payment processing
- During a PCI-DSS audit cycle

## Output

Produce a risk review report at `docs/reviews/payment-risk-{date}-{feature}.md`

## Review Checklist

Work through each section and produce a PASS / FAIL / WARNING / N/A verdict with evidence.

```markdown
# Payment Risk Review: {Feature/Change Description}
**Date**: {YYYY-MM-DD}
**Reviewer**: Security Agent (Claude)
**PR/Branch**: {link}
**Overall Result**: PASS | FAIL | PASS WITH CONDITIONS

---

## 1. Data Handling (PCI-DSS Req 3)

- [ ] No card numbers (PANs) logged or stored unencrypted
      Evidence: {grep result or code reference}
- [ ] No CVV/CVC stored after authorization
      Evidence: {grep result}
- [ ] Card data masked in all log statements (last 4 only)
      Evidence: {example from code}
- [ ] Sensitive fields encrypted at rest
      Evidence: {DB schema reference}

## 2. Authentication & Authorization (PCI-DSS Req 7, 8)

- [ ] All payment endpoints require valid JWT
      Evidence: {middleware reference}
- [ ] Authorization check: user can only access their own payments
      Evidence: {authorization logic}
- [ ] Service-to-service calls use mTLS or signed tokens
      Evidence: {config reference}

## 3. Audit Trail (PCI-DSS Req 10)

- [ ] Every payment state transition logged to audit table
      Evidence: {audit log calls in diff}
- [ ] Audit records include: userId, paymentId, action, timestamp, IP, requestId
      Evidence: {log fields}
- [ ] Audit records are immutable (no UPDATE/DELETE on audit table)
      Evidence: {DB constraints or repo layer check}

## 4. Idempotency

- [ ] Payment creation endpoints accept and honor idempotency-key
      Evidence: {code reference}
- [ ] Duplicate requests return the same response, not a second charge
      Evidence: {test or logic}

## 5. SEPA Compliance (if applicable)

- [ ] IBAN validated before debit initiation
- [ ] Mandate verified active before charge
- [ ] SEPA error codes correctly mapped and surfaced

## 6. Secrets & Configuration

- [ ] No hardcoded API keys, tokens, or credentials in code or config
      Evidence: {grep for common patterns}
- [ ] New secrets added via AWS Secrets Manager, not .env
      Evidence: {config files}

## 7. Error Handling

- [ ] Payment errors do not leak internal details to API responses
      Evidence: {error handler}
- [ ] Failed payments do not leave orphaned partial state
      Evidence: {transaction handling}

## 8. Dependencies

- [ ] New npm/pip packages checked for known CVEs (npm audit / pip audit)
      Evidence: {audit output}
- [ ] No new packages that process card data directly (must go through Stripe)

---

## Findings Summary

| Severity | Count | Items |
|----------|-------|-------|
| CRITICAL | 0 | |
| HIGH | 0 | |
| MEDIUM | 0 | |
| LOW | 0 | |

## Conditions for Merge

{List any conditions that must be met before this can be merged. If PASS, write "None."}

## Recommendations

{Non-blocking suggestions for future improvement}
```

## Rules

1. A FAIL result blocks the PR — no exceptions, no overrides without VP Engineering sign-off.
2. A PASS WITH CONDITIONS means merge is allowed only after conditions are documented in the PR.
3. Re-run this skill after any changes made in response to findings.
4. Save the review report to `docs/reviews/` — this is evidence for PCI-DSS audits.
