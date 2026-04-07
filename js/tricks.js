// js/tricks.js — Desmos strategy library

import { $, renderMath } from './utils.js';
import { openDesmosWithExpression } from './desmos.js';
import { navigate } from './router.js';

const STRATEGIES = [
  {
    id: 'graph-intersect',
    name: 'Graph & Intersect',
    when: 'Systems of equations, "find the value of x that satisfies both"',
    speed: 'high',
    syntax: 'y = 2x + 3\\ny = -x + 9',
    example: 'Graph both equations. The intersection point gives (x, y) directly.',
    tip: 'Look for the point where lines or curves cross. Click it for exact coordinates.',
    mistakes: ['Reading the wrong intersection when curves cross twice', 'Entering "=" instead of "y=" (Desmos needs explicit y)'],
  },
  {
    id: 'graph-zeros',
    name: 'Graph & Find Zeros',
    when: 'Single-variable equations like x² - 5x + 6 = 0, "what is the value of x"',
    speed: 'high',
    syntax: 'y = x^2 - 5x + 6',
    example: 'Graph the expression. X-intercepts are the solutions (where y = 0).',
    tip: 'Click each x-intercept to see the exact value. Works for any degree polynomial.',
    mistakes: ['Forgetting to rearrange to "= 0" form first', 'Missing a zero that\'s off-screen — zoom out'],
  },
  {
    id: 'table-check',
    name: 'Table & Plug-In',
    when: '"Which of the following is equivalent to..." or checking answer choices',
    speed: 'medium',
    syntax: 'f(x) = x^2 + 2x + 1\\ng(x) = (x+1)^2',
    example: 'Enter both expressions. Open the table. If all values match, they\'re equivalent.',
    tip: 'Use this to verify equivalence without algebraic manipulation. Fast for checking 4 answer choices.',
    mistakes: ['Only checking one x value — check at least 3-4', 'Forgetting that expressions can agree at a few points but differ elsewhere'],
  },
  {
    id: 'regression',
    name: 'Regression with Data',
    when: 'Scatterplot questions, line/curve of best fit, data interpretation',
    speed: 'medium',
    syntax: 'L = [(1,2),(2,5),(3,10),(4,17)]\\ny_1 ~ ax_1^2 + bx_1 + c',
    example: 'Enter data as a list of points. Use ~ (tilde) for regression. Desmos fits the curve.',
    tip: 'Use the ~ operator, not =. Desmos will show you the best-fit equation with parameter values.',
    mistakes: ['Using = instead of ~ for regression', 'Wrong regression type (linear vs quadratic)'],
  },
  {
    id: 'slider-explore',
    name: 'Slider Exploration',
    when: '"For what value of k does the equation have no solution" or parameter questions',
    speed: 'medium',
    syntax: 'y = kx^2 + 3x - 1',
    example: 'Desmos auto-creates a slider for k. Drag it to see how the graph changes.',
    tip: 'When asked about conditions (tangent, no solution, one solution), watch how the graph behaves as you adjust k.',
    mistakes: ['Not setting slider range wide enough', 'Confusing the parameter with the variable'],
  },
  {
    id: 'inequality-shade',
    name: 'Inequality Shading',
    when: 'Systems of inequalities, "which region satisfies both"',
    speed: 'high',
    syntax: 'y > 2x - 1\\ny < -x + 5',
    example: 'Enter inequalities. Desmos shades valid regions. The overlap is your answer.',
    tip: 'The darkest region (overlap of both shadings) is the solution set.',
    mistakes: ['Mixing up < and > direction', 'Not checking if boundary is included (solid vs dashed line)'],
  },
  {
    id: 'direct-compute',
    name: 'Direct Calculation',
    when: 'Complex arithmetic, evaluating expressions at specific values',
    speed: 'low',
    syntax: '(3.7^2 + \\sqrt{144}) / 2.5',
    example: 'Type the expression directly. Desmos evaluates it instantly.',
    tip: 'Faster than a basic calculator for nested operations. Use \\sqrt{}, fractions, and exponents.',
    mistakes: ['Order of operations errors — use parentheses explicitly', 'Forgetting that Desmos uses natural log as ln, not log'],
  },
  {
    id: 'vertex-form',
    name: 'Vertex & Extrema',
    when: '"Maximum/minimum value", "vertex of the parabola"',
    speed: 'high',
    syntax: 'y = -2(x-3)^2 + 7',
    example: 'Graph the quadratic. Click the vertex point to read exact coordinates.',
    tip: 'The vertex gives you both the x-value and the max/min y-value in one click.',
    mistakes: ['Confusing max vs min (depends on sign of leading coefficient)', 'Not clicking the actual vertex point — zoom in for precision'],
  },
];

