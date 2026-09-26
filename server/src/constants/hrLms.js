// HR (counsellor) LMS — assessment bank and certification rules.
// Questions are written from the academy's own counselling scripts, objection
// handling library and fee sheet (see client HrLmsSection.jsx), so passing
// them means the counsellor knows *our* SOPs. Answers never leave the server.

// The five modules every counsellor must pass before leads are allocated
export const MANDATORY_MODULES = ['Brand Training', 'Career Basics', 'Lead Handling SOP', 'Payment & Admission SOP', 'Placement Explanation'];

// Item count per module (matches the lesson list shown in the HR LMS)
export const MODULE_ITEMS = {
  'Brand Training': 6, 'Career Basics': 6, 'Lead Handling SOP': 6, 'Payment & Admission SOP': 6,
  'Placement Explanation': 5, 'Course Recommendation': 4, 'Demo Booking & Handover': 5, 'Certification Explanation': 5
};

export const PASS_MARK = {
  'Brand Training': 80, 'Career Basics': 80, 'Lead Handling SOP': 70, 'Payment & Admission SOP': 70,
  'Placement Explanation': 80, 'Course Recommendation': 70, 'Demo Booking & Handover': 80, 'Certification Explanation': 70
};
export const COURSE_PASS_MARK = 80;

// q: question, o: options, a: index of the correct option
export const QUESTION_BANK = {
  'Brand Training': [
    { q: 'A parent is unsure about the academy. What does our script invite them to do?', o: ['Pay a token first and visit later', 'Visit the Saravanampatti campus, see the classroom and meet placed alumni', 'Read online reviews only', 'Wait for the next batch announcement'], a: 1 },
    { q: 'On the first call, right after introducing yourself, you should…', o: ['Quote the fee immediately', 'Ask for 2 minutes to understand their background and find the right batch', 'Send the payment link', 'Ask them to call back later'], a: 1 },
    { q: 'Which sentence matches our brand wording on placement?', o: ['100% job guarantee', '100% placement assistance through our hiring partners', 'Guaranteed ₹35,000 salary', 'Placement only for toppers'], a: 1 },
    { q: 'A lead says "It\'s too expensive". Which reply is off-brand and must never be said?', o: ['Explain the return on investment and EMI options', '"If you don\'t have money you can\'t join"', 'Offer to walk them through the payment plan', 'Share what certified coders typically earn'], a: 1 },
    { q: 'A lead is not from a medical background. The right response is…', o: ['"It might be too tough for you without biology"', 'Many of our certified students came from non-medical streams; the course starts from terminology and anatomy', 'Suggest they drop the idea', 'Ask them to study biology first'], a: 1 }
  ],
  'Career Basics': [
    { q: 'Which code sets does our CPC programme train students on?', o: ['Only ICD-10', 'ICD-10, CPT and HCPCS', 'Only CPT', 'Billing claims only'], a: 1 },
    { q: 'Who issues the CPC credential?', o: ['ThoughtFlows', 'AAPC (USA)', 'State medical council', 'Any university'], a: 1 },
    { q: 'What starting salary range for a certified CPC coder do our scripts quote?', o: ['₹8,000–₹12,000 per month', '₹25,000–₹35,000 per month', '₹1 lakh per month', 'We never mention salary'], a: 1 },
    { q: 'Why do our scripts call medical coding "evergreen"?', o: ['It is a government job', 'It serves the US healthcare domain and is unaffected by IT layoffs', 'It needs no certification', 'It is part-time work'], a: 1 },
    { q: 'Does a CPC-certified fresher need prior coding experience to get noticed by hiring managers, per our script?', o: ['Yes, at least 2 years', 'No — the certification makes the resume stand out without prior coding experience', 'Only with a medical degree', 'Only after an internship'], a: 1 }
  ],
  'Lead Handling SOP': [
    { q: 'Before recommending a course, which details should you confirm?', o: ['Only their phone number', 'Degree, year of graduation, and whether they studied anatomy or physiology', 'Their family income', 'Their previous employer only'], a: 1 },
    { q: 'What should you offer before asking a lead for any decision?', o: ['A discount', 'A free live demo with a senior AAPC-certified trainer', 'The payment link', 'A job offer letter'], a: 1 },
    { q: 'After every call, what must be recorded in the CRM?', o: ['Nothing if the call was short', 'Remarks, stage and the next follow-up', 'Only the call duration', 'Only if the lead converts'], a: 1 },
    { q: 'After a demo, the follow-up call should…', o: ['Ask for full payment immediately', 'Ask how the demo went and what questions they have about the batch schedule', 'Skip feedback and move on', 'Offer a different course'], a: 1 },
    { q: 'How do we revive a stale lead?', o: ['Delete it', 'Re-engage with a relevant new batch (e.g. weekend batch) and check if they are still interested', 'Call them daily until they agree', 'Send only the fee sheet'], a: 1 }
  ],
  'Payment & Admission SOP': [
    { q: 'What initial token does our closing script ask for to lock a seat?', o: ['₹500', '₹5,000', 'Full course fee', 'No token'], a: 1 },
    { q: 'Which EMI tenures do we offer?', o: ['12 and 24 months', '3, 6 and 9 month zero-cost EMI', 'Only 1 month', 'No EMI'], a: 1 },
    { q: 'Which documents are needed to generate the Student ID and LMS login?', o: ['Only Aadhaar', '10th marksheet, degree certificate/provisional, Aadhaar (front & back) and a passport-size photo', 'Salary slip and bank statement', 'Only a photo'], a: 1 },
    { q: 'What does the EMI partner need for instant digital approval?', o: ['Aadhaar and PAN', 'Passport', 'Property papers', 'A guarantor'], a: 0 },
    { q: 'What is the lowest EMI we quote when a lead says the course is expensive?', o: ['₹1,000 per month', '₹4,500 per month', '₹10,000 per month', 'We never quote EMI'], a: 1 }
  ],
  'Placement Explanation': [
    { q: 'Which statement is allowed?', o: ['"We guarantee you a job"', '"We provide 100% placement assistance through our hiring partners"', '"You will get ₹35,000 for sure"', '"Placement is automatic after payment"'], a: 1 },
    { q: 'What must a student maintain to keep getting interview drives?', o: ['Nothing', '85%+ attendance and passing internal mock tests', 'Only fee payment', 'A referral'], a: 1 },
    { q: 'How many hiring partners do our scripts quote?', o: ['5', '48+', '500+', 'We do not have partners'], a: 1 },
    { q: 'In which cities are the hiring partners our script mentions?', o: ['Only abroad', 'Coimbatore, Chennai and Bangalore', 'Only Mumbai', 'Only remote'], a: 1 },
    { q: 'Which of these must you NEVER promise?', o: ['Interview drives until placed (with conditions)', 'A guaranteed job or a fixed salary', 'Mock interviews', 'Resume review'], a: 1 }
  ],
  'Course Recommendation': [
    { q: 'A non-life-science graduate asks if they can join. You…', o: ['Discourage them', 'Recommend a course and explain it starts with medical terminology and anatomy', 'Ask them to do a biology degree', 'Send them to billing only'], a: 1 },
    { q: 'How is CPC different from a general medical billing course?', o: ['It is shorter', 'It prepares for specialised coding across ICD-10, CPT and HCPCS', 'It needs no exam', 'There is no difference'], a: 1 },
    { q: 'A working professional wants to switch careers. What batch do our scripts suggest?', o: ['Only weekday day batch', 'The weekend batch for working professionals', 'Self-study only', 'Ask them to quit first'], a: 1 },
    { q: 'Where should course fees and durations be quoted from?', o: ['Memory', 'The current fee sheet in the CRM (Fees)', 'A competitor\'s website', 'The student\'s budget'], a: 1 }
  ],
  'Demo Booking & Handover': [
    { q: 'When should a demo be offered?', o: ['Only after payment', 'Before asking the lead for a decision', 'Never', 'Only to parents'], a: 1 },
    { q: 'Who takes the free demo session?', o: ['The counsellor', 'A senior AAPC-certified trainer', 'A student volunteer', 'Anyone available'], a: 1 },
    { q: 'When the trainer marks the demo as attended, what happens to the lead?', o: ['It is deleted', 'It moves to "Demo Attended" automatically', 'Nothing', 'It is marked admitted'], a: 1 },
    { q: 'The trainer marks the candidate as a no-show. What do you do?', o: ['Close the lead', 'Reschedule the demo', 'Charge a fee', 'Ignore it'], a: 1 },
    { q: 'After admission, how does the student reach a trainer?', o: ['They find one themselves', 'HR hands them over to a trainer with batch and a note (Handover desk)', 'The trainer calls HR daily', 'Automatically without HR'], a: 1 }
  ],
  'Certification Explanation': [
    { q: 'Where is the CPC credential recognised?', o: ['Only in Coimbatore', 'Across US healthcare RCM companies', 'Only in government hospitals', 'Nowhere'], a: 1 },
    { q: 'Is the AAPC exam fee included in the course fee?', o: ['Yes, always', 'No — it is charged separately as per the fee sheet', 'It is free', 'Only for CPC'], a: 1 },
    { q: 'Which code sets does the CPC exam preparation cover in our programme?', o: ['ICD-10, CPT and HCPCS', 'Only ICD-9', 'Only billing', 'Only anatomy'], a: 0 },
    { q: 'Why does certification help a fresher?', o: ['It replaces a degree', 'It makes the resume stand out without prior coding experience', 'It guarantees a job', 'It is not useful'], a: 1 },
    { q: 'Besides attendance, what must students pass to stay in placement drives?', o: ['Internal mock tests', 'A typing test', 'Nothing', 'A driving test'], a: 0 }
  ]
};

