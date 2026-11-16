#!/usr/bin/env bash
# One rolling "flaky e2e" issue per flow and platform, label `flaky` (FLAKY-1). Usage: flaky-issue.sh <iOS|Android> <log file> <ref name>
# run.sh prints `::warning::flaky: retrying flows/a.yaml flows/b.yaml` when a flow failed once and passed on the retry. For each such
# flow: comment on the open issue with that title, else open one. Never a second open issue for the same flow (#388, #389, #395, #398).
# Needs GH_TOKEN with issues: write, GITHUB_REPOSITORY, GITHUB_SERVER_URL, GITHUB_RUN_ID.
set -euo pipefail
platform="${1:?platform}" log="${2:?log file}" ref="${3:?ref name}"
url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"
for f in $(grep -h '::warning::flaky: retrying' "$log" | sed 's/.*retrying //' | tr ' ' '\n' | grep -E '^flows/.*\.yaml$' | sort -u); do
  title="flaky e2e: $(basename "$f") ($platform)"
  body="Flow \`$f\` failed once and passed on the retry in release $ref on $platform: $url. Find the step in the job log (lines with \`flaky\`) and fix the cause."
  open="$(gh issue list --repo "$GITHUB_REPOSITORY" --label flaky --state open --search "\"$title\" in:title" --json number,title --jq "[.[] | select(.title == \"$title\")][0].number // empty")"
  if [ -n "$open" ]; then
    gh issue comment "$open" --repo "$GITHUB_REPOSITORY" --body "$body"
  else
    gh issue create --repo "$GITHUB_REPOSITORY" --title "$title" --label flaky --body "$body"
  fi
done
