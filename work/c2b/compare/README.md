# C2b backup (#20) app vs Figma

Light mode unless noted. App: iPhone 18 Pro simulator, 402x874 pt at 3x. Figma frames are 390x844. Placeholder words only ("단어 1..12"), never a real phrase.

| Screen | Figma node | App | Figma | Remaining differences |
|---|---|---|---|---|
| S03H hidden | C2b-S03H 364:849 | `s03h-app.png` | `s03h-figma.png` | Hidden card is 240 pt (token `size.wallet_status_card`), Figma draws 210. No token for 210. |
| S03H dark | none (Figma frame is light only) | `s03h-app-dark.png` | n/a | Dark mapping comes from the token modes; no Figma dark frame to compare. |
| S03R revealed (dev fixture `/backup?demo=1`) | C2b-S03R 364:929 | `s03r-app.png` | `s03r-figma.png` | None seen. |
| S04 word check (dev fixture `/backup/check?demo=1`) | C2b-S04 364:1030 | `s04-app.png` | `s04-figma.png` | Figma shows the first field focused; the app has no autofocus. |

S03 body text no longer promises a capture block (Q43): "화면을 캡처하지 마세요." in app and in Figma 364:849 / 364:929 (audit 0).

Status bar, nav row and the floating gear in the app captures are the simulator and the Expo dev menu button, not app UI.

## C2b restore (#21) app vs Figma

Light mode unless noted. iOS: iPhone 18 Pro simulator, 402x874 pt at 3x. Figma frames are 390x844. Only wordlist placeholder words and the published BIP39 test vector ("abandon ... about") appear. Dev fixtures: `/restore?demo=1` (filled), `/restore?demo=2` (unknown word), `/restore/done?demo=1` (S06 with the fixture address).

| Screen | Figma node | App | Figma | Remaining differences |
|---|---|---|---|---|
| S05 restore input | C2b-S05 364:1107 | `s05-app.png` | `s05-figma.png` | Figma draws the field focused (blue ring); the capture is unfocused. Figma text is "단어 1 단어 2 단어 3"; the app would flag "단어" as a non-wordlist word, so the capture uses "abandon ability able". |
| S05E unknown word | C2b-S05E 368:1112 | `s05e-app.png` | `s05e-figma.png` | Figma word is "abcd" after two placeholder words; the app capture uses "abandon ability abcd". None else seen. |
| S05E dark | none (Figma frame is light only) | `s05e-app-dark.png` | n/a | Dark mapping comes from the token modes. |
| S06 restore result | C2b-S06 365:965 | `s06-app.png` | `s06-figma.png` | None seen (fixture address, as in Figma). |

Android emulator (signaldock-api37, 1080x2400) results from the real flow with the published vector: `android-s05e-unknown.png`, `android-s05e-checksum.png`, `android-s05-exists.png` (a phrase is already stored), `android-s06.png` (0x9858…da94), `android-home-restored.png` (no backup card), `android-receive.png` (same address). The iOS simulator cannot store a phrase (no passcode), so S06 there uses the fixture.