// LMS course module code → fee-sheet course code
export const COURSE_MODULE_TO_RATE = {
  CPC: 'CPC', COC: 'COC', CIC: 'CIC for freshers', CRC: 'CRC', CPMA: 'CPMA', CCS: 'CCS', IPDRG: 'IP-DRG', ED: 'ED',
  EM: 'E/M', SUR: 'Surgery', HCC: 'HCC', CEMC: 'CEMC', CPT: 'CPT Alone', ICD: 'ICD Alone', ANAT: 'Anatomy Alone',
  RAD: 'Radiology', CICX: 'CIC Fast Track'
};

// Map a lead's course text to an LMS course module code (longest / most specific first)
const COURSE_MATCHERS = [
  [/cic\s*fast/i, 'CICX'], [/ip[\s-]*drg/i, 'IPDRG'], [/cpma/i, 'CPMA'], [/cemc/i, 'CEMC'], [/\bcpc\b/i, 'CPC'],
  [/\bcoc\b/i, 'COC'], [/\bcic\b/i, 'CIC'], [/\bcrc\b/i, 'CRC'], [/\bccs\b/i, 'CCS'], [/\bhcc\b/i, 'HCC'],
  [/\be\/?m\b/i, 'EM'], [/\bed\b|emergency/i, 'ED'], [/surg/i, 'SUR'], [/radiolog/i, 'RAD'], [/anatomy/i, 'ANAT'],
  [/\bcpt\b/i, 'CPT'], [/\bicd\b/i, 'ICD'], [/amct/i, 'ACI']
];
export function courseModuleFor(course) {
  const c = String(course || '');
  const hit = COURSE_MATCHERS.find(([rx]) => rx.test(c));
  return hit ? hit[1] : null;
}

