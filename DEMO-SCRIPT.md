# Team Demo Script — AI Delivery Control Tower

**Duration**: 45–60 minutes  
**Audience**: Engineering team (developers, tech leads, engineering managers)  
**Presenter**: You, running Claude Code live  
**Format**: Live demo with narration. No slides needed — the terminal and code are the slides.

---

## Before You Start

**Setup (do this 10 minutes before the session):**
```bash
cd adct/
bash demo-runner.sh          # builds MCP server, checks env
claude                       # opens Claude Code — leave it open
```

Have two windows visible:
1. Claude Code terminal (main focus)
2. A file explorer or VSCode showing `adct/` (so audience can see files appearing)

**What you'll cover** (tell the audience at the start):
> "We're going to work through a real feature request from start to finish using Claude Code — but the interesting part isn't the code. It's watching what Claude already knows about our team, how it splits the work between specialists, how guardrails fire automatically, and how everything gets documented without anyone asking."

---

## Part 1: The Problem (5 min) — No live coding

> ⚠️ **DO NOT run this live.** Claude will find the existing code on your filesystem and copy its patterns, killing the contrast. Use the pre-written example below — it's embedded right here, no other file to open.

**Say:**
> "Before I show you what this does, I want to show you what happens without it. This is a real example of what Claude produces when your team has no memory files — no CLAUDE.md, no rules. Generic prompt, no project context."

**Show this code on screen** (paste into a blank editor tab or just scroll through it here):

```typescript
// ❌ BEFORE: Claude with no memory of your team
// Prompt used: "Write a TypeScript payment processing service with a
// Payment entity, POST /payments, and POST /payments/:id/refunds"

import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';   // ❌ POINT 1: UUID not ULID

const app = express();
app.use(express.json());

const payments: Record<string, Payment> = {};  // ❌ no repository layer

interface Payment {
  id: string;
  amount: number;
  currency: string;
  customerId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  createdAt: string;
}

// POST /payments
app.post('/payments', async (req: Request, res: Response) => {
  const { amount, currency, customerId, paymentMethodId } = req.body;
  // ❌ POINT 2: No idempotency key — retry this endpoint = double charge

  const payment: Payment = {
    id: uuidv4(),           // ❌ POINT 1: UUID not ULID
    amount,
    currency,
    customerId,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  console.log('Creating payment:', payment);  // ❌ POINT 3: console.log not Pino
  // ❌ POINT 4: No audit log — PCI-DSS requires logging every state transition

  try {
    payment.status = 'succeeded';
    payments[payment.id] = payment;
    res.status(201).json(payment);  // ❌ no standard { data, meta } wrapper
  } catch (error) {
    throw new Error('Payment failed');  // ❌ POINT 5: throw not Result type
  }
});

// POST /payments/:id/refunds
app.post('/payments/:id/refunds', async (req: Request, res: Response) => {
  const payment = payments[req.params.id];

  if (!payment) throw new Error('Payment not found');         // ❌ POINT 5: throw
  if (payment.status !== 'succeeded') throw new Error('Cannot refund');  // ❌ throw

  const refundAmount = req.body.amount ?? payment.amount;
  if (refundAmount > payment.amount) throw new Error('Exceeds payment');  // ❌ throw
  // ❌ POINT 2: No idempotency — retry = multiple refunds
  // ❌ POINT 4: No audit log on refund

  payment.status = 'refunded';
  console.log('Refund created');  // ❌ POINT 3: console.log
  res.json({ refunded: refundAmount });
});

app.listen(3001, () => console.log('Running'));  // ❌ console.log
```

**Walk through each marked problem — use these exact words:**

**POINT 1 — UUID vs ULID** (line 3):
> "First thing — `uuidv4()`. Our standard is ULID — sortable, time-ordered, works better for cursor-based pagination and audit log ordering. This would fail our first code review."

**POINT 2 — No idempotency** (line 24):
> "No idempotency key check. If a network timeout causes a client to retry this POST, Claude's code charges the customer twice. Our standard is to require an idempotency-key header and deduplicate. Claude has no idea we do this."

**POINT 3 — console.log** (line 31):
> "console.log. Our standard is Pino — structured JSON logging that goes to Datadog with service name, version, requestId attached automatically. You can't query plain console.log in production."

