let state = {};
let summaryTooltipOutsideBound = false;
let staleHintBindingsInitialized = false;
let resultsMenuBindingsInitialized = false;
const tableSortState = {
  diff: { key: 'key', direction: 'asc' },
  dup: { key: 'projectCode', direction: 'asc' }
};
const tableFilterState = {
  diffType: 'all',
  changedField: 'all'
};
const changesModalViewState = {
  plainLines: [],
  htmlLines: [],
  sectionMap: new Map(),
  collapsedSections: new Set(),
  searchMatches: [],
  activeMatchIndex: -1,
  wrapEnabled: true,
  fontStep: 0,
  activeLine: null
};

function normalizeSortValue(value) {
  if (value === null || value === undefined) return '';
  return String(value).toLowerCase();
}

function compareValues(a, b, direction) {
  if (a < b) return direction === 'asc' ? -1 : 1;
  if (a > b) return direction === 'asc' ? 1 : -1;
  return 0;
}

function sortRows(rows, accessor, direction) {
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const cmp = compareValues(accessor(a.row), accessor(b.row), direction);
      return cmp !== 0 ? cmp : a.index - b.index;
    })
    .map(({ row }) => row);
}

function sortIndicator(tableName, columnKey) {
  const active = tableSortState[tableName];
  if (active.key !== columnKey) return '&#8597;';
  return active.direction === 'asc' ? '&#8593;' : '&#8595;';
}

