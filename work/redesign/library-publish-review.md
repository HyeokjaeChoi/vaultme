# Figma Library publish review - 2026-10-13

File NMXrn0q75G1SX2Bn1L1jP8 (VaultMe), Publish dialog: 68 changes (2 variable collections, 1 style, 65 components). 27 unchanged (text/effect styles). Read-only inspection only.

| Item | Status | Explained by |
|---|---|---|
| Variables 02 Semantic (94 modified) | Modified | Item 3 (action/secondary/bg/* neutral 200/300/400, status/danger/fg, dark edits). All 94 compared aliases verified, see spot-check |
| Variables 03 Component (323 modified) | Modified | Item 3 (button/size/lg/paddingX, receivePanel/radius) plus alias fan-out, item 2 (transactionPanel/paddingMobile). Spot-check OK |
| Style Product / Amount Hero | Added | Item 4 |
| Switch, Segmented control, List item, Bottom sheet, Sensitive reveal | Added | Item 1 (C29-C33) |
| Icon button / Plain, Keypad, Summary row | Added | Item 4 |
| Icon / action / backspace | Added | Item 4 (Phosphor MIT) |
| Transaction panel | Modified | Items 1+2 (High risk variant, paddingMobile binding) |
| Input | Modified | Item 2 (value property binding 67:64) |
| Button / Primary, Secondary, Ghost | Modified | Item 3 (lg paddingX 16, Secondary fill neutral 200/300/400) |
| Card / Group, Receive address, Collection state, Review footer, Transaction result, Backup status, Connected app row, Token allowance row | Modified | Item 3 (bind button/size/lg/paddingX and/or button/secondary/bg; Receive address also receivePanel/radius 16, status/danger/fg) |
| Icon button | Modified | Item 2 (icon foreground rebind after INSTANCE_SWAP) |
| Approval panel, Navigation / Marketing desktop, Product navigation, Status label, Product header, Portfolio balance, Address block, Account selector, Network selector, Asset row, Activity row, Recipient field, Amount field, Fee summary, Connection request, Signature request, Status notice | Modified | Item 3 (every one binds semantic/component variables that changed: text/*, surface/*, status/*, border/*) and item 2 icon rebinds for those with icon instances. No structure change evidence. |
| Icon / * (all 34 existing icons) | Modified | Item 2 (icon foreground variable rebinds: fills bound to icon/action/fg, icon/navigation/fg, icon/status/*, icon/account/fg). Asset / ETH and USDC fully unbound artwork (brand mark artwork fill cleared) |

Unexplained: none.

## Variable check vs outputs/wallet-foundation.tokens.json
Automated: 150 alias values compared (all 02 Semantic Light + Dark entries present in JSON, plus 25 Component entries incl. button/size/lg/paddingX=space/4, receivePanel/radius=radius/lg, transactionPanel/paddingMobile=space/4, button/secondary/bg/* = action/secondary/bg/*, status/danger/fg consumers). Mismatches: 0.
Notes: Semantic action/secondary/bg/default|hover|pressed = color/neutral/200|300|400 (Light); dark = neutral 900|800|700; status/danger/fg = red/700 light, red/300 dark. New variables (switch/*, segmented/*, sensitiveReveal/*, listItem/*, bottomSheet/*, space/*) are not in the JSON and were not value-checked.
Limitation: Publish dialog shows no per-component diff, so component "Modified" rows were mapped via bound variables and instances, not property diffs.
