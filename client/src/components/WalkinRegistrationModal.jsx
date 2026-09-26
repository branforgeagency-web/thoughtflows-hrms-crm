import React, { useState } from 'react';
import { X, Sparkles, Check, ArrowRight } from 'lucide-react';
import logoImg from '../assets/thoughtflows-logo.png';
import { COURSE_CATEGORIES } from '../constants/courses';

import { getCurrentMonthYear, getCurrentMonthName } from '../utils/dateUtils';

export default function WalkinRegistrationModal({ isOpen, onClose, onRegister, currentUser }) {
  if (!isOpen) return null;

  // Form Fields
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [sameAsMobile, setSameAsMobile] = useState(false);
  const [consultHr, setConsultHr] = useState(currentUser?.name || '');
  const [branch, setBranch] = useState(currentUser?.branch || 'Saravanampatti (CBE)');
  const [email, setEmail] = useState('');
  const [facebookId, setFacebookId] = useState('');
  const [education, setEducation] = useState('');
  const [passoutYear, setPassoutYear] = useState('');
  const [college, setCollege] = useState('');
  const [company, setCompany] = useState('');

  // Course & Mode
  const [courseType, setCourseType] = useState('Online'); // 'Online' | 'Offline'
  const [course, setCourse] = useState('MCT'); // 'MCT', 'AMCT', 'CPC', etc.
  
  // Knowledge source
  const [source, setSource] = useState('Social Media'); // 'Social Media', 'Word of Mouth', 'Online', 'Others'

  // Timings & Batch
  const [preferredTimings, setPreferredTimings] = useState('');
  const [batchType, setBatchType] = useState('Both'); // 'Weekends', 'Weekdays', 'Both'

  const [toastMsg, setToastMsg] = useState(null);

  const WALKIN_CATEGORIES = [
    ...COURSE_CATEGORIES.map(cat => ({
      category: cat.category,
      title: cat.title,
      items: cat.courses.map(c => c.code)
    })),
    {
      category: 'Others',
      title: 'Other Tracks',
      items: ['MCT', 'Others']
    }
  ];

  const SOURCES = [
    'Social Media',
    'Word of Mouth',
    'Online',
    'Others'
  ];

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Please enter candidate name');
      return;
    }
    if (!phone.trim()) {
      showToast('Please enter mobile number');
      return;
    }

    const finalWhatsApp = sameAsMobile ? phone.trim() : (whatsappNumber.trim() || phone.trim());

    const newStudent = {
      id: `TF${name.slice(0, 2).toUpperCase()}${Date.now().toString().slice(-4)}`,
      name: name.toUpperCase(),
      fatherName,
      address,
      dob,
      phone: phone.trim(),
      whatsappNumber: finalWhatsApp,
      additionalNumber: sameAsMobile ? '' : whatsappNumber.trim(),
      alternatePhone: sameAsMobile ? '' : whatsappNumber.trim(),
      email,
      facebookId,
      qualification: education,
      passoutYear,
      college,
      company,
      course,
      mode: courseType,
      source,
      batchTiming: preferredTimings || '8-10 PM Weekdays',
      batchType,
      batchDate: getCurrentMonthYear(),
      hrName: consultHr || currentUser?.name || '',
      branch: branch || currentUser?.branch || 'Saravanampatti',
      qualTag: education.toLowerCase().includes('bsc') || education.toLowerCase().includes('bpharm') ? 'Life Sci' : 'Grad',
      collegeCompany: college || company || 'Coimbatore',
      location: address.split(',')[0] || 'Saravanampatti',
      enqDate: getCurrentMonthName(),
      onboardStatus: '7/7 ✓',
      syllabusModule: 'Module 1',
      mockInterview: 'Pending',
      examStatus: 'Not Booked',
      certified: 'Non-certified',
      placementStatus: 'In course',
      feeStatus: 'Fully Paid',
      feeAmount: '₹25,000',
      statusGroup: 'in_course',
      registeredAt: new Date().toISOString()
    };

    if (onRegister) {
      onRegister(newStudent);
    }

    showToast(`✓ Registration for ${name} submitted successfully!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-6 right-6 z-[70] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Modal Container */}
      <div className="bg-white rounded-[28px] max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] my-auto text-left">
        
        {/* MODAL HEADER */}
        <div className="p-5 sm:p-6 pb-3 relative">
          <div className="flex items-center justify-between">
            {/* Thoughtflows Logo */}
            <div className="flex items-center">
              <img
                src={logoImg}
                alt="Thoughtflows - No.1 Medical Coding Academy"
                className="h-10 sm:h-12 w-auto object-contain"
              />
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-all cursor-pointer text-xs font-bold"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Centered Framed Registration Form Title */}
          <div className="mt-3 border-2 border-[#00695c] rounded-2xl py-2.5 sm:py-3 px-6 text-center">
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#00695c] tracking-tight">
              Registration Form
            </h2>
          </div>

          {/* Yellow Walk-in notice banner */}
          <div className="mt-3 bg-[#fef9c3]/80 border border-amber-200/90 text-amber-900 text-center py-2 px-4 rounded-xl text-xs font-semibold">
            Walk-in registration · You are entering this for the student
          </div>
        </div>

        {/* SCROLLABLE FORM BODY */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-5 sm:px-6 pb-6 space-y-4 text-xs font-sans">
          
          {/* Row 1: Name & Father's Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Father's Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fatherName}
                onChange={(e) => setFatherName(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
          </div>

          {/* Row 2: Address (Textarea) */}
          <div>
            <label className="block text-xs font-bold text-[#00695c] mb-1">
              Address <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows="2"
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
            />
          </div>

          {/* Row 3: Date of Birth & Primary Mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Date of Birth <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Primary Mobile <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                placeholder="10-digit mobile"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (sameAsMobile) setWhatsappNumber(e.target.value);
                }}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all font-mono"
              />
            </div>
          </div>

          {/* Row 4: WhatsApp / Additional Number & Consult HR Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1 h-4">
                <label className="text-xs font-bold text-[#00695c]">
                  WhatsApp / Addl No.
                </label>
                <label className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sameAsMobile}
                    onChange={(e) => {
                      setSameAsMobile(e.target.checked);
                      if (e.target.checked) setWhatsappNumber(phone);
                    }}
                    className="accent-[#00796b] rounded cursor-pointer"
                  />
                  <span>Same as mobile</span>
                </label>
              </div>
              <input
                type="tel"
                placeholder="WhatsApp / Alternate"
                value={sameAsMobile ? phone : whatsappNumber}
                disabled={sameAsMobile}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all font-mono disabled:bg-slate-100 disabled:text-slate-500"
              />
            </div>

            <div>
              <div className="flex items-center mb-1 h-4">
                <label className="block text-xs font-bold text-[#00695c]">
                  Consult HR Name <span className="text-rose-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  list="consult-hr-list"
                  placeholder="Select or enter HR counselor"
                  value={consultHr}
                  onChange={(e) => setConsultHr(e.target.value)}
                  className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all font-medium"
                />
                <datalist id="consult-hr-list">
                  <option value="Pooja J." />
                  <option value="Kalaiselvi M." />
                  <option value="Priyadharshini" />
                  <option value="Balaji R." />
                  <option value="Subha M." />
                  <option value="Ganesh N." />
                </datalist>
              </div>
            </div>
          </div>

          {/* Row 5: Email ID & Facebook ID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Email ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Facebook ID / Social
              </label>
              <input
                type="text"
                placeholder="Optional"
                value={facebookId}
                onChange={(e) => setFacebookId(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
          </div>

          {/* Row 6: Consultation Branch (optional) */}
          {branch && (
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Consultation Branch
              </label>
              <input
                type="text"
                placeholder="e.g. Saravanampatti (CBE)"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
          )}

          {/* Row 5: Education & Year of Passout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Education <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Year of Passout <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={passoutYear}
                onChange={(e) => setPassoutYear(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
          </div>

          {/* Row 6: College & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                College
              </label>
              <input
                type="text"
                value={college}
                onChange={(e) => setCollege(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1">
                Company
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>
          </div>

          {/* BOX 1: COURSE TYPE & COURSE SELECTION */}
          <div className="border border-slate-200/90 rounded-2xl p-4 bg-white/80 space-y-3.5 shadow-xs">
            {/* Course Type Radios */}
            <div>
              <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2">
                COURSE TYPE
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="courseType"
                    value="Online"
                    checked={courseType === 'Online'}
                    onChange={() => setCourseType('Online')}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>Online</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="courseType"
                    value="Offline"
                    checked={courseType === 'Offline'}
                    onChange={() => setCourseType('Offline')}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>Offline</span>
                </label>
              </div>
            </div>

            {/* Course Radios Grouped by Category */}
            <div>
              <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2.5">
                COURSE
              </div>
              <div className="space-y-3 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                {WALKIN_CATEGORIES.map((cat) => (
                  <div key={cat.category} className="space-y-1.5">
                    <div className="text-[10px] font-black uppercase tracking-wider text-teal-800">
                      {cat.title}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {cat.items.map((c) => (
                        <label key={c} className="flex items-center gap-1.5 cursor-pointer text-slate-800 font-semibold select-none text-xs hover:text-teal-800 transition-colors">
                          <input
                            type="radio"
                            name="course"
                            value={c}
                            checked={course === c}
                            onChange={() => setCourse(c)}
                            className="w-3.5 h-3.5 accent-[#00796b] cursor-pointer"
                          />
                          <span>{c}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOX 2: HOW DID YOU KNOW ABOUT THOUGHTFLOWS? */}
          <div className="border border-slate-200/90 rounded-2xl p-4 bg-white/80 shadow-xs">
            <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2.5">
              HOW DID YOU KNOW ABOUT THOUGHTFLOWS?
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {SOURCES.map((s) => (
                <label key={s} className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="source"
                    value={s}
                    checked={source === s}
                    onChange={() => setSource(s)}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>

          {/* BOX 3: PREFERRED CLASS TIMINGS & BATCH TYPE */}
          <div className="border border-slate-200/90 rounded-2xl p-4 bg-white/80 space-y-3 shadow-xs">
            <div>
              <label className="block text-xs font-bold text-[#00695c] mb-1.5">
                Preferred Class Timings <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 8-10 PM Weekdays"
                value={preferredTimings}
                onChange={(e) => setPreferredTimings(e.target.value)}
                className="w-full bg-slate-50/60 hover:bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 outline-none focus:border-[#00796b] transition-all"
              />
            </div>

            <div>
              <div className="text-xs font-black uppercase text-[#00695c] tracking-wider mb-2">
                BATCH TYPE
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="batchType"
                    value="Weekends"
                    checked={batchType === 'Weekends'}
                    onChange={() => setBatchType('Weekends')}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>Weekends</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="batchType"
                    value="Weekdays"
                    checked={batchType === 'Weekdays'}
                    onChange={() => setBatchType('Weekdays')}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>Weekdays</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-slate-800 font-semibold select-none">
                  <input
                    type="radio"
                    name="batchType"
                    value="Both"
                    checked={batchType === 'Both'}
                    onChange={() => setBatchType('Both')}
                    className="w-4 h-4 accent-[#00796b] cursor-pointer"
                  />
                  <span>Both</span>
                </label>
              </div>
            </div>
          </div>

          {/* FOOTER BUTTONS */}
          <div className="border-t border-slate-200/80 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#00796b] hover:bg-[#00695c] text-white font-bold text-xs shadow-md transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
            >
              <span>Continue → Terms & Submit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
