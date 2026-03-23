function slugifyHeading(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function normalizeReadmeAnchors(container) {
  const headingEls = [...container.querySelectorAll('h1, h2, h3, h4, h5, h6')];
  const headingIdCounts = new Map();

  headingEls.forEach((heading) => {
    const baseId = slugifyHeading(heading.textContent) || 'section';
    const seen = headingIdCounts.get(baseId) || 0;
    headingIdCounts.set(baseId, seen + 1);

    const resolvedId = seen === 0 ? baseId : `${baseId}-${seen}`;
    heading.id = resolvedId;
  });

  const validIds = new Set(headingEls.map((heading) => heading.id));
  const hashLinks = [...container.querySelectorAll('a[href^="#"]')];

  hashLinks.forEach((link) => {
    const href = link.getAttribute('href') || '';
    const rawHash = decodeURIComponent(href.slice(1));
    if (!rawHash) return;

    if (validIds.has(rawHash)) return;

    const noLeadingDash = rawHash.replace(/^-+/, '');
    if (validIds.has(noLeadingDash)) {
      link.setAttribute('href', `#${noLeadingDash}`);
      return;
    }

    const normalized = slugifyHeading(noLeadingDash.replace(/-/g, ' '));
    if (validIds.has(normalized)) {
      link.setAttribute('href', `#${normalized}`);
    }
  });
}

(async function renderReadme() {
  window.jsonQaTheme?.initThemeToggle();
  localStorage.setItem('jsonQaReadmeVisited', '1');
  const container = document.getElementById('readmeContent');
  try {
    const res = await fetch('./README.md', { cache: 'no-cache' });
    if (!res.ok) {
      throw new Error('HTTP ' + res.status + ' when requesting README.md');
    }

    const markdown = await res.text();
    if (!markdown.trim()) {
      container.innerHTML = '<div class="status error">README.md is empty. Add documentation content to display the app guide here.</div>';
      return;
    }

    container.innerHTML = marked.parse(markdown, {
      gfm: true,
      breaks: false,
      headerIds: true,
      mangle: false
    });

    normalizeReadmeAnchors(container);
  } catch (error) {
    container.innerHTML = [
      '<div class="status error">',
      '<strong>Could not load README.md.</strong><br>',
      'This documentation page loads README.md over HTTP (for example, GitHub Pages or a local dev server). ',
      'If opened with file://, the browser may block file loading.<br><br>',
      'Technical details: ' + (error && error.message ? error.message : String(error)),
      '</div>'
    ].join('');
  }
})();
