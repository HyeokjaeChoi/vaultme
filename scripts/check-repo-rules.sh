#!/usr/bin/env bash
# Fast repo rules. Runs in the pre-commit hook and in CI (.github/workflows/ci.yml).
# Add a check here when a review finding repeats (docs/agents/workflow.md step 9).
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
fail=0
err() { echo "check-repo-rules: $*" >&2; fail=1; }

files() { git ls-files --cached --others --exclude-standard -- "$@" 2>/dev/null; }
# scan <regex> <pathspec...>: grep only when the list is not empty (BSD xargs runs on empty input).
scan() { local re="$1"; shift; local list; list="$(files "$@" | grep -v -e '/generated/' -e 'pnpm-lock' || true)"; [ -n "$list" ] && printf '%s\n' "$list" | tr '\n' '\0' | xargs -0 grep -nE -- "$re"; }

# R1. No private keys or 32-byte hex secrets in tracked source (AGENTS.md rule 4).
if scan '-----BEGIN [A-Z ]*PRIVATE KEY-----|privateKey: *["'\'']0x[0-9a-fA-F]{64}' 'apps/**' 'packages/**'; then
  err "R1: private key material found"
fi

# R2. No raw hex colors in app UI code. Use packages/tokens (lld.md §1.1).
if scan "['\"]#[0-9a-fA-F]{3,8}['\"]" 'apps/mobile/src/**/*.ts' 'apps/mobile/src/**/*.tsx' 'apps/mobile/app/**/*.tsx'; then
  err "R2: raw hex color in apps/mobile; use token values"
fi

# R3. No .env files committed.
if files | grep -E '(^|/)\.env($|\.)' | grep -v '\.env\.example$'; then
  err "R3: .env file is tracked"
fi

# R4. Landing-page section gaps are banned in app code (retro 2026-10-13).
if scan 'sectionGap\.(mobile|desktop)' 'apps/mobile/**/*.ts' 'apps/mobile/**/*.tsx'; then
  err "R4: use semantic.layout.sectionGap.product (or groupGap/rowGap/fieldGap) in apps/mobile"
fi

# R5. No numeric literals for spacing, radius or type in app styles. Use @vaultme/tokens. 0 is allowed.
# Matches non-zero values, including decimals (0.5) and negatives (-4).
num='-?(0?\.[0-9]*[1-9]|[1-9][0-9.]*)'
if scan "\\b(padding|margin)(Horizontal|Vertical|Top|Bottom|Left|Right|Start|End)?: *$num|\\b(gap|rowGap|columnGap|fontSize|lineHeight|letterSpacing): *$num|\\bborder[A-Za-z]*Radius: *$num" 'apps/mobile/src/**/*.tsx' 'apps/mobile/src/**/*.ts' 'apps/mobile/app/**/*.tsx'; then
  err "R5: numeric style literal in apps/mobile; use @vaultme/tokens"
fi

# R6. Each shared UI primitive names its Figma component (retro 2026-10-13).
for f in $(files 'apps/mobile/src/shared/ui/*.tsx'); do
  head -3 "$f" | grep -q '// Figma: ' || err "R6: $f has no '// Figma: <name> <node id>' header"
done

# R7. README.md and README.ko.md stay in step (issue 11): same heading count per
# level, same set of relative link targets, every target exists in the index, and
# each links to the other. In-page #anchors are ignored (Korean headings give other
# anchors). Fenced code is skipped.
if ! python3 - <<'PY'
import re, subprocess, sys

def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True, check=True).stdout

def scan(text):
    levels, links, fenced = {}, set(), False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue
        m = re.match(r"(#{1,6})\s", line)
        if m:
            levels[len(m.group(1))] = levels.get(len(m.group(1)), 0) + 1
        for t in re.findall(r"\]\(([^)\s]+)\)", line):
            if not t.startswith(("#", "http://", "https://", "mailto:")):
                links.add(t)
    return levels, links

try:
    en, ko = scan(git("show", ":README.md")), scan(git("show", ":README.ko.md"))
except subprocess.CalledProcessError:
    sys.exit("error: README.md or README.ko.md is not in the git index")
bad = []
if en[0] != ko[0]:
    bad.append(f"heading counts per level differ: README.md {sorted(en[0].items())} vs README.ko.md {sorted(ko[0].items())}")
mutual = {"README.md", "README.ko.md"}  # each file links to the other by design
for name, a, b in (("README.md", en[1], ko[1]), ("README.ko.md", ko[1], en[1])):
    diff = (a - b) - mutual
    if diff:
        bad.append(f"link targets only in {name}: {sorted(diff)}")
files = set(git("ls-files").splitlines())
dirs = {f.rsplit("/", i)[0] for f in files for i in range(1, f.count("/") + 1)}
for name, (_, links) in (("README.md", en), ("README.ko.md", ko)):
    for t in sorted(links):
        path = t.split("#", 1)[0].rstrip("/")
        if path and path not in files and path not in dirs:
            bad.append(f"{name} links to {t}, which is not in the git index")
if "README.ko.md" not in en[1]:
    bad.append("README.md has no link to README.ko.md")
if "README.md" not in ko[1]:
    bad.append("README.ko.md has no link to README.md")
for b in bad:
    print("error: " + b, file=sys.stderr)
sys.exit(1 if bad else 0)
PY
then
  err "R7: README.md and README.ko.md drifted (see above)"
fi

exit "$fail"