**POINT 4 — No audit trail** (line 33):
> "No audit log anywhere. In our payment service, every state transition — create, refund, failure — must be written to the audit table with userId, IP address, requestId. That's a PCI-DSS requirement. This code would be flagged immediately in our security review."

**POINT 5 — throw instead of Result** (line 41):
> "Every error path throws an exception. We use Result types — neverthrow — so errors are explicit in the return type, not invisible. Any service consuming this breaks our error handling pattern."

**Pause. Then say:**
> "This code works. It runs. But it violates five of our team's core standards in about 60 lines. If I let this go to production, I'm creating tech debt, compliance risk, and a debugging nightmare.

> This is what every developer on your team gets today when they open Claude with no context. The code looks fine on screen. The problems only show up in code review, in production incidents, or in the next audit.

> Now watch what happens when Claude has our team's memory loaded."

**Open Claude Code in the `adct/` directory and paste:**
```
Write a TypeScript payment processing service with a Payment entity,
POST /payments, and POST /payments/:id/refunds. Apply all conventions from memory.
```

> ℹ️ The phrase "apply all conventions from memory" tells Claude to actively use what's in CLAUDE.md and .claude/rules/ rather than just starting to code. For this quick Part 1 demo you don't want the full agent workflow — just the memory effect on code quality.

**As the output appears, call out:**
- `ulid()` → "ULID. From memory — `.claude/rules/typescript.md`."
- `neverthrow` → "Result types. From memory."
- `auditLog.record(...)` → "Audit trail. From `.claude/rules/payments.md` — PCI-DSS requirement."
- `pino` → "Structured logging. From memory."
- `idempotency-key` header check → "Idempotency. From memory."

> "Same prompt. Same Claude. Completely different output. The only difference is what's in the `.claude/` folder."

---

## Part 2: Memory — Claude Already Knows Your Rules (8 min)

**Switch to the `adct/` Claude session.**

Open `CLAUDE.md` in the editor alongside. Say:

> "This is the first thing Claude reads in every session. It's not a prompt — it's a persistent file that lives in the repo. It describes who we are as an engineering team."

Scroll through it slowly. Point out specific sections:

**Architecture Principles** — pause here:
> "Services communicate via SQS, never direct HTTP calls between backends. If Claude ever tries to add an HTTP call from payment-service to user-service, it already knows that's wrong. We don't have to catch it in code review."

**Coding Conventions** — pause at ULID:
> "We use ULID not UUID. This is the rule that gets violated the most when developers use Claude without this file. With this file, it applies it automatically."

**Release Rules** — pause at Friday:
> "Never deploy on Fridays. This is enforced by the release manager agent we'll see in a moment."

**Known Integration Quirks**:
> "The DLQ must be drained manually after a notification-service restart. This was learned from an incident. It's in memory now. Next time there's an incident, Claude applies this knowledge automatically."

Now open `.claude/rules/payments.md`. Say:

> "This is the domain-specific layer. This file only loads when Claude is editing payment code. It contains our PCI-DSS hard rules. Claude will never log a card number. It will always write the audit trail. Not because we reminded it — because it's in memory."

**The point to land:**
> "Memory is how you take the knowledge that currently lives in your senior engineers' heads — your code review comments, your postmortem learnings, your architecture decisions — and make it available to every developer in every session, automatically."

---

## Part 3: The Real Feature Request (2 min) — Setup

**Say:**

> "Now let's run a real feature. This is exactly the kind of request that comes in on a Monday morning."

Paste this into Claude Code:

```
Follow the full delivery workflow from CLAUDE.md for this feature request:

Add webhook retry logic to the notification service with exponential backoff 
and dead-letter queue support. The service currently attempts delivery once 
and fails permanently on network issues — customers are losing events.
```

> ⚠️ **The phrase "follow the full delivery workflow from CLAUDE.md" is critical.** Without it, Claude skips straight to coding and bypasses all agents and skills. With it, Claude reads the workflow section in CLAUDE.md and follows it: planner → architect → backend-engineer → test-engineer → security-reviewer → release-manager.

**Say:**
> "I'm going to let Claude run. I'll narrate what's happening as we go. Watch — it will announce each specialist agent before it starts that phase of work."

