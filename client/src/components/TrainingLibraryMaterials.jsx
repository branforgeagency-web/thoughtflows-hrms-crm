import React, { useState, useRef } from 'react';
import { 
  BookOpen, 
  Eye, 
  Send, 
  Star, 
  UploadCloud, 
  FileText, 
  X, 
  CheckCircle2, 
  Search, 
  Download, 
  ShieldCheck, 
  Lock, 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  Layers,
  FileSpreadsheet,
  Presentation,
  Check,
  Info,
  Calendar,
  Users,
  Clock,
  Sparkles,
  Trash2
} from 'lucide-react';

export default function TrainingLibraryMaterials({ 
  currentUser = { name: 'Revathi K', id: 'TR-CBG-001', branch: 'Coimbatore Gandhipuram' } 
}) {
  // Filter active tab
  const [activeTab, setActiveTab] = useState('All');
  
  // Search query (optional power-feature)
  const [searchQuery, setSearchQuery] = useState('');

  // Initial Resources matching the screenshot exactly
  const [resources, setResources] = useState([
    // CODEBOOKS SECTION (Row 1)
    {
      id: 'cpt-pro-2026',
      title: 'CPT® Professional 2026',
      publisher: 'American Medical Association (AMA) · 2026 Edition',
      description: 'Current Procedural Terminology — Category I/II/III codes, full code descriptors, guidelines & appendices.',
      section: 'codebooks',
      category: 'CPT',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Codebook',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '48 MB',
      isPinned: true,
      totalPages: 1248,
      readSample: 'SURGERY / INTEGUMENTARY SYSTEM (10004–17999)\n\nGeneral Guidelines:\nExcision of benign lesions (11400-11446) requires full-thickness removal including margins. Report by excised diameter (lesion diameter plus most narrow margins required for complete excision).\n\n11400: Excision, benign lesion including margins, except skin tag (unless listed elsewhere), trunk, arms or legs; excised diameter 0.5 cm or less.\n11401: ... excised diameter 0.6 to 1.0 cm.\n11402: ... excised diameter 1.1 to 2.0 cm.\n\nModifier 59: Distinct Procedural Service — used to identify procedures/services, other than E/M services, that are not normally reported together.'
    },
    {
      id: 'icd10-cm-2026',
      title: 'ICD-10-CM 2026 (Diagnosis)',
      publisher: 'CMS / AAPC · FY2026',
      description: 'Diagnosis codes with full tabular list, alphabetic index & chapter-specific coding guidelines.',
      section: 'codebooks',
      category: 'ICD-10',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Codebook',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '62 MB',
      isPinned: true,
      totalPages: 1420,
      readSample: 'CHAPTER 4: ENDOCRINE, NUTRITIONAL AND METABOLIC DISEASES (E00–E89)\n\nDiabetes Mellitus (E08–E13)\nGeneral Guidelines: Codes under category E08–E13 are combination codes that include the type of diabetes mellitus, the body system affected, and the complications affecting that body system.\n\nE11.9: Type 2 diabetes mellitus without complications.\nE11.65: Type 2 diabetes mellitus with hyperglycemia.\nE11.69: Type 2 diabetes mellitus with other specified complication.\n\nCode First: Any associated underlying condition if secondary diabetes (E08, E09).'
    },
    {
      id: 'icd10-pcs-2026',
      title: 'ICD-10-PCS 2026 (Procedure)',
      publisher: 'CMS · FY2026',
      description: 'Inpatient procedure coding system — 7-character structure, tables & device/qualifier values.',
      section: 'codebooks',
      category: 'ICD-10',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Codebook',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '40 MB',
      isPinned: false,
      totalPages: 980,
      readSample: 'SECTION 0: MEDICAL AND SURGICAL\nCharacter 1: Section (0 = Medical and Surgical)\nCharacter 2: Body System (J = Subcutaneous Tissue and Fascia)\nCharacter 3: Root Operation (B = Excision)\nCharacter 4: Body Part (4 = Subcutaneous Tissue & Fascia, Abdominal Wall)\nCharacter 5: Approach (0 = Open)\nCharacter 6: Device (Z = No Device)\nCharacter 7: Qualifier (Z = No Qualifier)\n\nResulting Code: 0JB40ZZ (Open excision of abdominal wall subcutaneous tissue).'
    },
    {
      id: 'hcpcs-level2-2026',
      title: 'HCPCS Level II 2026',
      publisher: 'CMS / Optum · 2026 Edition',
      description: 'Healthcare Common Procedure Coding System — supplies, drugs (J-codes), DME, transport & more.',
      section: 'codebooks',
      category: 'HCPCS',
      categoryBadgeStyle: 'bg-[#fef3c7] text-[#b45309]',
      typeTag: 'Codebook',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '31 MB',
      isPinned: true,
      totalPages: 840,
      readSample: 'DRUGS ADMINISTERED OTHER THAN ORAL METHOD (J0120–J8999)\n\nJ1745: Injection, infliximab, excludes biosimilar, 10 mg\nJ9035: Injection, bevacizumab, 10 mg\nJ7030: Infusion, normal saline solution , 1,000 cc\n\nDurable Medical Equipment (E-Codes):\nE0601: Continuous positive airway pressure (CPAP) device\nE1390: Oxygen concentrator, single delivery port'
    },

    // CODEBOOKS SECTION (Row 2 - Guidelines)
    {
      id: 'icd10-guidelines-2026',
      title: 'ICD-10-CM Official Guidelines FY2026',
      publisher: 'CDC / NCHS / CMS · FY2026',
      description: 'The mandatory coding & reporting guidelines — sequencing, combination codes, "code first" notes.',
      section: 'codebooks',
      category: 'ICD-10',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Guideline',
      typeTagStyle: 'bg-[#ede9fe] text-[#7c3aed]',
      fileFormat: 'PDF',
      fileSize: '3 MB',
      isPinned: true,
      totalPages: 124,
      readSample: 'SECTION I. CONVENTIONS, GENERAL CODING GUIDELINES\n\nA. Conventions for the ICD-10-CM\n1. The Alphabetic Index and Tabular List: Both parts must be used in locating and verifying the code. Never code directly from index.\n2. "Includes" Notes: Further defines or gives examples of the content of the category.\n3. "Excludes" Notes:\n   - Excludes1: Pure excludes note. "NOT CODED HERE!"\n   - Excludes2: "Not included here." Can code both conditions if patient has both.'
    },
    {
      id: 'cpt-guidelines-appendices',
      title: 'CPT Coding Guidelines & Appendices',
      publisher: 'AMA · 2026',
      description: 'Section guidelines, Appendix A modifiers, Appendix L vascular families, add-on code list.',
      section: 'codebooks',
      category: 'CPT',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Guideline',
      typeTagStyle: 'bg-[#ede9fe] text-[#7c3aed]',
      fileFormat: 'PDF',
      fileSize: '5 MB',
      isPinned: false,
      totalPages: 196,
      readSample: 'APPENDIX A: MODIFIERS SUMMARY\n\nModifier 25: Significant, Separately Identifiable E/M Service by the Same Physician on the Same Day of the Procedure or Other Service.\nModifier 51: Multiple Procedures — identifies when multiple procedures are performed at the same session by the same provider.\nModifier 59: Distinct Procedural Service — documentation must support separate lesion, incision, site or organ system.'
    },
    {
      id: 'ncci-edits-manual',
      title: 'NCCI Edits & MUE Manual',
      publisher: 'CMS · 2026',
      description: 'National Correct Coding Initiative — PTP edits, MUE limits, modifier-bypass logic.',
      section: 'codebooks',
      category: 'Compliance',
      categoryBadgeStyle: 'bg-[#f1f5f9] text-[#475569]',
      typeTag: 'Guideline',
      typeTagStyle: 'bg-[#ede9fe] text-[#7c3aed]',
      fileFormat: 'PDF',
      fileSize: '8 MB',
      isPinned: false,
      totalPages: 240,
      readSample: 'CHAPTER 1: GENERAL CORRECT CODING POLICIES\n\nProcedure-to-Procedure (PTP) Edits:\n- Column 1 Code / Column 2 Code.\n- Modifier Indicators:\n  * 0 = Modifier bypass NOT allowed under any circumstance.\n  * 1 = Modifier bypass allowed with clinical documentation (e.g. Mod 59, XE, XS, XP, XU).\n  * 9 = Deletion retroactive to inception; edit not active.'
    },
    {
      id: 'em-guidelines-mdm',
      title: 'E/M Documentation Guidelines (2021+ MDM)',
      publisher: 'AMA / CMS · 2026',
      description: 'Office/outpatient E/M based on MDM or time — the table of risk, data & problems addressed.',
      section: 'codebooks',
      category: 'E/M',
      categoryBadgeStyle: 'bg-[#dcfce7] text-[#15803d]',
      typeTag: 'Guideline',
      typeTagStyle: 'bg-[#ede9fe] text-[#7c3aed]',
      fileFormat: 'PDF',
      fileSize: '4 MB',
      isPinned: false,
      totalPages: 88,
      readSample: 'OFFICE & OUTPATIENT E/M (99202–99215)\n\nMedical Decision Making (MDM) requires 2 out of 3 elements:\n1. Number and Complexity of Problems Addressed at the Encounter (Minimal / Low / Moderate / High)\n2. Amount and/or Complexity of Data to be Reviewed and Analyzed\n3. Risk of Complications and/or Morbidity or Mortality of Patient Management\n\n99213: Low MDM (or 20–29 mins)\n99214: Moderate MDM (or 30–39 mins)\n99215: High MDM (or 40–54 mins)'
    },

    // REFERENCES SECTION
    {
      id: 'cpt-modifier-quick-ref',
      title: 'CPT Modifier Quick Reference',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'All CPT/HCPCS modifiers (25, 59, 51, 26/TC, RT/LT, XE/XS/XP/XU...) with when-to-use examples.',
      section: 'references',
      category: 'CPT',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Cheat Sheet',
      typeTagStyle: 'bg-[#fef3c7] text-[#d97706]',
      fileFormat: 'PDF',
      fileSize: '1 MB',
      isPinned: true,
      totalPages: 16,
      readSample: 'THOUGHTFLOWS MODIFIER CHEAT SHEET (2026)\n\n• 25: E/M on same day as minor procedure (0 or 10 global days).\n• 26: Professional component (physician interpretation).\n• TC: Technical component (equipment, technician, facility supplies).\n• 50: Bilateral procedure performed in the same session.\n• 51: Multiple procedures — payer discounts secondary 50%.\n• 59: Distinct procedure at different anatomical site/lesion.'
    },
    {
      id: 'pos-code-set',
      title: 'Place of Service (POS) Code Set',
      publisher: 'CMS · 2026',
      description: 'Complete POS list (11 office, 21 inpatient, 22 outpatient, 23 ER...) for claim line coding.',
      section: 'references',
      category: 'Reference',
      categoryBadgeStyle: 'bg-[#f1f5f9] text-[#475569]',
      typeTag: 'Cheat Sheet',
      typeTagStyle: 'bg-[#fef3c7] text-[#d97706]',
      fileFormat: 'PDF',
      fileSize: '0.6 MB',
      isPinned: false,
      totalPages: 8,
      readSample: 'STANDARD CMS POS CODES:\n\n• 02: Telehealth Provided Other than in Patient\'s Home\n• 10: Telehealth Provided in Patient\'s Home\n• 11: Office (Physician private clinic)\n• 12: Home\n• 21: Inpatient Hospital\n• 22: On Campus-Outpatient Hospital\n• 23: Emergency Room — Hospital\n• 24: Ambulatory Surgical Center (ASC)\n• 31: Skilled Nursing Facility (SNF)'
    },
    {
      id: 'jcode-lookup',
      title: 'J-Code (Drug) HCPCS Lookup',
      publisher: 'Optum · 2026',
      description: 'Injectable & infusion drug codes with dosage units — the most-tested HCPCS J-code set.',
      section: 'references',
      category: 'HCPCS',
      categoryBadgeStyle: 'bg-[#fef3c7] text-[#b45309]',
      typeTag: 'Reference',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'XLSX',
      fileSize: '2 MB',
      isPinned: false,
      totalPages: 42,
      readSample: 'HCPCS J-CODE MASTER INDEX:\n\nJ0171: Injection, Adrenalin, epinephrine 0.1 mg\nJ0290: Injection, ampicillin sodium, 500 mg\nJ0696: Injection, ceftriaxone sodium, per 250 mg (Rocephin)\nJ1100: Injection, dexamethasone sodium phosphate, 1 mg\nJ1745: Injection, infliximab, excludes biosimilar, 10 mg\nJ2790: Injection, Rho D immune globulin, human, full dose, 300 mcg'
    },
    {
      id: 'med-terminology',
      title: 'Medical Terminology — Roots, Prefixes & Suffixes',
      publisher: 'ThoughtFlows Academy · v3',
      description: 'Word-building reference: combining forms by body system, essential for accurate code selection.',
      section: 'references',
      category: 'Foundation',
      categoryBadgeStyle: 'bg-[#e0f2fe] text-[#0369a1]',
      typeTag: 'Reference',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '2 MB',
      isPinned: false,
      totalPages: 36,
      readSample: 'WORD BUILDING BLOCKS FOR AAPC CPC:\n\nPrefixes:\n• brady- (slow) / tachy- (fast)\n• dys- (difficult, painful, abnormal)\n• epi- (above, upon)\n• sub- (under, below)\n\nRoots:\n• arthr/o (joint), cardio/o (heart), gastr/o (stomach), nephr/o (kidney)\n\nSuffixes:\n• -ectomy (surgical excision/removal)\n• -otomy (surgical incision/cutting into)\n• -ostomy (creating an artificial opening)'
    },

    // FOUNDATION SECTION
    {
      id: 'ap-body-system',
      title: 'Anatomy & Physiology by Body System',
      publisher: 'ThoughtFlows Academy · v4',
      description: 'System-wise A&P notes (cardio, musculoskeletal, integumentary...) mapped to coding chapters.',
      section: 'foundation',
      category: 'Foundation',
      categoryBadgeStyle: 'bg-[#e0f2fe] text-[#0369a1]',
      typeTag: 'Notes',
      typeTagStyle: 'bg-[#dcfce7] text-[#16a34a]',
      fileFormat: 'PDF',
      fileSize: '18 MB',
      isPinned: true,
      totalPages: 210,
      readSample: 'CARDIOVASCULAR ANATOMY & CPT MAPPING:\n\n• Heart Chambers: Right atrium, right ventricle, left atrium, left ventricle.\n• Heart Valves: Tricuspid, pulmonary, mitral (bicuspid), aortic.\n• Coronary Arteries (Modifiers RC, LC, LD):\n  - RCA: Right Coronary Artery\n  - LCA: Left Coronary Artery branching into LAD (Left Anterior Descending) and LCx (Circumflex).'
    },
    {
      id: 'coding-basics-deck',
      title: 'Medical Coding Basics — Trainer Deck',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'Intro session deck: what coding is, the revenue cycle, code set landscape, career path.',
      section: 'foundation',
      category: 'CPC',
      categoryBadgeStyle: 'bg-[#ffe4e6] text-[#e11d48]',
      typeTag: 'PPT',
      typeTagStyle: 'bg-[#fef3c7] text-[#d97706]',
      fileFormat: 'PPTX',
      fileSize: '14 MB',
      isPinned: false,
      totalPages: 64,
      readSample: 'SLIDE 1: INTRODUCTION TO US HEALTHCARE MEDICAL CODING\n\n• What is Medical Coding? The translation of medical reports into alphanumeric codes.\n• Why Accuracy Matters: 99% of provider revenue depends on clean claim submission.\n• The 3 Major Code Sets:\n  1. ICD-10-CM (Why the patient came - Diagnosis)\n  2. CPT (What the provider did - Procedures & Services)\n  3. HCPCS Level II (What equipment/supplies/drugs were used)'
    },
    {
      id: 'revenue-cycle-diagram',
      title: 'Revenue Cycle & Claim Flow Diagram',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'Patient → coding → billing → AR → payment, with where coders sit and why accuracy matters.',
      section: 'foundation',
      category: 'RCM',
      categoryBadgeStyle: 'bg-[#cffafe] text-[#0891b2]',
      typeTag: 'Reference',
      typeTagStyle: 'bg-[#e0f2fe] text-[#0284c7]',
      fileFormat: 'PDF',
      fileSize: '1 MB',
      isPinned: false,
      totalPages: 12,
      readSample: 'US HEALTHCARE REVENUE CYCLE STEPS:\n\n1. Pre-Registration & Insurance Verification\n2. Patient Encounter & Clinical Documentation\n3. Charge Capture & Medical Coding (CPT / ICD-10 / HCPCS)\n4. Claim Scrubbing & Electronic Submission (EDI 837)\n5. Clearinghouse Adjudication\n6. Payer Payment / Remittance Advice (EDI 835)\n7. Denial Management & Accounts Receivable (A/R) Follow-Up'
    },

    // PRACTICE SECTION
    {
      id: 'cpc-mock-150',
      title: 'CPC Exam Practice Set (150 Q)',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'Full-length mock with rationales — timed practice mirroring the AAPC CPC exam blueprint.',
      section: 'practice',
      category: 'CPC',
      categoryBadgeStyle: 'bg-[#ffe4e6] text-[#e11d48]',
      typeTag: 'Question Bank',
      typeTagStyle: 'bg-[#dcfce7] text-[#16a34a]',
      fileFormat: 'PDF',
      fileSize: '6 MB',
      isPinned: true,
      totalPages: 78,
      readSample: 'AAPC CPC PRACTICE EXAM — QUESTION 1 OF 150:\n\nCase Scenario:\nA 45-year-old female presents for excision of a 2.0 cm benign sebaceous cyst of the left upper back. Margins of 0.5 cm around the lesion were required on all sides. An intermediate layered closure was required to close the 3.0 cm defect.\n\nWhich codes are reported?\nA) 11403, 12002\nB) 11403, 12032-51\nC) 11402, 12031\nD) 11603, 12032-59\n\nCorrect Answer: B (11403, 12032-51)\nRationale: Total excised diameter = 2.0 cm + 0.5 cm + 0.5 cm = 3.0 cm. CPT 11403 covers benign excision, trunk, 2.1 to 3.0 cm. Intermediate repair is separately billable using 12032 with modifier 51 for secondary procedure.'
    },
    {
      id: 'icd10-scenarios',
      title: 'ICD-10-CM Coding Scenarios (Case-Based)',
      publisher: 'ThoughtFlows Academy · 2026',
      description: '100 real-world diagnostic scenarios for hands-on index→tabular practice with answer keys.',
      section: 'practice',
      category: 'ICD-10',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Workbook',
      typeTagStyle: 'bg-[#dcfce7] text-[#16a34a]',
      fileFormat: 'PDF',
      fileSize: '4 MB',
      isPinned: false,
      totalPages: 110,
      readSample: 'SCENARIO 12: ACUTE ON CHRONIC SYSTOLIC HEART FAILURE\n\nPatient History:\n68-year-old male with long-standing hypertension presents in acute pulmonary edema. Echo shows reduced ejection fraction (25%). Diagnosed with acute on chronic systolic congestive heart failure due to benign essential hypertension.\n\nCoding Rationale:\n- ICD-10 has a combination code under I11 for hypertensive heart disease.\n- I11.0: Hypertensive heart disease with heart failure.\n- I50.23: Acute on chronic systolic (congestive) heart failure (code also note under I11.0).'
    },
    {
      id: 'cpt-surgery-drills',
      title: 'CPT Surgery Section Drills',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'Operative-report coding drills (integumentary, musculoskeletal, digestive) with modifiers.',
      section: 'practice',
      category: 'CPT',
      categoryBadgeStyle: 'bg-[#ede9fe] text-[#6d28d9]',
      typeTag: 'Workbook',
      typeTagStyle: 'bg-[#dcfce7] text-[#16a34a]',
      fileFormat: 'PDF',
      fileSize: '3 MB',
      isPinned: false,
      totalPages: 84,
      readSample: 'OPERATIVE REPORT DRILL #5:\n\nPreoperative Diagnosis: Gallbladder disease with cholelithiasis.\nPostoperative Diagnosis: Acute cholecystitis with gallstones.\nProcedure Performed: Laparoscopic cholecystectomy with intraoperative cholangiogram.\n\nCoding Guide:\n- CPT 47562: Laparoscopic cholecystectomy without cholangiogram.\n- CPT 47563: Laparoscopic cholecystectomy with intraoperative cholangiogram.\nAnswer: Report CPT 47563 only. Cholangiogram is bundled into 47563; do not unbundle.'
    },
    {
      id: 'hcpcs-quiz-bank',
      title: 'HCPCS & Modifier Quiz Bank',
      publisher: 'ThoughtFlows Academy · 2026',
      description: 'Rapid-fire HCPCS Level II + modifier MCQs to drill exam recall.',
      section: 'practice',
      category: 'HCPCS',
      categoryBadgeStyle: 'bg-[#fef3c7] text-[#b45309]',
      typeTag: 'Question Bank',
      typeTagStyle: 'bg-[#dcfce7] text-[#16a34a]',
      fileFormat: 'PDF',
      fileSize: '2 MB',
      isPinned: false,
      totalPages: 52,
      readSample: 'RAPID-FIRE DRILL 14:\n\nQuestion: Which HCPCS modifier specifies that a service was delivered via telehealth in the patient\'s home?\nA) Modifier 95\nB) Modifier GT\nC) Modifier GQ\nD) Modifier FQ\n\nCorrect Answer: A (Modifier 95 indicates synchronous telemedicine service rendered via interactive audio and video telecommunications system).'
    }
  ]);

  // Shared resources state (files uploaded by trainers)
  const [sharedResources, setSharedResources] = useState([]);
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadNote, setUploadNote] = useState('');
  const [uploadFeedbackToast, setUploadFeedbackToast] = useState(null);
  const fileInputRef = useRef(null);

  // Active In-Portal Document Viewer Modal
  const [activeViewerResource, setActiveViewerResource] = useState(null);
  const [viewerCurrentPage, setViewerCurrentPage] = useState(1);
  const [viewerZoom, setViewerZoom] = useState(100);

  // Active Batch Assignment Modal
  const [activeAssignResource, setActiveAssignResource] = useState(null);
  const [selectedBatches, setSelectedBatches] = useState(['Batch MAR-2026-A']);
  const [assignModuleFolder, setAssignModuleFolder] = useState('Module 3: CPT & Surgery Coding');
  const [assignNote, setAssignNote] = useState('Mandatory reference reading for upcoming mock test.');
  const [assignmentToast, setAssignmentToast] = useState(null);

  // Toggle Pinned status
  const handleTogglePin = (resourceId, e) => {
    e?.stopPropagation();
    setResources(prev => prev.map(res => {
      if (res.id === resourceId) {
        return { ...res, isPinned: !res.isPinned };
      }
      return res;
    }));
  };

  // Handle File Upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newShared = {
      id: `shared-${Date.now()}`,
      title: file.name,
      uploadedBy: currentUser.name,
      branch: currentUser.branch,
      category: uploadCategory,
      note: uploadNote || 'Shared teaching material for faculty network',
      fileFormat: file.name.split('.').pop()?.toUpperCase() || 'PDF',
      fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    };

    setSharedResources(prev => [newShared, ...prev]);
    setUploadNote('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    setUploadFeedbackToast(`"${file.name}" uploaded to Shared Teaching Library successfully!`);
    setTimeout(() => setUploadFeedbackToast(null), 3500);
  };

  // Trigger file dialog
  const triggerFileDialog = () => {
    fileInputRef.current?.click();
  };

  // Open Viewer
  const handleOpenViewer = (resource) => {
    setActiveViewerResource(resource);
    setViewerCurrentPage(1);
    setViewerZoom(100);
  };

  // Open Assign Modal
  const handleOpenAssign = (resource) => {
    setActiveAssignResource(resource);
  };

  // Confirm Batch Assignment
  const handleConfirmAssignment = () => {
    if (selectedBatches.length === 0) {
      alert('Please select at least one batch to assign.');
      return;
    }
    const resourceTitle = activeAssignResource.title;
    const batchList = selectedBatches.join(', ');
    setActiveAssignResource(null);
    setAssignmentToast(`Assigned "${resourceTitle}" to ${batchList} LMS instantly!`);
    setTimeout(() => setAssignmentToast(null), 4000);
  };

  // Filtered resources based on tab & optional search
  const filteredResources = resources.filter(res => {
    // Tab match
    let matchesTab = true;
    if (activeTab === 'CPT') {
      matchesTab = res.category === 'CPT' || res.title.includes('CPT');
    } else if (activeTab === 'ICD-10') {
      matchesTab = res.category === 'ICD-10' || res.title.includes('ICD-10');
    } else if (activeTab === 'HCPCS') {
      matchesTab = res.category === 'HCPCS' || res.title.includes('HCPCS') || res.title.includes('J-Code');
    } else if (activeTab === 'E/M') {
      matchesTab = res.category === 'E/M' || res.title.includes('E/M');
    } else if (activeTab === 'Foundation') {
      matchesTab = res.section === 'foundation' || res.category === 'Foundation' || res.title.includes('Anatomy') || res.title.includes('Terminology');
    } else if (activeTab === 'Practice') {
      matchesTab = res.section === 'practice' || res.typeTag === 'Question Bank' || res.typeTag === 'Workbook';
    }

    // Search query match
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchesSearch = res.title.toLowerCase().includes(q) ||
        res.publisher.toLowerCase().includes(q) ||
        res.description.toLowerCase().includes(q) ||
        res.category.toLowerCase().includes(q);
    }

    return matchesTab && matchesSearch;
  });

  // Calculate dynamic stats
  const countCodebooks = resources.filter(r => r.typeTag === 'Codebook').length;
  const countCodeSets = 3; // Official Code Sets in Library
  const countPracticeSets = resources.filter(r => r.section === 'practice').length;
  const countPinned = resources.filter(r => r.isPinned).length;

  // Group filtered resources by section
  const codebooksList = filteredResources.filter(r => r.section === 'codebooks');
  const referencesList = filteredResources.filter(r => r.section === 'references');
  const foundationList = filteredResources.filter(r => r.section === 'foundation');
  const practiceList = filteredResources.filter(r => r.section === 'practice');

  return (
    <div className="space-y-7 pb-12 animate-fadeIn text-slate-800">

      {/* TOAST NOTIFICATION */}
      {uploadFeedbackToast && (
        <div className="fixed top-6 right-6 z-50 bg-[#0f242d] text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-500/30 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
          <span>{uploadFeedbackToast}</span>
        </div>
      )}

      {assignmentToast && (
        <div className="fixed top-6 right-6 z-50 bg-teal-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-teal-400/40 text-xs font-semibold animate-slideDown">
          <CheckCircle2 className="w-5 h-5 text-teal-300 shrink-0" />
          <span>{assignmentToast}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 1: SHARED RESOURCE LIBRARY */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🗂️</span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Shared Resource Library</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#e6f7f5] text-[#00897b] text-xs font-semibold">
            All trainers
          </span>
        </div>

        {/* Notice Info Box */}
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200 text-xs text-slate-600 leading-relaxed">
          Upload your teaching materials — PPT, PDF, Word, images. Every trainer across all branches can see and download what's here, so we build one shared teaching library. <span className="font-bold text-slate-900">Students do not see these files.</span>
        </div>

        {/* Upload Box (Teal dashed border) */}
        <div className="border border-dashed border-[#009688]/60 bg-[#f9fdfd] rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            
            {/* Category select */}
            <div className="w-full sm:w-60">
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500 shadow-xs cursor-pointer"
              >
                <option value="General">General</option>
                <option value="CPT Guidelines">CPT Guidelines</option>
                <option value="ICD-10-CM">ICD-10-CM</option>
                <option value="HCPCS Level II">HCPCS Level II</option>
                <option value="Anatomy & Physiology">Anatomy & Physiology</option>
                <option value="Viva & Interview">Viva & Interview</option>
                <option value="Exam Practice">Exam Practice</option>
              </select>
            </div>

            {/* Note input */}
            <div className="flex-1">
              <input
                type="text"
                value={uploadNote}
                onChange={(e) => setUploadNote(e.target.value)}
                placeholder="Short note (optional) — e.g. CPC Ch.3 ICD guidelines"
                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-teal-500 shadow-xs"
              />
            </div>
          </div>

          {/* Action button & Hidden input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
          />

          <div>
            <button
              onClick={triggerFileDialog}
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00897b] hover:bg-[#007a6d] text-white text-xs font-bold shadow-sm shadow-teal-700/20 transition-all active:scale-[0.98] cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Choose file & upload</span>
            </button>
          </div>
        </div>

        {/* Uploaded Shared Items OR Empty State */}
        {sharedResources.length === 0 ? (
          <div className="py-6 px-4 text-center rounded-xl bg-slate-50/50 border border-slate-100 text-xs text-slate-500">
            No shared resources yet. Be the first to upload a teaching material above.
          </div>
        ) : (
          <div className="space-y-2 pt-2">
            <div className="text-xs font-bold text-slate-700 px-1">Recently Uploaded by Faculty ({sharedResources.length}):</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {sharedResources.map(item => (
                <div key={item.id} className="p-3 bg-white rounded-xl border border-teal-100 shadow-xs flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {item.fileFormat}
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-800 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-teal-700 font-medium">{item.category}</span>
                        <span>•</span>
                        <span>{item.fileSize}</span>
                        <span>•</span>
                        <span>{item.uploadedBy} ({item.branch})</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => alert(`Downloading "${item.title}"`)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 cursor-pointer"
                      title="Download file"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setSharedResources(prev => prev.filter(r => r.id !== item.id))}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>


      {/* ======================================================== */}
      {/* SECTION 2: CODING LIBRARY */}
      {/* ======================================================== */}
      <div className="space-y-5">
        
        {/* Section Heading & Badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">Coding Library</h2>
          </div>
          <span className="px-3 py-1 rounded-full bg-[#eef2ff] text-[#4f46e5] text-xs font-bold">
            19 resources
          </span>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
            <div className="text-3xl font-black text-slate-900">{countCodebooks}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              CODEBOOKS
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
            <div className="text-3xl font-black text-slate-900">{countCodeSets}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              CODE SETS
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
            <div className="text-3xl font-black text-slate-900">{countPracticeSets}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              PRACTICE SETS
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 text-center shadow-xs">
            <div className="text-3xl font-black text-slate-900">{countPinned}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
              PINNED
            </div>
          </div>

        </div>

        {/* Filter Tab Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['All', 'CPT', 'ICD-10', 'HCPCS', 'E/M', 'Foundation', 'Practice'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#0f242d] text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ================= RESOURCE GROUP: CODEBOOKS ================= */}
        {codebooksList.length > 0 && (
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 tracking-wider">
              <span className="w-1 h-3.5 bg-teal-600 rounded-full inline-block"></span>
              <span>CODEBOOKS</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {codebooksList.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={() => handleOpenViewer(resource)}
                  onAssign={() => handleOpenAssign(resource)}
                  onTogglePin={(e) => handleTogglePin(resource.id, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= RESOURCE GROUP: REFERENCES ================= */}
        {referencesList.length > 0 && (
          <div className="space-y-3 pt-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 tracking-wider">
              <span className="w-1 h-3.5 bg-teal-600 rounded-full inline-block"></span>
              <span>REFERENCES</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {referencesList.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={() => handleOpenViewer(resource)}
                  onAssign={() => handleOpenAssign(resource)}
                  onTogglePin={(e) => handleTogglePin(resource.id, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= RESOURCE GROUP: FOUNDATION ================= */}
        {foundationList.length > 0 && (
          <div className="space-y-3 pt-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 tracking-wider">
              <span className="w-1 h-3.5 bg-teal-600 rounded-full inline-block"></span>
              <span>FOUNDATION</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {foundationList.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={() => handleOpenViewer(resource)}
                  onAssign={() => handleOpenAssign(resource)}
                  onTogglePin={(e) => handleTogglePin(resource.id, e)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ================= RESOURCE GROUP: PRACTICE ================= */}
        {practiceList.length > 0 && (
          <div className="space-y-3 pt-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 tracking-wider">
              <span className="w-1 h-3.5 bg-teal-600 rounded-full inline-block"></span>
              <span>PRACTICE</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {practiceList.map(resource => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onOpen={() => handleOpenViewer(resource)}
                  onAssign={() => handleOpenAssign(resource)}
                  onTogglePin={(e) => handleTogglePin(resource.id, e)}
                />
              ))}
            </div>
          </div>
        )}

      </div>


      {/* ======================================================== */}
      {/* BOTTOM INFO BANNER (Matching Screenshot 3) */}
      {/* ======================================================== */}
      <div className="bg-[#f0f9ff]/90 border border-[#bae6fd] rounded-2xl p-4 text-[11px] text-slate-600 flex items-start gap-2.5 shadow-xs leading-relaxed">
        <span className="text-sm shrink-0 mt-0.5">📖</span>
        <div>
          Tap <span className="font-bold text-slate-900">Open</span> to read a resource in the secure in-portal viewer — watermarked with your trainer ID, copy & download disabled (protects licensed AMA/CMS content). <span className="font-bold text-slate-900">Assign</span> pushes a resource to a batch so it appears in those students' LMS instantly. Editions auto-refresh each coding year (CPT/ICD-10/HCPCS update annually).
        </div>
      </div>


      {/* ======================================================== */}
      {/* MODAL 1: IN-PORTAL SECURE VIEWER MODAL */}
      {/* ======================================================== */}
      {activeViewerResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-4xl w-full h-[90vh] max-h-[850px] shadow-2xl border border-slate-200 flex flex-col overflow-hidden">
            
            {/* Viewer Top Bar */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold text-xs shrink-0 border border-teal-500/30">
                  {activeViewerResource.fileFormat}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate">{activeViewerResource.title}</h3>
                  <p className="text-[10px] text-slate-400 truncate">{activeViewerResource.publisher} • {activeViewerResource.totalPages} Pages</p>
                </div>
              </div>

              {/* Watermark Security Indicator */}
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-400/30 text-[10px] text-teal-300 font-semibold">
                <Lock className="w-3 h-3 text-teal-400" />
                <span>Protected DRM • Copy & Export Disabled</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveViewerResource(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Reader Toolbar */}
            <div className="px-5 py-2.5 bg-slate-100 border-b border-slate-200/80 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewerCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={viewerCurrentPage <= 1}
                  className="p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-semibold text-slate-700">
                  Page {viewerCurrentPage} of {activeViewerResource.totalPages}
                </span>
                <button
                  onClick={() => setViewerCurrentPage(prev => Math.min(activeViewerResource.totalPages, prev + 1))}
                  disabled={viewerCurrentPage >= activeViewerResource.totalPages}
                  className="p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setViewerZoom(z => Math.max(70, z - 10))}
                    className="p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-[11px] font-mono px-1.5">{viewerZoom}%</span>
                  <button
                    onClick={() => setViewerZoom(z => Math.min(150, z + 10))}
                    className="p-1 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="text-[11px] text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  Trainer ID: {currentUser.id}
                </div>
              </div>
            </div>

            {/* Document Content Canvas with Watermark */}
            <div className="flex-1 bg-slate-200/70 overflow-y-auto p-4 sm:p-8 flex justify-center relative select-none">
              
              <div 
                className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8 sm:p-12 relative overflow-hidden flex flex-col justify-between"
                style={{ transform: `scale(${viewerZoom / 100})`, transformOrigin: 'top center', minHeight: '620px' }}
              >
                {/* Diagonal Watermark Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col justify-around items-center opacity-[0.07] rotate-[-25deg] select-none text-slate-900 font-black text-lg tracking-widest uppercase">
                  <div>THOUGHTFLOWS ACADEMY • {currentUser.id} • {currentUser.name}</div>
                  <div>CONFIDENTIAL LICENSED CONTENT • NOT FOR DISTRIBUTION</div>
                  <div>OFFICIAL TRAINING USE ONLY • {new Date().getFullYear()}</div>
                </div>

                <div>
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100 text-[10px] text-slate-400 font-mono">
                    <span>{activeViewerResource.publisher}</span>
                    <span>SECTION REF: AAPC-{activeViewerResource.category}-2026</span>
                  </div>

                  <h1 className="text-xl font-black text-slate-900 mt-4 mb-2">
                    {activeViewerResource.title}
                  </h1>
                  <p className="text-xs text-slate-500 mb-6 italic">
                    {activeViewerResource.description}
                  </p>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 text-xs font-mono text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {activeViewerResource.readSample}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Page {viewerCurrentPage} of {activeViewerResource.totalPages}</span>
                  <span className="font-semibold text-teal-700">Authenticated Session • {currentUser.name} ({currentUser.branch})</span>
                </div>
              </div>

            </div>

            {/* Viewer Bottom Footer */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Watermarked with trainer ID to prevent unauthorized LMS code leaks.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setActiveViewerResource(null);
                    handleOpenAssign(activeViewerResource);
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold transition-all border border-amber-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Assign to Batch</span>
                </button>
                <button
                  onClick={() => setActiveViewerResource(null)}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
                >
                  Close Viewer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}


      {/* ======================================================== */}
      {/* MODAL 2: ASSIGN TO BATCH LMS MODAL */}
      {/* ======================================================== */}
      {activeAssignResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center text-xs font-bold">
                  ➤
                </span>
                <h3 className="text-sm font-bold text-slate-900">Assign to Student Batch</h3>
              </div>
              <button
                onClick={() => setActiveAssignResource(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Selected Resource Card Preview */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                {activeAssignResource.fileFormat}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">{activeAssignResource.title}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{activeAssignResource.typeTag} • {activeAssignResource.fileSize}</div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${activeAssignResource.categoryBadgeStyle}`}>
                {activeAssignResource.category}
              </span>
            </div>

            {/* Batch Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Select Active Batches:
              </label>
              <div className="space-y-2">
                {[
                  { id: 'Batch MAR-2026-A', name: 'Batch MAR-2026-A (Morning 7:00 – 9:00 AM)', students: '34 students' },
                  { id: 'Batch FEB-2026-B', name: 'Batch FEB-2026-B (Evening 6:00 – 8:00 PM)', students: '32 students' },
                  { id: 'Batch WKND-2026-C', name: 'Batch WKND-2026-C (Saturday Intensive)', students: '28 students' }
                ].map(batch => {
                  const isChecked = selectedBatches.includes(batch.id);
                  return (
                    <label
                      key={batch.id}
                      onClick={() => {
                        setSelectedBatches(prev => 
                          prev.includes(batch.id) ? prev.filter(b => b !== batch.id) : [...prev, batch.id]
                        );
                      }}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer text-xs transition-all ${
                        isChecked ? 'bg-teal-50/70 border-teal-300 text-teal-900 font-semibold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500 cursor-pointer"
                        />
                        <span>{batch.name}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">{batch.students}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Target Module / LMS Shelf */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Target LMS Module Shelf:
              </label>
              <select
                value={assignModuleFolder}
                onChange={(e) => setAssignModuleFolder(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 font-medium focus:outline-none focus:border-teal-500 cursor-pointer"
              >
                <option value="Module 1: Medical Terminology & Anatomy">Module 1: Medical Terminology & Anatomy</option>
                <option value="Module 2: ICD-10-CM Coding & Guidelines">Module 2: ICD-10-CM Coding & Guidelines</option>
                <option value="Module 3: CPT & Surgery Coding">Module 3: CPT & Surgery Coding</option>
                <option value="Module 4: HCPCS & Reimbursement Methodologies">Module 4: HCPCS & Reimbursement Methodologies</option>
                <option value="Weekly Assessment Desk & Mock Prep">Weekly Assessment Desk & Mock Prep</option>
                <option value="Permanent Reference Shelf">Permanent Reference Shelf</option>
              </select>
            </div>

            {/* Trainer Instruction Note */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Study Note for Students (Optional):
              </label>
              <textarea
                rows={2}
                value={assignNote}
                onChange={(e) => setAssignNote(e.target.value)}
                placeholder="e.g. Mandatory reading for tomorrow's live drill."
                className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-teal-500 placeholder-slate-400"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveAssignResource(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAssignment}
                className="px-4 py-2 rounded-xl bg-[#00897b] hover:bg-[#007a6d] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Push to Batch LMS</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// =========================================================================
// SUBCOMPONENT: RESOURCE CARD (Matching Screenshot Cards 1:1)
// =========================================================================
function ResourceCard({ resource, onOpen, onAssign, onTogglePin }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      
      {/* Top Row: Category Badge + Pin Star */}
      <div>
        <div className="flex items-center justify-between">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${resource.categoryBadgeStyle}`}>
            {resource.category}
          </span>
          <button
            onClick={onTogglePin}
            title={resource.isPinned ? 'Unpin resource' : 'Pin resource'}
            className="text-[#00897b] hover:scale-110 transition-transform cursor-pointer"
          >
            {resource.isPinned ? (
              <Star className="w-4 h-4 fill-[#00897b] text-[#00897b]" />
            ) : (
              <Star className="w-4 h-4 text-slate-300 hover:text-[#00897b]" />
            )}
          </button>
        </div>

        {/* Title */}
        <h3 className="text-sm font-bold text-slate-900 mt-2.5 leading-snug">
          {resource.title}
        </h3>

        {/* Publisher / Edition */}
        <p className="text-[11px] text-slate-500 font-medium mt-1">
          {resource.publisher}
        </p>

        {/* Description */}
        <p className="text-[11px] text-slate-600 mt-2 leading-relaxed min-h-[44px]">
          {resource.description}
        </p>
      </div>

      {/* Bottom Info & Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
        
        {/* Type tag & File format info */}
        <div className="flex items-center justify-between text-[11px]">
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${resource.typeTagStyle}`}>
            {resource.typeTag}
          </span>
          <span className="text-[10px] text-slate-400 font-medium">
            {resource.fileFormat} · {resource.fileSize}
          </span>
        </div>

        {/* 2 Action Buttons: Open & Assign */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onOpen}
            className="py-2 px-3 rounded-xl bg-[#0f242d] hover:bg-[#1a3847] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Open</span>
          </button>

          <button
            onClick={onAssign}
            className="py-2 px-3 rounded-xl bg-[#fef3c7] hover:bg-[#fde68a] text-[#92400e] text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Assign</span>
          </button>
        </div>

      </div>

    </div>
  );
}
