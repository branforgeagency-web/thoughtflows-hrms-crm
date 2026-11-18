import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './services/amplifyStorage';
import './index.css';

// After a new deploy, a tab still running the old build asks for script files
// that no longer exist (404 → "Failed to fetch dynamically imported module").
// Reload once to pick up the new build instead of showing a blank screen.
// (A 20-second guard stops a reload loop if the files are really missing.)
const RELOAD_KEY = 'tf_chunk_reload_at';
const reloadForNewBuild = () => {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 20000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch (_) {}
  window.location.reload();
  return true;
};
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewBuild()) event.preventDefault();
});
window.addEventListener('unhandledrejection', (event) => {
  if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(String(event?.reason?.message || event?.reason || ''))) {
    reloadForNewBuild();
  }
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