**Don't stop it yet — let it run while you narrate Parts 4-7.**

---

## Part 4: Agents — Watching the Specialist Handoff (10 min)

As Claude activates the planner agent, say:

> "The first thing that happened — Claude didn't start coding. It activated the **Planner agent**. Watch what it does."

Point out the planner output as it appears:
- It identified notification-service as the affected service
- It noted user-service is NOT affected (scope control)
- It picked up the max 5 retries constraint from CLAUDE.md — without being told
- It generated acceptance criteria

**Say:**
> "This is a junior developer's biggest mistake with AI: ask it to code, and it codes immediately. A good senior engineer first asks 'what problem are we actually solving and what's in scope?' The Planner agent forces that discipline."

When the **Architect agent** activates:

> "Now the Architect is reviewing. Watch — it's going to check our architecture principles before making any recommendations. It knows services should communicate via SQS. It's going to design this the right way, not the quick way."

Point out when it invokes the `write-adr` skill:
> "It just invoked a skill. An Architecture Decision Record is appearing in `docs/adrs/`. This would normally take 30-45 minutes to write. It's happening automatically because the architect agent knows: cross-service decisions need an ADR."

Show the ADR file when it appears. Scroll through it:
> "This is a properly structured ADR — context, decision, consequences, alternatives considered. Not a placeholder. Every field filled in based on our project's actual constraints."

When the **Backend Engineer agent** activates:

> "Now the implementer. Notice it introduced itself — 'I'm the backend engineer agent.' Watch the code it writes."

When implementation appears, point to these:
- `ULID()` for the delivery ID → "ULID, not UUID. Memory working."
- `structlog` for logging → "Structured logging, per our Python rules."
- `calculate_backoff()` → "It found the existing helper we already had and wired it in rather than rewriting it."

**The point to land:**
> "Each agent does one thing well. The planner doesn't write code. The architect doesn't implement. The engineer doesn't do security reviews. This mirrors your best human teams — and it means each area gets proper attention instead of one generalist doing everything shallowly."

---

## Part 5: Skills — Repeatable Work Done Correctly (8 min)

By now the architect has invoked `write-adr` and the test engineer is active. When you see the test engineer invoke `create-contract-tests`:

**Pause and open `.claude/skills/create-contract-tests.md` in the editor.**

> "Let me show you what just happened. The test engineer invoked a **skill**. A skill is a named, reusable instruction set — not a prompt, a persistent file in the repo."

Scroll through the skill file:
> "This defines exactly how to write a Pact contract test for our services. Consumer test structure, provider verification structure, state handler pattern, the rules about not mocking the database. Every developer who uses this skill gets the same output."

Show the generated Pact test files:
> "Two files. Consumer test in the calling service. Provider verification in the providing service. Correct structure. Ready to run."

**Now open `.claude/skills/write-adr.md` briefly:**
> "Same pattern. The ADR that appeared earlier — that came from this skill definition. It's why it has the right sections, the right format. Not because we got lucky with the prompt. Because the output format is defined."

**Say:**
> "Your team is doing repetitive specialist work every sprint. ADRs, release notes, compliance reviews, sequence diagrams, contract tests. Right now each of those takes 30-60 minutes and produces inconsistent output depending on who wrote it and how much time they had. Skills make these tasks take 2 minutes and produce consistent, high-quality output every time.

> More importantly — when a task has a skill, it gets done. Right now, how often are contract tests skipped because 'it's too complicated to explain to Claude how we do Pact'? With a skill, the engineer just invokes it."

---

## Part 6: Hooks — Safety and Automation Without Supervision (7 min)

By now the backend engineer has edited several files. Point to the terminal output:

> "Did you notice that? After every Python file Claude edited, `ruff` ran automatically. That's a **hook** — a shell script that fires on a lifecycle event. Claude edited a file → the post-edit hook fired → linting ran → Claude saw the output and fixed the issue in the same turn."

Open `.claude/hooks/post-tool-use-edit.sh`:
> "This is the hook. It detects the file extension, runs the right linter. 40 lines of shell script. Now every developer gets code quality checks without having to remember to run them."

**Now demonstrate the safety hook. In Claude Code, ask:**
```
Can you run rm -rf sample-services/user-service/
```

