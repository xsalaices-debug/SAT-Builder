#!/usr/bin/env node
/**
 * migrate-questions.js
 * 
 * Reads question_bank.json, filters to Math only, restructures fields,
 * and writes data/math-questions.json.
 * 
 * Run: node scripts/migrate-questions.js
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const raw = JSON.parse(readFileSync(join(ROOT, 'question_bank.json'), 'utf-8'));

// ── Filter to Math only ──
const math = raw.filter(q => q.section === 'Math');
console.log(`Total: ${raw.length} → Math: ${math.length}`);

// ── Domain abbreviation map for IDs ──
const DOMAIN_ABBREV = {
  'Advanced Math': 'adv',
  'Algebra': 'alg',
  'Geometry and Trigonometry': 'geo',
  'Problem-Solving and Data Analysis': 'psda',
  'SAT Math': 'sat',   // AGIEval unclassified
};

// ── Skill extraction ──
// OpenSAT topics are "Domain / Skill" format. AGIEval are just "SAT Math".
function extractSkill(q) {
  const topic = q.topic || '';
  if (topic.includes('/')) {
    return topic.split('/').slice(1).join('/').trim();
  }
  // AGIEval: try keyword-based classification from stem
  return classifyStemToSkill(q.stem, q.domain);
}

function classifyStemToSkill(stem, domain) {
  const s = (stem || '').toLowerCase();
  
  // Algebra signals
  if (/system|simultaneous/.test(s)) return 'Systems of equations';
  if (/linear|slope|y\s*=\s*mx|intercept/.test(s)) return 'Linear equations';
  if (/inequalit/.test(s)) return 'Inequalities';
  
  // Advanced Math signals
  if (/quadratic|parabola|x\^2|x\s*²/.test(s)) return 'Quadratic equations';
  if (/polynomial|degree|factor/.test(s)) return 'Polynomials';
  if (/exponential|growth|decay|compound/.test(s)) return 'Exponential functions';
  if (/rational|fraction.*equation/.test(s)) return 'Rational expressions';
  if (/function|f\s*\(/.test(s)) return 'Functions';
  
  // Geometry signals
  if (/circle|radius|diameter|circumference/.test(s)) return 'Circles';
  if (/triangle|hypotenuse|pythagorean/.test(s)) return 'Triangles';
  if (/angle|parallel|perpendicular/.test(s)) return 'Angles and lines';
  if (/area|volume|perimeter|surface/.test(s)) return 'Area and volume';
  if (/sin|cos|tan|trigonometr/.test(s)) return 'Trigonometry';
  if (/similar|congruent|proportion/.test(s)) return 'Similarity';
  
  // PS&DA signals
  if (/percent|rate|ratio/.test(s)) return 'Percentages and rates';
  if (/probability|combinat|permut/.test(s)) return 'Probability';
  if (/mean|median|mode|standard deviation|average/.test(s)) return 'Statistics';
  if (/table|chart|graph|scatter|data/.test(s)) return 'Data interpretation';
  if (/proportion|unit/.test(s)) return 'Proportional reasoning';
  
  return 'General';
}

// ── Desmos method mapping ──
// Map desmos_category to a standardized method key
const CATEGORY_TO_METHOD = {
  'Single Variable Equation': 'graph-zeros',
  'Basic Graphing': 'graph-intersect',
  'Functions': 'graph-intersect',
  'Equivalent Expressions': 'table-check',
  'Regression w/ Table': 'regression',
  'Factoring Check': 'table-check',
  'Number of Solutions': 'graph-intersect',
  'Systems of Equations': 'graph-intersect',
  'Circle Equation': 'graph-intersect',
};

// ── ID counters per domain abbreviation ──
const idCounters = {};

function makeId(domain, existingId) {
  // Keep non-random IDs (e.g. agieval_math_xxx)
  if (!existingId.startsWith('random_id')) return existingId;
  
  const abbrev = DOMAIN_ABBREV[domain] || 'math';
  idCounters[abbrev] = (idCounters[abbrev] || 0) + 1;
  return `${abbrev}-${String(idCounters[abbrev]).padStart(3, '0')}`;
}

// ── Determine speed advantage ──
function speedAdvantage(category, confidence) {
  if (!category) return null;
  const high = ['Single Variable Equation', 'Systems of Equations', 'Basic Graphing'];
  const medium = ['Functions', 'Number of Solutions', 'Circle Equation', 'Regression w/ Table'];
  if (high.includes(category)) return 'high';
  if (medium.includes(category)) return 'medium';
  return 'low';
}

// ── Transform ──
const output = math.map(q => {
  const domain = q.domain;
  const skill = extractSkill(q);
  const id = makeId(domain, q.id);

  const result = {
    id,
    source: q.source,
    domain,
    topic: q.topic,
    skill,
    difficulty: q.difficulty,
    stem: q.stem,
    choices: q.choices,
    correct_answer: q.correct_answer,
    explanation: q.explanation || '',
    desmos_solvable: q.desmos_solvable || false,
  };

  // Add richer desmos object only if desmos-solvable
  if (q.desmos_solvable) {
    result.desmos = {
      method: CATEGORY_TO_METHOD[q.desmos_category] || 'direct-compute',
      category: q.desmos_category || '',
      description: q.desmos_method || '',
      speed_advantage: speedAdvantage(q.desmos_category, q.desmos_confidence),
      notes: q.desmos_notes || '',
    };
  }

  return result;
});

// ── Stats ──
const domains = {};
const skills = {};
output.forEach(q => {
  domains[q.domain] = (domains[q.domain] || 0) + 1;
  skills[q.skill] = (skills[q.skill] || 0) + 1;
});

console.log(`\nOutput: ${output.length} math questions`);
console.log(`Domains:`, domains);
console.log(`Skills (${Object.keys(skills).length} unique):`, skills);
console.log(`Desmos-solvable: ${output.filter(q => q.desmos_solvable).length}`);
console.log(`IDs replaced: ${Object.values(idCounters).reduce((a, b) => a + b, 0)}`);

// ── Write ──
const outPath = join(ROOT, 'data', 'math-questions.json');
writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(`\nWritten to ${outPath}`);
