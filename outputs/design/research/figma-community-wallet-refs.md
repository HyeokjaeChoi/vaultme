# Figma Community wallet/fintech references (VaultMe)

Method and limits (read first)
- Browsed Figma Community in the desktop app (global Community tab; VaultMe file tabs untouched). No duplicate, like, comment, follow, login.
- Evidence = search-result thumbnails, cover images, file-page gallery. Layers were NOT opened, so exact pt values are NOT verified.
  Sizes below are visual estimates from 375/390pt-wide covers; treat as ranges, not specs.
- File URLs are not exposed by the desktop app (no address bar). Links are Community search URLs that surface each file by name.
  Pattern: https://www.figma.com/community/search?resource_type=mobile_ui_kit&q=<name>  (resource_type may need dropping).
- No images saved. Light mode is rare in results: most wallet kits are dark/gradient promo covers.

## References (likes / users as shown at browse time)
1. Money Transfer App - Ananda Faris - 27 likes / 3.1k - q="Money Transfer App Ananda Faris"
   Light, 11 screens, 2 flows (Send Money, Pay with QR). Closest flow match.
   - Keypad: 3x4 grid (1-9, 00, 0, backspace), no key borders/fills, digits ~24-28pt regular on white card; full-width blue "Transfer" pill below.
   - Amount shown large (~32-40pt) inside a rounded card with recipient chip above it.
   - QR screen: small gray caption under title, QR on white card, yellow-tint info pill "Regenerate the QR Code" at bottom.
   - Home: balance ~28-32pt bold, 3 circular action buttons (Send/Add/Top up) with labels below; "Quick Send" avatar row; list rows with avatar+title+amount, hairline-free.
2. Coin Sensei - Money Tracker - Reihan D. Challada - 44 / 1.5k - q="Coin Sensei"
   Light + dark, 50+ screens.
   - Review screen: back arrow + centered title, stepper breadcrumb on top, summary card, key-value rows (Category/Type/Date/Time/Note) in small gray text ~11-12pt, then green full-width primary "Finish" + text-only "Cancel" below (primary + text secondary pair, not two filled buttons).
   - Transaction list: grouped by date headers (Today / Yesterday), rows are small cards with a colored left edge (green/red), not dividers.
3. Ghost Crypto Wallet UI Kit - Light Mode - Samson Oluwajunse - 67 / 1.7k - q="Ghost Crypto Wallet UI Kit"
   Phantom-like. Light, variables, 65+ screens.
   - Home: tiny account chip + large balance ("$" small and gray, number ~40-48pt bold), gray delta line below, then a row of 3-4 equal square-ish action tiles with icon above label (light gray fill, no border).
   - Settings sheet: segmented theme picker (System/Light/Dark) with a single blue outline for selected; sheet on near-white with big radius (~24-32); close "x" in a gray circle top-right.
   - Success state: centered playful illustration + short headline.
   - Cover shows numeric keypad (large digits, no key chrome) and bottom CTA.
4. Crypto Wallet App - Rabah - 142 / 7.8k - q="Crypto Wallet App Rabah"
   Light and dark side by side, only 2 screens. Home = greeting + balance headline, horizontal coin cards, "Market Statistics" list (icon, name/ticker, sparkline, price/change) with no dividers, Deposit/Withdraw as a green + red filled pair. Trading-oriented; use only for list density (row ~56-60pt).
5. Free Banking Mobile App UI Kit (light and dark, 43+ screens) - Divus Motion - 589 / 29.9k
   Plain white screens with blue primary full-width buttons, heavy card use, parallel light/dark sets (good proof of token pairing). Standard list rows w/ chevrons.
6. iBank - Banking & E-Money Management - Seju - 2k / 99.9k (most popular banking kit seen) - q="iBank Seju"
   Cover only. 200+ free screens, white background, blue accent, rounded cards. Consensus-confirming, no new detail.
7. Free - Figma UI kit - Payment Banking Mobile App - FTDesign Fintech UIkit - 150 / 10.2k
   Light, 4 screens, blue primary, dark balance card, bar chart. Card-heavy.
8. Finance Mobile UI Kit - Paperpillar - 53 / 1.9k
   Dark+light, includes keypad screen (3x4 grid, no key borders) and "Send Money" recipient picker with avatar rows and amount shown on a gradient card.
9. Unipay: Wallet App iOS UI Design System - Unipay - 263 / 14.6k
   Dark-first, cover only; included as 'pro' wallet system reference (cards, tokens). Low light-mode value.
10. Credify / Finix / AiWallet (Seju, paid $8) - 213 / 4.9k, 57 / 1.2k, 110 / 4.3k
   Cover only. Clean white + indigo, light/dark; confirms indigo/blue primary, card-in-card, white surfaces.
11. Crypto Wallet - Mobile app - notion studios - 390 / 20k (dark home with trading chart) - dark only; skip for light.
12. Toss search: only fan recreations (Toss mobile app copy by 신희빈, Toss wireframes by 이윤재, 11-12 likes). No Korean-grade reference found in Community; rely on Toss behavior knowledge instead (one-question-per-screen, large title, bottom sticky CTA).
Not found: any Community file with explicit suspicious-address warning states or detailed sheets; "web3 wallet" results (Avocado, MetaSafe, Tegro, Omiri, "Web3 Connect Wallet" Omi Gusty Rifani 11 likes) are dark/promo and show connect-wallet modals only.

