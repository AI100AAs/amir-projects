# Code Translator v2.0

Translate code between programming languages with regex rules or AI-powered LLM translations.

## Features

- **Dual Translation Engine**: Fast regex-based translations + smart LLM translations via LM Studio
- **Language Pairs**: Python ↔ C++, Python ↔ JavaScript, C++ ↔ Python, JavaScript ↔ Python, Python ↔ TypeScript, JavaScript ↔ TypeScript
- **Compare Mode**: Side-by-side comparison of regex vs LLM translations with similarity scoring
- **Translation Reports**: Generate comprehensive Markdown reports with confidence scores and analysis
- **Diff View**: Line-by-line diff between source and translated code
- **Test Cases**: 10 built-in test cases with mock execution
- **AI Chat**: Get explanations, code reviews, and ethical guidance
- **History**: Searchable, filterable translation history with favorites
- **Share**: Share translations via URL
- **Dark/Light Theme**: Beautiful themes with smooth transitions
- **Keyboard Shortcuts**: Full keyboard navigation support
- **PWA Ready**: Install as a desktop/mobile app
- **Export**: Copy, download, or print translation reports

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:5173/

## LLM Mode (Optional)

For AI-powered translations:

1. Install [LM Studio](https://lmstudio.ai/)
2. Download the `google/gemma-4-e4b-qat` model
3. Start the local server on port 1234
4. Switch to LLM mode in the app

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+1 | Translate tab |
| Ctrl+2 | Compare tab |
| Ctrl+3 | Test Cases tab |
| Ctrl+4 | Diff tab |
| Ctrl+5 | History tab |
| Ctrl+6 | AI Chat tab |
| Ctrl+7 | Settings tab |
| Ctrl+8 | Report tab |
| Ctrl+/ | Toggle shortcuts |
| Ctrl+Shift+S | Share translation |
| Escape | Close modals |

## Supported Languages

Python, C++, JavaScript, TypeScript, Java, Rust, Go, HTML, CSS

## Ethics & Responsibility

Code translation tools should be used responsibly:

- **Review all translations** before using in production
- **Educational purposes**: Understand language differences and patterns
- **Not a replacement** for learning programming languages
- **Respect licenses**: Don't translate proprietary code without permission
- **Security**: Review translated code for vulnerabilities
- **Climate**: LLM mode uses local compute - be mindful of energy usage

## Tech Stack

- Vite 8 + React 19 + TypeScript 6
- CodeMirror for syntax highlighting
- diff-match-patch for diff viewing
- LM Studio for local LLM inference

## License

MIT
