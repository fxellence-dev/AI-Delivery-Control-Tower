#!/usr/bin/env bash
# demo-runner.sh — AI Delivery Control Tower
#
# One-shot setup script. Run this first to verify your environment,
# build the MCP server, and see what's loaded in each demo.
#
# Usage:
#   bash demo-runner.sh          # Full setup + Demo 1 orientation
#   bash demo-runner.sh demo2    # Demo 2 orientation
#   bash demo-runner.sh demo3    # Demo 3 orientation
#   bash demo-runner.sh check    # Just check the environment

set -uo pipefail

BOLD='\033[1m'
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
DIM='\033[2m'
RESET='\033[0m'

DEMO=${1:-demo1}

print_header() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo -e "${BOLD}${CYAN}  AI Delivery Control Tower — Claude Code Reference Project${RESET}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
  echo ""
}

check_env() {
  echo -e "${BOLD}Environment Check:${RESET}"
  echo ""

  local ok=true

  # Node.js
  if command -v node &>/dev/null; then
    NODE_VER=$(node --version)
    echo -e "  ${GREEN}✅${RESET} Node.js $NODE_VER"
  else
    echo -e "  ${RED}❌${RESET} Node.js not found (required for MCP server + TS services)"
    echo -e "     Install: https://nodejs.org (v20+)"
    ok=false
  fi

  # Python
  if command -v python3 &>/dev/null; then
    PY_VER=$(python3 --version)
    echo -e "  ${GREEN}✅${RESET} $PY_VER"
  else
    echo -e "  ${RED}❌${RESET} Python 3 not found (required for notification-service)"
    ok=false
  fi

  # uv
  if command -v uv &>/dev/null; then
    echo -e "  ${GREEN}✅${RESET} uv $(uv --version)"
  else
    echo -e "  ${YELLOW}⚠️${RESET}  uv not found (optional but recommended for Python)"
    echo -e "     Install: curl -LsSf https://astral.sh/uv/install.sh | sh"
  fi

  # ruff
  if command -v ruff &>/dev/null; then
    echo -e "  ${GREEN}✅${RESET} ruff $(ruff --version)"
  else
    echo -e "  ${YELLOW}⚠️${RESET}  ruff not found (post-edit hook uses ruff for Python lint)"
    echo -e "     Install: pip install ruff"
  fi

  # Claude Code
  if command -v claude &>/dev/null; then
    echo -e "  ${GREEN}✅${RESET} Claude Code $(claude --version 2>/dev/null | head -1 || echo 'installed')"
  else
    echo -e "  ${RED}❌${RESET} Claude Code CLI not found"
    echo -e "     Install: npm install -g @anthropic-ai/claude-code"
    ok=false
  fi

  echo ""

  if [[ "$ok" == "false" ]]; then
    echo -e "${YELLOW}Some prerequisites are missing. Install them before running the demos.${RESET}"
  else
    echo -e "${GREEN}All prerequisites found.${RESET}"
  fi
  echo ""
}

build_mcp_server() {
  echo -e "${BOLD}Building nexus-platform MCP server...${RESET}"
  if command -v node &>/dev/null && command -v npm &>/dev/null; then
    (cd mcp-servers/nexus-platform && npm install --silent 2>&1 && npm run build 2>&1 | tail -3)
    echo -e "${GREEN}✅ MCP server built: mcp-servers/nexus-platform/dist/index.js${RESET}"
  else
    echo -e "${YELLOW}⚠️  Skipping MCP server build (Node.js not found)${RESET}"
  fi
  echo ""
}

