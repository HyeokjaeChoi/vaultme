#!/usr/bin/env bash
# Which failed flows may run again (run.sh). Usage: retry-flows.sh <junit report>. Prints one line per failed flow: `retry flows/x.yaml` or `funded flows/x.yaml`.
# A flow tagged `funded` sends real Sepolia funds, so a second run would broadcast a second send: it is never retried (ADR-0040, CHAIN-1).
set -euo pipefail
cd "$(dirname "$0")"
python3 -I -c 'import sys, xml.etree.ElementTree as E
for t in E.parse(sys.argv[1]).iter("testcase"):
    if t.find("failure") is not None or t.find("error") is not None: print(t.get("name"))' "${1:?usage: $0 <junit report>}" | while IFS= read -r name; do
  kind=unknown
  for f in flows/*.yaml; do
    if grep -qxF "name: $name" "$f"; then # an if, not &&: a non-matching last file must not end the loop with status 1 (set -e)
      if grep -qE '^tags:.*\bfunded\b' "$f"; then echo "funded $f"; else echo "retry $f"; fi
      kind=found
    fi
  done
  # A failed flow that matches no file must not vanish: run.sh fails on it.
  [ "$kind" = found ] || echo "unknown $name"
done
