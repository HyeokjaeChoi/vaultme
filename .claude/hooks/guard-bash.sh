#!/usr/bin/env bash
# PreToolUse(Bash): block commands that skip or bypass the repo gates. Exit 2 blocks and sends stderr to Claude.
# The GitHub ruleset on main is the real guard; this catches the mistake before it runs.
input=$(cat)
cmd=$(jq -r '.tool_input.command // empty' <<<"$input")
# Checks run on `chk`: heredoc bodies dropped, quoted prose blanked ("git push" in an issue body is not a push).
# A quoted word without whitespace is unwrapped ("main", "--force" stay visible). Double quotes with $( or a backtick,
# and any bash/sh/zsh/eval wrapper, keep their text (they run it). ponytail: regex, not a shell parser; use a real one if bypasses appear.
chk=$(perl -0pe 's/(<<-?[ \t]*([\x27"]?)(\w+)\2[^\n]*\n).*?\n[ \t]*\3(?=\n|$)/$1$3/sg;
  s/("(?:\\.|[^"\\])*"|\x27[^\x27]*\x27)/my $q=$1; my $c=substr($q,0,1); ($c eq "\"" && $q =~ m{\$\(|`}) ? $q : $q =~ m{\s} ? "$c$c" : substr($q,1,-1)/ge' <<<"$cmd") || chk=$cmd # no perl or a perl error: check the raw text (fail closed)
grep -Eq '(^|[[:space:];&|(])(bash|sh|zsh|eval)([[:space:]]|$)' <<<"$chk" && chk=$cmd
block() { echo "Blocked by .claude/hooks/guard-bash.sh: $1" >&2; exit 2; }
path='("[^"]+"|'"'"'[^'"'"']+'"'"'|[^[:space:];&|)]+)'
# A push = a git command with `push` as a whole word (#306): `git show x:push.ts`, a branch named fix/1-send-push-copy
# and `git push-all` are not pushes. Any word may come before it, so options with a separate value (`--work-tree .`)
# cannot hide a push. ponytail: `git commit -m push` on main is a false positive; aliases are not covered.
gp="git([[:space:]]+[^[:space:];&|]+)*[[:space:]]+[\"']?push[\"']?([^[:alnum:]_./-]|\$)"
if grep -Eq 'git[^|;&]*\b(commit|push|merge|rebase)\b[^|;&]*--no-verify' <<<"$chk" || grep -Eq 'git[^|;&]*\bcommit\b[^|;&]*[[:space:]]-[a-zA-Z]*n' <<<"$chk"; then
  block "do not skip git hooks (--no-verify). Fix what the hook reports."
fi
if grep -Eq "$gp"'([^|;&]*[[:space:]])?(--force([[:space:]")]|$)|-[a-zA-Z]*f|\+[^[:space:]])' <<<"$chk"; then
  block "no plain force push (--force, -f, +refspec). Use --force-with-lease on your own feature branch."
fi
if grep -Eq "$gp"'([^|;&]*[[:space:]])?(origin[[:space:]]+)?([^[:space:]]*:)?(refs/heads/)?(main|master)([[:space:]")]|$)' <<<"$chk"; then
  block "do not push to main. Open a PR."
fi
# Check the folder the push runs in, not the project folder: a worktree session has its own branch.
# Folder = `-C <dir>` of the push, else the last `cd <dir>` into a git folder, else the hook input cwd.
# A `-C` folder that does not resolve blocks (fail closed). ponytail: first push only; no $VAR expansion except $HOME.
resolve() { # resolve <cd|-C match>: print the folder, quotes stripped, ~ and $HOME expanded, relative to cwd
  local d; d=$(sed -E 's/^(cd|-C)[[:space:]]+//' <<<"$1")
  d=${d#[\"\']} d=${d%[\"\']} d=${d/#\~/$HOME} d=${d//\$HOME/$HOME}
  if [[ $d == /* ]]; then echo "$d"; else echo "$cwd/$d"; fi
}
push=$(grep -oE "$gp"'[^|;&]*' <<<"$chk" | head -1) # is there a push? the folder logic below reads the original text (quoted -C paths)
[ -n "$push" ] && push=$(grep -oE "$gp"'[^|;&]*' <<<"$cmd" | head -1)
if [ -n "$push" ]; then
  cwd=$(jq -r '.cwd // empty' <<<"$input")
  cwd=${cwd:-${CLAUDE_PROJECT_DIR:-.}}
  dir=$cwd
  pre=${push%%[[:space:]]push*} pre=${pre%%[[:space:]]\"push*} pre=${pre%%[[:space:]]\'push*} # the options before push
  c=$(grep -oE "[[:space:]]-C[[:space:]]+$path" <<<"$pre" | head -1 | sed -E 's/^[[:space:]]//')
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
