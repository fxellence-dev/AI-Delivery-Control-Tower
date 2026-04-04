#!/usr/bin/env bash
# Demo 3: Security Audit — run script

set -euo pipefail

BOLD='\033[1m'
YELLOW='\033[1;33m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BOLD}${YELLOW}  Demo 3: Security Audit — PCI-DSS Compliance Review${RESET}"
echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

echo -e "${BOLD}Plugin required for this demo:${RESET}"
echo "  The payments-platform plugin must be installed."
echo "  It provides: payments.md rule + payments-risk-review skill + security-reviewer agent"
echo ""
echo "  To install (copy files to .claude/):"
echo "  cp plugins/payments-platform/skills/* .claude/skills/"
echo "  cp plugins/payments-platform/agents/* .claude/agents/"
echo "  cp plugins/payments-platform/rules/* .claude/rules/"
echo ""
echo -e "${BOLD}This demo showcases PLUGINS:${RESET}"
echo "  One install adds: 2 skills + 1 agent + 1 rule file"
echo "  Without the plugin, the security review would have less context"
echo "  With the plugin, Claude knows PCI-DSS rules before reading a line of code"
echo ""

echo -e "${BOLD}${YELLOW}Paste this into Claude Code:${RESET}"
echo ""
cat demo-scenarios/03-security-audit/input.md | grep -A 15 '## The Audit Request' | head -18
echo ""

echo -e "${BOLD}Watch for:${RESET}"
echo "  🔌 PLUGIN: .claude/rules/payments.md loaded → Claude knows PCI rules before reading code"
echo "  🔧 SKILL: payments-risk-review works through full 8-section checklist"
echo "  🤖 AGENT: security-reviewer from plugin auto-invokes payments-risk-review"
echo "  🧠 MEMORY: Claude refuses to log card numbers (rule from plugin's payments.md)"
echo ""
echo -e "${BOLD}${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