const SPEED_ICONS = { high: '⚡⚡⚡', medium: '⚡⚡', low: '⚡' };

export function renderTricks(container) {
  let activeFilter = 'all';

  function render() {
    const filtered = activeFilter === 'all' ? STRATEGIES : STRATEGIES.filter(s => s.id === activeFilter);

    container.innerHTML = `
      <div class="tricks-page">
        <div class="tricks-header">
          <h2 class="tricks-title">Desmos Strategy Library</h2>
          <p class="tricks-sub">Learn when and how to use Desmos as a strategic shortcut on SAT Math.</p>
        </div>
        <div class="filter-pills" id="trick-filters">
          <button class="filter-pill ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All Strategies</button>
          ${STRATEGIES.map(s => `<button class="filter-pill ${activeFilter === s.id ? 'active' : ''}" data-filter="${s.id}">${s.name}</button>`).join('')}
        </div>
        <div class="tricks-grid" id="tricks-grid"></div>
      </div>
    `;

    const grid = $('tricks-grid');
    filtered.forEach(s => {
      const card = document.createElement('div');
      card.className = 'trick-card';
      card.innerHTML = `
        <div class="trick-card-header">
          <h3 class="trick-name">${s.name}</h3>
          <span class="trick-speed" title="Speed advantage: ${s.speed}">${SPEED_ICONS[s.speed]} ${s.speed}</span>
        </div>
        <div class="trick-when"><strong>When:</strong> ${s.when}</div>
        <div class="trick-syntax">
          <div class="trick-syntax-label">Desmos Input</div>
          <code class="trick-syntax-code">${s.syntax.replace(/\\n/g, '\n')}</code>
        </div>
        <div class="trick-example">${s.example}</div>
        <div class="trick-tip"><strong>Tip:</strong> ${s.tip}</div>
        ${s.mistakes.length ? `
          <div class="trick-mistakes">
            <strong>Common Mistakes:</strong>
            <ul>${s.mistakes.map(m => `<li>${m}</li>`).join('')}</ul>
          </div>` : ''}
        <div class="trick-actions">
          <button class="btn btn-primary btn-sm try-desmos-btn" data-syntax="${s.syntax.split('\\n')[0]}">Try in Desmos</button>
          <button class="btn btn-secondary btn-sm see-questions-btn" data-method="${s.id}">See Questions →</button>
        </div>
      `;
      grid.appendChild(card);
    });

    // Bind filter pills
    $('trick-filters')?.addEventListener('click', e => {
      const pill = e.target.closest('.filter-pill');
      if (!pill) return;
      activeFilter = pill.dataset.filter;
      render();
    });

    // Bind try-in-desmos buttons
    grid.querySelectorAll('.try-desmos-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        openDesmosWithExpression(btn.dataset.syntax);
      });
    });

    // Bind see-questions buttons
    grid.querySelectorAll('.see-questions-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        navigate('/bank');
        // The bank will show all desmos questions — TODO: deep link with method filter
      });
    });

    renderMath(container);
  }

  render();
}
