# JSON QA Diff Tool 🚀

[![GitHub Pages](https://github.com/SophanaSok/json-qa-diff/actions/workflows/pages/pages-build-deployment/badge.svg)](https://SophanaSok.github.io/json-qa-diff/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Processing: Local Browser](https://img.shields.io/badge/Processing-Local%20Browser-16a34a)](#privacy-and-security)

A simple browser tool to compare two JSON exports, find what changed, catch duplicates, and download clean outputs.

Best for QA checks, migration validation, and quick before/after data review.

## Start Here (GitHub Pages Users)

Open the app: https://SophanaSok.github.io/json-qa-diff/

### In one sentence

Upload two JSON files, click Analyze, review changes/duplicates, and download the exact result files you need.

### What you can do with it

- Compare an older file to a newer one in minutes
- See what was added, removed, or changed
- Inspect field-level changes in readable JSON
- Find duplicates in one file or across both files
- Download results you can share immediately

### Quick workflow

1. Upload File 1 (baseline) and File 2 (comparison).
2. Confirm the Unique Key (default: `ProjectCode`).
3. Keep or adjust Ignore Fields (default: `Created,Modified,Refreshed`).
4. Click Analyze.
5. Review Summary, Diff Records, and Duplicate Records.
6. Download the artifact you need.

### Choose your path

- I need a quick pass/fail comparison:
  - Check Summary first, then scan Diff Records.
- I need a clean output for downstream use:
  - Use Download Combined & Deduped to get `changed_and_new.json`.
- I need to investigate duplicate noise:
  - Use Duplicate Records, then tune Ignore Fields and re-run Analyze.

### What you see after Analyze

| Area | What you can do |
|---|---|
| Summary | Quick snapshot of added, removed, changed, and duplicate counts |
| Results Side Nav | Jump quickly between Summary, Diff Records, and Duplicate Records |
| Diff Records | Filter and review record-level changes |
| Duplicate Records | Review duplicates within a file and across files |
| Exports | Download diff, duplicate, and clean changed/new JSON files |

### Common tasks

#### 1) Validate release changes

- Use Diff Records to verify important business changes.
- Use Changed Field filter to focus on specific fields.
- Use Maximize JSON for long, nested field values.

#### 2) Create a clean handoff file

- Use Download Combined & Deduped to generate `changed_and_new.json`.
- Use Dedupe by fields when you want matching based on specific fields only.
- Re-run Analyze after changing options so output metrics stay accurate.

#### 3) Investigate duplicate records

- Use Duplicate Records and duplicate exports to inspect matches.
- Tune Ignore Fields to reduce false positives.
- Confirm schema mismatch warnings before final decisions.

### Before you start

- Recommended browsers: current Chrome, Edge, Firefox, Safari.
- Everything runs locally in your browser (speed depends on your machine and file size).
- Start with a small sample first, then run full exports.
- Make sure the Unique Key exists in both files.

## Common Questions

### Why do I see fewer rows in `diff_records.json` than expected?

- The export respects your current Diff filters and sort order.

### Do I need to click Analyze again after changing settings?

- Yes. Exports and dashboard metrics are based on the most recent Analyze run.

### Why is a record missing from `changed_and_new.json`?

- That export intentionally skips duplicate or noise-only matches based on current ignore/dedupe settings.

### Why are duplicate counts high?

- Broad Ignore Fields can make many records appear identical.

### Why do I see schema mismatch warning?

- The first parsed records in File 1 and File 2 have different field sets.

### How does Theme mode work?

- Theme toggles between two meaningful states: `System` and the opposite explicit theme.
- `System` follows your OS/browser color scheme automatically.
- When current mode is `System`, the next click switches to the opposite of your current system theme.
- Next click always returns to `System`.
- Example: if system is dark, toggle is `System <-> Light`; if system is light, toggle is `System <-> Dark`.
- If no theme preference exists (or an invalid legacy value is found), mode defaults to `System` and is normalized in local storage.
- Your selected mode is saved locally and reused on both app and README pages.

### Changed JSON readability tools

- Expand inline changed JSON in Diff Records
- Resize the inline JSON panel
- Use Maximize JSON for a larger, dense code-view modal
- See File 1 (`from`) and File 2 (`to`) highlights
- Use syntax highlighting in the modal (keys, strings, numbers, booleans/null, punctuation)
- View array-of-object values in a scan-friendly format
- Use line numbers and wrapped text for easier long-line review
- Modal is optimized for dense, VS Code-like readability
- Use `Esc` to close the modal
- Copy modal JSON with one click (`Copy JSON`)

## Troubleshooting

- Analyze returns unexpected zero changes:
  - Check that the Unique Key is correct and exists in both files.
- README page looks blank in local testing:
  - Open over HTTP (not `file://`) so README can be fetched.
- Metrics changed after editing options:
  - Re-run Analyze because metrics and exports depend on the last analysis.
- Long values in changed JSON are hard to read:
  - Open Maximize JSON; text wrapping is enabled in the modal.

### Good defaults for first-time users

- Keep Unique Key as `ProjectCode` unless your file uses a different stable key.
- Start with Ignore Fields: `Created,Modified,Refreshed`.
- Leave Dedupe by fields blank until you need field-specific matching.

---

## Technical Reference

## Table of Contents

- [Core Features](#core-features)
- [Project Structure](#project-structure)
- [JSON Input Expectations](#json-input-expectations)
- [Minimal Input Examples](#minimal-input-examples)
- [Options](#options)
- [Diffing Behavior](#diffing-behavior)
- [Duplicate Behavior](#duplicate-behavior)
- [Clean Changed/New Export Behavior](#clean-changednew-export-behavior)
- [Summary Dashboard Breakdown](#summary-dashboard-breakdown)
- [Outputs](#outputs)
- [Results Navigation UX](#results-navigation-ux)
- [Best Practices](#best-practices)
- [Privacy and Security](#privacy-and-security)
- [Changelog](#changelog)
- [Contribute](#contribute)
- [Glossary](#glossary)
- [License](#license)

## Core Features

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
- Optional Dedupe by fields selector for clean export matching logic
- Summary dashboard with counts + mismatch warnings
- Field-level change details with before/after values
- Sortable columns in Diff Records and Duplicate Records tables
- Diff type and changed-field filters with live updates
- Changed JSON UX enhancements:
  - Source legend chips (File 1 `from`, File 2 `to`)
  - Source value highlighting
  - Resizable inline panel
  - Maximize JSON modal
  - Dense code-view modal with line numbers
  - Modal syntax highlighting (keys, strings, numbers, booleans/null, punctuation)
  - Wrapped modal text for long values
  - `Esc` to close modal
  - Copy JSON action
  - VS Code-like visual styling in the modal (dense spacing, editor-like gutter/colors)
  - Array-of-objects formatting for readability
- Live record counters for Diff and Duplicate sections
- Results side menu for quick jumps to Summary/Diff/Duplicate sections
- Theme mode toggle with persistence (`System` + opposite explicit theme)
- In-app README guide (`readme.html`) with dismissible docs card
- Shared theme runtime module (`theme.js`) used by app + README pages
- Shared cross-page theme styling (`shared.css`) with page-level CSS variable overrides
- Stale-metric hint when settings change after analysis
- Export options:
  - `diff_records.json`
  - `duplicates_file1.json`
  - `duplicates_file2.json`
  - `duplicates_cross.json`
  - `changed_and_new.json`

## Project Structure

- `index.html`: main app shell
- `app.js`: app logic (diffing, duplicate detection, rendering, exports)
- `styles.css`: app-specific styling
- `readme.html`: in-app documentation page shell
- `readme.js`: README page rendering and anchor normalization
- `readme.css`: README page-specific styling
- `theme.js`: shared theme-mode behavior + persistence for all pages
- `shared.css`: shared cross-page styles (for example, theme toggle)
- `README.md`: user guide and technical reference source rendered by `readme.html`

## JSON Input Expectations

Supported structures:

- Plain array of objects
- Object with `Export` key array
- Object where the first key is an array

Any object entry is treated as a record.

## Minimal Input Examples

### 1) Plain array

```json
[
  { "ProjectCode": "A-1", "Title": "Bridge Repair", "BidStatus": "Open" },
  { "ProjectCode": "A-2", "Title": "Road Striping", "BidStatus": "Closed" }
]
```

### 2) Export wrapper

```json
{
  "Export": [
    { "ProjectCode": "A-1", "Title": "Bridge Repair", "BidStatus": "Open" }
  ]
}
```

### 3) Arbitrary top-level key wrapper

```json
{
  "Rows": [
    { "ProjectCode": "A-1", "Title": "Bridge Repair", "BidStatus": "Open" }
  ]
}
```

## Options

- Unique Key: lookup field used to align records between files
- Ignore Fields: excluded from duplicate hashing and clean-export comparison
- Dedupe by fields: optional field subset for clean changed/new logic
- Diff Type filter: `All`, `Added`, `Removed`, `Changed`
- Changed Field filter: show only changed rows containing selected field

## Diffing Behavior

- Keys matched by Unique Key
- `Added`: key missing in File 1
- `Removed`: key missing in File 2
- `Changed`: key exists in both and record content differs
- Field-level changes are shown as `from`/`to` deltas
- `Changed` comparisons are full-record comparisons (not reduced by Ignore Fields)

### Edge-case semantics

- Missing unique keys can collide and produce misleading results.
- Duplicate unique keys in one file can cause last-write-wins behavior in key maps.
- Field present on one side only is treated as changed.
- Type changes (for example `"10"` vs `10`) are treated as changed.
- `null` vs missing/undefined is treated as changed.

### Changed field details readability

- Expandable changed details in table rows
- Summary includes changed-field count and field chips
- Source legend and value highlights (`from` vs `to`)
- Inline panel supports resize
- Modal supports larger viewport and dense code-view readability tools:
  - Line numbers with wrapped text
  - Syntax highlighting and source-value highlights
  - Copy action and `Esc` close
- Array-of-objects values render for at-a-glance scanning
- Labels/legend communicate meaning in addition to color

## Duplicate Behavior

- Deterministic hash across non-ignored fields
- Duplicate scopes:
  - Within File 1
  - Within File 2
  - Cross-file
- Cross-file duplicates help identify propagation/export duplication

## Clean Changed/New Export Behavior

- Download Combined & Deduped generates `changed_and_new.json`
- Includes:
  - Keys new in File 2
  - Records changed meaningfully between File 1 and File 2
- Excludes true duplicate/noise-only matches
- Dedupe by fields can narrow comparison scope
- Hash-only noise excluded for clean export comparison:
  - `BidDocumentHashes`, `AddendumDocumentHashes`, `AwardDocumentHashes`
- Document arrays normalized to Title-only comparisons for clean export logic:
  - `BidDocuments`, `AddendumDocuments`, `AwardDocuments`

### Wrapper preservation

- If File 1 is wrapped (for example `{ "Export": [...] }`), output preserves File 1 wrapper key.
- If File 1 is a plain array, output is a plain array.

## Summary Dashboard Breakdown

Summary is generated after Analyze and combines diffing + duplicate metrics.

### Quick reference table

| Dashboard metric | Meaning |
|---|---|
| File 1 Records | Total parsed records in baseline file |
| File 2 Records | Total parsed records in comparison file |
| Added | Keys present only in File 2 |
| Removed | Keys present only in File 1 |
| Changed | Same key in both files with field deltas |
| Within-file Dups | Duplicate rows found inside File 1 + File 2 |
| Cross-file Dups | Rows matching across File 1 and File 2 after ignore rules |
| Removed (File 1) | Rows dropped if File 1 is deduplicated |
| Removed (File 2) | Rows dropped if File 2 is deduplicated |

Additional clean-export metric:

- Exported Records (shown in Clean Deduped Export card): projected count for `changed_and_new.json`

### Metrics and meaning

1. File 1 Records
  - Total records parsed from File 1.
2. File 2 Records
  - Total records parsed from File 2.
3. Added
  - Count of keys present in File 2 but not File 1.
4. Removed
  - Count of keys present in File 1 but not File 2.
5. Changed
  - Count of keys present in both where record values differ.
6. Within-file Dups
  - Duplicate row count inside File 1 plus File 2 after Ignore Fields.
7. Cross-file Dups
  - Duplicate row count across files after Ignore Fields.
8. Removed (File 1)
  - `file1_count - deduped_file1_count`.
9. Removed (File 2)
  - `file2_count - deduped_file2_count`.

### Schema mismatch warning

- Triggered when first parsed records have different detected field sets.
- Helps identify renamed/missing/added columns that may affect interpretation.

### Processing flow

1. Parse and normalize both files.
2. Build key maps from Unique Key.
3. Compute Added/Removed/Changed.
4. Hash records (excluding ignored fields) for duplicate detection.
5. Compare hashes across files for cross-file duplicates.
6. Compute per-file dedupe projection counts.
7. Build clean changed/new export projection.
8. Render metrics + clean export card.

### Interpretation notes

- Over-broad Ignore Fields can inflate duplicate counts.
- Weak/missing Unique Key values can skew diff accuracy.
- Duplicate and change counts are independent dimensions.
- Re-run Analyze after setting changes before trusting exports.

## Outputs

- `diff_records.json`
  - `rows`: currently visible diff rows (respects type filter, changed-field filter, and sort)
  - `originalRecords`: grouped `added`, `removed`, `changedFromFile1`, `changedFromFile2` preserving source wrapper schemas
- `duplicates_file1.json`
- `duplicates_file2.json`
- `duplicates_cross.json`
- `changed_and_new.json`

## Results Navigation UX

- Side menu appears after Analyze with links to Summary, Diff, and Duplicate sections.
- Active link tracks the section nearest the sticky-header reading position while scrolling.
- Smooth anchor scrolling with reduced-motion fallback.

## Best Practices

- Ensure unique key exists for every record in both files.
- Keep field naming consistent across exports.
- Start with narrow Ignore Fields and expand carefully.
- Validate cross-file duplicates before downstream automated actions.

## Privacy and Security

- Processing is local in browser; no server-side data processing.
- `readme.html` uses CDN-hosted `github-markdown-css` and `marked` for documentation rendering.

## Changelog

### 2026-03-23

- Refactored inline scripts/styles into dedicated assets (`theme.js`, `readme.js`, `readme.css`, `shared.css`).
- Centralized theme behavior in `theme.js` and kept two-state toggle behavior consistent across app + README.
- Reconciled shared theme-toggle styling into `shared.css` with page-level variable customization.
- Removed unused/redundant helper code and unified JSON source-value formatting paths in `app.js`.
- Revamped Maximize JSON modal into a simplified dense code-view.
- Removed modal editor-style controls (search/navigation, wrap toggle, font controls, fold controls).
- Kept syntax highlighting, source-change highlighting, line numbers, copy action, and `Esc` close.
- Updated modal styling to be more VS Code-like and enabled wrapped modal text.

### 2026-03-22

- Added changed-value source highlighting (`from` / `to`).
- Added legend chips for changed details.
- Added resizable changed JSON panel.
- Added Maximize JSON modal with readability improvements.
- Added syntax highlighting and array-of-objects readability improvements.
- Added side-nav Summary link and improved active-section highlighting behavior.
- Added persistent theme mode toggle across app and README.
- Restructured README for user-first guidance + comprehensive technical reference.

## Contribute

1. Fork and clone repository.
2. Start local static server in project directory:
   - `python3 -m http.server 8080`
3. Open `http://localhost:8080` and test with sample JSON.
4. Update behavior docs in README for feature changes.
5. Open PR with repro steps and before/after summary.

## Glossary

- Record: one object entry from parsed array.
- Unique Key: field used to align records across files.
- Changed row: same key in both files with one or more field deltas.
- Duplicate row: record treated as equivalent under duplicate hashing.
- Cross-file duplicate: duplicate match across File 1 and File 2.
- Clean export: `changed_and_new.json` with meaningful new/changed rows.

## License

MIT
