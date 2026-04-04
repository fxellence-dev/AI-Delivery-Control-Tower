# Kubernetes Rules — Nexus Platform

> **[CAPABILITY: MEMORY — .claude/rules/]**
> K8s manifest conventions and safety rules.
> These apply to all files in `infra/k8s/` and Helm chart templates.

## Resource Limits

**Every container must define both requests and limits. No exceptions.**

```yaml
# ✅ CORRECT
resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

# ❌ WRONG — missing limits causes noisy neighbors in prod
resources:
  requests:
    memory: "128Mi"
```

## Namespaces

| Environment | Namespace | Notes |
|-------------|-----------|-------|
| Dev | `nexus-dev` | Auto-deploy from `main` |
| Staging | `nexus-staging` | Auto-deploy from `release/*` |
| Production | `nexus-prod` | Manual approval only |

**Never run `kubectl delete` against `nexus-prod` without explicit Incident Commander approval.** The `pre-tool-use-bash.sh` hook blocks this automatically.

## Health Checks

All deployments must define liveness and readiness probes:

```yaml
# ✅ CORRECT
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 5
  failureThreshold: 2
```

## Secrets

**Never mount secrets as environment variables from plain Kubernetes Secrets.** Use AWS Secrets Manager via the External Secrets Operator:

```yaml
# ✅ CORRECT
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: payment-service-secrets
spec:
  secretStoreRef:
    name: aws-secrets-manager
  target:
    name: payment-service-secrets
  data:
    - secretKey: DATABASE_URL
      remoteRef:
        key: nexus/payment-service/database-url

# ❌ WRONG — never put secret values in K8s manifests
env:
  - name: DATABASE_PASSWORD
    value: "mysecretpassword"
```

## Deployment Strategy

All production deployments use RollingUpdate with maxUnavailable: 0:

```yaml
strategy:
  type: RollingUpdate
  rollingUpdate:
    maxUnavailable: 0
    maxSurge: 1
```

## Pod Disruption Budgets

Every service with more than 1 replica must have a PDB:

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: payment-service-pdb
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: payment-service
```

## Labels

Required labels on all resources:

```yaml
labels:
  app.kubernetes.io/name: payment-service
  app.kubernetes.io/version: "1.2.3"
  app.kubernetes.io/component: backend
  app.kubernetes.io/part-of: nexus-platform
  nexus.io/team: payments
  nexus.io/env: prod
```