function sortableHeader(tableName, columnKey, label) {
  return `<th><button type="button" class="sort-header-btn" onclick="toggleTableSort('${tableName}', '${columnKey}')">${label}<span class="sort-indicator">${sortIndicator(tableName, columnKey)}</span></button></th>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function beautifyArrayOfObjects(value) {
  let arr = value;
  
  // If value is a stringified JSON, try to parse it
  if (typeof value === 'string') {
    try {
      arr = JSON.parse(value);
    } catch (e) {
      return null;
    }
  }
  
  if (!Array.isArray(arr)) return null;
  if (arr.length === 0) return '[]';
  if (typeof arr[0] !== 'object' || arr[0] === null) return null;

  const items = arr.map((item) => {
    const keys = Object.keys(item);
    const pairs = keys.map((key) => {
      const val = item[key];
      const serializedVal = JSON.stringify(val);
      return `      "${key}": ${serializedVal}`;
    });
    
    const objectContent = pairs.join(',\n');
    return `    {\n${objectContent}\n    }`;
  });

  return `[\n${items.join(',\n')}\n  ]`;
}

function stringifyDiffValue(value) {
  const serialized = value === undefined ? 'undefined' : JSON.stringify(value, null, 2);
  return escapeHtml(serialized === undefined ? 'undefined' : serialized);
}

function stringifyDiffValueRaw(value) {
  if (value === undefined) return 'undefined';
  const beautified = beautifyArrayOfObjects(value);
  if (beautified !== null) return beautified;
  const serialized = JSON.stringify(value, null, 2);
  return serialized === undefined ? 'undefined' : serialized;
}

function tokenizeJsonFragment(fragment) {
  const tokenRegex = /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\b(?:true|false|null)\b|[{}\[\]:,]/g;
  let result = '';
  let cursor = 0;
  let match;

  while ((match = tokenRegex.exec(fragment)) !== null) {
    const start = match.index;
    if (start > cursor) {
      result += escapeHtml(fragment.slice(cursor, start));
    }

    const token = match[0];
    let cls = 'json-punct';
    if (token.startsWith('"')) cls = 'json-value-string';
    else if (/^-?\d/.test(token)) cls = 'json-value-number';
    else if (/^(true|false|null)$/i.test(token)) cls = 'json-value-keyword';

    result += `<span class="${cls}">${escapeHtml(token)}</span>`;
    cursor = start + token.length;
  }

  if (cursor < fragment.length) {
    result += escapeHtml(fragment.slice(cursor));
  }

  return result;
}

function toIndentDepth(text) {
  const leadingSpaces = (text.match(/^\s*/) || [''])[0].length;
  return Math.floor(leadingSpaces / 2);
}

function buildSourceValueLineParts(label, value, sourceClass, trailingComma = false) {
  const rawValue = stringifyDiffValueRaw(value);
  const valueLines = rawValue.split('\n');
  const labelHtml = `<span class="json-key">&quot;${label}&quot;</span><span class="json-punct">:</span>`;
  const labelText = `"${label}":`;

  if (valueLines.length === 1) {
    const commaHtml = trailingComma ? '<span class="json-punct">,</span>' : '';
    const commaText = trailingComma ? ',' : '';
    return [{
      html: `    ${labelHtml} <span class="change-value ${sourceClass}">${tokenizeJsonFragment(valueLines[0])}</span>${commaHtml}`,
      text: `    ${labelText} ${valueLines[0]}${commaText}`
    }];
  }

  const parts = [{ html: `    ${labelHtml}`, text: `    ${labelText}` }];
  valueLines.forEach((line, index) => {
    const isLast = index === valueLines.length - 1;
    const commaHtml = trailingComma && isLast ? '<span class="json-punct">,</span>' : '';
    const commaText = trailingComma && isLast ? ',' : '';
    parts.push({
      html: `      <span class="change-value ${sourceClass}">${tokenizeJsonFragment(line)}</span>${commaHtml}`,
      text: `      ${line}${commaText}`
    });
  });

  return parts;
}

function buildChangesModalEditorModel(diffRow) {
  const changedFields = Object.keys(diffRow?.changes || {}).sort((a, b) => a.localeCompare(b));
  const lines = [];
  const sectionMap = new Map();

  const pushLine = (line) => {
    lines.push({
      html: line.html,
      text: line.text,
      sectionId: line.sectionId || null,
      depth: toIndentDepth(line.text)
    });
  };

  pushLine({ html: '<span class="json-punct">{</span>', text: '{' });

  changedFields.forEach((field, index) => {
    const sectionId = `field-${index}`;
    const change = diffRow.changes[field] || {};
    const startLine = lines.length + 1;
    const hasTrailingComma = index < changedFields.length - 1;

    pushLine({
      html: `  <button type="button" class="json-fold-btn" data-fold-id="${sectionId}" aria-label="Collapse ${escapeHtml(field)} block" title="Collapse/expand block">▾</button><span class="json-key">&quot;${escapeHtml(field)}&quot;</span><span class="json-punct">:</span> <span class="json-punct">{</span><span class="json-fold-summary" hidden></span>`,
      text: `  "${field}": {`,
      sectionId
    });

    buildSourceValueLineParts('from', change.from, 'change-value-file1', true)
      .forEach((part) => pushLine({ ...part, sectionId }));
    buildSourceValueLineParts('to', change.to, 'change-value-file2', false)
      .forEach((part) => pushLine({ ...part, sectionId }));

    pushLine({
      html: `  <span class="json-punct">}${hasTrailingComma ? ',' : ''}</span>`,
      text: `  }${hasTrailingComma ? ',' : ''}`,
      sectionId
    });

    sectionMap.set(sectionId, {
      sectionId,
      field,
      startLine,
      endLine: lines.length,
      hiddenLineCount: Math.max(lines.length - startLine, 0)
    });
  });

  pushLine({ html: '<span class="json-punct">}</span>', text: '}' });

  return { lines, sectionMap };
}

function setModalSearchCountText(active, total) {
  const countEl = document.getElementById('changesModalSearchCount');
  if (!countEl) return;
  countEl.textContent = `${active} / ${total}`;
}

function renderChangesModalEditor(diffRow) {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl) return;

  const model = buildChangesModalEditorModel(diffRow);
  changesModalViewState.plainLines = model.lines.map((line) => line.text);
  changesModalViewState.htmlLines = model.lines.map((line) => line.html || '&nbsp;');
  changesModalViewState.sectionMap = model.sectionMap;
  changesModalViewState.collapsedSections = new Set();
  changesModalViewState.searchMatches = [];
  changesModalViewState.activeMatchIndex = -1;
  changesModalViewState.activeLine = null;

  jsonEl.innerHTML = model.lines
    .map((line, index) => `
      <div class="json-line" data-line-number="${index + 1}" data-indent-depth="${line.depth}"${line.sectionId ? ` data-section-id="${line.sectionId}"` : ''}>
        <span class="json-gutter">${index + 1}</span>
        <span class="json-code">${line.html || '&nbsp;'}</span>
      </div>`)
    .join('');

  jsonEl.querySelectorAll('.json-line').forEach((lineEl) => {
    lineEl.addEventListener('click', () => {
      jsonEl.querySelector('.json-line.is-active')?.classList.remove('is-active');
      lineEl.classList.add('is-active');
      changesModalViewState.activeLine = Number(lineEl.dataset.lineNumber);
    });
  });

  jsonEl.querySelectorAll('.json-fold-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const sectionId = button.dataset.foldId;
      if (!sectionId) return;
      toggleChangesModalSection(sectionId);
    });
  });

  applyChangesModalWrapState();
  applyChangesModalFontSize();
  const searchInput = document.getElementById('changesModalSearch');
  if (searchInput) {
    searchInput.value = '';
  }
  setModalSearchCountText(0, 0);
}

function clearJsonTokenMatchHighlights(container) {
  if (!container) return;
  container.querySelectorAll('mark.json-token-match').forEach((markEl) => {
    const parent = markEl.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(markEl.textContent || ''), markEl);
    parent.normalize();
  });
}

function highlightQueryInLineCode(codeEl, queryLower) {
  if (!codeEl || !queryLower) return;

  const textNodes = [];
  const walker = document.createTreeWalker(codeEl, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node?.nodeValue) textNodes.push(node);
  }

  textNodes.forEach((textNode) => {
    const raw = textNode.nodeValue || '';
    const haystack = raw.toLowerCase();
    let fromIndex = 0;
    let idx = haystack.indexOf(queryLower, fromIndex);
    if (idx === -1) return;

    const fragment = document.createDocumentFragment();
    while (idx !== -1) {
      if (idx > fromIndex) {
        fragment.appendChild(document.createTextNode(raw.slice(fromIndex, idx)));
      }

      const end = idx + queryLower.length;
      const mark = document.createElement('mark');
      mark.className = 'json-token-match';
      mark.textContent = raw.slice(idx, end);
      fragment.appendChild(mark);

      fromIndex = end;
      idx = haystack.indexOf(queryLower, fromIndex);
    }

    if (fromIndex < raw.length) {
      fragment.appendChild(document.createTextNode(raw.slice(fromIndex)));
    }

    textNode.parentNode?.replaceChild(fragment, textNode);
  });
}

function applyChangesModalWrapState() {
  const jsonEl = document.getElementById('changesModalJson');
  const wrapBtn = document.getElementById('changesModalWrapToggle');
  if (!jsonEl || !wrapBtn) return;

  jsonEl.classList.toggle('is-wrapped', changesModalViewState.wrapEnabled);
  wrapBtn.textContent = `Wrap: ${changesModalViewState.wrapEnabled ? 'On' : 'Off'}`;
  wrapBtn.setAttribute('aria-pressed', changesModalViewState.wrapEnabled ? 'true' : 'false');
}

function applyChangesModalFontSize() {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl) return;

  const sizes = ['is-font-small', 'is-font-normal', 'is-font-large'];
  jsonEl.classList.remove(...sizes);
  if (changesModalViewState.fontStep <= -1) {
    jsonEl.classList.add('is-font-small');
  } else if (changesModalViewState.fontStep >= 1) {
    jsonEl.classList.add('is-font-large');
  } else {
    jsonEl.classList.add('is-font-normal');
  }
}

function toggleChangesModalSection(sectionId, collapseExplicit = null) {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl) return;

  const section = changesModalViewState.sectionMap.get(sectionId);
  if (!section) return;

  const isCollapsed = changesModalViewState.collapsedSections.has(sectionId);
  const shouldCollapse = collapseExplicit === null ? !isCollapsed : collapseExplicit;

  if (shouldCollapse) {
    changesModalViewState.collapsedSections.add(sectionId);
  } else {
    changesModalViewState.collapsedSections.delete(sectionId);
  }

  const rowEls = [...jsonEl.querySelectorAll(`.json-line[data-section-id="${sectionId}"]`)];
  rowEls.forEach((rowEl) => {
    const lineNumber = Number(rowEl.dataset.lineNumber);
    if (lineNumber > section.startLine) {
      rowEl.classList.toggle('is-fold-hidden', shouldCollapse);
    }
  });

  const startRow = jsonEl.querySelector(`.json-line[data-line-number="${section.startLine}"]`);
  if (!startRow) return;

  startRow.classList.toggle('is-fold-collapsed', shouldCollapse);
  const foldBtn = startRow.querySelector('.json-fold-btn');
  const foldSummary = startRow.querySelector('.json-fold-summary');
  if (foldBtn) {
    foldBtn.textContent = shouldCollapse ? '▸' : '▾';
    foldBtn.setAttribute('aria-label', `${shouldCollapse ? 'Expand' : 'Collapse'} ${section.field} block`);
  }
  if (foldSummary) {
    if (shouldCollapse) {
      foldSummary.hidden = false;
      foldSummary.textContent = ` // ... ${section.hiddenLineCount} line${section.hiddenLineCount === 1 ? '' : 's'}`;
    } else {
      foldSummary.hidden = true;
      foldSummary.textContent = '';
    }
  }

  runChangesModalSearch();
}

