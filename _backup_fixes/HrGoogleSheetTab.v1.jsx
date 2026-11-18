import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, ExternalLink, RefreshCw, Link2, Pencil, X, Maximize2, Minimize2 } from 'lucide-react';
import { getSetting, saveSetting } from '../services/api';

// Org-wide setting that holds the sheet links:
//   { team: '<url>', users: { '<lowercased name>': '<url>' } }
const SETTING_KEY = 'hr_google_sheets';

const normName = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();

// Turn any Google Sheets link into an embeddable editor URL (keeps the tab / gid).
export function toEmbedUrl(raw) {
  const url = String(raw || '').trim();
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return '';
  const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/edit?usp=sharing${gid ? `#gid=${gid}` : ''}`;
}

export default function HrGoogleSheetTab({ currentUser, canEditTeamSheet = false }) {
  const me = normName(currentUser?.name);
  const [config, setConfig] = useState({ team: '', users: {} });
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState('mine'); // 'mine' | 'team'
  const [editing, setEditing] = useState(null); // null | 'mine' | 'team'
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [frameKey, setFrameKey] = useState(0);
  const [fullScreen, setFullScreen] = useState(false);

  const load = async () => {
    try {
      const res = await getSetting(SETTING_KEY);
      const v = res?.value && typeof res.value === 'object' ? res.value : {};
      setConfig({ team: v.team || '', users: v.users && typeof v.users === 'object' ? v.users : {} });
      return v;
    } catch (_) {
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const myUrl = config.users?.[me] || '';
  const teamUrl = config.team || '';
  // Default to my own sheet when I have one, otherwise the team sheet
  useEffect(() => {
    if (!loading) setSource(myUrl ? 'mine' : 'team');
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeUrl = source === 'mine' ? myUrl : teamUrl;
  const embedUrl = useMemo(() => toEmbedUrl(activeUrl), [activeUrl]);

  const startEdit = (which) => {
    setError('');
    setDraft(which === 'mine' ? myUrl : teamUrl);
    setEditing(which);
  };

  const handleSave = async () => {
    const link = draft.trim();
    if (link && !toEmbedUrl(link)) {
      setError('Paste a Google Sheets link, e.g. https://docs.google.com/spreadsheets/d/…/edit');
      return;
    }
    setSaving(true);
    setError('');
    try {
      // Re-read first so we never wipe a link someone else saved meanwhile
      const latest = (await load()) || {};
      const next = {
        team: latest.team || '',
        users: { ...(latest.users || {}) }
      };
      if (editing === 'team') next.team = link;
      else if (link) next.users[me] = link;
      else delete next.users[me];
      await saveSetting(SETTING_KEY, next);
      setConfig(next);
      setSource(editing);
      setEditing(null);
      setFrameKey((k) => k + 1);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Could not save the sheet link');
    } finally {
      setSaving(false);
    }
  };

  const tabBtn = (key, label, has) => (
    <button
      type="button"
      onClick={() => setSource(key)}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
        source === key ? 'bg-[#0e6977] text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
      }`}
    >
      {label}{!has && <span className="ml-1 opacity-60">(not set)</span>}
    </button>
  );

  const wrapperClass = fullScreen
    ? 'fixed inset-0 z-50 bg-white p-3 flex flex-col gap-3'
    : 'bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-3';

  return (
    <div className={wrapperClass}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800 leading-tight">Google Sheet</h2>
            <p className="text-[11px] text-slate-500">Edit your tracking sheet right here — changes save to Google automatically.</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {tabBtn('mine', 'My Sheet', Boolean(myUrl))}
          {tabBtn('team', 'Team Sheet', Boolean(teamUrl))}
          {(source === 'mine' || canEditTeamSheet) && (
            <button type="button" onClick={() => startEdit(source)} title="Change sheet link"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 inline-flex items-center gap-1 cursor-pointer">
              <Pencil className="w-3.5 h-3.5" /> Link
            </button>
          )}
          {embedUrl && (
            <>
              <button type="button" onClick={() => setFrameKey((k) => k + 1)} title="Reload sheet"
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => setFullScreen((f) => !f)} title={fullScreen ? 'Exit full screen' : 'Full screen'}
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer">
                {fullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <a href={embedUrl} target="_blank" rel="noopener noreferrer" title="Open in Google Sheets"
                className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50">
                <ExternalLink className="w-4 h-4" />
              </a>
            </>
          )}
        </div>
      </div>

      {/* Link editor */}
      {editing && (
        <div className="rounded-xl border border-teal-200 bg-teal-50/60 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-teal-900 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5" />
              {editing === 'team' ? 'Team sheet link (everyone on the HR desk sees this)' : 'My sheet link (only you see this)'}
            </span>
            <button type="button" onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/…/edit"
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-2 rounded-lg bg-[#0e6977] text-white text-sm font-bold disabled:opacity-60 cursor-pointer">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
          {error && <p className="text-xs text-rose-600">{error}</p>}
          <p className="text-[11px] text-slate-500">
            In Google Sheets click <b>Share</b> and give edit access to everyone who should use it, then copy the link from the address bar. Leave empty and save to remove.
          </p>
        </div>
      )}

      {/* Sheet */}
      {loading ? (
        <div className="h-[70vh] flex items-center justify-center text-sm text-slate-400">Loading sheet…</div>
      ) : embedUrl ? (
        <>
          <iframe
            key={`${embedUrl}-${frameKey}`}
            src={embedUrl}
            title="Google Sheet"
            className={`w-full rounded-xl border border-slate-200 bg-white ${fullScreen ? 'flex-1' : 'h-[75vh]'}`}
            allow="clipboard-read; clipboard-write; fullscreen"
          />
          <p className="text-[11px] text-slate-400">
            Seeing “Sign in” or “You need access”? Sign in to Google in this browser with an account the sheet is shared with, or use the <ExternalLink className="w-3 h-3 inline" /> button to open it in a new tab.
          </p>
        </>
      ) : (
        <div className="h-[50vh] flex flex-col items-center justify-center gap-3 text-center border-2 border-dashed border-slate-200 rounded-xl">
          <FileSpreadsheet className="w-10 h-10 text-slate-300" />
          <p className="text-sm text-slate-500">
            {source === 'team' ? 'No team sheet has been linked yet.' : "You haven't linked your sheet yet."}
          </p>
          {(source === 'mine' || canEditTeamSheet) && (
            <button type="button" onClick={() => startEdit(source)}
              className="px-4 py-2 rounded-lg bg-[#0e6977] text-white text-sm font-bold cursor-pointer">
              Add Google Sheet link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
