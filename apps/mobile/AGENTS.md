# apps/mobile

Expo app. Read `ARCHITECTURE.md` (code map) and `DESIGN.md` before you change a screen.

- Layers in `src/`, top to bottom: `shell` (FSD app layer; Expo Router reserves `src/app`), `pages`, `widgets`, `features`, `entities`, `shared`. `eslint.config.mjs` (boundaries) and `steiger.config.mjs` enforce the import rules; read the message when one fails.
- `app/` is the expo-router tree. A route file only re-exports from `src/shell` or `src/pages`.
- Screen work follows the `vaultme-design-to-code` skill: Figma first, then code, then light and dark comparison images in the PR.
- Copy lives in `packages/i18n`. Use the terms in `CONTEXT.md`.

## Testing OS auth on a simulator (ADR-0016)

There is no auth bypass in app code. To pass or fail the lock screen (S90) or a send auth sheet, put the sheet on screen, then run:

```bash
scripts/sim-auth.sh match [ios|android]    # unlock
scripts/sim-auth.sh nomatch [ios|android]  # failed attempt
```

Setup the owner does once (agents must not change device security settings; if it is missing, stop and ask):

- iOS Simulator: menu Features > Face ID > Enrolled. A simulator without a passcode or Face ID also blocks wallet creation.
- Android emulator: Settings > Security > Screen lock = PIN, then add a fingerprint; in the emulator's extended controls (…) > Fingerprint, touch the sensor for finger 1 when asked. `sim-auth.sh` uses finger id 1 for `match` and id 9 (not enrolled) for `nomatch`.
