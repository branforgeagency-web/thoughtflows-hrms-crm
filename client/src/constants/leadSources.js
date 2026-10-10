// 32 Complete Lead Sources tracked across Thoughtflows CRM
export const TIER_A_SOURCES = [
  { id: 's1', num: '#1', name: 'Google Calls / GMB', badge: 'GOOGLE', volume: '~180/mo · 35%' },
  { id: 's2', num: '#2', name: 'Direct Call', badge: 'SMO TEAM', volume: '~70/mo · 14%' },
  { id: 's3', num: '#3', name: 'Referral', badge: 'EXISTING STUDENT', volume: '~60/mo · 12%' },
  { id: 's4', num: '#4', name: 'Justdial', badge: 'JUSTDIAL', volume: '~45/mo · 9%' }
];

export const TIER_B_SOURCES = [
  { id: 's5', num: '#5', name: 'WhatsApp — Direct from Student', badge: 'WHATSAPP', volume: '~38/mo · 7%' },
  { id: 's6', num: '#6', name: 'Direct Walk-in', badge: 'BRANCH', volume: '~28/mo · 5.5%' },
  { id: 's7', num: '#7', name: 'Instagram Chatting', badge: 'INSTAGRAM', volume: '~20/mo · 4%' },
  { id: 's8', num: '#8', name: 'Old SMO Follow-up', badge: 'RECYCLE', volume: '~18/mo · 3.5%' },
  { id: 's9', num: '#9', name: 'LinkedIn Chatting', badge: 'LINKEDIN', volume: '~16/mo · 3%' }
];

export const TIER_C_SOURCES = [
  { id: 's10', num: '#10', name: 'Website Enquiry Form', badge: 'DM TEAM', volume: '~14/mo · 2.7%' },
  { id: 's11', num: '#11', name: 'Workshop', badge: 'COLLEGE VISIT', volume: '~12/mo · 2.3%' },
  { id: 's12', num: '#12', name: 'Old Student (Repeat)', badge: 'REPEAT', volume: '~10/mo · 2%' }
];

export const TIER_D_SOURCES = [
  { id: 's13', num: '#13', name: 'LinkedIn Direct Call', badge: 'LINKEDIN', volume: '~6/mo' },
  { id: 's14', num: '#14', name: 'Facebook Chatting', badge: 'FACEBOOK', volume: '~4/mo' },
  { id: 's15', num: '#15', name: 'Email Enquiry', badge: 'EMAIL', volume: '~3/mo' },
  { id: 's16', num: '#16', name: 'Instagram Direct Call', badge: 'INSTAGRAM', volume: '~3/mo' },
  { id: 's17', num: '#17', name: 'Facebook Direct Call', badge: 'FACEBOOK', volume: '~2/mo' },
  { id: 's18', num: '#18', name: 'YouTube DM', badge: 'YOUTUBE', volume: '~2/mo' },
  { id: 's19', num: '#19', name: 'Corporate Referrals', badge: 'B2B', volume: '~2/mo' },
  { id: 's20', num: '#20', name: 'College Bulk Demo', badge: 'COLLEGE', volume: '~2/mo' },
  { id: 's21', num: '#21', name: 'Facebook Job Post', badge: 'FACEBOOK', volume: '<1/mo' },
  { id: 's22', num: '#22', name: 'FB Messenger', badge: 'FACEBOOK', volume: '<1/mo' },
  { id: 's23', num: '#23', name: 'FB Comments', badge: 'FACEBOOK', volume: '<1/mo' },
  { id: 's24', num: '#24', name: 'Instagram Comments', badge: 'INSTAGRAM', volume: '<1/mo' },
  { id: 's25', num: '#25', name: 'LinkedIn Comments', badge: 'LINKEDIN', volume: '<1/mo' },
  { id: 's26', num: '#26', name: 'YouTube Comments', badge: 'YOUTUBE', volume: '<1/mo' },
  { id: 's27', num: '#27', name: 'Google My Business', badge: 'GOOGLE', volume: '<1/mo' },
  { id: 's28', num: '#28', name: 'Telegram', badge: 'TELEGRAM', volume: '<1/mo' },
  { id: 's29', num: '#29', name: 'Webinars', badge: 'EVENT', volume: '<1/mo' },
  { id: 's30', num: '#30', name: 'Job Portals (Naukri)', badge: 'JOB BOARD', volume: '<1/mo' },
  { id: 's31', num: '#31', name: 'Consulting Firms', badge: 'B2B', volume: '<1/mo' },
  { id: 's32', num: '#32', name: 'Pre-COVID Old Follow-up', badge: 'DORMANT', volume: '<1/mo' }
];

