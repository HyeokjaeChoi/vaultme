#!/usr/bin/env python3
"""osv-scanner exception lint (SEC-1, ADR-0047, #503). Run by R18 in check-repo-rules.sh.

Every [[IgnoredVulns]] in osv-scanner.toml needs an id, a reason that names its scope, and an ignoreUntil date that is still
ahead: at most 30 days for dev and CI tools ("dev: ..."), at most 14 days and only when no fix exists for shipped code
("shipped: no fix ..."). osv-scanner ignores a finding for ever when ignoreUntil is missing, and from 00:00 UTC of that day it
shows the finding again, so an expired entry fails here at the same moment. Anything but these three keys fails:
[[PackageOverrides]] could hide findings outside this rule (fail closed).

Usage: python3 scripts/check-osv-exceptions.py [file] [YYYY-MM-DD, UTC]   (defaults: osv-scanner.toml, today)

The parser reads one line at a time on purpose: python 3.9 on a Mac has no tomllib, and a fixed shape is easier to judge.
"""
import datetime
import os
import re
import sys

CAP = {"dev": 30, "shipped": 14}  # days ahead, ADR-0047
STR = r'"((?:[^"\\]|\\.)*)"'  # a one-line basic string
END = r"\s*(?:#.*)?$"  # nothing, or a comment


def check(text, today, path="osv-scanner.toml"):
    """Return the problems of one osv-scanner.toml text, judged on the UTC date `today`."""
    bad, entries, cur = [], [], None
    for n, raw in enumerate(text.split("\n"), 1):
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if re.match(r"\[\[IgnoredVulns\]\]" + END, line):
            cur = {"line": n}
            entries.append(cur)
            continue
        m = re.match(r"(id|reason)\s*=\s*" + STR + END, line) or re.match(r"(ignoreUntil)\s*=\s*(\d{4}-\d{2}-\d{2})" + END, line)
        if m and cur is not None:
            if m[1] in cur:
                bad.append(f"{path}:{n}: {m[1]} twice in one exception")
            cur[m[1]] = m[2]
            continue
        bad.append(f'{path}:{n}: not allowed (only [[IgnoredVulns]] with id = "...", ignoreUntil = YYYY-MM-DD and reason = "..." on one line): {line}')

    seen = set()
    for e in entries:
        where = f"{path}:{e['line']}"
        vid, reason = e.get("id", ""), e.get("reason", "").strip()
        if not re.fullmatch(r"[A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+", vid):
            bad.append(f'{where}: needs id = "GHSA-..." (or another advisory id without spaces)')
        elif vid.startswith("MAL-"):
            bad.append(f"{where}: {vid} is a malware advisory; remove the package, never ignore it")
        elif vid in seen:
            bad.append(f"{where}: {vid} is listed twice")
        seen.add(vid)
        scope = re.match(r"(dev|shipped): \S", reason)
        if not reason:
            bad.append(f"{where}: {vid or 'exception'} needs a reason")
        elif not scope:
            bad.append(f'{where}: reason must start with "dev: " (dev and CI tools) or "shipped: no fix " (code that ships)')
        elif scope[1] == "shipped" and not reason.startswith("shipped: no fix"):
            bad.append(f'{where}: a shipped exception only exists when no fix does; start the reason with "shipped: no fix "')
        if "ignoreUntil" not in e:
            bad.append(f"{where}: {vid or 'exception'} needs ignoreUntil = YYYY-MM-DD (without it osv-scanner ignores the finding for ever)")
            continue
        try:
            until = datetime.date.fromisoformat(e["ignoreUntil"])
        except ValueError:
            bad.append(f"{where}: ignoreUntil {e['ignoreUntil']} is not a date")
            continue
        if until <= today:
            bad.append(f"{where}: {vid} expired ({until} 00:00 UTC): fix the dependency, or renew it with a new reason")
        elif scope and (until - today).days > CAP[scope[1]]:
            last = today + datetime.timedelta(days=CAP[scope[1]])
            bad.append(f"{where}: {vid} ignoreUntil {until} is more than {CAP[scope[1]]} days away ({scope[1]} cap); the latest is {last}")
    return bad


def main(argv):
    path = argv[1] if len(argv) > 1 else "osv-scanner.toml"
    today = datetime.date.fromisoformat(argv[2]) if len(argv) > 2 else datetime.datetime.now(datetime.timezone.utc).date()
    if not os.path.exists(path):
        return 0  # no file, no exception
    with open(path, encoding="utf-8") as f:
        bad = check(f.read(), today, path)
    for b in bad:
        print(b, file=sys.stderr)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
