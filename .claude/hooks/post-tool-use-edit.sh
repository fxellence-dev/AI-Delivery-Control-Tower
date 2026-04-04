#!/usr/bin/env bash
# Hook: post-tool-use-edit.sh
#
# [CAPABILITY: HOOKS — PostToolUse:Edit|Write]
# This hook fires AFTER Claude edits or writes a file.
# It receives the tool result as stdin in JSON format:
#   { "tool_name": "Edit", "tool_input": { "file_path": "..." }, "tool_result": { ... } }
#
# PURPOSE: Auto-lint and typecheck edited files immediately after changes.
# This gives Claude immediate feedback without needing to run lint manually.
# Claude sees the output and can fix issues in the same turn.
#
# HOW TO TEST: Run this directly:
#   echo '{"tool_name":"Edit","tool_input":{"file_path":"sample-services/payment-service/src/index.ts"}}' | bash .claude/hooks/post-tool-use-edit.sh

set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('tool_input',{}).get('file_path',''))" 2>/dev/null || echo "")

if [[ -z "$FILE_PATH" || ! -f "$FILE_PATH" ]]; then
  exit 0
fi

EXTENSION="${FILE_PATH##*.}"

echo "🔍 post-tool-use-edit: Checking $FILE_PATH"

case "$EXTENSION" in
  ts|tsx)
    # Run ESLint on the modified TypeScript file
    SERVICE_DIR=$(echo "$FILE_PATH" | grep -oE 'sample-services/[^/]+' || echo "")

    if [[ -n "$SERVICE_DIR" && -f "$SERVICE_DIR/node_modules/.bin/eslint" ]]; then
      echo "  → Running ESLint..."
      if ! "$SERVICE_DIR/node_modules/.bin/eslint" --fix "$FILE_PATH" 2>&1; then
        echo "  ⚠️  ESLint found issues (auto-fixed where possible)"
      else
        echo "  ✅ ESLint: OK"
      fi

      # Run TypeScript type check on the service
      echo "  → Running tsc --noEmit..."
      if ! (cd "$SERVICE_DIR" && npx tsc --noEmit 2>&1 | head -20); then
        echo "  ⚠️  TypeScript errors found — fix before committing"
      else
        echo "  ✅ TypeScript: OK"
      fi
    else
      echo "  ℹ️  No node_modules found for $SERVICE_DIR — skipping lint (run npm install first)"
    fi
    ;;

  py)
    # Run ruff on the modified Python file
    if command -v ruff &>/dev/null; then
      echo "  → Running ruff check --fix..."
      if ! ruff check --fix "$FILE_PATH" 2>&1; then
        echo "  ⚠️  Ruff found issues"
      else
        echo "  ✅ Ruff: OK"
      fi

      echo "  → Running ruff format..."
      ruff format "$FILE_PATH" 2>&1 || true

      # Run mypy if available
      if command -v mypy &>/dev/null; then
        echo "  → Running mypy..."
        if ! mypy --strict "$FILE_PATH" 2>&1 | head -10; then
          echo "  ⚠️  mypy type errors found"
        else
          echo "  ✅ mypy: OK"
        fi
      fi
    else
      echo "  ℹ️  ruff not found — skipping Python lint (pip install ruff)"
    fi
    ;;

  yaml|yml)
    # Validate YAML syntax
    if command -v python3 &>/dev/null; then
      echo "  → Validating YAML syntax..."
      if ! python3 -c "import yaml; yaml.safe_load(open('$FILE_PATH'))" 2>&1; then
        echo "  ⚠️  Invalid YAML syntax"
      else
        echo "  ✅ YAML: Valid"
      fi
    fi
    ;;

  *)
    # No lint for other file types
    ;;
esac

exit 0
