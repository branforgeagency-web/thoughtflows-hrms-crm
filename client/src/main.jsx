import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import DemoJoinPage from './components/DemoJoinPage.jsx';
import PublicBookingPage from './components/PublicBookingPage.jsx';
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

// No-login demo class link: /join/demo/<code> (candidates on phone or lab PC)
const demoJoinCode = (window.location.pathname.match(/^\/join\/demo\/([A-Za-z0-9]{6,32})\/?$/) || [])[1];
// 1:1 session link /join/session/<code> and Consultations booking page /book/<code>
const sessionJoinCode = (window.location.pathname.match(/^\/join\/session\/([A-Za-z0-9]{6,32})\/?$/) || [])[1];
const bookingSlug = (window.location.pathname.match(/^\/book\/([A-Za-z0-9]{6,32})\/?$/) || [])[1];

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {demoJoinCode ? <DemoJoinPage code={demoJoinCode} />
      : sessionJoinCode ? <DemoJoinPage code={sessionJoinCode} kind="session" />
        : bookingSlug ? <PublicBookingPage slug={bookingSlug} />
          : <App />}
  </React.StrictMode>,
);
