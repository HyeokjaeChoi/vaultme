#!/usr/bin/env python3
"""review-learn.yml, job `apply` (no API key): turn the model's proposal (scripts/review-output.py scan ... learn) into files.

  review-learn-apply.py <proposal.json>   Writes the edits, .review-learn/title.txt and .review-learn/body.md.

The model returns edits as data; it never edits the tree. Only the paths below can change (the loop adds a check, a test
or a lesson), each `old` text must match exactly once, and any problem rejects the whole proposal (nothing is written).
scripts/review-learn-pr.sh then refuses .github, .githooks and agent config again.
"""
import importlib.util
import json
import os
import re
import sys

sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("ro", os.path.join(here, "review-output.py"))
ro = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ro)

ALLOWED = re.compile(
    r"scripts/check-repo-rules\.sh|AGENTS\.md|\.claude/skills/vaultme-review-lessons/SKILL\.md"
    r"|scripts/[A-Za-z0-9_.-]+\.test\.(sh|py)|(apps|packages)/[A-Za-z0-9_./-]+\.test\.(ts|tsx)"
)


def plan(proposal, read):
    """(files {path: new text}, problems). `read(path)` returns the current text or None."""
    bad = ro.validate_learn(proposal)
    files = {}
    for i, e in enumerate(proposal.get("edits", []) if not bad else []):
        p = e["path"]
        if not ALLOWED.fullmatch(p) or ".." in p.split("/"):
            bad.append(f"edit {i}: path {p!r} is not one the loop may change")
            continue
        cur = files[p] if p in files else read(p)
        if e["old"] == "":
            if cur is not None:
                bad.append(f"edit {i}: {p} exists; give the text to replace")
            else:
                files[p] = e["new"]
        elif cur is None or cur.count(e["old"]) != 1:
            bad.append(f"edit {i}: the text to replace must appear exactly once in {p}")
        else:
            files[p] = cur.replace(e["old"], e["new"], 1)
    return files, bad


def main(path):
    proposal = json.load(open(path, encoding="utf-8"))
    read = lambda p: open(p, encoding="utf-8").read() if os.path.isfile(p) else None
    files, bad = plan(proposal, read)
    if bad:
        print("::error::Proposal rejected: " + "; ".join(bad[:5]))
        return 1
    if not files:
        print("No edits: nothing to propose.")
        return 0
    for p, text in files.items():
        os.makedirs(os.path.dirname(p) or ".", exist_ok=True)
        open(p, "w", encoding="utf-8").write(text)
    os.makedirs(".review-learn", exist_ok=True)
    open(".review-learn/title.txt", "w", encoding="utf-8").write(ro.redact(proposal["title"]).strip() + "\n")
    open(".review-learn/body.md", "w", encoding="utf-8").write(ro.redact(proposal["body"]).strip() + "\n")
    print("Applied edits to: " + ", ".join(sorted(files)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]) if len(sys.argv) == 2 else sys.exit(__doc__))
