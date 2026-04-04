# Skill: create-contract-tests

> **[CAPABILITY: SKILLS]**
> Invoke with `/create-contract-tests` or ask Claude to "write contract tests".
> The test-engineer agent auto-invokes this whenever an API contract between services changes.

## When to Use

Invoke when:
- A new endpoint is added that another service will call
- An existing endpoint's request or response schema changes
- A new SQS event type is added or modified
- A shared type is changed in a way that affects consumers

## What Are Contract Tests?

Contract tests verify that a **provider** (the service offering an API) honours the contract that a **consumer** (the service calling it) depends on. We use [Pact](https://pact.io) for HTTP contracts.

- **Consumer test**: Written in the consumer service, defines what the consumer expects the API to look like.
- **Provider verification**: Written in the provider service, verifies the real implementation matches all consumer expectations.

## Output

Produce two files:

1. **Consumer test** in the calling service:
   `{consumer-service}/tests/contracts/{provider-service}.contract.test.ts`

2. **Provider verification** in the providing service:
   `{provider-service}/tests/contracts/provider.verification.test.ts`
   (or extend existing verification if it exists)

## Consumer Test Template (TypeScript/Pact)

```typescript
// payment-service/tests/contracts/user-service.contract.test.ts
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { UserServiceClient } from '../../src/clients/user-service.client';

const { like, string, uuid } = MatchersV3;

const provider = new PactV3({
  consumer: 'payment-service',
  provider: 'user-service',
  dir: './pacts',
});

describe('payment-service → user-service contract', () => {
  describe('GET /v1/users/:id', () => {
    it('returns user when found', () => {
      return provider
        .given('user 01ARZ3NDEKTSV4RRFFQ69G5FAV exists')
        .uponReceiving('a request for user by ID')
        .withRequest({
          method: 'GET',
          path: '/v1/users/01ARZ3NDEKTSV4RRFFQ69G5FAV',
          headers: { Authorization: like('Bearer token') },
        })
        .willRespondWith({
          status: 200,
          body: {
            data: {
              id: string('01ARZ3NDEKTSV4RRFFQ69G5FAV'),
              email: string('user@example.com'),
              status: string('active'),
            },
            meta: {
              requestId: string(),
              timestamp: string(),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new UserServiceClient(mockServer.url);
          const result = await client.getUserById('01ARZ3NDEKTSV4RRFFQ69G5FAV');
          expect(result.isOk()).toBe(true);
        });
    });

    it('returns 404 when user not found', () => {
      return provider
        .given('user 01ARZ3NDEKTSV4RRFFQ69G5FAX does not exist')
        .uponReceiving('a request for a non-existent user')
        .withRequest({
          method: 'GET',
          path: '/v1/users/01ARZ3NDEKTSV4RRFFQ69G5FAX',
          headers: { Authorization: like('Bearer token') },
        })
        .willRespondWith({
          status: 404,
          body: {
            error: {
              code: string('USER_NOT_FOUND'),
              message: string(),
            },
          },
        })
        .executeTest(async (mockServer) => {
          const client = new UserServiceClient(mockServer.url);
          const result = await client.getUserById('01ARZ3NDEKTSV4RRFFQ69G5FAX');
          expect(result.isErr()).toBe(true);
        });
    });
  });
});
```

## Provider Verification Template

```typescript
// user-service/tests/contracts/provider.verification.test.ts
import { Verifier } from '@pact-foundation/pact';
import { app } from '../../src/app';

describe('user-service provider verification', () => {
  it('validates all consumer pacts', () => {
    const server = app.listen(0);
    const port = (server.address() as any).port;

    return new Verifier({
      provider: 'user-service',
      providerBaseUrl: `http://localhost:${port}`,
      pactUrls: ['./pacts/payment-service-user-service.json'],
      stateHandlers: {
        'user 01ARZ3NDEKTSV4RRFFQ69G5FAV exists': async () => {
          await testDb.seed({ users: [{ id: '01ARZ3NDEKTSV4RRFFQ69G5FAV', email: 'user@example.com', status: 'active' }] });
        },
        'user 01ARZ3NDEKTSV4RRFFQ69G5FAX does not exist': async () => {
          await testDb.clear({ users: [] });
        },
      },
    })
      .verifyProvider()
      .finally(() => server.close());
  });
});
```

## Rules

1. Consumer tests define the contract — providers must not break them.
2. State handlers in provider verification must use real test DB, not mocks.
3. Pact files (`./pacts/*.json`) must be committed to the repo.
4. CI runs consumer tests first, then provider verification. A provider cannot merge if it breaks a consumer pact.
5. When an event schema changes (SQS), write a Pact message contract instead of HTTP contract.
