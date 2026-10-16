# VaultMe Local Runner

Development plugin for the Figma desktop app. The remote MCP cannot load Pretendard; this plugin runs in the desktop app, where local fonts load.
- Import once: Plugins → Development → Import plugin from manifest → this folder's `manifest.json`.
- Run: Plugins → Development → VaultMe Local Runner (or "Run last plugin").
- `code.js` is replaced per task. Each run writes `{task, out, error}` to `figma.root` shared plugin data `vaultme/log`; read it back with `use_figma` (`figma.root.getSharedPluginData('vaultme','log')`).
