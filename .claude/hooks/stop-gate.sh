#!/usr/bin/env bash
# Stop: when code changed in the working tree, typecheck and lint must pass before Claude ends its turn.
# Exit 2 makes Claude continue and fix. stop_hook_active stops a second block in the same turn.
in=$(cat)
[ "$(jq -r '.stop_hook_active // false' <<<"$in")" = true ] && exit 0
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f package.json ] || exit 0
git status --porcelain -- '*.ts' '*.tsx' '*.js' '*.mjs' '*.cjs' 'package.json' '**/package.json' | grep -q . || exit 0
out=$(pnpm turbo run typecheck lint --output-logs=errors-only 2>&1) || { echo "$out" | tail -40 >&2; exit 2; }
exit 0
