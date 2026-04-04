/**
 * nexus-platform MCP Server
 *
 * [CAPABILITY: MCP — Custom MCP Server]
 *
 * This is the main educational artifact of the ADCT reference project.
 * It demonstrates how to build a custom MCP server using the MCP SDK.
 *
 * An MCP server exposes:
 *   - TOOLS: actions Claude can invoke (create incident, deploy service, etc.)
 *   - RESOURCES: data Claude can read (runbooks, service catalog, etc.)
 *   - PROMPTS: pre-built prompt templates (optional)
 *
 * Claude Code connects to this server via stdio (configured in .claude/settings.json).
 * The tools appear in Claude's tool list alongside built-in tools like Read, Bash, Edit.
 *
 * HOW TO BUILD YOUR OWN:
 *   1. npm install @modelcontextprotocol/sdk
 *   2. Create a Server instance with your server info
 *   3. Register tools with server.tool() — each tool has a name, description, input schema, and handler
 *   4. Register resources with server.resource() — each resource has a URI and content fetcher
 *   5. Connect via stdio transport: server.connect(new StdioServerTransport())
 *   6. Configure in .claude/settings.json mcpServers section
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { listServicesHandler, getServiceStatusHandler } from './tools/services.js';
import { createDeploymentHandler, rollbackDeploymentHandler, setFeatureFlagHandler } from './tools/deployments.js';
import { createIncidentHandler, updateIncidentHandler, resolveIncidentHandler, listIncidentsHandler } from './tools/incidents.js';
import { listRunbooks, getRunbook } from './resources/runbooks.js';

// ─── Server Definition ────────────────────────────────────────────────────────
const server = new Server(
  {
    name: 'nexus-platform',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
    },
  }
);

// ─── Tool Registry ────────────────────────────────────────────────────────────
// Tools are actions Claude can invoke. Each tool has:
//   - name: how Claude references it (e.g., mcp__nexus-platform__list_services)
//   - description: what Claude reads to decide when to use this tool
//   - inputSchema: Zod/JSON Schema for the tool's parameters
//   - handler: the function that executes the tool

const TOOLS = [
  // Service tools
  {
    name: 'list_services',
    description: 'List all Nexus Platform services with their current status, version, and team ownership. Use this to understand the service topology before making architecture decisions.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    handler: listServicesHandler,
  },
  {
    name: 'get_service_status',
    description: 'Get detailed status of a specific service including pod health, recent deployments, error rate, and P99 latency.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string', description: 'Service name (e.g., payment-service, user-service, notification-service)' },
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'], description: 'Target environment' },
      },
      required: ['serviceName', 'environment'],
    },
    handler: getServiceStatusHandler,
  },

  // Deployment tools
  {
    name: 'create_deployment',
    description: 'Register a new deployment in the Nexus Platform deployment tracker. Call this when beginning a deployment to staging or production.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        version: { type: 'string', description: 'Semantic version or git SHA' },
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        deployedBy: { type: 'string', description: 'Who or what initiated the deployment' },
        releaseNotesUrl: { type: 'string', description: 'Path to release notes document' },
      },
      required: ['serviceName', 'version', 'environment', 'deployedBy'],
    },
    handler: createDeploymentHandler,
  },
  {
    name: 'rollback_deployment',
    description: 'Initiate a rollback of a service to its previous version. Use during incidents when the current version is causing elevated error rates.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string' },
        environment: { type: 'string', enum: ['staging', 'prod'] },
        reason: { type: 'string', description: 'Why the rollback is being initiated' },
      },
      required: ['serviceName', 'environment', 'reason'],
    },
    handler: rollbackDeploymentHandler,
  },
  {
    name: 'set_feature_flag',
    description: 'Enable or disable a LaunchDarkly feature flag for a given environment. Use to control feature rollout without redeploying.',
    inputSchema: {
      type: 'object',
      properties: {
        flagKey: { type: 'string', description: 'LaunchDarkly flag key' },
        environment: { type: 'string', enum: ['dev', 'staging', 'prod'] },
        enabled: { type: 'boolean' },
        reason: { type: 'string' },
      },
      required: ['flagKey', 'environment', 'enabled'],
    },
    handler: setFeatureFlagHandler,
  },

  // Incident tools
  {
    name: 'create_incident',
    description: 'Create a new incident record in the Nexus Platform incident tracker. Call this immediately when a P1 or P2 issue is detected.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        severity: { type: 'string', enum: ['P1', 'P2', 'P3'] },
        description: { type: 'string' },
        affectedServices: { type: 'array', items: { type: 'string' } },
        incidentCommander: { type: 'string' },
      },
      required: ['title', 'severity', 'description', 'affectedServices'],
    },
    handler: createIncidentHandler,
  },
  {
    name: 'update_incident',
    description: 'Add an update to an existing incident record. Use to log investigation steps, findings, and actions taken.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        update: { type: 'string', description: 'Update text to append to the incident timeline' },
        status: { type: 'string', enum: ['investigating', 'identified', 'monitoring', 'resolved'], description: 'Optional status change' },
      },
      required: ['incidentId', 'update'],
    },
    handler: updateIncidentHandler,
  },
  {
    name: 'resolve_incident',
    description: 'Mark an incident as resolved. This triggers the stop-save-memory hook to capture learnings.',
    inputSchema: {
      type: 'object',
      properties: {
        incidentId: { type: 'string' },
        resolution: { type: 'string', description: 'How the incident was resolved' },
        rootCause: { type: 'string', description: 'Preliminary root cause' },
      },
      required: ['incidentId', 'resolution'],
    },
    handler: resolveIncidentHandler,
  },
  {
    name: 'list_incidents',
    description: 'List recent incidents, optionally filtered by service or status.',
    inputSchema: {
      type: 'object',
      properties: {
        serviceName: { type: 'string', description: 'Filter by affected service' },
        status: { type: 'string', enum: ['open', 'resolved', 'all'] },
        limit: { type: 'number', default: 10 },
      },
      required: [],
    },
    handler: listIncidentsHandler,
  },
];

// ─── Tool Handlers ────────────────────────────────────────────────────────────
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map(({ name, description, inputSchema }) => ({
    name,
    description,
    inputSchema,
  })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = TOOLS.find((t) => t.name === request.params.name);
  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${request.params.name}` }],
      isError: true,
    };
  }

  try {
    const result = await tool.handler(request.params.arguments ?? {});
    return {
      content: [{ type: 'text', text: typeof result === 'string' ? result : JSON.stringify(result, null, 2) }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Tool error: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
});

// ─── Resource Registry ────────────────────────────────────────────────────────
// Resources are data that Claude can read — like files, but served by the MCP server.
// They use a URI scheme: nexus://runbooks/payment-service-restart

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: listRunbooks().map((runbook) => ({
    uri: `nexus://runbooks/${runbook.id}`,
    name: runbook.title,
    description: runbook.description,
    mimeType: 'text/markdown',
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const uri = request.params.uri;
  const runbookId = uri.replace('nexus://runbooks/', '');
  const content = getRunbook(runbookId);

  if (!content) {
    throw new Error(`Runbook not found: ${runbookId}`);
  }

  return {
    contents: [
      {
        uri,
        mimeType: 'text/markdown',
        text: content,
      },
    ],
  };
});

// ─── Start Server ─────────────────────────────────────────────────────────────
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server is now running and listening on stdio
  // Claude Code will communicate with it via the MCP protocol
}

main().catch(console.error);
