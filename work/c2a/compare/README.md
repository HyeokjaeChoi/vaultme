# C2a Figma comparison (Round 1)

Files: `<key>-figma.png` (Figma frame, 390x844) and `<key>-app.png` (iPhone 18 Pro, Expo Go, 1206x2622).
Keys: `home-restored` (S10R 309:666), `home-new` (S10N 308:237), `review` (S22 309:1047), `review-lookalike` (S22L 309:1903).
Dark pair: `home-restored-dark-app.png` vs `home-restored-dark-figma.png` (S10R Dark 312:2187). No visible differences besides the common items.
Fix rounds used: 2 (underline spanned spaces; address font fell back to Inter; panel padding added). All 5 pairs re-captured after the fixes.

Common
- The blue gear at top right is the Expo Go dev-tools button, not app UI. It covers the "..." details icon in the header. No setting to hide it was found.
- Status bar and home indicator are device chrome, not app UI. App width is 402 pt vs 390 in Figma.
- Screenshots are 3x, Figma PNGs are 1x.

home-restored
- No visible differences besides the common items.

home-new
- Frame S10N uses group gap 16 between sections (S10R uses 24). Followed per frame, via `Screen gap="group"`.

review / review-lookalike
- Transaction panel uses `transactionPanel.paddingMobile` (16), as bound in the fixed Figma master 18:46.
- Address text (all groups, including highlighted ones) is IBM Plex Mono via the address token. Line breaks differ slightly (402 pt vs 390 pt width).
- Review footer: Figma uses Secondary (not Ghost) for 수정 in S22 and S22L and in component 73:141. Followed Figma.
- Meta row labels use flex 1 (Figma fixed 128.88 px label width). Same look at this width.
- Status notice padding uses layout.rowGap (12) as in Figma; token statusNotice.padding is 16.
- Address "0x" is attached to the first 4-char group ("0x9F3c") as drawn in Figma. `groupAddress` and its test changed.
- "거래 원본 데이터 보기" is inert text (no raw-data view exists).
- S22L bottom sheet (hidden layer in the frame) is implemented and opens on confirm; it is not in the 4 compared images. Grabber height 5 uses space-1 (4): no token.
- Copy: `review.checkedBody` now takes `{{time}}` (fixture 09:41); added review.lookalike sheet strings, `home.details`, `common.back`.

Primitives (Figma vs token notes)
- Button label is Product / Label 14/20 at all sizes as drawn in Figma; token `button.size.lg.label` says 16/24.
- Product header has no background (Figma); token `productHeader.bg` is white.
- Portfolio value uses Title 24/32 (Figma); token `portfolioBalance.valueStyle` says 40/48.
- ListItem, Segmented, SensitiveReveal, Switch, BottomSheet have no component tokens in the JSON; mapped to semantic/primitive values (listed in file comments). Switch is 52x32 vs Figma 51x31. SensitiveReveal hidden min-height 240 vs Figma 210.
- Status label, Fee summary and Icon button added as components (not used by the two screens).

# Round 2 (start, precheck, receive, receive+sheet, send, activity, settings)

Keys: `start` (S01 306:143), `precheck` (S02 306:188), `receive` (S30 308:824), `receive-sheet` (S30+S50 308:1281, app: `/receive?sheet=1`),
`send` (S20 309:858), `activity` (S40 310:1666), `settings` (S60 310:2096). Fix rounds used: 1 (send address shown as one raw string; receive address fixture).
Round 1 `review` and `review-lookalike` were re-captured: the safe S22 recipient is `0bD4 e6C8` in Figma (round 1 wrongly used the look-alike address); fixtures now have `recipient` (0bD4 e6C8) and `lookalike` (0bD5 e6C9).
Dark receive pair: skipped. No "S30+S50 Dark" frame was found (only S10R Dark 312:2187 is known).

Common: Expo Go gear overlay, device status bar and home indicator are not app UI. Screenshots are 402 pt wide vs 390 pt in Figma.

- start: no visible difference. Brand mark icon is 32 px (Figma 30; no token). Mark size 72 = space-10 + space-8.
- precheck: no visible difference (notice text wraps at a different point because of width).
- receive / receive-sheet: QR uses the Figma "Modules" picture as a non-scannable placeholder with the warning badge (not a real QR). Card 216 = size.wallet_status_card - space-6. Sheet is the shared BottomSheet and sits a few pt higher than Figma (grabber height 4 vs 5). Figma shows two "주소 복사" buttons (panel and footer); both kept.
- send: fields are editable (Figma is static). Recipient is shown in 4-char groups; the stored value has no spaces.
- activity: title uses `primitive.type.heading.h1.mobile` (30/700). I changed `packages/tokens/build.mjs` to also emit `primitive.type` (display/heading); values unchanged. Row gap 12.
- settings: Figma shows version `1.0.0`; app shows the app.json version (`0.0.0`). Rows are static (no switches; Figma uses disclosure + value). Main review: removed row dividers (S60 has none; Borderless rule 10). Version stays the real app.json value.
