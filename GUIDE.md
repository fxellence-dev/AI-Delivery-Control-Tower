# Why This Project Exists — A Guide for Teams

> Read this before anything else. It answers the "so what?" question.

---

## The Problem with AI Adoption in Engineering Teams

Most teams that adopt Claude (or any AI coding tool) go through the same arc:

**Week 1**: "This is amazing — it writes code so fast!"

**Week 4**: "It keeps doing things our way wrong. It uses UUID when we use ULID. It throws exceptions instead of using our Result types. It forgot we're not allowed to deploy on Fridays."

**Week 8**: "We have to re-explain our conventions every session. It's faster for simple stuff but adds friction for anything complex. Every developer gets different output because Claude doesn't know our team's standards."

**Week 12**: "AI adoption has stalled. People use it for small things but don't trust it for real work."

**This is the problem this project solves.**

The root cause isn't Claude's capability. It's that **Claude has no persistent understanding of your team** — your architecture rules, your coding conventions, your deployment policies, your compliance requirements. Without that, every session starts from zero and every developer gets inconsistent results.

---

## What This Project Demonstrates

This project shows how to give Claude **a persistent, structured understanding of your engineering organisation** — so it behaves like a staff engineer who actually knows your codebase, not a contractor who needs to be briefed from scratch each time.

It does this through seven specific mechanisms that Claude Code supports. Each one exists to solve a real problem:

---

### 1. Memory — "Claude knows your team's rules"

**The problem without it**: You tell Claude "we use ULID not UUID" in Monday's session. Wednesday, a different engineer asks Claude to add a new entity and gets UUID. Friday, a code review fails because the PR has UUID. Claude never learned.

**What this project does**: Creates `CLAUDE.md` and `.claude/rules/` files that Claude reads at the start of every session and before editing any file. It knows your conventions without being told.

**What's in the demo**: 
- `CLAUDE.md` contains architecture principles, service ownership, release rules, known integration quirks
- `.claude/rules/typescript.md` has the ULID rule — Claude applies it on first attempt, every time
- `.claude/rules/payments.md` has PCI-DSS hard rules — Claude never logs a card number because it's told not to, permanently

**The business value**: Your team's standards are applied consistently, by everyone, on every session. New joiners get Claude acting within your standards from day one. No re-briefing, no drift.

---

### 2. Skills — "Claude knows how to do your repeatable work correctly"

**The problem without it**: Writing an Architecture Decision Record takes 45 minutes because the engineer has to explain the format, the sections, the conventions. The next ADR by a different engineer looks completely different. Contract tests are skipped because "it's complicated to explain to Claude how we do Pact."

**What this project does**: Creates `.claude/skills/` files — reusable instruction sets for specialist tasks. Each skill defines exactly what to produce and in what format.

**What's in the demo**:
- `/write-adr` → produces a correctly structured ADR in your ADR directory, every time
- `/payments-risk-review` → runs through all 8 PCI-DSS sections, produces a report your QSA can read
- `/create-contract-tests` → writes both the consumer Pact test and the provider verification
- `/prepare-release-notes` → produces a release document with rollback plan, canary percentages, deployment checklist

**The business value**: High-quality specialist outputs in seconds instead of minutes. Every engineer produces the same standard output regardless of their personal familiarity with the task. Your QSA gets consistent, machine-generated compliance evidence.

---

### 3. Hooks — "Claude operates safely without supervision"

**The problem without it**: You want to use Claude autonomously — let it run a deployment, fix a failing test, clean up old files — but you're worried it might do something destructive. So you stay in the loop for everything, which defeats the purpose.

**What this project does**: Creates shell scripts in `.claude/hooks/` that fire automatically on Claude Code lifecycle events — before it runs a command, after it edits a file, when the session ends.

**What's in the demo**:
- `pre-tool-use-bash.sh`: Blocks `rm -rf`, `kubectl delete` on production, `DROP TABLE` — fires before every bash command, even in autonomous mode
- `post-tool-use-edit.sh`: Runs `eslint` / `ruff` after every file Claude edits — keeps code quality without manual intervention
- `post-test-fail.sh`: When tests fail, extracts the structured failure info and gives it back to Claude so it can fix it in the same turn
- `stop-save-memory.sh`: When a session ends, prompts Claude to write down what it learned — captures knowledge automatically

**The business value**: You can run Claude autonomously without safety anxiety. Guardrails fire automatically. Code quality tools run without being asked. Knowledge is captured without forgetting. Your team can trust Claude to operate in longer loops without supervision.

---

### 4. Agents — "Claude can do the work of a whole team of specialists"

**The problem without it**: You ask Claude to "implement this feature." It does everything — requirement analysis, architecture decisions, implementation, testing, security review — in one undifferentiated block. Each area gets shallow treatment because it's all done by the same general prompt with no specialist expertise.

**What this project does**: Creates `.claude/agents/` files — custom subagents with specialist identities, process instructions, and restricted tool access. The main Claude orchestrates them.