show_file_tree() {
  echo -e "${BOLD}Project Structure (Claude Code capability files):${RESET}"
  echo ""
  echo -e "  adct/"
  echo -e "  ${CYAN}├── CLAUDE.md${RESET}                ${DIM}← [MEMORY] Architecture rules, always loaded${RESET}"
  echo -e "  ${CYAN}├── .claude/${RESET}"
  echo -e "  ${CYAN}│   ├── settings.json${RESET}         ${DIM}← [HOOKS + MCP] Hook bindings + MCP config${RESET}"
  echo -e "  ${CYAN}│   ├── rules/${RESET}                ${DIM}← [MEMORY] File-type-specific rules${RESET}"
  echo -e "  │   │   ├── typescript.md       ${DIM}← ULID, Result types, no any${RESET}"
  echo -e "  │   │   ├── python.md           ${DIM}← structlog, Pydantic v2, mypy${RESET}"
  echo -e "  │   │   ├── kubernetes.md       ${DIM}← resource limits, no prod deletes${RESET}"
  echo -e "  │   │   └── payments.md         ${DIM}← PCI-DSS hard rules${RESET}"
  echo -e "  ${CYAN}│   ├── skills/${RESET}               ${DIM}← [SKILLS] 10 specialist skills${RESET}"
  echo -e "  │   │   ├── write-adr.md"
  echo -e "  │   │   ├── payments-risk-review.md"
  echo -e "  │   │   ├── build-postmortem.md"
  echo -e "  │   │   └── ... (7 more)"
  echo -e "  ${CYAN}│   ├── agents/${RESET}               ${DIM}← [AGENTS] 6 custom subagents${RESET}"
  echo -e "  │   │   ├── planner.md"
  echo -e "  │   │   ├── architect.md"
  echo -e "  │   │   └── ... (4 more)"
  echo -e "  ${CYAN}│   └── hooks/${RESET}                ${DIM}← [HOOKS] 4 lifecycle hooks${RESET}"
  echo -e "  │       ├── pre-tool-use-bash.sh    ${DIM}← blocks rm -rf, prod kubectl delete${RESET}"
  echo -e "  │       ├── post-tool-use-edit.sh   ${DIM}← auto-lint after file edits${RESET}"
  echo -e "  │       ├── post-test-fail.sh        ${DIM}← surfaces test failure info${RESET}"
  echo -e "  │       └── stop-save-memory.sh      ${DIM}← captures session learnings${RESET}"
  echo -e "  ${CYAN}├── mcp-servers/nexus-platform/${RESET} ${DIM}← [MCP] Custom MCP server (built here)${RESET}"
  echo -e "  ${CYAN}├── plugins/${RESET}                  ${DIM}← [PLUGINS] 2 installable plugin packs${RESET}"
  echo -e "  │   ├── engineering-governance/"
  echo -e "  │   └── payments-platform/"
  echo -e "  ├── sample-services/            ${DIM}← Real target codebases for demos${RESET}"
  echo -e "  │   ├── payment-service/        ${DIM}← TypeScript/Express (Demo 1, 3)${RESET}"
  echo -e "  │   ├── user-service/           ${DIM}← TypeScript/Express${RESET}"
  echo -e "  │   └── notification-service/   ${DIM}← Python/FastAPI (Demo 1 primary target)${RESET}"
  echo -e "  ${CYAN}├── orchestrator/${RESET}             ${DIM}← [AGENT SDK] Python backend (Phase 3)${RESET}"
  echo -e "  └── demo-scenarios/"
  echo -e "      ├── 01-feature-delivery/    ${DIM}← Webhook retry (all capabilities)${RESET}"
  echo -e "      ├── 02-incident-response/   ${DIM}← P1 payment incident${RESET}"
  echo -e "      └── 03-security-audit/      ${DIM}← PCI-DSS compliance (plugins)${RESET}"
  echo ""
}

case "$DEMO" in
  check)
    print_header
    check_env
    ;;
  demo2)
    print_header
    check_env
    bash demo-scenarios/02-incident-response/run.sh
    ;;
  demo3)
    print_header
    check_env
    bash demo-scenarios/03-security-audit/run.sh
    ;;
  demo1|*)
    print_header
    check_env
    build_mcp_server
    show_file_tree
    bash demo-scenarios/01-feature-delivery/run.sh
    ;;
esac
