#!/usr/bin/env bash
# Negative and positive cases for scripts/check-migrations.sh. Run by R16 in check-repo-rules.sh.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
t="$(mktemp -d)"; trap 'rm -rf "$t"' EXIT
run() { printf '%s\n' "$2" > "$t/0001.sql"; "$here/check-migrations.sh" "$t" 2>/dev/null && r=pass || r=fail; [ "$r" = "$1" ] || { echo "expected $1: $2" >&2; exit 1; }; }
run pass 'ALTER TABLE t ADD COLUMN c TEXT;'
run pass '-- we do not rename or drop anything
CREATE TABLE t (id TEXT);'
run fail 'ALTER TABLE t DROP COLUMN c;'
run fail 'alter table t drop  column c;'
run fail 'DROP TABLE t;'
run fail 'ALTER TABLE t DROP c;'
run fail 'ALTER TABLE t DROP
COLUMN c;'
run fail 'DROP /* x */ TABLE t;'
run pass 'ALTER TABLE t ADD COLUMN renamed_at INTEGER;
CREATE TABLE rename_history (id TEXT);'
run pass "CREATE TABLE t (id TEXT); -- rename later
/* DROP TABLE old */ INSERT INTO t VALUES ('drop table x');"
run pass '-- contract-ok: the column is unused since release 12
ALTER TABLE t DROP
COLUMN c;'
run fail 'ALTER TABLE t RENAME COLUMN a TO b;'
run fail 'ALTER TABLE t RENAME TO u;'
run fail '-- contract-ok:
DROP TABLE t;'
run pass '-- contract-ok: old Worker no longer reads t (release 12)
DROP TABLE t;'
