# Dialect

Dialect is a local-first code migration studio that keeps implementation
differences, static risk signals, and behavioral verification visible alongside
generated code.

## Features

- Split source/target editor with lightweight syntax highlighting
- Python, JavaScript, Java, C++, and Rust language selectors
- Three dependency-free Python-to-C++ demonstrations
- Optional OpenAI-powered translation for arbitrary snippets
- Exact-output verification for bundled C++ translations
- Translation risk score, metrics, implementation notes, and assumptions
- Local workspace autosave and translation history
- Source-file import, target editing, copy, and download
- Light and dark themes with responsive layouts
- Request validation, rate limiting, security headers, and bounded execution

## Run locally

```bash
python3 server.py
```

Open [http://127.0.0.1:8017](http://127.0.0.1:8017).

Dialect automatically prefers LM Studio at `http://127.0.0.1:1234` with
`google/gemma-4-e4b`. Load that model, start LM Studio's local server, and then
run Dialect normally.

Override the endpoint or model if needed:

```bash
LMSTUDIO_URL="http://127.0.0.1:1234" \
LMSTUDIO_MODEL="google/gemma-4-e4b" \
python3 server.py
```

The bundled examples still work when LM Studio is offline. OpenAI is an
optional second fallback:

```bash
OPENAI_API_KEY="your-key" python3 server.py
```

The server uses `gpt-5.4-mini` by default. Override it with
`OPENAI_MODEL` if needed:

```bash
OPENAI_MODEL="gpt-5.5" OPENAI_API_KEY="your-key" python3 server.py
```

## Prototype boundaries

- Bundled C++ translations are compiled with `clang++` and executed against
  their known examples. Arbitrary model-generated code is intentionally not
  executed by the server.
- Passing the included examples does not prove equivalence for every input.
- Editing generated output invalidates its verification state.
- Generated code should be reviewed for overflow, error behavior, dependency
  changes, security issues, and license provenance before deployment.
- Fine-tuning is intentionally deferred. A strong baseline prompt plus evals
  should establish whether a parallel-code dataset improves the product before
  paying the complexity and provenance cost of training.

## Suggested evaluation set

Start with 5-10 small functions covering:

1. Numeric edge cases and overflow
2. Strings and Unicode
3. Collections and iteration order
4. Exceptions and failure behavior
5. Mutation and reference semantics
6. Recursion and stack limits
7. File or network side effects
8. Concurrency primitives

## Tests

```bash
python3 -m unittest -v
node --check app.js
python3 -m py_compile server.py
```
