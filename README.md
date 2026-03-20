# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/YOURUSERNAME/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://YOURUSERNAME.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight, **client-side** web app to **validate JSON schemas** and **diff files** for data QA. Perfect for comparing CSV-to-JSON outputs, API responses, or configs. No server needed—runs in any browser.

[Live Demo](https://YOURUSERNAME.github.io/json-qa-diff/) | [Download HTML](https://YOURUSERNAME.github.io/json-qa-diff/index.html)

![Screenshot](screenshot.png)
*(Add a screenshot of the app in action)*

## ✨ Features
- **Drag & drop** or paste JSON files/textareas
- **Schema validation** with editable JSON Schema (AJV-powered)
- **Visual semantic diff** (added/removed/changed highlighted) via jsondiffpatch
- **Export diff** as JSON file
- **Dark/Light mode**, responsive design (Tailwind CSS)
- **Offline/PWA-ready** (~10KB gzipped)
- **Zero dependencies** beyond CDNs

## ⚡ Quick Start
1. [Click the live demo](https://YOURUSERNAME.github.io/json-qa-diff/)
2. Drag two JSON files or paste content
3. Edit schema (e.g., require `"id"` field)
4. Click **Validate & Diff** → See results/export

**CLI alternative?** Use `jq` or `jsondiffpatch` npm.[web:9]

## 📋 Example Schema
For keyed CSV JSON (array of `{id: "...", name: "..."}`):

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": { "type": "string" },
      "name": { "type": "string", "minLength": 1 },
      "value": { "type": "number" }
    },
    "required": ["id", "name"],
    "additionalProperties": false
  }
}
