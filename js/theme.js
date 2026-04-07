// js/theme.js — Light/dark theme toggle

import { $ } from './utils.js';

const sunSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
const moonSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

let theme = 'light';

function setTheme(t) {
  theme = t;
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.querySelector('[data-theme-toggle]');
  if (btn) {
    btn.title = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    btn.innerHTML = t === 'dark' ? sunSvg : moonSvg;
  }
}

export function initTheme() {
  const saved = localStorage.getItem('sat-theme');
  if (saved) {
    theme = saved;
  } else if (matchMedia('(prefers-color-scheme:dark)').matches) {
    theme = 'dark';
  }
  setTheme(theme);

  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('sat-theme', next);
  });
}