function setAllChangesModalSectionsCollapsed(collapse) {
  for (const sectionId of changesModalViewState.sectionMap.keys()) {
    toggleChangesModalSection(sectionId, collapse);
  }
}

function runChangesModalSearch() {
  const jsonEl = document.getElementById('changesModalJson');
  const searchInput = document.getElementById('changesModalSearch');
  if (!jsonEl || !searchInput) return;

  const query = searchInput.value.trim().toLowerCase();
  changesModalViewState.searchMatches = [];
  changesModalViewState.activeMatchIndex = -1;

  jsonEl.querySelectorAll('.json-line').forEach((rowEl) => {
    rowEl.classList.remove('json-line-search-hit', 'json-line-search-active');
    clearJsonTokenMatchHighlights(rowEl);
    if (!query) return;

    const lineNumber = Number(rowEl.dataset.lineNumber);
    const lineText = (changesModalViewState.plainLines[lineNumber - 1] || '').toLowerCase();
    if (!lineText.includes(query)) return;
    if (rowEl.classList.contains('is-fold-hidden')) return;

    rowEl.classList.add('json-line-search-hit');
    highlightQueryInLineCode(rowEl.querySelector('.json-code'), query);
    changesModalViewState.searchMatches.push(lineNumber);
  });

  if (!query || changesModalViewState.searchMatches.length === 0) {
    setModalSearchCountText(0, changesModalViewState.searchMatches.length);
    return;
  }

  changesModalViewState.activeMatchIndex = 0;
  focusChangesModalSearchMatch();
}

