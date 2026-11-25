import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Trophy, Crown, X, MapPin, Target, GraduationCap, Sparkles, Camera, Trash2, RefreshCw } from 'lucide-react';
import { getHrToppers, setStaffPhoto, onDataUpdate } from '../services/api';

// 🏆 Daily "Topper of the Day" popup — shown on every HR dashboard after login.
//  Photo: the topper (or Admin / HR heads / Branch Head) can add, change or remove it here.
//  • Before today's first admission: yesterday's final topper ("Yesterday's Topper").
//  • Once admissions start: today's leader.
// Pops up every time an HR dashboard is opened / refreshed / logged into, again whenever
// someone new takes the lead, and anytime from the floating 🏆 button (bottom-right).

const POLL_MS = 90000;
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const norm = (s = '') => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const prettyDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' }) : '');

// Square, face-friendly crop (slightly above centre on portrait photos), small JPEG
const resizeImage = (file, size = 360) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const s = Math.min(img.width, img.height);
    const sx = (img.width - s) / 2;
    const sy = img.height > img.width ? (img.height - s) * 0.2 : (img.height - s) / 2;
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, size, size);
    ctx.drawImage(img, sx, sy, s, s, 0, 0, size, size);
    URL.revokeObjectURL(url);
    resolve(c.toDataURL('image/jpeg', 0.85));
  };
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read this image — please use a JPG or PNG photo.')); };
  img.src = url;
});

const CONFETTI_COLORS = ['#fde047', '#f59e0b', '#fb923c', '#34d399', '#38bdf8', '#f472b6', '#ffffff'];

