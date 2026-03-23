const JSON_QA_THEME_STORAGE_KEY = 'jsonQaTheme';
const JSON_QA_THEME_MODES = ['system', 'dark', 'light'];

function resolveThemeMode() {
  const storedTheme = localStorage.getItem(JSON_QA_THEME_STORAGE_KEY);
  if (JSON_QA_THEME_MODES.includes(storedTheme)) return storedTheme;
  localStorage.setItem(JSON_QA_THEME_STORAGE_KEY, 'system');
  return 'system';
}

function resolveThemeFromMode(mode) {
  if (mode === 'dark' || mode === 'light') return mode;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function nextThemeMode(mode) {
  const systemTheme = resolveThemeFromMode('system');
  const oppositeTheme = systemTheme === 'dark' ? 'light' : 'dark';

  if (mode === 'system') return oppositeTheme;
  return 'system';
}

function applyTheme(mode) {
  const root = document.documentElement;
  const nextMode = JSON_QA_THEME_MODES.includes(mode) ? mode : 'system';
  const nextTheme = resolveThemeFromMode(nextMode);

  root.setAttribute('data-theme', nextTheme);
  root.setAttribute('data-theme-mode', nextMode);
  root.classList.toggle('dark', nextTheme === 'dark');

  const modeLabel = nextMode[0].toUpperCase() + nextMode.slice(1);
  const modeIcon = nextMode === 'system' ? '🖥️' : (nextMode === 'dark' ? '🌙' : '☀️');
  const nextModeLabel = nextThemeMode(nextMode);
  const toggleButtons = document.querySelectorAll('[data-theme-toggle="true"]');

  toggleButtons.forEach((button) => {
    button.setAttribute('aria-label', `Switch theme mode. Current mode: ${modeLabel}`);
    button.setAttribute('title', `Theme mode: ${modeLabel}. Click to switch to ${nextModeLabel}.`);
    button.setAttribute('data-theme-current', nextTheme);
    button.setAttribute('data-theme-mode', nextMode);

    const iconEl = button.querySelector('[data-theme-icon="true"]');
    const labelEl = button.querySelector('[data-theme-label="true"]');
    if (iconEl) iconEl.textContent = modeIcon;
    if (labelEl) labelEl.textContent = `Theme: ${modeLabel}`;
  });
}

function setThemeMode(mode) {
  const nextMode = JSON_QA_THEME_MODES.includes(mode) ? mode : 'system';
  localStorage.setItem(JSON_QA_THEME_STORAGE_KEY, nextMode);
  applyTheme(nextMode);
}

function toggleTheme() {
  const currentMode = document.documentElement.getAttribute('data-theme-mode') || resolveThemeMode();
  setThemeMode(nextThemeMode(currentMode));
}

let themeToggleInitialized = false;

function initThemeToggle() {
  applyTheme(resolveThemeMode());

  if (!themeToggleInitialized) {
    document.querySelectorAll('[data-theme-toggle="true"]').forEach((button) => {
      button.addEventListener('click', toggleTheme);
    });

    const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    if (themeMedia && typeof themeMedia.addEventListener === 'function') {
      themeMedia.addEventListener('change', () => {
        const currentMode = document.documentElement.getAttribute('data-theme-mode') || resolveThemeMode();
        if (currentMode !== 'system') return;
        applyTheme('system');
      });
    }

    themeToggleInitialized = true;
  }
}

// Apply as early as possible to avoid a flash of wrong theme.
applyTheme(resolveThemeMode());

window.jsonQaTheme = {
  applyTheme,
  initThemeToggle,
  nextThemeMode,
  resolveThemeFromMode,
  resolveThemeMode,
  setThemeMode,
  toggleTheme
};
