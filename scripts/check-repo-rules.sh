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

exit "$fail"
