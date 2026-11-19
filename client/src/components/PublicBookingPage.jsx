import React, { useEffect, useState } from 'react';
import { RefreshCw, Clock, CheckCircle2, AlertCircle, Copy, CalendarDays } from 'lucide-react';
import { getPublicBooking, getPublicBookingSlots, createPublicBooking } from '../services/api';

// Public booking page /book/<code> (Consultations → Booking Links).
// Candidate picks course, language, date and a free slot; a Demo is created
// with a free trainer and they get a no-login classroom link.
const pretty = (k) => new Date(`${k}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const errMsg = (e) => e?.response?.data?.error || 'Something went wrong. Please check your internet and try again.';

export default function PublicBookingPage({ slug }) {
  const [info, setInfo] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ course: '', language: '', name: '', phone: '', email: '' });
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState(null);
  const [slot, setSlot] = useState(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [copied, setCopied] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    getPublicBooking(slug).then((d) => {
      setInfo(d);
      setForm((f) => ({ ...f, course: d.courses.length === 1 ? d.courses[0] : '', language: d.languages[0] || '' }));
      setDate(d.dates[0] || '');
    }).catch((e) => setError(errMsg(e)));
  }, [slug]);

  useEffect(() => {
    if (!info || !date) return;
    setSlots(null); setSlot(null);
    getPublicBookingSlots(slug, { date, course: form.course, language: form.language })
      .then((r) => setSlots(r.slots || [])).catch((e) => { setSlots([]); setError(errMsg(e)); });
  }, [slug, info, date, form.course, form.language]);

  const book = async () => {
    setError('');
    if (!form.course) return setError('Please choose a course');
    if (!slot) return setError('Please choose a time');
    if (form.name.trim().length < 2) return setError('Please enter your name');
    if (form.phone.replace(/\D/g, '').length < 10) return setError('Please enter a valid mobile number');
    setSaving(true);
    try { setDone(await createPublicBooking(slug, { ...form, date, startMin: slot.startMin })); }
    catch (e) {
      setError(errMsg(e));
      if (e?.response?.status === 409) { setSlot(null); setDate((d) => d); getPublicBookingSlots(slug, { date, course: form.course, language: form.language }).then((r) => setSlots(r.slots || [])).catch(() => {}); }
    } finally { setSaving(false); }
  };

  const card = 'w-full max-w-lg bg-white rounded-3xl shadow-xl border border-teal-100 p-6 space-y-5';
  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-[#e8f7f5] to-white flex items-start sm:items-center justify-center p-4 font-sans">
      {done ? (
        <div className={card}>
          <div className="text-center space-y-2">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <h1 className="text-xl font-extrabold text-slate-900">{done.existing ? 'You are already booked' : 'Your demo is booked!'}</h1>
            <p className="text-sm text-slate-600">{done.course} · <b>{pretty(done.date)}</b> · {done.timeSlot}<br />Trainer: <b>{done.trainerName}</b></p>
          </div>
          {done.joinLink && (
            <div className="rounded-2xl bg-teal-50 border border-teal-200 p-4 space-y-2">
              <div className="text-sm font-bold text-teal-900">Your class link — save it</div>
              <div className="text-xs break-all text-teal-800">{done.joinLink}</div>
              <div className="flex gap-2">
                <button onClick={async () => { try { await navigator.clipboard.writeText(done.joinLink); setCopied(true); } catch (_) {} }} className="flex-1 py-2.5 rounded-xl bg-white border border-teal-300 text-teal-800 text-sm font-bold flex items-center justify-center gap-1.5 cursor-pointer"><Copy className="w-4 h-4" />{copied ? 'Copied' : 'Copy link'}</button>
                <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`My Thoughtflows demo class (${done.course}) on ${pretty(done.date)} at ${done.timeSlot}: ${done.joinLink}`)}`} target="_blank" rel="noreferrer" className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold text-center">Save to WhatsApp</a>
              </div>
              <div className="text-[11px] text-teal-800">Open it at your class time on your phone or computer — no app or login needed.</div>
            </div>
          )}
        </div>
      ) : (
        <div className={card}>
          <div className="text-center">
            <div className="text-[11px] font-bold tracking-widest text-teal-700 uppercase">Thoughtflows Academy</div>
            <h1 className="text-xl font-extrabold text-slate-900 mt-1">{info?.name || 'Book a demo'}</h1>
            {info && <div className="text-xs text-slate-500 mt-1 flex items-center justify-center gap-1"><Clock className="w-3.5 h-3.5" />{info.durationMin} min · Online{info.hostName ? ` · with ${info.hostName}` : ''}</div>}
          </div>

          {!info && !error && <div className="flex justify-center py-8"><RefreshCw className="w-6 h-6 animate-spin text-teal-600" /></div>}

          {info && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Course">
                  {info.courses.length ? (
                    <select value={form.course} onChange={(e) => set('course', e.target.value)} className={inp}>
                      <option value="">Choose…</option>
                      {info.courses.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  ) : <input value={form.course} onChange={(e) => set('course', e.target.value)} placeholder="e.g. CPC" className={inp} />}
                </Field>
                <Field label="Language">
                  <select value={form.language} onChange={(e) => set('language', e.target.value)} className={inp}>
                    {info.languages.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </Field>
              </div>

              <Field label={<span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />Pick a date</span>}>
                {info.dates.length === 0 ? <div className="text-sm text-slate-500">No dates open right now.</div> : (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {info.dates.map((d) => (
                      <button key={d} onClick={() => setDate(d)} className={`shrink-0 px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer ${date === d ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-700'}`}>{pretty(d)}</button>
                    ))}
                  </div>
                )}
              </Field>

              <Field label="Pick a time">
                {!slots ? <div className="text-sm text-slate-400 py-2">Checking free times…</div>
                  : slots.filter((s) => s.available).length === 0 ? <div className="text-sm text-slate-500 py-2">No free time on this day{form.course ? ' for this course' : ''}. Try another date.</div>
                    : (
                      <div className="grid grid-cols-3 gap-2">
                        {slots.filter((s) => s.available).map((s) => (
                          <button key={s.startMin} onClick={() => setSlot(s)} className={`py-2.5 rounded-xl border text-sm font-bold cursor-pointer ${slot?.startMin === s.startMin ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-teal-200 text-teal-800 hover:bg-teal-50'}`}>{s.label}</button>
                        ))}
                      </div>
                    )}
              </Field>

              <div className="space-y-3">
                <Field label="Your name"><input value={form.name} onChange={(e) => set('name', e.target.value)} className={inp} autoComplete="name" /></Field>
                <Field label="Mobile (WhatsApp)"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} inputMode="tel" className={inp} autoComplete="tel" /></Field>
                <Field label="Email (optional)"><input value={form.email} onChange={(e) => set('email', e.target.value)} inputMode="email" className={inp} autoComplete="email" /></Field>
              </div>
            </>
          )}

          {error && <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm"><AlertCircle className="w-5 h-5 shrink-0" /><span>{error}</span></div>}

          {info && (
            <button onClick={book} disabled={saving} className="w-full py-4 rounded-2xl bg-[#009688] hover:bg-[#00897b] disabled:opacity-60 text-white text-base font-bold cursor-pointer">
              {saving ? 'Booking…' : slot ? `Book ${pretty(date)} · ${slot.label}` : 'Book my demo'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

const inp = 'w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white';
const Field = ({ label, children }) => <div className="space-y-1.5"><div className="text-xs font-semibold text-slate-600">{label}</div>{children}</div>;