function focusChangesModalSearchMatch() {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl) return;

  jsonEl.querySelectorAll('.json-line-search-active').forEach((line) => line.classList.remove('json-line-search-active'));

  const total = changesModalViewState.searchMatches.length;
  if (total === 0 || changesModalViewState.activeMatchIndex < 0) {
    setModalSearchCountText(0, total);
    return;
  }

  const lineNumber = changesModalViewState.searchMatches[changesModalViewState.activeMatchIndex];
  const lineEl = jsonEl.querySelector(`.json-line[data-line-number="${lineNumber}"]`);
  if (!lineEl) {
    setModalSearchCountText(0, total);
    return;
  }

  lineEl.classList.add('json-line-search-active');
  lineEl.scrollIntoView({ block: 'center', inline: 'nearest' });
  setModalSearchCountText(changesModalViewState.activeMatchIndex + 1, total);
}

function stepChangesModalSearch(direction) {
  const total = changesModalViewState.searchMatches.length;
  if (total === 0) return;

  const next = (changesModalViewState.activeMatchIndex + direction + total) % total;
  changesModalViewState.activeMatchIndex = next;
  focusChangesModalSearchMatch();
}

function getVisibleModalLineElements() {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl) return [];
  return [...jsonEl.querySelectorAll('.json-line')].filter((lineEl) => !lineEl.classList.contains('is-fold-hidden'));
}

function setActiveChangesModalLine(lineEl) {
  const jsonEl = document.getElementById('changesModalJson');
  if (!jsonEl || !lineEl) return;
  jsonEl.querySelector('.json-line.is-active')?.classList.remove('is-active');
  lineEl.classList.add('is-active');
  changesModalViewState.activeLine = Number(lineEl.dataset.lineNumber);
  lineEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

function moveActiveChangesModalLine(direction) {
  const visibleLines = getVisibleModalLineElements();
  if (visibleLines.length === 0) return;

  const currentIndex = visibleLines.findIndex((lineEl) => Number(lineEl.dataset.lineNumber) === changesModalViewState.activeLine);
  const fallback = direction > 0 ? 0 : visibleLines.length - 1;
  const startIndex = currentIndex >= 0 ? currentIndex : fallback;
  const targetIndex = Math.max(0, Math.min(visibleLines.length - 1, startIndex + direction));
  setActiveChangesModalLine(visibleLines[targetIndex]);
}

function isTypingTarget(target) {
  if (!target) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

async function copyChangesModalJson() {
  const text = changesModalViewState.plainLines.join('\n');
  if (!text) return;

  const copyButton = document.getElementById('changesModalCopy');
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const fallback = document.createElement('textarea');
      fallback.value = text;
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      fallback.remove();
    }

    if (copyButton) {
      const previous = copyButton.textContent;
      copyButton.textContent = 'Copied';
      setTimeout(() => { copyButton.textContent = previous || 'Copy JSON'; }, 1200);
    }
  } catch (_) {
    if (copyButton) {
      const previous = copyButton.textContent;
      copyButton.textContent = 'Copy failed';
      setTimeout(() => { copyButton.textContent = previous || 'Copy JSON'; }, 1600);
    }
  }
}

function renderSourceValueLine(label, value, sourceClass, trailingComma = false) {
  const rawValue = stringifyDiffValueRaw(value);
  const escapedValue = escapeHtml(rawValue);
  const comma = trailingComma ? ',' : '';

  if (!rawValue.includes('\n')) {
    return `    &quot;${label}&quot;: <span class="change-value ${sourceClass}">${escapedValue}</span>${comma}`;
  }

  const indentedMultilineValue = escapedValue
    .split('\n')
    .map((line, index) => (index === 0 ? line : `      ${line}`))
    .join('\n');

  return `    &quot;${label}&quot;:\n      <span class="change-value ${sourceClass} change-value-multiline">${indentedMultilineValue}</span>${comma}`;
}

function buildHighlightedChangesJson(diffRow) {
  const changedFields = Object.keys(diffRow?.changes || {});
  const highlightedChanges = changedFields
    .map((field) => {
      const fromValue = stringifyDiffValue(diffRow.changes[field]?.from);
      const toValue = stringifyDiffValue(diffRow.changes[field]?.to);
      return `  &quot;${escapeHtml(field)}&quot;: {\n    &quot;from&quot;: <span class="change-value change-value-file1">${fromValue}</span>,\n    &quot;to&quot;: <span class="change-value change-value-file2">${toValue}</span>\n  }`;
    })
    .join(',\n');

  return `{\n${highlightedChanges}\n}`;
}

