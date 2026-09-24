import crypto from 'crypto';

function base64Url(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { meetingNumber, role = 0 } = body;

  if (!meetingNumber) {
    return res.status(400).json({ error: 'meetingNumber is required' });
  }

  const ZOOM_SDK_KEY = process.env.ZOOM_SDK_KEY;
  const ZOOM_SDK_SECRET = process.env.ZOOM_SDK_SECRET;

  if (!ZOOM_SDK_KEY || !ZOOM_SDK_SECRET) {
    return res.status(503).json({
      error: 'ZOOM_SDK_KEY and ZOOM_SDK_SECRET must be configured in Vercel Environment Variables to generate live Meeting SDK signatures.',
      configured: false,
      meetingNumber
    });
  }

  try {
    const iat = Math.floor(Date.now() / 1000) - 30;
    const exp = iat + 60 * 60 * 2;
    const header = JSON.stringify({ alg: 'HS256', typ: 'JWT' });
    const payload = JSON.stringify({
      appKey: ZOOM_SDK_KEY,
      sdkKey: ZOOM_SDK_KEY,
      mn: String(meetingNumber).replace(/\s/g, ''),
      role,
      iat,
      exp,
      tokenExp: exp
    });

    const encodedHeader = base64Url(header);
    const encodedPayload = base64Url(payload);
    const signature = crypto
      .createHmac('sha256', ZOOM_SDK_SECRET)
      .update(`${encodedHeader}.${encodedPayload}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');

    const token = `${encodedHeader}.${encodedPayload}.${signature}`;

    return res.status(200).json({
      signature: token,
      sdkKey: ZOOM_SDK_KEY
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Signature creation failed' });
  }
}
