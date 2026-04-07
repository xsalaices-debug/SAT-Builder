// js/practice.js — Bluebook-style timed practice mode with session recording

import { $, renderMath, cleanText, stripHtml, LETTERS } from './utils.js';
import { saveSession } from './store.js';
import { ensureLoaded } from './bank.js';
import { navigate } from './router.js';

let allQuestions = [];
let questions = [];
let currentIdx = 0;
let answers = {};
let crossouts = {};
let marked = {};
let usedDesmos = {};
let questionStartTimes = {};
let questionTimes = {};
let crossoutMode = false;
let timerInterval = null;
let timerSeconds = 0;
let timerVisible = true;
let isReviewMode = false;
let desmosCalc = null;
let sessionId = null;

export async function renderPractice(container) {
  allQuestions = await ensureLoaded();

  // Check if we have filtered IDs from bank
  const filterIds = sessionStorage.getItem('practice-filter-ids');
  let prefiltered = null;
  if (filterIds) {
    try {
      const ids = JSON.parse(filterIds);
      prefiltered = allQuestions.filter(q => ids.includes(q.id));
    } catch { /* ignore */ }
    sessionStorage.removeItem('practice-filter-ids');
  }

  renderSetup(container, prefiltered);
}

function renderSetup(container, prefiltered) {
  // Build domain/difficulty filter options from available questions
  const domains = [...new Set(allQuestions.map(q => q.domain))].sort();
  const difficulties = ['Easy', 'Medium', 'Hard'];

  container.innerHTML = `
    <div class="practice-setup">
      <div class="setup-header">
        <h2 class="setup-title">Practice Session</h2>
        <p class="setup-sub">Configure your timed practice. Results are saved to your stats.</p>
      </div>
      ${prefiltered ? `<div class="setup-notice">Using ${prefiltered.length} questions from your bank filters. <button class="btn-link" id="clear-prefilter">Use all questions instead</button></div>` : ''}
      <div class="setup-grid">
        <div class="control-group">
          <label class="control-label">Domain</label>
          <select id="setup-domain" class="control-input" ${prefiltered ? 'disabled' : ''}>
            <option value="all">All Domains</option>
            ${domains.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <label class="control-label">Difficulty</label>
          <select id="setup-difficulty" class="control-input" ${prefiltered ? 'disabled' : ''}>
            <option value="all">All Difficulties</option>
            ${difficulties.map(d => `<option value="${d}">${d}</option>`).join('')}
          </select>
        </div>
        <div class="control-group">
          <label class="control-label">Questions</label>
          <select id="setup-count" class="control-input">
            <option value="10">10</option>
            <option value="15">15</option>
            <option value="22" selected>22 (SAT module)</option>
            <option value="30">30</option>
            <option value="44">44 (full SAT Math)</option>
          </select>
        </div>
        <div class="control-group">
          <label class="control-label">Desmos Filter</label>
          <select id="setup-desmos" class="control-input" ${prefiltered ? 'disabled' : ''}>
            <option value="all">All Questions</option>
            <option value="desmos">Desmos-Solvable Only</option>
            <option value="no-desmos">Non-Desmos Only</option>
          </select>
        </div>
      </div>
      <div class="setup-info" id="setup-info">
        <span id="setup-available">0 questions available</span>
      </div>
      <div class="setup-actions">
        <button class="btn btn-primary btn-lg" id="btn-start-practice">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Start Practice
        </button>
      </div>
    </div>
  `;

  // Update available count
  function updateAvailable() {
    const pool = prefiltered || filterQuestions();
    $('setup-available').textContent = `${pool.length} questions available`;
    $('btn-start-practice').disabled = pool.length === 0;
  }

  function filterQuestions() {
    const dom = $('setup-domain')?.value || 'all';
    const diff = $('setup-difficulty')?.value || 'all';
    const desmos = $('setup-desmos')?.value || 'all';
    return allQuestions.filter(q =>
      (dom === 'all' || q.domain === dom) &&
      (diff === 'all' || q.difficulty === diff) &&
      (desmos === 'all' || (desmos === 'desmos' && q.desmos_solvable) || (desmos === 'no-desmos' && !q.desmos_solvable))
    );
  }

  updateAvailable();
  $('setup-domain')?.addEventListener('change', updateAvailable);
  $('setup-difficulty')?.addEventListener('change', updateAvailable);
  $('setup-desmos')?.addEventListener('change', updateAvailable);

  $('clear-prefilter')?.addEventListener('click', () => {
    renderSetup(container, null);
  });

  $('btn-start-practice')?.addEventListener('click', () => {
    const pool = prefiltered || filterQuestions();
    const count = Math.min(parseInt($('setup-count')?.value || 22), pool.length);
    startTest(container, pool, count);
  });
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startTest(container, pool, count) {
  questions = shuffle(pool).slice(0, count);
  currentIdx = 0;
  answers = {};
  crossouts = {};
  marked = {};
  usedDesmos = {};
  questionStartTimes = {};
  questionTimes = {};
  crossoutMode = false;
  timerSeconds = 0;
  timerVisible = true;
  isReviewMode = false;
  sessionId = 's_' + Date.now();

  container.innerHTML = `
    <div class="test-screen" id="test-screen">
      <div class="test-top-bar">
        <div class="test-top-left">
          <span class="test-section" id="top-section">Math</span>
        </div>
        <div class="test-top-center">
          <span class="test-timer" id="top-timer">00:00</span>
          <button class="test-timer-toggle" id="btn-timer-toggle">Hide</button>
        </div>
        <div class="test-top-right">
          <button class="test-action-btn" id="btn-mark" title="Mark for review">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          </button>
          <button class="test-action-btn desmos-calc-btn" id="btn-calc" title="Calculator">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="3"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>
          </button>
        </div>
      </div>
      <div class="test-body" id="test-body"></div>
      <div class="test-bottom-bar">
        <div class="test-bottom-left">
          <span class="test-q-num" id="top-q-num">Question 1 of ${count}</span>
          <button class="test-action-btn test-desmos-toggle" id="btn-used-desmos" title="Mark if you used Desmos">
            📐 Used Desmos
          </button>
        </div>
        <div class="test-bottom-right">
          <button class="btn btn-secondary" id="btn-back" disabled>Back</button>
          <button class="btn btn-primary" id="btn-next">Next</button>
        </div>
      </div>
    </div>

    <!-- Navigator popup -->
    <div class="nav-overlay" id="nav-overlay"></div>
    <div class="nav-popup" id="nav-popup">
      <div class="nav-popup-header">
        <span>Question Navigator</span>
        <button class="nav-popup-close" id="nav-popup-close">&times;</button>
      </div>
      <div class="nav-grid" id="nav-grid"></div>
      <div class="nav-legend">
        <span class="nav-legend-item"><span class="nav-cell-demo current"></span> Current</span>
        <span class="nav-legend-item"><span class="nav-cell-demo answered"></span> Answered</span>
        <span class="nav-legend-item"><span class="nav-cell-demo flagged"></span> Flagged</span>
      </div>
    </div>

    <!-- Desmos modal for practice -->
    <div class="desmos-overlay" id="desmos-practice-overlay">
      <div class="desmos-modal">
        <div class="desmos-modal-header">
          <span>Graphing Calculator</span>
          <button id="desmos-modal-close">&times;</button>
        </div>
        <div id="desmos-practice-container" class="desmos-modal-body"></div>
      </div>
    </div>
  `;

  buildNavGrid();
  bindTestEvents(container);
  questionStartTimes[currentIdx] = performance.now();
  renderQuestion();
  startTimer();
}

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    updateTimerDisplay();
  }, 1000);
}