function syntaxHighlightJson(jsonHtml) {
  let result = jsonHtml;
  
  // Highlight all keys (quoted text before :) - including nested in objects/arrays
  result = result.replace(/(&quot;[^&]*?&quot;)(\s*)(?=:(?![^<]*<\/span>))/g, '<span class="json-key">$1</span>$2');

  // Highlight string values (quoted text after : or ,)
  result = result.replace(/(:\s*)(&quot;[^&]*?&quot;)(?![^<]*<\/span>)/g, '$1<span class="json-value-string">$2</span>');
  result = result.replace(/(\[\s*)(&quot;[^&]*?&quot;)/g, '$1<span class="json-value-string">$2</span>');

  // Highlight numbers (sequences of digits with optional decimals)
  result = result.replace(/(:\s*|,\s*|\[\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)(?![^<]*<\/span>)/g, '$1<span class="json-value-number">$2</span>');

  // Highlight booleans and null
  result = result.replace(/(:\s*|,\s*|\[\s*)(true|false|null)(?![^<]*<\/span>)/gi, '$1<span class="json-value-keyword">$2</span>');

  // Highlight punctuation: colons, commas, braces, brackets
  result = result.replace(/([{}\[\]:,])/g, '<span class="json-punct">$1</span>');

  return result;
}

function buildBeautifiedModalChangesJson(diffRow) {
  const changedFields = Object.keys(diffRow?.changes || {}).sort((a, b) => a.localeCompare(b));
  const highlightedChanges = changedFields
    .map((field, index) => {
      const change = diffRow.changes[field] || {};
      const fieldBlock = [
        `  <span class="json-key">&quot;${escapeHtml(field)}&quot;</span><span class="json-punct">:</span> <span class="json-punct">{</span>`,
        renderSourceValueLine('from', change.from, 'change-value-file1', true),
        renderSourceValueLine('to', change.to, 'change-value-file2', false),
        `  <span class="json-punct">}${index < changedFields.length - 1 ? ',' : ''}</span>`
      ];
      return fieldBlock.join('\n');
    })
    .join('\n');

  const wrapped = `<span class="json-punct">{</span>\n${highlightedChanges}\n<span class="json-punct">}</span>`;
  return syntaxHighlightJson(wrapped);
}

function getChangedDiffRowByKey(encodedKey) {
  const decodedKey = decodeURIComponent(encodedKey || '');
  return (state.diffs || []).find((d) => d.type === 'changed' && String(d.key) === decodedKey);
}

function openChangesModalByKey(encodedKey) {
  const row = getChangedDiffRowByKey(encodedKey);
  if (!row) return;

  const modal = document.getElementById('changesModal');
  const meta = document.getElementById('changesModalMeta');
  const jsonEl = document.getElementById('changesModalJson');
  if (!modal || !meta || !jsonEl) return;

  const changedFieldCount = Object.keys(row.changes || {}).length;
  meta.textContent = `${row.key} • ${changedFieldCount} changed field${changedFieldCount === 1 ? '' : 's'}`;
  renderChangesModalEditor(row);

  modal.classList.remove('hidden');
  document.body.classList.add('modal-open');
  document.getElementById('changesModalClose')?.focus();
}

function closeChangesModal() {
  const modal = document.getElementById('changesModal');
  if (!modal) return;
  modal.classList.add('hidden');
  document.body.classList.remove('modal-open');
}

function initChangesModalBindings() {
  const searchInput = document.getElementById('changesModalSearch');
  const searchPrev = document.getElementById('changesModalSearchPrev');
  const searchNext = document.getElementById('changesModalSearchNext');
  const copyButton = document.getElementById('changesModalCopy');
  const wrapButton = document.getElementById('changesModalWrapToggle');
  const fontDown = document.getElementById('changesModalFontDown');
  const fontUp = document.getElementById('changesModalFontUp');
  const collapseAll = document.getElementById('changesModalCollapseAll');
  const expandAll = document.getElementById('changesModalExpandAll');

  searchInput?.addEventListener('input', runChangesModalSearch);
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    stepChangesModalSearch(event.shiftKey ? -1 : 1);
  });
  searchPrev?.addEventListener('click', () => stepChangesModalSearch(-1));
  searchNext?.addEventListener('click', () => stepChangesModalSearch(1));
  copyButton?.addEventListener('click', copyChangesModalJson);
  wrapButton?.addEventListener('click', () => {
    changesModalViewState.wrapEnabled = !changesModalViewState.wrapEnabled;
    applyChangesModalWrapState();
  });
  fontDown?.addEventListener('click', () => {
    changesModalViewState.fontStep = Math.max(-1, changesModalViewState.fontStep - 1);
    applyChangesModalFontSize();
  });
  fontUp?.addEventListener('click', () => {
    changesModalViewState.fontStep = Math.min(1, changesModalViewState.fontStep + 1);
    applyChangesModalFontSize();
  });
  collapseAll?.addEventListener('click', () => setAllChangesModalSectionsCollapsed(true));
  expandAll?.addEventListener('click', () => setAllChangesModalSectionsCollapsed(false));

  document.addEventListener('keydown', (event) => {
    const modal = document.getElementById('changesModal');
    if (!modal || modal.classList.contains('hidden')) return;

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      searchInput?.focus();
      searchInput?.select();
      return;
    }

    if (!event.ctrlKey && !event.metaKey && !event.altKey && !isTypingTarget(event.target)) {
      const key = event.key.toLowerCase();
      if (key === 'j') {
        event.preventDefault();
        moveActiveChangesModalLine(1);
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        moveActiveChangesModalLine(-1);
        return;
      }
    }

    if (event.key !== 'Escape') return;
    closeChangesModal();
  });
}

