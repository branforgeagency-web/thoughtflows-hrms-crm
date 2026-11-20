// Checks that the Aspose.Slides Cloud keys in server/.env work (signs in only —
// does not convert anything, so it uses none of the monthly API calls).
// Run from the server folder:  node scripts/test-aspose.js
import dotenv from 'dotenv';
dotenv.config();

const id = String(process.env.ASPOSE_CLIENT_ID || '').trim();
const secret = String(process.env.ASPOSE_CLIENT_SECRET || '').trim();
if (!id || !secret) {
  console.log('✗ ASPOSE_CLIENT_ID / ASPOSE_CLIENT_SECRET are missing in server/.env');
  process.exit(1);
}
const base = String(process.env.ASPOSE_API_BASE || 'https://api.aspose.cloud').replace(/\/+$/, '');
try {
  const r = await fetch(`${base}/connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret })
  });
  const text = await r.text();
  if (r.ok) {
    console.log('✓ Aspose keys work — animated slide conversion is ready.');
  } else {
    console.log(`✗ Aspose refused the keys (HTTP ${r.status}): ${text.slice(0, 300)}`);
    console.log('  Re-copy the Client ID and Client Secret from dashboard.aspose.cloud → Applications.');
    process.exit(1);
  }
} catch (e) {
  console.log('✗ Could not reach Aspose:', e.cause?.code || e.message, '— check the internet connection.');
  process.exit(1);
}