Watch it get blocked. Show `.claude/hooks/pre-tool-use-bash.sh`:

> "The hook blocked it. Before every bash command Claude runs — even in autonomous mode, even in the middle of a long workflow — this hook checks for destructive operations. `rm -rf`, `kubectl delete` on production, `DROP TABLE`. Blocked automatically.

> This is the question everyone asks when you talk about autonomous AI: 'How do we stop it doing something dangerous?' This is how. Not by staying in the loop on every command — by defining the guardrails in code and having them fire automatically."

**Point to the Stop hook:**
> "There's also a hook that fires when the session ends. It prompts Claude to write down what it decided — what patterns it applied, what corrections it made. That goes into session memory. Next session, Claude knows what was learned."

**The point to land:**
> "Hooks are how you make autonomous AI operation trustworthy. You're not watching every command. You're defining the rules, and they enforce themselves."

---

## Part 7: MCP — Claude Connected to Your Real Systems (8 min)

The release manager agent should be active by now. Watch it call the nexus-platform MCP tool.

**Say:**
> "The release manager just called `create_deployment` — and it registered this deployment in our platform tracker. It didn't just write a text note. It made an API call to our internal system."

Open `mcp-servers/nexus-platform/src/index.ts`:
> "This is an MCP server — a custom server that we built that connects Claude to our internal platform. We defined 9 tools: list services, check service health, create deployments, rollback, manage incidents, toggle feature flags."

Scroll to the tool definitions:
> "Each tool has a name, a description Claude reads to decide when to use it, and a handler function. When Claude calls `list_services`, it gets real service health data. When it calls `create_incident`, it creates an actual record in our incident tracker."

**Now show a live MCP call. Ask Claude:**
```
What's the current status of all services?
```

Watch it call `mcp__nexus-platform__list_services` and return real data:
> "It queried the MCP server. It got back real service health data — including that notification-service is showing as degraded in production right now. Not a generic answer. Grounded in actual system state."

**Open `mcp-servers/README.md`:**
> "This pattern works for any internal system. Your Jira — connect it and Claude can create tickets, update status. Your monitoring — connect it and Claude sees real error rates before making recommendations. Your CI/CD — connect it and Claude can check build status, trigger pipelines. Your documentation — Claude can read and update your Confluence.

> This is the line between 'Claude as a text editor' and 'Claude as a system-connected engineer.' It knows what's actually happening, not just what you tell it in the prompt."

---

## Part 8: Plugins — Packaging Knowledge for Teams (5 min)

**Say:**
> "Let me show you what this looks like from an organisational sharing perspective."

Open `plugins/payments-platform/plugin.json`:
> "This is a plugin. It packages together the PCI-DSS rules, the payments risk review skill, and the security reviewer agent — as a single installable unit. Any team that handles payment data runs one command and gets the full compliance capability."

Open `plugins/payments-platform/PLUGIN.md`:
> "The intent is: your payments security team defines and maintains this plugin. They write the PCI-DSS rules. They define what a risk review looks like. They package it. Every other team installs it and gets the same compliance checks, automatically, in every Claude session.

> Without plugins: the payments team does PCI compliance correctly. Three other teams handle payment data and do their own ad-hoc reviews. Audit findings differ. You have a compliance gap.

> With plugins: one team maintains the compliance pack. Every team installs it. Consistent, auditable, automatic."

**The point to land:**
> "Plugins are how accumulated knowledge compounds across the organisation instead of siloing. The work your best engineers do to encode standards into Claude becomes an asset that every team benefits from."

---

## Part 9: The Full Workflow — What Was Produced (5 min)

By now the session should be mostly complete. Do a quick tour of everything that was generated:

```bash
# Show all the output
ls docs/adrs/          # ADR written by architect
ls docs/diagrams/      # Sequence diagram
ls docs/delivery-plans/ # Delivery plan from planner
ls docs/releases/      # Release notes from release manager
```

Open each file briefly:

**The ADR:**
> "Architectural decision, properly documented. This would normally either not get written, or take 30-45 minutes."

**The sequence diagram:**
> "Mermaid diagram showing the new retry flow. Renders in GitHub automatically."

**The delivery plan:**
> "Requirements decomposed into service ownership, acceptance criteria, agent execution order, risks, out of scope. Written by the planner before a line of code was touched."

