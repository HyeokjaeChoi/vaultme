#!/usr/bin/env bash
# Stop: when code or its config changed (working tree or this branch), typecheck and lint must pass before Claude ends its turn.
# Exit 2 makes Claude continue and fix. It runs again after a fix (stop_hook_active is not a skip): Claude Code ends the
# turn anyway after 8 continuations in a row (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP, code.claude.com/docs/en/hooks).
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f package.json ] || exit 0
# Uncommitted changes, or commits on this branch that main does not have (Claude may commit inside the turn).
# Turbo caches unchanged packages, so a repeat run is fast.
paths=('*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*package.json' '*tsconfig*.json' '*eslint.config.*')
base=$(git merge-base HEAD origin/main 2>/dev/null)
{ git status --porcelain -- "${paths[@]}"; [ -n "$base" ] && git diff --name-only "$base" HEAD -- "${paths[@]}"; } | grep -q . || exit 0
out=$(pnpm turbo run typecheck lint --output-logs=errors-only 2>&1) || { echo "$out" | tail -40 >&2; exit 2; }
exit 0