**What's in the demo**:
- `planner` agent: Only decomposes requirements and creates delivery plans. Never writes code.
- `architect` agent: Only reviews architecture, writes ADRs, identifies contract changes. Never touches implementation.
- `backend-engineer` agent: Only implements code, following the conventions from memory. Never makes architecture decisions.
- `test-engineer` agent: Only writes tests. Invokes the contract test skill automatically.
- `security-reviewer` agent: Only does security review. Invokes PCI-DSS review for any payment code.
- `release-manager` agent: Only produces release artifacts. Checks the no-Friday-deploy rule.

**The business value**: Each specialist produces deeper, higher-quality output than a generalist. The planner creates a proper delivery plan instead of jumping to code. The security reviewer actually checks every OWASP category. The release manager writes a real rollback plan, not a placeholder. This mirrors how your best human teams work — specialists who hand off to each other.

---

### 5. MCP — "Claude is connected to your actual systems"

**The problem without it**: Claude operates on files only. It can't see whether the service is currently healthy, whether an incident is open, whether the last deploy succeeded, what the runbook says for this scenario. It gives generic answers that don't reflect your actual system state.

**What this project does**: Builds a custom MCP server (`mcp-servers/nexus-platform/`) that connects Claude to your internal platform APIs. Claude can query live service status, create incident records, register deployments, and read runbooks — using your real systems.

**What's in the demo**:
- `list_services` → Claude sees real service health, versions, error rates before making recommendations
- `create_incident` → During incident response, Claude creates the actual incident record immediately
- `create_deployment` → Release manager registers every deployment in the tracker
- `nexus://runbooks/*` → Claude reads the actual runbook for a service before recommending triage steps

**The educational value**: The `nexus-platform/src/index.ts` file shows every developer exactly how to build their own MCP server — connecting Claude to your Jira, your monitoring, your CI/CD, your internal tools. This is the pattern that turns Claude from a file editor into a system-connected engineer.

**The business value**: Claude's recommendations are grounded in real system state, not generic advice. When it says "the notification-service is degraded in prod," it actually checked. When it says "rollback to v1.4.2," it knows that version was deployed successfully. This is the difference between useful and trustworthy.

---

### 6. Plugins — "Your team's capabilities can be packaged and shared"

**The problem without it**: One team spends two weeks building great skills and rules for their payment compliance work. Another team starts from scratch. A new service is created — it gets none of the accumulated knowledge. There's no way to share Claude's capabilities across teams.

**What this project does**: Creates installable plugin packs in `plugins/` — each containing a set of skills, agents, and rules that belong together.

**What's in the demo**:
- `payments-platform` plugin: Installs the PCI-DSS rules + payments risk review skill + security reviewer agent in one command. Any repo that handles payment data gets the full compliance pack instantly.
- `engineering-governance` plugin: Installs ADR writing, contract tests, OpenAPI review, architect agent. Any service repo gets governance capabilities in one step.

**The business value**: Your accumulated Claude knowledge becomes a shareable, versioned, installable asset. The payments team's compliance work benefits every new service. A new joiner gets the full organisational Claude setup by cloning the repo. Knowledge compounds instead of siloing.

---

### 7. Agent SDK — "Claude can be built into your products and workflows"

**The problem without it**: All of this is great in a terminal, but it's invisible to the rest of the organisation. Your CTO, your PM, your QA lead — they can't see what Claude is doing. It's a developer tool, not a platform.

**What this project does**: Shows how to use the Anthropic Agent SDK (in `orchestrator/`) to build a programmatic workflow runner with a web dashboard (`dashboard/`) — so Claude's work is visible, auditable, and accessible to everyone.

**What's in the demo** (Phase 3):
- Submit a feature requirement via the web UI
- Watch the agent chain execute in real time — planner → architect → backend → tester → security → release
- Approve or reject agent steps with a human gate
- See all produced artifacts (ADR, PR, release notes) in one place
- Full audit log of what Claude did and why

**The business value**: Claude becomes organisational infrastructure, not a developer secret. Leadership can see AI-assisted delivery in action. Non-developers can submit requests and see results. The organisation can measure and improve its AI-assisted delivery process.

---

## How to Demo This to Your Team

### The 5-minute version

Open Claude Code in the `adct/` directory. Say:

> "Add webhook retry logic to the notification service with exponential backoff and dead-letter queue support"

Then narrate what they see:

1. **"Notice it didn't ask what our conventions are"** → It read `CLAUDE.md` and `.claude/rules/python.md` before starting. It already knows we use ULID, structlog, Pydantic v2, and max 5 retries.

2. **"Notice it's using specialist agents"** → Watch planner → architect → backend engineer hand off to each other. Each one does its job and no more.

3. **"Notice it just invoked a skill"** → The architect invoked `/write-adr` automatically. An ADR file appeared in `docs/adrs/` with the correct template.

4. **"Notice ruff just ran"** → After editing a Python file, the post-edit hook ran automatically. Claude saw the lint output and fixed the issue without being asked.

5. **"Notice the MCP call"** → The release manager called `nexus-platform.create_deployment`. It registered the deploy in our system.

6. **End of session** → Stop hook fires. Claude writes the session learnings to `.claude/memory/session-log.md`. Next session knows what was decided.

