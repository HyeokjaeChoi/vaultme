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

# R1. No private keys or 32-byte hex secrets in tracked source.
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

# R7. README.md and README.ko.md stay in step (issue 11): same heading levels in the same
# order, same set of relative link targets, every target exists in the working tree,
# and each links to the other. Inline [text](path) links only. In-page #anchors are
# ignored (Korean headings give other anchors). Fenced code is skipped.
if ! python3 - <<'PY'
import os, re, sys

def scan(text):
    levels, links, fenced = [], set(), False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if fenced:
            continue
        m = re.match(r" {0,3}(#{1,6})\s", line)
        if m:
            levels.append(len(m.group(1)))
        for t in re.findall(r"\]\(([^)\s]+)\)", line):
            if not t.startswith(("#", "http://", "https://", "mailto:")):
                links.add(t)
    return levels, links

try:
    en, ko = scan(open("README.md").read()), scan(open("README.ko.md").read())
except OSError:
    sys.exit("error: README.md or README.ko.md is missing")
bad = []
if en[0] != ko[0]:
    bad.append(f"heading level order differs: README.md {en[0]} vs README.ko.md {ko[0]}")
# each file links to the other by design; exempt only that one link per file
for name, a, b, other in (("README.md", en[1], ko[1], "README.ko.md"), ("README.ko.md", ko[1], en[1], "README.md")):
    diff = (a - b) - {other}
    if diff:
        bad.append(f"link targets only in {name}: {sorted(diff)}")
for name, (_, links) in (("README.md", en), ("README.ko.md", ko)):
    for t in sorted(links):
        path = t.split("#", 1)[0].rstrip("/")
        if path and not os.path.exists(path):
            bad.append(f"{name} links to {t}, which does not exist")
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

# R8. Worker config holds vars only: no account IDs or secret-like keys in wrangler.jsonc, and no
# tracked .dev.vars (only .dev.vars.example). Secrets go in .dev.vars (local) or `wrangler secret`.
if [ -f apps/api/wrangler.jsonc ] && grep -niE '"(account_id|[A-Za-z_]*(secret|token|api_?key|password|private_?key)[A-Za-z_]*)" *:' apps/api/wrangler.jsonc; then
  err "R8: wrangler.jsonc must hold vars only; no account_id or secrets"
fi
if files | grep -E '(^|/)\.dev\.vars($|\.)' | grep -v '\.dev\.vars\.example$'; then
  err "R8: .dev.vars is tracked"
fi

# R9. AGENTS.md is the SSOT. A CLAUDE.md file would stop Claude Code from reading AGENTS.md.
# Any directory counts: a nested CLAUDE.md stops AGENTS.md loading when Claude Code starts there.
while IFS= read -r f; do
  case "$f" in
    */CLAUDE.local.md|CLAUDE.local.md) err "R9: remove $f; put personal notes in ~/.claude/CLAUDE.md" ;;
    *) err "R9: remove $f; put shared rules in AGENTS.md or docs/agents/ (Claude Code reads AGENTS.md directly)" ;;
  esac
done < <(git ls-files --cached --others --exclude-standard | grep -E '(^|/)(CLAUDE\.md|CLAUDE\.local\.md)$' || true)

# R10. No recovery phrase in tracked text except public test vectors. Any run of 12+ BIP39 words
# (scripts/bip39-english.txt, SHA-256 2f5eed53...dbda) must be one of the allowed vectors below.
if ! git ls-files -z --cached --others --exclude-standard | python3 -c '
import re, sys
words = set(open("scripts/bip39-english.txt").read().split())
allow = {
    " ".join(["abandon"] * 11 + ["about"]),   # BIP39 test vector, address 0x9858...da94 (also with passphrase TREZOR)
    " ".join(["abandon"] * 23 + ["art"]),     # BIP39 24-word test vector
    " ".join(["test"] * 11 + ["junk"]),       # Hardhat/viem dev vector, address 0xf39F...2266, tests only
}
skip = re.compile(r"(\.(png|jpe?g|gif|webp|ttf|otf|woff2?|pdf|ico)$)|(^|/)(generated|node_modules)/|pnpm-lock\.yaml$|^scripts/bip39-english\.txt$|^work/")
token = re.compile(r"[A-Za-z]+")
bad = 0
for f in sys.stdin.read().split("\0"):
    if not f or skip.search(f):
        continue
    try:
        raw = open(f, "rb").read()
    except OSError:
        continue
    try:
        text = raw.decode("utf-16") if raw[:2] in (b"\xff\xfe", b"\xfe\xff") else raw.decode("utf-8")
    except UnicodeDecodeError:
        # A text file R10 cannot read is a finding, not a pass. Add true binary types to skip.
        print(f"{f}: not UTF-8 or UTF-16 text; R10 cannot check it", file=sys.stderr)
        bad = 1
        continue
    # A run is consecutive BIP39 words (any case) across punctuation and line breaks; any other word ends it.
    run, start = [], 0
    for m in list(token.finditer(text)) + [None]:
        w = m.group(0).lower() if m else ""
        if w in words:
            if not run:
                start = m.start()
            run.append(w)
            continue
        if len(run) >= 12:
            # Cut out each allowed vector; any 12+ word remainder is still a finding.
            # Exact match is not used: identifiers next to a vector (PUBLIC_JUNK_PHRASE) are BIP39 words too.
            phrase = " ".join(run)
            for a in sorted(allow, key=len, reverse=True):
                phrase = phrase.replace(a, "|")
            if any(len(seg.split()) >= 12 for seg in phrase.split("|")):
                print(f"{f}:{text.count(chr(10), 0, start) + 1}: {len(run)} BIP39 words in a row", file=sys.stderr)
                bad = 1
        run = []
sys.exit(bad)
'; then
  err "R10: possible recovery phrase; only the public test vectors in R10 are allowed"
fi

exit "$fail"
