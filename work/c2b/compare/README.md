# C2b backup (#20) app vs Figma

Light mode unless noted. App: iPhone 18 Pro simulator, 402x874 pt at 3x. Figma frames are 390x844. Placeholder words only ("단어 1..12"), never a real phrase.

| Screen | Figma node | App | Figma | Remaining differences |
|---|---|---|---|---|
| S03H hidden | C2b-S03H 364:849 | `s03h-app.png` | `s03h-figma.png` | Hidden card is 240 pt (token `size.wallet_status_card`), Figma draws 210. No token for 210. |
| S03H dark | none (Figma frame is light only) | `s03h-app-dark.png` | n/a | Dark mapping comes from the token modes; no Figma dark frame to compare. |
| S03R revealed (dev fixture `/backup?demo=1`) | C2b-S03R 364:929 | `s03r-app.png` | `s03r-figma.png` | None seen. |
| S04 word check (dev fixture `/backup/check?demo=1`) | C2b-S04 364:1030 | `s04-app.png` | `s04-figma.png` | Figma shows the first field focused; the app has no autofocus. |

Status bar, nav row and the floating gear in the app captures are the simulator and the Expo dev menu button, not app UI.
