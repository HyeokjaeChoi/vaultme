#!/usr/bin/env python3
"""Cases for scripts/check-trust-settings.py. Run by R13 in check-repo-rules.sh. Silent on success."""
import importlib.util
import os
import sys

sys.dont_write_bytecode = True
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("cts", os.path.join(here, "check-trust-settings.py"))
mod = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mod)

HEAD = "trustPolicyExclude:\n"
OK = HEAD + "  - chokidar@4.0.3 # why\n  # a comment\n\n  - semver@5.7.2\n  - semver@6.3.1\nblockExoticSubdeps: true\n"
CASES = [
    (False, OK),
    (False, "trustPolicy: no-downgrade\n"),
    (False, HEAD + "  - semver@6.3.1\n"),
    (True, HEAD + "  - evil@1.0.0\n"),
    (True, HEAD + '  - "evil@1.0.0 || 1.0.1"\n'),
    (True, HEAD + "  - 'semver@6.3.1'\n"),  # quoted: fail closed even for an allowed name
    (True, HEAD + "- evil@1.0.0\n"),
    (True, HEAD + "  - semver@6.3.1\n  evil: 1\n"),
    (True, HEAD + "    - semver@6.3.1\n"),
    (True, HEAD + "  - semver@6.3.1\n  - evil@1.0.0\n"),
    (True, '"trustPolicyExclude":\n  - evil@1.0.0\n'),
    (True, "'trustPolicyExclude': []\n"),
    (True, "trustPolicyExclude: [evil@1.0.0]\n"),
    (True, "trustPolicyExclude:\n  - semver@6.3.1\ntrustPolicyExclude:\n  - evil@1.0.0\n"),
    (True, "trustLockfile: true\n"),
    (True, '"trustLockfile": true\n'),
    (True, "  'trustPolicyIgnoreAfter': 1440\n"),
    (True, "trustPolicyIgnoreAfter: 1440\n"),
]
failed = [t for want, t in CASES if bool(mod.check(t)) != want]
for t in failed:
    print(f"wrong result for:\n{t}", file=sys.stderr)
sys.exit(1 if failed else 0)
