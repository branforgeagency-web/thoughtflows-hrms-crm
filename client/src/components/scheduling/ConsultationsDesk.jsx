import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Search, ExternalLink, Copy, MoreVertical, RefreshCw, Send, Link2 } from 'lucide-react';
import {
  getBookingLinks, createBookingLink, updateBookingLink, deleteBookingLink, getBookingLinkBookings, getSchedulingTags
} from '../../services/api';
import { redirectToWhatsAppWeb } from '../../utils/whatsapp';
import { WEEK_MON, DURATIONS, timeOptions, fmtMin, prettyDate, copyText, errMsg } from './schedUtils';
import { Overlay } from './SchedulingCalendar';
import { TagPicker } from './AvailabilityFinder';

// Head of Trainer → Consultations: public booking links. A candidate opens
// /book/<code>, picks a free slot, and a Demo is created with a free trainer
// and a no-login classroom link.
export default function ConsultationsDesk() {
  const [tab, setTab] = useState('links');
  const [links, setLinks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [editing, setEditing] = useState(null); // {} for new, link for edit
  const [menu, setMenu] = useState(null);
  const [toast, setToast] = useState('');
  const [tags, setTags] = useState({ courses: [], languages: [], branches: [], trainers: [] });

  const flash = (m) => { setToast(m); setTimeout(() => setToast(''), 3000); };

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      if (tab === 'links') setLinks(await getBookingLinks());
      else setBookings(await getBookingLinkBookings(tab));
    } catch (e) { setError(errMsg(e)); }
    finally { setLoading(false); }
  }, [tab]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { getSchedulingTags().then(setTags).catch(() => {}); }, []);
  useEffect(() => { const c = () => setMenu(null); document.addEventListener('click', c); return () => document.removeEventListener('click', c); }, []);

  const ql = q.trim().toLowerCase();
  const shownLinks = links.filter((l) => !ql || `${l.name} ${l.trainerName}`.toLowerCase().includes(ql));
  const shownBookings = bookings.filter((b) => !ql || `${b.candidateName} ${b.phone} ${b.course} ${b.trainerName} ${b.linkName}`.toLowerCase().includes(ql));

  const share = (l) => {
    const text = `Book your free ${l.name} at Thoughtflows Academy — pick a time that suits you: ${l.url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-extrabold text-slate-900">Consultations</h2>
        <div className="flex items-center gap-2">
          {showSearch ? (
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} onBlur={() => !q && setShowSearch(false)} placeholder="Search" className="px-3 py-2 rounded-xl border border-slate-200 text-sm w-56" />
          ) : (
            <button onClick={() => setShowSearch(true)} className="px-3 py-2 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1.5 cursor-pointer"><Search className="w-4 h-4" />Search</button>
          )}
          <button onClick={() => setEditing({})} className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold flex items-center gap-1.5 cursor-pointer"><Plus className="w-4 h-4" />Create Booking Link</button>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-slate-200">
        {[['links', 'Booking Links'], ['upcoming', 'Upcoming'], ['past', 'Past']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`px-3 py-2 text-sm font-semibold rounded-t-lg cursor-pointer ${tab === k ? 'border border-b-white border-slate-900 -mb-px bg-white text-slate-900' : 'text-slate-500 hover:text-slate-800'}`}>{label}</button>
        ))}
        {loading && <RefreshCw className="w-4 h-4 ml-2 animate-spin text-teal-600" />}
      </div>

      {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}

      {tab === 'links' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="grid grid-cols-[1.4fr_1fr_auto] gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-600">
            <span>Event Name &amp; Duration</span><span>Host</span><span className="w-28 text-right">&nbsp;</span>
          </div>
          {shownLinks.length === 0 && !loading && (
            <div className="py-12 text-center text-sm text-slate-500 space-y-2">
              <Link2 className="w-10 h-10 mx-auto text-slate-300" />
              <div>No booking links yet. Create one and share it on WhatsApp, Instagram or your website.</div>
            </div>
          )}
          {shownLinks.map((l) => (
            <div key={l.id} className={`grid grid-cols-[1.4fr_1fr_auto] gap-3 px-4 py-3 border-b border-slate-100 items-center ${l.active ? '' : 'opacity-60'}`}>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{l.name}{!l.active && <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-600">PAUSED</span>}</div>
                <div className="text-xs text-slate-500">
                  {DURATIONS.find((d) => d.value === l.durationMin)?.label || `${l.durationMin} min`}
                  {' · '}{l.days.length === 7 ? 'Every day' : l.days.join(', ')} {fmtMin(l.windowStartMin)}–{fmtMin(l.windowEndMin)}
                  {l.courses.length ? ` · ${l.courses.slice(0, 3).join(', ')}${l.courses.length > 3 ? '…' : ''}` : ''}
                  {l.upcoming ? <b className="text-teal-700"> · {l.upcoming} upcoming</b> : ''}
                </div>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-sm font-bold shrink-0">{l.hostMode === 'trainer' ? (l.trainerName || 'T')[0] : 'T'}</div>
                <span className="text-sm text-slate-800 truncate">{l.hostMode === 'trainer' ? l.trainerName : 'Thoughtflows · any free trainer'}</span>
              </div>
              <div className="flex items-center gap-1 justify-end relative w-28">
                <IconBtn title="Open booking page" onClick={() => window.open(l.url, '_blank', 'noopener')}><ExternalLink className="w-4 h-4" /></IconBtn>
                <IconBtn title="Copy link" onClick={async () => { flash((await copyText(l.url)) ? 'Link copied' : l.url); }}><Copy className="w-4 h-4" /></IconBtn>
                <IconBtn title="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === l.id ? null : l.id); }}><MoreVertical className="w-4 h-4" /></IconBtn>
                {menu === l.id && (
                  <div className="absolute right-0 top-9 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-sm" onClick={(e) => e.stopPropagation()}>
                    <MenuItem onClick={() => { setMenu(null); share(l); }}><Send className="w-3.5 h-3.5" />Share on WhatsApp</MenuItem>
                    <MenuItem onClick={() => { setMenu(null); setEditing(l); }}>Edit</MenuItem>
                    <MenuItem onClick={async () => { setMenu(null); try { await updateBookingLink(l.id, { active: !l.active }); load(); } catch (e) { flash(errMsg(e)); } }}>{l.active ? 'Pause link' : 'Activate link'}</MenuItem>
                    <MenuItem danger onClick={async () => { setMenu(null); if (!window.confirm(`Delete "${l.name}"? Bookings already made stay in Demos.`)) return; try { await deleteBookingLink(l.id); load(); } catch (e) { flash(errMsg(e)); } }}>Delete</MenuItem>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>{['Candidate', 'Course', 'When', 'Trainer', 'Status', 'Booking link', ''].map((h) => <th key={h} className="text-left font-bold px-4 py-3">{h}</th>)}</tr>
            </thead>
            <tbody>
              {shownBookings.length === 0 && !loading && <tr><td colSpan={7} className="py-12 text-center text-slate-500">No {tab} bookings.</td></tr>}
              {shownBookings.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-2.5"><div className="font-semibold text-slate-900">{b.candidateName}</div><div className="text-xs text-slate-500">{b.phone}{b.email ? ` · ${b.email}` : ''}</div></td>
                  <td className="px-4 py-2.5">{b.course}<div className="text-xs text-slate-500">{b.language}</div></td>
                  <td className="px-4 py-2.5 whitespace-nowrap">{prettyDate(b.date)}<div className="text-xs text-slate-500">{b.timeSlot}</div></td>
                  <td className="px-4 py-2.5">{b.trainerName}</td>
                  <td className="px-4 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">{b.status}</span></td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{b.linkName}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-right">
                    {b.joinLink && tab === 'upcoming' && (
                      <>
                        <IconBtn title="Copy candidate's join link" onClick={async () => flash((await copyText(b.joinLink)) ? 'Join link copied' : b.joinLink)}><Copy className="w-4 h-4" /></IconBtn>
                        <IconBtn title="Send join link on WhatsApp" onClick={() => redirectToWhatsAppWeb(b.phone, `Hi ${b.candidateName}, your ${b.course} demo is on ${prettyDate(b.date)} at ${b.timeSlot}. Join from your phone (no app needed): ${b.joinLink}`)}><Send className="w-4 h-4" /></IconBtn>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <LinkForm link={editing} tags={tags} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setTab('links'); load(); flash('Booking link saved'); }} />
      )}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[130] px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-xl">{toast}</div>}
    </div>
  );
}

const IconBtn = ({ children, ...p }) => <button {...p} className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 cursor-pointer">{children}</button>;
const MenuItem = ({ children, danger, ...p }) => <button {...p} className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-slate-50 cursor-pointer ${danger ? 'text-rose-600' : 'text-slate-700'}`}>{children}</button>;

