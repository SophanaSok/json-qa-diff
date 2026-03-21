let state = {};
let summaryTooltipOutsideBound = false;
let staleHintBindingsInitialized = false;

function setCleanExportStaleNotice(show) {
  const staleNotice = document.getElementById('cleanExportStaleNotice');
  if (!staleNotice) return;
  staleNotice.classList.toggle('hidden', !show);
}

function initStaleMetricHint() {
  if (staleHintBindingsInitialized) return;

  const watchedIds = ['ignoreFields', 'dedupeFields', 'uniqueKey', 'file1', 'file2'];
  watchedIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const eventName = el.tagName === 'INPUT' && el.type === 'file' ? 'change' : 'input';
    el.addEventListener(eventName, () => {
      if (state.hasAnalyzed) {
        setCleanExportStaleNotice(true);
      }
    });
  });

  staleHintBindingsInitialized = true;
}

function bindTouchTooltipCards(container) {
  const isHoverDevice = window.matchMedia && window.matchMedia('(hover: hover)').matches;
  if (isHoverDevice || !container) return;

  const metricCards = container.querySelectorAll('.summary-metric-card');
  metricCards.forEach((card) => {
    card.addEventListener('click', (event) => {
      const wasOpen = card.classList.contains('tooltip-open');
      metricCards.forEach((c) => c.classList.remove('tooltip-open'));
      if (!wasOpen) card.classList.add('tooltip-open');
      event.stopPropagation();
    });
    card.addEventListener('blur', () => card.classList.remove('tooltip-open'));
  });

  if (!summaryTooltipOutsideBound) {
    document.addEventListener('click', (event) => {
      if (event.target.closest('.summary-metric-card')) return;
      document.querySelectorAll('.summary-metric-card.tooltip-open').forEach((c) => c.classList.remove('tooltip-open'));
    });
    summaryTooltipOutsideBound = true;
  }
}

function unwrap(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.Export)) return data.Export;
  const firstKey = Object.keys(data)[0];
  if (firstKey && Array.isArray(data[firstKey])) return data[firstKey];
  throw new Error('Could not find an array in this JSON file. Expected { "Export": [...] } or a plain array.');
}

function getIgnored() {
  return document.getElementById('ignoreFields').value.split(',').map(s => s.trim()).filter(Boolean);
}

function getDedupeFields() {
  return document.getElementById('dedupeFields').value.split(',').map(s => s.trim()).filter(Boolean);
}

function recordHash(obj, ignoreFields) {
  const filtered = {};
  for (const k of Object.keys(obj).sort()) {
    if (!ignoreFields.includes(k)) filtered[k] = obj[k];
  }
  return JSON.stringify(filtered);
}

function fieldDiff(a, b) {
  const changes = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) {
      changes[k] = { from: a[k], to: b[k] };
    }
  }
  return changes;
}

function dedupArray(arr, ignored) {
  const seen = new Map();
  for (const r of arr) {
    const filtered = {};
    for (const k of Object.keys(r).sort()) {
      if (k !== 'BidDocumentHashes' && !ignored.includes(k)) filtered[k] = r[k];
    }
    seen.set(JSON.stringify(filtered), r);
  }
  return [...seen.values()];
}

// Strips Hash and URL from document arrays — compares only Title
function normDocs(val) {
  try {
    const docs = typeof val === 'string' ? JSON.parse(val) : val;
    if (Array.isArray(docs)) {
      return JSON.stringify(docs.map(d => d.Title || '').sort());
    }
  } catch(e) {}
  return val;
}

const DOC_FIELDS  = ['BidDocuments', 'AddendumDocuments', 'AwardDocuments'];
const HASH_FIELDS = ['BidDocumentHashes', 'AddendumDocumentHashes', 'AwardDocumentHashes'];