export const ALL_LEAD_SOURCES = [
  ...TIER_A_SOURCES,
  ...TIER_B_SOURCES,
  ...TIER_C_SOURCES,
  ...TIER_D_SOURCES
];

export const ALL_LEAD_SOURCE_NAMES = ALL_LEAD_SOURCES.map((s) => s.name);

// Grouped for SearchableSelect & optgroups
export const LEAD_SOURCE_GROUPS = [
  {
    group: 'tier_a',
    title: 'Tier A · Top Producers (70% of leads)',
    options: TIER_A_SOURCES.map((s) => s.name)
  },
  {
    group: 'tier_b',
    title: 'Tier B · Solid Performers',
    options: TIER_B_SOURCES.map((s) => s.name)
  },
  {
    group: 'tier_c',
    title: 'Tier C · Moderate Volume',
    options: TIER_C_SOURCES.map((s) => s.name)
  },
  {
    group: 'tier_d',
    title: 'Tier D · Long Tail & Other Channels',
    options: TIER_D_SOURCES.map((s) => s.name)
  }
];

// Lead Categories
export const PRIMARY_CATEGORIES = [
  { id: 'c1', label: 'BPO Reject', icon: '💼' },
  { id: 'c3', label: 'Working Pro (BPO/Hospital)', icon: '👩‍💼' },
  { id: 'c4', label: 'Final Year Student', icon: '🎓' },
  { id: 'c5', label: 'BPharm / BSc Nursing', icon: '💊' },
  { id: 'c6', label: 'Allied Health Graduate', icon: '🧬' },
  { id: 'c7', label: 'Already Employed', icon: '⚙️' },
  { id: 'c8', label: 'Career Gap (1-3 yrs)', icon: '⏸️' },
  { id: 'c9', label: 'Alumni Referral', icon: '⭐' },
  { id: 'c10', label: 'Walk-in Enquiry', icon: '🚪' },
  { id: 'c11', label: 'NRI / Overseas', icon: '🌐' },
  { id: 'c12', label: 'Career Switch', icon: '🔄' },
  { id: 'c13', label: 'Cold Call', icon: '📞' },
  { id: 'c14', label: 'Fresh Graduate', icon: '🎯' }
];

export const EXTRA_CATEGORIES = [
  { id: 'c15', label: 'Govt Exam Aspirant', icon: '🏥' },
  { id: 'c16', label: 'Parent Inquiring', icon: '👨‍👩‍👦' },
  { id: 'c17', label: 'IT / Non-Medical Switch', icon: '💻' },
  { id: 'c18', label: 'Lab Technician / Paramedical', icon: '🧪' },
  { id: 'c19', label: 'Exam Repeat / Retake', icon: '📝' },
  { id: 'c20', label: 'Homemaker Restart', icon: '🏠' },
  { id: 'c21', label: 'Urgent Placement Needed', icon: '⏳' },
  { id: 'c22', label: 'Fee Discount Seeking', icon: '💰' },
  { id: 'c23', label: 'Friend Group Joint Admission', icon: '🤝' },
  { id: 'c24', label: 'Outstation Relocation', icon: '📍' },
  { id: 'c25', label: 'High Merit Discount', icon: '🌟' }
];

export const ALL_CATEGORIES = [...PRIMARY_CATEGORIES, ...EXTRA_CATEGORIES];
