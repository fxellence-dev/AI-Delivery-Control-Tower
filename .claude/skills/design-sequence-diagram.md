# Skill: design-sequence-diagram

> **[CAPABILITY: SKILLS]**
> Invoke with `/design-sequence-diagram` or ask Claude to "draw a sequence diagram".
> The architect agent invokes this when a new multi-service flow is introduced.

## When to Use

Invoke when:
- A new feature involves 2+ services communicating
- Documenting an existing flow that lacks visual documentation
- An incident revealed unexpected service interaction order

## Output

Produce:
1. A Mermaid sequence diagram in a `docs/diagrams/{flow-name}.md` file
2. A brief prose explanation of the happy path and key edge cases

## Mermaid Template

```mermaid
sequenceDiagram
    autonumber
    actor Client
    participant GW as API Gateway
    participant PS as payment-service
    participant US as user-service
    participant NS as notification-service
    participant SQS as AWS SQS

    Note over Client,SQS: Feature: Webhook Retry with Dead-Letter Queue

    Client->>+GW: POST /v1/webhooks/deliveries
    GW->>GW: Validate JWT
    GW->>+PS: Forward request
    PS->>+US: GET /v1/users/{userId} (verify user active)
    US-->>-PS: 200 OK { userId, status: "active" }

    PS->>PS: Create delivery record (ULID)
    PS->>SQS: Publish webhook.delivery.requested
    PS-->>-GW: 202 Accepted { deliveryId }
    GW-->>-Client: 202 Accepted

    Note over NS,SQS: Async: notification-service processes delivery
    SQS->>+NS: webhook.delivery.requested
    NS->>NS: Attempt delivery (attempt 1)
    alt Delivery succeeds
        NS->>NS: Update delivery status = delivered
        NS->>SQS: Publish webhook.delivered
    else Delivery fails
        NS->>NS: Schedule retry (exponential backoff)
        NS->>NS: attempt 2 → 3 → 4 → 5
        alt Max retries exceeded
            NS->>SQS: Move to nexus-dlq (dead-letter)
            NS->>SQS: Publish webhook.delivery.failed
        end
    end
    NS-->>-SQS: ack
```

## Rules

1. Use `autonumber` — makes it easy to reference steps in ADRs and postmortems.
2. Label participants with short names (GW, PS, US) and full names in the `as` clause.
3. Use `Note over` boxes to separate logical phases (sync vs async, normal vs error).
4. Always show the error/retry path — not just the happy path.
5. Save as `.md` with the Mermaid block — renders in GitHub and most wikis.
6. Cross-reference the diagram in the relevant ADR.
