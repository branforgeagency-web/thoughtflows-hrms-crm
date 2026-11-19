import jwt from 'jsonwebtoken';

// ThoughtFlows Live Classroom — LiveKit video layer (replaces Zoom for classes).
// Access tokens are plain HS256 JWTs in LiveKit's format, signed with the
// project's API secret, so no extra server package is needed.
//
// .env:
//   LIVEKIT_URL=wss://<your-project>.livekit.cloud
//   LIVEKIT_API_KEY=...
//   LIVEKIT_API_SECRET=...

const cfg = () => ({
  url: String(process.env.LIVEKIT_URL || '').trim(),
  key: String(process.env.LIVEKIT_API_KEY || '').trim(),
  secret: String(process.env.LIVEKIT_API_SECRET || '').trim()
});

export const livekitConfigured = () => {
  const c = cfg();
  return Boolean(c.url && c.key && c.secret);
};

export const livekitUrl = () => cfg().url;

export const classRoomName = (sess) => `tf-class-${sess._id}`;

export const LIVEKIT_NOT_CONFIGURED =
  'The live classroom is not set up yet. Add LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET to the server environment.';

// Join token for one person in one room.
//   host=true  → trainer: room admin (can mute / remove others)
//   host=false → student: can talk, share camera/screen when allowed, chat
export function livekitToken({ room, identity, name = '', host = false, metadata = {}, ttlSeconds = 6 * 3600 }) {
  const c = cfg();
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    {
      iss: c.key,
      sub: identity,
      jti: `${identity}-${now}`,
      nbf: now - 10,
      exp: now + ttlSeconds,
      name,
      metadata: JSON.stringify({ ...metadata, role: host ? 'trainer' : 'student' }),
      video: {
        room,
        roomJoin: true,
        roomAdmin: Boolean(host),
        canPublish: true,
        canSubscribe: true,
        canPublishData: true,
        canUpdateOwnMetadata: true
      }
    },
    c.secret,
    { algorithm: 'HS256' }
  );
}

// Server-side admin token (RoomService API)
function adminToken() {
  const c = cfg();
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign(
    { iss: c.key, sub: 'thoughtflows-server', nbf: now - 10, exp: now + 300, video: { roomCreate: true, roomList: true, roomAdmin: true } },
    c.secret,
    { algorithm: 'HS256' }
  );
}

async function roomService(method, body) {
  if (!livekitConfigured()) return null;
  const base = livekitUrl().replace(/^ws(s?):\/\//i, 'http$1://').replace(/\/+$/, '');
  const res = await fetch(`${base}/twirp/livekit.RoomService/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken()}` },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

// Closes the room for everyone (End Class). Never throws — ending the class in
// our DB must not fail because LiveKit is unreachable.
export async function endLivekitRoom(room) {
  if (!room) return;
  try { await roomService('DeleteRoom', { room }); } catch (e) { console.warn('LiveKit DeleteRoom:', e.message); }
}

// Trainer removes a participant from the room
export async function removeLivekitParticipant(room, identity) {
  return roomService('RemoveParticipant', { room, identity });
}