**The release notes:**
> "Service versions, DB migration plan, rollout strategy (5% → 25% → 100%), rollback steps. Complete. Our QA lead can read this."

**Then show the code:**
> "And here's the actual implementation in notification-service — with ULID IDs, structured logging, exponential backoff, DLQ integration. Following every convention in our memory files."

**The point to land:**
> "One feature request. No extra instructions about our conventions. Everything documented. Everything tested. Security reviewed. Release-ready. That's the workflow."

---

## Part 10: The "So What" for the Organisation (5 min)

This is the closer. Put the code away and speak directly to the audience.

**For developers in the room:**
> "You stop being the human who knows where all the bodies are buried — the person everyone asks 'how do we do an ADR again?' or 'what's the Pact pattern?' That knowledge lives in the repo now. You spend your time on decisions, not documentation."

**For tech leads / architects:**
> "Your architecture decisions don't erode. You write a principle in CLAUDE.md once, and every developer in every session works within it. Code reviews catch fewer convention violations because Claude enforced the conventions first."

**For engineering managers:**
> "Onboarding a new developer — Claude works within your team's standards from day one, not after 3 months of code reviews. And AI adoption doesn't stall at 'it's fast for simple things' because now it produces consistent, standard-compliant output on complex work too."

**For the compliance/security people:**
> "The PCI-DSS rules your security team approves are encoded in the payments plugin. Claude enforces them in every session. There's no gap between 'what the policy says' and 'what Claude does.' The compliance evidence — the risk review reports — get generated automatically."

---

## Q&A Prep — Questions They'll Ask

**"Does this mean Claude is writing production code automatically?"**
> No. Claude produces code that goes through your normal PR review process. The difference is the code it produces follows your standards, so reviewers spend time on logic, not convention violations.

**"What if Claude gets something wrong?"**
> The same as if a developer gets something wrong — PR review catches it. The goal isn't perfection, it's raising the floor. Claude following your ULID rule 100% of the time is better than developers following it 80% of the time.

**"How long did it take to build all this?"**
> This reference project took one focused session. For your actual project, writing CLAUDE.md takes 2-3 hours. Adding skills takes 30 min each. Hooks take an afternoon. You don't build all of it at once.

**"What's the starting point for us?"**
> Write your CLAUDE.md this week. Put in your 3-5 most commonly violated conventions, your service ownership, and your release rules. That single file gives you 50% of the value. Watch what happens in the next sprint.

**"Is this only for Claude Code or does it work with other AI tools?"**
> This specific structure (CLAUDE.md, .claude/, skills, hooks, agents, MCP) is Claude Code specific. But the concept — encoding your team's knowledge into persistent, structured files — applies to any AI coding tool. Claude Code just has the richest support for it.

**"Who maintains this?"**
> Treat it like code. Your CLAUDE.md lives in the repo, gets reviewed in PRs, gets updated when architecture decisions change. Skills get updated when your process evolves. The team owns it collectively, with a tech lead taking the first pass.

---

## Closing Line

End with this:

> "The question isn't whether your team will use AI — you already do. The question is whether you're using it in a way that compounds over time or degrades over time.

> Without structure: every session starts from zero, every developer gets different results, AI adoption stalls.

> With structure: your conventions are enforced automatically, your specialists do their jobs, your guardrails fire without supervision, your knowledge accumulates. AI gets more useful the longer you use it, not less.

> The repo is at `adct/`. The place to start is writing your CLAUDE.md. I'd suggest doing that together as a team this sprint."

---

## Appendix: If the Demo Breaks

If Claude does something unexpected during the demo, use it:

> "This is actually a great example — Claude did X when we expected Y. Let's look at why. [Check CLAUDE.md / rules / hook output.] This is how you debug it: the memory files are the source of truth for Claude's behaviour. If it's not doing what we want, we update the file."

If the MCP server isn't running:
> "The MCP server needs to be built first with `npm run build` — skip the service status demo and come back to it. The pattern is more important than the live call."

If time runs short, cut in this order:
1. Skip Part 8 (plugins) — least time-sensitive
2. Shorten Part 7 (MCP) to 3 min — just show `list_services` call
3. Keep Parts 2, 4, 5, 6 — these are the core
