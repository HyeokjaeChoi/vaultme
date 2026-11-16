#!/usr/bin/env python3
"""Cases for scripts/check-review-workflow.py (issue #539). Run by R17 in check-repo-rules.sh. Silent on success.

Each case changes the real workflow text in one way that gives the key job a write path or breaks the order; the
check must report it. The real file itself must pass.
"""
import importlib.util
import os
import sys

sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("crw", os.path.join(here, "check-review-workflow.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)
real = open(os.path.join(here, "..", ".github", "workflows", "claude-code-review.yml"), encoding="utf-8").read()
failed = []


def mutate(name, old, new, count=1):
    if old not in real:
        failed.append(f"{name}: the case text is not in the workflow (update the case): {old[:50]!r}")
        return
    if not mod.check(real.replace(old, new, count)):
        failed.append(f"{name}: no problem reported")


if mod.check(real):
    failed.append("the real workflow has problems: " + "; ".join(mod.check(real)))

mutate("write permission", "      pull-requests: read\n      issues: read\n    outputs:", "      pull-requests: write\n      issues: read\n    outputs:")
mutate("id-token", "      issues: read\n    outputs:", "      issues: read\n      id-token: write\n    outputs:")
mutate("no permissions block", "    # Read only, on purpose: the key and the model live here. A write permission here fails R17.\n    permissions:\n", "    # x\n    zzz:\n")
mutate("a shell tool allowed", "ALLOWED_TOOLS: Read,", "ALLOWED_TOOLS: Bash(gh pr view:*),Read,")
mutate("write tool allowed", "ALLOWED_TOOLS: Read,", "ALLOWED_TOOLS: Write,Read,")
mutate("inline comment tool", "ALLOWED_TOOLS: Read,", "ALLOWED_TOOLS: mcp__github_inline_comment__create_inline_comment,Read,")
mutate("no dontAsk", "--permission-mode dontAsk \\", "--permission-mode default \\")
mutate("bypass", "--permission-mode dontAsk \\", "--permission-mode bypassPermissions \\")
mutate("no json schema", "--json-schema \"$(", "--x \"$(")
mutate("deny list dropped", "'Read(//proc/**)' ", "")
mutate("Bash not denied", "denied=('Bash' ", "denied=(")
mutate("extra flag", "--permission-mode dontAsk \\", "--permission-mode dontAsk --settings x \\")
mutate("secrets as a whole", "      PR: ${{ github.event.pull_request.number }}\n      SHA:", "      PR: ${{ toJSON(secrets) }}\n      SHA:")
mutate("key in second place", "      PR: ${{ github.event.pull_request.number }}\n      SHA:", "      K: ${{ secrets.ANTHROPIC_API_KEY }}\n      SHA:")
mutate("key in the post job", "      GH_TOKEN: ${{ github.token }}\n    steps:", "      GH_TOKEN: ${{ github.token }}\n      ANTHROPIC_API_KEY: x\n    steps:")
mutate("key at job level", "      PR: ${{ github.event.pull_request.number }}\n      # Read tools", "      ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n      PR: ${{ github.event.pull_request.number }}\n      # Read tools")
mutate("oauth in key job", "          GH_TOKEN: ${{ github.token }} # read only", "          T: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}\n          GH_TOKEN: ${{ github.token }} # read only")
mutate("posting in key job", "          rc=0\n", "          gh pr comment 1 --body x\n          rc=0\n")
mutate("restore dropped", "(^|/)\\.claude/|", "")
mutate("restore moved after the CLI", "name: Knowledge files from the PR base", "name: Restore later", 1)
mutate("fallback without restore", "      # Same rule as in the `review` job: the review knowledge comes from the PR base.\n      - name: Knowledge files from the PR base", "      - name: Other")
mutate("claude -p in another job", "        run: python3 scripts/review-output.py post", "        run: claude -p x # python3 scripts/review-output.py post")
mutate("workflow-level permissions", "permissions: {}\n", "permissions:\n  contents: write\n")
mutate("no top-level permissions", "permissions: {}\n", "")
mutate("CLI installed unpinned", 'npm ci --ignore-scripts --prefix "$cli"', "npm install -g @anthropic-ai/claude-code@2.1.302")

# review-learn.yml: the same rules for job `propose` (default branch, no PR-base restore).
learn = open(os.path.join(here, "..", ".github", "workflows", "review-learn.yml"), encoding="utf-8").read()
if mod.check(learn, "propose", False):
    failed.append("the real review-learn.yml has problems: " + "; ".join(mod.check(learn, "propose", False)))


def mutate_learn(name, old, new):
    if old not in learn:
        failed.append(f"learn {name}: the case text is not in the workflow (update the case): {old[:50]!r}")
    elif not mod.check(learn.replace(old, new, 1), "propose", False):
        failed.append(f"learn {name}: no problem reported")


mutate_learn("shell allowed", "ALLOWED_TOOLS: Read,Glob,Grep", "ALLOWED_TOOLS: Read,Glob,Grep,Bash(pnpm turbo run:*)")
mutate_learn("write allowed", "ALLOWED_TOOLS: Read,Glob,Grep", "ALLOWED_TOOLS: Read,Glob,Grep,Edit,Write")
mutate_learn("Edit not denied", "'Bash' 'Edit' ", "'Bash' ")
mutate_learn("Bash not denied", "denied=('Bash' ", "denied=(")
mutate_learn("write permission", "      pull-requests: read\n      issues: read\n    outputs:\n      reason:", "      pull-requests: write\n      issues: read\n    outputs:\n      reason:")
mutate_learn("no dontAsk", "--permission-mode dontAsk \\", "--permission-mode default \\")
mutate_learn("extra flag", "--permission-mode dontAsk \\", "--permission-mode dontAsk --settings x \\")
mutate_learn("key in apply", "      GH_TOKEN: ${{ steps.app.outputs.token }}\n", "      GH_TOKEN: ${{ steps.app.outputs.token }}\n          K: ${{ secrets.ANTHROPIC_API_KEY }}\n")
mutate_learn("no top-level permissions", "permissions: {}\n", "")
mutate_learn("claude -p in apply", "run: python3 scripts/review-learn-apply.py", "run: claude -p x # python3 scripts/review-learn-apply.py")
mutate_learn("oauth in key job", "          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n", "          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}\n          T: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}\n")

for f in failed:
    print(f, file=sys.stderr)
sys.exit(1 if failed else 0)
