import React, { useState, useMemo } from 'react';
import { Lightbulb, Search, X, Star, Phone, Briefcase } from 'lucide-react';

// Canonical course codes match GenerateStudentIdModal's COURSE_MAP (AB, AI, AA, C, F)
// so this catalog stays consistent with the rest of the app.
const COURSES = [
  // AAPC CERTIFICATIONS
  {
    code: 'CPC',
    track: 'AAPC CERTIFICATIONS',
    icon: '🎯',
    title: 'CPC – Certified Professional Coder',
    oldFee: 22000,
    standardFee: 16000,
    newFee: 15000,
    discount: 7000,
    days: 90,
    eligibility: 'Life sciences / pharmacy / nursing / non-science graduates',
    tag: 'AAPC USA credential · Outpatient Physician Practice',
    examFeeNote: 'AAPC exam voucher ₹22,000 + AAPC annual membership',
    salaryPotential: '₹25–35k starting package with MNC placement',
    syllabus: 'Anatomy, Medical Terminology, ICD-10-CM, CPT Surgery, Evaluation & Management, HCPCS Level II',
    starred: true
  },
  {
    code: 'CIC',
    track: 'AAPC CERTIFICATIONS',
    icon: '🏥',
    title: 'CIC – Certified Inpatient Coder',
    oldFee: 29000,
    newFee: 25000,
    discount: 4000,
    days: 120,
    eligibility: 'Experienced coders / hospital inpatient aspiring specialists',
    tag: 'Hospital Inpatient & Facility Care',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹30–45k starting package in hospital operations',
    syllabus: 'Inpatient hospital facility coding, ICD-10-PCS procedural system, MS-DRG reimbursement guidelines',
    starred: true
  },
  {
    code: 'CPMA',
    track: 'AAPC CERTIFICATIONS',
    icon: '🔍',
    title: 'CPMA – Certified Professional Medical Auditor',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Certified coders / senior medical reviewers',
    tag: 'Auditing, Compliance & Fraud Prevention',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹35–50k as certified auditor',
    syllabus: 'Medical chart audit techniques, risk analysis, compliance rules, RAC & OIG audits, provider feedback',
    starred: false
  },
  {
    code: 'COC',
    track: 'AAPC CERTIFICATIONS',
    icon: '🏢',
    title: 'COC – Certified Outpatient Coder',
    oldFee: 25000,
    newFee: 21000,
    discount: 4000,
    days: 90,
    eligibility: 'Graduates looking for ambulatory surgical center (ASC) specialization',
    tag: 'Hospital Outpatient & Ambulatory Centers',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹25–35k starting package',
    syllabus: 'Outpatient prospective payment system (OPPS), APC payment methodology, ASC surgical coding, CMS rules',
    starred: false
  },
  {
    code: 'CRC',
    track: 'AAPC CERTIFICATIONS',
    icon: '📈',
    title: 'CRC – Certified Risk Adjustment Coder',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Life sciences / coders seeking rapid career advancement',
    tag: 'Risk Adjustment & Medicare Advantage HCC',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹28–38k starting package',
    syllabus: 'Hierarchical Condition Categories (HCC), CMS-HCC and HHS-HCC models, ICD-10-CM chronic conditions capture',
    starred: false
  },
  {
    code: 'CPB',
    track: 'AAPC CERTIFICATIONS',
    icon: '💳',
    title: 'CPB – Certified Professional Biller',
    oldFee: 20000,
    newFee: 17000,
    discount: 3000,
    days: 60,
    eligibility: 'Any graduate / commerce / life science interested in US Healthcare RCM',
    tag: 'Revenue Cycle Management & Medical Billing',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹22–30k starting package',
    syllabus: 'Medical billing cycle, claim generation CMS-1500 & UB-04, denial management, appeals, HIPAA & privacy',
    starred: false
  },
  {
    code: 'CEDC',
    track: 'AAPC CERTIFICATIONS',
    icon: '🚑',
    title: 'CEDC – Certified Emergency Department Coder',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'CPC certified coders / ED nursing specialists',
    tag: 'Emergency Department Specialist',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹28–40k starting package',
    syllabus: 'Emergency department triage, rapid evaluation levels, fracture care, laceration repairs, trauma coding',
    starred: false
  },
  {
    code: 'CEMC',
    track: 'AAPC CERTIFICATIONS',
    icon: '📋',
    title: 'CEMC – Certified Evaluation & Management Coder',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Coders with CPC or CPT knowledge',
    tag: 'Evaluation and Management Specialist',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹30–42k starting package',
    syllabus: 'AMA CPT 2023+ E/M guidelines, Medical Decision Making (MDM) complexity, prolonged services, time-based codes',
    starred: false
  },
  {
    code: 'CDEO',
    track: 'AAPC CERTIFICATIONS',
    icon: '📝',
    title: 'CDEO – Documentation Expert Outpatient',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Coders / healthcare graduates with clinical interest',
    tag: 'Outpatient Documentation Integrity',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹32–45k starting package',
    syllabus: 'Clinical documentation improvement in physician practices, CDI query process, provider documentation gap analysis',
    starred: false
  },
  {
    code: 'CDEI',
    track: 'AAPC CERTIFICATIONS',
    icon: '📑',
    title: 'CDEI – Documentation Expert Inpatient',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Coders / nurses / hospital health records personnel',
    tag: 'Inpatient Documentation Integrity',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹32–45k starting package',
    syllabus: 'Hospital inpatient clinical documentation integrity, CC/MCC captures, DRG validation, clinical indicators',
    starred: false
  },
  {
    code: 'CPPM',
    track: 'AAPC CERTIFICATIONS',
    icon: '👔',
    title: 'CPPM – Certified Physician Practice Manager',
    oldFee: 24000,
    newFee: 20000,
    discount: 4000,
    days: 90,
    eligibility: 'Graduates aiming for healthcare administrative leadership',
    tag: 'Medical Practice Leadership & Operations',
    examFeeNote: 'AAPC exam voucher ₹22,000',
    salaryPotential: '₹35–55k starting package',
    syllabus: 'Revenue cycle oversight, healthcare business law, EHR adoption, HR in healthcare, provider relations',
    starred: false
  },

  // SPECIALITY CODING TRACK
  {
    code: 'Surgery',
    track: 'SPECIALITY CODING TRACK',
    icon: '✂️',
    title: 'Surgery Coding Specialty',
    oldFee: 25000,
    standardFee: 23000,
    newFee: 20000,
    discount: 5000,
    days: 60,
    eligibility: 'Coders with CPT Surgery understanding',
    tag: 'Operative Report & Complex Surgical Case Studies',
    examFeeNote: 'Specialty board examination available',
    salaryPotential: '₹28–42k starting package',
    syllabus: 'Detailed operative report dissection, multi-system surgery, global surgical packages, modifiers 51/59/XS',
    starred: false
  },
  {
    code: 'ED',
    track: 'SPECIALITY CODING TRACK',
    icon: '🚨',
    title: 'ED – Emergency Department Specialty',
    oldFee: 15000,
    standardFee: 12000,
    newFee: 10000,
    discount: 5000,
    days: 60,
    eligibility: 'Life sciences / nursing / CPC coders',
    tag: 'ED Facility & Professional Rapid Coding',
    examFeeNote: 'ED Specialty Certificate',
    salaryPotential: '₹26–38k starting package',
    syllabus: 'Level 1–5 ED encounters, critical care time documentation, bedside procedures, observation care admissions',
    starred: false
  },
  {
    code: 'EM',
    track: 'SPECIALITY CODING TRACK',
    icon: '🩺',
    title: 'EM – Evaluation & Management Track',
    oldFee: 15000,
    standardFee: 12000,
    newFee: 10000,
    discount: 5000,
    days: 60,
    eligibility: 'Healthcare graduates / certified coders',
    tag: 'MDM Scoring & Clinical Documentation',
    examFeeNote: 'E/M Specialty Certificate',
    salaryPotential: '₹26–38k starting package',
    syllabus: 'Problems addressed complexity, data reviewed & analyzed, patient risk levels, inpatient rounding and consults',
    starred: false
  },
  {
    code: 'Radiology',
    track: 'SPECIALITY CODING TRACK',
    icon: '🩻',
    title: 'Radiology Coding Specialty',
    oldFee: 23000,
    standardFee: 19000,
    newFee: 17000,
    discount: 6000,
    days: 60,
    eligibility: 'Life science / radiology tech / medical graduates',
    tag: 'Diagnostic & Interventional Imaging',
    examFeeNote: 'Radiology Specialty Certificate',
    salaryPotential: '₹28–40k starting package',
    syllabus: 'Diagnostic X-Ray, Ultrasound, CT, MRI, Nuclear medicine, Radiation oncology, contrast administration',
    starred: false
  },
  {
    code: 'Anesthesia',
    track: 'SPECIALITY CODING TRACK',
    icon: '💉',
    title: 'Anesthesia Coding Specialty',
    oldFee: 23000,
    standardFee: 19000,
    newFee: 17000,
    discount: 6000,
    days: 60,
    eligibility: 'Healthcare / allied health graduates',
    tag: 'ASA Relative Values & Time Units',
    examFeeNote: 'Anesthesia Specialty Certificate',
    salaryPotential: '₹28–40k starting package',
    syllabus: 'ASA base units, physical status modifiers P1–P6, qualifying circumstances, acute & chronic pain injections',
    starred: false
  },
  {
    code: 'IP DRG',
    track: 'SPECIALITY CODING TRACK',
    icon: '🏨',
    title: 'IP DRG – Inpatient DRG Hospital Coding',
    oldFee: 25000,
    standardFee: 21000,
    newFee: 20000,
    discount: 5000,
    days: 90,
    eligibility: 'Experienced coders / hospital career aspirants',
    tag: 'Inpatient Hospital Grouping & MS-DRG',
    examFeeNote: 'Inpatient DRG Certification',
    salaryPotential: '₹30–45k starting package',
    syllabus: 'Principal diagnosis assignment, secondary conditions, CC/MCC comorbidities, POA indicators, MS-DRG & APR-DRG',
    starred: true
  },
  {
    code: 'HCC',
    track: 'SPECIALITY CODING TRACK',
    icon: '📊',
    title: 'HCC – Risk Adjustment Coding',
    oldFee: 22000,
    newFee: 18000,
    discount: 4000,
    days: 60,
    eligibility: 'Freshers & experienced medical coders',
    tag: 'Medicare Advantage & RAF Score Coding',
    examFeeNote: 'Risk Adjustment Specialist Certificate',
    salaryPotential: '₹28–38k starting package',
    syllabus: 'MEAT criteria (Monitor, Evaluate, Assess, Treat), chronic illness coding, retrospective and concurrent chart reviews',
    starred: false
  },
  {
    code: 'IVR',
    track: 'SPECIALITY CODING TRACK',
    icon: '🩸',
    title: 'IVR – Interventional Radiology Coding',
    oldFee: 25000,
    newFee: 21000,
    discount: 4000,
    days: 60,
    eligibility: 'Experienced surgical & radiology coders',
    tag: 'Vascular Catheterization & Interventions',
    examFeeNote: 'Interventional Radiology Certificate',
    salaryPotential: '₹35–50k starting package',
    syllabus: 'Vascular anatomy order branching, selective & non-selective catheterization, angioplasty, stenting, embolization',
    starred: false
  },
  {
    code: 'CDI',
    track: 'SPECIALITY CODING TRACK',
    icon: '📑',
    title: 'CDI – Clinical Documentation Improvement',
    oldFee: 24000,
    newFee: 20000,
    discount: 4000,
    days: 60,
    eligibility: 'Medical, nursing, pharmacy graduates',
    tag: 'Hospital & Clinic Documentation Specialist',
    examFeeNote: 'CDI Specialist Certificate',
    salaryPotential: '₹35–52k starting package',
    syllabus: 'Physician query templates, clinical validation vs coding validation, case-mix index (CMI), severity of illness (SOI)',
    starred: false
  },

  // AHIMA CERTIFICATIONS
  {
    code: 'CCS',
    track: 'AHIMA CERTIFICATIONS',
    icon: '🎖️',
    title: 'CCS – Experienced (Medical Coding)',
    oldFee: 45000,
    standardFee: 32000,
    newFee: 20000,
    discount: 25000,
    days: 120,
    eligibility: 'Experienced medical coders advancing to AHIMA gold standard',
    tag: 'AHIMA USA Gold Standard · Experienced Candidate Track',
    examFeeNote: 'AHIMA CCS Exam Voucher ₹24,000',
    salaryPotential: '₹35–50k starting package in global MNCs',
    syllabus: 'Comprehensive inpatient coding (ICD-10-CM/PCS), outpatient coding (CPT/HCPCS), DRGs, regulatory compliance',
    starred: true
  },
  {
    code: 'CCS-Fresher',
    track: 'AHIMA CERTIFICATIONS',
    icon: '🌱',
    title: 'CCS – Fresher Track',
    oldFee: 45000,
    standardFee: 32000,
    newFee: 26000,
    discount: 19000,
    days: 120,
    eligibility: 'Life sciences / pharmacy fresh graduates starting directly with hospital coding',
    tag: 'AHIMA USA Gold Standard · Fresher Intensive Track',
    examFeeNote: 'AHIMA CCS Exam Voucher ₹24,000',
    salaryPotential: '₹30–42k starting package in hospital operations',
    syllabus: 'Foundation medical sciences, ICD-10-CM/PCS, CPT, DRGs, live chart practicals & mentor guidance',
    starred: false
  },
  {
    code: 'CCS-Other',
    track: 'AHIMA CERTIFICATIONS',
    icon: '🔄',
    title: 'CCS – Experienced (Other Field)',
    oldFee: 45000,
    standardFee: 32000,
    newFee: 23000,
    discount: 22000,
    days: 120,
    eligibility: 'Working professionals with prior experience in non-coding fields',
    tag: 'AHIMA USA Gold Standard · Career Transition Track',
    examFeeNote: 'AHIMA CCS Exam Voucher ₹24,000',
    salaryPotential: '₹32–46k starting package',
    syllabus: 'Bridge module for non-coding professionals, ICD-10-CM/PCS, CPT, hospital claim audits & DRGs',
    starred: false
  },
  {
    code: 'CCS-P',
    track: 'AHIMA CERTIFICATIONS',
    icon: '🏛️',
    title: 'CCS-P – Certified Coding Specialist Physician-based',
    oldFee: 29000,
    newFee: 25000,
    discount: 4000,
    days: 120,
    eligibility: 'Physician practice & multi-specialty coders',
    tag: 'AHIMA Physician Office Coding Mastery',
    examFeeNote: 'AHIMA CCS-P Exam Voucher ₹24,000',
    salaryPotential: '₹30–45k starting package',
    syllabus: 'CPT evaluation & management, surgical coding, documentation auditing, physician reimbursement schemes',
    starred: false
  },
  {
    code: 'RHIA',
    track: 'AHIMA CERTIFICATIONS',
    icon: '🎓',
    title: 'RHIA – Registered Health Info Administrator',
    oldFee: 35000,
    newFee: 30000,
    discount: 5000,
    days: 180,
    eligibility: 'Health informatics / administration / science graduates',
    tag: 'AHIMA Healthcare Administration Leadership',
    examFeeNote: 'AHIMA RHIA Exam Voucher ₹26,000',
    salaryPotential: '₹40–65k in hospital health records operations',
    syllabus: 'Health data analytics, enterprise information governance, privacy & legal compliance, health informatics systems',
    starred: false
  },
  {
    code: 'RHIT',
    track: 'AHIMA CERTIFICATIONS',
    icon: '💾',
    title: 'RHIT – Registered Health Info Technician',
    oldFee: 32000,
    newFee: 27000,
    discount: 5000,
    days: 150,
    eligibility: 'Computer science / life sciences / healthcare graduates',
    tag: 'Electronic Health Records & Technical Systems',
    examFeeNote: 'AHIMA RHIT Exam Voucher ₹24,000',
    salaryPotential: '₹32–48k starting package',
    syllabus: 'EHR management, data quality assurance, ICD-10/CPT data entry, registries & statistics reporting',
    starred: false
  },

  // HIMAA CERTIFICATIONS
  {
    code: 'CCC',
    track: 'HIMAA CERTIFICATIONS',
    icon: '🌐',
    title: 'CCC – Certified Clinical Coder (HIMAA)',
    oldFee: 28000,
    newFee: 24000,
    discount: 4000,
    days: 90,
    eligibility: 'Graduates targeting Australian & International healthcare markets',
    tag: 'HIMAA Australia Standard Clinical Coding',
    examFeeNote: 'HIMAA International Exam Voucher ₹20,000',
    salaryPotential: '₹30–46k in offshore Australian healthcare RCM',
    syllabus: 'ICD-10-AM (Australian Modification), ACHI procedural classification, ACS coding standards, AR-DRGs',
    starred: true
  },
  {
    code: 'HIM',
    track: 'HIMAA CERTIFICATIONS',
    icon: '🌏',
    title: 'HIM – Health Information Management (HIMAA)',
    oldFee: 30000,
    newFee: 26000,
    discount: 4000,
    days: 120,
    eligibility: 'Health management & information systems graduates',
    tag: 'HIMAA International Health Records & Clinical Governance',
    examFeeNote: 'HIMAA HIM Certification ₹20,000',
    salaryPotential: '₹35–50k starting package',
    syllabus: 'Clinical data governance, international health records management, clinical terminology, medico-legal ethics',
    starred: false
  },

  // AMCT FOUNDATION TRACK
  {
    code: 'AB',
    track: 'AMCT FOUNDATION TRACK',
    icon: '🌱',
    title: 'AMCT Beginner',
    oldFee: 25000,
    standardFee: 19000,
    newFee: 17000,
    discount: 8000,
    days: 45,
    eligibility: 'Freshers / non-science (passed 2022+)',
    tag: 'No exam — foundation course',
    examFeeNote: 'No exam — foundation course',
    salaryPotential: '₹15–20k as fresher',
    syllabus: 'Anatomy, Physiology, ICD full, CPT & HCPCS intro',
    starred: false
  },
  {
    code: 'AI',
    track: 'AMCT FOUNDATION TRACK',
    icon: '⭐',
    title: 'AMCT Intermediate',
    oldFee: 35000,
    standardFee: 23000,
    newFee: 21000,
    discount: 14000,
    days: 60,
    eligibility: 'Most preferred course for life science graduates',
    tag: 'Full CPT/ICD/HCPCS + CPC package',
    examFeeNote: 'AAPC CPC exam included in package',
    salaryPotential: '₹20–25k as fresher',
    syllabus: 'Full CPT, ICD-10-CM & HCPCS Level II + CPC certification package',
    starred: false
  },
  {
    code: 'AA',
    track: 'AMCT FOUNDATION TRACK',
    icon: '🚀',
    title: 'AMCT Advanced',
    oldFee: 45000,
    standardFee: 32000,
    newFee: 29000,
    discount: 16000,
    days: 90,
    eligibility: 'Includes 1 specialty + CPC',
    tag: 'CPC + chosen specialty',
    examFeeNote: 'AAPC CPC + specialty certification included',
    salaryPotential: '₹25–32k as fresher',
    syllabus: 'CPC core curriculum + one chosen specialty track (CIC / CRC / CPMA / COC)',
    starred: false
  },
  {
    code: 'F',
    track: 'AMCT FOUNDATION TRACK',
    icon: '⚡',
    title: 'CPC Crash Course',
    oldFee: 18000,
    newFee: 15000,
    discount: 3000,
    days: 30,
    eligibility: 'Already studied medical coding',
    tag: 'Fast-track AAPC CPC exam prep',
    examFeeNote: 'AAPC CPC exam fee charged separately',
    salaryPotential: '₹22–28k with certification',
    syllabus: 'Rapid revision of ICD-10-CM, CPT & HCPCS + mock exams',
    starred: false
  }
];

