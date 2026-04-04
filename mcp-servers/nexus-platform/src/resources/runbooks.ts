/**
 * MCP Resources: Runbooks
 *
 * [CAPABILITY: MCP — Resources]
 * MCP Resources are read-only data that Claude can access, similar to files
 * but served by the MCP server. They use a URI scheme.
 *
 * Claude can read these via the MCP resource protocol:
 *   nexus://runbooks/payment-service-restart
 *   nexus://runbooks/notification-service-dlq-drain
 *
 * The k8s-triage and incident-response agents read these during incidents.
 */

interface Runbook {
  id: string;
  title: string;
  description: string;
  content: string;
}

const RUNBOOKS: Runbook[] = [
  {
    id: 'payment-service-restart',
    title: 'Restart Payment Service',
    description: 'Safe restart procedure for payment-service that ensures in-flight transactions complete',
    content: `# Runbook: Restart Payment Service

**Use when**: Payment service pods are in CrashLoopBackOff or need to be restarted safely.

## Pre-Conditions
- Verify there are no in-flight transactions (check SQS queue depth = 0)
- Notify #payments-eng before restarting in production
- Have rollback plan ready (previous image tag)

## Steps

### 1. Check In-Flight Transactions
\`\`\`bash
# Check SQS queue depth
aws sqs get-queue-attributes \\
  --queue-url https://sqs.eu-west-1.amazonaws.com/{account}/nexus-payments-processing \\
  --attribute-names ApproximateNumberOfMessages
\`\`\`
Wait until ApproximateNumberOfMessages = 0 before proceeding.

### 2. Perform Rolling Restart
\`\`\`bash
kubectl rollout restart deployment/payment-service -n nexus-prod
kubectl rollout status deployment/payment-service -n nexus-prod --timeout=120s
\`\`\`

### 3. Verify Health
\`\`\`bash
kubectl get pods -n nexus-prod -l app=payment-service
# Wait for all pods to show Running/1/1
\`\`\`

### 4. Smoke Test
\`\`\`bash
curl -s https://api.nexus.internal/health | jq '.services.payment'
\`\`\`
Expected: \`{ "status": "healthy", "version": "..." }\`

## Rollback
If health check fails after restart:
\`\`\`bash
kubectl rollout undo deployment/payment-service -n nexus-prod
\`\`\``,
  },
  {
    id: 'notification-service-dlq-drain',
    title: 'Drain Notification DLQ',
    description: 'Procedure to drain the nexus-dlq dead-letter queue after notification-service incidents',
    content: `# Runbook: Drain Notification Dead-Letter Queue

**Use when**: After a notification-service incident, the DLQ (nexus-dlq) has accumulated messages that need reprocessing.

**Important**: Per CLAUDE.md, the nexus-dlq must be drained MANUALLY after notification-service restart. Do not assume it drains automatically.

## Check DLQ Depth
\`\`\`bash
aws sqs get-queue-attributes \\
  --queue-url https://sqs.eu-west-1.amazonaws.com/{account}/nexus-dlq \\
  --attribute-names ApproximateNumberOfMessages
\`\`\`

## Drain Procedure

### Option A: Redrive (recommended for < 1000 messages)
\`\`\`bash
aws sqs start-message-move-task \\
  --source-arn arn:aws:sqs:eu-west-1:{account}:nexus-dlq \\
  --destination-arn arn:aws:sqs:eu-west-1:{account}:nexus-webhook-delivery
\`\`\`

### Option B: Manual inspection for large backlogs
1. Sample messages to understand what failed:
\`\`\`bash
aws sqs receive-message --queue-url {dlq-url} --max-number-of-messages 10
\`\`\`
2. If messages are corrupted/unprocessable, purge:
\`\`\`bash
# ⚠️  Only after confirming messages cannot be reprocessed
aws sqs purge-queue --queue-url {dlq-url}
\`\`\`

## Verify
Monitor notification-service error rate after draining. Should return to < 0.1%.`,
  },
  {
    id: 'rollback-playbook',
    title: 'Production Rollback Playbook',
    description: 'General procedure for rolling back any Nexus Platform service in production',
    content: `# Runbook: Production Rollback Playbook

**Use when**: A service deployment is causing elevated error rates (> 1%) or latency degradation (> 2x baseline P99).

## Trigger Criteria
- Error rate > 1% (baseline: < 0.1%)
- P99 latency > 2x baseline (payment-service baseline: ~200ms)
- SQS queue depth growing unexpectedly
- Explicit Incident Commander decision

## Steps

### 1. Declare Incident (if not already)
Use MCP: \`create_incident\` with severity P1/P2

### 2. Disable Feature Flags
\`\`\`
MCP: set_feature_flag(flagKey="{new-feature-flag}", environment="prod", enabled=false)
\`\`\`
This is often sufficient to stop the bleeding without a full rollback.

### 3. Full Rollback (if flag toggle insufficient)
\`\`\`bash
# Check previous version
kubectl rollout history deployment/{service-name} -n nexus-prod

# Roll back
kubectl rollout undo deployment/{service-name} -n nexus-prod
kubectl rollout status deployment/{service-name} -n nexus-prod
\`\`\`

### 4. Verify Recovery
\`\`\`bash
kubectl get pods -n nexus-prod -l app={service-name}
# Check error rate in Grafana: nexus.internal/d/api-latency
\`\`\`

### 5. Communicate
Post to #incidents: "✅ Rolled back {service} to {previous-version}. Error rate normalizing."

## Post-Rollback
- Update incident record via \`update_incident\` MCP tool
- Keep the bad version off prod until root cause is identified
- Do not re-deploy until the PostMortem root cause section is filled in`,
  },
];

export function listRunbooks(): Omit<Runbook, 'content'>[] {
  return RUNBOOKS.map(({ id, title, description }) => ({ id, title, description }));
}

export function getRunbook(id: string): string | null {
  const runbook = RUNBOOKS.find((r) => r.id === id);
  return runbook?.content ?? null;
}
