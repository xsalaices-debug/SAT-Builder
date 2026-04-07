// js/main.js — Entry point, wires all modules together

import { route, startRouter } from './router.js';
import { renderDashboard } from './dashboard.js';
import { renderBank } from './bank.js';
import { renderPractice } from './practice.js';
import { renderTricks } from './tricks.js';
import { initTheme } from './theme.js';
import { initDesmos } from './desmos.js';

// Register routes
route('/dashboard', renderDashboard);
route('/bank', renderBank);
route('/practice', renderPractice);
route('/tricks', renderTricks);

// Initialize global features
initTheme();
initDesmos();

// Start routing
startRouter();
