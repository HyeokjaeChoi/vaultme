#!/usr/bin/env bash
# Stop: when code or its config changed in the working tree, typecheck and lint must pass before Claude ends its turn.
# Exit 2 makes Claude continue and fix. It runs again after a fix (stop_hook_active is not a skip): Claude Code ends the
# turn anyway after 8 continuations in a row (CLAUDE_CODE_STOP_HOOK_BLOCK_CAP, code.claude.com/docs/en/hooks).
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f package.json ] || exit 0
git status --porcelain -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' '*package.json' '*tsconfig*.json' '*eslint.config.*' | grep -q . || exit 0
out=$(pnpm turbo run typecheck lint --output-logs=errors-only 2>&1) || { echo "$out" | tail -40 >&2; exit 2; }
exit 0