function updateTimerDisplay() {
  const m = String(Math.floor(timerSeconds / 60)).padStart(2, '0');
  const s = String(timerSeconds % 60).padStart(2, '0');
  const el = $('top-timer');
  if (el) {
    el.textContent = m + ':' + s;
    el.style.visibility = timerVisible ? 'visible' : 'hidden';
  }
}

function renderQuestion() {
  const q = questions[currentIdx];
  const body = $('test-body');
  if (!body) return;

  $('top-q-num').textContent = `Question ${currentIdx + 1} of ${questions.length}`;
  updateMarkBtn();
  updateDesmosToggle();

  // Show/hide "Used Desmos" toggle based on desmos_solvable
  const desmosToggle = $('btn-used-desmos');
  if (desmosToggle) desmosToggle.style.display = q.desmos_solvable ? '' : 'none';

  let html = `
    <div class="question-layout" id="question-pane">
      <div class="question-number-badge">${currentIdx + 1}</div>
      <div class="crossout-toggle-row">
        <button class="crossout-toggle ${crossoutMode ? 'active' : ''}" id="btn-crossout">
          <span class="strikethrough-icon">ABC</span>
        </button>
      </div>
      <div class="question-stem">${cleanText(q.stem)}</div>
      <ul class="choices-list ${crossoutMode ? 'crossout-active' : ''}" id="choices-list"></ul>
    </div>`;

  body.innerHTML = html;

  // Build choices
  const list = $('choices-list');
  const qCrossouts = crossouts[currentIdx] || {};

  LETTERS.forEach(L => {
    if (!q.choices[L]) return;
    const li = document.createElement('li');
    li.className = 'choice-item';
    if (answers[currentIdx] === L) li.classList.add('selected');
    if (qCrossouts[L]) li.classList.add('crossed-out');

    li.innerHTML = `
      <span class="choice-letter">${L}</span>
      <span class="choice-text">${cleanText(q.choices[L])}</span>
      <button class="crossout-circle" data-letter="${L}" title="Cross out ${L}">&#x2715;</button>
    `;

    li.addEventListener('click', (e) => {
      if (e.target.closest('.crossout-circle')) return;
      if (li.classList.contains('crossed-out')) return;
      if (isReviewMode) return;
      if (answers[currentIdx] === L) {
        delete answers[currentIdx];
        li.classList.remove('selected');
      } else {
        answers[currentIdx] = L;
        list.querySelectorAll('.choice-item').forEach(el => el.classList.remove('selected'));
        li.classList.add('selected');
      }
      updateNavGrid();
    });

    li.querySelector('.crossout-circle').addEventListener('click', (e) => {
      e.stopPropagation();
      if (isReviewMode) return;
      if (!crossouts[currentIdx]) crossouts[currentIdx] = {};
      crossouts[currentIdx][L] = !crossouts[currentIdx][L];
      li.classList.toggle('crossed-out');
      if (crossouts[currentIdx][L] && answers[currentIdx] === L) {
        delete answers[currentIdx];
        li.classList.remove('selected');
        updateNavGrid();
      }
    });

    list.appendChild(li);
  });

  $('btn-crossout')?.addEventListener('click', () => {
    if (isReviewMode) return;
    crossoutMode = !crossoutMode;
    $('btn-crossout')?.classList.toggle('active', crossoutMode);
    $('choices-list')?.classList.toggle('crossout-active', crossoutMode);
  });

  renderMath(body);

  // Update nav buttons
  const backBtn = $('btn-back');
  const nextBtn = $('btn-next');
  if (backBtn) backBtn.disabled = currentIdx === 0;
  if (nextBtn) {
    if (currentIdx === questions.length - 1 && !isReviewMode) {
      nextBtn.textContent = 'Finish';
      nextBtn.className = 'btn btn-finish';
    } else {
      nextBtn.textContent = 'Next';
      nextBtn.className = 'btn btn-primary';
    }
  }

  updateNavGrid();
  body.scrollTop = 0;
}

