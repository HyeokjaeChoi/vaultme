#!/usr/bin/env python3
"""Negative and positive cases for scripts/check-osv-exceptions.py. Run by R18 in check-repo-rules.sh.

One process runs every case. A failing case names the words its message must hold, so a crash cannot pass as a "fail" case.
Silent on success, like the R16 tests.
"""
import datetime
import importlib.util
import os
import sys

sys.dont_write_bytecode = True  # importing the checker must not leave a scripts/__pycache__ (R10 would try to read the .pyc)
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("check_osv_exceptions", os.path.join(here, "check-osv-exceptions.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

TODAY = datetime.date(2026, 11, 15)  # the fixed "today" of every case
ID = "GHSA-aaaa-bbbb-cccc"


def ex(vid, until, reason):
    """One exception."""
    return f'[[IgnoredVulns]]\nid = "{vid}"\nignoreUntil = {until}\nreason = "{reason}"\n'


# (words the problem list must hold, or None when the file must pass; file text)
CASES = [
    # No exception is fine: nothing hides a finding.
    (None, ""),
    (None, "# only a comment\n"),
    # Dev and CI tools: reason and a future date, 30 days at most.
    (None, ex(ID, "2026-12-15", "dev: extract-zip via @lhci/cli, CI only; no fix released")),
    (None, ex(ID, "2026-11-16", "dev: one day left")),
    ("more than 30 days", ex(ID, "2026-12-16", "dev: 31 days")),
    ("expired", ex(ID, "2026-11-15", "dev: expires today at 00:00 UTC")),
    ("expired", ex(ID, "2026-11-14", "dev: expired yesterday")),
    # Code that ships: only when no fix exists, 14 days at most.
    (None, ex(ID, "2026-11-29", "shipped: no fix released for the affected line")),
    ("more than 14 days", ex(ID, "2026-11-30", "shipped: no fix released, but 15 days")),
    ("only exists when no fix does", ex(ID, "2026-11-29", "shipped: a fix exists in 4.7")),
    # A reason and a scope are required.
    ("needs a reason", ex(ID, "2026-12-01", "")),
    ("needs a reason", ex(ID, "2026-12-01", "   ")),
    ("reason must start with", ex(ID, "2026-12-01", "build tool only")),
    ("reason must start with", ex(ID, "2026-12-01", "prod: unknown scope")),
    ("needs a reason", f'[[IgnoredVulns]]\nid = "{ID}"\nignoreUntil = 2026-12-01\n'),
    # An expiry is required (osv-scanner ignores a finding without one for ever), as a plain date.
    ("needs ignoreUntil", f'[[IgnoredVulns]]\nid = "{ID}"\nreason = "dev: no date"\n'),
    ("not allowed", ex(ID, "2026-12-01T00:00:00Z", "dev: a time of day")),
    ("is not a date", ex(ID, "2026-13-01", "dev: month 13")),
    ("not allowed", ex(ID, '"2026-12-01"', "dev: a string, not a date")),
    # An id is required, unique, and never a malware advisory.
    ("needs id", '[[IgnoredVulns]]\nignoreUntil = 2026-12-01\nreason = "dev: no id"\n'),
    ("needs id", ex("", "2026-12-01", "dev: empty id")),
    ("needs id", ex("two words", "2026-12-01", "dev: bad id")),
    ("malware advisory", ex("MAL-2026-1234", "2026-12-01", "dev: malware is never an exception")),
    ("listed twice", ex(ID, "2026-12-01", "dev: first") + ex(ID, "2026-12-02", "dev: same id again")),
    (None, ex(ID, "2026-12-01", "dev: first") + ex("CVE-2026-12345", "2026-12-02", "dev: another id")),
    # One bad entry fails the file, even next to good ones.
    ("needs a reason", ex(ID, "2026-12-01", "dev: fine") + ex("GHSA-dddd-eeee-ffff", "2026-12-01", "")),
    # Only [[IgnoredVulns]] with these three keys: anything else could hide a finding outside the rule.
    ("not allowed", '[[PackageOverrides]]\nname = "axios"\nignore = true\n'),
    ("not allowed", ex(ID, "2026-12-01", "dev: ok") + '[[PackageOverrides]]\ngroup = "dev"\nignore = true\n'),
    ("not allowed", ex(ID, "2026-12-01", "dev: ok") + "extra = 1\n"),
    ("not allowed", f'id = "{ID}"\nignoreUntil = 2026-12-01\nreason = "dev: no table"\n'),
    ("not allowed", f"[[IgnoredVulns]]\nid = '{ID}'\nignoreUntil = 2026-12-01\nreason = \"dev: literal string\"\n"),
    ("not allowed", f'[[IgnoredVulns]]\nid = "{ID}"\nignoreUntil = 2026-12-01\nreason = """dev: multi\nline"""\n'),
    ("twice in one exception", f'[[IgnoredVulns]]\nid = "{ID}"\nid = "{ID}"\nignoreUntil = 2026-12-01\nreason = "dev: twice"\n'),
    # Comments and spacing are fine, also after a value, also with a # inside the reason.
    (None, f'# why this file exists\n\n[[IgnoredVulns]] # first\nid = "{ID}" # advisory\nignoreUntil = 2026-12-01 # 16 days\nreason = "dev: tool #1, CI only" # why\n'),
    (None, f'[[IgnoredVulns]]\n  id   =   "{ID}"\n  ignoreUntil=2026-12-01\n  reason="dev: tight spacing"\n'),
]

failed = []
for words, text in CASES:
    bad = mod.check(text, TODAY, "case.toml")
    if words is None and bad:
        failed.append(f"expected a pass, got: {bad}\n{text}")
    elif words is not None and not any(words in b for b in bad):
        failed.append(f"expected a problem with '{words}', got: {bad or 'a pass'}\n{text}")

# The command line: a missing file passes, a bad file exits 1.
if mod.main(["x", os.path.join(here, "no-such-file.toml"), "2026-11-15"]) != 0:
    failed.append("a missing file must pass")

for f in failed:
    print(f, file=sys.stderr)
sys.exit(1 if failed else 0)
