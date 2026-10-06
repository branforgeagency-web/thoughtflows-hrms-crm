// Organisation master data: the academy's branches and staff departments.
// Only identity fields live here — every count (students, staff, leads,
// admissions, members) is computed live from the database by the API.

export const BRANCH_MASTER = [
  { name: 'Saravanampatti', code: 'CBE-SVM', city: 'Coimbatore', state: 'Tamil Nadu', aliases: ['svm'], manager: 'Gayathri B', image: '/branches/saravanampatti.png' },
  { name: 'Gandhipuram', code: 'CBE-GPM', city: 'Coimbatore', state: 'Tamil Nadu', aliases: ['gpm'], manager: 'Sindhu S', image: '/branches/gandhipuram.png' },
  { name: 'Hopes', code: 'CBE-HPS', city: 'Coimbatore', state: 'Tamil Nadu', aliases: ['hopes college'], manager: 'Sruthi G', image: '/branches/hopes.png' },
  { name: 'Ameerpet', code: 'HYD-AMP', city: 'Hyderabad', state: 'Telangana', aliases: [], image: '/branches/ameerpet.png' },
  { name: 'Dilsukhnagar', code: 'HYD-DSN', city: 'Hyderabad', state: 'Telangana', aliases: [], image: '/branches/dilsukhnagar.png' },
  { name: 'Kochi', code: 'KER-KOC', city: 'Kochi', state: 'Kerala', aliases: ['cochin', 'ernakulam'], image: '/branches/kochi.png' },
  { name: 'Trivandrum', code: 'KER-TRV', city: 'Trivandrum', state: 'Kerala', aliases: ['thiruvananthapuram'], image: '/branches/trivandrum.png' },
  { name: 'Salem', code: 'TND-SLM', city: 'Salem', state: 'Tamil Nadu', aliases: [], image: '/branches/salem.png' },
  { name: 'Trichy', code: 'TND-TRY', city: 'Trichy', state: 'Tamil Nadu', aliases: ['tiruchirappalli', 'tiruchi'], image: '/branches/trichy.png' },
  { name: 'Tirupati', code: 'AND-TPT', city: 'Tirupati', state: 'Andhra Pradesh', aliases: ['tirupathi'], image: '/branches/tirupati.png' },
  { name: 'Vizag', code: 'AND-VZG', city: 'Visakhapatnam', state: 'Andhra Pradesh', aliases: ['visakhapatnam', 'vizianagaram'], image: '/branches/vizag.png' },
  { name: 'Kollapur', code: 'MAH-KLP', city: 'Kolhapur', state: 'Maharashtra', aliases: ['kolhapur'], image: '/branches/kollapur.png' },
  { name: 'Pune', code: 'MAH-PUN', city: 'Pune', state: 'Maharashtra', aliases: [], image: '/branches/pune.png' },
  { name: 'Theni', code: 'TND-THN', city: 'Theni', state: 'Tamil Nadu', aliases: [], image: '/branches/theni.png' }
];

// `dashboard` is the department id staff of this department log into.
export const DEPARTMENT_MASTER = [
  { code: 'DEP-HR-001', dashboard: 'hr', name: 'HR & Admissions', icon: 'PhoneCall', color: '#7C3AED', description: 'Academic counsellors — lead capture, calls, follow-ups, demos & admissions.' },
  { code: 'ACAD', dashboard: 'training', name: 'Training & Faculty', icon: 'GraduationCap', color: '#2563EB', description: 'Trainers running batches, attendance, assessments & placement readiness.' },
  { code: 'CCCP', dashboard: 'cccp', name: 'Corporate Career & Placement Cell', icon: 'HeartHandshake', color: '#059669', description: 'Placement Cell · Examination Cell · College & Company Cell.' },
  { code: 'MKT', dashboard: 'marketing', name: 'Growth & Marketing', icon: 'PieChart', color: '#D97706', description: 'Campaigns, lead sources, creatives and branch lead demand.' },
  { code: 'LEAD', dashboard: 'leadership', name: 'Leadership & Operations', icon: 'Briefcase', color: '#EA580C', description: 'Operational, department, regional & branch heads.' },
  { code: 'ADM', dashboard: 'admin', name: 'Admin & Management', icon: 'Server', color: '#4338CA', description: 'Founders desk, policies, user accounts & back office.' }
];

export const DEPT_CODE_BY_DASHBOARD = Object.fromEntries(DEPARTMENT_MASTER.map((d) => [d.dashboard, d.code]));
