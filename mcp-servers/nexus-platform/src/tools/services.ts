/**
 * MCP Tools: Service Management
 *
 * [CAPABILITY: MCP — Tool Implementation]
 * Each function here is an MCP tool handler.
 * The tool is registered in src/index.ts with a name, description, and schema.
 * When Claude calls `mcp__nexus-platform__list_services`, this handler runs.
 */

// In-memory stub data for demo purposes.
// In a real implementation, these would call internal APIs or Kubernetes.
const SERVICES_STUB = [
  {
    name: 'payment-service',
    version: 'v1.4.2',
    team: 'payments',
    slackChannel: '#payments-eng',
    oncall: 'payments-oncall',
    environments: {
      dev: { status: 'healthy', pods: 2, errorRate: 0.01, p99LatencyMs: 145 },
      staging: { status: 'healthy', pods: 2, errorRate: 0.02, p99LatencyMs: 162 },
      prod: { status: 'healthy', pods: 4, errorRate: 0.03, p99LatencyMs: 189 },
    },
    recentDeployments: [
      { version: 'v1.4.2', deployedAt: '2026-04-02T14:30:00Z', deployedBy: 'ci-pipeline', status: 'succeeded' },
      { version: 'v1.4.1', deployedAt: '2026-03-28T11:00:00Z', deployedBy: 'ci-pipeline', status: 'succeeded' },
    ],
  },
  {
    name: 'user-service',
    version: 'v2.1.0',
    team: 'platform',
    slackChannel: '#platform-eng',
    oncall: 'platform-oncall',
    environments: {
      dev: { status: 'healthy', pods: 1, errorRate: 0.00, p99LatencyMs: 85 },
      staging: { status: 'healthy', pods: 1, errorRate: 0.00, p99LatencyMs: 92 },
      prod: { status: 'healthy', pods: 3, errorRate: 0.01, p99LatencyMs: 98 },
    },
    recentDeployments: [
      { version: 'v2.1.0', deployedAt: '2026-04-01T09:15:00Z', deployedBy: 'ci-pipeline', status: 'succeeded' },
    ],
  },
  {
    name: 'notification-service',
    version: 'v2.0.8',
    team: 'platform',
    slackChannel: '#platform-eng',
    oncall: 'platform-oncall',
    environments: {
      dev: { status: 'healthy', pods: 1, errorRate: 0.00, p99LatencyMs: 210 },
      staging: { status: 'healthy', pods: 1, errorRate: 0.05, p99LatencyMs: 245 },
      prod: { status: 'degraded', pods: 2, errorRate: 0.08, p99LatencyMs: 890 },
    },
    recentDeployments: [
      { version: 'v2.0.8', deployedAt: '2026-04-03T16:00:00Z', deployedBy: 'ci-pipeline', status: 'succeeded' },
    ],
  },
  {
    name: 'api-gateway',
    version: 'v1.2.1',
    team: 'platform',
    slackChannel: '#platform-eng',
    oncall: 'platform-oncall',
    environments: {
      dev: { status: 'healthy', pods: 1, errorRate: 0.00, p99LatencyMs: 12 },
      staging: { status: 'healthy', pods: 2, errorRate: 0.00, p99LatencyMs: 15 },
      prod: { status: 'healthy', pods: 4, errorRate: 0.00, p99LatencyMs: 18 },
    },
    recentDeployments: [
      { version: 'v1.2.1', deployedAt: '2026-03-25T13:00:00Z', deployedBy: 'ci-pipeline', status: 'succeeded' },
    ],
  },
];

export async function listServicesHandler(_args: Record<string, unknown>): Promise<string> {
  const summary = SERVICES_STUB.map((s) => {
    const prodEnv = s.environments.prod;
    const statusEmoji = prodEnv.status === 'healthy' ? '✅' : prodEnv.status === 'degraded' ? '⚠️' : '🔴';
    return `${statusEmoji} **${s.name}** (${s.version}) — Team: ${s.team} — Prod error rate: ${(prodEnv.errorRate * 100).toFixed(2)}% — P99: ${prodEnv.p99LatencyMs}ms`;
  }).join('\n');

  return `# Nexus Platform Services\n\n${summary}\n\n*Use get_service_status for detailed pod health and deployment history.*`;
}

export async function getServiceStatusHandler(args: Record<string, unknown>): Promise<string> {
  const { serviceName, environment } = args as { serviceName: string; environment: 'dev' | 'staging' | 'prod' };

  const service = SERVICES_STUB.find((s) => s.name === serviceName);
  if (!service) {
    throw new Error(`Service not found: ${serviceName}. Available: ${SERVICES_STUB.map((s) => s.name).join(', ')}`);
  }

  const env = service.environments[environment];
  if (!env) {
    throw new Error(`Environment not found: ${environment}`);
  }

  const recentDeploys = service.recentDeployments
    .map((d) => `  - ${d.version} at ${d.deployedAt} by ${d.deployedBy} [${d.status}]`)
    .join('\n');

  return `# ${service.name} — ${environment}

**Status**: ${env.status === 'healthy' ? '✅ Healthy' : env.status === 'degraded' ? '⚠️ Degraded' : '🔴 Down'}
**Current Version**: ${service.version}
**Pods Running**: ${env.pods}
**Error Rate**: ${(env.errorRate * 100).toFixed(2)}%
**P99 Latency**: ${env.p99LatencyMs}ms
**Team**: ${service.team}
**On-call**: ${service.oncall}
**Slack**: ${service.slackChannel}

## Recent Deployments
${recentDeploys}`;
}
