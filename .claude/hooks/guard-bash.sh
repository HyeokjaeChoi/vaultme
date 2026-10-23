#!/usr/bin/env bash
# PreToolUse(Bash): block commands that skip or bypass the repo gates. Exit 2 blocks and sends stderr to Claude.
# The GitHub ruleset on main is the real guard; this catches the mistake before it runs.
cmd=$(jq -r '.tool_input.command // empty')
block() { echo "Blocked by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }
if grep -Eq 'git[^|;&]*\b(commit|push|merge|rebase)\b[^|;&]*--no-verify' <<<"$cmd" || grep -Eq 'git[^|;&]*\bcommit\b[^|;&]*[[:space:]]-[a-zA-Z]*n' <<<"$cmd"; then
  block "do not skip git hooks (--no-verify). Fix what the hook reports."
fi
if grep -Eq 'git[^|;&]*\bpush\b[^|;&]*([[:space:]]--force([[:space:]]|$)|[[:space:]]-[a-zA-Z]*f|[[:space:]]\+[^[:space:]])' <<<"$cmd"; then
  block "no plain force push (--force, -f, +refspec). Use --force-with-lease on your own feature branch."
fi
if grep -Eq 'git[^|;&]*\bpush\b[^|;&]*[[:space:]](origin[[:space:]]+)?([^[:space:]]*:)?(refs/heads/)?(main|master)([[:space:]]|$)' <<<"$cmd"; then
  block "do not push to main. Open a PR."
fi
if grep -Eq 'git[^|;&]*\bpush\b' <<<"$cmd" && [ "$(git -C "${CLAUDE_PROJECT_DIR:-.}" branch --show-current 2>/dev/null)" = main ]; then
  block "you are on main. Create a branch and open a PR."
fi
exit 0
