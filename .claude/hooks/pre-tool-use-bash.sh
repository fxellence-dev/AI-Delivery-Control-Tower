#!/usr/bin/env bash
# Hook: pre-tool-use-bash.sh
#
# [CAPABILITY: HOOKS — PreToolUse:Bash]
# This hook fires BEFORE every Bash tool call Claude makes.
# It receives the command as stdin in JSON format:
#   { "tool_name": "Bash", "tool_input": { "command": "..." } }
#
# Exit 0  = allow the command to run
# Exit 1  = block the command (Claude sees the error output)
# Exit 2  = block and provide a custom message to Claude
#
# PURPOSE: Guard rail against destructive operations.
# Claude Code's hooks are the right place for "safety fences" because
# they fire even when Claude is operating autonomously via the Agent SDK.
#
# HOW TO TEST: Run this directly:
#   echo '{"tool_name":"Bash","tool_input":{"command":"rm -rf /"}}' | bash .claude/hooks/pre-tool-use-bash.sh

set -euo pipefail

# Read the hook input from stdin
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")

if [[ -z "$COMMAND" ]]; then
  exit 0  # No command to check, allow
fi

BLOCKED=false
REASON=""

# ─── Rule 1: Block recursive force delete ─────────────────────────────────────
if echo "$COMMAND" | grep -qE 'rm\s+-[a-zA-Z]*r[a-zA-Z]*f|rm\s+-[a-zA-Z]*f[a-zA-Z]*r'; then
  BLOCKED=true
  REASON="Blocked: 'rm -rf' is not allowed. Use targeted file deletion or ask the user to confirm."
fi

# ─── Rule 2: Block kubectl delete on production ───────────────────────────────
if echo "$COMMAND" | grep -qE 'kubectl\s+delete.*nexus-prod'; then
  BLOCKED=true
  REASON="Blocked: 'kubectl delete' in nexus-prod namespace requires explicit Incident Commander approval. Use the nexus-platform MCP tool to request approval first."
fi

# ─── Rule 3: Block DROP TABLE / DROP DATABASE ─────────────────────────────────
if echo "$COMMAND" | grep -iqE 'DROP\s+(TABLE|DATABASE|SCHEMA)'; then
  BLOCKED=true
  REASON="Blocked: Destructive SQL (DROP TABLE/DATABASE) requires explicit confirmation. Show the user the migration script and get approval first."
fi

# ─── Rule 4: Block force push to main/release branches ───────────────────────
if echo "$COMMAND" | grep -qE 'git\s+push.*--force.*\s+(main|master|release/)'; then
  BLOCKED=true
  REASON="Blocked: Force push to protected branches (main, master, release/*) is not allowed."
fi

# ─── Rule 5: Warn on kubectl apply to prod (allow but log) ────────────────────
if echo "$COMMAND" | grep -qE 'kubectl\s+apply.*nexus-prod' && [[ "$BLOCKED" == "false" ]]; then
  echo "⚠️  WARNING: Applying to nexus-prod namespace. Ensure this is intentional and approved." >&2
  # Note: exit 0 to allow, just warn
fi

# ─── Output result ────────────────────────────────────────────────────────────
if [[ "$BLOCKED" == "true" ]]; then
  echo "🚫 HOOK BLOCKED: pre-tool-use-bash.sh"
  echo "$REASON"
  echo ""
  echo "Command was: $COMMAND"
  exit 1
fi

exit 0
