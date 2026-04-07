// js/bank.js — Question Bank: browse, filter, solve

import { $, renderMath, cleanText, LETTERS } from './utils.js';
import { isBookmarked, toggleBookmark } from './store.js';
import { navigate } from './router.js';

let bankData = [];
let bankFiltered = [];
let bankPage = 0;
let loaded = false;
const PER_PAGE = 15;

export async function renderBank(container) {
  container.innerHTML = `
    <section class="controls-panel">
      <div class="controls-grid">
        <div class="control-group">
          <label class="control-label" for="bank-difficulty">Difficulty</label>
          <select id="bank-difficulty" class="control-input">
            <option value="all">All Difficulties</option>
            <option value="Hard">Hard</option>
            <option value="Medium">Medium</option>
            <option value="Easy">Easy</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label" for="bank-domain">Domain</label>
          <select id="bank-domain" class="control-input">
            <option value="all">All Domains</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label" for="bank-skill">Skill</label>
          <select id="bank-skill" class="control-input">
            <option value="all">All Skills</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label" for="bank-search">Search</label>
          <input id="bank-search" class="control-input" type="text" placeholder="Search question text...">
        </div>
      </div>
      <div class="bank-filter-row">
        <div class="desmos-filter">
          <div class="seg-group" id="bank-desmos-seg">
            <button class="seg-btn active" data-val="all">All</button>
            <button class="seg-btn" data-val="desmos">Desmos</button>
            <button class="seg-btn" data-val="no-desmos">Non-Desmos</button>
          </div>
        </div>
        <button class="btn btn-primary btn-practice-filtered" id="btn-practice-filtered">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Practice These
        </button>
      </div>
      <div class="bank-stats">
        <span id="bank-count">Loading...</span>
      </div>
    </section>
    <div id="bank-results" class="results-container"></div>
    <div class="bank-pagination">
      <button id="bank-prev" class="btn btn-secondary" disabled>Previous</button>
      <span id="bank-page-info" class="bank-page-info">Page 1</span>
      <button id="bank-next" class="btn btn-secondary">Next</button>
    </div>
  `;

  if (!loaded) await loadData();
  populateFilters();
  bindEvents(container);
  applyFilters();
}

async function loadData() {
  try {
    const resp = await fetch('data/math-questions.json');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    bankData = await resp.json();
    loaded = true;
    const countEl = $('bank-nav-count');
    if (countEl) countEl.textContent = bankData.length.toLocaleString();
  } catch (e) {
    const res = $('bank-results');
    if (res) res.innerHTML = `<div class="empty-state">Failed to load questions: ${e.message}</div>`;
  }
}

function populateFilters() {
  const domSelect = $('bank-domain');
  const skillSelect = $('bank-skill');
  if (!domSelect || !skillSelect) return;

  const domains = [...new Set(bankData.map(q => q.domain))].sort();
  domSelect.innerHTML = '<option value="all">All Domains</option>' +
    domains.map(d => `<option value="${d}">${d}</option>`).join('');

  const skills = [...new Set(bankData.map(q => q.skill))].sort();
  skillSelect.innerHTML = '<option value="all">All Skills</option>' +
    skills.map(s => `<option value="${s}">${s}</option>`).join('');
}

let desmosFilter = 'all';

function applyFilters() {
  const diff = $('bank-difficulty')?.value || 'all';
  const dom = $('bank-domain')?.value || 'all';
  const skill = $('bank-skill')?.value || 'all';
  const q = ($('bank-search')?.value || '').toLowerCase().trim();

  bankFiltered = bankData.filter(item =>
    (diff === 'all' || item.difficulty === diff) &&
    (dom === 'all' || item.domain === dom) &&
    (skill === 'all' || item.skill === skill) &&
    (desmosFilter === 'all' || (desmosFilter === 'desmos' && item.desmos_solvable) || (desmosFilter === 'no-desmos' && !item.desmos_solvable)) &&
    (!q || item.stem.toLowerCase().includes(q) || item.domain.toLowerCase().includes(q) || item.skill.toLowerCase().includes(q))
  );

  bankPage = 0;
  const countEl = $('bank-count');
  if (countEl) countEl.textContent = bankFiltered.length.toLocaleString() + ' questions';
  renderPage();
}

function renderPage() {
  const resultsEl = $('bank-results');
  if (!resultsEl) return;

  const pages = Math.ceil(bankFiltered.length / PER_PAGE) || 1;
  const start = bankPage * PER_PAGE;

  if (!bankFiltered.length) {
    resultsEl.innerHTML = '<div class="empty-state">No questions match your filters.</div>';
  } else {
    resultsEl.innerHTML = '';
    bankFiltered.slice(start, start + PER_PAGE).forEach((q, i) => {
      resultsEl.appendChild(renderBankCard(q, start + i + 1));
    });
  }

  const pageInfo = $('bank-page-info');
  const prevBtn = $('bank-prev');
  const nextBtn = $('bank-next');
  if (pageInfo) pageInfo.textContent = `Page ${bankPage + 1} / ${pages}`;
  if (prevBtn) prevBtn.disabled = bankPage === 0;
  if (nextBtn) nextBtn.disabled = bankPage >= pages - 1;
}

