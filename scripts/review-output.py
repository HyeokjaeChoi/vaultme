#!/usr/bin/env python3
"""Claude PR review output, split from the API key (issue #539). Two modes, one per workflow job.

  scan <result.json> <review.json>       Job `review` (has ANTHROPIC_API_KEY, read-only token, no write tool).
                                         Exit 1 if the CLI result holds the key; else write the validated review.
  post <review.json> <pr> <sha>          Job `post` (no key, pull-requests: write). Validate, redact, post.

The model only returns JSON (`--json-schema`). It never posts. The key value is compared here, never printed.
Comments are posted with `gh api` argument lists, so no shell sees a body (also fixes #526).
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.parse

MAX_SUMMARY, MAX_BODY, MAX_COMMENTS = 20000, 8000, 40
# Token shapes (Anthropic, OpenAI-style, GitHub). The post job has no key value, so it can only match shapes.
SECRET_SHAPES = re.compile(r"sk-ant-[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}")
MARKER = re.compile(r"<!--\s*ai-review:[^>]*-->")
SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "comments"],
    "properties": {
        "summary": {"type": "string", "maxLength": MAX_SUMMARY},
        "comments": {
            "type": "array",
            "maxItems": MAX_COMMENTS,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["path", "line", "body"],
                "properties": {
                    "path": {"type": "string"},
                    "line": {"type": "integer", "minimum": 1},
                    "start_line": {"type": "integer", "minimum": 1},
                    "body": {"type": "string", "maxLength": MAX_BODY},
                },
            },
        },
    },
}


def leaks(text, key):
    """True if text holds the key or a simple encoding of it (reversed, base64, hex, URL), even with any separator
    (space, line break, dash, dot) between its characters: both sides are compared with only letters and digits kept."""
    if not key:
        return False
    keep = lambda s: re.sub(r"[^A-Za-z0-9]", "", s)
    flat = keep(text)
    raw = key.encode()
    forms = {key, key[::-1], raw.hex(), urllib.parse.quote(key, safe="")}
    for enc in (base64.b64encode, base64.urlsafe_b64encode):
        forms.add(enc(raw).decode())
    return any(f in flat for f in map(keep, forms))


def strings(obj):
    """Every string value and key in a parsed JSON value, so an escape such as \\n or \\u0073 is compared decoded."""
    if isinstance(obj, str):
        yield obj
    elif isinstance(obj, dict):
        for k, v in obj.items():
            yield k
            yield from strings(v)
    elif isinstance(obj, list):
        for v in obj:
            yield from strings(v)


def redact(text):
    return SECRET_SHAPES.sub("[redacted]", text)


def validate(obj):
    """Problems in a review object; [] when it is valid. Strict: unknown keys fail."""
    if not isinstance(obj, dict) or set(obj) != {"summary", "comments"}:
        return ["review must be an object with exactly summary and comments"]
    out = []
    s = obj["summary"]
    if not isinstance(s, str) or not s.strip() or len(s) > MAX_SUMMARY:
        out.append("summary must be 1..%d characters of text" % MAX_SUMMARY)
    cs = obj["comments"]
    if not isinstance(cs, list) or len(cs) > MAX_COMMENTS:
        return out + ["comments must be a list of at most %d" % MAX_COMMENTS]
    for i, c in enumerate(cs):
        if not isinstance(c, dict) or not {"path", "line", "body"} <= set(c) <= {"path", "line", "start_line", "body"}:
            out.append(f"comment {i}: keys must be path, line, body and optional start_line")
            continue
        p, ln, st, b = c["path"], c["line"], c.get("start_line"), c["body"]
        if not isinstance(p, str) or not p or p.startswith("/") or ".." in p.split("/"):
            out.append(f"comment {i}: path must be a relative path inside the repository")
        isint = lambda v: isinstance(v, int) and not isinstance(v, bool) and v >= 1
        if not isint(ln) or (st is not None and (not isint(st) or st > ln)):
            out.append(f"comment {i}: line and start_line must be positive integers, start_line <= line")
        if not isinstance(b, str) or not b.strip() or len(b) > MAX_BODY:
            out.append(f"comment {i}: body must be 1..%d characters of text" % MAX_BODY)
    return out


def extract(result):
    """The structured review from a `claude -p --output-format json` result, or None. Free text is never a review."""
    if not isinstance(result, dict) or result.get("is_error") is not False:
        return None
    return result.get("structured_output")


def summary_text(sha, text):
    """The marker line comes from the workflow (the fallback stage reads it); a marker in the model text is dropped."""
    return f"<!-- ai-review:{sha} -->\n{redact(MARKER.sub('', text)).strip()}\n"


def scan(result_path, out_path):
    raw = open(result_path, encoding="utf-8").read()
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    try:
        parsed = json.loads(raw)
    except ValueError:  # empty or cut-off file (CLI crash, timeout): not a leak
        parsed = None
    if leaks(raw, key) or (parsed is not None and leaks("\n".join(strings(parsed)), key)):
        print("::error::The CLI result holds the API key (or an encoding of it). Nothing is uploaded or printed.")
        return 1
    if parsed is None:
        print("::error::The CLI result is not JSON.")
        return 2
    review = extract(parsed)
    bad = validate(review)
    if bad:
        print("::error::No valid structured review: " + "; ".join(bad[:5]))
        return 2
    json.dump(review, open(out_path, "w", encoding="utf-8"))
    return 0


def gh(*args):
    r = subprocess.run(["gh", "api", *args], capture_output=True, text=True)
    return r.returncode == 0, r.stdout


def post(review_path, pr, sha):
    review = json.load(open(review_path, encoding="utf-8"))
    bad = validate(review)
    if bad or not re.fullmatch(r"[0-9a-f]{40}", sha) or not pr.isdigit():
        print("::error::Invalid review file or arguments: " + "; ".join(bad[:5]))
        return 1
    repo = os.environ["GITHUB_REPOSITORY"]
    ok, out = gh(f"repos/{repo}/pulls/{pr}/comments", "--paginate", "--jq", ".[] | [.user.type, .path, (.line|tostring)] | @tsv")
    seen = {tuple(l.split("\t")[1:]) for l in out.splitlines() if l.startswith("Bot\t")} if ok else set()
    unplaced = []
    for c in review["comments"]:
        if (c["path"], str(c["line"])) in seen:
            continue
        args = [f"repos/{repo}/pulls/{pr}/comments", "-f", f"commit_id={sha}", "-f", f"path={c['path']}",
                "-F", f"line={c['line']}", "-f", "side=RIGHT", "-f", f"body={redact(c['body'])}"]
        if "start_line" in c:
            args += ["-F", f"start_line={c['start_line']}", "-f", "start_side=RIGHT"]
        if not gh(*args)[0]:  # a line outside the diff: keep the finding in the summary instead of losing it
            unplaced.append(f"- `{c['path']}:{c['line']}`: {redact(c['body'])}")
    text = review["summary"]
    if unplaced:
        text += "\n\nFindings that could not be placed on a diff line:\n" + "\n".join(unplaced)
    text = text[:60000]  # GitHub allows 65,536 characters in a comment
    ok, _ = gh(f"repos/{repo}/issues/{pr}/comments", "-f", f"body={summary_text(sha, text)}")
    if not ok:
        print("::error::The summary comment was not posted.")
    return 0 if ok else 1


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[:1] == ["scan"] and len(a) == 3:
        sys.exit(scan(a[1], a[2]))
    if a[:1] == ["post"] and len(a) == 4:
        sys.exit(post(a[1], a[2], a[3]))
    if a[:1] == ["schema"]:
        print(json.dumps(SCHEMA, separators=(",", ":")))
        sys.exit(0)
    sys.exit(__doc__)
