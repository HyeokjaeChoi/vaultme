# 0038. Push text follows the app language; English is the push fallback

Status: Accepted (2026-11-06, issue #458, owner decisions of 2026-11-06). Extends [0037](0037-app-english-locale-device-language.md) to the push text the server sends. Does not change [0023](0023-push-payload-kind-only-and-failure-check.md): the payload is still `kind` only.

## Context
ADR-0037 made the app UI Korean or English from the device language. The push text (deposit, send, failed) is written by the Worker, and the Worker did not know the device language, so every push was Korean.

## Decision
- `PUT /v1/push/subscription` takes an optional `locale` (a language code, at most 35 characters). The server keeps `ko` for `ko` and `en` for anything else, also when `locale` is missing. Optional, so older app builds still register and the API contract stays non-breaking.
- D1: `push_subscriptions.locale text not null default 'en'` (Drizzle migration `0005_push_locale.sql`, ADR-0029). The upsert overwrites it on every PUT.
- The app sends its UI language (`i18n.language`, the ADR-0037 pick with the `ko` fallback) on enable, at every launch sync, and again when the language changes while the app runs (Android per-app language can change without a restart).
- The copy lives in `packages/contracts` `PUSH_COPY.ko` / `PUSH_COPY.en`, typed so both have every `kind`. Not in `packages/i18n`: the Worker does not load i18next or React. Figma notification spec 652:108108 holds both languages.
- English copy: deposit "A deposit arrived" / "Open the app to check it."; send "Your sent transaction is in a block" / "Confirmation takes a few minutes. Open the app to check it."; failed "Your sent transaction failed" / "No assets were sent. Only the fee was charged. Open the app to check it."
- Privacy text (B-S66) says the server stores the device language with the address and the alert token.

## Consequences
- The push fallback (`en`) differs from the app UI fallback (`ko`, ADR-0037). The owner chose this for the push only; ADR-0037 is unchanged. A device whose language the app does not support shows the Korean UI and gets Korean pushes, because the app sends `ko` for it.
- Existing subscriptions and older app builds that send no `locale` get English pushes. An updated app replaces the value at its next launch.
- A third language needs a `PUSH_COPY` entry and a change to `pushLocale`.

<!-- verified: packages/contracts/src/push.ts, apps/api/src/push.ts, apps/api/src/db/schema.ts, apps/api/migrations/0005_push_locale.sql, apps/mobile/src/features/push/model/push.ts, apps/mobile/src/features/push/model/usePushBoot.ts -->
