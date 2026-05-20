# @aitools/studio

> **VS Code extension bundling Guard + Cluster for AI developers**

Integrate prompt injection detection and concurrent rendering into your IDE with real-time feedback and local preview.

## Features

- 🛡️ **Guard Integration**: Real-time security analysis in your editor
- 🔄 **Cluster Preview**: Test rendering locally with one-click execution
- 📊 **Inline Diagnostics**: Hover tooltips with security explanations
- 🚀 **Quick Fixes**: Auto-resolve common security patterns
- 🎨 **Beautiful UI**: Dark mode, status indicators, result panels
- ⚡ **Fast**: Minimal startup time, lazy-loaded components

## Installation

### From VS Code Marketplace

1. Open VS Code Extension Marketplace
2. Search for "AITools Studio"
3. Click Install

### From Source

```bash
git clone https://github.com/aitoolsmonorepo/aitools.git
cd aitools/packages/@aitools/studio
pnpm install
pnpm build
code --install-extension dist/aitools-studio-0.0.1-alpha.0.vsix
```

## Quick Start

### Enable Guard Analysis

The extension auto-enables Guard when you open a TypeScript/JavaScript file.

**Status bar indicator**: 🛡️ Guard → Shows security violations

**Configuration** (`.vscode/settings.json`):

```json
{
  "aitools.guard.enabled": true,
  "aitools.guard.strict": false
}
```

### Cluster Preview (Alpha)

1. Open a file with `cluster.render()` calls
2. Command Palette → "AITools: Preview with Cluster"
3. Opens browser preview panel with live results

### Quick Fixes

Hover over violations and press `Ctrl+.` (Quick Fix) to see suggestions:

- ❌ Unsanitized input → ✅ Wrap with `sanitizePrompt()`
- ❌ Template injection → ✅ Use parameterized function

## Configuration

**Settings → Extensions → AITools Studio**

```json
{
  // Guard settings
  "aitools.guard.enabled": true,
  "aitools.guard.strict": false,
  "aitools.guard.ignoreFiles": ["**/*.test.ts"],
  
  // Cluster settings (local preview)
  "aitools.cluster.enabled": false,
  "aitools.cluster.maxBrowsers": 1,
  "aitools.cluster.timeout": 30000,
  
  // UI
  "aitools.ui.theme": "auto",
  "aitools.ui.showStatusBar": true
}
```

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `aitools.studio.guard` | — | Run Guard analysis on current file |
| `aitools.studio.clusterPreview` | — | Open Cluster preview panel |
| `aitools.studio.openDocs` | — | Open documentation |

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+Alt+G` | Toggle Guard analysis |
| `Ctrl+Shift+Alt+C` | Open Cluster preview |

## UI Components

### Status Bar

Shows Guard and Cluster status:

```
🛡️ Guard: 3 issues  |  🔄 Cluster: Ready
```

### Violation Panel

Detailed list of security issues with:
- Rule name and description
- Location (file, line, column)
- Severity (error, warning)
- Quick fix suggestions

### Cluster Preview

Live rendering results:
- Input URL
- Rendered HTML/screenshot
- Performance metrics
- Network waterfall (timing)

## Troubleshooting

### Guard not analyzing my file

1. Check if file is TypeScript/JavaScript
2. Verify `aitools.guard.enabled` is `true`
3. Restart VS Code

### Cluster preview slow

- Increase `aitools.cluster.timeout`
- Reduce `aitools.cluster.maxBrowsers` if low on RAM
- Check network connection to target URLs

### Extension crashes

1. Check VS Code console (`Ctrl+Shift+J`)
2. Report at [GitHub Issues](https://github.com/aitoolsmonorepo/aitools/issues)

## Roadmap

### Q2 2026 (Alpha→Beta)
- [ ] Guard LSP server (remote analysis)
- [ ] Multi-file analysis
- [ ] Batch vulnerability scan

### Q3 2026 (Beta→v1.0)
- [ ] Debugger integration
- [ ] Performance profiler
- [ ] Team collaboration (code review integration)

### Q4 2026 (Enterprise)
- [ ] Custom rule builder UI
- [ ] Audit logs and compliance reporting
- [ ] GitHub/GitLab PR comments

## Architecture

```
Extension Host
├── Guard Client (LSP)
│   └── Real-time analysis → Inline diagnostics
├── Cluster Worker
│   └── Local browser pool → Preview webview
└── UI Components
    ├── Diagnostics panel
    ├── Cluster preview
    └── Status bar
```

## Development

### Setup

```bash
pnpm install
pnpm build
```

### Debug Extension

1. Press `F5` in VS Code
2. Opens debug window with extension running
3. Set breakpoints in source code

### Testing

```bash
pnpm test
pnpm test:watch
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT © AITools Contributors

## Support

- 📧 [Email](mailto:support@aitools.dev)
- 💬 [Discord](https://discord.gg/aitools)
- 📚 [Docs](https://github.com/aitoolsmonorepo/aitools/wiki)
