#!/usr/bin/env bash
# Cases for scripts/release-version.sh. Run by R16 in check-repo-rules.sh.
set -euo pipefail
v="$(cd "$(dirname "$0")" && pwd)/release-version.sh"
ok() { out="$("$v" "$1" "$2" "$3" 2>/dev/null | tr '\n' ' ')"; [ "$out" = "$4 " ] || { echo "expected '$4' for $*, got '$out'" >&2; exit 1; }; }
no() { if "$v" "$1" "$2" "$3" >/dev/null 2>&1; then echo "expected a failure for $*" >&2; exit 1; fi; }
ok v0.3.0 2026-11-04 2 'VERSION=0.3.0 BUILD=26110402'
ok v1.10.0 2099-12-31 99 'VERSION=1.10.0 BUILD=99123199'
ok v12.0.7 2027-01-01 1 'VERSION=12.0.7 BUILD=27010101'
no v1.2 2026-11-04 1
no v01.2.3 2026-11-04 1
no v1.2.3-rc.1 2026-11-04 1
no 1.2.3 2026-11-04 1
no v1.2.3 2026-11-04 100
no v1.2.3 2026-11-04 0
no v1.2.3 26-11-04 1
