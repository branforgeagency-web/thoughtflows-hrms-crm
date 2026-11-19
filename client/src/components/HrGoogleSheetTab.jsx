import React, { useEffect, useMemo, useState } from 'react';
import { FileSpreadsheet, ExternalLink, RefreshCw, Link2, Pencil, X, Maximize2, Minimize2, DownloadCloud } from 'lucide-react';
import { getSetting, saveSetting, getGoogleSheetRows, createLeadsBulk } from '../services/api';
import { parseGoogleSheetOrCsv } from '../utils/csvParser';

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

// Read-only view of the same sheet (no editing toolbar or cell editing)
export function toPreviewUrl(raw) {
  const url = String(raw || '').trim();
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!m) return '';
  const gid = (url.match(/[#&?]gid=(\d+)/) || [])[1];
  return `https://docs.google.com/spreadsheets/d/${m[1]}/preview${gid ? `#gid=${gid}` : ''}`;
}

// ---------------------------------------------------------------------------
// Sheet → CRM import (same parser + bulk endpoint as "Bulk Upload").
// Rows already in the CRM (same mobile / email) are skipped by the server, so
// importing the same sheet again only adds the new rows.
// ---------------------------------------------------------------------------
const AUTO_IMPORT_EVERY_MS = 10 * 60 * 1000;
const lastRunKey = (me) => `tf_sheet_import_last_${me}`;
const lastResultKey = (me) => `tf_sheet_import_result_${me}`;

export function readLastImport(me) {
  try { return JSON.parse(localStorage.getItem(lastResultKey(me)) || 'null'); } catch (_) { return null; }
}

export async function importSheetToLeads(sheetUrl, currentUser) {
  const me = normName(currentUser?.name);
  const { tsv } = await getGoogleSheetRows(sheetUrl);
  const parsed = parseGoogleSheetOrCsv(tsv || '');
  // A row needs a real mobile number or an email — otherwise it can't be
  // matched next time and would be added again on every import.
  const usable = parsed.filter((r) => {
    const digits = String(r.phone || r.whatsappNumber || '').replace(/\D/g, '');
    return digits.length >= 10 || /\S+@\S+\.\S+/.test(String(r.email || ''));
  });
  let result = { total: parsed.length, createdCount: 0, duplicateCount: 0, invalidCount: 0 };
  if (usable.length) {
    const owner = currentUser?.name || '';
    const payload = usable.map((r) => ({
      fullName: r.fullName,
      name: r.fullName,
      phone: r.phone,
      whatsappNumber: r.whatsappNumber || r.phone,
      email: r.email,
      course: r.course || undefined,
      branch: r.branch || currentUser?.branch || '',
      sourceName: r.sourceName || 'Google Sheet',
      source: r.sourceName || 'Google Sheet',
      category: r.category,
      enquiryDate: r.enquiryDate || '',
      enquiryMonth: r.enquiryMonth || undefined,
      stage: r.stage || 'new',
      counselorAssigned: r.counselorAssigned || owner,
      allocatedTo: r.allocatedTo || r.counselorAssigned || owner,
      spokenBy: r.spokenBy || r.counselorAssigned || owner,
      education: r.education,
      passoutYear: r.passoutYear,
      location: r.location,
      notes: r.notes,
      followUpNote: r.notes
    }));
    const res = await createLeadsBulk(payload, {
      defaultSource: 'Google Sheet',
      defaultBranch: currentUser?.branch || '',
      defaultCounselor: owner
    });
    result = {
      total: parsed.length,
      createdCount: res?.createdCount || 0,
      duplicateCount: res?.duplicateCount || 0,
      invalidCount: res?.invalidCount || 0
    };
  }
  result.skipped = parsed.length - usable.length;
  result.at = new Date().toISOString();
  try {
    localStorage.setItem(lastRunKey(me), String(Date.now()));
    localStorage.setItem(lastResultKey(me), JSON.stringify(result));
  } catch (_) {}
  return result;
}

// Runs in the background while the HR dashboard is open: imports new rows
// from the counsellor's own sheet on open and then every 10 minutes, when
// they have switched "Auto-import" on.
export function useGoogleSheetAutoImport(currentUser, onImported) {
  const me = normName(currentUser?.name);
  const cbRef = React.useRef(onImported);
  cbRef.current = onImported;
  useEffect(() => {
    if (!me) return undefined;
    let stopped = false;
    let busy = false;
    const run = async () => {
      if (busy || stopped || (typeof document !== 'undefined' && document.hidden)) return;
      let last = 0;
      try { last = Number(localStorage.getItem(lastRunKey(me)) || 0); } catch (_) {}
      if (Date.now() - last < AUTO_IMPORT_EVERY_MS - 5000) return; // another tab ran it recently
      busy = true;
      try {
        const res = await getSetting(SETTING_KEY);
        const v = res?.value || {};
        const url = v.users?.[me];
        if (!url || !v.auto?.[me]) return;
        const result = await importSheetToLeads(url, currentUser);
        if (!stopped && result.createdCount > 0 && cbRef.current) cbRef.current(result);
      } catch (err) {
        try {
          localStorage.setItem(lastRunKey(me), String(Date.now()));
          localStorage.setItem(lastResultKey(me), JSON.stringify({ error: err?.response?.data?.error || err.message, at: new Date().toISOString() }));
        } catch (_) {}
      } finally {
        busy = false;
      }
    };
    const first = setTimeout(run, 8000); // let the dashboard load first
    const timer = setInterval(run, 60 * 1000); // checks each minute, imports every 10
    return () => { stopped = true; clearTimeout(first); clearInterval(timer); };
  }, [me]); // eslint-disable-line react-hooks/exhaustive-deps
}

// canEdit: only the Department Head and Branch Head (and Admin) may change
// sheet links or edit the sheet here — everyone else gets a view-only sheet.
export default function HrGoogleSheetTab({ currentUser, canEdit = false }) {
  const me = normName(currentUser?.name);
  const [config, setConfig] = useState({ team: '', users: {}, auto: {} });
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState(() => readLastImport(normName(currentUser?.name)));
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
      setConfig({ team: v.team || '', users: v.users && typeof v.users === 'object' ? v.users : {}, auto: v.auto && typeof v.auto === 'object' ? v.auto : {} });
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
  const embedUrl = useMemo(() => (canEdit ? toEmbedUrl(activeUrl) : toPreviewUrl(activeUrl)), [activeUrl, canEdit]);

  const startEdit = (which) => {
    setError('');
    setDraft(which === 'mine' ? myUrl : teamUrl);
    setEditing(which);
  };

  const handleSave = async () => {
    if (!canEdit) { setEditing(null); return; }
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
        users: { ...(latest.users || {}) },
        auto: { ...(latest.auto || {}) }
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

  const autoOn = Boolean(config.auto?.[me]);

  const handleImportNow = async () => {
    if (!activeUrl) return;
    setImporting(true);
    try {
      const result = await importSheetToLeads(activeUrl, currentUser);
      setLastImport(result);
    } catch (err) {
      setLastImport({ error: err?.response?.data?.error || err.message, at: new Date().toISOString() });
    } finally {
      setImporting(false);
    }
  };

  const toggleAuto = async () => {
    try {
      const latest = (await load()) || {};
      const next = { team: latest.team || '', users: { ...(latest.users || {}) }, auto: { ...(latest.auto || {}) } };
      if (autoOn) delete next.auto[me]; else next.auto[me] = true;
      await saveSetting(SETTING_KEY, next);
      setConfig(next);
      if (!autoOn && myUrl) handleImportNow();
    } catch (err) {
      setLastImport({ error: err?.response?.data?.error || err.message, at: new Date().toISOString() });
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
            <p className="text-[11px] text-slate-500">
              {canEdit
                ? 'Edit your tracking sheet right here — changes save to Google automatically.'
                : 'View only — the Department Head or Branch Head updates this sheet.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {(canEdit || myUrl) && tabBtn('mine', 'My Sheet', Boolean(myUrl))}
          {tabBtn('team', 'Team Sheet', Boolean(teamUrl))}
          {canEdit && (
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
      {editing && canEdit && (
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
            In Google Sheets click <b>Share</b>, give edit access to everyone who should use it, and set <b>General access → Anyone with the link</b> so the CRM can read rows for import. Copy the link from the address bar. Leave empty and save to remove.
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
          {canEdit ? (
            <button type="button" onClick={() => startEdit(source)}
              className="px-4 py-2 rounded-lg bg-[#0e6977] text-white text-sm font-bold cursor-pointer">
              Add Google Sheet link
            </button>
          ) : (
            <p className="text-xs text-slate-400">Ask your Department Head or Branch Head to link it.</p>
          )}
        </div>
      )}
    </div>
  );
}
