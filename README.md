# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/SophanaSok/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://SophanaSok.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**JSON QA Diff Tool** is a lightweight, browser-only utility for comparing two JSON exports, detecting record-level differences, and exposing duplicate records for QA and reconciliation use cases.

## ⚡ Quick Start Guide

1. Open https://SophanaSok.github.io/json-qa-diff/ in your browser.
2. Upload **File 1** (baseline) and **File 2** (comparison).
3. Confirm or adjust:
  - **Unique Key** (default: `ProjectCode`)
  - **Ignore Fields** (default: `Created`, `Modified`, `Refreshed`)
4. Click **Analyze**.
5. Review:
  - Summary metrics
  - Diff Records (`Added`, `Removed`, `Changed`)
  - Duplicate Records (within-file and cross-file)
6. Export results as needed:
  - `diff_records.json`
  - `duplicates_file1.json`, `duplicates_file2.json`, `duplicates_cross.json`
  - `changed_and_new.json`

### Workflow note

- Run **Analyze** before downloading artifacts.
- If you change files or settings after analysis, run **Analyze** again to refresh metrics/export projections.

## 📚 In-Depth Guide

Use these sections for detailed behavior, formulas, and interpretation guidance:

- [JSON input expectations](#-json-input-expectations)
- [Diffing behavior](#-diffing-behavior)
- [Duplicate behavior](#-duplicate-behavior)
- [Clean changed/new export behavior](#-clean-changednew-export-behavior)
- [Summary dashboard breakdown](#-summary-dashboard-breakdown)
- [Outputs](#-outputs)
- [Options](#-options)
- [Results Navigation UX](#-results-navigation-ux)
- [Best practices](#-best-practices)
- [Privacy](#-privacy)

- Runs fully in the browser (zero backend)
- Upload two JSON files and compute diff + duplicate insights
- Supports configurable key and ignore-field settings
- Download reports as JSON (diffs, duplicate scopes, clean changed/new export)

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
- Optional **Dedupe by fields** selector for clean export matching logic
- Summary dashboard with counts + mismatch warnings
- Field-level change details with before/after values
- Sortable columns in **Diff Records** and **Duplicate Records** tables (ascending/descending)
- Diff type filter (`All`, `Added`, `Removed`, `Changed`) with live table updates
- Live record counters for Diff and Duplicate sections
  - Diff shows filtered vs total when a type filter is active
  - Duplicate shows current displayed total
- Minimal results side menu (shown after Analyze) for quick jumps to Diff/Duplicate sections
  - Active link highlight tracks the most visible section while scrolling
  - Smooth in-page scrolling for section navigation
- In-app README guide (`readme.html`) with dismissible docs card
- Stale-metric hint when settings change after analysis
- Download options for all artifacts:
  - Diff JSON (`diff_records.json`) honoring current Diff table filter + sort order, including row-level full records and grouped original-record sets that preserve source wrappers
  - Duplicate JSON files (`duplicates_file1.json`, `duplicates_file2.json`, `duplicates_cross.json`)
  - Clean changed/new export (`changed_and_new.json`)

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
- `Changed` comparisons are full-record comparisons (not reduced by **Ignore Fields**)

## 🧹 Duplicate behavior

- Duplicate determination uses a deterministic hash across non-ignored fields
- Compares records within each file and across both files
- Cross-file duplicates help spot data propagation or export duplication

## 🧽 Clean changed/new export behavior

- The **Download Combined & Deduped** action generates `changed_and_new.json`
- Output includes:
  - Records that are new in File 2 (key not found in File 1)
  - Records that exist in both files but have meaningful differences
- Output excludes records that are true duplicates/noise-only matches
- Comparison for this export can be narrowed using **Dedupe by fields**
  - If left blank, all non-ignored fields are considered
  - If provided, only listed fields are considered
- Document hash-only noise is filtered for this export:
  - `BidDocumentHashes`, `AddendumDocumentHashes`, `AwardDocumentHashes` are excluded from clean-export comparison
  - Document arrays (`BidDocuments`, `AddendumDocuments`, `AwardDocuments`) are normalized to Title-only comparisons

### Wrapper preservation

- If File 1 is wrapped in an object (for example `{ "Export": [...] }`), the clean export preserves File 1's top-level wrapper key in output.
- If File 1 is a plain array, output is a plain array.

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

Additional clean-export metric:

- **Exported Records** (shown in the Clean Deduped Export card): total records currently projected for `changed_and_new.json`.

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
  - Note: current per-file dedupe projection excludes `BidDocumentHashes` in addition to ignore fields.

9. **Removed (File 2)**
  - How many records would be removed if File 2 is deduplicated with current ignore settings.
  - Formula: `file2_count - deduped_file2_count`.
  - Note: current per-file dedupe projection excludes `BidDocumentHashes` in addition to ignore fields.

### Schema mismatch warning

- A warning appears when the first parsed record in File 1 and File 2 do not share the same detected field set.
- This helps identify structural changes (renamed/missing columns) that may affect diff accuracy.

### How the dashboard works (processing flow)

1. Parse and normalize both files into record arrays.
2. Build key maps using **Unique Key**.
3. Compute `Added`, `Removed`, and `Changed` from key presence and full-record comparison.
4. Hash records (excluding ignored fields) to detect duplicates within each file.
5. Compare duplicate hashes across files to detect cross-file duplicates.
6. Run deduped projections for each file and compute removal counts.
7. Build clean changed/new export projection and count `Exported Records`.
8. Render all metrics in the Summary panel plus the clean export card.

### Important interpretation notes

- If **Ignore Fields** is too broad, duplicate counts may be inflated.
- If **Unique Key** is missing or inconsistent, diff counts can be misleading.
- Duplicate metrics and change metrics are independent; a record may be counted in both views.
- If settings are edited after Analyze, rerun Analyze before trusting dashboard/export counts.
- For best results, keep key naming consistent and validate schema mismatch warnings before acting on counts.

## 💾 Outputs

- `diff_records.json` includes:
  - `rows`: diff rows for the **currently visible Diff set** (respects active type filter and current sort), each with full `record`, `file1Record`, and `file2Record`
  - `originalRecords`: grouped arrays for `added`, `removed`, `changedFromFile1`, and `changedFromFile2`, preserving File 1/File 2 top-level wrapper schema when applicable
- `duplicates_file1.json`
- `duplicates_file2.json`
- `duplicates_cross.json`
- `changed_and_new.json` (clean changed/new projection from File 2)

## 🔧 Options

- Unique Key: the lookup field for linking records
- Ignore Fields: fields excluded from duplicate hashing and clean-export comparison (useful for dates/timestamps)
- Dedupe by fields: optional field subset used by clean changed/new export logic
- Diff Type filter: limits Diff table to `Added`, `Removed`, or `Changed` records

## 🧭 Results Navigation UX

- After **Analyze**, a minimalist side menu appears with quick links to:
  - Diff Records
  - Duplicate Records
- The side menu highlights the currently dominant visible section during scroll (up or down).
- Anchor navigation uses smooth scrolling (with reduced-motion accessibility fallback).

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
