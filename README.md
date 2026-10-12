# Kuya Json

Built by Ephraim Velasco

A privacy-first web app for managing, transforming, and anonymizing JSON. **All
processing happens in your browser** — no JSON is ever uploaded to a server.

Built with Next.js (App Router), TypeScript, Tailwind CSS, and CodeMirror 6.
Deploys to Vercel with zero configuration.

## Features

Everything operates on a single working **document**, with a persistent structure
tree on the left (click any node to jump to it in the editor). All panes are
resizable by dragging the dividers.

| Tool | What it does |
| --- | --- |
| **Format** | Pretty-print (2 / 4 / tab indent), minify, sort keys, and **unescape** stringified JSON — including nested escaped values inside fields and double-encoded payloads. |
| **Validate** | Live inline error markers plus human-readable messages with line/column. |
| **Repair** | Fixes single quotes, unquoted keys, trailing commas, comments (JSON5/JSONC), and Python literals (`True`/`None`), with a summary of what changed. |
| **Anonymize** | Mask PII by key name (exact/glob/regex) or JSONPath. Auto-detects emails, phones, SSNs, credit cards, IPs and names. Strategies: realistic fakes (`@faker-js/faker`, with consistent value→fake mapping for referential integrity), mask, redact, or stable hash. One-click "Anonymize all detected PII". |
| **Query** | JSONPath expressions and plain-text search over keys & values, with live results. |
| **Convert** | JSON → YAML, XML, CSV, TypeScript types, Python dataclasses/Pydantic, Go structs, and JSON Schema. |
| **Diff** | Side-by-side structural (semantic) comparison; highlights added/removed/changed and can ignore array order. |
| **Schema** | Generate a JSON Schema (draft 2020-12) from a sample, or validate the document against a schema (`ajv`). |
| **Transform** | Sort keys, flatten ↔ unflatten (dot-notation), and merge documents (deep / last-wins / first-wins). |

Plus: dark mode, undo/redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), drag-and-drop file
loading, copy/download, and a responsive layout that works down to mobile. Heavy
operations run in a Web Worker to keep the UI responsive on large files.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm i -g vercel
vercel
```

No environment variables or backend are required; the app is fully static.

## Project layout

```
app/            Next.js App Router (layout, single-page workspace)
components/     UI: editor, tree sidebar, split panes, per-tool panels
  tools/        One component per tool, all sharing the document editor
lib/json/       Pure, tested logic: format, validate, repair, anonymize,
                tree, locate, query, diff, convert, schema, transform, unescape
lib/workers/    Web Worker bridge (with a main-thread fallback)
```