function recordQuestionTime() {
  if (questionStartTimes[currentIdx] != null) {
    const elapsed = (performance.now() - questionStartTimes[currentIdx]) / 1000;
    questionTimes[currentIdx] = (questionTimes[currentIdx] || 0) + elapsed;
  }
}

function goTo(idx) {
  if (idx < 0 || idx >= questions.length) return;
  recordQuestionTime();
  currentIdx = idx;
  questionStartTimes[currentIdx] = performance.now();
  renderQuestion();
  closeNavPopup();
}

function updateMarkBtn() {
  const btn = $('btn-mark');
  if (!btn) return;
  if (marked[currentIdx]) {
    btn.classList.add('flagged');
    btn.querySelector('svg')?.setAttribute('fill', 'var(--c-warn)');
  } else {
    btn.classList.remove('flagged');
    btn.querySelector('svg')?.setAttribute('fill', 'none');
  }
}

function updateDesmosToggle() {
  const btn = $('btn-used-desmos');
  if (!btn) return;
  btn.classList.toggle('active', !!usedDesmos[currentIdx]);
}

function buildNavGrid() {
  const grid = $('nav-grid');
  if (!grid) return;
  grid.innerHTML = '';
  questions.forEach((_, i) => {
    const cell = document.createElement('button');
    cell.className = 'nav-cell';
    cell.textContent = i + 1;
    cell.addEventListener('click', () => goTo(i));
    grid.appendChild(cell);
  });
  updateNavGrid();
}

