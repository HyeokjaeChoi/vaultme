#!/usr/bin/env python3
"""Cases for scripts/review-learn-apply.py and the learn proposal checks in review-output.py (issue #613). Silent on success."""
import importlib.util
import os
import sys

sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))


def load(name, file):
    s = importlib.util.spec_from_file_location(name, os.path.join(here, file))
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


ap, ro = load("ap", "review-learn-apply.py"), load("ro", "review-output.py")
R17 = "check-review-workflow.py .github/workflows/claude-code-review.yml check-review-workflow.py .github/workflows/review-learn.yml learn check-review-workflow.test.py review-output.test.py review-learn-apply.test.py"
FILES = {"AGENTS.md": "a\nb\nb\n", "scripts/check-repo-rules.sh": "x\n" + R17 + "\n"}
read = FILES.get
fails = []


def prop(*edits, title="t", body="b"):
    return {"title": title, "body": body, "edits": [dict(zip(("path", "old", "new"), e)) for e in edits]}


def case(name, p, want_ok, want_files=None):
    files, bad = ap.plan(p, read)
    if bool(bad) == want_ok or (want_files is not None and files != want_files):
        fails.append(f"{name}: problems={bad} files={files}")


case("replace once", prop(("AGENTS.md", "a\n", "A\n")), True, {"AGENTS.md": "A\nb\nb\n"})
case("two edits on one file", prop(("AGENTS.md", "a\n", "A\n"), ("AGENTS.md", "A\n", "Z\n")), True, {"AGENTS.md": "Z\nb\nb\n"})
case("create a test", prop(("scripts/new.test.sh", "", "echo\n")), True, {"scripts/new.test.sh": "echo\n"})
case("create over an existing file", prop(("AGENTS.md", "", "x")), False)
case("text twice", prop(("AGENTS.md", "b\n", "c\n")), False)
case("text missing", prop(("AGENTS.md", "zzz", "c")), False)
case("empty proposal", prop(title="", body=""), True, {})
for bad_path in (".github/workflows/x.yml", "CLAUDE.md", "../AGENTS.md", "scripts/review-output.py", "scripts/review-learn-pr.sh",
                 "scripts/x/../check-repo-rules.sh", ".claude/settings.json", ".claude/agents/review-finder.md", "package.json",
                 "apps/mobile/src/app.ts", "scripts/check-repo-rules.sh.bak", "/etc/passwd"):
    case(f"path {bad_path}", prop((bad_path, "", "x")), False)
case("add a rule, keep R17", prop(("scripts/check-repo-rules.sh", "x\n", "x\n# R99\n")), True)
case("remove the R17 lines", prop(("scripts/check-repo-rules.sh", R17, "")), False)
case("remove one R17 line", prop(("scripts/check-repo-rules.sh", "review-output.test.py", "")), False)
for protected in ("scripts/check-review-workflow.test.py", "scripts/review-learn-apply.test.py", "scripts/review-output.test.py"):
    case(f"protected {protected}", prop((protected, "", "x")), False)
case("a test file in a package", prop(("packages/tokens/test/x.test.ts", "", "x")), True)
case("lessons skill is allowed", prop((".claude/skills/vaultme-review-lessons/SKILL.md", "", "x")), True)  # absent in FILES, so a create
case("edits without a title", prop(("AGENTS.md", "a\n", "A\n"), title=""), False)
case("title with a line break", prop(("AGENTS.md", "a\n", "A\n"), title="a\nb"), False)
case("not an object", [], False)
case("extra key", {**prop(("AGENTS.md", "a\n", "A\n")), "run": "x"}, False)
case("too many edits", prop(*[("AGENTS.md", "a\n", "a\n")] * 21), False)

for f in fails:
    print(f, file=sys.stderr)
sys.exit(1 if fails else 0)
