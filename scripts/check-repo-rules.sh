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

# R2. No raw hex colors in app UI code. Use packages/tokens (AGENTS.md "Enforced rules").
if scan "['\"]#[0-9a-fA-F]{3,8}['\"]" 'apps/mobile/src/**/*.ts' 'apps/mobile/src/**/*.tsx' 'apps/mobile/app/**/*.tsx'; then
  err "R2: raw hex color in apps/mobile; use token values"
fi
if scan "['\"\`]#[0-9a-fA-F]{3,8}['\"\`]|\\b(rgb|hsl)a?\\(" 'apps/web/app/*.ts' 'apps/web/app/*.tsx'; then
  err "R2: raw color in apps/web/app; use a token utility (text-text-primary, bg-surface-subtle, ...)"
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

# R5 for apps/web: Tailwind classes. An arbitrary value (p-[13px], text-[#fff], w-[calc(...)]) bypasses the token theme (ADR-0012:
# Tailwind v4 theme with no default palette or spacing). Numeric style objects are banned the same way.
if scan "(^|[^A-Za-z0-9_])[a-z][a-z0-9:-]*-\\[[^]]+\\]" 'apps/web/app/*.tsx' 'apps/web/app/*.ts'; then
  err "R5: Tailwind arbitrary value in apps/web/app; use a token utility"
fi
if scan "\\b(padding|margin|gap|fontSize|lineHeight|letterSpacing|width|height|borderRadius)[A-Za-z]*: *$num" 'apps/web/app/*.tsx'; then
  err "R5: numeric style literal in apps/web/app; use a token utility"
fi
# apps/web section gaps: the landing-page scale is allowed on the landing page only (route files named landing*), never in shared UI or the viewer.
if scan 'section-gap-(mobile|desktop)' 'apps/web/app/shared/**' 'apps/web/app/routes/address*' 'apps/web/app/routes/tx*' 'apps/web/app/routes/not-found*'; then
  err "R4: use section-gap-product in apps/web outside the landing page"
fi

# R6. Each shared UI primitive names its Figma component (retro 2026-10-13).
for f in $(files 'apps/mobile/src/shared/ui/*.tsx' 'apps/web/app/shared/ui/*.tsx'); do
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
for w in apps/api/wrangler.jsonc apps/web/wrangler.jsonc; do
  if [ -f "$w" ] && grep -niE '"(account_id|[A-Za-z_]*(secret|token|api_?key|password|private_?key)[A-Za-z_]*)" *:' "$w"; then
    err "R8: $w must hold vars only; no account_id or secrets"
  fi
done
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
skip = re.compile(r"(\.(png|jpe?g|gif|webp|avif|ttf|otf|woff2?|pdf|ico)$)|(^|/)node_modules/|pnpm-lock\.yaml$|^scripts/bip39-english\.txt$|^work/")
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
        if raw[:2] in (b"\xff\xfe", b"\xfe\xff"):
            text = raw.decode("utf-16")
        elif b"\0" in raw:
            # BOM-less UTF-16 (or any NUL data) decodes as UTF-8 with NULs between letters, hiding every word.
            raise UnicodeDecodeError("utf-8", raw, 0, 1, "NUL byte without a UTF-16 BOM")
        else:
            text = raw.decode("utf-8")
    except UnicodeDecodeError:
        # A text file R10 cannot read is a finding, not a pass.
        print(f"{f}: not UTF-8 or BOM-marked UTF-16 text; R10 cannot check it (add a true binary type to skip)", file=sys.stderr)
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

# R11. Markdown references must resolve. In tracked *.md outside work/: every relative [x](path) link and every
# backticked token that looks like a repo file path (has "/" and a known extension) must exist. Skipped: URLs,
# #anchors, fenced code, tokens with glob or placeholder characters, and tokens that start with "/" (URL paths).
# A backticked token also passes when a tracked file ends with it (so `shared/lib/address.ts` works).
if ! { files; echo ---; files '*.md' ':!work/**'; } | python3 -c '
import os, re, sys
raw = sys.stdin.read().split("\n---\n")
allf = set(raw[0].split("\n")); mds = [m for m in raw[1].split("\n") if m and os.path.exists(m)]
ext = r"(?:md|ts|tsx|js|mjs|cjs|json|jsonc|yml|yaml|sh|sql|toml|css|html)"
def ok(t, base):
    t = t.split("#", 1)[0]
    return not t or os.path.exists(os.path.normpath(os.path.join(base, t))) or os.path.exists(t) or any(f.endswith("/" + t) for f in allf)