function updateNavGrid() {
  const cells = $('nav-grid')?.querySelectorAll('.nav-cell');
  if (!cells) return;
  cells.forEach((cell, i) => {
    cell.className = 'nav-cell';
    if (i === currentIdx) cell.classList.add('current');
    else if (answers[i] !== undefined) cell.classList.add('answered');
    if (marked[i]) cell.classList.add('flagged');
  });
}

function closeNavPopup() {
  $('nav-popup')?.classList.remove('open');
  $('nav-overlay')?.classList.remove('open');
}

function finishTest(container) {
  recordQuestionTime();
  clearInterval(timerInterval);

  let correct = 0;
  const questionResults = questions.map((q, i) => {
    const isCorrect = answers[i] === q.correct_answer;
    if (isCorrect) correct++;
    return {
      qid: q.id,
      answer: answers[i] || null,
      correct: isCorrect,
      time_seconds: Math.round(questionTimes[i] || 0),
      used_desmos: !!usedDesmos[i],
      flagged: !!marked[i],
    };
  });

  // Save session
  const session = {
    id: sessionId,
    date: new Date().toISOString(),
    mode: 'practice',
    questions: questionResults,
    score: correct,
    total: questions.length,
    duration_seconds: timerSeconds,
  };
  saveSession(session);

  renderResults(container, correct);
}

