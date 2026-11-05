# 0037. The app speaks Korean and English; the device language picks one, Korean is the fallback

Status: Accepted (2026-11-05, issue #452, owner decision of 2026-11-05). Supersedes in part requirements decision Q49 (Korean only, no translation) and Q81 (first version Korean). Supersedes in part [0012](0012-web-scope-and-quality-bars.md): the "English Figma variants" exclusion, for app screens.

## Context
Q49 made the app UI Korean only: strings in i18n files, no translation. Q81 put the Library (Foundation) in English and the screens in Korean, by overriding instance text. ADR-0012 left English Figma variants out of scope. The owner wants English portfolio screenshots of the app and a base for more languages later.

Sources:
- Expo SDK 58 localization guide: `getLocales()` from `expo-localization` returns the device locales, most preferred first; the `supportedLocales` config plugin option declares the app languages, so iOS and Android show a per-app language setting. https://github.com/expo/expo/blob/expo@58.0.0/docs/pages/guides/localization.mdx
- i18next `fallbackLng`: a missing key or language resolves to the fallback language.

## Decision
- App languages: `ko` and `en`. Both live in `packages/i18n` with the same keys; a test fails when a key is missing in one of them.
- The language comes from the device: the first `getLocales()` entry whose `languageCode` is a supported language, else `ko`. It is read when the app starts. There is no language switch inside the app; the OS per-app language setting (iOS Settings > VaultMe > Language, Android App languages) changes it.
- `expo-localization` is added (an Expo SDK module, installed with `npx expo install`). Hermes `Intl` is not used to read the device language.
- Still holds from Q49 (requirements session record, commit 1623a53, line 89: "숫자 형식은 en-US 계약을 유지"): numbers use the en-US format in both languages. Terms follow `CONTEXT.md`: the bold Korean term for `ko`, the English term in parentheses after it for `en`.
- Still holds from Q81 (same record, line 159): the Library (components, default text, descriptions) is in English; screens localize by overriding instance text.
- Figma: the Korean frames stay the source for Korean. Each main app screen (onboarding, home, send, receive, activity, settings, backup, restore) gets an English frame, light and dark, built from the same instances with English text overrides. A new screen gets both languages before the app changes. Web English Figma frames stay out of scope.
- E2E: Maestro flows match Korean text, so every run pins the device or app language to Korean.

## Consequences
- Every copy change edits `ko` and `en` in the same PR.
- An English user on an older build sees Korean until the build that ships `en`.
- A third language needs only a resource file, the parity test entry and its `supportedLocales` entry.
- English frames double the copy review work per screen.
