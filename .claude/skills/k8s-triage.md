# Skill: k8s-triage

> **[CAPABILITY: SKILLS]**
> Invoke with `/k8s-triage` or ask Claude to "triage the Kubernetes issue".
> The planner agent invokes this at the start of any infrastructure incident.

## When to Use

Invoke when:
- A service is down or degraded in Kubernetes
- Pods are in CrashLoopBackOff, OOMKilled, or Pending state
- A deployment is stuck or rolling back
- Node pressure alerts are firing

## Triage Runbook

Work through each step and produce a triage report. Stop at the step where the root cause becomes clear.

### Step 1: Pod Status

```bash
# Check pod health in affected namespace
kubectl get pods -n {namespace} -l app={service-name}
kubectl describe pod {pod-name} -n {namespace}
```

Look for:
- `CrashLoopBackOff` → check logs for panic/startup error
- `OOMKilled` → memory limit too low or memory leak
- `Pending` → insufficient cluster resources or PVC issue
- `ImagePullBackOff` → bad image tag or registry auth

### Step 2: Recent Events

```bash
kubectl get events -n {namespace} --sort-by='.lastTimestamp' | tail -20
```

### Step 3: Logs

```bash
# Current logs
kubectl logs {pod-name} -n {namespace} --tail=100

# Previous container logs (if crashed)
kubectl logs {pod-name} -n {namespace} --previous --tail=100
```

Look for: panic strings, OOM messages, startup failures, DB connection errors.

### Step 4: Recent Deployments

```bash
kubectl rollout history deployment/{service-name} -n {namespace}
kubectl rollout status deployment/{service-name} -n {namespace}
```

If a recent rollout caused the issue:
```bash
kubectl rollout undo deployment/{service-name} -n {namespace}
```

### Step 5: Resource Pressure

```bash
kubectl top nodes
kubectl top pods -n {namespace}
kubectl describe node {node-name}  # if node pressure suspected
```

### Step 6: Configuration

```bash
kubectl get configmap -n {namespace}
kubectl get externalsecret -n {namespace}  # check if secrets synced
```

## Output Format

```markdown
# K8s Triage Report: {service-name} in {namespace}

**Time**: {UTC timestamp}
**Triggered by**: {alert name or incident description}
**Triage Agent**: Claude (k8s-triage skill)

## Status

| Pod | Status | Restarts | Age |
|-----|--------|----------|-----|
| {pod-1} | CrashLoopBackOff | 14 | 23m |

## Root Cause (Preliminary)

{Description of what the triage found}

## Evidence

```
{Relevant log lines or kubectl output}
```

## Immediate Action

{Recommended immediate action — rollback, restart, scale, etc.}

```bash
# Command to execute (shown for approval, not auto-executed)
kubectl rollout undo deployment/payment-service -n nexus-prod
```

## Follow-up Required

- [ ] {Action 1}
- [ ] {Action 2}
```

## Safety Rules

1. **Never auto-execute** `kubectl delete`, `kubectl rollout undo`, or any destructive command. Show the command and wait for approval.
2. **Production namespace** (`nexus-prod`) requires Incident Commander approval for any change.
3. The `pre-tool-use-bash.sh` hook blocks dangerous kubectl commands automatically — this skill works within those constraints.
4. Always check `rollout history` before recommending a rollback — ensure there's a known-good previous version.
