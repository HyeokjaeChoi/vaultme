#!/usr/bin/env python3
"""R17 helper (issues #486, #539): in claude-code-review.yml the job that holds ANTHROPIC_API_KEY has no write path.

check(text) returns problems; main(path) exits 1 on any. Text based, no YAML library (the CI image may not have one).
Rules: the key sits once, in the env of the `claude -p` step of job `review`; that job has read-only permissions, read-only
tools, a deny list for the posting commands, `--permission-mode dontAsk` and `--json-schema`; every job that runs Claude
restores .claude/, CLAUDE.md and .mcp.json from the PR base first; no other job names the key.
"""
import re
import sys

READ_TOOLS = {"Read", "Glob", "Grep", "Agent", "Bash(gh pr view:*)", "Bash(gh pr diff:*)", "Bash(gh issue view:*)"}
DENIED = ("Bash(gh pr comment:*)", "Bash(gh pr edit:*)", "Bash(gh api:*)", "mcp__github_inline_comment__create_inline_comment")
BANNED = ("--dangerously-skip-permissions", "bypassPermissions", "acceptEdits", "claude-code-action", "CLAUDE_CODE_OAUTH_TOKEN", "id-token")


def code(lines):
    return [l for l in lines if not l.lstrip().startswith("#")]


def jobs_of(lines):
    start = next((i for i, l in enumerate(lines) if l.rstrip() == "jobs:"), None)
    out, name = {}, None
    for l in lines[start + 1:] if start is not None else []:
        m = re.match(r"  ([A-Za-z_][\w-]*):\s*$", l)
        if m:
            name = m[1]
            out[name] = []
        elif name:
            out[name].append(l)
    return out


def restore_before(block, marker):
    block = code(block)
    i = next((n for n, l in enumerate(block) if "name: Knowledge files from the PR base" in l), None)
    j = next((n for n, l in enumerate(block) if marker in l), None)
    kb = next((l for l in block if l.lstrip().startswith("kb=")), "")
    return i is not None and j is not None and i < j and all(x in kb for x in (r"\.claude/", "CLAUDE", r"\.mcp\.json"))


def check(text):
    lines = text.split("\n")
    bad = []
    if re.search(r"^permissions:(?!\s*\{\}\s*$)", text, re.M):
        bad.append("a workflow-level permissions block other than `permissions: {}` would reach the key job; set permissions per job")
    if not re.search(r"^permissions: \{\}\s*$", text, re.M):
        bad.append("add `permissions: {}` at the top level (Scorecard Token-Permissions); each job sets its own")
    c = "\n".join(code(lines))
    if re.search(r"npm (install|i|add) .*-g|npm (install|i) .*claude-code", c) or "npm ci --ignore-scripts --prefix" not in c:
        bad.append("install the CLI from .github/review-cli with `npm ci --ignore-scripts --prefix`, not `npm install -g`")
    jobs = jobs_of(lines)
    rev = jobs.get("review")
    if rev is None:
        return bad + ["job `review` is missing"]
    key_lines = [l for l in code(lines) if "secrets.ANTHROPIC_API_KEY" in l]
    in_rev = [l for l in code(rev) if "secrets.ANTHROPIC_API_KEY" in l]
    if len(key_lines) != 1 or len(in_rev) != 1:
        bad.append("secrets.ANTHROPIC_API_KEY must appear once, in job `review`")
    for name, block in jobs.items():
        if name != "review" and "ANTHROPIC_API_KEY" in "\n".join(code(block)):
            bad.append(f"job `{name}` names ANTHROPIC_API_KEY")
    # The key line sits in the env of the step that runs `claude -p`.
    cli = next((i for i, l in enumerate(rev) if re.match(r"\s+claude -p ", l)), None)
    kidx = next((i for i, l in enumerate(rev) if "secrets.ANTHROPIC_API_KEY" in l), None)
    if cli is None or kidx is None:
        bad.append("job `review` must run `claude -p` and set the key")
    else:
        start = max((i for i in range(kidx) if re.match(r"      - ", rev[i])), default=-1)
        nxt = next((i for i in range(kidx + 1, len(rev)) if re.match(r"      - ", rev[i])), len(rev))
        if not (start < cli < nxt and re.match(r"          ANTHROPIC_API_KEY:", rev[kidx])):
            bad.append("the key must be an env entry of the step that runs `claude -p`")
    if not restore_before(rev, "claude -p"):
        bad.append("job `review` must restore .claude/, CLAUDE.md and .mcp.json from the PR base before `claude -p`")
    # Permissions: every entry read.
    perm = next((i for i, l in enumerate(rev) if re.match(r"    permissions:\s*$", l)), None)
    if perm is None:
        bad.append("job `review` needs an explicit permissions block")
    else:
        for l in rev[perm + 1:]:
            if not re.match(r"      \S", l) and l.strip():
                break
            if l.strip() and not l.lstrip().startswith("#") and not re.match(r"\s+[\w-]+:\s*read\s*(#.*)?$", l):
                bad.append(f"job `review` permission is not read: {l.strip()}")
    body = "\n".join(code(rev))
    for b in BANNED:
        if b in body:
            bad.append(f"job `review` must not contain {b}")
    for m in re.findall(r"secrets\.(\w+)", body):
        if m != "ANTHROPIC_API_KEY":
            bad.append(f"job `review` must not use secrets.{m}")
    allowed = next((l for l in code(rev) if re.match(r"\s+ALLOWED_TOOLS:", l)), None)
    if allowed is None:
        bad.append("job `review` needs an ALLOWED_TOOLS env entry")
    else:
        extra = set(allowed.split(":", 1)[1].strip().split(",")) - READ_TOOLS
        if extra:
            bad.append("job `review` allows more than read tools: " + ", ".join(sorted(extra)))
    for need in ("--permission-mode dontAsk", "--json-schema", '--allowedTools "$ALLOWED_TOOLS"', '--disallowedTools "${denied[@]}"') + DENIED:
        if need not in body:
            bad.append(f"job `review` must contain {need}")
    # Posting commands may appear in `review` only inside the deny list.
    for l in code(rev):
        if re.search(r"gh (pr (comment|edit|review|merge)|api|issue (comment|edit))|--method|curl ", l) and not l.lstrip().startswith(("denied=", "ALLOWED_TOOLS:", "DENIED")) and "gh pr view" not in l:
            bad.append("job `review` has a posting command: " + l.strip()[:80])
    for name, block in jobs.items():
        b = "\n".join(code(block))
        if name != "review" and re.search(r"claude -p ", b):
            bad.append(f"job `{name}` runs claude -p; only `review` does")
        if "claude-code-action" in b and not restore_before(block, "uses: anthropics/claude-code-action"):
            bad.append(f"job `{name}` runs claude-code-action before the PR-base restore")
    return bad


if __name__ == "__main__":
    problems = check(open(sys.argv[1], encoding="utf-8").read())
    for p in problems:
        print(p, file=sys.stderr)
    sys.exit(1 if problems else 0)
