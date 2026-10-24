import React, { useState, useEffect } from 'react';
import {
  X,
  Star,
  Zap,
  Target,
  Folder,
  Check,
  ArrowRight,
  Sparkles,
  FileText,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Table,
  Upload,
  Download,
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { COURSE_CATEGORIES } from '../constants/courses';
import { QUALIFICATION_GROUPS } from '../constants/qualifications';
import {
  TIER_A_SOURCES,
  TIER_B_SOURCES,
  TIER_C_SOURCES,
  TIER_D_SOURCES,
  ALL_LEAD_SOURCES as ALL_SOURCES,
  PRIMARY_CATEGORIES,
  EXTRA_CATEGORIES
} from '../constants/leadSources';
import SearchableSelect from './SearchableSelect';
import { createLeadsBulk } from '../services/api';
import { parseGoogleSheetOrCsv, downloadSampleGoogleSheetTemplate } from '../utils/csvParser';

const CURRENT_YEAR = new Date().getFullYear();
const PASSOUT_YEARS = Array.from({ length: CURRENT_YEAR - 1980 + 1 }, (_, i) => String(CURRENT_YEAR - i));

export default function AddLeadModal({ isOpen, onClose, onAddLead, onBulkImported, initialMode = 'single', currentUser }) {
  if (!isOpen) return null;

  // Mode: 'single' (individual enquiry form) or 'bulk' (Google Sheet / CSV import)
  const [importMode, setImportMode] = useState(initialMode || 'single');

  // Selected Source (defaulting to #21 Facebook Job Post as in screenshot)
  const [selectedSourceId, setSelectedSourceId] = useState('s21');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [email, setEmail] = useState('');
  const [age, setAge] = useState('24');
  const [gender, setGender] = useState('Female');
  const [location, setLocation] = useState('Coimbatore');
  const [education, setEducation] = useState('');
  const [passoutYear, setPassoutYear] = useState('');
  const [interestedCourse, setInterestedCourse] = useState('AMCT Beginner (Classroom)');
  const [preferredBranch, setPreferredBranch] = useState(currentUser?.branch || 'Saravanampatti (CBE)');

  // Selected Category
  const [selectedCategory, setSelectedCategory] = useState('Fresh Graduate');
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Bulk Upload State
  const [bulkInputMethod, setBulkInputMethod] = useState('paste'); // 'paste' | 'file'
  const [pastedText, setPastedText] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [bulkDefaultCourse, setBulkDefaultCourse] = useState('AMCT Beginner (Classroom)');
  const [bulkDefaultSource, setBulkDefaultSource] = useState('Google Sheet Bulk Import');
  const [bulkDefaultCategory, setBulkDefaultCategory] = useState('Fresh Graduate');
  // Which month this sheet's enquiries belong to — bulk uploads are done one month's
  // batch at a time, often days/weeks after that month, so this is tracked separately
  // from the upload's own createdAt timestamp. "YYYY-MM".
  const [bulkDefaultMonth, setBulkDefaultMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Toast feedback
  const [toastMsg, setToastMsg] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setImportMode(initialMode || 'single');
      setSubmitError(null);
      setImportResult(null);
    }
  }, [isOpen, initialMode]);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleParseData = (textToParse = pastedText) => {
    if (!textToParse || !textToParse.trim()) {
      showToast('Please paste your Google Sheet data or select a CSV file first');
      return;
    }
    setIsParsing(true);
    setImportResult(null);
    try {
      const rows = parseGoogleSheetOrCsv(textToParse);
      setParsedRows(rows);
      if (rows.length === 0) {
        showToast('No valid rows detected. Please check the data.');
      } else {
        const validCount = rows.filter(r => r.isValid).length;
        showToast(`Parsed ${rows.length} rows (${validCount} ready to import)`);
      }
    } catch (err) {
      showToast(`Error parsing data: ${err.message}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result;
      if (typeof content === 'string') {
        setPastedText(content);
        handleParseData(content);
      }
    };
    reader.onerror = () => showToast('Failed to read file');
    reader.readAsText(file);
  };

  const handleBulkImport = async () => {
    const validRows = parsedRows.filter(r => r.isValid);
    if (!validRows.length) {
      showToast('No valid enquiries to import');
      return;
    }
    setIsImporting(true);
    try {
      const payloadLeads = validRows.map(r => ({
        fullName: r.fullName,
        name: r.fullName,
        phone: r.phone,
        whatsappNumber: r.whatsappNumber || r.phone,
        email: r.email,
        course: r.course || bulkDefaultCourse,
        branch: r.branch || currentUser?.branch || '',
        sourceName: r.sourceName || bulkDefaultSource,
        source: r.sourceName || bulkDefaultSource,
        category: r.category || bulkDefaultCategory,
        enquiryDate: r.enquiryDate || '',
        enquiryMonth: r.enquiryMonth || bulkDefaultMonth,
        stage: r.stage || 'new',
        counselorAssigned: r.counselorAssigned || currentUser?.name || '',
        allocatedTo: r.allocatedTo || r.counselorAssigned || currentUser?.name || '',
        spokenBy: r.spokenBy || r.counselorAssigned || currentUser?.name || '',
        education: r.education,
        passoutYear: r.passoutYear,
        location: r.location,
        notes: r.notes
      }));

      const res = await createLeadsBulk(payloadLeads, {
        defaultCourse: bulkDefaultCourse,
        defaultBranch: currentUser?.branch || '',
        defaultSource: bulkDefaultSource,
        defaultMonth: bulkDefaultMonth,
        defaultCounselor: currentUser?.name || ''
      });

      setImportResult(res);
      showToast(`✓ Successfully imported ${res.createdCount} enquiries to dashboard!`);
      if (onBulkImported) {
        onBulkImported(res);
      }
    } catch (err) {
      showToast(`Failed to import enquiries: ${err?.response?.data?.error || err.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const currentSelectedSource = ALL_SOURCES.find(s => s.id === selectedSourceId) || TIER_D_SOURCES[8];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('Please enter candidate full name');
      return;
    }
    if (!mobileNumber.trim()) {
      showToast('Please enter mobile number');
      return;
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      showToast("Please enter a valid email address");
      return;
    }

    const finalWhatsApp = sameAsMobile ? mobileNumber.trim() : (whatsappNumber.trim() || mobileNumber.trim());

    const newLead = {
      id: `lead-${Date.now()}`,
      name: fullName.trim(),
      phone: mobileNumber.trim(),
      whatsappNumber: finalWhatsApp,
      additionalNumber: sameAsMobile ? '' : whatsappNumber.trim(),
      alternatePhone: sameAsMobile ? '' : whatsappNumber.trim(),
      email: email.trim(),
      age,
      gender,
      location,
      education,
      passoutYear,
      course: interestedCourse,
      branch: preferredBranch,
      source: currentSelectedSource.name,
      sourceBadge: currentSelectedSource.badge,
      category: selectedCategory,
      createdAt: new Date().toISOString()
    };

    if (onAddLead) {
      try {
        setSubmitError(null);
        await onAddLead(newLead);
        showToast(`✓ Lead ${newLead.name} successfully added to dashboard!`);
        setTimeout(() => {
          onClose();
        }, 500);
      } catch (err) {
        const msg = err?.response?.data?.error || err.message || 'Failed to add lead';
        setSubmitError(msg);
        showToast(`⚠ ${msg}`);
      }
    } else {
      showToast(`✓ Lead ${newLead.name} successfully added to dashboard!`);
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  const renderSourceCard = (item, isCompact = false) => {
    const isSelected = selectedSourceId === item.id;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setSelectedSourceId(item.id)}
        className={`relative text-left p-3 rounded-2xl border transition-all flex flex-col justify-between cursor-pointer ${
          isSelected
            ? 'border-2 border-[#00a896] bg-[#f0faf8] shadow-sm'
            : 'border-slate-200/90 bg-white hover:border-teal-300 hover:shadow-xs'
        }`}
      >
        {isSelected && (
          <span className="absolute top-2.5 right-2.5 w-4 h-4 rounded-full bg-[#0e6977] text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
            <Check className="w-2.5 h-2.5 stroke-[3]" />
          </span>
        )}
        <div className="space-y-1 pr-4">
          <div className="text-[10px] font-mono text-slate-400 font-semibold">{item.num}</div>
          <div className="font-bold text-slate-900 text-xs leading-snug truncate">
            {item.name}
          </div>
          <div>
            <span className="inline-block text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
              {item.badge}
            </span>
          </div>
        </div>
        <div className="mt-2 text-[10.5px] font-mono font-semibold text-emerald-600">
          {item.volume}
        </div>
      </button>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Container */}
      <div className="bg-white rounded-[28px] max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] my-auto">
        
        {/* TOP BANNER */}
        <div className="bg-gradient-to-r from-[#00b49f] via-[#00a896] to-[#028090] p-5 sm:p-6 text-white relative flex items-start justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight">Add Enquiry</h2>
            <p className="text-[11px] font-mono font-bold tracking-widest text-teal-100/90 mt-1 uppercase">
              PICK SOURCE · CAPTURE DETAILS · ASSIGN CATEGORY · START CALL
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODE TABS: SINGLE ENQUIRY vs BULK UPLOAD */}
        <div className="bg-slate-100/90 border-b border-slate-200 px-5 sm:px-7 py-2.5 flex items-center justify-between gap-3 flex-shrink-0">
          <div className="inline-flex p-1 bg-slate-200/80 rounded-xl">
            <button
              type="button"
              onClick={() => { setImportMode('single'); setSubmitError(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                importMode === 'single'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-teal-600" />
              <span>Single Enquiry Form</span>
            </button>
            <button
              type="button"
              onClick={() => { setImportMode('bulk'); setSubmitError(null); }}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-2 cursor-pointer ${
                importMode === 'bulk'
                  ? 'bg-white text-[#0e6977] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bulk Upload (Google Sheet / CSV)</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-extrabold">
                Sheet
              </span>
            </button>
          </div>

          {importMode === 'bulk' && (
            <button
              type="button"
              onClick={downloadSampleGoogleSheetTemplate}
              className="text-xs font-bold text-teal-700 hover:text-teal-900 flex items-center gap-1.5 hover:underline cursor-pointer"
              title="Download pre-formatted Excel / Google Sheets CSV template"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download Sample Sheet Template</span>
              <span className="sm:hidden">Template</span>
            </button>
          )}
        </div>

        {/* SCROLLABLE BODY */}
        {importMode === 'single' ? (
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-7 space-y-8 text-left">
          
          {/* Submission Error Alert */}
          {submitError && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 text-rose-950 text-xs rounded-2xl shadow-sm animate-shake flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1 flex-1">
                <div className="font-extrabold uppercase tracking-wide text-rose-700 text-[11px]">
                  Duplicate Record / Enquiry Error
                </div>
                <div className="font-semibold text-rose-900 leading-relaxed text-xs">
                  {submitError}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 1: WHERE DID THIS LEAD COME FROM? */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  1
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Where did this lead come from?
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                32 sources tracked · pick one
              </span>
            </div>

            {/* Tier A: Top Producers */}
            <div className="space-y-2.5">
              <div className="bg-emerald-50/70 border border-emerald-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span className="text-xs font-extrabold text-emerald-950">
                    TIER A · Top Producers
                  </span>
                  <span className="text-[11px] font-mono text-emerald-800/80 hidden sm:inline">
                    Daily bread · 70% of all leads
                  </span>
                </div>
                <span className="bg-emerald-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~355/mo
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {TIER_A_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier B: Solid Performers */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-blue-50/70 border border-blue-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />
                  <span className="text-xs font-extrabold text-blue-950">
                    TIER B · Solid Performers
                  </span>
                  <span className="text-[11px] font-mono text-blue-800/80 hidden sm:inline">
                    Reliable channels worth optimizing
                  </span>
                </div>
                <span className="bg-blue-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~120/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {TIER_B_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier C: Moderate Volume */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-amber-50/70 border border-amber-200/60 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-extrabold text-amber-950">
                    TIER C · Moderate Volume
                  </span>
                  <span className="text-[11px] font-mono text-amber-800/80 hidden sm:inline">
                    Weekly contribution · niche but valuable
                  </span>
                </div>
                <span className="bg-amber-500 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~36/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {TIER_C_SOURCES.map((s) => renderSourceCard(s))}
              </div>
            </div>

            {/* Tier D: Long Tail */}
            <div className="space-y-2.5 pt-2">
              <div className="bg-slate-100/80 border border-slate-200 px-3.5 py-1.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-xs font-extrabold text-slate-900">
                    TIER D · Long Tail
                  </span>
                  <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                    Low volume but tracked for completeness · 20 sources
                  </span>
                </div>
                <span className="bg-slate-600 text-white font-mono text-[11px] font-bold px-2 py-0.5 rounded-md">
                  ~30/mo
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                {TIER_D_SOURCES.map((s) => renderSourceCard(s, true))}
              </div>
            </div>
          </div>

          {/* SECTION 2: CANDIDATE DETAILS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  2
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Candidate Details
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                All required for proper allocation
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Row 1: Full Name */}
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                  FULL NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Priya Ramesh"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                />
              </div>

              {/* Row 2: Mobile Number & WhatsApp / Additional Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5 h-4">
                    MOBILE NUMBER *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="98••••••••"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value);
                      if (sameAsMobile) setWhatsappNumber(e.target.value);
                    }}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5 h-4">
                    <label className="text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase">
                      WHATSAPP / ADDL NO.
                    </label>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={sameAsMobile}
                        onChange={(e) => {
                          setSameAsMobile(e.target.checked);
                          if (e.target.checked) setWhatsappNumber(mobileNumber);
                        }}
                        className="accent-[#0e6977] rounded cursor-pointer"
                      />
                      <span>Same as mobile</span>
                    </label>
                  </div>
                  <input
                    type="tel"
                    placeholder="WhatsApp / Alternate"
                    value={sameAsMobile ? mobileNumber : whatsappNumber}
                    disabled={sameAsMobile}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>

              {/* Row 3: Student Email */}
              <div>
                <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                  STUDENT EMAIL *
                </label>
                <input
                  type="email"
                  required
                  placeholder="student's existing email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                />
                <p className="text-[10px] text-slate-400 mt-1">Student dashboard login: this email + an auto-generated TF password.</p>
              </div>

              {/* Row 3: Age, Gender & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    AGE
                  </label>
                  <input
                    type="number"
                    placeholder="24"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    GENDER
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    LOCATION
                  </label>
                  <input
                    type="text"
                    placeholder="Coimbatore"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans"
                  />
                </div>
              </div>

              {/* Row 4: Education & Year of Passout */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    EDUCATION / GRADUATION
                  </label>
                  <SearchableSelect
                    value={education}
                    onChange={setEducation}
                    placeholder="— Select graduation —"
                    searchPlaceholder="Search qualification (e.g. BSc, Nursing, BPharm)..."
                    groups={QUALIFICATION_GROUPS}
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    YEAR OF PASSOUT
                  </label>
                  <select
                    value={passoutYear}
                    onChange={(e) => setPassoutYear(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="">— Select year —</option>
                    {PASSOUT_YEARS.map((y) => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: Interested Course & Preferred Branch */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    INTERESTED COURSE
                  </label>
                  <select
                    value={interestedCourse}
                    onChange={(e) => setInterestedCourse(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    {COURSE_CATEGORIES.map((cat) => (
                      <optgroup key={cat.category} label={cat.title}>
                        {cat.courses.map((c) => {
                          const val = c.code === c.name ? c.name : `${c.code} - ${c.name}`;
                          return (
                            <option key={c.code} value={val}>
                              {val}
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-bold font-mono tracking-wider text-slate-400 uppercase mb-1.5">
                    PREFERRED BRANCH
                  </label>
                  <select
                    value={preferredBranch}
                    onChange={(e) => setPreferredBranch(e.target.value)}
                    className="w-full bg-slate-50/70 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 outline-none focus:border-[#0e6977] transition-all font-sans cursor-pointer"
                  >
                    <option value="Ameerpet (Hyderabad)">Ameerpet (Hyderabad)</option>
                    <option value="Dilsukhnagar (Hyderabad)">Dilsukhnagar (Hyderabad)</option>
                    <option value="Gandhipuram (Coimbatore)">Gandhipuram (Coimbatore)</option>
                    <option value="Hopes (Coimbatore)">Hopes (Coimbatore)</option>
                    <option value="Kochi (Kerala)">Kochi (Kerala)</option>
                    <option value="Salem (Tamil Nadu)">Salem (Tamil Nadu)</option>
                    <option value="Saravanampatti (Coimbatore)">Saravanampatti (Coimbatore)</option>
                    <option value="Tirupati (Andhra Pradesh)">Tirupati (Andhra Pradesh)</option>
                    <option value="Trichy (Tamil Nadu)">Trichy (Tamil Nadu)</option>
                    <option value="Trivandrum (Kerala)">Trivandrum (Kerala)</option>
                    <option value="Vizag (Andhra Pradesh)">Vizag (Andhra Pradesh)</option>
                    <option value="Pune (Maharashtra)">Pune (Maharashtra)</option>
                    <option value="Kollapur (Maharashtra)">Kollapur (Maharashtra)</option>
                    <option value="Theni (Tamil Nadu)">Theni (Tamil Nadu)</option>
                    <option value="Online Live (Virtual)">Online Live (Virtual)</option>
                    <option value="Not Mentioned">Not Mentioned</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: LEAD CATEGORY */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-6 h-6 rounded-full bg-[#0e6977] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  3
                </span>
                <h3 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Lead Category
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-400 font-medium">
                Drives the action plan + script during call
              </span>
            </div>

            {/* Categories Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
              {PRIMARY_CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.label;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.label)}
                    className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                      isSelected
                        ? 'border-2 border-[#0e6977] bg-[#e6fffa] text-[#00695c] font-bold shadow-xs'
                        : 'border-slate-200/90 bg-white hover:border-teal-300 text-slate-800'
                    }`}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-xs truncate">{cat.label}</span>
                  </button>
                );
              })}

              {/* Expand Extra Categories Button */}
              <button
                type="button"
                onClick={() => setShowMoreCategories(!showMoreCategories)}
                className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2 cursor-pointer text-left ${
                  showMoreCategories
                    ? 'border-[#0e6977] bg-teal-50/50 text-[#0e6977] font-bold'
                    : 'border-teal-400 bg-teal-50/20 hover:bg-teal-50/50 text-teal-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#0e6977]" />
                  <span className="text-xs font-bold">
                    {showMoreCategories ? 'Show Less' : '+ 11 more categories'}
                  </span>
                </div>
                {showMoreCategories ? (
                  <ChevronUp className="w-4 h-4 text-[#0e6977]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#0e6977]" />
                )}
              </button>
            </div>

            {/* Render Extra 11 Categories when expanded */}
            {showMoreCategories && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-2 animate-in fade-in">
                {EXTRA_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.label;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.label)}
                      className={`p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer text-left ${
                        isSelected
                          ? 'border-2 border-[#0e6977] bg-[#e6fffa] text-[#00695c] font-bold shadow-xs'
                          : 'border-slate-200/90 bg-white hover:border-teal-300 text-slate-800'
                      }`}
                    >
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-xs truncate">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* BOTTOM STICKY FOOTER */}
          <div className="sticky -bottom-5 sm:-bottom-7 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-5 sm:px-7 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-20">
            <div className="text-xs font-mono text-slate-500">
              Selected: <strong className="text-slate-900 font-bold">{currentSelectedSource?.name}</strong> ·{' '}
              <span className="text-teal-700 font-semibold">{selectedCategory}</span>
            </div>

            <button
              type="submit"
              className="bg-[#0e6977] hover:bg-[#0a4f5a] text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Add Enquiry to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
        ) : (
          <div className="overflow-y-auto p-5 sm:p-7 space-y-6 text-left flex-1">
            {/* IMPORT RESULTS VIEW (When submitted and report is ready) */}
            {importResult ? (
              <div className="space-y-6">
                <div className="p-6 bg-emerald-50 border-2 border-emerald-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-emerald-950 text-base">Bulk Import Complete!</h4>
                      <p className="text-xs text-emerald-800 font-medium mt-1">
                        Successfully added <strong className="font-bold text-emerald-900">{importResult.createdCount}</strong> new enquiries to the CRM pipeline.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => {
                        setImportResult(null);
                        setParsedRows([]);
                        setPastedText('');
                      }}
                      className="px-4 py-2 bg-white border border-emerald-300 hover:bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Import Another Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
                    >
                      Done & View Dashboard
                    </button>
                  </div>
                </div>

                {/* Duplicates Report (if any skipped) */}
                {importResult.duplicateCount > 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>{importResult.duplicateCount} Duplicate Enquiries Skipped (Already Registered)</span>
                    </div>
                    <p className="text-xs text-amber-800">
                      The following leads already exist in your CRM database with identical mobile numbers or email IDs to prevent duplicate calls:
                    </p>
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {importResult.duplicates.map((dup, i) => (
                        <div key={i} className="text-xs bg-white/90 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800">{dup.name || 'Candidate'}</span>
                            <span className="text-slate-500 font-mono ml-2">({dup.phone || dup.email})</span>
                          </div>
                          <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                            {dup.error || 'Duplicate record'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Invalid rows Report (if any skipped) */}
                {importResult.invalidCount > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2">
                    <div className="flex items-center gap-2 text-rose-900 font-bold text-xs uppercase tracking-wide">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{importResult.invalidCount} Invalid Rows Skipped</span>
                    </div>
                    <p className="text-xs text-rose-800">
                      Rows skipped due to missing candidate name or phone numbers with less than 10 digits.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* UPLOAD / PASTE WORKFLOW */
              <>
                {/* Step 1 banner & Method Switcher */}
                <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0e6977] flex items-center justify-center font-bold text-sm flex-shrink-0">
                      1
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">Choose Import Method</h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Copy cells from Google Sheets and paste below, or upload a .csv / .tsv file
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-auto">
                    <button
                      type="button"
                      onClick={() => setBulkInputMethod('paste')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                        bulkInputMethod === 'paste'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Table className="w-3.5 h-3.5" />
                      <span>Copy-Paste Sheet</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setBulkInputMethod('file')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                        bulkInputMethod === 'file'
                          ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload CSV / File</span>
                    </button>
                  </div>
                </div>

                {/* Default Values Strip (Fallbacks if not provided per row in the sheet) */}
                <div className="bg-white border border-slate-200 p-4 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span>Default Fallback Values (applied when row cell is blank in Google Sheet)</span>
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">Optional</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Enquiry Month
                      </label>
                      <input
                        type="month"
                        value={bulkDefaultMonth}
                        onChange={(e) => setBulkDefaultMonth(e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-teal-500"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Default Course
                      </label>
                      <select
                        value={bulkDefaultCourse}
                        onChange={(e) => setBulkDefaultCourse(e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-teal-500"
                      >
                        <option value="AMCT Beginner (Classroom)">AMCT Beginner (Classroom)</option>
                        <option value="AMCT Advanced (Master Class)">AMCT Advanced (Master Class)</option>
                        <option value="CPCT - Certificate in Professional Clinical Trials">CPCT - Clinical Trials</option>
                        <option value="Clinical Research & Pharmacovigilance Combo">CR & Pharmacovigilance Combo</option>
                        <option value="Regulatory Affairs & Medical Writing">Regulatory Affairs</option>
                        <option value="Healthcare Data Analytics">Healthcare Data Analytics</option>
                        <option value="Medical Coding Certified Specialist">Medical Coding</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Default Source
                      </label>
                      <input
                        type="text"
                        value={bulkDefaultSource}
                        onChange={(e) => setBulkDefaultSource(e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-teal-500"
                        placeholder="Google Sheet Bulk Upload"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">
                        Default Category
                      </label>
                      <select
                        value={bulkDefaultCategory}
                        onChange={(e) => setBulkDefaultCategory(e.target.value)}
                        className="w-full text-xs font-semibold p-2 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:border-teal-500"
                      >
                        <option value="Fresh Graduate">Fresh Graduate</option>
                        <option value="Job Seeker">Job Seeker</option>
                        <option value="Working Professional">Working Professional</option>
                        <option value="College Final Year">College Final Year</option>
                        <option value="Career Break / Relaunch">Career Break / Relaunch</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Input Methods */}
                {bulkInputMethod === 'paste' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <span>Paste Google Sheet Data</span>
                        <span className="text-[11px] font-normal text-slate-500">(select cells in Sheet, press Ctrl+C, then Ctrl+V here)</span>
                      </label>
                      {pastedText && (
                        <button
                          type="button"
                          onClick={() => {
                            setPastedText('');
                            setParsedRows([]);
                          }}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    <textarea
                      rows={6}
                      value={pastedText}
                      onChange={(e) => {
                        setPastedText(e.target.value);
                        if (e.target.value.trim()) handleParseData(e.target.value);
                      }}
                      placeholder={`Candidate Name\tMobile Number\tWhatsApp\tEmail\tCourse\tBranch\tSource\tEducation\tYear\tLocation\tNotes\nPriya Sharma\t9876543210\t9876543210\tpriya@gmail.com\tAMCT Beginner\tSaravanampatti (CBE)\tGoogle Sheet\tB.Pharm\t2024\tCoimbatore\tInterested in weekend batch`}
                      className="w-full font-mono text-[11px] p-3.5 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none bg-slate-50/50 leading-relaxed"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
                        Columns are automatically recognized (Name, Mobile, WhatsApp, Email, Course, Branch, Source, etc.)
                      </span>
                      <button
                        type="button"
                        onClick={() => handleParseData()}
                        disabled={!pastedText.trim() || isParsing}
                        className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Table className="w-3.5 h-3.5" />
                        <span>Parse Data</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-teal-300 hover:border-teal-500 rounded-2xl p-8 bg-teal-50/20 text-center transition-all cursor-pointer relative">
                      <input
                        type="file"
                        accept=".csv,.tsv,.txt"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto mb-3">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h5 className="font-extrabold text-slate-900 text-sm">Upload Google Sheet Export or CSV</h5>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                        Download your Google Sheet as CSV (File → Download → Comma Separated Values .csv) and drop it here.
                      </p>
                      <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-100 text-[#0e6977] text-xs font-mono font-bold">
                        Supported: .csv, .tsv, .txt
                      </div>
                    </div>
                  </div>
                )}

                {/* Live Data Preview Table */}
                {parsedRows.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-3">
                        <h4 className="font-extrabold text-slate-900 text-sm">Preview Upload Data</h4>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {parsedRows.length} total rows
                        </span>
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {parsedRows.filter(r => r.isValid).length} ready
                        </span>
                        {parsedRows.filter(r => r.errorReason).length > 0 && (
                          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800">
                            {parsedRows.filter(r => r.errorReason).length} missing name/mobile — will still import
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">
                        Review rows before importing
                      </span>
                    </div>

                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                      <div className="max-h-64 overflow-y-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100/90 text-slate-700 text-[10.5px] uppercase font-mono font-bold sticky top-0 z-10 border-b border-slate-200">
                            <tr>
                              <th className="p-2.5 pl-3">#</th>
                              <th className="p-2.5">Status</th>
                              <th className="p-2.5">Candidate Name</th>
                              <th className="p-2.5">Mobile</th>
                              <th className="p-2.5">WhatsApp</th>
                              <th className="p-2.5">Email</th>
                              <th className="p-2.5">Course</th>
                              <th className="p-2.5">Source</th>
                              <th className="p-2.5">Allocated To</th>
                              <th className="p-2.5">Category</th>
                              <th className="p-2.5">Edu / Year</th>
                              <th className="p-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium">
                            {parsedRows.map((r, idx) => (
                              <tr
                                key={idx}
                                className={`hover:bg-slate-50/80 transition-colors ${
                                  r.errorReason ? 'bg-amber-50/40' : ''
                                }`}
                              >
                                <td className="p-2.5 pl-3 font-mono text-slate-400 text-[11px]">
                                  {idx + 1}
                                </td>
                                <td className="p-2.5">
                                  {/* Every row imports — missing name / invalid mobile is a
                                      heads-up, never a block. */}
                                  {r.errorReason ? (
                                    <span
                                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200"
                                      title={`${r.errorReason} — will still be imported`}
                                    >
                                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                                      {r.errorReason}
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                      Ready
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 font-bold text-slate-900">
                                  {r.fullName || <span className="text-rose-500 italic">Missing Name</span>}
                                </td>
                                <td className="p-2.5 font-mono text-slate-800">
                                  {r.phone || <span className="text-rose-500 italic">Missing Phone</span>}
                                </td>
                                <td className="p-2.5 font-mono text-slate-600">
                                  {r.whatsappNumber || r.phone || '-'}
                                </td>
                                <td className="p-2.5 text-slate-600 truncate max-w-[140px]">
                                  {r.email || '-'}
                                </td>
                                <td className="p-2.5 text-slate-700 truncate max-w-[140px]">
                                  {r.course ? (
                                    r.course
                                  ) : (
                                    <span className="text-teal-700 text-[10px] font-mono bg-teal-50 px-1.5 py-0.5 rounded">
                                      {bulkDefaultCourse}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700 truncate max-w-[120px]">
                                  {r.sourceName ? (
                                    r.sourceName
                                  ) : (
                                    <span className="text-slate-500 text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                                      {bulkDefaultSource}
                                    </span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700 truncate max-w-[130px]">
                                  {r.counselorAssigned || r.spokenBy ? (
                                    <div className="flex flex-col">
                                      <span className="font-bold text-slate-900">{r.counselorAssigned || r.spokenBy}</span>
                                      {r.spokenBy && r.spokenBy !== r.counselorAssigned && (
                                        <span className="text-[10px] text-slate-400 font-mono">Spoken: {r.spokenBy}</span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 font-mono text-[10px]">{currentUser?.name || '-'}</span>
                                  )}
                                </td>
                                <td className="p-2.5 text-slate-700 truncate max-w-[120px]">
                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-semibold">
                                    {r.category || 'Enquiry'}
                                  </span>
                                </td>
                                <td className="p-2.5 text-slate-600 text-[11px]">
                                  {[r.education, r.passoutYear].filter(Boolean).join(' ') || '-'}
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setParsedRows(prev => prev.filter((_, i) => i !== idx))}
                                    className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                    title="Remove row from import"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* BOTTOM STICKY FOOTER FOR BULK IMPORT */}
                <div className="sticky -bottom-5 sm:-bottom-7 -mx-5 sm:-mx-7 -mb-5 sm:-mb-7 bg-slate-50/95 backdrop-blur-md border-t border-slate-200 px-5 sm:px-7 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg z-20">
                  <div className="text-xs font-mono text-slate-600">
                    {parsedRows.length > 0 ? (
                      <>
                        Ready to import:{' '}
                        <strong className="text-emerald-700 font-bold">
                          {parsedRows.filter(r => r.isValid).length}
                        </strong>{' '}
                        valid enquiries into CRM
                      </>
                    ) : (
                      <span>Paste Google Sheet data above or upload a CSV file to preview.</span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkImport}
                      disabled={isImporting || parsedRows.filter(r => r.isValid).length === 0}
                      className="bg-[#0e6977] hover:bg-[#0a4f5a] disabled:opacity-50 text-white font-bold text-xs sm:text-sm px-6 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isImporting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Importing Enquiries...</span>
                        </>
                      ) : (
                        <>
                          <span>
                            Import {parsedRows.filter(r => r.isValid).length || ''} Enquiries to Dashboard
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
