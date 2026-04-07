// js/store.js — localStorage persistence + stats computation

const STORE_KEY = 'sat-app-data';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || defaultData();
  } catch {
    return defaultData();
  }
}

function save(data) {
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}

function defaultData() {
  return { version: 1, sessions: [], bookmarks: [], settings: { theme: 'light', defaultCount: 22 } };
}

// ── Sessions ──

export function saveSession(session) {
  const data = load();
  data.sessions.push(session);
  save(data);
}

export function getSessions() {
  return load().sessions;
}

// ── Bookmarks ──

export function getBookmarks() {
  return load().bookmarks;
}

export function toggleBookmark(qid) {
  const data = load();
  const idx = data.bookmarks.indexOf(qid);
  if (idx === -1) data.bookmarks.push(qid);
  else data.bookmarks.splice(idx, 1);
  save(data);
  return idx === -1; // true = added, false = removed
}

export function isBookmarked(qid) {
  return load().bookmarks.includes(qid);
}

// ── Settings ──

export function getSettings() {
  return load().settings;
}

export function updateSettings(patch) {
  const data = load();
  Object.assign(data.settings, patch);
  save(data);
}

// ── Stats Computation ──

export function computeStats(sessions, questions) {
  const qMap = new Map(questions.map(q => [q.id, q]));
  const attempts = sessions.flatMap(s =>
    (s.questions || []).map(a => ({
      ...a,
      date: s.date,
      mode: s.mode,
      question: qMap.get(a.qid),
    }))
  );

  if (!attempts.length) {
    return {
      total: 0, correct: 0, accuracy: 0, avgTime: 0,
      streak: 0, sessionsCount: sessions.length,
      byDomain: {}, bySkill: {}, byDifficulty: {},
      desmos: { withDesmos: { total: 0, correct: 0, accuracy: 0 }, withoutDesmos: { total: 0, correct: 0, accuracy: 0 } },
      byMethod: {},
      weakSkills: [],
      recentSessions: sessions.slice(-10).reverse(),
    };
  }

  const total = attempts.length;
  const correct = attempts.filter(a => a.correct).length;
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  const avgTime = total ? Math.round(attempts.reduce((s, a) => s + (a.time_seconds || 0), 0) / total) : 0;

  // Current streak (consecutive correct from most recent)
  let streak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].correct) streak++;
    else break;
  }

  // Group helper
  function groupStats(keyFn) {
    const groups = {};
    for (const a of attempts) {
      const key = keyFn(a);
      if (!key) continue;
      if (!groups[key]) groups[key] = { total: 0, correct: 0, totalTime: 0 };
      groups[key].total++;
      if (a.correct) groups[key].correct++;
      groups[key].totalTime += a.time_seconds || 0;
    }
    for (const k of Object.keys(groups)) {
      const g = groups[k];
      g.accuracy = g.total ? Math.round((g.correct / g.total) * 100) : 0;
      g.avgTime = g.total ? Math.round(g.totalTime / g.total) : 0;
    }
    return groups;
  }

  const byDomain = groupStats(a => a.question?.domain);
  const bySkill = groupStats(a => a.question?.skill);
  const byDifficulty = groupStats(a => a.question?.difficulty);

  // Desmos vs non-Desmos (on desmos-eligible questions only)
  const desmosEligible = attempts.filter(a => a.question?.desmos_solvable);
  const usedDesmos = desmosEligible.filter(a => a.used_desmos);
  const didntUseDesmos = desmosEligible.filter(a => !a.used_desmos);

  const desmos = {
    eligible: desmosEligible.length,
    withDesmos: {
      total: usedDesmos.length,
      correct: usedDesmos.filter(a => a.correct).length,
      accuracy: usedDesmos.length ? Math.round((usedDesmos.filter(a => a.correct).length / usedDesmos.length) * 100) : 0,
    },
    withoutDesmos: {
      total: didntUseDesmos.length,
      correct: didntUseDesmos.filter(a => a.correct).length,
      accuracy: didntUseDesmos.length ? Math.round((didntUseDesmos.filter(a => a.correct).length / didntUseDesmos.length) * 100) : 0,
    },
  };

  // By Desmos method (only for desmos-solvable questions)
  const byMethod = groupStats(a => a.question?.desmos?.method);

  // Weak skills: < 60% accuracy with 5+ attempts
  const weakSkills = Object.entries(bySkill)
    .filter(([, v]) => v.accuracy < 60 && v.total >= 5)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .map(([skill, v]) => ({ skill, ...v }));

  return {
    total, correct, accuracy, avgTime, streak,
    sessionsCount: sessions.length,
    byDomain, bySkill, byDifficulty,
    desmos, byMethod, weakSkills,
    recentSessions: sessions.slice(-10).reverse(),
  };
}

// ── Export all data (for backup) ──

export function exportData() {
  return JSON.stringify(load(), null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (data.version && data.sessions) {
    save(data);
    return true;
  }
  return false;
}
