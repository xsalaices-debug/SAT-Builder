// js/dashboard.js — Analytics dashboard

import { $, renderMath } from './utils.js';
import { getSessions, computeStats } from './store.js';
import { ensureLoaded } from './bank.js';
import { navigate } from './router.js';

export async function renderDashboard(container) {
  const questions = await ensureLoaded();
  const sessions = getSessions();
  const stats = computeStats(sessions, questions);

  if (!stats.total) {
    renderEmpty(container);
    return;
  }

  container.innerHTML = `
    <div class="dashboard">
      <h2 class="dash-title">Your Stats</h2>

      <!-- Summary cards -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-value">${stats.total}</div>
          <div class="stat-label">Questions Attempted</div>
        </div>
        <div class="stat-card stat-card-accent">
          <div class="stat-value">${stats.accuracy}%</div>
          <div class="stat-label">Overall Accuracy</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.avgTime}s</div>
          <div class="stat-label">Avg Time / Question</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">${stats.streak}</div>
          <div class="stat-label">Current Streak</div>
        </div>
      </div>

      <!-- Domain accuracy -->
      <section class="dash-section">
        <h3 class="dash-section-title">Accuracy by Domain</h3>
        <div class="bar-chart" id="domain-chart"></div>
      </section>

      <!-- Skill accuracy -->
      <section class="dash-section">
        <h3 class="dash-section-title">Accuracy by Skill</h3>
        <div class="bar-chart" id="skill-chart"></div>
      </section>

      <!-- Desmos stats -->
      <section class="dash-section">
        <h3 class="dash-section-title">Desmos Strategy</h3>
        <div class="desmos-stats" id="desmos-stats"></div>
      </section>

      <!-- Method accuracy -->
      ${Object.keys(stats.byMethod).length ? `
      <section class="dash-section">
        <h3 class="dash-section-title">Accuracy by Desmos Method</h3>
        <div class="bar-chart" id="method-chart"></div>
      </section>` : ''}

      <!-- Weak skills -->
      ${stats.weakSkills.length ? `
      <section class="dash-section">
        <h3 class="dash-section-title">⚠ Weak Skills</h3>
        <div class="weak-skills-list" id="weak-skills"></div>
      </section>` : ''}

      <!-- Recent sessions -->
      <section class="dash-section">
        <h3 class="dash-section-title">Recent Sessions</h3>
        <div class="sessions-list" id="sessions-list"></div>
      </section>
    </div>
  `;

  // Render domain bars
  renderBars($('domain-chart'), stats.byDomain);

  // Render skill bars (top 10 by attempts)
  const topSkills = Object.entries(stats.bySkill)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 12)
    .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});
  renderBars($('skill-chart'), topSkills);

  // Render desmos stats
  renderDesmosStats($('desmos-stats'), stats.desmos);

  // Render method bars
  if (Object.keys(stats.byMethod).length) {
    renderBars($('method-chart'), stats.byMethod);
  }

  // Render weak skills
  if (stats.weakSkills.length) {
    const weakEl = $('weak-skills');
    stats.weakSkills.forEach(s => {
      const item = document.createElement('div');
      item.className = 'weak-skill-item';
      item.innerHTML = `
        <div class="weak-skill-name">${s.skill}</div>
        <div class="weak-skill-detail">${s.accuracy}% accuracy · ${s.total} attempts · ${s.avgTime}s avg</div>
      `;
      weakEl.appendChild(item);
    });
  }

  // Render sessions
  const sessEl = $('sessions-list');
  if (stats.recentSessions.length) {
    stats.recentSessions.forEach(s => {
      const d = new Date(s.date);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const pct = s.total ? Math.round((s.score / s.total) * 100) : 0;
      const mins = Math.floor(s.duration_seconds / 60);
      const row = document.createElement('div');
      row.className = 'session-row';
      row.innerHTML = `
        <span class="session-date">${dateStr}</span>
        <span class="session-mode">${s.mode}</span>
        <span class="session-score">${s.score}/${s.total} (${pct}%)</span>
        <span class="session-time">${mins}m</span>
      `;
      sessEl.appendChild(row);
    });
  } else {
    sessEl.innerHTML = '<div class="empty-state">No sessions yet.</div>';
  }
}

function renderEmpty(container) {
  container.innerHTML = `
    <div class="dashboard">
      <h2 class="dash-title">Your Stats</h2>
      <div class="empty-dashboard">
        <div class="empty-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" color="var(--c-faint)"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
        </div>
        <h3>No practice data yet</h3>
        <p class="empty-sub">Complete a practice session to see your stats here.</p>
        <button class="btn btn-primary" id="btn-start-first">Start Practice</button>
      </div>
    </div>
  `;
  $('btn-start-first')?.addEventListener('click', () => navigate('/practice'));
}

function renderBars(el, data) {
  if (!el) return;
  const entries = Object.entries(data).sort((a, b) => b[1].accuracy - a[1].accuracy);
  entries.forEach(([label, v]) => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const color = v.accuracy >= 75 ? 'var(--c-ok)' : v.accuracy >= 50 ? 'var(--c-warn)' : 'var(--c-err)';
    row.innerHTML = `
      <div class="bar-label">${label}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width: ${v.accuracy}%; background: ${color}"></div>
      </div>
      <div class="bar-value">${v.accuracy}%</div>
      <div class="bar-meta">${v.total} · ${v.avgTime}s</div>
    `;
    el.appendChild(row);
  });
}

function renderDesmosStats(el, desmos) {
  if (!el) return;
  el.innerHTML = `
    <div class="stat-cards stat-cards-sm">
      <div class="stat-card">
        <div class="stat-value">${desmos.eligible}</div>
        <div class="stat-label">Desmos-Eligible Seen</div>
      </div>
      <div class="stat-card ${desmos.withDesmos.accuracy >= desmos.withoutDesmos.accuracy ? 'stat-card-ok' : ''}">
        <div class="stat-value">${desmos.withDesmos.total ? desmos.withDesmos.accuracy + '%' : '—'}</div>
        <div class="stat-label">With Desmos (${desmos.withDesmos.total})</div>
      </div>
      <div class="stat-card ${desmos.withoutDesmos.accuracy > desmos.withDesmos.accuracy ? 'stat-card-ok' : ''}">
        <div class="stat-value">${desmos.withoutDesmos.total ? desmos.withoutDesmos.accuracy + '%' : '—'}</div>
        <div class="stat-label">Without Desmos (${desmos.withoutDesmos.total})</div>
      </div>
    </div>
  `;
}
