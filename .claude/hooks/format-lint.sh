#!/usr/bin/env bash
# PostToolUse(Edit/Write): format the edited file, then lint it. Exit 2 shows the lint errors to Claude (the edit stays).
f=$(jq -r '.tool_input.file_path // empty')
cd "$CLAUDE_PROJECT_DIR" || exit 0
[ -f "$f" ] || exit 0
case "$f" in
  *.ts | *.tsx | *.js | *.mjs | *.cjs | *.json | *.yml | *.yaml) pnpm exec prettier --write --log-level warn "$f" >&2 || exit 2 ;;
  *) exit 0 ;;
esac
case "$f" in
  */apps/*.ts | */apps/*.tsx | */apps/*.js | */apps/*.mjs | */packages/*.ts | */packages/*.tsx | */packages/*.js | */packages/*.mjs)
    out=$(pnpm exec eslint --max-warnings=0 --fix "$f" 2>&1) || { echo "$out" | tail -30 >&2; exit 2; } ;;
esac
exit 0