bad = 0
for m in mds:
    base, fenced = os.path.dirname(m), False
    for n, line in enumerate(open(m, encoding="utf-8", errors="replace"), 1):
        if line.lstrip().startswith(("```", "~~~")):
            fenced = not fenced
            continue
        if fenced:
            continue
        # A link resolves from the Markdown file folder, as GitHub renders it. An optional "title" may follow.
        for t in re.findall(r"\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)", line):
            t = t.split("#", 1)[0]
            if t and not t.startswith(("http://", "https://", "mailto:")) and not os.path.exists(os.path.normpath(os.path.join(base, t))):
                print(f"{m}:{n}: broken link {t}", file=sys.stderr); bad = 1
        for t in re.findall(r"`([^`\s]+)`", line):
            if "/" in t and not t.startswith(("/", "http")) and not re.search(r"[*<>{}$:]", t) and re.search(r"\." + ext + r"(#.*)?$", t) and not ok(t, "."):
                print(f"{m}:{n}: missing path {t}", file=sys.stderr); bad = 1
sys.exit(bad)
'; then
  err "R11: broken Markdown link or repo path (see above)"
fi

# R12. The Claude Code guard hook still blocks what it should (#124).
if ! bash .claude/hooks/guard-bash.test.sh >/dev/null; then
  err "R12: .claude/hooks/guard-bash.test.sh failed (run it to see the case)"
fi

# R13. Every package waits 7 days, with no exceptions (#142): pnpm minimumReleaseAge >= 10080 and no
# minimumReleaseAgeExclude, so no tool (Renovate security updates included) can add one past CI.
if ! awk '/^minimumReleaseAge:/ { ok = ($2 >= 10080) } END { exit !ok }' pnpm-workspace.yaml; then
  err "R13: pnpm-workspace.yaml minimumReleaseAge must be 10080 (7 days) or more"
fi
if grep -nE '^[[:space:]]*minimumReleaseAgeExclude' pnpm-workspace.yaml; then
  err "R13: no minimumReleaseAgeExclude in pnpm-workspace.yaml; wait 7 days instead"
fi

# R14. The decision ledger covers every requirements decision (#304): docs/decisions.md has one row per Q1-Q81 with a
# valid status; a GAP row links an issue; a SUPERSEDED row names its record (ADR, issue/PR or commit). The ADR-0021
# libraries stay installed, so the state decision cannot silently drop again (Q62 and Q65 were lost this way).
if ! python3 - <<'PY'
import json, re, sys
bad = []
rows = {}
for line in open("docs/decisions.md", encoding="utf-8"):
    m = re.match(r"\| Q(\d+) \|[^|]*\| ([A-Z-]+) \|([^|]*)\|", line)
    if m:
        q, status, record = int(m[1]), m[2], m[3]
        if q in rows: bad.append(f"Q{q}: more than one row")
        rows[q] = status
        if status not in ("IMPLEMENTED", "SUPERSEDED", "GAP", "NOT-APPROVED"): bad.append(f"Q{q}: unknown status {status}")
        if status == "GAP" and not re.search(r"#\d+", record): bad.append(f"Q{q}: GAP needs an issue (#N)")
        if status == "SUPERSEDED" and not re.search(r"ADR-\d{4}|#\d+|\b[0-9a-f]{7,40}\b|\bQ\d+\b", record): bad.append(f"Q{q}: SUPERSEDED needs its record")
bad += [f"Q{q}: no row" for q in range(1, 82) if q not in rows]
deps = {
    "apps/mobile/package.json": ["@tanstack/react-query", "zustand", "react-hook-form", "zod"],
    "apps/web/package.json": ["@tanstack/react-query"],
}
for f, names in deps.items():
    d = json.load(open(f)).get("dependencies", {})
    bad += [f"{f}: ADR-0021 needs {n} in dependencies" for n in names if n not in d]
for b in bad: print(b, file=sys.stderr)
sys.exit(1 if bad else 0)
PY
then
  err "R14: docs/decisions.md or ADR-0021 libraries (see above)"
fi

# R15. wallet-core runs only viem and @scure/bip39 (Q74, #312): a new dependency (also optional or peer) there is a supply-chain change
# that needs an owner decision, so it fails here until this list changes.
if ! node -e '
const p = require("./packages/wallet-core/package.json")
const d = ["dependencies", "optionalDependencies", "peerDependencies"].flatMap((k) => Object.keys(p[k] ?? {})).sort().join(",")
if (d !== "@scure/bip39,viem") { console.error("packages/wallet-core dependencies: " + d); process.exit(1) }
'; then
  err "R15: packages/wallet-core dependencies must be exactly viem and @scure/bip39"
fi

# R16. D1 migrations do not break the old Worker (Q53, #316): no DROP COLUMN, DROP TABLE or RENAME without `-- contract-ok: <reason>`.
# The test file holds the negative cases.
if ! bash scripts/check-migrations.test.sh; then
  err "R16: scripts/check-migrations.test.sh failed"
fi
if ! bash scripts/check-migrations.sh; then
  err "R16: a migration drops or renames without '-- contract-ok: <reason>' (see above)"
fi

exit "$fail"
