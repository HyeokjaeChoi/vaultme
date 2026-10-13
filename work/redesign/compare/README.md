# Redesign A: app vs Figma (file NMXrn0q75G1SX2Bn1L1jP8)

Light mode, iPhone 18 Pro simulator (1206x2622 captures) vs Figma 390x844 frames. `<key>-app.png` / `<key>-figma.png`. Android: `<key>-android.png` (home, send-amount, review; emulator signaldock-api37, Expo Go via Metro 8082).

Finish-review fixes (2026-10-14): dark Secondary fill neutral 800/700/600, full-width tab bar with 8 top padding, settings switches, send-amount gap 16, large-text caps. Expo Go tools button was turned off in the dev menu, so captures show the home "..." affordance.

Extra captures: `<key>-dark-app.png` (home, send, send-amount, review, review-lookalike, review-sheet, receive, activity, settings) are the app in dark appearance; dark has no Figma pair except `home-dark` (compare structure against the light Figma frames). `<key>-xxxl-app.png` (send-amount, review, settings) are Dynamic Type extra-extra-extra-large.

| Key | Figma node | Route | Remaining differences |
| --- | --- | --- | --- |
| start | 333:76 | `/` | Figma status bar and home indicator are device chrome, not drawn. Brand icon is 32 (token icon_xl), Figma 30. |
| home | 333:113 | `/home?variant=restored` | Device chrome only. Tab bar full width, 8 top padding, fill reaches the safe area (matches Figma). |
| home-new | 333:351 | `/home` | Same as home. |
| send | 334:316 | `/send` | Device chrome. Placeholder text is a real TextInput placeholder (same look). |
| send-amount | 334:385 | `/send/amount?to=<address>` | Back row to summary gap 16. Device chrome. Fold-in of the summary row is motion, not visible in a still. |
| review | 336:390 | `/review` | Device chrome. |
| review-lookalike | 336:467 | `/review?risk=1` | Device chrome. Marked chunks use warning color + underline, Medium weight (Figma regular weight). |
| review-sheet | 336:552 | `/review?risk=1&sheet=1` | Grabber height 4 (no 5 token). Sheet content is from the existing BottomSheet. |
| receive | 336:10956 | `/receive?backedUp=1` | Address wraps to 2 lines; Figma frame clips it. Device chrome. |
| activity | 336:11355 | `/activity` | Device chrome. |
| settings | 336:11488 | `/settings` | Version shows app config 0.0.0, Figma 1.0.0. Three List items use C29 Switch (on/off/on, local state). |
| home-dark | 336:11570 | `/home?variant=restored`, appearance dark | Device chrome. |

Android: home, send-amount, review render the same layout as iOS. Fonts and safe areas follow the platform.

Android repro (emulator `signaldock-api37`, Expo Go 57.0.9):
- Open a route with `adb shell am start -p host.exp.exponent -a android.intent.action.VIEW -d exp://10.0.2.2:<port>/--/<route>`. Without `-p`, another installed dev build can take the `exp://` link.
- `10.0.2.2` is the host machine from the emulator. Check that `<port>` is the Metro of this worktree.
- On a fresh Expo Go install, tap Continue on the welcome sheet once. Before that, the app can stay on a spinner.
- `*-fontscale-android.png` use font scale 1.3: review notice sits under the footer and scrolls into view; send-amount "Tools" pill is Expo Go dev chrome.