function renderResults(container, correct) {
  const pct = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;
  const minutes = Math.floor(timerSeconds / 60);
  const secs = timerSeconds % 60;

  let resultsHtml = `
    <div class="results-screen">
      <div class="results-header">
        <h2 class="results-title">Practice Complete</h2>
        <div class="results-score-row">
          <div class="stat-card">
            <div class="stat-value">${correct} / ${questions.length}</div>
            <div class="stat-label">Score</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${pct}%</div>
            <div class="stat-label">Accuracy</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${minutes}:${String(secs).padStart(2, '0')}</div>
            <div class="stat-label">Time</div>
          </div>
        </div>
        <p class="results-saved">Session saved to your stats.</p>
      </div>
      <div class="results-actions">
        <button class="btn btn-primary" id="btn-results-dashboard">View Dashboard</button>
        <button class="btn btn-secondary" id="btn-results-review">Review Answers</button>
        <button class="btn btn-secondary" id="btn-results-new">New Practice</button>
      </div>
      <div class="results-body" id="results-body"></div>
    </div>
  `;

  container.innerHTML = resultsHtml;

  // Build results list
  const body = $('results-body');
  questions.forEach((q, i) => {
    const userAns = answers[i];
    const isCorrect = userAns === q.correct_answer;
    const wasAnswered = userAns !== undefined;
    const time = Math.round(questionTimes[i] || 0);

    let iconClass = 'unanswered';
    let iconText = '—';
    if (wasAnswered && isCorrect) { iconClass = 'correct'; iconText = '✓'; }
    else if (wasAnswered) { iconClass = 'incorrect'; iconText = '✗'; }

    const stemPreview = stripHtml(cleanText(q.stem)).slice(0, 120);

    const item = document.createElement('div');
    item.className = 'results-item';
    item.innerHTML = `
      <div class="results-icon ${iconClass}">${iconText}</div>
      <div class="results-detail">
        <div class="results-q-num">Q${i + 1} · ${q.domain} · ${q.skill} · ${q.difficulty} · ${time}s</div>
        <div class="results-q-stem">${stemPreview}...</div>
        <div class="results-answers">
          Your answer: <span class="${!isCorrect && wasAnswered ? 'wrong' : ''}">${wasAnswered ? userAns : '—'}</span>
          &nbsp;·&nbsp; Correct: <span class="correct-ans">${q.correct_answer}</span>
          ${usedDesmos[i] ? ' · 📐 Used Desmos' : ''}
        </div>
      </div>
    `;
    body.appendChild(item);
  });

  renderMath(body);

  $('btn-results-dashboard')?.addEventListener('click', () => navigate('/dashboard'));
  $('btn-results-review')?.addEventListener('click', () => {
    isReviewMode = true;
    currentIdx = 0;
    startReview(container);
  });
  $('btn-results-new')?.addEventListener('click', () => navigate('/practice'));
}

function startReview(container) {
  container.innerHTML = `
    <div class="test-screen" id="test-screen">
      <div class="test-top-bar">
        <div class="test-top-left"><span class="test-section">Review Mode</span></div>
        <div class="test-top-center"></div>
        <div class="test-top-right">
          <button class="btn btn-secondary" id="btn-back-results">Back to Results</button>
        </div>
      </div>
      <div class="test-body" id="test-body"></div>
      <div class="test-bottom-bar">
        <div class="test-bottom-left">
          <span class="test-q-num" id="top-q-num"></span>
        </div>
        <div class="test-bottom-right">
          <button class="btn btn-secondary" id="btn-back" disabled>Back</button>
          <button class="btn btn-primary" id="btn-next">Next</button>
        </div>
      </div>
    </div>
  `;

  renderReviewQuestion(container);
  $('btn-back')?.addEventListener('click', () => {
    if (currentIdx > 0) { currentIdx--; renderReviewQuestion(container); }
  });
  $('btn-next')?.addEventListener('click', () => {
    if (currentIdx < questions.length - 1) { currentIdx++; renderReviewQuestion(container); }
  });
  $('btn-back-results')?.addEventListener('click', () => {
    isReviewMode = false;
    let correct = 0;
    questions.forEach((q, i) => { if (answers[i] === q.correct_answer) correct++; });
    renderResults(container, correct);
  });
}