---

### The questions your team will ask

**"Do we have to use all of this?"**

No. Start with just `CLAUDE.md`. That single file gives you 50% of the value — Claude knows your team's standards from session one. Add skills, hooks, and agents as you feel the pain they solve.

**"Won't this take weeks to set up?"**

The `CLAUDE.md` for your project takes 2-3 hours to write. Copy the format from this project's `CLAUDE.md`. The most important sections: coding conventions, service ownership, and release rules. You'll see ROI on day one.

**"How is this different from just putting rules in the prompt?"**

Three differences:
1. **Persistence**: You write it once, it applies forever — not per-conversation
2. **Specificity**: Rules in `.claude/rules/typescript.md` only apply when editing TypeScript files — not injected into every conversation
3. **Agent-readable**: Subagents load the memory specific to their domain automatically — the architect reads the K8s rules, not the payment rules

**"What's the ROI?"**

Concrete examples from this structure:
- A payment feature that needs a security review: without this, the review is inconsistent or skipped. With this, it runs automatically every time, produces a structured report, and stores evidence for audits.
- A new engineer joining the team: without this, they produce non-standard code for weeks while learning conventions. With this, Claude enforces standards from commit one.
- An incident at 2am: without this, the on-call engineer gets generic triage advice. With this, Claude reads the runbook, checks service status, creates the incident record, and runs k8s-triage — in the first 2 minutes.

**"Does this replace engineers?"**

No. It replaces the repetitive, forgettable, documentation-heavy parts of engineering work — writing ADRs, preparing release notes, running compliance checklists, writing boilerplate tests. Engineers focus on decisions, not documentation.

---

## The Adoption Path

You don't implement all of this at once. Here's the order that makes sense:

### Week 1-2: Memory only
Write your `CLAUDE.md`. Include:
- Architecture principles (3-5 key ones that Claude keeps getting wrong)
- Coding conventions (the things that come up in code review repeatedly)
- Service ownership (who owns what)
- Release rules (the ones that get violated most often)

**Signal it's working**: Stop having to remind Claude about your conventions in every session.

### Week 3-4: 2-3 skills
Pick the tasks your team does repeatedly that have a standard format. For most teams: write-adr, prepare-release-notes, and one domain-specific review skill.

**Signal it's working**: Engineers stop writing ADR templates from scratch.

### Week 5-6: Hooks
Add the pre-bash safety hook and the post-edit lint hook. These are the highest leverage hooks and take 30 minutes to write.

**Signal it's working**: Lint runs automatically. No accidental destructive commands.

### Week 7-8: 2-3 agents
Add the planner and security-reviewer agents. These are the highest-leverage starting agents.

**Signal it's working**: Claude decomposes requirements properly before writing code. Security review actually happens.

### Month 2-3: MCP + plugins
Connect Claude to your actual internal systems. Package your domain knowledge as an installable plugin.

**Signal it's working**: Claude's recommendations reference real system state. Teams share capabilities instead of rebuilding them.

### Month 3+: Agent SDK
If you want to make this accessible beyond the terminal — dashboards, approval workflows, visibility for leadership.

---

## The Organisational Shift This Enables

When you have this structure in place, something changes about how AI adoption works in your organisation:

**Before**: AI adoption is individual and inconsistent. Each developer has their own mental model of how to work with Claude. Some get great results, most get mediocre results. Knowledge doesn't accumulate.

**After**: AI adoption is organisational and consistent. Your conventions are encoded. Your specialists are defined. Your safety rules are enforced. Every session — by every developer, in every context — operates within the same standards.

**The compounding effect**: Every time a developer uses Claude on your codebase, the session memory captures what was learned. Over time, Claude's effective knowledge of your system grows. The team that invests in this structure gets faster and more capable over time, while teams that don't stay at "fast for simple stuff, unreliable for complex work."

**The governance effect**: Because the structure is in code (`.claude/`, `CLAUDE.md`), it's reviewable, versioned, and auditable. The PCI-DSS rules your security team approves are the same rules Claude enforces. There's no gap between "what the policy says" and "what Claude does."

---

## What This Project Is Not

This is not a complete product you deploy to production. It's a **reference architecture** — a concrete, working example of how to structure your own team's Claude Code setup.

Take what applies to you:
- The `CLAUDE.md` structure → adapt for your project
- The skill files → copy the ones relevant to your domain, replace the content
- The hook scripts → use as-is or adapt
- The agent definitions → copy the pattern, change the domain
- The MCP server → the educational model for building your own

The `sample-services/` code and the "Nexus Platform" framing are fiction. The patterns are real.

---

## Starting Now

1. `cd adct/ && bash demo-runner.sh` — see what was built
2. Read `capability-matrix.md` — understand what each file demonstrates
3. Run Demo 1 (`bash demo-scenarios/01-feature-delivery/run.sh`) — watch the full capability chain
4. After the demo, start writing your own `CLAUDE.md` using this one as a template

The single most valuable thing you can do this week is write a `CLAUDE.md` for your real project. Everything else builds on that.