export default function HrTopperPopup({ currentUser, active = true }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null); // { kind: 'today' | 'yesterday', person, key }
  const shownKeys = useRef(new Set()); // toppers already auto-shown since this dashboard was opened
  const [busy, setBusy] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    try { setData(await getHrToppers()); } catch { /* popup is optional — stay quiet */ }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    load();
    const t = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    const off = onDataUpdate((entity) => { if (!entity || /student|admission/i.test(String(entity))) load(); });
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); off(); };
  }, [active, load]);

  const currentPick = useCallback((d) => {
    if (!d) return null;
    const pick = d.day
      ? { kind: 'today', person: d.day, dateKey: d.date }
      : d.yesterday ? { kind: 'yesterday', person: d.yesterday, dateKey: d.yesterdayDate } : null;
    return pick ? { ...pick, key: `${pick.kind}:${pick.dateKey}:${norm(pick.person.name)}` } : null;
  }, []);

  // Auto pop-up: on opening the dashboard, and again when a new topper takes the lead
  useEffect(() => {
    if (!active || !data || open) return undefined;
    const pick = currentPick(data);
    if (!pick || shownKeys.current.has(pick.key)) return undefined;
    const t = setTimeout(() => { shownKeys.current.add(pick.key); setOpen(pick); }, 1200); // let the dashboard paint first
    return () => clearTimeout(t);
  }, [active, data, open, currentPick]);

  // Floating 🏆 button — open it anytime
  const openNow = async () => {
    let d = data;
    if (!d) { try { d = await getHrToppers(); setData(d); } catch { return; } }
    const pick = currentPick(d);
    if (pick) { shownKeys.current.add(pick.key); setOpen(pick); } else setOpen({ kind: 'none', key: 'none', person: null });
  };

  useEffect(() => {
    if (!open || !data) return;
    const fresh = open.kind === 'today' ? data.day : open.kind === 'yesterday' ? data.yesterday : null;
    if (fresh && norm(fresh.name) === norm(open.person.name) && fresh.photo !== open.person.photo) setOpen((o) => (o ? { ...o, person: fresh } : o));
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = () => setOpen(null);
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  const confetti = useMemo(() => Array.from({ length: 70 }, (_, i) => ({
    left: Math.random() * 100,
    delay: Math.random() * 2.5,
    dur: 3 + Math.random() * 3,
    size: 6 + Math.random() * 7,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    rot: Math.random() * 360,
    round: i % 3 === 0
  })), [open?.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const fab = active && !open && (
    <button type="button" onClick={openNow} title="Topper of the Day"
      className="fixed bottom-[76px] right-5 z-[70] w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 text-amber-950 shadow-xl shadow-amber-500/40 border-2 border-white flex items-center justify-center hover:scale-110 transition cursor-pointer">
      <Trophy className="w-6 h-6" fill="currentColor" fillOpacity={0.3} />
      {data?.day && <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center border-2 border-white">{data.day.admissions}</span>}
    </button>
  );
  if (!open) return fab || null;
  if (!open.person) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={close}>
        <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-sm rounded-[28px] text-white text-center px-6 py-8 bg-[radial-gradient(ellipse_at_top,_#f59e0b_0%,_#c2410c_45%,_#5b1d0b_100%)] shadow-2xl">
          <button onClick={close} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/25 hover:bg-black/40 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>
          <div className="w-20 h-20 mx-auto rounded-full border-2 border-dashed border-white/50 flex items-center justify-center"><Trophy className="w-9 h-9 text-white/70" /></div>
          <div className="mt-4 text-xl font-black">No Topper of the Day yet</div>
          <div className="text-sm text-amber-100/90 mt-1">No admissions yet today — the first admission takes the trophy! 🏆</div>
          <button onClick={close} className="mt-5 w-full py-3 rounded-2xl bg-white text-[#7c2d12] font-black text-sm cursor-pointer">Let's go!</button>
        </div>
      </div>
    );
  }
  const p = open.person;
  const isMe = norm(p.name) === norm(currentUser?.name || data?.me?.name || '');
  const canEdit = isMe || Boolean(data?.canSetPhotos);
  const forName = isMe ? undefined : p.name;
  const savePhoto = async (photo) => {
    setBusy(true); setPhotoErr('');
    try { await setStaffPhoto(photo, forName); await load(); }
    catch (err) { setPhotoErr(err?.response?.data?.error || err.message || 'Could not save the photo'); }
    finally { setBusy(false); }
  };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setPhotoErr('Please choose a photo (JPG or PNG).'); return; }
    try { await savePhoto(await resizeImage(file)); } catch (err) { setPhotoErr(err.message); }
  };
  const removePhoto = () => {
    if (window.confirm(isMe ? 'Remove your photo?' : `Remove ${p.name}'s photo?`)) savePhoto('');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm" onClick={close} role="dialog" aria-modal="true" aria-label="Topper of the Day">
      <style>{`
        @keyframes tfConfettiFall { 0% { transform: translateY(-10vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(110vh) rotate(720deg); opacity: 0.9; } }
        @keyframes tfPopIn { 0% { transform: scale(.7) translateY(30px); opacity: 0; } 60% { transform: scale(1.04); opacity: 1; } 100% { transform: scale(1) translateY(0); } }
        @keyframes tfShine { 0% { transform: translateX(-120%) rotate(20deg); } 100% { transform: translateX(220%) rotate(20deg); } }
        @keyframes tfFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
      `}</style>

      {/* confetti */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        {confetti.map((c, i) => (
          <span key={i} className="absolute top-0 block" style={{
            left: `${c.left}%`, width: c.size, height: c.round ? c.size : c.size * 0.45, background: c.color,
            borderRadius: c.round ? '50%' : 2, transform: `rotate(${c.rot}deg)`,
            animation: `tfConfettiFall ${c.dur}s linear ${c.delay}s infinite`
          }} />
        ))}
      </div>

      <div onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md overflow-hidden rounded-[28px] text-white shadow-2xl shadow-black/50 bg-[radial-gradient(ellipse_at_top,_#f59e0b_0%,_#c2410c_40%,_#5b1d0b_100%)]"
        style={{ animation: 'tfPopIn .6s cubic-bezier(.2,.9,.3,1.2) both' }}>
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[420px] h-[300px] rounded-full bg-yellow-200/30 blur-3xl" />
        <div className="pointer-events-none absolute inset-y-0 w-16 bg-white/20 blur-md" style={{ animation: 'tfShine 2.8s ease-in-out 0.6s infinite' }} />
        <button onClick={close} className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-black/25 hover:bg-black/40 cursor-pointer" aria-label="Close"><X className="w-4 h-4" /></button>

        <div className="relative px-6 pt-7 pb-6 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/25 border border-white/20 text-[11px] font-black uppercase tracking-[0.22em] text-yellow-100">
            <Sparkles className="w-3.5 h-3.5" />{open.kind === 'today' ? 'Topper of the Day' : "Yesterday's Topper"}
          </div>
          <div className="text-[12px] text-amber-100/90 mt-1.5">{prettyDate(open.dateKey)} · All branches</div>

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          {/* photo */}
          <div className="relative mx-auto mt-9 w-40" style={{ animation: 'tfFloat 3s ease-in-out infinite' }}>
            <Crown className="absolute -top-9 left-1/2 -translate-x-1/2 w-12 h-12 text-yellow-300 drop-shadow-[0_0_14px_rgba(253,224,71,0.95)] z-10" fill="currentColor" />
            <div className="rounded-full p-[5px] bg-gradient-to-br from-yellow-100 via-amber-300 to-orange-500 shadow-[0_0_50px_rgba(251,191,36,0.75)]">
              <div className="w-[150px] h-[150px] rounded-full overflow-hidden border-4 border-black/20 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-5xl font-black text-white/90">{initials(p.name)}</span>}
              </div>
            </div>
            <div className="absolute -bottom-2 -right-1 w-14 h-14 rounded-full bg-gradient-to-br from-yellow-200 to-amber-500 border-4 border-[#7c2d12] flex items-center justify-center shadow-xl">
              <Trophy className="w-7 h-7 text-amber-900" fill="currentColor" fillOpacity={0.35} />
            </div>
            {canEdit && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} title={p.photo ? 'Change photo' : 'Add photo'}
                className="absolute -bottom-2 -left-1 w-10 h-10 rounded-full bg-white text-slate-800 shadow-xl flex items-center justify-center hover:scale-105 transition cursor-pointer disabled:opacity-60">
                {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
            )}
            {canEdit && p.photo && !busy && (
              <button type="button" onClick={removePhoto} title="Remove photo"
                className="absolute top-1 -left-2 w-9 h-9 rounded-full bg-rose-600 text-white shadow-xl flex items-center justify-center hover:bg-rose-700 hover:scale-105 transition cursor-pointer">
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          {photoErr && <div className="mt-4 text-[12px] font-bold text-rose-100 bg-rose-900/50 rounded-lg px-2 py-1">{photoErr}</div>}

          <div className="mt-6 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-100/80">Congratulations</div>
          <div className="text-3xl font-black leading-tight mt-0.5 drop-shadow">{p.name}</div>
          <div className="mt-2 inline-flex items-center gap-1 px-3 py-0.5 rounded-full bg-white/15 border border-white/25 text-[13px] font-bold"><MapPin className="w-3.5 h-3.5" />{p.branch || 'Branch not set'}</div>
          {isMe && <div className="mt-2 text-sm font-black text-yellow-200">That's you — fantastic work! 🎉</div>}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-black/25 border border-white/15 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-100/80 flex items-center justify-center gap-1"><GraduationCap className="w-3 h-3" />Admissions</div>
              <div className="text-3xl font-black leading-tight text-yellow-100">{p.admissions}</div>
            </div>
            <div className="rounded-2xl bg-black/25 border border-white/15 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-amber-100/80 flex items-center justify-center gap-1"><Target className="w-3 h-3" />Day target</div>
              <div className="text-3xl font-black leading-tight">{p.target ?? '—'}</div>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-yellow-200/40 to-amber-400/30 border border-yellow-200/50 py-2.5">
              <div className="text-[9px] font-bold uppercase tracking-wider text-yellow-50">Achieved</div>
              <div className="text-3xl font-black leading-tight text-white">{p.percent != null ? `${p.percent}%` : '—'}</div>
            </div>
          </div>

          {p.tiedWith?.length > 0 && <div className="mt-2 text-[11px] text-amber-100/90">Joint topper with {p.tiedWith.slice(0, 3).join(', ')}</div>}

          {p.runnersUp?.length > 0 && (
            <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px]">
              {p.runnersUp.map((r, i) => (
                <span key={r.name} className="px-2.5 py-1 rounded-full bg-black/20 border border-white/15">
                  {i === 0 ? '🥈' : '🥉'} <b>{r.name}</b> · {r.percent != null ? `${r.percent}%` : `${r.admissions} adm.`}
                </span>
              ))}
            </div>
          )}


          <button onClick={close} className="mt-5 w-full py-3 rounded-2xl bg-white text-[#7c2d12] font-black text-sm hover:bg-amber-50 shadow-lg cursor-pointer">
            {isMe ? 'Thank you! 🙌' : '👏 Congratulate & continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