function coreHash(obj, ignored, dedupeFields) {
  const filtered = {};
  const keys = dedupeFields && dedupeFields.length > 0
    ? dedupeFields
    : Object.keys(obj).sort().filter(k => !ignored.includes(k) && !HASH_FIELDS.includes(k));

  for (const k of keys) {
    if (ignored.includes(k))     continue;
    if (HASH_FIELDS.includes(k)) continue;
    if (DOC_FIELDS.includes(k))  { filtered[k] = normDocs(obj[k]); continue; }
    filtered[k] = obj[k];
  }
  return JSON.stringify(filtered);
}

function buildCleanExportPayload(arr1, arr2, raw1, uk, ignored, dedupeFields) {
  const map1 = new Map(arr1.map(r => [r[uk], r]));
  const result = [];

  for (const r2 of arr2) {
    const r1 = map1.get(r2[uk]);
    if (!r1) {
      result.push(r2);                                        // new record — include
    } else if (coreHash(r1, ignored, dedupeFields) !== coreHash(r2, ignored, dedupeFields)) {
      result.push(r2);                                        // real change — include File 2 version
    }
    // else: true duplicate (only Hash/URL noise differs) — skip
  }

  let out;
  if (raw1 && !Array.isArray(raw1) && typeof raw1 === 'object') {
    out = { [Object.keys(raw1)[0]]: result };
  } else {
    out = result;
  }

  return { result, out };
}