function renderReviewQuestion(container) {
  const q = questions[currentIdx];
  const body = $('test-body');
  if (!body) return;

  $('top-q-num').textContent = `Question ${currentIdx + 1} of ${questions.length}`;
  $('btn-back').disabled = currentIdx === 0;

  body.innerHTML = `
    <div class="question-layout" id="question-pane">
      <div class="question-number-badge">${currentIdx + 1}</div>
      <div class="question-stem">${cleanText(q.stem)}</div>
      <ul class="choices-list" id="choices-list"></ul>
    </div>
  `;

  const list = $('choices-list');
  LETTERS.forEach(L => {
    if (!q.choices[L]) return;
    const li = document.createElement('li');
    li.className = 'choice-item';
    li.innerHTML = `<span class="choice-letter">${L}</span><span class="choice-text">${cleanText(q.choices[L])}</span>`;

    if (L === q.correct_answer) {
      li.classList.add('correct');
      li.querySelector('.choice-letter').style.background = 'var(--c-ok)';
      li.querySelector('.choice-letter').style.color = 'white';
      li.querySelector('.choice-letter').style.borderColor = 'var(--c-ok)';
    } else if (L === answers[currentIdx] && L !== q.correct_answer) {
      li.classList.add('incorrect');
      li.querySelector('.choice-letter').style.background = 'var(--c-err)';
      li.querySelector('.choice-letter').style.color = 'white';
      li.querySelector('.choice-letter').style.borderColor = 'var(--c-err)';
    }
    list.appendChild(li);
  });

  // Explanation
  if (q.explanation) {
    const pane = $('question-pane');
    const expDiv = document.createElement('div');
    expDiv.className = 'explanation-box';
    expDiv.style.display = 'block';
    expDiv.innerHTML = `<div class="explanation-label">Explanation</div><div class="explanation-text">${cleanText(q.explanation)}</div>`;
    pane.appendChild(expDiv);
  }

  renderMath(body);
}

function bindTestEvents(container) {
  // Timer toggle
  $('btn-timer-toggle')?.addEventListener('click', () => {
    timerVisible = !timerVisible;
    $('btn-timer-toggle').textContent = timerVisible ? 'Hide' : 'Show';
    updateTimerDisplay();
  });

  // Mark for review
  $('btn-mark')?.addEventListener('click', () => {
    if (isReviewMode) return;
    marked[currentIdx] = !marked[currentIdx];
    updateMarkBtn();
    updateNavGrid();
  });

  // Used Desmos toggle
  $('btn-used-desmos')?.addEventListener('click', () => {
    if (isReviewMode) return;
    usedDesmos[currentIdx] = !usedDesmos[currentIdx];
    updateDesmosToggle();
  });

  // Navigation
  $('btn-back')?.addEventListener('click', () => goTo(currentIdx - 1));
  $('btn-next')?.addEventListener('click', () => {
    if (currentIdx === questions.length - 1 && !isReviewMode) {
      finishTest(container);
    } else {
      goTo(currentIdx + 1);
    }
  });

  // Keyboard nav
  const keyHandler = (e) => {
    if (!$('test-screen')) { document.removeEventListener('keydown', keyHandler); return; }
    if (e.key === 'ArrowLeft') goTo(currentIdx - 1);
    else if (e.key === 'ArrowRight') {
      if (currentIdx === questions.length - 1 && !isReviewMode) finishTest(container);
      else goTo(currentIdx + 1);
    }
  };
  document.addEventListener('keydown', keyHandler);

  // Navigator popup toggle (click on question number)
  $('top-q-num')?.addEventListener('click', () => {
    $('nav-popup')?.classList.toggle('open');
    $('nav-overlay')?.classList.toggle('open');
  });
  $('nav-popup-close')?.addEventListener('click', closeNavPopup);
  $('nav-overlay')?.addEventListener('click', closeNavPopup);

  // Desmos calculator modal
  $('btn-calc')?.addEventListener('click', () => {
    $('desmos-practice-overlay')?.classList.add('open');
    const calcContainer = $('desmos-practice-container');
    if (!desmosCalc && calcContainer && typeof Desmos !== 'undefined') {
      desmosCalc = Desmos.GraphingCalculator(calcContainer, {
        expressions: true, keypad: true, settingsMenu: true,
        zoomButtons: true, pointsOfInterest: true, trace: true,
        border: false, expressionsTopbar: true,
      });
    }
    if (desmosCalc) desmosCalc.resize();
  });

  $('desmos-modal-close')?.addEventListener('click', () => {
    $('desmos-practice-overlay')?.classList.remove('open');
  });
  $('desmos-practice-overlay')?.addEventListener('click', (e) => {
    if (e.target === $('desmos-practice-overlay')) {
      $('desmos-practice-overlay')?.classList.remove('open');
    }
  });
}
