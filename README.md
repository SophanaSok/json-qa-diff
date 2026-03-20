# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/SophanaSok/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://SophanaSok.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**JSON QA Diff Tool** is a lightweight browser app for validating JSON against a schema and comparing two JSON documents with a clear visual diff. Ideal for data quality checks, API response comparison, config drift detection, and CSV-export diff validation.

- Runs fully in-browser (no server/backend)
- Drag/drop + paste input
- Immediate schema validation feedback
- Diff with highlighted additions/changes/removals
- Download diff as JSON

## 🔍 Why use this?

1. Save time validating JSON shape and required fields before integration or testing.
2. Compare output from step A vs step B (e.g., CSV-to-JSON, API snapshot, config updates).
3. Avoid manual `diff` errors with structured, data-aware comparison.

## ✨ Features

- Drag/drop file upload for both JSON inputs
- Paste JSON directly into side-by-side text areas
- Editable JSON Schema validator (AJV)
- Visual diff rendering (jsondiffpatch)
- Results panel with inline error display
- Export diff as `json-diff.json`
- Dark / light theme toggle
- Works offline from static file or GitHub Pages

## 🚀 Quick Start (Local)

1. Open `index.html` in your browser
2. Drop or paste two JSON documents into their fields
3. Confirm or update the schema in the schema editor
4. Click **Validate & Diff**
5. Review results in the output panel
6. Click **Export Diff** to save a patch file

## 🧪 Example schema

```json
{
  "type": "array",
  "items": {
    "type": "object",
    "properties": {
      "id": {"type": "string"},
      "name": {"type": "string"},
      "value": {"type": "number"}
    },
    "required": ["id", "name"],
    "additionalProperties": false
  }
}
```

## 🛠️ App behavior

- Schema parse errors appear as a red error card.
- If either JSON fails validation, diff is skipped and error details show.
- If both JSON inputs validate, a structured diff highlights:
  - `+` additions
  - `-` deletions
  - `~` updates

## 📌 Notes

- This is a client-side tool; no data leaves your browser.
- For large files, use local editing and then import to avoid browser lag.

## 🧩 Contribute

1. Fork the repo
2. Edit `index.html` or add tests/docs
3. Submit PR

## 📄 License

MIT
