#!/usr/bin/env bash
# Demo 2: Incident Response — run script

set -euo pipefail

BOLD='\033[1m'
CYAN='\033[0;36m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${RED}  Demo 2: Incident Response — P1 Payment Failures${RESET}"
echo -e "${BOLD}${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

echo -e "${BOLD}What this demo shows:${RESET}"
echo "  • Planner agent reads CLAUDE.md incident protocol and executes it"
echo "  • k8s-triage skill produces structured triage output"
echo "  • nexus-platform MCP creates, updates, and resolves an incident"
echo "  • stop-save-memory hook fires at end → postmortem + memory capture"
echo "  • build-postmortem skill produces a blameless postmortem document"
echo ""

echo -e "${BOLD}Context set for this demo:${RESET}"
echo "  • notification-service shows 'degraded' status in nexus-platform MCP"
echo "  • (get_service_status returns degraded state — see mcp-servers/nexus-platform/src/tools/services.ts)"
echo ""

echo -e "${BOLD}${RED}Paste this into Claude Code:${RESET}"
echo ""
cat demo-scenarios/02-incident-response/input.md | grep -A 15 '## The Incident' | head -18
echo ""

echo -e "${BOLD}Watch for:${RESET}"
echo "  🚨 MCP: create_incident called immediately"
echo "  🔧 SKILL: k8s-triage invoked by planner"
echo "  🧠 MEMORY: CLAUDE.md 'nexus-dlq must be drained manually' applied"
echo "  🔧 SKILL: build-postmortem invoked by stop hook"
echo "  🪝 HOOK: stop-save-memory.sh fires → session log updated"
echo ""
echo -e "${BOLD}${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
