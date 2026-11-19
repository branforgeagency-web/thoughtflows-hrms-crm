import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LiveKitRoom, VideoConference, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import '@livekit/components-styles';

// The actual video call (LiveKit prefab conference: video grid, screen share,
// chat, mic/camera/leave controls) plus Wise-style "raise hand". Loaded lazily
// by LiveClassroom.jsx so the video libraries are only downloaded when someone
// opens a class.
export default function LiveClassroomCall({ serverUrl, token, isHost, canRaiseHand, onDisconnected, onError }) {
  const studentHand = canRaiseHand ?? !isHost;
  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      connect
      // Trainer comes in with camera + mic on; students join muted and can turn them on
      video={Boolean(isHost)}
      audio={Boolean(isHost)}
      data-lk-theme="default"
      style={{ height: '100%', width: '100%', position: 'relative' }}
      onDisconnected={onDisconnected}
      onError={onError}
    >
      <VideoConference />
      {(isHost || studentHand) && <HandRaise isHost={Boolean(isHost)} canRaise={studentHand} />}
    </LiveKitRoom>
  );
}

// ---------------------------------------------------------------------------
// Raise hand — sent as small data messages on the room (topic "tf-hand").
//   student → everyone: { type: 'hand', up: true|false }
//   trainer → one / all: { type: 'lower', identity? }
// A student re-announces a raised hand when someone joins, so a trainer who
// (re)joins late still sees the queue.
// ---------------------------------------------------------------------------
const TOPIC = 'tf-hand';
const enc = new TextEncoder();
const dec = new TextDecoder();

function HandRaise({ isHost, canRaise }) {
  const room = useRoomContext();
  const [myHand, setMyHand] = useState(false);
  const [hands, setHands] = useState({}); // identity -> { name, at }
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const myHandRef = useRef(false);
  myHandRef.current = myHand;

  const send = useCallback((msg, to) => {
    try {
      const p = room?.localParticipant?.publishData(enc.encode(JSON.stringify(msg)), {
        reliable: true, topic: TOPIC, ...(to ? { destinationIdentities: [to] } : {})
      });
      if (p && typeof p.catch === 'function') p.catch(() => {});
    } catch (_) { /* not connected yet */ }
  }, [room]);

  useEffect(() => {
    if (!room) return undefined;
    const onData = (payload, participant, _kind, topic) => {
      if (topic !== TOPIC) return;
      let msg;
      try { msg = JSON.parse(dec.decode(payload)); } catch (_) { return; }
      if (msg?.type === 'hand' && participant) {
        setHands((h) => {
          const n = { ...h };
          if (msg.up) n[participant.identity] = { name: participant.name || participant.identity, at: h[participant.identity]?.at || Date.now() };
          else delete n[participant.identity];
          return n;
        });
        if (msg.up) { setPulse(true); setTimeout(() => setPulse(false), 2500); }
      } else if (msg?.type === 'lower') {
        if (!msg.identity || msg.identity === room.localParticipant?.identity) setMyHand(false);
        setHands((h) => { if (!msg.identity) return {}; const n = { ...h }; delete n[msg.identity]; return n; });
      }
    };
    const onJoin = (p) => { if (myHandRef.current) send({ type: 'hand', up: true }, p?.identity); };
    const onLeave = (p) => setHands((h) => { if (!p || !h[p.identity]) return h; const n = { ...h }; delete n[p.identity]; return n; });
    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.ParticipantConnected, onJoin);
    room.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.ParticipantConnected, onJoin);
      room.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [room, send]);

  const toggleMine = () => { const up = !myHand; setMyHand(up); send({ type: 'hand', up }); };
  const lowerOne = (identity) => { send({ type: 'lower', identity }); setHands((h) => { const n = { ...h }; delete n[identity]; return n; }); };
  const lowerAll = () => { send({ type: 'lower' }); setHands({}); };
  const queue = Object.entries(hands).sort((a, b) => a[1].at - b[1].at);

  const box = { position: 'absolute', top: 12, right: 12, zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 };
  const btn = (bg) => ({ background: bg, color: '#fff', border: 'none', borderRadius: 12, padding: '8px 14px', fontWeight: 700, fontSize: 13, cursor: 'pointer', boxShadow: '0 4px 14px rgba(0,0,0,.35)' });

  if (!isHost) {
    if (!canRaise) return null;
    return (
      <div style={box}>
        <button type="button" onClick={toggleMine} style={btn(myHand ? '#f59e0b' : 'rgba(15,33,45,.85)')} title={myHand ? 'Lower your hand' : 'Raise your hand to ask a question'}>
          ✋ {myHand ? 'Lower hand' : 'Raise hand'}
        </button>
      </div>
    );
  }

  return (
    <div style={box}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ ...btn(queue.length ? '#f59e0b' : 'rgba(15,33,45,.85)'), transform: pulse ? 'scale(1.08)' : 'none', transition: 'transform .2s' }}>
        ✋ {queue.length ? `${queue.length} hand${queue.length > 1 ? 's' : ''} raised` : 'No hands'}
      </button>
      {open && (
        <div style={{ background: 'rgba(7,21,28,.96)', color: '#fff', borderRadius: 14, padding: 10, minWidth: 220, maxHeight: 280, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
          {queue.length === 0 ? <div style={{ fontSize: 12, opacity: 0.7 }}>No raised hands</div> : (
            <>
              {queue.map(([id, h], i) => (
                <div key={id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '6px 4px', fontSize: 13 }}>
                  <span>{i + 1}. {h.name}</span>
                  <button type="button" onClick={() => lowerOne(id)} style={{ ...btn('#334155'), padding: '4px 10px', fontSize: 11 }}>Lower</button>
                </div>
              ))}
              <button type="button" onClick={lowerAll} style={{ ...btn('#e11d48'), width: '100%', marginTop: 6, padding: '6px 10px', fontSize: 12 }}>Lower all</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