function renderChangedFieldsCell(diffRow) {
  if (diffRow.type !== 'changed') return '—';

  const changedFields = Object.keys(diffRow.changes || {});
  const changedFieldChips = changedFields
    .map((field) => `<span class="changed-field-chip">${escapeHtml(field)}</span>`)
    .join('');
  const changedSummaryLabel = `${changedFields.length} field${changedFields.length === 1 ? '' : 's'} changed`;

  const encodedKey = encodeURIComponent(String(diffRow.key ?? ''));

  return `<details class="changes-details"><summary><span class="changed-summary-label">${changedSummaryLabel}</span><span class="changed-field-chip-list">${changedFieldChips}</span></summary><div class="changes-legend"><span class="changes-legend-chip changes-legend-chip-file1">File 1 value (from)</span><span class="changes-legend-chip changes-legend-chip-file2">File 2 value (to)</span></div><button type="button" class="changes-expand-btn" onclick="openChangesModalByKey('${encodedKey}')">Maximize JSON</button><pre class="changes-json changes-json-inline">${buildBeautifiedModalChangesJson(diffRow)}</pre></details>`;
}

function getSortedDiffRows() {
  const diffRows = (state.diffs || []).filter((d) => {
    const typeMatches = tableFilterState.diffType === 'all' || d.type === tableFilterState.diffType;
    if (!typeMatches) return false;

    if (tableFilterState.changedField === 'all') return true;
    if (d.type !== 'changed') return false;

    return Object.prototype.hasOwnProperty.call(d.changes || {}, tableFilterState.changedField);
  });
  const { key, direction } = tableSortState.diff;
  const accessor = (d) => {
    if (key === 'key') return normalizeSortValue(d.key);
    if (key === 'type') return normalizeSortValue(d.type);
    if (key === 'title') return normalizeSortValue(d.record?.Title || '');
    if (key === 'bidStatus') return normalizeSortValue(d.record?.BidStatus || '');
    if (key === 'changedFields') return Object.keys(d.changes || {}).length;
    return '';
  };
  return sortRows(diffRows, accessor, direction);
}

function getAllDuplicateRows() {
  return [
    ...(state.dups1 || []).map(r => ({ ...r, _dupType: 'within-file1' })),
    ...(state.dups2 || []).map(r => ({ ...r, _dupType: 'within-file2' })),
    ...(state.crossDups || []).map(r => ({ ...r, _dupType: 'cross-file' }))
  ];
}

function getSortedDuplicateRows() {
  const rows = getAllDuplicateRows();
  const { key, direction } = tableSortState.dup;
  const accessor = (r) => {
    if (key === 'projectCode') return normalizeSortValue(r[state.uk] || '');
    if (key === 'title') return normalizeSortValue(r.Title || '');
    if (key === 'bidStatus') return normalizeSortValue(r.BidStatus || '');
    if (key === 'source') return normalizeSortValue(r._source || '');
    if (key === 'dupType') return normalizeSortValue(r._dupType || '');
    return '';
  };
  return sortRows(rows, accessor, direction);
}

function renderDiffTable() {
  const diffs = state.diffs || [];
  const sortedFilteredDiffs = getSortedDiffRows();
  const diffCountLabel = document.getElementById('diffCountLabel');
  if (diffCountLabel) {
    if (diffs.length === sortedFilteredDiffs.length) {
      diffCountLabel.textContent = `${sortedFilteredDiffs.length} record${sortedFilteredDiffs.length === 1 ? '' : 's'}`;
    } else {
      diffCountLabel.textContent = `${sortedFilteredDiffs.length} of ${diffs.length} records`;
    }
  }

  const dtHTML = diffs.length === 0
    ? '<p class="text-sm text-green-600 font-medium py-4">✅ No differences found between these files.</p>'
    : sortedFilteredDiffs.length === 0
      ? '<p class="text-sm text-slate-600 font-medium py-4">No diff records match the selected filters.</p>'
    : `<table>
        <thead><tr>${sortableHeader('diff', 'key', 'ProjectCode')}${sortableHeader('diff', 'type', 'Type')}${sortableHeader('diff', 'title', 'Title')}${sortableHeader('diff', 'bidStatus', 'BidStatus')}${sortableHeader('diff', 'changedFields', 'Changed Fields')}</tr></thead>
        <tbody>
          ${sortedFilteredDiffs.map(d => `
            <tr>
              <td><code>${d.key}</code></td>
              <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${d.type === 'added' ? 'bg-green-100 text-green-800' : d.type === 'removed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-800'}">${d.type}</span></td>
              <td>${(d.record.Title || '').slice(0, 60)}${d.record.Title?.length > 60 ? '…' : ''}</td>
              <td>${d.record.BidStatus || '—'}</td>
              <td>${renderChangedFieldsCell(d)}</td>
            </tr>`).join('')}
        </tbody>
      </table>`;

  document.getElementById('diffTable').innerHTML = dtHTML;
}

