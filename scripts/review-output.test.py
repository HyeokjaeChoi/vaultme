#!/usr/bin/env python3
"""Cases for scripts/review-output.py (issue #539). Run by R17 in check-repo-rules.sh. Silent on success.

The key in these cases is a dummy value. The real key never appears in a test.
"""
import base64
import importlib.util
import os
import sys
import urllib.parse

sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ro", os.path.join(here, "review-output.py"))
ro = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ro)

KEY = "sk-ant-api03-DUMMY_dummy-1234567890abcdef"
SHA = "a" * 40
failures = []


def check(name, got, want):
    if got != want:
        failures.append(f"{name}: got {got!r}, want {want!r}")


# leaks(): the exact key value and its simple encodings. Never the key itself in the message.
for name, text in {
    "raw": f"see {KEY} here",
    "reversed": KEY[::-1],
    "base64": base64.b64encode(KEY.encode()).decode(),
    "base64 url": base64.urlsafe_b64encode(KEY.encode()).decode(),
    "hex": KEY.encode().hex(),
    "url-encoded": urllib.parse.quote(KEY, safe=""),
    "split by spaces": " ".join(KEY),
    "split by a line break": KEY[:10] + "\n" + KEY[10:],
}.items():
    check(f"leaks {name}", ro.leaks(text, KEY), True)
check("leaks clean", ro.leaks("A normal finding about sk-ant- prefixes.", KEY), False)
check("leaks empty key", ro.leaks("anything", ""), False)

# redact(): token shapes, also when the key value is unknown to this step.
for s in ("sk-ant-api03-abcdefghij1234", "ghp_" + "a" * 36, "github_pat_" + "A" * 30, "sk-" + "b" * 40):
    check(f"redact {s[:8]}", s in ro.redact(f"x {s} y"), False)
check("redact keeps prose", ro.redact("Use the sk-ant- prefix check."), "Use the sk-ant- prefix check.")

OK = {"summary": "Findings: none.", "comments": [{"path": "a/b.ts", "line": 3, "body": "**Minor · x** y"}]}


def problems(obj):
    return ro.validate(obj)


check("valid", problems(OK), [])
check("valid no comments", problems({"summary": "s", "comments": []}), [])
check("valid range", problems({"summary": "s", "comments": [{**OK["comments"][0], "start_line": 1}]}), [])
for name, bad in {
    "not an object": [],
    "no summary": {"comments": []},
    "empty summary": {"summary": " ", "comments": []},
    "summary not text": {"summary": 5, "comments": []},
    "summary too long": {"summary": "x" * 20001, "comments": []},
    "extra key": {"summary": "s", "comments": [], "run": "rm -rf /"},
    "comments not a list": {"summary": "s", "comments": "x"},
    "too many comments": {"summary": "s", "comments": [OK["comments"][0]] * 41},
    "comment extra key": {"summary": "s", "comments": [{**OK["comments"][0], "side": "LEFT"}]},
    "comment no path": {"summary": "s", "comments": [{"line": 1, "body": "b"}]},
    "path escapes": {"summary": "s", "comments": [{**OK["comments"][0], "path": "../etc/passwd"}]},
    "path absolute": {"summary": "s", "comments": [{**OK["comments"][0], "path": "/etc/passwd"}]},
    "line zero": {"summary": "s", "comments": [{**OK["comments"][0], "line": 0}]},
    "line bool": {"summary": "s", "comments": [{**OK["comments"][0], "line": True}]},
    "start after line": {"summary": "s", "comments": [{**OK["comments"][0], "start_line": 9}]},
    "empty body": {"summary": "s", "comments": [{**OK["comments"][0], "body": ""}]},
    "body too long": {"summary": "s", "comments": [{**OK["comments"][0], "body": "x" * 8001}]},
}.items():
    check(f"invalid {name}", bool(problems(bad)), True)

# extract(): the CLI result file. The model's own free text is never used as a review.
check("extract ok", ro.extract({"is_error": False, "structured_output": OK}), OK)
check("extract error", ro.extract({"is_error": True, "structured_output": OK}), None)
check("extract none", ro.extract({"is_error": False, "result": "text only"}), None)

# summary_text(): the workflow, not the model, writes the marker line; a marker in the model text is removed.
body = ro.summary_text(SHA, "<!-- ai-review:" + "b" * 40 + " -->\nHello <!-- ai-review:x -->")
check("marker first", body.splitlines()[0], f"<!-- ai-review:{SHA} -->")
check("one marker", body.count("ai-review:"), 1)
check("redacted in summary", KEY[:12] in ro.summary_text(SHA, f"key {KEY}"), False)

for f in failures:
    print(f, file=sys.stderr)
sys.exit(1 if failures else 0)
