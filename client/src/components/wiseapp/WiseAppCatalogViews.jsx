import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Building2,
  FileText,
  BookOpen,
  Bell,
  Newspaper,
  ListChecks,
  Layers,
  Video,
  X
} from 'lucide-react';
import {
  getWiseAppCatalog,
  createWiseAppCatalogItem,
  updateWiseAppCatalogItem,
  deleteWiseAppCatalogItem,
  getWiseAppCenters
} from '../../services/api';

const CATALOG_META = {
  course: {
    title: 'Courses',
    subtitle: 'Manage parent medical coding courses offered in WiseApp.',
    accent: 'border-t-[#00c0ef]',
    btn: 'bg-[#00c0ef] hover:bg-[#00acd6]',
    icon: BookOpen,
    parentLabel: 'Course Code / Category',
    bodyLabel: 'Course Description / Overview',
    hasFile: false
  },
  sub_course: {
    title: 'Sub Courses',
    subtitle: 'Organize specialized tracks and sub-modules under each Course.',
    accent: 'border-t-[#00a65a]',
    btn: 'bg-[#00a65a] hover:bg-[#008d4c]',
    icon: Layers,
    parentLabel: 'Parent Course (e.g. CPC)',
    bodyLabel: 'Sub Course Scope',
    hasFile: false
  },
  subject: {
    title: 'Subjects',
    subtitle: 'Define medical coding subjects (Anatomy, ICD-10-CM, CPT, HCPCS).',
    accent: 'border-t-[#f39c12]',
    btn: 'bg-[#f39c12] hover:bg-[#db8b0b]',
    icon: BookOpen,
    parentLabel: 'Course / Track',
    bodyLabel: 'Subject Notes',
    hasFile: false
  },
  chapter: {
    title: 'Chapters',
    subtitle: 'Manage curriculum chapters mapped to subjects and AAPC guidelines.',
    accent: 'border-t-[#dd4b39]',
    btn: 'bg-[#dd4b39] hover:bg-[#c64333]',
    icon: ListChecks,
    parentLabel: 'Parent Subject',
    bodyLabel: 'Chapter Objectives',
    hasFile: false
  },
  topic: {
    title: 'Topics',
    subtitle: 'Break chapters into focused daily study & practice topics.',
    accent: 'border-t-[#605ca8]',
    btn: 'bg-[#605ca8] hover:bg-[#555299]',
    icon: ListChecks,
    parentLabel: 'Parent Chapter',
    bodyLabel: 'Topic Summary',
    hasFile: false
  },
  instruction_file: {
    title: 'Instruction Files',
    subtitle: 'Upload and link WiseApp onboarding, exam & coding instruction files.',
    accent: 'border-t-[#00c0ef]',
    btn: 'bg-[#00c0ef] hover:bg-[#00acd6]',
    icon: FileText,
    parentLabel: 'Course / Audience',
    bodyLabel: 'Instructions / Notes',
    hasFile: true
  },
  document: {
    title: 'Documents',
    subtitle: 'Publish downloadable academy documents and reference sheets.',
    accent: 'border-t-[#00a65a]',
    btn: 'bg-[#00a65a] hover:bg-[#008d4c]',
    icon: FileText,
    parentLabel: 'Category / Course',
    bodyLabel: 'Document Summary',
    hasFile: true
  },
  news: {
    title: 'News',
    subtitle: 'Publish AAPC exam updates, batch announcements & academy news.',
    accent: 'border-t-[#f39c12]',
    btn: 'bg-[#f39c12] hover:bg-[#db8b0b]',
    icon: Newspaper,
    parentLabel: 'Category (Exam / Batch / General)',
    bodyLabel: 'News Content',
    hasFile: false
  },
  notification: {
    title: 'Notifications',
    subtitle: 'Send schedule reminders, test alerts & onboarding notices to teams and students.',
    accent: 'border-t-[#dd4b39]',
    btn: 'bg-[#dd4b39] hover:bg-[#c64333]',
    icon: Bell,
    parentLabel: 'Target Audience (Students / Trainers / All)',
    bodyLabel: 'Notification Message',
    hasFile: false
  },
  passage: {
    title: 'Passages',
    subtitle: 'Create clinical case-study & operative note passages for medical coding questions.',
    accent: 'border-t-[#dd4b39]',
    btn: 'bg-[#dd4b39] hover:bg-[#c64333]',
    icon: FileText,
    parentLabel: 'Course / Specialty (e.g. CPT Surgery)',
    bodyLabel: 'Clinical Passage / Operative Note Text',
    hasFile: false
  },
  instruction_part: {
    title: 'Instructions Parts',
    subtitle: 'Manage reusable test section instructions and exam rules.',
    accent: 'border-t-[#605ca8]',
    btn: 'bg-[#605ca8] hover:bg-[#555299]',
    icon: ListChecks,
    parentLabel: 'Test Section / Course',
    bodyLabel: 'Instruction Part Details',
    hasFile: false
  },
  test_series: {
    title: 'Test Series',
    subtitle: 'Group mock exams and weekly quizzes into structured Test Series.',
    accent: 'border-t-[#00c0ef]',
    btn: 'bg-[#00c0ef] hover:bg-[#00acd6]',
    icon: Layers,
    parentLabel: 'Course (e.g. CPC)',
    bodyLabel: 'Included Tests & Schedule Description',
    hasFile: false,
    hasCount: true,
    countLabel: 'Tests Count'
  },
  video_series: {
    title: 'Video Series',
    subtitle: 'Organize recorded lectures into sequential chapter-wise Video Series.',
    accent: 'border-t-[#00a65a]',
    btn: 'bg-[#00a65a] hover:bg-[#008d4c]',
    icon: Video,
    parentLabel: 'Course / Subject',
    bodyLabel: 'Playlist / Series Outline',
    hasFile: true,
    hasCount: true,
    countLabel: 'Videos Count'
  },
  pdf: {
    title: 'Manage PDFs',
    subtitle: 'Manage ICD-10-CM, CPT coding PDFs, study guides & downloadable handouts.',
    accent: 'border-t-[#a94442]',
    btn: 'bg-[#a94442] hover:bg-[#953b39]',
    icon: FileText,
    parentLabel: 'Course / Chapter',
    bodyLabel: 'PDF Description',
    hasFile: true
  }
};

