# Redesign A: app vs Figma (file NMXrn0q75G1SX2Bn1L1jP8)

Light mode, iPhone 18 Pro simulator (1206x2622 captures) vs Figma 390x844 frames. `<key>-app.png` / `<key>-figma.png`. Android: `<key>-android.png` (home, send-amount, review; emulator signaldock-api37, Expo Go via Metro 8082).

| Key | Figma node | Route | Remaining differences |
| --- | --- | --- | --- |
| start | 333:76 | `/` | Figma status bar and home indicator are device chrome, not drawn. Brand icon is 32 (token icon_xl), Figma 30. |
| home | 333:113 | `/home?variant=restored` | Device chrome only. Expo Go floating gear button (dev tool) overlaps the top right in captures. |
| home-new | 333:351 | `/home` | Same as home. |
| send | 334:316 | `/send` | Device chrome. Placeholder text is a real TextInput placeholder (same look). |
| send-amount | 334:385 | `/send/amount?to=<address>` | Device chrome. Fold-in of the summary row is motion, not visible in a still. |
| review | 336:390 | `/review` | Device chrome. |
| review-lookalike | 336:467 | `/review?risk=1` | Device chrome. Marked chunks use warning color + underline, Medium weight (Figma regular weight). |
| review-sheet | 336:552 | `/review?risk=1&sheet=1` | Grabber height 4 (no 5 token). Sheet content is from the existing BottomSheet. |
| receive | 336:10956 | `/receive?backedUp=1` | Address wraps to 2 lines; Figma frame clips it. Device chrome. |
| activity | 336:11355 | `/activity` | Device chrome. |
| settings | 336:11488 | `/settings` | Version shows app config 0.0.0, Figma 1.0.0. |
| home-dark | 336:11570 | `/home?variant=restored`, appearance dark | Device chrome. |

Android: home, send-amount, review render the same layout as iOS. Fonts and safe areas follow the platform.
