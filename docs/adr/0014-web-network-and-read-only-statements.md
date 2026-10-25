# 0014. The web states the network once per page, in the header

Status: Accepted (2026-10-25, issue #223, owner grilling Q1-Q4). Supersedes in part [0012](0012-web-scope-and-quality-bars.md): the line "Every page shows a 'Sepolia testnet, test funds only' notice. The viewer says: read-only, no sign-in, we never ask for keys or a recovery phrase."

## Context
ADR-0012 asked for a testnet and read-only notice on every page. The web pages ended up with the same statement in several places: the header chip `Sepolia 테스트넷`, a footer sentence on every page ("Sepolia testnet only. Test funds only."), a second footer sentence about a learning project, a hero note, a trust banner on the address form and a second network chip in the viewer. The owner found these captions add little and asked to remove them. `AGENTS.md` judgment rule 3 still needs the network shown, and no copy may claim a feature that does not exist.

## Decision
- Every page shows the network once: the header chip (`header.network`, Figma Web/Header 756:174).
- The viewer shows read-only once: the chip under its title (`viewer.readOnly`).
- "Test funds only", "no sign-in" and "we never ask for keys or a recovery phrase" are explained on the landing page only (security cards, FAQ, closing line).
- Removed in #223: the two footer sentences and the landing hero note.
- Removed in #225: the address-form trust banner and ENS note, and the network chip in the viewer address block.

## Consequences
- A new web page gets its network statement from the shared header; it adds no network caption of its own.
- The transaction page (#197) follows the same rule: no extra network or read-only caption.