function renderDuplicateTable() {
  const allDups = getSortedDuplicateRows();
  const dupCountLabel = document.getElementById('dupCountLabel');
  if (dupCountLabel) {
    dupCountLabel.textContent = `${allDups.length} record${allDups.length === 1 ? '' : 's'}`;
  }

  const dupHTML = allDups.length === 0
    ? '<p class="text-sm text-green-600 font-medium py-4">✅ No duplicates found.</p>'
    : `<table>
        <thead><tr>${sortableHeader('dup', 'projectCode', 'ProjectCode')}${sortableHeader('dup', 'title', 'Title')}${sortableHeader('dup', 'bidStatus', 'BidStatus')}${sortableHeader('dup', 'source', 'Source')}${sortableHeader('dup', 'dupType', 'Dup Type')}</tr></thead>
        <tbody>
          ${allDups.map(r => `
            <tr>
              <td><code>${r[state.uk] || '—'}</code></td>
              <td>${(r.Title || '').slice(0, 60)}${r.Title?.length > 60 ? '…' : ''}</td>
              <td>${r.BidStatus || '—'}</td>
              <td>${r._source}</td>
              <td><span class="inline-block px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-800">${r._dupType}</span></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
  document.getElementById('dupTable').innerHTML = dupHTML;
}

function toggleTableSort(tableName, columnKey) {
  const tableSort = tableSortState[tableName];
  if (!tableSort) return;

  if (tableSort.key === columnKey) {
    tableSort.direction = tableSort.direction === 'asc' ? 'desc' : 'asc';
  } else {
    tableSort.key = columnKey;
    tableSort.direction = 'asc';
  }

  if (tableName === 'diff') renderDiffTable();
  if (tableName === 'dup') renderDuplicateTable();
}

function setDiffTypeFilter(value) {
  const allowed = new Set(['all', 'added', 'removed', 'changed']);
  tableFilterState.diffType = allowed.has(value) ? value : 'all';
  renderDiffTable();
}

function setChangedFieldFilter(value, shouldRender = true) {
  const select = document.getElementById('changedFieldFilter');
  if (!select || select.disabled) {
    tableFilterState.changedField = 'all';
    if (shouldRender) renderDiffTable();
    return;
  }

  const optionValues = new Set([...select.options].map((option) => option.value));
  tableFilterState.changedField = optionValues.has(value) ? value : 'all';
  select.value = tableFilterState.changedField;

  if (shouldRender) renderDiffTable();
}

function renderChangedFieldFilterOptions() {
  const select = document.getElementById('changedFieldFilter');
  if (!select) return;

  const previousValue = tableFilterState.changedField;
  const changedFields = [...new Set(
    (state.diffs || [])
      .filter((d) => d.type === 'changed')
      .flatMap((d) => Object.keys(d.changes || {}))
  )].sort((a, b) => a.localeCompare(b));

  select.innerHTML = '';

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'All changed fields';
  select.appendChild(allOption);

  changedFields.forEach((field) => {
    const option = document.createElement('option');
    option.value = field;
    option.textContent = field;
    select.appendChild(option);
  });

  select.disabled = changedFields.length === 0;

  if (changedFields.length === 0) {
    tableFilterState.changedField = 'all';
    select.value = 'all';
    return;
  }

  tableFilterState.changedField = changedFields.includes(previousValue) ? previousValue : 'all';
  select.value = tableFilterState.changedField;
}

function setActiveResultsSideLink(sectionId) {
  const menu = document.getElementById('resultsSideMenu');
  if (!menu) return;

  const links = menu.querySelectorAll('.results-side-link');
  links.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const matches = href === `#${sectionId}`;
    link.classList.toggle('is-active', matches);
    if (matches) {
      link.setAttribute('aria-current', 'true');
    } else {
      link.removeAttribute('aria-current');
    }
  });
}

