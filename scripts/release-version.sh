#!/usr/bin/env bash
# Release version rule (ADR-0034, #396). Prints `VERSION=X.Y.Z` and `BUILD=YYMMDDNN`.
# Usage: release-version.sh <tag> <YYYY-MM-DD, UTC> <runs of release.yml that UTC day, this one included>
# Version name = the SemVer digits of the vMAJOR.MINOR.PATCH tag (stores take digits only). Build number = UTC date + 2-digit count:
# it grows with every run (a failed tag that is deleted and pushed again gets the next count) and stays under Android's 2,100,000,000.
set -euo pipefail
tag="${1:?tag}" day="${2:?YYYY-MM-DD}" count="${3:?count}"
[[ "$tag" =~ ^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$ ]] || { echo "::error::tag $tag is not vMAJOR.MINOR.PATCH (ADR-0034)" >&2; exit 1; }
[[ "$day" =~ ^20([0-9]{2})-([0-9]{2})-([0-9]{2})$ ]] || { echo "::error::day $day is not YYYY-MM-DD" >&2; exit 1; }
yymmdd="${BASH_REMATCH[1]}${BASH_REMATCH[2]}${BASH_REMATCH[3]}"
[[ "$count" =~ ^[1-9][0-9]?$ ]] || { echo "::error::$count release runs today: the build number allows 1-99 per UTC day" >&2; exit 1; }
echo "VERSION=${tag#v}"
printf 'BUILD=%s%02d\n' "$yymmdd" "$count"
