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

## 📊 Summary dashboard breakdown

The Summary dashboard is generated after clicking **Analyze**. It combines diffing and duplicate calculations into quick KPIs so you can assess data quality at a glance.

### Quick reference table

| Dashboard metric | What it means (short) |
|---|---|
| File 1 Records | Total parsed records in baseline file |
| File 2 Records | Total parsed records in comparison file |
| Added | Keys present only in File 2 |
| Removed | Keys present only in File 1 |
| Changed | Same key in both files, but field values differ |
| Within-file Dups | Duplicate rows found inside File 1 + File 2 |
| Cross-file Dups | Rows that match between File 1 and File 2 after ignore rules |
| Removed (File 1) | Rows dropped if File 1 is deduplicated |
| Removed (File 2) | Rows dropped if File 2 is deduplicated |

### Metrics and meaning

1. **File 1 Records**
  - Total number of records parsed from File 1.
  - Baseline count used for comparison.

2. **File 2 Records**
  - Total number of records parsed from File 2.
  - Comparison count used for change detection.

3. **Added**
  - Records where the **Unique Key** exists in File 2 but not in File 1.
  - Formula: `count(keys in file2 - keys in file1)`.

4. **Removed**
  - Records where the **Unique Key** exists in File 1 but not in File 2.
  - Formula: `count(keys in file1 - keys in file2)`.

5. **Changed**
  - Records where the same **Unique Key** exists in both files, but at least one field value differs.
  - Formula: `count(common keys where record1 != record2)`.

6. **Within-file Dups**
  - Duplicate row count found inside File 1 plus File 2.
  - Uses record hashing after removing fields listed in **Ignore Fields**.
  - This is a **row count**, not a duplicate-group count.

7. **Cross-file Dups**
  - Number of rows considered duplicates across File 1 and File 2.
  - A match occurs when hashed record content is identical after applying **Ignore Fields**.

8. **Removed (File 1)**
  - How many records would be removed if File 1 is deduplicated with current ignore settings.
  - Formula: `file1_count - deduped_file1_count`.

9. **Removed (File 2)**
  - How many records would be removed if File 2 is deduplicated with current ignore settings.
  - Formula: `file2_count - deduped_file2_count`.

### Schema mismatch warning

- A warning appears when File 1 and File 2 do not share the same detected field set.
- This helps identify structural changes (renamed/missing columns) that may affect diff accuracy.

### How the dashboard works (processing flow)

1. Parse and normalize both files into record arrays.
2. Build key maps using **Unique Key**.
3. Compute `Added`, `Removed`, and `Changed` from key presence and full-record comparison.
4. Hash records (excluding ignored fields) to detect duplicates within each file.
5. Compare duplicate hashes across files to detect cross-file duplicates.
6. Run deduped projections for each file and compute removal counts.
7. Render all metrics in the Summary panel.

### Important interpretation notes

- If **Ignore Fields** is too broad, duplicate counts may be inflated.
- If **Unique Key** is missing or inconsistent, diff counts can be misleading.
- Duplicate metrics and change metrics are independent; a record may be counted in both views.
- For best results, keep key naming consistent and validate schema mismatch warnings before acting on counts.

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