function initResultsSideMenuHighlight() {
  if (resultsMenuBindingsInitialized) return;

  const menu = document.getElementById('resultsSideMenu');
  if (!menu) return;

  const links = [...menu.querySelectorAll('.results-side-link[href^="#"]')];
  if (links.length === 0) return;
  const sectionIds = links.map((link) => (link.getAttribute('href') || '').replace('#', '')).filter(Boolean);
  const sections = sectionIds
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  const resolveMostVisibleSectionId = () => {
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    let bestSectionId = '';
    let bestVisiblePixels = -1;
    let bestTopDistance = Number.POSITIVE_INFINITY;

    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const visiblePixels = Math.max(0, Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0));
      const topDistance = Math.abs(rect.top);

      if (visiblePixels > bestVisiblePixels || (visiblePixels === bestVisiblePixels && topDistance < bestTopDistance)) {
        bestVisiblePixels = visiblePixels;
        bestTopDistance = topDistance;
        bestSectionId = section.id;
      }
    });

    return bestSectionId;
  };

  let rafPending = false;
  const updateActiveFromViewport = () => {
    if (rafPending) return;
    rafPending = true;

    window.requestAnimationFrame(() => {
      const visibleSectionId = resolveMostVisibleSectionId();
      if (visibleSectionId) {
        setActiveResultsSideLink(visibleSectionId);
      }
      rafPending = false;
    });
  };

  links.forEach((link) => {
    link.addEventListener('click', () => {
      const targetId = (link.getAttribute('href') || '').replace('#', '');
      if (targetId) setActiveResultsSideLink(targetId);
    });
  });
  window.addEventListener('scroll', updateActiveFromViewport, { passive: true });
  window.addEventListener('resize', updateActiveFromViewport);

  const firstId = (links[0].getAttribute('href') || '').replace('#', '');
  if (firstId) setActiveResultsSideLink(firstId);
  updateActiveFromViewport();

  resultsMenuBindingsInitialized = true;
}

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

function cloneRecord(record) {
  if (record === null || record === undefined) return null;
  return JSON.parse(JSON.stringify(record));
}

function wrapRecordsBySourceSchema(raw, records) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') {
    return records;
  }

  const firstKey = Object.keys(raw)[0];
  if (!firstKey) return records;
  return { [firstKey]: records };
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
        diffs.push({
          type: 'changed',
          key,
          changes,
          record: r2,
          file1Record: cloneRecord(r1),
          file2Record: cloneRecord(r2)
        });
      }
    } else if (r1) {
      diffs.push({
        type: 'removed',
        key,
        record: r1,
        file1Record: cloneRecord(r1),
        file2Record: null
      });
    } else {
      diffs.push({
        type: 'added',
        key,
        record: r2,
        file1Record: null,
        file2Record: cloneRecord(r2)
      });
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
    raw1,
    raw2,
    arr1raw: arr1,
    arr2raw: arr2,
    hasAnalyzed: true
  };

  renderChangedFieldFilterOptions();

  const diffTypeFilter = document.getElementById('diffTypeFilter');
  if (diffTypeFilter) {
    const allowed = new Set(['all', 'added', 'removed', 'changed']);
    tableFilterState.diffType = allowed.has(diffTypeFilter.value) ? diffTypeFilter.value : 'all';
    diffTypeFilter.value = tableFilterState.diffType;
  }

  const changedFieldFilter = document.getElementById('changedFieldFilter');
  if (changedFieldFilter) {
    setChangedFieldFilter(changedFieldFilter.value, false);
  }

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

  renderDiffTable();
  renderDuplicateTable();

  document.getElementById('results').classList.remove('hidden');
  document.getElementById('resultsSideMenu')?.classList.remove('hidden');
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
  const diffRows = getSortedDiffRows();
  const outRows = diffRows.map(d => ({
    [state.uk || 'ProjectCode']: d.key,
    type: d.type,
    changes: d.changes || null,
    record: d.type === 'removed' ? d.file1Record : d.file2Record,
    file1Record: d.file1Record,
    file2Record: d.file2Record
  }));

  const addedRecords = diffRows
    .filter((d) => d.type === 'added' && d.file2Record)
    .map((d) => cloneRecord(d.file2Record));
  const removedRecords = diffRows
    .filter((d) => d.type === 'removed' && d.file1Record)
    .map((d) => cloneRecord(d.file1Record));
  const changedFromFile1 = diffRows
    .filter((d) => d.type === 'changed' && d.file1Record)
    .map((d) => cloneRecord(d.file1Record));
  const changedFromFile2 = diffRows
    .filter((d) => d.type === 'changed' && d.file2Record)
    .map((d) => cloneRecord(d.file2Record));

  const out = {
    uniqueKey: state.uk || 'ProjectCode',
    appliedTypeFilter: tableFilterState.diffType,
    appliedChangedFieldFilter: tableFilterState.changedField,
    totalRows: outRows.length,
    rows: outRows,
    originalRecords: {
      added: wrapRecordsBySourceSchema(state.raw2, addedRecords),
      removed: wrapRecordsBySourceSchema(state.raw1, removedRecords),
      changedFromFile1: wrapRecordsBySourceSchema(state.raw1, changedFromFile1),
      changedFromFile2: wrapRecordsBySourceSchema(state.raw2, changedFromFile2)
    }
  };

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
initResultsSideMenuHighlight();
initChangesModalBindings();