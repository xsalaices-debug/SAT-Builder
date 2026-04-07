// js/utils.js — Shared utility functions

/** Shorthand for document.getElementById */
export const $ = id => document.getElementById(id);

/** Render KaTeX math in an element */
export function renderMath(el) {
  if (typeof renderMathInElement === 'function') {
    renderMathInElement(el, {
      delimiters: [
        { left: '$$', right: '$$', display: true },
        { left: '$', right: '$', display: false },
        { left: '\\(', right: '\\)', display: false },
        { left: '\\[', right: '\\]', display: true },
      ],
      throwOnError: false,
    });
  }
}

/** Convert markdown bold/italic to HTML, strip artifacts */
export function cleanText(s) {
  if (!s) return s;
  // Fix LaTeX escape sequences that appear in plain text (outside math delimiters)
  // and would either show raw backslashes or confuse KaTeX's auto-render.
  s = s.replace(/\\\$/g, '&#36;');       // \$20 → $20 (literal $, not a math delimiter)
  s = s.replace(/\\\%/g, '%');            // 15\% → 15% (literal %)
  s = s.replace(/\$(?=[\d.])/g, '&#36;'); // bare $20 → $20 (currency, not math)
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return s;
}

/** Strip HTML tags from a string */
export function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

export const LETTERS = ['A', 'B', 'C', 'D'];
