/* SAT Hard Question Builder */
(function () {
  'use strict';

  const $ = id => document.getElementById(id);

  // Render LaTeX in an element using KaTeX auto-render
  function renderMath(el) {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    }
  }

  // ── Global Desmos Side Panel ──
  let desmosCalc = null;
  const desmosPanel = $('desmos-side-panel');
  const desmosContainer = $('desmos-container');
  const desmosOpenBtn = $('btn-desmos');
  const desmosCloseBtn = $('desmos-close');
  const desmosDockBtn = $('desmos-dock');
  let desmosSide = 'right'; // 'left' or 'right'

  function openDesmos() {
    desmosPanel.classList.add('open');
    document.body.classList.add('desmos-open', 'desmos-' + desmosSide);
    desmosOpenBtn.classList.add('active');
    if (!desmosCalc && typeof Desmos !== 'undefined') {
      desmosCalc = Desmos.GraphingCalculator(desmosContainer, {
        expressions: true, keypad: true, settingsMenu: true,
        zoomButtons: true, pointsOfInterest: true, trace: true,
        border: false, expressionsTopbar: true
      });
    }
  }

  function closeDesmos() {
    desmosPanel.classList.remove('open');
    document.body.classList.remove('desmos-open', 'desmos-left', 'desmos-right');
    desmosOpenBtn.classList.remove('active');
  }

  function toggleDock() {
    document.body.classList.remove('desmos-' + desmosSide);
    desmosSide = desmosSide === 'right' ? 'left' : 'right';
    document.body.classList.add('desmos-' + desmosSide);
    desmosDockBtn.title = `Move to ${desmosSide === 'right' ? 'left' : 'right'}`;
    if (desmosCalc) desmosCalc.resize();
  }

  desmosOpenBtn.addEventListener('click', () => {
    desmosPanel.classList.contains('open') ? closeDesmos() : openDesmos();
  });
  desmosCloseBtn.addEventListener('click', closeDesmos);
  desmosDockBtn.addEventListener('click', toggleDock);
  // Clean up markdown artifacts in question text
  function cleanText(s) {
    if (!s) return s;
    // Convert **bold** and *italic* markdown to HTML
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
    return s;
  }

  const API = 'port/5000'.startsWith('__') ? '' : 'port/5000';
  const LETTERS = ['A', 'B', 'C', 'D'];
  const ALL_TOPICS = [
    'Information and Ideas / Inference', 'Craft and Structure / Words in Context',
    'Craft and Structure / Text Structure and Purpose', 'Expression of Ideas / Transitions',
    'Standard English Conventions / Boundaries', 'Algebra / Systems and Linear Models',
    'Advanced Math / Quadratic Conditions', 'Problem-Solving and Data Analysis / Percentages and Rates',
    'Geometry and Trigonometry / Similarity and Right Triangles'
  ];

  // ── Theme ──
  const root = document.documentElement;
  const themeBtn = document.querySelector('[data-theme-toggle]');
  let theme = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  const sunSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  const moonSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  const bluebookSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>';
  const themeOrder = ['light', 'dark'];
  function setTheme(t) {
    theme = t;
    root.setAttribute('data-theme', t);
    themeBtn.title = t === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
    themeBtn.innerHTML = t === 'dark' ? sunSvg : moonSvg;
  }
  setTheme(theme);
  themeBtn.addEventListener('click', () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  });

  // ── Tabs ──
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  function switchTab(name) {
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + name));
    if (name === 'bank' && !bankLoaded) loadBank();
  }
  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  // ── Shared: build interactive choices on a card ──
  function attachChoices(card, choices, correctAnswer) {
    const list = card.querySelector('.choices-list');
    const checkBtn = card.querySelector('.check-btn');
    const expBox = card.querySelector('.explanation-box');
    let selected = null, revealed = false;

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
    });
  }

  // ═══════════════════════════════════════
  // GENERATOR TAB
  // ═══════════════════════════════════════

  const topicSelect = $('topic-select'), numQuestions = $('num-questions');
  const stressRounds = $('stress-rounds'), seedInput = $('seed-input');
  const btnGen = $('btn-generate'), btnAll = $('btn-build-all'), btnClear = $('btn-clear');
  const progSection = $('progress-section'), progFill = $('progress-fill'), progText = $('progress-text');
  const results = $('results-container');
  let generating = false;

  async function callGenerate(topic, seed, rounds) {
    const res = await fetch(`${API}/api/generate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ topic, seed, stress_rounds: rounds })
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `HTTP ${res.status}`); }
    return res.json();
  }

  function showProgress(text, pct) {
    progSection.classList.remove('hidden');
    progText.textContent = text;
    progFill.classList.toggle('indeterminate', pct === null);
    progFill.style.width = pct === null ? '0%' : pct + '%';
  }
  function hideProgress() { progSection.classList.add('hidden'); progFill.style.width = '0%'; progFill.classList.remove('indeterminate'); }

  function setLocked(state) {
    generating = state;
    btnGen.disabled = btnAll.disabled = state;
    btnGen.innerHTML = state
      ? '<span class="spinner"></span> Generating...'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate &amp; Stress-Test';
  }

  function renderGenCard(data) {
    const q = data.question, audit = data.audit;
    const sec = data.domain === 'Reading and Writing' ? 'R&W' : 'Math';
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="card-header"><div class="card-tags">
        <span class="tag tag-section">${sec}</span>
        <span class="tag tag-hard">Hard</span>
        <span class="tag ${audit.overall === 'PASS' ? 'tag-pass' : 'tag-review'}">${audit.overall === 'PASS' ? '✓ Passed' : '⚠ Review'}</span>
      </div></div>
      <div class="card-body">
        <div class="question-topic">${data.topic}</div>
        <div class="question-stem">${cleanText(q.question_stem)}</div>
        <ul class="choices-list"></ul>
        <div class="answer-section">
          <button class="btn btn-primary check-btn" style="display:none">Check Answer</button>
          <div class="explanation-box" style="display:none">
            <div class="explanation-label">Explanation</div>
            <div class="explanation-text">${q.explanation}</div>
          </div>
        </div>
      </div>
      <div class="audit-section">
        <div class="audit-header">
          <span class="audit-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Stress Test (${audit.rounds} rounds)
          </span>
          <svg class="audit-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div class="audit-details"><div class="audit-grid"></div></div>
      </div>`;

    attachChoices(card, q.choices, q.correct_answer);
    renderMath(card);

    // Audit
    const grid = card.querySelector('.audit-grid');
    for (const [key, val] of Object.entries(audit.criteria)) {
      const note = val.notes?.length ? val.notes[val.notes.length - 1] : '';
      const row = document.createElement('div');
      row.className = 'audit-row';
      row.innerHTML = `
        <span class="audit-status ${val.status === 'PASS' ? 'pass' : 'review'}">${val.status === 'PASS' ? '✓' : '!'}</span>
        <div style="flex:1;min-width:0">
          <div class="audit-criterion">${key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
          ${note ? `<div class="audit-note">${note}</div>` : ''}
        </div>
        <span class="audit-score">${val.passes}/${val.total}</span>`;
      grid.appendChild(row);
    }
    card.querySelector('.audit-header').addEventListener('click', function () {
      this.nextElementSibling.classList.toggle('open');
      this.querySelector('.audit-chevron').classList.toggle('open');
    });
    return card;
  }

  function renderError(topic, msg) {
    const c = document.createElement('div');
    c.className = 'question-card';
    c.innerHTML = `<div class="card-header"><div class="card-tags"><span class="tag tag-review">Error</span></div></div>
      <div class="card-body"><div class="question-topic">${topic}</div><div class="question-stem" style="color:var(--c-err)">${msg}</div></div>`;
    return c;
  }

  // Generate N questions for a topic
  async function generateBatch(topics, countEach, seed, rounds) {
    setLocked(true);
    let done = 0;
    const total = topics.length * countEach;
    for (const topic of topics) {
      for (let n = 0; n < countEach; n++) {
        done++;
        showProgress(`[${done}/${total}] ${topic}...`, Math.round(((done - 1) / total) * 100));
        try {
          results.appendChild(renderGenCard(await callGenerate(topic, seed, rounds)));
        } catch (e) {
          results.appendChild(renderError(topic, e.message));
        }
      }
    }
    showProgress(`Done — ${total} question${total > 1 ? 's' : ''} generated.`, 100);
    setTimeout(hideProgress, 2000);
    setLocked(false);
  }

  btnGen.addEventListener('click', () => {
    if (generating) return;
    const count = parseInt(numQuestions.value);
    if (count === 1) {
      // Single question: use indeterminate progress
      setLocked(true);
      showProgress(`Generating "${topicSelect.value}"...`, null);
      callGenerate(topicSelect.value, seedInput.value, parseInt(stressRounds.value))
        .then(data => { results.prepend(renderGenCard(data)); })
        .catch(e => { results.prepend(renderError(topicSelect.value, e.message)); })
        .finally(() => { hideProgress(); setLocked(false); });
    } else {
      generateBatch([topicSelect.value], count, seedInput.value, parseInt(stressRounds.value));
    }
  });

  btnAll.addEventListener('click', () => {
    if (generating) return;
    generateBatch(ALL_TOPICS, parseInt(numQuestions.value), seedInput.value, parseInt(stressRounds.value));
  });

  btnClear.addEventListener('click', () => { results.innerHTML = ''; hideProgress(); });

  // ═══════════════════════════════════════
  // QUESTION BANK TAB
  // ═══════════════════════════════════════

  let bankData = [], bankFiltered = [], bankPage = 0, bankLoaded = false;
  const PER_PAGE = 15;
  const bSec = $('bank-section'), bDiff = $('bank-difficulty'), bDom = $('bank-domain');
  const bSearch = $('bank-search');
  const bDesmosSeg = $('bank-desmos-seg');
  let desmosFilter = 'all'; // 'all' | 'desmos' | 'no-desmos'
  const bCount = $('bank-count'), bResults = $('bank-results');
  const bPrev = $('bank-prev'), bNext = $('bank-next'), bPageInfo = $('bank-page-info');

  async function loadBank() {
    bResults.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--c-muted)">Loading questions...</div>';
    try {
      const resp = await fetch('question_bank.json');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      bankData = await resp.json();
      bankLoaded = true;
      // Populate domain filter
      const doms = [...new Set(bankData.map(q => q.domain))].sort();
      bDom.innerHTML = '<option value="all">All Domains</option>' + doms.map(d => `<option value="${d}">${d}</option>`).join('');
      $('bank-tab-count').textContent = bankData.length.toLocaleString();
      applyFilters();
    } catch (e) {
      bResults.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--c-err)">Failed to load: ${e.message}</div>`;
    }
  }

  function applyFilters() {
    const sec = bSec.value, diff = bDiff.value, dom = bDom.value;
    const q = bSearch.value.toLowerCase().trim();
    bankFiltered = bankData.filter(item =>
      (sec === 'all' || item.section === sec) &&
      (diff === 'all' || item.difficulty === diff) &&
      (dom === 'all' || item.domain === dom) &&
      (desmosFilter === 'all' || (desmosFilter === 'desmos' && item.desmos_solvable) || (desmosFilter === 'no-desmos' && !item.desmos_solvable)) &&
      (!q || item.stem.toLowerCase().includes(q) || item.domain.toLowerCase().includes(q))
    );
    bankPage = 0;
    bCount.textContent = bankFiltered.length.toLocaleString() + ' questions';
    renderPage();
  }

  function renderPage() {
    const pages = Math.ceil(bankFiltered.length / PER_PAGE) || 1;
    const start = bankPage * PER_PAGE;
    bResults.innerHTML = '';
    if (!bankFiltered.length) {
      bResults.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--c-muted)">No questions match your filters.</div>';
    } else {
      bankFiltered.slice(start, start + PER_PAGE).forEach((q, i) => bResults.appendChild(renderBankCard(q, start + i + 1)));
    }
    bPageInfo.textContent = `Page ${bankPage + 1} / ${pages}`;
    bPrev.disabled = bankPage === 0;
    bNext.disabled = bankPage >= pages - 1;
  }

  function renderBankCard(q, num) {
    const diffTag = q.difficulty === 'Hard' ? 'tag-hard' : q.difficulty === 'Medium' ? 'tag-medium' : 'tag-easy';
    const card = document.createElement('div');
    card.className = 'question-card';
    card.innerHTML = `
      <div class="card-header"><div class="card-tags">
        <span class="tag tag-section">${q.section === 'Reading and Writing' ? 'R&W' : 'Math'}</span>
        <span class="tag ${diffTag}">${q.difficulty}</span>
        <span class="tag tag-domain">${q.domain}</span>
        ${q.desmos_solvable ? `<span class="desmos-badge" title="${q.desmos_category}">📐 ${q.desmos_category || 'Desmos'}</span>` : ''}
      </div></div>
      <div class="card-body">
        <div class="question-topic">#${num} · ${q.id}${q.source ? ` · <em>${q.source}</em>` : ''}</div>
        ${q.passage ? `<div class="question-passage">${q.passage}</div>` : ''}
        <div class="question-stem">${cleanText(q.stem)}</div>
        <ul class="choices-list"></ul>
        <div class="answer-section">
          <button class="btn btn-primary check-btn" style="display:none">Check Answer</button>
          <div class="explanation-box" style="display:none">
            <div class="explanation-label">Explanation</div>
            <div class="explanation-text">${q.explanation || 'No explanation available.'}</div>
          </div>
        </div>
        ${q.desmos_solvable ? `<div class="desmos-method"><strong>${q.desmos_category}</strong> (${q.desmos_freq} of SAT Math)<br>${q.desmos_method}${q.desmos_notes ? '<br><em>' + q.desmos_notes + '</em>' : ''}</div>` : ''}
        <div class="bank-card-actions">
          <button class="btn-use-seed">⚡ Use as Seed</button>
        </div>
      </div>`;

    attachChoices(card, q.choices, q.correct_answer);
    renderMath(card);

    card.querySelector('.btn-use-seed').addEventListener('click', () => {
      let seed = q.stem + '\n\n';
      LETTERS.forEach(L => { if (q.choices[L]) seed += `${L}) ${q.choices[L]}\n`; });
      seed += `\nCorrect Answer: ${q.correct_answer}`;
      seedInput.value = seed;
      // Match topic if possible
      const opt = Array.from(topicSelect.options).find(o => o.value === q.topic);
      if (opt) topicSelect.value = opt.value;
      switchTab('generator');
      seedInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      seedInput.focus();
    });

    return card;
  }

  // Filter listeners
  let searchTimer;
  [bSec, bDiff, bDom].forEach(el => el.addEventListener('change', applyFilters));
  bDesmosSeg.addEventListener('click', e => {
    const btn = e.target.closest('.seg-btn');
    if (!btn) return;
    bDesmosSeg.querySelectorAll('.seg-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    desmosFilter = btn.dataset.val;
    applyFilters();
  });
  bSearch.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(applyFilters, 300); });
  bPrev.addEventListener('click', () => { if (bankPage > 0) { bankPage--; renderPage(); scrollTo(0, 0); } });
  bNext.addEventListener('click', () => { if (bankPage < Math.ceil(bankFiltered.length / PER_PAGE) - 1) { bankPage++; renderPage(); scrollTo(0, 0); } });
})();
