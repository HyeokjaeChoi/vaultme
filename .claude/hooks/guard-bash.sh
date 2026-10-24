#!/usr/bin/env bash
# PreToolUse(Bash): block commands that skip or bypass the repo gates. Exit 2 blocks and sends stderr to Claude.
# The GitHub ruleset on main is the real guard; this catches the mistake before it runs.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
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
# Check the folder the push runs in, not the project folder: a worktree session has its own branch.
# Folder = `-C <dir>` of the push, else the last `cd <dir>` into a git folder, else the hook input cwd.
# A `-C` folder that does not resolve blocks (fail closed). ponytail: first push only; no $VAR expansion except $HOME.
path='("[^"]+"|'"'"'[^'"'"']+'"'"'|[^[:space:];&|)]+)'
resolve() { # resolve <cd|-C match>: print the folder, quotes stripped, ~ and $HOME expanded, relative to cwd
  local d; d=$(sed -E 's/^(cd|git[[:space:]]+-C)[[:space:]]+//' <<<"$1")
  d=${d#[\"\']} d=${d%[\"\']} d=${d/#\~/$HOME} d=${d//\$HOME/$HOME}
  if [[ $d == /* ]]; then echo "$d"; else echo "$cwd/$d"; fi
}
push=$(grep -oE 'git[^|;&]*\bpush\b[^|;&]*' <<<"$cmd" | head -1)
if [ -n "$push" ]; then
  cwd=$(jq -r '.cwd // empty' <<<"$input")
  cwd=${cwd:-${CLAUDE_PROJECT_DIR:-.}}
  dir=$cwd
  c=$(grep -oE "git[[:space:]]+-C[[:space:]]+$path" <<<"$push" | head -1)
  if [ -n "$c" ]; then
    dir=$(resolve "$c")
    git -C "$dir" rev-parse --git-dir >/dev/null 2>&1 || block "cannot read the branch of $dir. Run the push from a feature-branch folder."
  else
    while IFS= read -r m; do
      d=$(resolve "$m")
      git -C "$d" rev-parse --git-dir >/dev/null 2>&1 && dir=$d # a cd outside git (e.g. /tmp) does not move the push
    done < <(grep -oE "(^|[[:space:];&|(])cd[[:space:]]+$path" <<<"${cmd%%"$push"*}" | sed -E 's/^[[:space:];&|(]//')
  fi
  [ "$(git -C "$dir" branch --show-current 2>/dev/null)" = main ] && block "you are on main ($dir). Create a branch and open a PR."
fi
exit 0
