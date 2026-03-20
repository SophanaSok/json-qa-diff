# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/SophanaSok/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://SophanaSok.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**JSON QA Diff Tool** is a lightweight browser app for comparing two JSON export files, detecting record-level differences, and identifying duplicate records. Ideal for bid reconciliation, data migration validation, export verification, and quality assurance workflows.

- Runs fully in-browser (no server/backend)
- File upload for JSON exports
- Record-level diff detection (added, removed, changed)
- Duplicate detection (within-file and cross-file)
- Downloadable diff and duplicate reports
- Configurable unique key and ignore fields

## 🔍 Why use this?

1. **Bid Reconciliation**: Compare bid exports from different sources or time periods.
2. **Data Quality**: Detect duplicates automatically and highlight schema mismatches.
3. **Export Verification**: Validate changes between export snapshots without manual review.
4. **Migration QA**: Ensure data integrity when moving records between systems.

## ✨ Features

- Upload two JSON files for comparison
- Automatic record-level diffing using a configurable unique key (default: `ProjectCode`)
- Three-category diff visualization: **Added**, **Removed**, **Changed**
- Comprehensive statistics dashboard:
  - Record counts per file
  - Counts for added/removed/changed records
  - Duplicate detection (within-file and cross-file)
  - Schema mismatch warnings
- Detailed diff table with expandable field-level changes
- Duplicate records table with source tracking
- Configurable fields to ignore in duplicate detection
- Download diff records as JSON
- Download duplicate sets as JSON (File 1, File 2, Cross-File)
- Download combined deduplicated export (removes duplicates across both files)
- Works offline from static file or GitHub Pages

## 🚀 Quick Start (Local)

1. Open `index.html` in your browser
2. Upload **File 1** (baseline/older export) and **File 2** (newer/comparison export)
3. Verify or update the **Unique Key** field (default: `ProjectCode`)
4. Configure **Ignore Fields** for duplicate detection (comma-separated; default: `Created,Modified,Refreshed`)
5. Click **Analyze** to compare the files
6. Review the **Summary**, **Diff Records**, **Duplicate Records**, and **Clean Deduped Export** panels
7. Download JSON reports using the various download buttons

## 📋 Expected JSON Format

The tool expects JSON files containing arrays of record objects. Supported formats:

```json
// Option 1: Plain array
[
  { "ProjectCode": "P001", "Title": "Project A", "BidStatus": "Open" },
  { "ProjectCode": "P002", "Title": "Project B", "BidStatus": "Closed" }
]
```

```json
// Option 2: Object with array in "Export" key
{
  "Export": [
    { "ProjectCode": "P001", "Title": "Project A", "BidStatus": "Open" },
    { "ProjectCode": "P002", "Title": "Project B", "BidStatus": "Closed" }
  ]
}
```

```json
// Option 3: Object with array in first key
{
  "records": [
    { "ProjectCode": "P001", "Title": "Project A", "BidStatus": "Open" },
    { "ProjectCode": "P002", "Title": "Project B", "BidStatus": "Closed" }
  ]
}
```

## 🛠️ App Behavior

### Diff Detection
- The tool matches records between files using the configured **Unique Key** (default: `ProjectCode`)
- For each matched pair, it compares all fields and identifies which ones changed
- Records are categorized as:
  - **Added**: Present in File 2 but not File 1
  - **Removed**: Present in File 1 but not File 2
  - **Changed**: Present in both files with different field values

### Schema Mismatch Warning
- If File 1 and File 2 have different column/field names, a yellow warning appears in the summary
- This helps identify structural issues between exports

### Duplicate Detection
- Duplicates are detected within each file independently
- The comparison ignores specified fields (default: `Created`, `Modified`, `Refreshed`)
- Hashes are computed from remaining fields to identify duplicate records
- Three categories of duplicates are tracked:
  - **Within-file (File 1)**: Duplicates found only in File 1
  - **Within-file (File 2)**: Duplicates found only in File 2
  - **Cross-file**: Identical records found in both files

### Download Reports
- **Diff Report**: JSON file containing all added, removed, and changed records with field-level changes
- **File 1 Dups**: JSON file containing duplicate records found in File 1
- **File 2 Dups**: JSON file containing duplicate records found in File 2
- **Cross-File Dups**: JSON file containing records that appear identically in both files
- **Combined & Deduped**: Single deduplicated file combining both inputs (removes duplicates across files, keeping the latest version)

### Deduplication Logic
- Cross-file deduplication compares all fields except `BidDocumentHashes` and the configured ignore fields
- When duplicates are found across both files, the tool keeps the latest version of each record (File 2 takes precedence)
- The combined deduplicated export maintains the original JSON structure (plain array or wrapped format)

## 📌 Notes

- This is a **client-side tool** — no data leaves your browser or is sent to any server
- Both files are processed entirely in your browser using JavaScript
- The tool supports JSON files with arrays of objects (records)
- Unique key field must exist in both files for proper record matching
- For large files (1000+ records), performance will depend on your browser/machine
- Fields listed in "Ignore Fields" are excluded from duplicate checks but still shown in results

## 🧩 Contribute

1. Fork the repo
2. Edit `index.html` or add tests/docs
3. Submit PR

## 📄 License

MIT