const WINDOW_TIMES = timeOptions(30, 0, 1440).concat([{ value: 1440, label: '12:00 AM (midnight)' }]);

function LinkForm({ link, tags, onClose, onSaved }) {
  const isNew = !link.id;
  const [f, setF] = useState(() => ({
    name: link.name || 'TRAINER DEMO', durationMin: link.durationMin || 60,
    courses: link.courses || [], languages: link.languages || ['Tamil', 'English'], branch: link.branch || '',
    hostMode: link.hostMode || 'auto', trainerId: link.trainerId || '',
    days: link.days || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    windowStartMin: link.windowStartMin ?? 600, windowEndMin: link.windowEndMin ?? 1080,
    minNoticeHours: link.minNoticeHours ?? 2, maxDaysAhead: link.maxDaysAhead ?? 14, active: link.active ?? true
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const tagValue = useMemo(() => ({ courses: f.courses, languages: f.languages }), [f.courses, f.languages]);

  const save = async () => {
    setSaving(true); setError('');
    try {
      if (isNew) await createBookingLink(f); else await updateBookingLink(link.id, f);
      onSaved();
    } catch (e) { setError(errMsg(e)); }
    finally { setSaving(false); }
  };

  return (
    <Overlay title={isNew ? 'Create Booking Link' : 'Edit Booking Link'} onClose={onClose} wide>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <L label="Event name"><input value={f.name} onChange={(e) => set('name', e.target.value)} className={inp} /></L>
        <L label="Duration">
          <select value={f.durationMin} onChange={(e) => set('durationMin', Number(e.target.value))} className={inp}>
            {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </L>
        <L label="Courses the candidate can pick (empty = any)" full>
          <TagPicker data={tags} value={tagValue} groups={['courses', 'languages']} placeholder="Any course · Tamil, English"
            onChange={(v) => setF((p) => ({ ...p, courses: v.courses || [], languages: v.languages || [] }))} />
        </L>
        <L label="Branch (empty = any branch)">
          <select value={f.branch} onChange={(e) => set('branch', e.target.value)} className={inp}>
            <option value="">Any branch</option>
            {tags.branches.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </L>
        <L label="Host">
          <div className="flex gap-2">
            <select value={f.hostMode} onChange={(e) => set('hostMode', e.target.value)} className={`${inp} w-40`}>
              <option value="auto">Any free trainer</option>
              <option value="trainer">A fixed trainer</option>
            </select>
            {f.hostMode === 'trainer' && (
              <select value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)} className={inp}>
                <option value="">Choose trainer…</option>
                {tags.trainers.map((t) => <option key={t.trainerId} value={t.trainerId}>{t.trainerName}</option>)}
              </select>
            )}
          </div>
        </L>
        <L label="Bookable days" full>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_MON.map((d) => {
              const on = f.days.includes(d);
              return <button key={d} type="button" onClick={() => set('days', on ? f.days.filter((x) => x !== d) : [...f.days, d])} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${on ? 'bg-teal-600 border-teal-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>{d}</button>;
            })}
          </div>
        </L>
        <L label="Bookable hours">
          <div className="flex items-center gap-2">
            <select value={f.windowStartMin} onChange={(e) => set('windowStartMin', Number(e.target.value))} className={inp}>{WINDOW_TIMES.slice(0, -1).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
            <span className="text-slate-400">to</span>
            <select value={f.windowEndMin} onChange={(e) => set('windowEndMin', Number(e.target.value))} className={inp}>{WINDOW_TIMES.slice(1).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
          </div>
        </L>
        <div className="grid grid-cols-2 gap-2">
          <L label="Minimum notice (hours)"><input type="number" min={0} max={168} value={f.minNoticeHours} onChange={(e) => set('minNoticeHours', e.target.value)} className={inp} /></L>
          <L label="Book up to (days ahead)"><input type="number" min={1} max={90} value={f.maxDaysAhead} onChange={(e) => set('maxDaysAhead', e.target.value)} className={inp} /></L>
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2 cursor-pointer">
          <input type="checkbox" checked={f.active} onChange={(e) => set('active', e.target.checked)} />Link is active (candidates can book)
        </label>
      </div>
      <p className="mt-3 text-xs text-slate-500">Only slots where a matching trainer is free are offered — trainer shifts, leave, batch timings, demos and 1:1 sessions are all checked. Each booking creates a Demo and the candidate gets a no-login classroom link.</p>
      {error && <div className="mt-3 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm">{error}</div>}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold cursor-pointer">Cancel</button>
        <button onClick={save} disabled={saving} className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-60 cursor-pointer">{saving ? 'Saving…' : isNew ? 'Create link' : 'Save changes'}</button>
      </div>
    </Overlay>
  );
}

const inp = 'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white';
function L({ label, children, full }) {
  return <label className={`space-y-1 block ${full ? 'md:col-span-2' : ''}`}><span className="text-xs font-semibold text-slate-600">{label}</span>{children}</label>;
}
