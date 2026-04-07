// js/desmos.js — Desmos side panel management

import { $ } from './utils.js';

let desmosCalc = null;
let desmosSide = 'right';

export function initDesmos() {
  const panel = $('desmos-side-panel');
  const container = $('desmos-container');
  const openBtn = $('btn-desmos');
  const closeBtn = $('desmos-close');
  const dockBtn = $('desmos-dock');

  if (!panel || !openBtn) return;

  function open() {
    panel.classList.add('open');
    document.body.classList.add('desmos-open', 'desmos-' + desmosSide);
    openBtn.classList.add('active');
    if (!desmosCalc && typeof Desmos !== 'undefined') {
      desmosCalc = Desmos.GraphingCalculator(container, {
        expressions: true, keypad: true, settingsMenu: true,
        zoomButtons: true, pointsOfInterest: true, trace: true,
        border: false, expressionsTopbar: true,
      });
    }
    if (desmosCalc) desmosCalc.resize();
  }

  function close() {
    panel.classList.remove('open');
    document.body.classList.remove('desmos-open', 'desmos-left', 'desmos-right');
    openBtn.classList.remove('active');
  }

  function toggleDock() {
    document.body.classList.remove('desmos-' + desmosSide);
    desmosSide = desmosSide === 'right' ? 'left' : 'right';
    document.body.classList.add('desmos-' + desmosSide);
    dockBtn.title = `Move to ${desmosSide === 'right' ? 'left' : 'right'}`;
    if (desmosCalc) desmosCalc.resize();
  }

  openBtn.addEventListener('click', () => {
    panel.classList.contains('open') ? close() : open();
  });
  closeBtn?.addEventListener('click', close);
  dockBtn?.addEventListener('click', toggleDock);
}

/** Pre-load an expression into Desmos and open the panel */
export function openDesmosWithExpression(expr) {
  const panel = $('desmos-side-panel');
  const openBtn = $('btn-desmos');
  if (!panel) return;

  // Open if not already open
  if (!panel.classList.contains('open')) {
    openBtn?.click();
  }

  // Set expression after a tick (let Desmos init)
  setTimeout(() => {
    if (desmosCalc) {
      desmosCalc.setBlank();
      desmosCalc.setExpression({ id: 'trick', latex: expr });
    }
  }, 300);
}
