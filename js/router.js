// js/router.js — Minimal hash-based SPA router

const routes = {};
let appEl = null;
let currentPath = null;

export function route(path, handler) {
  routes[path] = handler;
}

export function navigate(path) {
  window.location.hash = '#' + path;
}

export function currentRoute() {
  return currentPath;
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || '/dashboard';
  const path = hash.split('?')[0];  // strip query params
  const handler = routes[path];
  if (!appEl) appEl = document.getElementById('app');
  if (!appEl) return;

  if (handler) {
    currentPath = path;
    // Update nav active state
    document.querySelectorAll('.nav-link').forEach(a => {
      a.classList.toggle('active', a.getAttribute('href') === '#' + path);
    });
    handler(appEl);
  } else {
    // Fallback to dashboard
    navigate('/dashboard');
  }
}

export function startRouter() {
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
