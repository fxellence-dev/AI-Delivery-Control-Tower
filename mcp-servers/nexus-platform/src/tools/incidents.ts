/**
 * MCP Tools: Incident Management
 *
 * [CAPABILITY: MCP — Tool Implementation]
 * These tools allow Claude to create, update, and resolve incidents.
 * The security-reviewer agent calls create_incident for critical findings.
 * The planner agent calls create_incident at the start of incident response.
 * The stop-save-memory hook fires after resolve_incident to capture learnings.
 */

import { ulid } from 'ulid';

interface IncidentRecord {
  id: string;
  title: string;
  severity: 'P1' | 'P2' | 'P3';
  status: 'open' | 'investigating' | 'identified' | 'monitoring' | 'resolved';
  description: string;
  affectedServices: string[];
  incidentCommander?: string;
  timeline: { timestamp: string; message: string }[];
  createdAt: string;
  resolvedAt?: string;
  resolution?: string;
  rootCause?: string;
}

const incidentStore: IncidentRecord[] = [];

export async function createIncidentHandler(args: Record<string, unknown>): Promise<string> {
  const { title, severity, description, affectedServices, incidentCommander } = args as {
    title: string;
    severity: 'P1' | 'P2' | 'P3';
    description: string;
    affectedServices: string[];
    incidentCommander?: string;
  };

  const incident: IncidentRecord = {
    id: ulid(),
    title,
    severity,
    status: 'investigating',
    description,
    affectedServices,
    incidentCommander,
    timeline: [
      { timestamp: new Date().toISOString(), message: `Incident declared. ${description}` },
    ],
    createdAt: new Date().toISOString(),
  };

  incidentStore.push(incident);

  const urgency = severity === 'P1' ? '🔴 CRITICAL' : severity === 'P2' ? '🟠 HIGH' : '🟡 MEDIUM';

  return `## ${urgency} Incident Created

**Incident ID**: ${incident.id}
**Title**: ${title}
**Severity**: ${severity}
**Affected Services**: ${affectedServices.join(', ')}
${incidentCommander ? `**Incident Commander**: ${incidentCommander}` : '**Incident Commander**: *Assign immediately*'}

**Next Steps**:
1. Post in #incidents: "🚨 ${severity} Incident: ${title} | IC: ${incidentCommander ?? 'TBD'} | ID: ${incident.id}"
2. Start video call for P1/P2
3. Update incident as investigation progresses (use update_incident)
4. Run k8s-triage skill if services are down`;
}

export async function updateIncidentHandler(args: Record<string, unknown>): Promise<string> {
  const { incidentId, update, status } = args as {
    incidentId: string;
    update: string;
    status?: string;
  };

  const incident = incidentStore.find((i) => i.id === incidentId);
  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  incident.timeline.push({ timestamp: new Date().toISOString(), message: update });

  if (status && ['investigating', 'identified', 'monitoring', 'resolved'].includes(status)) {
    incident.status = status as IncidentRecord['status'];
  }

  return `## Incident Updated: ${incident.title}

**Status**: ${incident.status}
**Latest Update**: ${update}
**Timeline entries**: ${incident.timeline.length}`;
}

export async function resolveIncidentHandler(args: Record<string, unknown>): Promise<string> {
  const { incidentId, resolution, rootCause } = args as {
    incidentId: string;
    resolution: string;
    rootCause?: string;
  };

  const incident = incidentStore.find((i) => i.id === incidentId);
  if (!incident) {
    throw new Error(`Incident not found: ${incidentId}`);
  }

  incident.status = 'resolved';
  incident.resolvedAt = new Date().toISOString();
  incident.resolution = resolution;
  incident.rootCause = rootCause;
  incident.timeline.push({ timestamp: incident.resolvedAt, message: `Resolved: ${resolution}` });

  const duration = Math.round(
    (new Date(incident.resolvedAt).getTime() - new Date(incident.createdAt).getTime()) / 60000
  );

  return `## ✅ Incident Resolved: ${incident.title}

**Duration**: ${duration} minutes
**Resolution**: ${resolution}
${rootCause ? `**Root Cause (preliminary)**: ${rootCause}` : ''}

**Post-Incident Actions**:
1. Post to #incidents: "✅ ${incident.severity} Incident resolved after ${duration}min: ${resolution}"
2. Run \`build-postmortem\` skill within 48 hours
3. The stop-save-memory hook will prompt you to capture learnings when the session ends

**Postmortem due by**: ${new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().split('T')[0]}`;
}

export async function listIncidentsHandler(args: Record<string, unknown>): Promise<string> {
  const { serviceName, status = 'all', limit = 10 } = args as {
    serviceName?: string;
    status?: string;
    limit?: number;
  };

  let incidents = [...incidentStore];

  if (serviceName) {
    incidents = incidents.filter((i) => i.affectedServices.includes(serviceName));
  }
  if (status !== 'all') {
    incidents = incidents.filter((i) => (status === 'open' ? i.status !== 'resolved' : i.status === 'resolved'));
  }

  incidents = incidents.slice(0, limit);

  if (incidents.length === 0) {
    return 'No incidents found matching the criteria.';
  }

  const rows = incidents.map((i) => {
    const emoji = i.status === 'resolved' ? '✅' : i.severity === 'P1' ? '🔴' : i.severity === 'P2' ? '🟠' : '🟡';
    return `${emoji} **${i.id}** — ${i.severity} — ${i.title} — ${i.status} — ${i.createdAt.split('T')[0]}`;
  });

  return `# Recent Incidents\n\n${rows.join('\n')}`;
}