const formatINR = (n) => `₹${n.toLocaleString('en-IN')}`;

export default function CourseCatalogWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [expandedCode, setExpandedCode] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COURSES;
    return COURSES.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.eligibility.toLowerCase().includes(q)
    );
  }, [query]);

  const tracks = useMemo(() => {
    const order = [];
    const byTrack = {};
    filtered.forEach((c) => {
      if (!byTrack[c.track]) {
        byTrack[c.track] = [];
        order.push(c.track);
      }
      byTrack[c.track].push(c);
    });
    return order.map((track) => ({ track, courses: byTrack[track] }));
  }, [filtered]);

  const close = () => {
    setIsOpen(false);
    setQuery('');
    setExpandedCode(null);
  };

  return (
    <>
      {/* Floating "Course Catalog" pill — mounted once at the app root, so it
          follows the person to every dashboard / tab instead of living
          inside one specific screen. */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-5 left-5 z-[70] flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs py-2.5 px-4 rounded-full shadow-lg transition-all hover:scale-[1.03] active:scale-95 cursor-pointer"
        >
          <Lightbulb className="w-3.5 h-3.5" />
          <span>Course Catalog</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[80] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-amber-500 shrink-0" />
              <h3 className="font-extrabold text-slate-900 text-base flex-1">Course Catalog</h3>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-32 sm:w-40 bg-slate-50 border border-slate-200 rounded-full pl-7 pr-2.5 py-1.5 text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-[#0e6977] transition-all"
                />
              </div>
              <button
                onClick={close}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Call-script banner */}
            <div className="mx-4 mt-3 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 flex items-start gap-1.5">
              <Phone className="w-3 h-3 mt-0.5 shrink-0" />
              <span>
                Use this while on calls — fee script order: <strong>Original fee → Current standard fee → Your discounted fee</strong>
              </span>
            </div>

            {/* Scrollable course list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {tracks.length === 0 && (
                <div className="text-center text-xs text-slate-400 py-10">No course matches "{query}"</div>
              )}

              {tracks.map(({ track, courses }) => (
                <div key={track} className="space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 pt-1">
                    {track}
                  </div>

                  {courses.map((c) => {
                    const isExpanded = expandedCode === c.code;
                    return (
                      <div
                        key={c.code}
                        onClick={() => setExpandedCode(isExpanded ? null : c.code)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all ${
                          isExpanded
                            ? 'border-emerald-300 bg-emerald-50/50 shadow-sm'
                            : 'border-slate-200 hover:border-teal-300 hover:shadow-xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{c.icon}</span>
                            <span className="font-extrabold text-slate-900 text-[13px] truncate">{c.title}</span>
                            {c.starred && <Star className="w-3 h-3 text-rose-500 fill-rose-500 shrink-0" />}
                          </div>
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                            {c.days}d
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-baseline gap-2 flex-wrap">
                          <span className="text-[11px] text-slate-400 line-through" title="Original course fee">
                            {formatINR(c.oldFee)}
                          </span>
                          <span className="text-xs text-slate-600 font-semibold" title="Current standard fee">
                            Std: {formatINR(c.standardFee || c.oldFee)}
                          </span>
                          <span className="text-sm font-black text-emerald-700" title="Your discounted fee">
                            Offer: {formatINR(c.newFee)}
                          </span>
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-100/90 px-1.5 py-0.5 rounded">
                            Save {formatINR(c.oldFee - c.newFee)}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-500 mt-0.5">{c.eligibility}</div>

                        <div className="mt-1.5 inline-flex items-center gap-1 text-[10.5px] text-teal-700 bg-teal-50 border border-teal-100 rounded-md px-1.5 py-0.5">
                          📄 <span>{c.tag}</span>
                        </div>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-emerald-200/70 space-y-3">
                            <div>
                              <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-rose-700 uppercase tracking-wide">
                                <Phone className="w-3 h-3" />
                                <span>Fee Script (in this order)</span>
                              </div>
                              <div className="mt-1.5 rounded-xl bg-emerald-50/80 border border-emerald-100 divide-y divide-emerald-100/80 text-[11.5px]">
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">1. Original course fee:</span>
                                  <span className="font-bold text-slate-500 line-through">{formatINR(c.oldFee)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">2. Current standard fee:</span>
                                  <span className="font-bold text-slate-900">{formatINR(c.standardFee || c.oldFee)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">3. Your discounted fee:</span>
                                  <span className="font-black text-emerald-700">{formatINR(c.newFee)}</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5">
                                  <span className="text-slate-600">4. Total savings / discount:</span>
                                  <span className="font-bold text-amber-700">{formatINR(c.oldFee - c.newFee)} off</span>
                                </div>
                                <div className="flex items-center justify-between px-3 py-1.5 gap-2">
                                  <span className="text-slate-600 shrink-0">5. Exam fee note:</span>
                                  <span className="font-bold text-slate-900 text-right">{c.examFeeNote}</span>
                                </div>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center gap-1.5 text-[10.5px] font-extrabold text-emerald-700 uppercase tracking-wide">
                                <Briefcase className="w-3 h-3" />
                                <span>Salary Potential</span>
                              </div>
                              <div className="mt-1 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-[12px] font-bold text-slate-800">
                                {c.salaryPotential}
                              </div>
                            </div>

                            <div className="text-[10.5px] text-slate-500 italic leading-snug">
                              💡 {c.syllabus}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
