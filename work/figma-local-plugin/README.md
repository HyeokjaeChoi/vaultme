# VaultMe Local Runner

Development plugin for the Figma desktop app. The remote MCP cannot load Pretendard; this plugin runs in the desktop app, where local fonts load.
- Import once: Plugins → Development → Import plugin from manifest → this folder's `manifest.json`.
- Run: Plugins → Development → VaultMe Local Runner (or "Run last plugin").
- `code.js` is replaced per task. Each run writes `{task, out, error}` to `figma.root` shared plugin data `vaultme/log`; read it back with `use_figma` (`figma.root.getSharedPluginData('vaultme','log')`).
- PNG export: `tasks/export-pngs.js` (77 screens × Light/Dark = 154 PNGs; optional `ONLY` subset) posts 1x PNGs to `http://localhost:8765` (dev-only `devAllowedDomains` in `manifest.json`). Run a small receiver that writes the POST body to `work/v9/screens/<name>.png` first (2026-10-17, #54: scratchpad `recv.mjs`).
- Tasks: `tasks/fix-b1-text.js` (batch 1 phase B), `tasks/batch2-polish.js`, `tasks/batch2-critique.js`, `tasks/batch2-last.js` (backup of the previous code.js), `tasks/final-fixes.js` + `tasks/final-fixes-2.js` (final product review fixes, 2026-10-17: Light edits, Dark re-clone, repaint pass for stale bound paints). `code.js` holds the last run task.
