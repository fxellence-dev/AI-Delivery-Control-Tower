#!/usr/bin/env bash
# Demo 1: Feature Delivery — run script
#
# This script sets up the environment for Demo 1 and shows you the key files
# to reference while running the demo interactively in Claude Code.

set -euo pipefail

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${CYAN}  Demo 1: Feature Delivery — Webhook Retry Logic${RESET}"
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# Step 1: Build the custom MCP server
echo -e "${BOLD}Step 1: Building nexus-platform MCP server...${RESET}"
if command -v node &>/dev/null; then
  (cd mcp-servers/nexus-platform && npm install --silent && npm run build 2>&1 | tail -5)
  echo -e "${GREEN}✅ MCP server built${RESET}"
else
  echo -e "${YELLOW}⚠️  Node.js not found — MCP server not built. Install Node.js 20+ to run the MCP server.${RESET}"
fi

echo ""

# Step 2: Show what's loaded into Claude's context for this demo
echo -e "${BOLD}Step 2: Claude Code will load these files automatically:${RESET}"
echo ""
echo -e "  ${CYAN}[MEMORY]${RESET} CLAUDE.md"
echo "    → Max 5 retries, nexus-dlq name, S3 pointer for >10KB payloads"
echo ""
echo -e "  ${CYAN}[MEMORY]${RESET} .claude/rules/python.md"
echo "    → structlog, Pydantic v2, python-ulid, mypy --strict"
echo ""
echo -e "  ${CYAN}[AGENTS]${RESET} .claude/agents/ (6 agents)"
echo "    → planner, architect, backend-engineer, test-engineer, security-reviewer, release-manager"
echo ""
echo -e "  ${CYAN}[SKILLS]${RESET} .claude/skills/ (10 skills)"
echo "    → write-adr, design-sequence-diagram, create-contract-tests, prepare-release-notes, ..."
echo ""
echo -e "  ${CYAN}[HOOKS]${RESET} .claude/hooks/ (4 hooks)"
echo "    → pre-tool-use-bash (blocks rm -rf), post-tool-use-edit (runs ruff), post-test-fail, stop"
echo ""
echo -e "  ${CYAN}[MCP]${RESET} nexus-platform MCP server"
echo "    → list_services, create_deployment, create_incident tools available"
echo ""

# Step 3: Show the target code
echo -e "${BOLD}Step 3: Target code for this demo:${RESET}"
echo ""
echo "  sample-services/notification-service/notification_service/services/delivery_service.py"
echo "  └─ attempt_delivery() has TODO comments for retry logic"
echo "  └─ calculate_backoff() exists but is not wired in"
echo ""
echo "  This is what agents will implement and test."
echo ""

# Step 4: The requirement to paste
echo -e "${BOLD}${GREEN}Step 4: Paste this requirement into Claude Code:${RESET}"
echo ""
echo "  cat demo-scenarios/01-feature-delivery/input.md"
echo ""
cat demo-scenarios/01-feature-delivery/input.md | grep -A 20 '## The Requirement' | head -25
echo ""

# Step 5: What to watch for
echo -e "${BOLD}Step 5: Watch for these capability moments:${RESET}"
echo ""
echo "  🧠 MEMORY: Claude applies max_retries=5 from CLAUDE.md without being told"
echo "  🧠 MEMORY: Claude uses ULID (not UUID) from .claude/rules/python.md"
echo "  🔧 SKILL:  /write-adr invoked by architect agent → ADR file appears in docs/adrs/"
echo "  🔧 SKILL:  /design-sequence-diagram invoked → Mermaid diagram in docs/diagrams/"
echo "  🔧 SKILL:  /create-contract-tests invoked → Pact test files created"
echo "  🪝 HOOK:   ruff runs after every Python file edit (watch terminal output)"
echo "  🤖 AGENT:  Each agent introduces itself before working"
echo "  🔌 MCP:    nexus-platform.create_deployment called by release-manager"
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "  Open Claude Code in this directory and paste the requirement."
echo -e "  See demo-scenarios/01-feature-delivery/input.md for the full text."
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""
