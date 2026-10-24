#!/usr/bin/env bash
# Checks guard-bash.sh: run `bash .claude/hooks/guard-bash.test.sh`. Exit 0 = all cases pass.
set -u
hook="$(cd "$(dirname "$0")" && pwd)/guard-bash.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git init -q -b main "$tmp/main" && git -C "$tmp/main" commit -q --allow-empty -m x
git init -q -b feat "$tmp/feat" && git -C "$tmp/feat" commit -q --allow-empty -m x
fail=0
# case <want exit> <cwd or ""> <CLAUDE_PROJECT_DIR> <command> <label>
case_() {
  local input
  if [ -n "$2" ]; then input=$(jq -n --arg c "$2" --arg k "$4" '{cwd:$c,tool_input:{command:$k}}')
  else input=$(jq -n --arg k "$4" '{tool_input:{command:$k}}'); fi
  printf '%s' "$input" | CLAUDE_PROJECT_DIR=$3 bash "$hook" >/dev/null 2>&1
  local got=$?
  if [ "$got" = "$1" ]; then echo "ok   $5"; else echo "FAIL $5 (exit $got, want $1)"; fail=1; fi
}
case_ 0 "$tmp/feat" "$tmp/main" "git push -u origin feat" "push from a feature-branch folder while the project folder is on main"
case_ 2 "$tmp/main" "$tmp/feat" "git push -u origin feat" "push from a folder on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -C $tmp/main push" "git -C <folder on main> push"
case_ 0 "$tmp/main" "$tmp/main" "git -C $tmp/feat push -u origin feat" "git -C <feature-branch folder> push"
case_ 2 "" "$tmp/main" "git push -u origin feat" "no cwd: falls back to the project folder"
case_ 2 "$tmp/feat" "$tmp/feat" "git push origin main" "push to main"
case_ 2 "$tmp/feat" "$tmp/feat" "git push --force" "force push"
case_ 0 "$tmp/feat" "$tmp/feat" "git push --force-with-lease" "force-with-lease"
case_ 2 "$tmp/feat" "$tmp/feat" "git commit --no-verify -m x" "skip hooks"
exit $fail
