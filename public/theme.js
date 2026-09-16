// KerjaLu Light & Dark Mode Engine
(function() {
  const STORAGE_KEY = 'kerjalu_theme';

  function getSystemPreference() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  }

  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function getSunIcon() {
    return `<svg class="theme-icon theme-icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="5"></circle>
      <line x1="12" y1="1" x2="12" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="23"></line>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
      <line x1="1" y1="12" x2="3" y2="12"></line>
      <line x1="21" y1="12" x2="23" y2="12"></line>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>`;
  }

  function getMoonIcon() {
    return `<svg class="theme-icon theme-icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>`;
  }

  function updateToggleButtons(theme) {
    const isDark = theme === 'dark';
    const iconHtml = isDark ? getSunIcon() : getMoonIcon();
    const labelText = isDark ? 'Light' : 'Dark';
    const ariaLabel = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';

    const buttons = document.querySelectorAll('.theme-toggle-btn');
    buttons.forEach(btn => {
      btn.setAttribute('aria-label', ariaLabel);
      btn.setAttribute('title', ariaLabel);
      const iconWrap = btn.querySelector('.theme-toggle-icon-wrap');
      const textWrap = btn.querySelector('.theme-toggle-label');
      if (iconWrap && textWrap) {
        iconWrap.innerHTML = iconHtml;
        textWrap.textContent = labelText;
      } else {
        btn.innerHTML = `<span class="theme-toggle-icon-wrap" style="display:inline-flex;align-items:center;">${iconHtml}</span><span class="theme-toggle-label">${labelText}</span>`;
      }
    });
  }

  function applyTheme(theme, save = false) {
    const activeTheme = theme === 'dark' ? 'dark' : 'light';
    if (document.documentElement) {
      document.documentElement.setAttribute('data-theme', activeTheme);
      document.documentElement.setAttribute('class', (document.documentElement.getAttribute('class') || '').replace(/\btheme-\w+\b/g, '').trim() + ' theme-' + activeTheme);
    }
    if (document.body) {
      document.body.setAttribute('data-theme', activeTheme);
      document.body.setAttribute('class', (document.body.getAttribute('class') || '').replace(/\btheme-\w+\b/g, '').trim() + ' theme-' + activeTheme);
    }
    if (save) {
      try {
        localStorage.setItem(STORAGE_KEY, activeTheme);
      } catch (e) {}
    }
    updateToggleButtons(activeTheme);
    try {
      window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: activeTheme } }));
    } catch (e) {}
  }

  function getCurrentTheme() {
    const fromAttr = document.documentElement ? document.documentElement.getAttribute('data-theme') : null;
    return fromAttr || getSavedTheme() || getSystemPreference();
  }

  function toggleTheme() {
    const current = getCurrentTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next, true);
    return next;
  }

  // Initial immediate theme resolution before DOM ready to prevent FOUC
  const initialTheme = getSavedTheme() || getSystemPreference();
  if (document.documentElement) {
    document.documentElement.setAttribute('data-theme', initialTheme);
  }

  // Expose global methods
  window.toggleTheme = toggleTheme;
  window.setTheme = function(mode) { applyTheme(mode, true); };
  window.getCurrentTheme = getCurrentTheme;

  // Initialize and bind buttons
  function init() {
    const active = getCurrentTheme();
    applyTheme(active, false);
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
      btn.onclick = function(e) {
        if (e) e.preventDefault();
        toggleTheme();
      };
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Listen for system changes if user hasn't explicitly set a preference
  try {
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e) => {
        if (!getSavedTheme()) {
          applyTheme(e.matches ? 'dark' : 'light', false);
        }
      };
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleSystemChange);
      }
    }
  } catch (e) {}
})();
