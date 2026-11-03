# 0034. Release version rule: SemVer tag, date-based build number

Status: Accepted (2026-11-04 from issue #396, owner decision of 2026-11-04)

## Context
A release is a `v*` tag (ADR-0032). The owner wants a version that tells when and which build it is. The stores take digits only in the version name (`X.Y.Z`), and the build number must grow with every upload (Android `versionCode` at most 2,100,000,000).

## Decision
- Tag: `vMAJOR.MINOR.PATCH` (SemVer, no pre-release suffix). MAJOR: wallet data that an older app cannot read (storage migration). MINOR: a new feature or screen. PATCH: a fix or a copy change. Before 1.0: `0.MINOR.PATCH`.
- Version name = the tag digits (`0.3.0`).
- Build number = the UTC date `YYMMDD` + the 2-digit count of `release.yml` runs created that UTC day up to this run (`26110402`); the day is the run's creation day. Every run counts (failed and dry runs too), so the number only grows: a failed tag is deleted, fixed, merged and pushed again with the same version and the next build number. At most 99 runs per UTC day.
- Display name: `0.3.0 (26110402)` (EAS build message).
- Code: `scripts/release-version.sh` (tested by `scripts/release-version.test.sh`, R16); `release.yml` job `version` computes it, job `eas-build` writes it to `apps/mobile/app.json` before `eas build` (`appVersionSource: local`).
- The release gate also runs the k6 API benchmark (`api-bench.yml`, job `api-slo`): a tier 1 SLO miss (ADR-0020) stops the EAS build.

## Consequences
- `app.json` in the repository keeps `0.0.0`; only the CI build carries the release numbers.
- The UTC day: a release at 08:00 KST on Nov 5 is `…1104…` in UTC terms before 09:00 KST.