export function WiseAppCatalogSection({ kind }) {
  const meta = CATALOG_META[kind] || CATALOG_META.course;
  const Icon = meta.icon;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    title: '',
    code: '',
    parentName: '',
    course: 'CPC',
    description: '',
    fileUrl: '',
    linkedCount: 0,
    targetAudience: 'All',
    status: 'Active'
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await getWiseAppCatalog({ kind, q: search });
      setItems(Array.isArray(data) ? data : []);
    } catch (_) {
      setItems([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    setShowForm(false);
    setEditing(null);
    setMsg('');
    load();
  }, [kind]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      title: '',
      code: '',
      parentName: '',
      course: 'CPC',
      description: '',
      fileUrl: '',
      linkedCount: 0,
      targetAudience: 'All',
      status: 'Active'
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateWiseAppCatalogItem(editing._id, form);
        setMsg(`${meta.title} item updated.`);
      } else {
        await createWiseAppCatalogItem({ ...form, kind });
        setMsg(`${meta.title} item added.`);
      }
      setShowForm(false);
      resetForm();
      await load();
    } catch (err) {
      setMsg(err?.response?.data?.error || 'Could not save item.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item?')) return;
    await deleteWiseAppCatalogItem(id);
    await load();
  };

  const filtered = items.filter((it) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      (it.title || '').toLowerCase().includes(s) ||
      (it.parentName || '').toLowerCase().includes(s) ||
      (it.description || '').toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-4">
      <div className={`bg-white rounded border border-slate-200 border-t-[3px] ${meta.accent} p-4 shadow-xs`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Icon className="w-4 h-4 text-slate-600" />
              {meta.title}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setShowForm(!showForm);
            }}
            className={`px-3.5 py-1.5 rounded text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer ${meta.btn}`}
          >
            <Plus className="w-3.5 h-3.5" /> Add {meta.title.replace(/s$/, '')}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${meta.title.toLowerCase()}...`}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded text-xs"
            />
          </div>
          <span className="text-xs font-semibold text-slate-500">{filtered.length} entries</span>
        </div>

        {msg && (
          <div className="mt-3 px-3 py-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex justify-between">
            <span>{msg}</span>
            <button onClick={() => setMsg('')}>×</button>
          </div>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSave} className="bg-white rounded border border-slate-200 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {editing ? `Edit ${meta.title}` : `New ${meta.title}`}
            </h4>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Title *"
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <input
              value={form.parentName}
              onChange={(e) => setForm({ ...form, parentName: e.target.value })}
              placeholder={meta.parentLabel}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs"
            />
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-1.5 border border-slate-200 rounded text-xs bg-white"
            >
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>
            {meta.hasFile && (
              <input
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
                placeholder="File / PDF / Link URL"
                className="px-3 py-1.5 border border-slate-200 rounded text-xs sm:col-span-2"
              />
            )}
            {meta.hasCount && (
              <input
                type="number"
                value={form.linkedCount}
                onChange={(e) => setForm({ ...form, linkedCount: e.target.value })}
                placeholder={meta.countLabel}
                className="px-3 py-1.5 border border-slate-200 rounded text-xs"
              />
            )}
          </div>
          <textarea
            rows={kind === 'passage' ? 4 : 2}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder={meta.bodyLabel}
            className="w-full px-3 py-2 border border-slate-200 rounded text-xs"
          />
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded border border-slate-200 text-xs">Cancel</button>
            <button type="submit" className={`px-4 py-1.5 rounded text-white text-xs font-bold cursor-pointer ${meta.btn}`}>
              {editing ? 'Update' : 'Save'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading {meta.title.toLowerCase()}...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            No {meta.title.toLowerCase()} added yet. Click "Add" above to create one.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((item) => (
              <div key={item._id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50/60">
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-slate-800">{item.title}</span>
                    {item.parentName && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                        {item.parentName}
                      </span>
                    )}
                    {meta.hasCount && item.linkedCount > 0 && (
                      <span className="px-2 py-0.5 rounded bg-cyan-50 text-cyan-700 text-[10px] font-bold">
                        {item.linkedCount} items
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      item.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                  {item.description && (
                    <p className="text-xs text-slate-600 whitespace-pre-line">{item.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Open
                    </a>
                  )}
                  <button
                    onClick={() => {
                      setEditing(item);
                      setForm({
                        title: item.title || '',
                        code: item.code || '',
                        parentName: item.parentName || '',
                        course: item.course || 'CPC',
                        description: item.description || '',
                        fileUrl: item.fileUrl || '',
                        linkedCount: item.linkedCount || 0,
                        targetAudience: item.targetAudience || 'All',
                        status: item.status || 'Active'
                      });
                      setShowForm(true);
                    }}
                    className="p-1.5 rounded border border-slate-200 text-slate-600 hover:bg-slate-100 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(item._id)}
                    className="p-1.5 rounded border border-slate-200 text-rose-600 hover:bg-rose-50 cursor-pointer"
                  >
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

export function WiseAppCentersSection() {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getWiseAppCenters()
      .then((d) => setCenters(Array.isArray(d) ? d : []))
      .catch(() => setCenters([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00a65a] p-4 shadow-xs">
        <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#00a65a]" />
          Institute → Centers & Branches
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          All active Thoughtflows academy centers synced with live student and trainer counts.
        </p>
      </div>

      {loading ? (
        <div className="bg-white rounded border border-slate-200 p-8 text-center text-xs text-slate-400">Loading centers...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {centers.map((c) => (
            <div key={c._id || c.name} className="bg-white rounded border border-slate-200 p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">{c.name}</h4>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                  {c.code || 'CENTER'}
                </span>
              </div>
              <div className="text-xs text-slate-500">{c.city || 'India'} · Manager: <strong className="text-slate-700">{c.manager || 'Assigned'}</strong></div>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">{c.studentCount || 0} Students</span>
                <span className="font-semibold text-slate-700">{c.trainerCount || 0} Trainers</span>
                <span className="text-slate-500">Cap: {c.capacity || '—'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
