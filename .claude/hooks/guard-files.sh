#!/usr/bin/env bash
# PreToolUse(Edit/Write): block edits to files that tools generate or that must not exist.
f=$(jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')
block() { echo "Blocked by .claude/hooks/guard-files.sh: $1" >&2; exit 2; }
case "$f" in
  */CLAUDE.md | CLAUDE.md | */CLAUDE.local.md | CLAUDE.local.md) block "no CLAUDE.md (R9). Put shared rules in AGENTS.md." ;;
  */src/generated/*) block "$f is generated. Change its source and run the build." ;;
  */pnpm-lock.yaml) block "pnpm-lock.yaml is generated. Use pnpm add/remove/install." ;;
  */docs/openapi/v1.json) block "v1.json is generated. Run: pnpm --filter @vaultme/api openapi" ;;
  */apps/mobile/src/shared/ui/artwork.ts) block "artwork.ts is generated from apps/mobile/assets/artwork/*.svg." ;;
esac
exit 0
