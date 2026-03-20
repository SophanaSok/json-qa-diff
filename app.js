let state = {};

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
      if (Object.keys(changes).length > 0) diffs.push({ type: 'changed', key, changes, record: r2 });
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

  state = { diffs, dups1, dups2, crossDups, uk };

  function hashIgnoringBidDocs(obj) {
  const filtered = {};
  for (const k of Object.keys(obj).sort()) {
    if (k !== 'BidDocumentHashes' && !ignored.includes(k)) filtered[k] = obj[k];
  }
  return JSON.stringify(filtered);
  }

  function dedupArray(arr) {
    const seen = new Map();
    for (const r of arr) {
      const h = hashIgnoringBidDocs(r);
      seen.set(h, r); // always overwrite → keeps latest
    }
    return [...seen.values()];
  }

  const deduped1 = dedupArray(arr1);
  const deduped2 = dedupArray(arr2);

  state = { diffs, dups1, dups2, crossDups, uk, deduped1, deduped2, raw1, raw2 };

  const added   = diffs.filter(d => d.type === 'added').length;
  const removed = diffs.filter(d => d.type === 'removed').length;
  const changed = diffs.filter(d => d.type === 'changed').length;

  document.getElementById('statsCard').innerHTML = `
    <h2 class="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">📊 Summary</h2>
    ${!schemaMatch ? '<div class="text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 text-sm mb-3">⚠️ Schema mismatch detected between files.</div>' : ''}
    <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
      <div class="bg-slate-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-slate-700">${arr1.length}</div><div class="text-xs text-slate-400 mt-0.5">File 1 Records</div></div>
      <div class="bg-slate-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-slate-700">${arr2.length}</div><div class="text-xs text-slate-400 mt-0.5">File 2 Records</div></div>
      <div class="bg-green-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-green-700">${added}</div><div class="text-xs text-green-500 mt-0.5">Added</div></div>
      <div class="bg-red-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-red-700">${removed}</div><div class="text-xs text-red-400 mt-0.5">Removed</div></div>
      <div class="bg-yellow-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-yellow-700">${changed}</div><div class="text-xs text-yellow-500 mt-0.5">Changed</div></div>
      <div class="bg-violet-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-violet-700">${dups1.length + dups2.length}</div><div class="text-xs text-violet-400 mt-0.5">Within-file Dups</div></div>
      <div class="bg-violet-50 rounded-lg p-3 text-center"><div class="text-2xl font-bold text-violet-700">${crossDups.length}</div><div class="text-xs text-violet-400 mt-0.5">Cross-file Dups</div></div>
    </div>`;

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

function dlDeduped(which) {
  const arr = which === 'file1' ? state.deduped1 : state.deduped2;
  const originalWrapper = which === 'file1' ? state.raw1 : state.raw2;
  let out;
  if (!Array.isArray(originalWrapper) && typeof originalWrapper === 'object') {
    const wrapKey = Object.keys(originalWrapper)[0];
    out = { [wrapKey]: arr };
  } else {
    out = arr;
  }
  download(`deduped_${which}.json`, out);
}

function dlDiff() {
  const out = state.diffs.map(d => ({ ProjectCode: d.key, type: d.type, changes: d.changes || null, record: d.record }));
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