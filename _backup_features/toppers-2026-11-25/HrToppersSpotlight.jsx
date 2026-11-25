import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, Crown, Camera, Trash2, MapPin, Target, GraduationCap, Sparkles, RefreshCw, CalendarDays, Users } from 'lucide-react';
import { getHrToppers, setStaffPhoto, onDataUpdate } from '../services/api';

// 🏆 Topper of the Day + 🏆 Topper of the Month (till date) — top of every HR dashboard.
// Picked across all branches by admissions. Day resets at midnight (IST), month on the 1st.
// Refreshes every 60s, when the tab comes back into view, and instantly after an admission
// is saved in this browser (the server clears its cache on every student save).

const REFRESH_MS = 60000;
const norm = (s = '') => String(s).trim().toLowerCase().replace(/\s+/g, ' ');
const initials = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
const longDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '');
const monthRange = (m, d) => {
  if (!m || !d) return '';
  const name = new Date(`${m}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const day = Number(d.slice(8, 10));
  return day === 1 ? `1 ${name}` : `1 – ${day} ${name}`;
};
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' }) : '');

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

const THEMES = {
  day: {
    card: 'bg-[radial-gradient(ellipse_at_top_left,_#f59e0b_0%,_#c2410c_45%,_#7c2d12_100%)]',
    glow: 'bg-yellow-200/30',
    ring: 'from-yellow-100 via-amber-300 to-orange-500',
    badge: 'from-yellow-200 to-amber-400 text-amber-900',
    chip: 'bg-white/15 border-white/25 text-amber-50',
    sub: 'text-amber-100/90'
  },
  month: {
    card: 'bg-[radial-gradient(ellipse_at_top_right,_#14808f_0%,_#0b3a44_50%,_#061c23_100%)]',
    glow: 'bg-amber-300/20',
    ring: 'from-yellow-200 via-amber-400 to-amber-600',
    badge: 'from-yellow-200 to-amber-500 text-[#0b2b35]',
    chip: 'bg-white/10 border-white/20 text-teal-50',
    sub: 'text-teal-100/80'
  }
};

function Photo({ person, theme, canEdit, onEdit, onRemove, busy }) {
  const T = THEMES[theme];
  return (
    <div className="relative shrink-0">
      <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.9)] z-10" fill="currentColor" />
      <div className={`rounded-full p-[4px] bg-gradient-to-br ${T.ring} shadow-[0_0_35px_rgba(251,191,36,0.55)]`}>
        <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-black/20 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          {person.photo
            ? <img src={person.photo} alt={person.name} className="w-full h-full object-cover" />
            : <span className="text-4xl font-black text-white/90 tracking-wide">{initials(person.name)}</span>}
        </div>
      </div>
      <div className={`absolute -bottom-1 -right-1 w-11 h-11 rounded-full bg-gradient-to-br ${T.badge} border-4 border-black/20 flex items-center justify-center shadow-lg`}>
        <Trophy className="w-5 h-5" fill="currentColor" fillOpacity={0.35} />
      </div>
      {canEdit && (
        <button type="button" onClick={onEdit} disabled={busy}
          title={person.photo ? 'Change photo' : 'Add photo'}
          className="absolute -bottom-1 -left-1 w-9 h-9 rounded-full bg-white text-slate-800 shadow-lg flex items-center justify-center hover:scale-105 transition cursor-pointer disabled:opacity-60">
          {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
        </button>
      )}
      {canEdit && person.photo && !busy && (
        <button type="button" onClick={onRemove} title="Remove photo"
          className="absolute top-0 -left-1 w-8 h-8 rounded-full bg-rose-600 text-white shadow-lg flex items-center justify-center hover:bg-rose-700 hover:scale-105 transition cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

function Sparkle({ top, left, delay, size = 2 }) {
  return <span className="pointer-events-none absolute rounded-full bg-white animate-pulse" style={{ top: `${top}%`, left: `${left}%`, width: size, height: size, opacity: 0.5, animationDelay: `${delay}s` }} />;
}

function TopperCard({ kind, title, subtitle, person, isMe, canEdit, onEdit, onRemove, busy, children, empty }) {
  const T = THEMES[kind];
  return (
    <div className={`relative overflow-hidden rounded-3xl ${T.card} text-white p-5 sm:p-6 shadow-xl shadow-slate-900/20 min-h-[250px]`}>
      <div className={`pointer-events-none absolute -top-20 -right-16 w-72 h-72 rounded-full ${T.glow} blur-3xl`} />
      <Trophy className="pointer-events-none absolute -right-6 -bottom-8 w-44 h-44 text-white/[0.07]" />
      {[[10, 30, 0], [22, 62, 0.6], [70, 12, 1.2], [14, 85, 1.8], [80, 55, 0.9], [45, 92, 1.5]].map(([t, l, d], i) => <Sparkle key={i} top={t} left={l} delay={d} size={i % 2 ? 2 : 3} />)}

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${T.badge} flex items-center justify-center shadow-lg`}>
            <Trophy className="w-6 h-6" fill="currentColor" fillOpacity={0.3} />
          </div>
          <div>
            <div className="text-lg sm:text-xl font-black leading-tight">🏆 {title}</div>
            <div className={`text-[12px] font-semibold ${T.sub} flex items-center gap-1`}><CalendarDays className="w-3.5 h-3.5" />{subtitle}</div>
          </div>
        </div>
        {isMe && <span className="shrink-0 px-2.5 py-1 rounded-full bg-white text-[11px] font-black uppercase tracking-wide text-slate-900 shadow">That's you! 🎉</span>}
      </div>

      {/* Body */}
      {person ? (
        <div className="relative mt-7 flex flex-col sm:flex-row items-center sm:items-center gap-5 sm:gap-6">
          <Photo person={person} theme={kind} canEdit={canEdit} onEdit={onEdit} onRemove={onRemove} busy={busy} />
          <div className="flex-1 min-w-0 w-full text-center sm:text-left">
            <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${T.sub}`}>HR Name</div>
            <div className="text-2xl font-black leading-tight truncate">{person.name}</div>
            <div className={`mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[12px] font-bold ${T.chip}`}>
              <MapPin className="w-3.5 h-3.5" />{person.branch || 'Branch not set'}
            </div>
            <div className="mt-4">{children}</div>
            {person.tiedWith?.length > 0 && (
              <div className={`mt-2 text-[11px] ${T.sub}`}>Joint topper with {person.tiedWith.slice(0, 3).join(', ')}{person.tiedWith.length > 3 ? ` +${person.tiedWith.length - 3} more` : ''}</div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative mt-8 flex flex-col items-center text-center py-4">
          <div className="w-20 h-20 rounded-full border-2 border-dashed border-white/40 flex items-center justify-center"><Trophy className="w-9 h-9 text-white/50" /></div>
          <div className="mt-3 font-extrabold">{empty}</div>
          <div className={`text-sm ${T.sub}`}>The first admission takes the trophy!</div>
        </div>
      )}
    </div>
  );
}

export { resizeImage };

export default function HrToppersSpotlight({ currentUser }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyFor, setBusyFor] = useState(null); // name being uploaded ('' = me)
  const fileRef = useRef(null);
  const uploadFor = useRef('');

  const load = useCallback(async () => {
    try { setData(await getHrToppers()); setError(''); }
    catch (e) { setError(e?.response?.data?.error || e.message || 'Could not load the toppers'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (!document.hidden) load(); }, REFRESH_MS);
    const onVis = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange', onVis);
    const off = onDataUpdate((entity) => { if (!entity || /student|admission|target/i.test(String(entity))) load(); });
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); off(); };
  }, [load]);

  const myName = data?.me?.name || currentUser?.name || '';
  const isMe = (p) => Boolean(p && myName && norm(p.name) === norm(myName));
  const canEditFor = (p) => Boolean(p && (isMe(p) || data?.canSetPhotos));

  const pickPhoto = (forName) => { uploadFor.current = forName; fileRef.current?.click(); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setError('Please choose a photo (JPG or PNG).'); return; }
    const forName = uploadFor.current;
    setBusyFor(forName);
    try {
      const photo = await resizeImage(file);
      await setStaffPhoto(photo, forName && norm(forName) !== norm(myName) ? forName : undefined);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save the photo');
    } finally { setBusyFor(null); }
  };

  const removePhoto = async (forName) => {
    const self = !forName || norm(forName) === norm(myName);
    if (!window.confirm(self ? 'Remove your photo?' : `Remove ${forName}'s photo?`)) return;
    setBusyFor(self ? '' : forName);
    try {
      await setStaffPhoto('', self ? undefined : forName);
      await load();
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not remove the photo');
    } finally { setBusyFor(null); }
  };

  const day = data?.day;
  const mon = data?.monthTopper;
  const pct = mon?.percent ?? null;

  return (
    <section className="space-y-3 text-left">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 className="text-base sm:text-lg font-black text-slate-900">Top Performers · All Branches</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />Live
          </span>
          {data?.updatedAt && <span>Updated {clock(data.updatedAt)}</span>}
          <button onClick={load} className="p-1 rounded-lg hover:bg-slate-100 cursor-pointer" title="Refresh"><RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      {error && <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">{error}</div>}

      {loading && !data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[0, 1].map((i) => <div key={i} className="h-[250px] rounded-3xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TopperCard kind="day" title="Topper of the Day" subtitle={longDate(data?.date)}
            person={day} isMe={isMe(day)} canEdit={canEditFor(day)} busy={busyFor === day?.name || (busyFor === '' && isMe(day))}
            onEdit={() => pickPhoto(isMe(day) ? '' : day.name)} onRemove={() => removePhoto(day.name)} empty="No admissions yet today">
            {day && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-black/20 border border-white/15 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1"><Target className="w-3.5 h-3.5" />Today's Target</div>
                    <div className="text-3xl font-black leading-tight">{day.target ?? '—'}</div>
                    {day.target == null && <div className="text-[10px] text-amber-100/70">Not set yet</div>}
                  </div>
                  <div className="rounded-2xl bg-white/15 border border-yellow-200/40 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-yellow-100 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Admissions today</div>
                    <div className="text-3xl font-black leading-tight text-yellow-100">{day.admissions}</div>
                  </div>
                </div>
                {day.percent != null && (
                  <div>
                    <div className="h-2.5 rounded-full bg-black/20 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-100 via-yellow-300 to-amber-300 transition-all duration-700" style={{ width: `${Math.min(100, day.percent)}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-amber-50">{day.percent >= 100 ? `Daily target achieved — ${day.percent}% 🎯` : `${day.percent}% of today's target`}</div>
                  </div>
                )}
              </div>
            )}
          </TopperCard>

          <TopperCard kind="month" title="Topper of the Month" subtitle={`Till date · ${monthRange(data?.month, data?.date)}`}
            person={mon} isMe={isMe(mon)} canEdit={canEditFor(mon)} busy={busyFor === mon?.name || (busyFor === '' && isMe(mon))}
            onEdit={() => pickPhoto(isMe(mon) ? '' : mon.name)} onRemove={() => removePhoto(mon.name)} empty="No admissions yet this month">
            {mon && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-2xl bg-black/25 border border-white/15 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-teal-100/80 flex items-center gap-1"><Target className="w-3.5 h-3.5" />Monthly Target</div>
                    <div className="text-3xl font-black leading-tight">{mon.target ?? '—'}</div>
                    {mon.target == null && <div className="text-[10px] text-teal-100/60">Not set yet</div>}
                  </div>
                  <div className="rounded-2xl bg-gradient-to-br from-amber-300/30 to-amber-500/20 border border-amber-300/40 px-3 py-2.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-amber-100 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" />Achieved till date</div>
                    <div className="text-3xl font-black leading-tight text-yellow-200">{mon.admissions}</div>
                  </div>
                </div>
                {pct != null && (
                  <div>
                    <div className="h-2.5 rounded-full bg-white/15 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-yellow-200 via-amber-400 to-amber-500 transition-all duration-700" style={{ width: `${Math.min(100, pct)}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] font-bold text-teal-50">{pct >= 100 ? `Target achieved — ${pct}% 🎯` : `${pct}% of monthly target`}</div>
                  </div>
                )}
              </div>
            )}
          </TopperCard>
        </div>
      )}

      {data?.me?.hasPhoto && (
        <div className="flex flex-wrap items-center justify-end gap-2 px-1">
          <button onClick={() => pickPhoto('')} disabled={busyFor === ''} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-[11px] font-bold cursor-pointer disabled:opacity-60">
            <Camera className="w-3.5 h-3.5" />Change my photo
          </button>
          <button onClick={() => removePhoto('')} disabled={busyFor === ''} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold cursor-pointer disabled:opacity-60">
            <Trash2 className="w-3.5 h-3.5" />{busyFor === '' ? 'Saving…' : 'Remove my photo'}
          </button>
        </div>
      )}

      {data && !data.me?.hasPhoto && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200">
          <div className="text-xs text-amber-900 flex items-center gap-2"><Camera className="w-4 h-4" />Add your photo so it shows here when you top the board.</div>
          <button onClick={() => pickPhoto('')} disabled={busyFor === ''} className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold cursor-pointer disabled:opacity-60">
            {busyFor === '' ? 'Saving…' : 'Upload my photo'}
          </button>
        </div>
      )}

      {data && (
        <div className="text-[11px] text-slate-400 flex items-center gap-1 px-1">
          <Users className="w-3.5 h-3.5" />
          Ranked by % of admissions target achieved (daily target = monthly target ÷ days in the month). {data.totals.today} admission{data.totals.today === 1 ? '' : 's'} today · {data.totals.month} this month across all branches. Day resets at midnight, month on the 1st.
        </div>
      )}
    </section>
  );
}
