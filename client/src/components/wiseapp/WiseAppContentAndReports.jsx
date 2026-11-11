import React, { useState, useEffect } from 'react';
import {
  Video,
  Radio,
  ShoppingBag,
  Sparkles,
  MessageSquare,
  Star,
  BookOpen,
  BarChart3,
  Download,
  Plus,
  Trash2,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
  FileText
} from 'lucide-react';
import {
  getWiseAppVideos,
  createWiseAppVideo,
  updateWiseAppVideo,
  deleteWiseAppVideo,
  getWiseAppPackages,
  createWiseAppPackage,
  deleteWiseAppPackage,
  getWiseAppFeedback,
  submitWiseAppFeedback,
  getWiseAppResources,
  getWiseAppAttendance,
  getWiseAppReports,
  trainingMaterialFileUrl
} from '../../services/api';

// ---------------------------------------------------------------------------
// 1. Manage Videos & Manage Live Videos
// ---------------------------------------------------------------------------
export function WiseAppVideosSection({ mode = 'recorded', onChanged }) {
  const [videos, setVideos] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    course: 'CPC',
    chapter: 'ICD-10-CM',
    batch: '',
    trainerName: '',
    videoType: mode,
    videoUrl: '',
    duration: '45 min',
    scheduledAt: '',
    status: mode === 'live' ? 'Scheduled' : 'Published',
    description: ''
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      videoType: mode,
      status: mode === 'live' ? 'Scheduled' : 'Published'
    }));
  }, [mode]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWiseAppVideos({ videoType: mode });
      setVideos(data?.videos || []);
      setLiveSessions(data?.liveSessions || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [mode]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await createWiseAppVideo({ ...form, videoType: mode });
    setShowForm(false);
    setForm({ ...form, title: '', videoUrl: '', description: '' });
    await load();
    onChanged?.();
  };

  const handleToggleLiveStatus = async (v) => {
    const next = v.status === 'Live' ? 'Completed' : v.status === 'Scheduled' ? 'Live' : 'Published';
    await updateWiseAppVideo(v._id, { status: next });
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this video entry?')) return;
    await deleteWiseAppVideo(id);
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00c0ef] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {mode === 'live' ? (
              <>
                <Radio className="w-4 h-4 text-rose-600" /> Manage Live Videos & Interactive Sessions
              </>
            ) : (
              <>
                <Video className="w-4 h-4 text-[#00c0ef]" /> Manage Recorded Videos & Study Clips
              </>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === 'live'
              ? 'Monitor live trainer sessions and schedule upcoming live video broadcasts.'
              : 'Publish recorded medical coding lectures and chapter walkthroughs for student practice.'}
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3.5 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> {mode === 'live' ? 'Schedule Live Video' : 'Add Recorded Video'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Video Title *"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              value={form.course}
              onChange={(e) => setForm({ ...form, course: e.target.value })}
              placeholder="Course (e.g. CPC)"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              value={form.trainerName}
              onChange={(e) => setForm({ ...form, trainerName: e.target.value })}
              placeholder="Trainer Name"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              placeholder="Video / Stream URL"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs sm:col-span-2"
            />
            <input
              value={mode === 'live' ? form.scheduledAt : form.duration}
              onChange={(e) =>
                setForm(mode === 'live' ? { ...form, scheduledAt: e.target.value } : { ...form, duration: e.target.value })
              }
              placeholder={mode === 'live' ? 'Scheduled Date & Time' : 'Duration (e.g. 45 min)'}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-slate-200 text-xs">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold cursor-pointer">Save</button>
          </div>
        </form>
      )}

      {mode === 'live' && liveSessions.length > 0 && (
        <div className="bg-white rounded border border-slate-200 p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
            Live Class Sessions (Synced from Trainers Hub)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {liveSessions.slice(0, 6).map((ls) => (
              <div key={ls._id} className="p-3 rounded border border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    {ls.isLive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
                    <span className="text-xs font-bold text-slate-800">{ls.topic || ls.batch}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{ls.trainerName} · {ls.batch}</div>
                </div>
                {(ls.zoomJoinUrl || ls.recordingUrl) && (
                  <a
                    href={ls.zoomJoinUrl || ls.recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading videos...</div>
        ) : videos.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No {mode === 'live' ? 'live video schedules' : 'recorded videos'} added yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {videos.map((v) => (
              <div key={v._id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/60">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{v.title}</span>
                    <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-bold">{v.course}</span>
                    <button
                      onClick={() => handleToggleLiveStatus(v)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                        v.status === 'Live'
                          ? 'bg-rose-600 text-white'
                          : v.status === 'Published'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      {v.status}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {v.trainerName || 'Faculty'} · {v.scheduledAt || v.duration}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {v.videoUrl && (
                    <a
                      href={v.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Watch
                    </a>
                  )}
                  <button onClick={() => handleDelete(v._id)} className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Packages, Store & Exclusive Services
// ---------------------------------------------------------------------------
export function WiseAppPackagesSection({ defaultKind = 'package', onChanged }) {
  const [kind, setKind] = useState(defaultKind);
  const [items, setItems] = useState([]);
  const [courseRates, setCourseRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    kind: defaultKind,
    course: 'CPC',
    price: 0,
    duration: '3 Months',
    testsIncluded: 10,
    videosIncluded: 25,
    features: '',
    description: ''
  });

  useEffect(() => {
    setKind(defaultKind);
    setForm((f) => ({ ...f, kind: defaultKind }));
  }, [defaultKind]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWiseAppPackages({ kind });
      setItems(data?.items || []);
      setCourseRates(data?.courseRates || []);
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [kind]);

  const handleCreate = async (e) => {
    e.preventDefault();
    await createWiseAppPackage({ ...form, kind });
    setShowForm(false);
    setForm({ ...form, name: '', features: '', description: '' });
    await load();
    onChanged?.();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this package/service?')) return;
    await deleteWiseAppPackage(id);
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00a65a] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            {kind === 'exclusive_service' ? (
              <>
                <Sparkles className="w-4 h-4 text-[#605ca8]" /> Exclusive Services
              </>
            ) : (
              <>
                <ShoppingBag className="w-4 h-4 text-[#00a65a]" /> Packages, Store & Institute Offerings
              </>
            )}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage WiseApp test bundles, course packages, store resources, and exclusive mentorship services.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'package', label: 'Packages' },
            { id: 'exclusive_service', label: 'Exclusive Services' },
            { id: 'store_item', label: 'Store Items' }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setKind(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold border cursor-pointer ${
                kind === t.id ? 'bg-[#605ca8] text-white border-[#555299]' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-3.5 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Add New
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Package / Service Name *" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} placeholder="Course (e.g. CPC)" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price (INR)" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="Duration (e.g. 3 Months)" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input type="number" value={form.testsIncluded} onChange={(e) => setForm({ ...form, testsIncluded: e.target.value })} placeholder="Tests Included" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} placeholder="Features (comma separated)" className="px-3 py-1.5 border border-slate-200 rounded text-xs" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-slate-200 text-xs">Cancel</button>
            <button type="submit" className="px-4 py-1.5 rounded bg-[#00a65a] text-white text-xs font-bold cursor-pointer">Save</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="bg-white rounded border border-slate-200 p-8 text-center text-xs text-slate-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <div key={item._id} className="bg-white rounded border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-bold text-slate-800">{item.name}</h4>
                  <button onClick={() => handleDelete(item._id)} className="text-rose-500 hover:text-rose-700 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{item.course} · {item.duration}</div>
                <div className="text-lg font-extrabold text-[#00a65a] mt-2">
                  {item.price > 0 ? `₹${Number(item.price).toLocaleString('en-IN')}` : 'Included'}
                </div>
                {item.features?.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {item.features.map((f, idx) => (
                      <li key={idx} className="text-[11px] text-slate-600 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3 text-[#00a65a]" /> {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between">
                <span>{item.testsIncluded || 0} Tests</span>
                <span>{item.videosIncluded || 0} Videos</span>
              </div>
            </div>
          ))}

          {kind === 'package' &&
            courseRates.map((cr) => (
              <div key={cr._id} className="bg-white rounded border border-slate-200 p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">Academy Course</span>
                    <span className="text-[11px] font-mono text-slate-400">{cr.code}</span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-2">{cr.name}</h4>
                  <div className="text-xs text-slate-500">{cr.category} · {cr.duration}</div>
                  <div className="text-lg font-extrabold text-slate-800 mt-2">
                    ₹{Number(cr.newFeeNoDiscount || cr.trainingFee || 0).toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                  Exam: {cr.examFeeText || 'Included'}
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Feedback, Learning Resources & Attendance
// ---------------------------------------------------------------------------
export function WiseAppFeedbackAndResourcesSection({ initialTab = 'feedback', onChanged }) {
  const [tab, setTab] = useState(initialTab);
  const [fbData, setFbData] = useState({ feedbacks: [], avgRating: 0, total: 0, distribution: [] });
  const [resources, setResources] = useState({ materials: [], videos: [] });
  const [attendance, setAttendance] = useState([]);
  const [fbForm, setFbForm] = useState({ studentName: '', trainerName: '', batch: '', topic: '', kind: 'class', rating: 5, comment: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const load = async () => {
    try {
      const [fb, res, att] = await Promise.all([
        getWiseAppFeedback(),
        getWiseAppResources(),
        getWiseAppAttendance()
      ]);
      if (fb) setFbData(fb);
      if (res) setResources(res);
      if (Array.isArray(att)) setAttendance(att);
    } catch (_) {}
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmitFeedback = async (e) => {
    e.preventDefault();
    await submitWiseAppFeedback(fbForm);
    setFbForm({ studentName: '', trainerName: '', batch: '', topic: '', kind: 'class', rating: 5, comment: '' });
    setMsg('Student feedback recorded and visible to Trainers, Team Leaders & Management.');
    await load();
    onChanged?.();
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#605ca8] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#605ca8]" />
            Feedback, Learning Resources & Attendance
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Step 4 & Step 5: Digital study materials, session attendance summaries, and student feedback for continuous quality improvement.
          </p>
        </div>
        <div className="flex gap-1.5">
          {[
            { id: 'feedback', label: `Feedback (${fbData.total || 0})` },
            { id: 'resources', label: `Learning Resources (${resources.materials?.length || 0})` },
            { id: 'attendance', label: `Attendance (${attendance.length})` }
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded text-xs font-bold border cursor-pointer ${
                tab === t.id ? 'bg-[#605ca8] text-white border-[#555299]' : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {msg && (
        <div className="px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between">
          <span>{msg}</span>
          <button onClick={() => setMsg('')}>×</button>
        </div>
      )}

      {tab === 'feedback' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <form onSubmit={handleSubmitFeedback} className="bg-white rounded border border-slate-200 p-4 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Collect / Log Student Feedback</h4>
            <input value={fbForm.studentName} onChange={(e) => setFbForm({ ...fbForm, studentName: e.target.value })} placeholder="Student Name" className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input value={fbForm.trainerName} onChange={(e) => setFbForm({ ...fbForm, trainerName: e.target.value })} placeholder="Trainer Name" className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <input value={fbForm.batch} onChange={(e) => setFbForm({ ...fbForm, batch: e.target.value })} placeholder="Batch Name" className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600">Rating:</span>
              {[1, 2, 3, 4, 5].map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setFbForm({ ...fbForm, rating: r })}
                  className="cursor-pointer"
                >
                  <Star className={`w-4 h-4 ${r <= fbForm.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                </button>
              ))}
            </div>
            <textarea
              rows={3}
              value={fbForm.comment}
              onChange={(e) => setFbForm({ ...fbForm, comment: e.target.value })}
              placeholder="Student feedback / suggestions..."
              className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <button type="submit" className="w-full py-2 rounded bg-[#605ca8] text-white text-xs font-bold cursor-pointer">
              Submit Feedback
            </button>
          </form>

          <div className="lg:col-span-2 bg-white rounded border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Feedback Entries · Avg Rating {fbData.avgRating || '—'} / 5
              </h4>
            </div>
            <div className="divide-y divide-slate-100 max-h-[360px] overflow-y-auto">
              {(fbData.feedbacks || []).length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No feedback entries recorded yet.</div>
              ) : (
                fbData.feedbacks.map((f) => (
                  <div key={f._id} className="py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">{f.studentName || 'Student'}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> {f.rating}/5
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Trainer: {f.trainerName || '—'} · Batch: {f.batch || '—'} · {f.kind}
                    </div>
                    {f.comment && <p className="text-xs text-slate-700 mt-1">{f.comment}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div className="bg-white rounded border border-slate-200 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Published Digital Learning Resources & Study Materials
          </h4>
          {!resources.materials?.length ? (
            <div className="py-8 text-center text-xs text-slate-400">No study materials uploaded yet. Trainers can upload materials from Training Library.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {resources.materials.map((m) => (
                <div key={m._id} className="p-3 rounded border border-slate-200 flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#00a65a]" /> {m.title}
                    </div>
                    <div className="text-[11px] text-slate-500">{m.category} · Uploaded by {m.uploadedBy || 'Faculty'}</div>
                  </div>
                  <a
                    href={trainingMaterialFileUrl(m._id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700"
                  >
                    Open
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'attendance' && (
        <div className="bg-white rounded border border-slate-200 overflow-x-auto">
          {!attendance.length ? (
            <div className="p-8 text-center text-xs text-slate-400">No attendance logs captured yet.</div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="p-3">Date</th>
                  <th className="p-3">Batch</th>
                  <th className="p-3">Trainer</th>
                  <th className="p-3 text-center">Present</th>
                  <th className="p-3 text-center">Late</th>
                  <th className="p-3 text-center">Absent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {attendance.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold">{row.date}</td>
                    <td className="p-3">{row.batch}</td>
                    <td className="p-3">{row.trainerName || '—'}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{row.present}</td>
                    <td className="p-3 text-center font-bold text-amber-600">{row.late}</td>
                    <td className="p-3 text-center font-bold text-rose-600">{row.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. Management Reports & WiseApp SOP Reference
// ---------------------------------------------------------------------------
const SOP_STEPS = [
  { step: 'Step 1', title: 'Student Information Management', bullets: ['Maintain student details and course-related information.', 'Track student onboarding and training status.', 'Update student information whenever changes occur.', 'Coordinate student details with the Class Allocation Sheet.'] },
  { step: 'Step 2', title: 'Class Schedule Management', bullets: ['Trainers update their class schedules in WiseApp.', 'Students and concerned team members refer to the updated schedule.', 'Schedule changes should be updated promptly.', 'Team leaders follow up on pending schedule updates.'] },
  { step: 'Step 3', title: 'Class Allocation and Coordination', bullets: ['After the intro session is completed, update student details in relevant records.', 'Add online students to the appropriate WhatsApp group after onboarding.', 'Coordinate class allocation and trainer assignments based on availability and batch requirements.'] },
  { step: 'Step 4', title: 'Student Learning and Practice', bullets: ['Students use digital learning resources for practice and learning activities.', 'Practice questions strengthen medical coding knowledge.', 'Regular assessments identify areas requiring improvement.'] },
  { step: 'Step 5', title: 'Student Feedback', bullets: ['Collect student feedback through the feedback process in WiseApp.', 'Trainers and team leaders review feedback and identify improvement areas.', 'Management uses feedback to improve training quality and student experience.'] },
  { step: 'Step 6', title: 'Monitoring and Follow-up', bullets: ['Team leaders follow up on pending schedule updates.', 'Trainers maintain accurate and updated information.', 'Management uses available records and reports to support operational decisions.'] }
];

const FEATURE_REFLECTION = [
  { option: 'Student Details', how: 'Add or update student information and course-related details.', reflect: 'Student profile, course details and onboarding status, if synchronized.' },
  { option: 'Schedule', how: 'Trainers enter availability and class timings and update changes.', reflect: 'Trainer schedule, availability and schedule changes, subject to permissions.' },
  { option: 'Class Allocation', how: 'Assign students to trainers or batches.', reflect: 'Batch lists, trainer assignments and allocation records, if enabled.' },
  { option: 'Attendance', how: 'Record student participation in scheduled sessions.', reflect: 'Attendance entries, attendance summaries or reports.' },
  { option: 'Assessments', how: 'Conduct or record student assessments and practice results.', reflect: 'Assessment history, scores or performance summaries.' },
  { option: 'Feedback', how: 'Collect student feedback through the available feedback process.', reflect: 'Feedback entries or summaries for review by authorized users.' },
  { option: 'Learning Resources', how: 'Share or provide access to study materials and practice resources.', reflect: 'Published resources or learning activity records.' },
  { option: 'Reports', how: 'Review available activity and performance information.', reflect: 'Management summaries and downloadable reports.' }
];

export function WiseAppReportsAndSopSection({ initialView = 'reports' }) {
  const [view, setView] = useState(initialView);
  const [report, setReport] = useState(null);

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  useEffect(() => {
    getWiseAppReports().then(setReport).catch(() => {});
  }, []);

  const exportCsv = () => {
    if (!report?.courseBreakdown?.length) return;
    const headers = ['Course', 'Total Students', 'Online', 'Classroom', 'Allocated', 'WhatsApp Synced'];
    const rows = report.courseBreakdown.map((r) => [r.course, r.total, r.online, r.classroom, r.allocated, r.whatsappSynced]);
    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wiseapp-management-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00c0ef] p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#00c0ef]" />
            Management Reports & WiseApp Operational Playbook
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Live academy summaries, downloadable CSV reports, and the complete WiseApp SOP & team responsibility guide.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('reports')}
            className={`px-3 py-1.5 rounded text-xs font-bold border cursor-pointer ${
              view === 'reports' ? 'bg-[#00c0ef] text-white border-[#00acd6]' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            Live Reports
          </button>
          <button
            onClick={() => setView('sop')}
            className={`px-3 py-1.5 rounded text-xs font-bold border cursor-pointer ${
              view === 'sop' ? 'bg-[#00a65a] text-white border-[#008d4c]' : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            WiseApp Playbook & SOP
          </button>
          {view === 'reports' && (
            <button
              onClick={exportCsv}
              className="px-3 py-1.5 rounded bg-slate-800 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
          )}
        </div>
      </div>

      {view === 'reports' && report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { label: 'Students', val: report.totals.students },
              { label: 'Trainers', val: report.totals.trainers },
              { label: 'Active Tests', val: report.totals.tests },
              { label: 'Avg Test Score', val: `${report.totals.avgTestScorePct}%` },
              { label: 'Pending Schedules', val: report.totals.pendingScheduleUpdates },
              { label: 'Feedback Avg', val: `${report.totals.avgFeedbackRating} ★` }
            ].map((item) => (
              <div key={item.label} className="bg-white rounded border border-slate-200 p-3 text-center">
                <div className="text-xl font-extrabold text-slate-800">{item.val}</div>
                <div className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded border border-slate-200 overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="p-3">Course</th>
                  <th className="p-3 text-center">Total Students</th>
                  <th className="p-3 text-center">Online</th>
                  <th className="p-3 text-center">Classroom</th>
                  <th className="p-3 text-center">Batch Allocated</th>
                  <th className="p-3 text-center">WhatsApp Synced</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(report.courseBreakdown || []).map((row) => (
                  <tr key={row.course} className="hover:bg-slate-50">
                    <td className="p-3 font-bold text-slate-800">{row.course}</td>
                    <td className="p-3 text-center font-semibold">{row.total}</td>
                    <td className="p-3 text-center">{row.online}</td>
                    <td className="p-3 text-center">{row.classroom}</td>
                    <td className="p-3 text-center font-bold text-emerald-700">{row.allocated}</td>
                    <td className="p-3 text-center font-bold text-cyan-700">{row.whatsappSynced}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {view === 'sop' && (
        <div className="space-y-4">
          {/* 6 Steps */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {SOP_STEPS.map((s) => (
              <div key={s.step} className="bg-white rounded border border-slate-200 p-4 space-y-2">
                <span className="px-2 py-0.5 rounded bg-[#00c0ef]/15 text-[#0086a8] text-[10px] font-extrabold uppercase">
                  {s.step}
                </span>
                <h4 className="text-xs font-bold text-slate-800">{s.title}</h4>
                <ul className="space-y-1">
                  {s.bullets.map((b, i) => (
                    <li key={i} className="text-[11px] text-slate-600 flex items-start gap-1.5">
                      <span className="text-[#00a65a] font-bold">•</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Feature-wise Portal Reflection Table */}
          <div className="bg-white rounded border border-slate-200 overflow-x-auto">
            <div className="px-4 py-3 border-b border-slate-200 font-bold text-xs text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#00a65a]" /> Feature-wise Explanation and Portal Reflection
            </div>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                  <th className="p-3">WiseApp Option</th>
                  <th className="p-3">How It Works</th>
                  <th className="p-3">What Reflects in the Portal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FEATURE_REFLECTION.map((row) => (
                  <tr key={row.option}>
                    <td className="p-3 font-bold text-slate-800">{row.option}</td>
                    <td className="p-3 text-slate-600">{row.how}</td>
                    <td className="p-3 text-slate-700">{row.reflect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Team Responsibilities & Best Practices */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#605ca8]" /> Team Responsibilities
              </h4>
              <div className="divide-y divide-slate-100 text-xs">
                {[
                  ['Students', 'Check relevant updates, participate in learning activities and share feedback.'],
                  ['Trainers', 'Update schedules and maintain accurate training information.'],
                  ['Team Leaders', 'Monitor updates and follow up with trainers on pending activities.'],
                  ['Team Managers', 'Coordinate operations and ensure agreed processes are followed.'],
                  ['Management', 'Review available information and take necessary operational decisions.']
                ].map(([team, resp]) => (
                  <div key={team} className="py-2 flex gap-3">
                    <span className="font-bold text-slate-800 w-28 shrink-0">{team}</span>
                    <span className="text-slate-600">{resp}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded border border-slate-200 p-4 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Best Practices & Expected Outcomes
              </h4>
              <ul className="space-y-1 text-xs text-slate-600">
                <li>• Update schedules without delay and communicate changes promptly.</li>
                <li>• Ensure all student, batch & allocation information is accurate.</li>
                <li>• Follow up on pending updates and complete assigned activities on time.</li>
                <li>• Use student feedback to drive continuous improvement in training quality.</li>
                <li>• Improved training coordination, student engagement, and trainer accountability.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
