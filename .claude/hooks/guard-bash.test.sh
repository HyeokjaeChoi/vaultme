#!/usr/bin/env bash
# Checks guard-bash.sh: run `bash .claude/hooks/guard-bash.test.sh`. Exit 0 = all cases pass.
set -u
# A git hook (pre-commit runs R12) exports GIT_DIR and GIT_INDEX_FILE. With them set, the git calls below act on
# the real repo: init re-inits it (core.bare=true) and commit adds commits to it. Clear them first.
unset $(git rev-parse --local-env-vars)
hook="$(cd "$(dirname "$0")" && pwd)/guard-bash.sh"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
git init -q -b main "$tmp/main" && git -C "$tmp/main" commit -q --allow-empty -m x
git init -q -b feat "$tmp/feat" && git -C "$tmp/feat" commit -q --allow-empty -m x
git init -q -b main "$tmp/my main" && git -C "$tmp/my main" commit -q --allow-empty -m x
mkdir "$tmp/plain"
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
case_ 2 "$tmp/feat" "$tmp/feat" "cd $tmp/main && git push" "cd <folder on main> && git push"
case_ 0 "$tmp/main" "$tmp/main" "cd $tmp/feat && git push -u origin feat" "cd <feature-branch folder> with cwd on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -C \"$tmp/main\" push" "quoted -C folder on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -C \"$tmp/my main\" push" "-C folder with a space, on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -C $tmp/nope push" "-C folder that does not exist (fail closed)"
case_ 0 "$tmp/feat" "$tmp/feat" "cd $tmp/plain && git -C $tmp/feat push" "cd into a non-git folder"
case_ 2 "$tmp/main" "$tmp/main" "git push && git -C $tmp/feat log -1" "-C of another git command does not hide cwd on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git push origin main" "push to main"
case_ 2 "$tmp/feat" "$tmp/feat" "git push --force" "force push"
case_ 0 "$tmp/feat" "$tmp/feat" "git push --force-with-lease" "force-with-lease"
case_ 2 "$tmp/feat" "$tmp/feat" "git commit --no-verify -m x" "skip hooks"
# Quoted text and heredoc bodies are prose, not commands.
case_ 0 "$tmp/main" "$tmp/main" 'gh issue create --body "run git push --force origin main with --no-verify"' "double-quoted prose with push/force/main"
case_ 0 "$tmp/main" "$tmp/main" "gh issue create --body 'never git push origin main'" "single-quoted prose"
case_ 0 "$tmp/main" "$tmp/main" 'git commit -m "do not use git commit --no-verify"' "commit message that names --no-verify"
case_ 0 "$tmp/main" "$tmp/main" "gh pr create --body \"don't git push\" --title x" "apostrophe inside double quotes"
case_ 0 "$tmp/main" "$tmp/main" $'gh issue create --body-file - <<\'EOF\'\ngit push --force origin main\nit\'s --no-verify\nEOF' "quoted heredoc body"
case_ 0 "$tmp/main" "$tmp/main" $'cat <<EOF\ngit push origin main\nEOF' "unquoted heredoc body"
# Quoting a real argument or wrapping the command must not hide it.
case_ 2 "$tmp/feat" "$tmp/feat" 'git push origin "main"' "quoted main arg"
case_ 2 "$tmp/feat" "$tmp/feat" 'git push "--force"' "quoted --force arg"
case_ 2 "$tmp/feat" "$tmp/feat" 'git commit "--no-verify" -m x' "quoted --no-verify arg"
case_ 2 "$tmp/feat" "$tmp/feat" 'bash -c "git push --force"' "bash -c wrapper"
case_ 2 "$tmp/feat" "$tmp/feat" 'echo "$(git push origin main)"' "command substitution in double quotes"
case_ 2 "$tmp/main" "$tmp/main" 'echo "x" && git push' "real push on main after a quoted string"
# `push` counts only as the git subcommand (#306).
case_ 0 "$tmp/main" "$tmp/main" "git show origin/main:packages/contracts/src/push.ts" "file named push.ts in a read-only command on main"
case_ 0 "$tmp/main" "$tmp/main" "git checkout -b fix/306-guard-push-word" "branch name with push on main"
case_ 0 "$tmp/main" "$tmp/main" "git log --oneline -- push.ts" "path argument named push.ts on main"
case_ 2 "$tmp/main" "$tmp/main" "git -c core.x=y push" "-c option before push on main"
case_ 2 "$tmp/main" "$tmp/main" "git --no-pager push -u origin feat" "--no-pager before push on main"
case_ 2 "$tmp/main" "$tmp/main" "rtk git push" "rtk git push on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -c core.x=y -C $tmp/main push" "-c then -C <folder on main>"
case_ 2 "$tmp/feat" "$tmp/feat" "git -c core.x=y push --force" "force push after -c"
case_ 2 "$tmp/feat" "$tmp/feat" "git --work-tree . push --force" "option with a separate value, then force push"
case_ 2 "$tmp/feat" "$tmp/feat" "git --namespace foo push origin main" "option with a separate value, then push to main"
case_ 2 "$tmp/main" "$tmp/main" "git --work-tree . push" "option with a separate value, push on main"
case_ 2 "$tmp/feat" "$tmp/feat" 'git -C a\ b push origin main' "escaped space in -C, push to main"
case_ 2 "$tmp/main" "$tmp/main" 'git "push"' "quoted subcommand on main"
case_ 0 "$tmp/main" "$tmp/main" "git push-all" "push-all is not push"
case_ 2 "$tmp/main" "$tmp/main" 'echo $(git push)' "push inside command substitution on main"
case_ 0 "$tmp/main" "$tmp/main" "git checkout -b fix/297-send-push-copy" "branch name from the #306 report on main"
case_ 2 "$tmp/feat" "$tmp/feat" "git -c core.x=y -C $tmp/feat -C $tmp/main push" "the last -C wins"
mkdir "$tmp/main push-target" && git init -q -b main "$tmp/main push-target/r" && git -C "$tmp/main push-target/r" commit -q --allow-empty -m x
case_ 2 "$tmp/feat" "$tmp/feat" "git -C '$tmp/main push-target/r' push" "-C folder whose name contains push, on main"
exit $fail