function renderBankCard(q, num) {
  const diffTag = q.difficulty === 'Hard' ? 'tag-hard' : q.difficulty === 'Medium' ? 'tag-medium' : 'tag-easy';
  const bookmarked = isBookmarked(q.id);
  const card = document.createElement('div');
  card.className = 'question-card';
  card.innerHTML = `
    <div class="card-header">
      <div class="card-tags">
        <span class="tag ${diffTag}">${q.difficulty}</span>
        <span class="tag tag-domain">${q.domain}</span>
        <span class="tag tag-skill">${q.skill}</span>
        ${q.desmos_solvable ? `<span class="desmos-badge" title="${q.desmos?.category || 'Desmos-solvable'}">📐 ${q.desmos?.category || 'Desmos'}</span>` : ''}
      </div>
      <button class="bookmark-btn ${bookmarked ? 'active' : ''}" data-qid="${q.id}" title="${bookmarked ? 'Remove bookmark' : 'Bookmark'}">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="${bookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>
    </div>
    <div class="card-body">
      <div class="question-topic">#${num} · ${q.id}${q.source ? ` · <em>${q.source}</em>` : ''}</div>
      <div class="question-stem">${cleanText(q.stem)}</div>
      <ul class="choices-list"></ul>
      <div class="answer-section">
        <button class="btn btn-primary check-btn" style="display:none">Check Answer</button>
        <div class="explanation-box" style="display:none">
          <div class="explanation-label">Explanation</div>
          <div class="explanation-text">${cleanText(q.explanation) || 'No explanation available.'}</div>
        </div>
      </div>
      ${q.desmos_solvable && q.desmos ? `
        <div class="desmos-method">
          <strong>${q.desmos.category}</strong> · Speed: ${q.desmos.speed_advantage || '—'}<br>
          ${q.desmos.description}
          ${q.desmos.notes ? '<br><em>' + q.desmos.notes + '</em>' : ''}
        </div>` : ''}
    </div>`;

  // Choices
  attachChoices(card, q.choices, q.correct_answer);
  renderMath(card);

  // Bookmark handler
  card.querySelector('.bookmark-btn').addEventListener('click', (e) => {
    const btn = e.currentTarget;
    const added = toggleBookmark(q.id);
    btn.classList.toggle('active', added);
    btn.title = added ? 'Remove bookmark' : 'Bookmark';
    btn.querySelector('svg').setAttribute('fill', added ? 'currentColor' : 'none');
  });

  return card;
}

function attachChoices(card, choices, correctAnswer) {
  const list = card.querySelector('.choices-list');
  const checkBtn = card.querySelector('.check-btn');
  const expBox = card.querySelector('.explanation-box');
  let selected = null;
  let revealed = false;

  LETTERS.forEach(L => {
    if (!choices[L]) return;
    const li = document.createElement('li');
    li.className = 'choice-item';
    li.innerHTML = `<span class="choice-letter">${L}</span><span class="choice-text">${cleanText(choices[L])}</span>`;
    li.addEventListener('click', () => {
      if (revealed) return;
      list.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
      li.classList.add('selected');
      selected = L;
      checkBtn.style.display = 'inline-flex';
    });
    list.appendChild(li);
  });

  checkBtn.addEventListener('click', () => {
    revealed = true;
    checkBtn.style.display = 'none';
    expBox.style.display = 'block';
    list.querySelectorAll('.choice-item').forEach((li, i) => {
      li.classList.remove('selected');
      if (LETTERS[i] === correctAnswer) li.classList.add('correct');
      else if (LETTERS[i] === selected) li.classList.add('incorrect');
    });
    renderMath(expBox);
  });
}

function bindEvents(container) {
  // Filter changes
  let searchTimer;
  $('bank-difficulty')?.addEventListener('change', applyFilters);
  $('bank-domain')?.addEventListener('change', applyFilters);
  $('bank-skill')?.addEventListener('change', applyFilters);
  $('bank-search')?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(applyFilters, 300);
  });

  // Desmos segmented control
  $('bank-desmos-seg')?.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    $('bank-desmos-seg').querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    desmosFilter = btn.dataset.val;
    applyFilters();
  });

  // Pagination
  $('bank-prev')?.addEventListener('click', () => { if (bankPage > 0) { bankPage--; renderPage(); } });
  $('bank-next')?.addEventListener('click', () => {
    const pages = Math.ceil(bankFiltered.length / PER_PAGE);
    if (bankPage < pages - 1) { bankPage++; renderPage(); }
  });

  // Practice with current filters
  $('btn-practice-filtered')?.addEventListener('click', () => {
    // Store filtered question IDs in sessionStorage for practice mode to pick up
    const ids = bankFiltered.map(q => q.id);
    sessionStorage.setItem('practice-filter-ids', JSON.stringify(ids));
    navigate('/practice');
  });
}

/** Get all loaded questions (used by other modules) */
export function getQuestions() {
  return bankData;
}

/** Load questions if not already loaded */
export async function ensureLoaded() {
  if (!loaded) await loadData();
  return bankData;
}
