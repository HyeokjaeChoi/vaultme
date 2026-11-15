#!/usr/bin/env python3
"""R13 helper: the trust block of pnpm-workspace.yaml. check(text) returns problems; main(path) exits 1 on any.

Fails closed: the file must write trust keys in the plain form, and every line of the trustPolicyExclude block must be
'  - name@version' (optional '# comment') with a name@version from ALLOWED. Anything else is a problem.
"""
import re
import sys

ALLOWED = {"chokidar@4.0.3", "semver@5.7.2", "semver@6.3.1"}
OFF = ("trustPolicyIgnoreAfter", "trustLockfile")


def check(text):
    bad, in_list = [], False
    for n, line in enumerate(text.splitlines(), 1):
        key = re.match(r"""\s*["']?([A-Za-z]+)["']?\s*:""", line)
        name = key[1] if key else None
        if name in OFF:
            bad.append(f"line {n}: {name} turns the trust check off")
        if name == "trustPolicyExclude":
            if re.match(r"trustPolicyExclude:\s*(#.*)?$", line):
                in_list = True
            else:
                bad.append(f"line {n}: write trustPolicyExclude as a plain block list, one '  - name@version' per line")
                in_list = False
            continue
        if not in_list:
            continue
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        m = re.match(r"  - ([A-Za-z0-9@._/-]+)\s*(#.*)?$", line)
        if m:
            if m[1] not in ALLOWED:
                bad.append(f"line {n}: trustPolicyExclude entry {m[1]} is not in the allowed list")
        elif re.match(r"[A-Za-z\"']", line):
            in_list = False  # next top-level key
        else:
            bad.append(f"line {n}: unexpected line in trustPolicyExclude block: {line.strip()}")
    return bad


if __name__ == "__main__":
    problems = check(open(sys.argv[1], encoding="utf-8").read())
    for p in problems:
        print(p, file=sys.stderr)
    sys.exit(1 if problems else 0)
