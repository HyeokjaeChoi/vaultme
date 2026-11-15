# 0043. Measured results are committed as evidence files

Status: Accepted (2026-11-15, issue #505, owner decision of 2026-11-15: decision 3 of `docs/plans/quality-gates.md`, one evidence folder `docs/results/` for every gate). It adds to [0019](0019-performance-measurements-and-baseline.md) (which keeps a baseline in the repo) and changes no limit.

## Context
A gate's number lives in a 90-day workflow artifact and a job summary. Both expire. Only the perf baseline (`docs/perf/baseline.json`) is committed, and it is a single snapshot. The owner cites gates with thresholds and measured values in a portfolio, so every value needs its commit, its run and a file that stays.

## Decision
- One folder for every gate: `docs/results/<gate>/<YYYY-MM-DD>-<sha7>-<runId>.json`, one file per gate and run, never edited after it is committed. A matrix leg or a re-run attempt that needs its own file uses its own gate id; a second file of the same gate and run is refused. The gate is the plan ID (`LOAD-1`). A check that exists today without a plan ID uses its lower-case name (`hermes-size`, `js-budget`).
- The schema is fixed (`packages/perf/src/evidence.ts`, `schema: 1`, unknown keys are an error):
  - Per file: `gate`, `commit` (full SHA), `runId`, `runUrl`, `workflow`, `event` (where it ran: `schedule`, `push`, `workflow_dispatch`, ...), `measuredAt` (UTC), `origin` (runner and target), `tool` (name, and its version when it has one), `results`.
  - Per result (one per metric): `metric`, `value`, `unit`, `threshold` (`{op, value}` or `null` for a number that is only reported), `pass`, `n` (samples), `window` (for example `one run`, `28 days`).
  - `pass` is computed from `value` and `threshold`. The validator rejects a file whose `pass` disagrees with its own numbers, a run URL that is not the run ID, and text that would break a Markdown table.
- Producer: a gate job writes `evidence-<gate>.json` with `node packages/perf/src/cli.ts evidence emit` (run, commit and event come from the Actions environment) and uploads it as the artifact `evidence-<gate>`, next to its existing artifacts. The job that owns a workflow adds the step (plan section 9). The code needs no `pnpm install` and no new dependency.
- Collector: after a run, `evidence collect --run <id>` downloads the `evidence-*` artifacts, checks each file against GitHub (run ID, URL, workflow, event and, except for a pull request run, the commit), writes it under its canonical path and renders `docs/results/README.md`. `evidence add <file>` writes a local file under its canonical path without asking GitHub: the file came from `emit --run <id>`, which reads the run from GitHub, or from a job's artifact. Both commands check every file before they write one. A normal PR commits the result. No job writes to the repository, and no bot opens a PR: this repo does not let Actions open PRs, and a PR made with `GITHUB_TOKEN` does not start CI (`scripts/review-learn-pr.sh`).
- README: `docs/results/README.md` is generated, one row per metric of the newest file of each gate: threshold, value, result, date, where, commit, run and file. It is the list the owner copies. After a rebase it is regenerated with `evidence render`, never merged by hand.
- Check (gate EVID-1): `packages/perf/test/evidence.test.ts` runs in `verify`. It fails when a file breaks the schema, a file is not at its canonical path, the folder holds another file, `README.md` differs from the render of the files (it names the first differing line), a file is not byte-for-byte the canonical form, or a file that exists on `origin/main` is modified or renamed (deleting one needs a PR that says why). `docs/results/.gitattributes` keeps the line ends the same on every OS. `packages/perf/turbo.json` makes the turbo `test` task depend on `docs/results/**`, so a cached pass cannot hide a hand edit.
- A number is citable only when its file exists. A gate with no file is not listed.

## Consequences
- Collection is manual (after a green run, in a PR). No new token, no bot commit, and a gate with no run since the last collection shows its older value with its older date.
- Each file is a few hundred bytes to a few KB. A weekly gate adds about 50 files a year.
- Evidence is checked for consistency and against GitHub, not measured again. A hand-written file that passes the schema is still possible; the run URL in every row lets a reviewer check it.
- A wrong file is not edited. The run is repeated and the new file replaces it in the README; removing the wrong file needs a PR that says why.
- `docs/perf/baseline.{json,md}` stays the snapshot of Lighthouse, JS, Hermes and the k6 benchmark, rewritten by `cli.ts baseline` and `bench` as before. The evidence files hold what each gate measured.
