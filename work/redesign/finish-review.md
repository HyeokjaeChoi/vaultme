disposition: fix

Unread/unchecked: Figma node data, AGENTS.md beyond the injected contract, mobbin refs, direction contract and decision sketch (reviewed screenshots + code only). No large-text, Android dark, or Android sheet captures exist. Native build: no detector ran; floor check is the only slop gate.

## persistence
Pass for a code-led build (no comp round, no state.json required). All 27 required captures present (12 app + 12 figma + 3 android), valid, correct content, correct dimensions. Expo Go gear overlay ignored per brief, but it hides the top-right of every pushed/home frame (Figma home shows a "..." affordance there; app side unverifiable).

## fidelity
Critique reference is provocation-only, but app vs Figma frame comparison: faithful on start, home, home-new, send, send-amount, review, review-lookalike, review-sheet, receive, activity, settings, home-dark layout/spacing/type.
- TYPE: Inter/Plex Mono as contracted; titles 24/32, amount hero 40/48; match.
- MATERIAL: flat, borderless, one tinted C23 card; match. Input border on send is functional (contract rule 10).
- GROUND: canvas #F6F8FB-like, matches Figma.
- Adaptation: receive address wraps 2 lines (README-cited, acceptable). Version 0.0.0 vs 1.0.0 (config, acceptable).
- Rules 3/4: full address, fee, network, account, "not a safety guarantee", lookalike chunks (color + underline + weight), sheet with Cancel as primary and "그래도 보내기" demoted, placeholder QR labelled. Good.

## ceiling
Reached for the chosen restrained direction. Unused: no haptics on keypad/confirm, no amount-digit transition; acceptable under "one authored moment" (press scale 0.97 + fold-in + sheet).

## material_fixes
1. Dark mode: secondary action fill (받기) is near-invisible against canvas (about 1.1:1); the control reads as a missing button. Raise the dark neutral secondary fill (home-dark).
2. Dark mode captured on home only; send, send-amount, review, sheet, receive, activity, settings dark are unverified. Recapture them.
3. Bottom tab bar (home, activity, settings): icons sit directly under the hairline with no top padding, and the bar is a square-cornered white slab inset 16 pt with canvas gutters. It reads as unfinished against an iOS tab bar. Add vertical padding (icon to hairline), or run edge to edge.
4. Settings: rows showing 켜짐/숨김 with a chevron look like toggles but navigate. The Switch primitive exists in src/shared/ui/Switch.tsx. If these are binary preferences, use Switch; otherwise drop the on/off text. Fix the iOS convention mismatch.
5. Dynamic Type / Android font scale never captured; fixed 52 pt keypad rows and fixed nav.height tab bar risk clipping at large sizes (Text.tsx sets no maxFontSizeMultiplier). Capture at AX sizes and font_scale 1.3.
6. Home top-right: Figma "..." affordance absent or hidden under the Expo overlay; recapture with the overlay dismissed to confirm.
7. BottomSheet scrim Pressable has a label but no accessibilityRole="button" (BottomSheet.tsx line 45).
8. Review "확인 결과" notice tint is almost the canvas colour (low separation); verify the contrast of the blue text on that tint. Minor: back arrow glyph sits about 5 pt right of the title left edge; send-amount summary row to back button gap (8 pt) breaks the 16/24 rhythm.

Verified in code: Reduce Motion handled in usePressScale, useFoldIn (starts at 1), BottomSheet (instant open/close). Labels present on IconButton, Button, Keypad (dot/delete named), tabs (role tab + selected state), SummaryRow edit, sheet (accessibilityViewIsModal, onRequestClose for Android Back). 44 pt targets enforced via hitSlop.

## keep
Back as bare 44 pt arrow, one question per screen, 24/32 titles, 40/48 amount hero, borderless flat rows, full address with chunk-marking, sheet with Cancel as the primary action.

fix
