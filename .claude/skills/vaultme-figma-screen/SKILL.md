---
name: vaultme-figma-screen
description: Use for ANY VaultMe Figma screen, wireframe, prototype frame, or screen state (file NMXrn0q75G1SX2Bn1L1jP8). Builds screens only from the VaultMe design system — component instances plus layout frames bound to variables — and blocks completion until the token audit returns 0.
---

# VaultMe Figma screen from the design system

Build screens by assembling design-system instances. Never draw a component. Never type a raw number or color.
Also load `figma:figma-use` and `figma:figma-generate-design` before any `use_figma` call.

## Hard rules

1. **Instances only for UI parts.** Every button, input, notice, row, panel, sheet, header, tab bar, list item, switch, segmented control and reveal is an instance of a component in the table below. If a needed part does not exist, stop and add it to the Foundation first (`figma:figma-generate-library`), then come back.
2. **Layout frames bind every number.** `itemSpacing`, all paddings and corner radii bind to variables. Use the product scale only:
   - section gap `layout/sectionGap/product` (24), group `layout/groupGap` (16), row `layout/rowGap` (12), field `layout/fieldGap` (8)
   - screen padding `layout/screen/padding` (16); other paddings `space/*`; radii `radius/*` or a component radius variable
   - Never use `layout/sectionGap/mobile` or `desktop` in app screens. They are landing-page values.
3. **Every fill and stroke binds to a color variable.** Prefer Component, then Semantic. Never a hex.
4. **Every text node uses a text style** (`Product/*`, `h1/*`, `display/*`). No local font size or weight overrides.
5. **Copy follows** `outputs/design/ux-terminology.md`. Foundation components stay English; screens override text in Korean.
6. **Exempt only OS chrome and synthetic art**: Status bar, Home indicator, Placeholder QR. Name them exactly so the audit can skip them.

## Component map (master node IDs)

| Role | Node | Role | Node |
|---|---|---|---|
| Button Primary / Secondary / Ghost | 9:283 / 9:284 / 9:285 | Icon button | 67:205 |
| Input | 67:231 | Status label | 67:241 |
| Product navigation (tab bar) | 67:342 | Product header | 68:167 |
| Portfolio balance | 68:180 | Address block | 68:197 |
| Collection state | 68:219 | Account selector | 35:20 |
| Asset row | 36:20 | Activity row | 36:48 |
| Receive address | 68:150 | Transaction panel (incl. High risk 313:80) | 18:46 |
| Review footer | 73:141 | Status notice | 73:169 |
| Transaction result | 73:205 | Recipient field | 40:17 |
| Amount field | 40:28 | Fee summary | 40:41 |
| Backup status | 44:14 | Switch | 300:611 |
| Segmented | 300:622 | List item | 300:642 |
| Bottom sheet | 301:606 | Sensitive reveal | 301:668 |

Button hierarchy: one Primary per screen for the main forward action. Risky acknowledgement sheets make the safe action ("취소") Primary.

## Steps

1. Read `docs/agents/design-index.md`, `outputs/design/ux-flow.md`, `outputs/design/ux-terminology.md`.
2. **Mobbin reference search** (only for a screen you restructure, not for a copy change): load the tool with ToolSearch `select:mcp__ff84db7e-b0c7-4a72-808c-aaab282df65b__search_screens`, then call it 1–2 times with `platform: "ios"`, `output_destination: "design_tool"`, `output_tool: "Figma"`, one screen per query, `mode: "standard"`, `limit: 3`, and the same `task_intent` for the whole task. Look at the returned images. Write the `mobbin_url` links in the frame annotation (`Note · <frame name>` text under the frame). If Mobbin is not signed in, say so and use the links from `work/review/rr-*-2026-10-17.md`. Check the result against `outputs/VaultMe-DESIGN.md` "Design principles".
3. List the sections of the screen and the component for each section from the map. Write this list in your reply before any mutation.
4. Build with `use_figma`: create the screen frame (390×844, fill `screenB/bg`, flat white; docs/agents/foundation.md rule 15). Use `surface/canvas` only for the 12 px `sectionBand` on detail screens, then layout frames bound per rule 2, then instances with property overrides.
5. Run `.claude/skills/vaultme-figma-screen/audit.js` (set `PAGE_ID`, and `ROOT_IDS` to the new frames). **All counts must be 0**, including `unboundPaint` (every visible solid paint, inside instances too, is variable-bound or a style; only asset identity ETH 137:402 / USDC 137:429 and OS chrome/QR are exempt) and `stalePaint` (bound paint whose stored color differs from the resolved value: the desktop export draws the stored color). Fix and re-run until they are.
6. Take one screenshot of the frames and check hierarchy, copy, and overflow. Check one frame in Dark mode (`setExplicitVariableModeForCollection` on 02 Semantic).
7. Report: frame IDs, the audit result object, and the screenshot. A screen without an audit result of 0 is not done.
