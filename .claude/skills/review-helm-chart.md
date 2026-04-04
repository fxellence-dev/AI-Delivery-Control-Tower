# Skill: review-helm-chart

> **[CAPABILITY: SKILLS]**
> Invoke with `/review-helm-chart` or ask Claude to "review the Helm chart".
> The platform reviewer agent invokes this on any infra/helm change.

## When to Use

Invoke when:
- A Helm chart is created or modified
- `values.yaml` or `values-{env}.yaml` is changed
- A new service is being added to Kubernetes

## Checklist

```markdown
## Helm Chart Review: {chart-name}

**Files reviewed**: {list}

### Security

- [ ] No hardcoded secrets or passwords in values.yaml
      Check: `grep -r "password\|secret\|token\|key" values*.yaml`
- [ ] All secrets sourced from ExternalSecret (AWS Secrets Manager)
- [ ] Pod security context defined (non-root user)
      ```yaml
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        readOnlyRootFilesystem: true
      ```
- [ ] No `hostNetwork: true` or `privileged: true`

### Reliability

- [ ] Resource requests AND limits defined for all containers
- [ ] Liveness and readiness probes configured
- [ ] PodDisruptionBudget defined (if replicas > 1)
- [ ] HorizontalPodAutoscaler defined (if applicable)
- [ ] Anti-affinity rules to spread pods across nodes

### Observability

- [ ] Service and deployment labels follow nexus.io/team, app.kubernetes.io/* convention
- [ ] Prometheus annotations or ServiceMonitor defined
- [ ] Log format is JSON (structured)

### Correctness

- [ ] Correct namespace for each environment
- [ ] Image tag is not `latest` — must be a pinned version or SHA
- [ ] Environment-specific values in values-{env}.yaml, not hardcoded

### Findings

| Severity | Item | Recommendation |
|----------|------|---------------|
| HIGH | {finding} | {fix} |
```

## Rules

1. `latest` image tags are never acceptable in staging or production.
2. Any `HIGH` severity finding blocks the deploy.
3. Resource limits missing is always a `HIGH` finding.
4. Hardcoded secrets is always a `CRITICAL` finding — escalate immediately.
