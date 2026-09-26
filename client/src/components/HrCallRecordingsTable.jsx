import React, { useState, useEffect, useMemo } from 'react';
import useFileToken from '../hooks/useFileToken';
import {
  PhoneCall,
  Search,
  Filter,
  Download,
  Trash2,
  Play,
  Pause,
  Clock,
  Calendar,
  User,
  Sparkles,
  RefreshCw,
  Volume2,
  AlertCircle
} from 'lucide-react';
import { getRecordings, deleteRecording, onDataUpdate, recordingUrl } from '../services/api';

export default function HrCallRecordingsTable({ currentUser }) {
  useFileToken(); // keeps file links (downloads / audio) signed with a fresh short-lived token
  const [recordings, setRecordings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOutcomeFilter, setSelectedOutcomeFilter] = useState('ALL');
  const [toastMsg, setToastMsg] = useState(null);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await getRecordings();
      setRecordings(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching call recordings:', err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
    const unsub = onDataUpdate((entity) => {
      if (entity === 'recordings' || entity === 'leads') {
        loadRecordings();
      }
    });
    return unsub;
  }, []);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the call recording for ${name}?`)) {
      return;
    }
    try {
      await deleteRecording(id);
      setRecordings(prev => prev.filter(r => r._id !== id));
      showToast('✓ Call recording deleted');
    } catch (err) {
      console.error('Failed to delete recording:', err);
      showToast('Could not delete recording');
    }
  };

  // Filter recordings
  const filteredRecordings = useMemo(() => {
    const isElevated = currentUser?.role === 'Super Admin' ||
      currentUser?.role === 'Admin' ||
      currentUser?.department === 'admin' ||
      currentUser?.department === 'leadership';
    const myName = (currentUser?.name || '').trim().toLowerCase();

    return recordings.filter(rec => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q ||
        (rec.leadName || '').toLowerCase().includes(q) ||
        (rec.leadPhone || '').includes(q) ||
        (rec.counselorName || '').toLowerCase().includes(q) ||
        (rec.outcome || '').toLowerCase().includes(q) ||
        (rec.notes || '').toLowerCase().includes(q);

      const matchesOutcome = selectedOutcomeFilter === 'ALL' ||
        (rec.outcome || '').toLowerCase().includes(selectedOutcomeFilter.toLowerCase());

      const recCounselor = (rec.counselorName || '').trim().toLowerCase();
      const matchesCounselor = isElevated || !myName ||
        recCounselor.includes(myName) ||
        myName.includes(recCounselor);

      return matchesSearch && matchesOutcome && matchesCounselor;
    });
  }, [recordings, searchQuery, selectedOutcomeFilter, currentUser]);

  // Aggregate Metrics
  const { totalCalls, totalDurationSec, uniqueLeads } = useMemo(() => {
    let dur = 0;
    const leadsSet = new Set();
    recordings.forEach(r => {
      dur += Number(r.durationSeconds) || 0;
      if (r.leadPhone) leadsSet.add(r.leadPhone);
    });
    return {
      totalCalls: recordings.length,
      totalDurationSec: dur,
      uniqueLeads: leadsSet.size
    };
  }, [recordings]);

  const formatSec = (sec) => {
    const s = Number(sec) || 0;
    const mins = Math.floor(s / 60);
    const rem = s % 60;
    return `${mins}m ${rem}s`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const OUTCOME_BADGES = {
    'will join': 'bg-emerald-100 text-emerald-800 border-emerald-300',
    'demo booked': 'bg-purple-100 text-purple-800 border-purple-300',
    'follow-up': 'bg-blue-100 text-blue-800 border-blue-300',
    'call back': 'bg-amber-100 text-amber-800 border-amber-300',
    'not reachable': 'bg-slate-100 text-slate-700 border-slate-300',
    'not interested': 'bg-rose-100 text-rose-800 border-rose-300'
  };

  const getBadgeStyle = (outcome) => {
    const o = (outcome || '').toLowerCase();
    for (const [k, v] of Object.entries(OUTCOME_BADGES)) {
      if (o.includes(k)) return v;
    }
    return 'bg-teal-100 text-teal-800 border-teal-300';
  };

  return (
    <div className="space-y-5 pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1 border-b border-slate-200/80 pb-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <span>Call <span className="text-[#0e6977]">Recordings</span></span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-700 font-extrabold text-xl sm:text-2xl">Audio Logs</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-slate-500 font-medium mt-1">
            Real audio records of student counselling calls. Recorded from start to end with playback and download.
          </p>
        </div>

        <button
          onClick={loadRecordings}
          className="bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs border border-slate-200 transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-teal-600' : ''}`} />
          <span>Refresh Audio Logs</span>
        </button>
      </div>

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-[#0e6977] flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            TOTAL CALL RECORDINGS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 my-1 font-mono">
            {totalCalls}
          </div>
          <div className="text-xs text-teal-700 font-mono font-medium">
            across {uniqueLeads} students / leads
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-purple-600 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            TOTAL CONVERSATION TIME
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-900 my-1 font-mono">
            {formatSec(totalDurationSec)}
          </div>
          <div className="text-xs text-purple-600 font-mono font-medium">
            cumulative audio captured
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-l-4 border-l-emerald-600 flex flex-col justify-between">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 font-mono">
            ACTIVE COUNSELLORS
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-800 my-1 font-mono">
            {currentUser?.name || ''}
          </div>
          <div className="text-xs text-emerald-600 font-mono font-medium">
            auto-recording on dial & call now
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search student, phone, counsellor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0e6977] focus:bg-white font-medium transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 flex-wrap self-start md:self-auto">
          {['ALL', 'Will Join', 'Demo Booked', 'Follow-up', 'Call Back'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedOutcomeFilter(tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedOutcomeFilter === tag
                  ? 'bg-[#0e6977] text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Recordings Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-[#0e6977]" />
            <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wide">
              Recorded Calls Table
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded font-mono font-bold">
              {filteredRecordings.length} Recordings
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Click play on any recording to listen
          </span>
        </div>

        {filteredRecordings.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-100 text-teal-600 mx-auto flex items-center justify-center">
              <PhoneCall className="w-7 h-7" />
            </div>
            <div className="text-slate-800 font-extrabold text-sm">No call recordings found</div>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              When you click <strong>Call Now</strong> or <strong>Dial</strong> on any lead, the call will record from start to end and appear here automatically.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/75 text-slate-500 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4">STUDENT / LEAD</th>
                  <th className="py-3 px-4">PHONE NUMBER</th>
                  <th className="py-3 px-4">HR COUNSELLOR</th>
                  <th className="py-3 px-4">DATE & TIME</th>
                  <th className="py-3 px-4">DURATION</th>
                  <th className="py-3 px-4">OUTCOME</th>
                  <th className="py-3 px-4 min-w-[280px]">AUDIO RECORDING (PLAY)</th>
                  <th className="py-3 px-4 text-center">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecordings.map((rec) => (
                  <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Student / Lead Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-900">{rec.leadName}</div>
                      {rec.notes && (
                        <div className="text-[10.5px] text-slate-400 truncate max-w-[180px] font-normal" title={rec.notes}>
                          {rec.notes}
                        </div>
                      )}
                    </td>

                    {/* Phone Number */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                      {rec.leadPhone}
                    </td>

                    {/* HR Counsellor */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-800">{rec.counselorName}</div>
                      <span className="text-[9.5px] text-slate-400 font-mono">
                        {rec.source === 'exotel' ? '📞 Exotel Bridge' : '🎙️ Mic Audio'}
                      </span>
                    </td>

                    {/* Date & Time */}
                    <td className="py-3.5 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDate(rec.createdAt)}
                    </td>

                    {/* Duration */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-800 whitespace-nowrap">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {formatSec(rec.durationSeconds)}
                      </span>
                    </td>

                    {/* Outcome Badge */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-lg border ${getBadgeStyle(rec.outcome)}`}>
                        {rec.outcome || 'Logged'}
                      </span>
                    </td>

                    {/* Audio Player (Inline) */}
                    <td className="py-3.5 px-4">
                      {rec.audioUrl ? (
                        <div className="flex items-center gap-2">
                          <audio
                            controls
                            src={recordingUrl(rec.audioUrl)}
                            preload="metadata"
                            className="h-8 w-64 max-w-full accent-[#0e6977]"
                          />
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">No audio file</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {rec.audioUrl && (
                          <a
                            href={recordingUrl(rec.audioUrl)}
                            download={`call_${rec.leadName}_${rec.leadPhone}.webm`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition-all"
                            title="Download Audio Recording"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDelete(rec._id, rec.leadName)}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-all cursor-pointer"
                          title="Delete Recording"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
