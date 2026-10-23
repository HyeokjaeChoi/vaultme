---
version: 1
slug: "apps-mobile-src-pages-review-index-tsx"
primary_target: "apps/mobile/src/pages/review/index.tsx"
related_targets: ["apps/mobile/src/pages/home/index.tsx","apps/mobile/src/pages/send/index.tsx","apps/mobile/src/pages/receive/index.tsx","apps/mobile/src/pages/activity/index.tsx","apps/mobile/src/pages/settings/index.tsx","apps/mobile/src/pages/start/index.tsx"]
---

# VaultMe mobile app surfaces (Operate, iOS + Android, Expo)

Scope: Start, Home, Send (recipient, amount), Review (+look-alike), Receive, Activity, Settings. Tokens fixed (Blue A, Inter, IBM Plex Mono, canvas, Borderless, one C23 summary).

## Direction contract

THESIS: Send is three questions, one per screen (누구에게 · 얼마 · 확인). Each answered question folds into a summary row; Review is the stack of those rows. Refuses the one long form with every field at once.

OWN-WORLD: Light canvas, flat white rows, no chrome. Bare 44 pt icon navigation (no chip). Question and page titles Product / Title 24/32 SemiBold Ink, left aligned (owner: 30/700 was too big); the transfer amount 40/48 Bold is the largest text. Blue A only on the single forward action and the "수정" links. Status changes in place on the same row and hold a short highlight.

STORY: The user always sees one decision. On Review they read account, network, asset, full recipient, amount, estimated fee, total and check status as answers they gave, and can jump back to any one with 수정.

FIRST VIEWPORT: Review: bare back, title "이대로 보낼까요?", amount 40/700, network·account line, white rows (받는 사람 full mono address + 수정, 금액 + 수정, 네트워크), fee and total lines, check notice, bottom fixed Primary "확인하고 보내기".

FORM: one question per screen, list position 4, seed: c290be33 (surface roll).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
