# DOMpile Preview Extension

A VS Code extension that provides live preview and development tools for DOMpile static sites with real-time rendering, navigation support, and comprehensive error reporting.

## Features

### 🔁 Live Preview
- Real-time preview panel that updates as you type
- Processes DOMpile includes, templates, and markdown
- Auto-refresh with configurable debounce delay
- Theme-aware styling

### 🧭 Navigation & IntelliSense
- Go-to-definition for `<!--#include -->` directives
- Navigate to template extends and slot definitions
- Auto-completion for include paths, slot names, and template references
- Hover information with file previews and status

### ❌ Error Diagnostics
- Real-time error detection for missing includes
- Template and slot validation
- Circular dependency detection
- Syntax error highlighting
- Integration with VS Code Problems panel

### 🎨 Language Support
- Syntax highlighting for DOMpile-specific elements
- Auto-completion for paths and references
- Code folding and bracket matching
- Snippet support for common patterns

## Quick Start

1. **Install the Extension** (when published)
   ```
   ext install dompile.dompile-preview
   ```

2. **Open a DOMpile Project**
   - The extension automatically activates in DOMpile projects
   - Looks for `@dompile/cli` dependency or DOMpile files

3. **Preview Your Files**
   - Open any `.html` file
   - Use `Ctrl+Shift+P` → "DOMpile: Open Preview"
   - Or click the preview icon in the editor toolbar

## Commands

- **DOMpile: Open Preview** - Open preview in current column
- **DOMpile: Open Preview to the Side** - Open preview in side column
- **DOMpile: Refresh Preview** - Manually refresh preview

## Configuration

Configure the extension through VS Code settings:

```json
{
  "dompile.preview.autoRefresh": true,
  "dompile.preview.debounceDelay": 200,
  "dompile.preview.openToSide": true,
  "dompile.sourceDirectory": "src",
  "dompile.includesDirectory": "includes"
}
```

## Supported File Types

- **HTML files** (`.html`, `.htm`) - Full DOMpile processing
- **Markdown files** (`.md`) - With frontmatter and layout support
- **Include files** - Navigation and validation

## How It Works

The extension integrates directly with the `@dompile/cli` package to provide:

1. **Real-time Processing**: Uses DOMpile's include processor and dependency tracker
2. **Error Detection**: Validates file paths, circular dependencies, and template structure
3. **Smart Navigation**: Resolves include paths and template references
4. **Live Updates**: Watches for file changes and updates preview automatically

## Workspace Detection

The extension automatically activates when it detects:
- `@dompile/cli` in `package.json` dependencies
- DOMpile build scripts in `package.json`
- DOMpile configuration files
- HTML files with include directives

## Troubleshooting

### Preview Not Working
- Ensure you're in a DOMpile project
- Check that `@dompile/cli` is installed
- Verify source directory configuration

### Navigation Not Working
- Check file paths in include directives
- Ensure files exist in the expected locations
- Verify workspace folder is set correctly

### Performance Issues
- Increase debounce delay in settings
- Disable auto-refresh for large projects
- Check for circular dependencies

## Development

To contribute to this extension:

```bash
# Clone and setup
git clone https://github.com/dompile/cli.git
cd cli/vscode-extension
npm install

# Development
npm run watch

# Test
F5 to launch Extension Development Host
```

## Requirements

- VS Code 1.85.0 or higher
- Node.js 14+ (for DOMpile CLI)
- DOMpile project with `@dompile/cli`

## Release Notes

### 0.1.0
- Initial release
- Live preview functionality
- Basic navigation and completion
- Error diagnostics
- Syntax highlighting

## License

CC0-1.0 - Public Domain

## Support

- [GitHub Issues](https://github.com/dompile/cli/issues)
- [Documentation](https://github.com/dompile/cli#readme)

---

**Enjoy building with DOMpile!** 🍪