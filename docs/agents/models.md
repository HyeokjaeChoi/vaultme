# Model tiers

`AGENTS.md` names tiers, not models. This file maps each tier to a model per tool. When a model changes, edit only this table.

| Tier | Use for | Claude Code | Other tools |
|---|---|---|---|
| top | Feature design, grilling, architecture decisions, planning, first steps of a new area | `opus` | not set |
| mid | Implementation | `sonnet` | not set |
| low | Research, mechanical edits, read-only checks | `haiku` or `sonnet` | not set |

- Conversational work (grilling, design interviews) cannot be delegated: a subagent returns once and cannot talk to the owner. Run the session itself on the top tier.
- One-shot design analysis can go to a top-tier subagent while the session stays on a lower tier (Claude Code: the Agent tool `model` parameter or `model:` in `.claude/agents/*.md`).
- Claude Code `opusplan` uses the top tier only in plan mode. It does not cover grilling or design in normal mode.
- A tool that is added later gets a column here first.