const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
// Deterministic distractors so the same questions come back on every attempt
function options(correct, pool) {
  // Distinct ignoring case/spacing ("45 Days" vs "45 DAYS" would be a trick question)
  const norm = (v) => String(v).toLowerCase().replace(/\s+/g, ' ').trim();
  const seen = new Set([norm(correct)]);
  const others = [];
  for (const p of pool) {
    if (!p || seen.has(norm(p))) continue;
    seen.add(norm(p));
    others.push(p);
    if (others.length === 3) break;
  }
  const fillers = ['Not on the fee sheet', 'Varies every batch', 'Decided by the student'];
  for (const f of fillers) if (others.length < 3 && f !== correct) others.push(f);
  const all = [correct, ...others];
  const shift = String(correct).length % 4; // rotate so the answer isn't always first
  const rotated = all.map((_, i) => all[(i + shift) % 4]);
  return { o: rotated, a: rotated.indexOf(correct) };
}

// Course module quiz built from the live fee sheet (so it stays correct when fees change)
export function courseQuestions(moduleCode, rates = []) {
  const code = COURSE_MODULE_TO_RATE[moduleCode];
  const rate = rates.find((r) => r.code === code) || rates.find((r) => String(r.code || '').toUpperCase().startsWith(moduleCode));
  const generic = [
    { q: 'Before quoting this course, what should you confirm with the lead?', o: ['Nothing', 'Degree, year of graduation and anatomy/physiology background', 'Only their budget', 'Only their city'], a: 1 },
    { q: 'How do you describe placement for this course?', o: ['Guaranteed job', '100% placement assistance, with 85%+ attendance and passing mock tests', 'Placement not offered', 'Guaranteed salary'], a: 1 }
  ];
  if (!rate) return generic;
  const fees = rates.map((r) => inr(r.courseFee ?? r.totalPayable));
  const durations = rates.map((r) => r.duration).filter(Boolean);
  const discounts = rates.map((r) => inr(r.maxDiscount));
  const qs = [
    { q: `What is the current course fee for ${rate.name}?`, ...options(inr(rate.courseFee ?? rate.totalPayable), fees) },
    { q: `What is the duration of ${rate.name}?`, ...options(rate.duration || '—', durations) },
    { q: `What is the maximum discount you may offer on ${rate.name}?`, ...options(inr(rate.maxDiscount), discounts) }
  ];
  if (Number(rate.examFee) > 0) {
    qs.push({ q: `How is the certification exam fee for ${rate.name} handled?`, o: ['Included in the course fee', `Charged separately — ${rate.examFeeText || inr(rate.examFee)}`, 'Waived for all students', 'Paid after placement'], a: 1 });
  }
  return [...qs, ...generic];
}