async function run() {
  const f1 = document.getElementById('file1').files[0];
  const f2 = document.getElementById('file2').files[0];
  if (!f1 || !f2) return alert('Please upload both files.');

  let raw1, raw2;
  try {
    raw1 = JSON.parse(await f1.text());
    raw2 = JSON.parse(await f2.text());
  } catch(e) { return alert('JSON parse error: ' + e.message); }

  let arr1, arr2;
  try { arr1 = unwrap(raw1); arr2 = unwrap(raw2); }
  catch(e) { return alert(e.message); }

  const uk = document.getElementById('uniqueKey').value.trim() || 'ProjectCode';
  const ignored = getIgnored();

  const keys1 = arr1[0] ? Object.keys(arr1[0]).sort().join(',') : '';
  const keys2 = arr2[0] ? Object.keys(arr2[0]).sort().join(',') : '';
  const schemaMatch = keys1 === keys2;

  const map1 = new Map(arr1.map(r => [r[uk], r]));
  const map2 = new Map(arr2.map(r => [r[uk], r]));

  const diffs = [];
  const allKeys = new Set([...map1.keys(), ...map2.keys()]);
  for (const key of allKeys) {
    const r1 = map1.get(key), r2 = map2.get(key);
    if (r1 && r2) {
      const changes = fieldDiff(r1, r2);
      if (Object.keys(changes).length > 0) {
        diffs.push({ type: 'changed', key, changes, record: r2 });
      }
    } else if (r1) {
      diffs.push({ type: 'removed', key, record: r1 });
    } else {
      diffs.push({ type: 'added', key, record: r2 });
    }
  }

  const hmap1 = new Map();
  for (const r of arr1) {
    const h = recordHash(r, ignored);
    if (!hmap1.has(h)) hmap1.set(h, []);
    hmap1.get(h).push({ ...r, _source: 'file1' });
  }
  const dups1 = [...hmap1.values()].filter(g => g.length > 1).flat();

  const hmap2 = new Map();
  for (const r of arr2) {
    const h = recordHash(r, ignored);
    if (!hmap2.has(h)) hmap2.set(h, []);
    hmap2.get(h).push({ ...r, _source: 'file2' });
  }
  const dups2 = [...hmap2.values()].filter(g => g.length > 1).flat();

  const crossDups = [];
  for (const [h, recs] of hmap2.entries()) {
    if (hmap1.has(h)) {
      crossDups.push(...hmap1.get(h).map(r => ({ ...r, _source: 'file1' })));
      crossDups.push(...recs.map(r => ({ ...r, _source: 'file2' })));
    }
  }

  const deduped1 = dedupArray(arr1, ignored);
  const deduped2 = dedupArray(arr2, ignored);
  const dedupeFields = getDedupeFields();
  const cleanExportPayload = buildCleanExportPayload(arr1, arr2, raw1, uk, ignored, dedupeFields);
  const cleanExportCount = cleanExportPayload.result.length;

  state = {
    diffs,
    dups1,
    dups2,
    crossDups,
    uk,
    deduped1,
    deduped2,
    raw1,
    raw2,
    arr1raw: arr1,
    arr2raw: arr2,
    cleanExportCount,
    hasAnalyzed: true
  };

  setCleanExportStaleNotice(false);

  const added   = diffs.filter(d => d.type === 'added').length;
  const removed = diffs.filter(d => d.type === 'removed').length;
  const changed = diffs.filter(d => d.type === 'changed').length;

  function metricCard(value, label, description, cardClass, valueClass, labelClass) {
    return `<div class="summary-metric-card ${cardClass}" tabindex="0" title="${description}" aria-label="${label}: ${description}">
      <div class="text-2xl font-bold ${valueClass}">${value}</div>
      <div class="summary-metric-label text-xs mt-0.5 ${labelClass}">${label}<span class="summary-metric-help" aria-hidden="true">i</span></div>
      <div class="summary-metric-tooltip" role="tooltip">${description}</div>
    </div>`;
  }

  document.getElementById('statsCard').innerHTML = `
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">📊 Summary</h2>
    <p class="text-xs text-gray-400 mb-3">Hover or focus any metric to view details. On touch devices, tap a metric.</p>
    ${!schemaMatch ? '<div class="text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm mb-3">⚠️ Schema mismatch detected between files.</div>' : ''}
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-9 gap-3">
      ${metricCard(arr1.length, 'File 1 Records', 'Total parsed records in the baseline file.', 'bg-slate-50', 'text-slate-700', 'text-slate-500')}
      ${metricCard(arr2.length, 'File 2 Records', 'Total parsed records in the comparison file.', 'bg-slate-50', 'text-slate-700', 'text-slate-500')}
      ${metricCard(added, 'Added', 'Unique keys present in File 2 but not in File 1.', 'bg-green-50', 'text-green-700', 'text-green-600')}
      ${metricCard(removed, 'Removed', 'Unique keys present in File 1 but not in File 2.', 'bg-red-50', 'text-red-700', 'text-red-500')}
      ${metricCard(changed, 'Changed', 'Records with the same unique key in both files where one or more field values differ.', 'bg-yellow-50', 'text-yellow-700', 'text-yellow-600')}
      ${metricCard(dups1.length + dups2.length, 'Within-file Dups', 'Duplicate rows found inside File 1 and File 2 after Ignore Fields are excluded.', 'bg-violet-50', 'text-violet-700', 'text-violet-600')}
      ${metricCard(crossDups.length, 'Cross-file Dups', 'Rows that match across both files after Ignore Fields are excluded.', 'bg-violet-50', 'text-violet-700', 'text-violet-600')}
      ${metricCard(arr1.length - deduped1.length, 'Removed (File 1)', 'Rows that would be removed when deduplicating File 1 with current settings.', 'bg-teal-50', 'text-teal-700', 'text-teal-600')}
      ${metricCard(arr2.length - deduped2.length, 'Removed (File 2)', 'Rows that would be removed when deduplicating File 2 with current settings.', 'bg-teal-50', 'text-teal-700', 'text-teal-600')}
    </div>`;

  const statsCard = document.getElementById('statsCard');
  bindTouchTooltipCards(statsCard);

  const cleanExportMetric = document.getElementById('cleanExportMetric');
  if (cleanExportMetric) {
    cleanExportMetric.classList.remove('hidden');
    const cleanMetricDescription = 'Total records in the exported changed_and_new.json file. Includes records that are new in File 2 or meaningfully changed versus File 1 after applying Ignore Fields and optional Dedupe by fields rules. Excludes duplicate/noise-only rows where differences are only document hash fields.';
    cleanExportMetric.innerHTML = `
      <div class="summary-metric-card bg-teal-50 inline-flex flex-col items-center px-4 py-3" tabindex="0" title="${cleanMetricDescription}" aria-label="Exported Records: ${cleanMetricDescription}">
        <div class="text-2xl font-bold text-teal-700">${cleanExportCount}</div>
        <div class="summary-metric-label text-xs mt-0.5 text-teal-600">Exported Records<span class="summary-metric-help" aria-hidden="true">i</span></div>
        <div class="summary-metric-tooltip" role="tooltip">${cleanMetricDescription}</div>
      </div>`;
    bindTouchTooltipCards(cleanExportMetric);
  }

  const dtHTML = diffs.length === 0
    ? '<p class="text-sm text-green-600 font-medium py-4">✅ No differences found between these files.</p>'
    : `<table>
        <thead><tr><th>ProjectCode</th><th>Type</th><th>Title</th><th>BidStatus</th><th>Changed Fields</th></tr></thead>
        <tbody>
          ${diffs.map(d => `
            <tr>
              <td><code>${d.key}</code></td>
              <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${d.type === 'added' ? 'bg-green-100 text-green-800' : d.type === 'removed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}">${d.type}</span></td>
              <td>${(d.record.Title || '').slice(0, 60)}${d.record.Title?.length > 60 ? '…' : ''}</td>
              <td>${d.record.BidStatus || '—'}</td>
              <td>${d.type === 'changed'
                ? '<details><summary>' + Object.keys(d.changes).join(', ') + '</summary><pre>' + JSON.stringify(d.changes, null, 2) + '</pre></details>'
                : '—'}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  document.getElementById('diffTable').innerHTML = dtHTML;

  const allDups = [
    ...dups1.map(r => ({ ...r, _dupType: 'within-file1' })),
    ...dups2.map(r => ({ ...r, _dupType: 'within-file2' })),
    ...crossDups.map(r => ({ ...r, _dupType: 'cross-file' }))
  ];
  const dupHTML = allDups.length === 0
    ? '<p class="text-sm text-green-600 font-medium py-4">✅ No duplicates found.</p>'
    : `<table>
        <thead><tr><th>ProjectCode</th><th>Title</th><th>BidStatus</th><th>Source</th><th>Dup Type</th></tr></thead>
        <tbody>
          ${allDups.map(r => `
            <tr>
              <td><code>${r[uk] || '—'}</code></td>
              <td>${(r.Title || '').slice(0, 60)}${r.Title?.length > 60 ? '…' : ''}</td>
              <td>${r.BidStatus || '—'}</td>
              <td>${r._source}</td>
              <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">${r._dupType}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  document.getElementById('dupTable').innerHTML = dupHTML;

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth' });
}

function dlDeduped() {
  if (!state.arr1raw || !state.arr2raw) return alert('Please run Analyze first.');

  const ignored = getIgnored();
  const dedupeFields = getDedupeFields();
  const cleanExportPayload = buildCleanExportPayload(state.arr1raw, state.arr2raw, state.raw1, state.uk, ignored, dedupeFields);

  download('changed_and_new.json', cleanExportPayload.out);
}

function dlDiff() {
  const out = state.diffs.map(d => ({
    ProjectCode: d.key,
    type: d.type,
    changes: d.changes || null,
    record: d.record
  }));
  download('diff_records.json', out);
}

function dlDups(which) {
  const data = which === 'file1' ? state.dups1 : which === 'file2' ? state.dups2 : state.crossDups;
  download('duplicates_' + which + '.json', data);
}

function download(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function initDocumentationCard() {
  const card = document.getElementById('docCard');
  if (!card) return;

  const storageKey = 'jsonQaReadmeVisited';
  const hasVisited = localStorage.getItem(storageKey) === '1';
  if (hasVisited) {
    card.classList.add('hidden');
  }

  const dismissButton = document.getElementById('dismissDocCard');
  if (dismissButton) {
    dismissButton.addEventListener('click', () => {
      localStorage.setItem(storageKey, '1');
      card.classList.add('hidden');
    });
  }

  const readmeLinks = document.querySelectorAll('[data-readme-link="true"]');
  readmeLinks.forEach((link) => {
    link.addEventListener('click', () => {
      localStorage.setItem(storageKey, '1');
    });
  });
}

initDocumentationCard();
initStaleMetricHint();