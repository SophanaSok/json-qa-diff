# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/SophanaSok/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://SophanaSok.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**JSON QA Diff Tool** is a lightweight, browser-only utility for comparing two JSON exports, detecting record-level differences, and exposing duplicate records for QA and reconciliation use cases.

- Runs fully in the browser (zero backend)
- Upload two JSON files and compute diff + duplicate insights
- Supports configurable key and ignore-field settings
- Download reports as JSON (diffs, duplicates, combined deduped output)

## 🔍 Purpose

1. Reconcile exports from different systems (bid, asset, contract, inventory)
2. Validate migration results before/after a data transfer
3. Detect data quality issues (changed values + duplicates)
4. Gain fast snapshot comparisons without manual scripting

## ✨ Core Features

- File upload UI for File 1 (base) + File 2 (comparison)
- Unique key lookup (default: `ProjectCode`)
- Field-based record comparison:
  - Added in File 2
  - Removed in File 2
  - Changed values in existing keyed records
- Duplicate detection across 3 scopes:
  - Within File 1
  - Within File 2
  - Cross-file exact matches
- Ignore fields support for dedupe (defaults: `Created`, `Modified`, `Refreshed`)
- Summary dashboard with counts + mismatch warnings
- Field-level change details with before/after values
- Download options for all artifacts:
  - Diff JSON
  - Duplicate JSON files
  - Combined deduplicated merge

## 📋 JSON input expectations

The tool supports 3 JSON structures:

- Plain array of objects
- Object with `Export` key array
- Object where the first key is an array

Any object entry is treated as a “record”.

## 🧮 Diffing behavior

- Keys matched by Unique Key
- `Added`: key missing in File 1
- `Removed`: key missing in File 2
- `Changed`: key exists in both, non-identical record data
- Field-level changes are shown as value deltas for easy review

## 🧹 Duplicate behavior

- Duplicate determination uses a deterministic hash across non-ignored fields
- Compares records within each file and across both files
- Cross-file duplicates help spot data propagation or export duplication

## 💾 Outputs

- `differences.json` (added/removed/changed details)
- `duplicates-file1.json`
- `duplicates-file2.json`
- `duplicates-crossfile.json`
- `combined-deduped.json` (single merge with cross-file dedupe)

## 🔧 Options

- Unique Key: the lookup field for linking records
- Ignore Fields: fields excluded from dedupe hashing (useful for dates/timestamps)

## 💡 Best practices

- Ensure both files include the unique key in every record
- Use consistent export field names
- Start with a narrow set of ignored fields, then expand as needed
- Verify cross-file duplicate findings before applying automated dedupe in downstream workflows

## 🛡️ Privacy

Data is processed locally in your browser. No network transfer or server side processing.

## 🤝 Contribute

1. Fork
2. Update UI, feature logic, bug fix
3. Open PR with test case or usage update

## 📄 License

MIT
