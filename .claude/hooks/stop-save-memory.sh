#!/usr/bin/env bash
# Hook: stop-save-memory.sh
#
# [CAPABILITY: HOOKS — Stop]
# This hook fires when the Claude Code session ends (Stop event).
# It prompts Claude to summarize architectural decisions made during the session
# and write them to a persistent memory log.
#
# PURPOSE: Capture decisions, patterns, and learnings from each session
# into the auto-memory system so they're available in future sessions.
# This is how Claude "learns" from each delivery or incident session.
#
# HOW THIS WORKS:
# The Stop hook fires after Claude's final response. The output of this
# script is displayed to the user. It writes a prompt that reminds Claude
# (and the developer) to capture session learnings.

set -uo pipefail

MEMORY_DIR=".claude/memory"
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
DATE=$(date -u +"%Y-%m-%d")
SESSION_LOG="$MEMORY_DIR/session-log.md"

# Ensure memory directory exists
mkdir -p "$MEMORY_DIR"

# Initialize session log if it doesn't exist
if [[ ! -f "$SESSION_LOG" ]]; then
  cat > "$SESSION_LOG" << 'EOF'
# Session Memory Log

> **[CAPABILITY: MEMORY — Auto Memory]**
> This file is the append-only log of decisions and learnings captured
> at the end of each Claude Code session via the stop-save-memory.sh hook.
> Future Claude sessions load this file to avoid re-learning known patterns.

EOF
fi

# Append a session entry template
cat >> "$SESSION_LOG" << EOF

---

## Session: $TIMESTAMP

**Auto-captured by stop-save-memory.sh hook**

> Claude: Before this session closes, please summarize any architectural decisions,
> patterns discovered, or corrections made during this session and add them below.
> These will be available in future sessions.

### Decisions Made
- [ ] *No decisions captured yet — Claude should fill this in*

### Patterns Learned
- [ ] *No patterns captured yet*

### Corrections Made
- [ ] *No corrections captured yet*

### For Next Session
- [ ] *Any context future-you should know*

EOF

echo ""
echo "💾 STOP HOOK: stop-save-memory.sh"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Session memory template appended to: $SESSION_LOG"
echo ""
echo "📌 Claude: Please populate the session entry above with:"
echo "   1. Any architectural decisions made (will guide future agents)"
echo "   2. Patterns discovered in the codebase"
echo "   3. Corrections applied (so mistakes aren't repeated)"
echo "   4. Context needed for the next session"
echo ""
echo "This is how memory persists across sessions in this project."
echo "See CLAUDE.md → 'Claude Code Usage in This Project' for details."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit 0
