#!/usr/bin/env bash
# Hook: post-test-fail.sh
#
# [CAPABILITY: HOOKS — PostToolUse:Bash]
# This hook fires AFTER every Bash tool call.
# It checks if the command looks like a test runner that failed.
# If so, it summarizes the failure for Claude to address.
#
# PURPOSE: When tests fail, give Claude structured failure info immediately
# rather than requiring it to re-run and parse the output itself.
# This speeds up the debug loop significantly.
#
# INPUT FORMAT:
#   { "tool_name": "Bash", "tool_input": { "command": "..." }, "tool_result": { "exit_code": 1, "stdout": "...", "stderr": "..." } }

set -uo pipefail

INPUT=$(cat)
EXIT_CODE=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_result',{}).get('exit_code', 0))" 2>/dev/null || echo "0")
COMMAND=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('command',''))" 2>/dev/null || echo "")
STDOUT=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_result',{}).get('stdout','')[:2000])" 2>/dev/null || echo "")

# Only proceed if the command failed (non-zero exit)
if [[ "$EXIT_CODE" == "0" ]]; then
  exit 0
fi

# Only proceed if the command looks like a test run
IS_TEST_COMMAND=false
if echo "$COMMAND" | grep -qE 'npm\s+test|npm\s+run\s+test|jest|vitest|pytest|pnpm\s+test|yarn\s+test'; then
  IS_TEST_COMMAND=true
fi

if [[ "$IS_TEST_COMMAND" == "false" ]]; then
  exit 0
fi

echo ""
echo "🔴 TEST FAILURE DETECTED (post-test-fail hook)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Command: $COMMAND"
echo "Exit code: $EXIT_CODE"
echo ""

# Parse failure summary based on test runner type
if echo "$COMMAND" | grep -qE 'pytest'; then
  echo "📋 PYTEST FAILURE SUMMARY:"
  # Extract FAILED lines
  echo "$STDOUT" | grep -E "^FAILED|^ERROR|AssertionError|assert " | head -20
  echo ""
  echo "💡 Suggestion: Check the test state handlers in conftest.py and verify"
  echo "   the test fixtures match the current DB schema."

elif echo "$COMMAND" | grep -qE 'jest|vitest'; then
  echo "📋 JEST/VITEST FAILURE SUMMARY:"
  echo "$STDOUT" | grep -E "● |✕|FAIL |Expected|Received" | head -20
  echo ""
  echo "💡 Suggestion: Check if the mock/stub matches the current interface."
  echo "   Contract tests failing may indicate a schema drift."

else
  echo "📋 TEST FAILURE OUTPUT (first 20 lines):"
  echo "$STDOUT" | head -20
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "ℹ️  This hook has summarized the failure. Claude should now diagnose"
echo "   and fix the failing test(s) before proceeding."

# Exit 0 — this is an informational hook, not a blocking hook
exit 0