## Pattern table
| Topic | What references do | Consensus |
|---|---|---|
| Page title | Centered nav title ~16-18pt on detail screens; big left-aligned titles only on onboarding/Toss-style | Detail screens: 17-18pt nav title. Hero text (balance/amount) is the largest element, 32-48pt bold |
| H padding | ~20-24pt (cards ~16 inside) | 20pt common, 24pt in roomier kits |
| Group gaps | 24-32pt between sections; 8-12pt between sibling cards | 8/12 tight, 24/32 section |
| Rows | Avatar/icon 40-44 + 2-line text + right-aligned amount; ~56-72pt tall | Most kits use cards or colored edges; Ghost/Rabah lists are flat with no dividers. Few use hairlines |
| Buttons | Full-width filled primary (48-56pt, radius 12-16 or pill); secondary = text or light-tint fill; Deposit/Withdraw = side-by-side filled pair | Primary + quiet text/tinted secondary beats two filled buttons (Coin Sensei Finish/Cancel) |
| Keypad | 3x4, digits 24-28pt, no key borders, backspace bottom-right, "00" or "." bottom-left, CTA directly under | Chrome-less keys; amount large above; recipient chip above amount |
| Review | Title, summary card, key-value rows (small gray label, dark value), primary CTA pinned bottom | Label left / value right, full-width CTA, cancel as text |
| Home actions | 3-4 equal tiles/circles, icon over label | Icons in light-gray tinted container, no border |
| QR | QR on white card, caption gray, info pill tinted yellow for notice | Tinted pill for notices rather than red alerts |
| Warnings | Tinted pill (yellow) in QR screen; none for risky address | Not covered by community kits: design ourselves |
| Sheets | Radius ~24-32, close x in gray circle, selected = single blue outline | Large radius, quiet chrome |
| Motion | Not visible in static assets; success screens use an illustration | n/a |

## Recommendations for VaultMe (light mode, Korean, 390pt canvas)
Note: values below (20pt padding, 4/32 gaps, etc.) are observations of community kits, not VaultMe decisions. VaultMe tokens win: screen padding 16, product gaps 24/16/12/8 (`layout/screen/padding`, `layout/groupGap`, `layout/fieldGap`, `layout/sectionGap/product`). Map: 20pt padding -> 16; 32 section gap -> 24; 4 gap -> not used (use 8). Tokens are unchanged.
- Page title: nav/step title 20-22pt semibold (Korean glyphs read lighter; step questions on Send like Toss = 24pt bold, left-aligned, max 2 lines). Hero numerals (balance, amount) 40pt bold tabular numerals. Section headers 13-14pt medium gray.
- Content padding: 20pt horizontal everywhere; card inner 16pt; sheet inner 24pt. Keep one value, no per-screen variants.
- Gap scale: 4 / 8 / 12 / 16 / 24 / 32. 8 between related controls, 16 within a group, 24 between groups, 32 before a new section or above the sticky CTA area. Bottom CTA: 20 side, 16 above home indicator.
- List rows: flat, borderless, 64pt tall (icon 40 + 12 gap). Separation by whitespace only; date-group headers (13pt gray, 24pt top gap) give structure for Activity. Press state = soft gray fill (surface-2) with 12pt radius. Optional 1px hairline inset only if rows get dense on Settings.
- Buttons: primary 56pt, radius 16, full width; secondary on the same screen = text button or tinted fill, never two filled buttons. Home Send/Receive: two equal tinted-filled buttons side by side (primary-filled Send, tinted Receive) or Ghost-style icon tiles; pick one and use it everywhere.
- Review/confirm: left-aligned 24pt title ("보내기 전에 확인하세요"), amount hero at top, then key-value rows (label gray left, value right; address shown in full wrapped over 2 lines in monospace with first 6 / last 6 chars emphasized), fee row and total row separated by whitespace. Sticky bottom CTA + text "취소". Do not truncate the address.
- Keypad: 3x4, no key borders/fills, 28pt digits, 64pt tall hit areas, backspace bottom-right, decimal bottom-left (no 00 for crypto). Amount 40pt with currency toggle/secondary fiat line in gray 14pt; inline error (red text under amount) for insufficient balance; CTA disabled until valid. One question per step: title 24pt + input + CTA.
- Warnings: no community precedent, so design explicitly. Suspicious address = tinted banner (danger-tint bg, 1px danger-border not needed, icon + 14pt text + "자세히" link) above the address on Review, CTA changes to destructive-styled "그래도 보내기" requiring a second tap/confirm sheet; first-time address = neutral/yellow tinted pill. Never use color alone (icon + text).
- Sheets: top radius 28, grabber 36x4 at 8pt from top, 24pt padding, close x not required when grabber present; scrim 40% black; one primary action at the bottom.
- Motion: 200-250ms ease-out for sheet and step transitions (horizontal slide on Send steps, shared-axis); keypad key press scale 0.96 + haptic light; amount digits cross-fade 120ms; success = checkmark draw 400ms + haptic success; respect reduced motion (fade only).

## Caveats
- Numbers above are estimates; verify by duplicating a file in a real session if exact specs are needed.
- Community is dominated by dark trading/crypto kits; most Korean-style fintech clarity must come from Toss/Kakaobank behavior, not from Community.
