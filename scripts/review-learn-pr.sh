#!/usr/bin/env bash
# Opens the weekly learning-loop proposal (REVIEW.md "Learning loop", .github/workflows/review-learn.yml):
# one issue and one draft PR that closes it. Run by Claude inside claude-code-action, which sets GH_TOKEN to the
# Claude app token (a PR made with GITHUB_TOKEN would not start CI, and this repo does not let Actions open PRs).
# Input: .review-learn/title.txt (one line) and .review-learn/body.md. Never pushes to main.
set -euo pipefail
dir=.review-learn # also holds findings.json from the workflow; removed before the commit
title=$(head -1 "$dir/title.txt")
cp "$dir/body.md" "$RUNNER_TEMP/body.md"
rm -rf "$dir"
[ -n "$(git status --porcelain)" ] || { echo "No file changes: nothing to propose."; exit 0; }
issue=$(gh issue create --title "chore: $title" --body-file "$RUNNER_TEMP/body.md" --label area:ci)
n=${issue##*/}
branch="chore/$n-review-lessons"
# A failed push would leave the issue without a PR: close it with the reason.
trap 'gh issue close "$n" --reason "not planned" --comment "review-learn could not push the proposal branch; see the workflow run."' ERR
git switch -c "$branch"
git add -A
git -c user.name="claude[bot]" -c user.email="claude[bot]@users.noreply.github.com" commit -qm "chore: $title (#$n)"
git push "https://x-access-token:$GH_TOKEN@github.com/$GITHUB_REPOSITORY.git" "HEAD:refs/heads/$branch"
trap - ERR
{ printf 'Closes #%s\n\n' "$n"; cat "$RUNNER_TEMP/body.md"; } > "$RUNNER_TEMP/pr.md"
gh pr create --draft --head "$branch" --title "chore: $title" --body-file "$RUNNER_TEMP/pr.md"
