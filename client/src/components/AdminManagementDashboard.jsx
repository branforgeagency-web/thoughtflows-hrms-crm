import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  UserPlus, 
  Award, 
  Users, 
  Building2, 
  BookOpen, 
  BarChart3, 
  ShieldCheck, 
  Key, 
  Search, 
  Plus, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  DollarSign, 
  Clock, 
  Filter, 
  ArrowUpRight, 
  RefreshCw, 
  LogOut, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Calendar, 
  Trash2, 
  Edit3, 
  Save, 
  Sliders, 
  FileText, 
  Download,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  Zap,
  TrendingUp,
  Percent,
  Sparkles,
  Layers,
  HelpCircle,
  ExternalLink,
  ArrowLeft,
  Bell,
  Home,
  SlidersHorizontal,
  ChevronDown,
  ArrowRight,
  Repeat
} from 'lucide-react';
import axios from 'axios';
import TeamPerformanceBoard from './TeamPerformanceBoard';
import { onDataUpdate, getStats, getAdminSlabs, updateAdminSlabs, getAuditLogs, createAuditLog } from '../services/api';
import { COURSE_CATEGORIES, ALL_COURSES, TRAINER_COURSES } from '../constants/courses';
import TrainerScheduleEditor from './TrainerScheduleEditor';

// Exact Academy Roles matching User screenshot
const ACADEMY_ROLES = [
  'HR',
  'Trainer',
  'Student',
  'Branch Manager',
  'Regional Manager',
  'Dept Head · HR',
  'Dept Head · Marketing',
  'Dept Head · CCCP',
  'Operational Head',
  'Management',
  'CCCP Team',
  'Marketing Team'
];

const ROLE_TO_DEPARTMENT = {
  'HR': 'Admissions & Counseling',
  'Trainer': 'Medical Coding Faculty',
  'Student': 'Student Scholar',
  'Branch Manager': 'Leadership & Operations',
  'Regional Manager': 'Leadership & Operations',
  'Dept Head · HR': 'Admissions & Counseling',
  'Dept Head · Marketing': 'Growth & Marketing',
  'Dept Head · CCCP': 'Corporate Placements',
  'Operational Head': 'Leadership & Operations',
  'Management': 'Admin & Management',
  'CCCP Team': 'Corporate Placements',
  'Marketing Team': 'Growth & Marketing'
};

// Extra inputs a Trainer login needs beyond the generic staff account —
// these seed the Trainer roster (used for demo-booking eligibility,
// course matching & shift checks) at the same time the login is created.
const TRAINER_LANGUAGES = ['Tamil', 'English', 'Telugu', 'Malayalam', 'Hindi', 'Kannada'];

const timeToMinutes = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

// Progressive Incentive Policy (Matches Exact User Reference Screenshot)
const DEFAULT_INCENTIVE_POLICY = {
  defaultTarget: 25,
  bands: [
    { id: 'b1', label: '1–5 past target', upTo: 5, rate: 500 },
    { id: 'b2', label: '6–10 past target', upTo: 10, rate: 750 },
    { id: 'b3', label: '11–15 past target', upTo: 15, rate: 1000 }
  ],
  demoTarget: 25,
  demoClosed: 23
};

// Calculate progressive incentive
const calculateProgressiveIncentive = (closed, target, bands) => {
  const pastTarget = Math.max(0, (Number(closed) || 0) - (Number(target) || 0));
  if (pastTarget <= 0 || !Array.isArray(bands) || bands.length === 0) return 0;

  let earned = 0;
  let prevUpTo = 0;

  for (const band of bands) {
    const upTo = Number(band.upTo) || 0;
    const bandCapacity = upTo - prevUpTo;
    if (bandCapacity <= 0) continue;

    if (pastTarget > prevUpTo) {
      const leadsInBand = Math.min(pastTarget - prevUpTo, bandCapacity);
      earned += leadsInBand * (Number(band.rate) || 0);
    }
    prevUpTo = upTo;
  }
  return earned;
};

// Default initial incentive slabs (for backward compatibility)
const DEFAULT_SLABS = [
  { id: 'slab_1', slab: 'Slab 1', range: '1 – 10 Admissions', min: 1, max: 10, rate: 500, labelRate: '₹500 / admission', status: 'Base Tier', note: 'Standard counselor qualification' },
  { id: 'slab_2', slab: 'Slab 2', range: '11 – 20 Admissions', min: 11, max: 20, rate: 700, labelRate: '₹700 / admission', status: 'Active Tier', note: 'Accelerated conversion bonus', isCurrent: true },
  { id: 'slab_3', slab: 'Slab 3', range: '21 – 25 Admissions', min: 21, max: 25, rate: 1000, labelRate: '₹1,000 / admission', status: 'High Performer', note: 'Top quartile counselor bonus' },
  { id: 'slab_4', slab: 'Slab 4', range: '26+ Admissions', min: 26, max: 999, rate: 1500, labelRate: '₹1,500 / admission + ₹8,000 Milestone Bonus', milestoneBonus: 8000, status: 'Super Performer', note: 'Executive milestone tier' }
];

// Initial user accounts
// Accounts come only from the database (passwords are never sent to the browser)
const INITIAL_USERS = [];

// 14 Official Academy Branches matching User Reference (South India Zone + Pune, Kollapur, Theni)
const ACADEMY_BRANCHES = [
  { 
    id: 'saravanampatti',
    code: 'CBE-SVM', 
    name: 'Saravanampatti', 
    city: 'Coimbatore', 
    state: 'Tamil Nadu', 
    head: 'Gayathri B', 
    role: 'Branch Manager of SVM',
    capacity: 90, 
    activeStudents: 430, 
    staffCount: 28, 
    status: 'Operational',
    image: '/branches/saravanampatti.png'
  },
  { 
    id: 'gandhipuram',
    code: 'CBE-GPM', 
    name: 'Gandhipuram', 
    city: 'Coimbatore', 
    state: 'Tamil Nadu', 
    head: 'Sindhu S', 
    role: 'Process Coach / Branch Manager Of GPM',
    capacity: 85, 
    activeStudents: 410, 
    staffCount: 26, 
    status: 'Operational',
    image: '/branches/gandhipuram.png'
  },
  { 
    id: 'hopes',
    code: 'CBE-HPS', 
    name: 'Hopes', 
    city: 'Coimbatore', 
    state: 'Tamil Nadu', 
    head: 'Sruthi G', 
    role: 'Branch Manager Of Hopes',
    capacity: 75, 
    activeStudents: 340, 
    staffCount: 22, 
    status: 'Operational',
    image: '/branches/hopes.png'
  },
  { 
    id: 'ameerpet',
    code: 'HYD-AMP', 
    name: 'Ameerpet', 
    city: 'Hyderabad', 
    state: 'Telangana', 
    head: 'A. Lokesh Babu', 
    role: 'Regional / Marketing Head',
    capacity: 80, 
    activeStudents: 380, 
    staffCount: 24, 
    status: 'Operational',
    image: '/branches/ameerpet.png'
  },
  { 
    id: 'dilsukhnagar',
    code: 'HYD-DSN', 
    name: 'Dilsukhnagar', 
    city: 'Hyderabad', 
    state: 'Telangana', 
    head: 'Srikanth V.', 
    role: 'Branch Operations Lead',
    capacity: 70, 
    activeStudents: 310, 
    staffCount: 19, 
    status: 'Operational',
    image: '/branches/dilsukhnagar.png'
  },
  { 
    id: 'kochi',
    code: 'KER-KOC', 
    name: 'Kochi', 
    city: 'Kochi', 
    state: 'Kerala', 
    head: 'Anand S.', 
    role: 'Kerala Operations Lead',
    capacity: 65, 
    activeStudents: 290, 
    staffCount: 18, 
    status: 'Operational',
    image: '/branches/kochi.png'
  },
  { 
    id: 'trivandrum',
    code: 'KER-TRV', 
    name: 'Trivandrum', 
    city: 'Trivandrum', 
    state: 'Kerala', 
    head: 'Sujith M.', 
    role: 'Branch Coordinator',
    capacity: 55, 
    activeStudents: 240, 
    staffCount: 15, 
    status: 'Operational',
    image: '/branches/trivandrum.png'
  },
  { 
    id: 'salem',
    code: 'TND-SLM', 
    name: 'Salem', 
    city: 'Salem', 
    state: 'Tamil Nadu', 
    head: 'Saravanan M.', 
    role: 'Branch Principal',
    capacity: 60, 
    activeStudents: 260, 
    staffCount: 16, 
    status: 'Operational',
    image: '/branches/salem.png'
  },
  { 
    id: 'trichy',
    code: 'TND-TRY', 
    name: 'Trichy', 
    city: 'Trichy', 
    state: 'Tamil Nadu', 
    head: 'Deepa T.', 
    role: 'Branch Lead',
    capacity: 60, 
    activeStudents: 275, 
    staffCount: 17, 
    status: 'Operational',
    image: '/branches/trichy.png'
  },
  { 
    id: 'tirupati',
    code: 'AND-TPT', 
    name: 'Tirupati', 
    city: 'Tirupati', 
    state: 'Andhra Pradesh', 
    head: 'Ravi Teja B.', 
    role: 'Branch Lead',
    capacity: 55, 
    activeStudents: 235, 
    staffCount: 14, 
    status: 'Operational',
    image: '/branches/tirupati.png'
  },
  { 
    id: 'vizag',
    code: 'AND-VZG', 
    name: 'Vizag', 
    city: 'Visakhapatnam', 
    state: 'Andhra Pradesh', 
    head: 'Kalyan K.', 
    role: 'AP Operations Lead',
    capacity: 70, 
    activeStudents: 310, 
    staffCount: 20, 
    status: 'Operational',
    image: '/branches/vizag.png'
  },
  { 
    id: 'kollapur',
    code: 'MAH-KLP', 
    name: 'Kollapur', 
    city: 'Kolhapur', 
    state: 'Maharashtra', 
    head: 'Sachin D.', 
    role: 'Branch Operations Lead',
    capacity: 55, 
    activeStudents: 230, 
    staffCount: 14, 
    status: 'Operational',
    image: '/branches/kollapur.png'
  },
  { 
    id: 'pune',
    code: 'MAH-PUN', 
    name: 'Pune', 
    city: 'Pune', 
    state: 'Maharashtra', 
    head: 'Amol K.', 
    role: 'Regional Manager - MH',
    capacity: 70, 
    activeStudents: 310, 
    staffCount: 19, 
    status: 'Operational',
    image: '/branches/pune.png'
  },
  { 
    id: 'theni',
    code: 'TND-THN', 
    name: 'Theni', 
    city: 'Theni', 
    state: 'Tamil Nadu', 
    head: 'Muthu K.', 
    role: 'Branch Coordinator',
    capacity: 50, 
    activeStudents: 215, 
    staffCount: 13, 
    status: 'Operational',
    image: '/branches/theni.png'
  }
];

// Initial Staff Directory
const INITIAL_STAFF = [
  { id: 'stf_01', name: 'Pooja J.', dept: 'Admissions & Counseling', role: 'Lead Counselor', branch: 'Chennai - Guindy', email: 'pooja.j@thoughtflows.in', phone: '+91 98401 22334', status: 'On Duty' },
  { id: 'stf_02', name: 'Kavitha N.', dept: 'Admissions & Counseling', role: 'Senior Admissions Manager', branch: 'Coimbatore - Gandhipuram', email: 'kavitha.n@thoughtflows.in', phone: '+91 97891 44556', status: 'On Duty' },
  { id: 'stf_03', name: 'Kalaiselvi M.', dept: 'Admissions & Counseling', role: 'Tele-Counselor', branch: 'Chennai - Anna Nagar', email: 'kalaiselvi@thoughtflows.in', phone: '+91 94432 11223', status: 'On Duty' },
  { id: 'stf_04', name: 'Dr. Vikram C.', dept: 'Medical Coding Faculty', role: 'Chief CPC Faculty & AAPC Trainer', branch: 'Chennai - Guindy', email: 'vikram.c@thoughtflows.in', phone: '+91 98840 99887', status: 'In Lecture' },
  { id: 'stf_05', name: 'Faith A.', dept: 'Medical Coding Faculty', role: 'ICD-10 & CPT Specialist Trainer', branch: 'Bangalore - Indiranagar', email: 'faith.a@thoughtflows.in', phone: '+91 98450 77665', status: 'On Duty' },
  { id: 'stf_06', name: 'Suresh V.', dept: 'CPC Examination Cell', role: 'Exam Cell Controller', branch: 'Chennai - Guindy', email: 'suresh.v@thoughtflows.in', phone: '+91 99400 33445', status: 'On Duty' },
  { id: 'stf_07', name: 'Meenakshi R.', dept: 'Corporate Placements', role: 'Head of Corporate Placements', branch: 'Bangalore - Indiranagar', email: 'meenakshi.r@thoughtflows.in', phone: '+91 96112 55667', status: 'Meeting' },
  { id: 'stf_08', name: 'Balaji R.', dept: 'HR & Talent Acquisition', role: 'HR Operations Manager', branch: 'Chennai - Guindy', email: 'balaji.r@thoughtflows.in', phone: '+91 98409 66778', status: 'On Duty' },
  { id: 'stf_09', name: 'Dinesh P.', dept: 'IT Infrastructure & LMS', role: 'Systems & Security Architect', branch: 'Bangalore - Marathahalli', email: 'dinesh.p@thoughtflows.in', phone: '+91 98860 88990', status: 'On Duty' },
  { id: 'stf_10', name: 'Kavitha V.', dept: 'Finance & Branch Operations', role: 'Finance Controller', branch: 'Chennai - Guindy', email: 'kavitha.v@thoughtflows.in', phone: '+91 99620 44556', status: 'On Duty' },
  { id: 'stf_11', name: 'Subha M.', dept: 'Leadership & Operations', role: 'Branch Principal', branch: 'Chennai - Anna Nagar', email: 'subha.m@thoughtflows.in', phone: '+91 98402 77889', status: 'On Duty' },
  { id: 'stf_12', name: 'Ganesh N.', dept: 'Leadership & Operations', role: 'Regional Operations Director', branch: 'Thoughtflows Group HQ', email: 'ganesh.n@thoughtflows.in', phone: '+91 99401 88990', status: 'On Duty' }
];

// Initial Audit Logs
const INITIAL_AUDIT_LOGS = [
  { id: 'log_01', timestamp: '2026-09-16 09:38:12', user: 'Executive Admin', action: 'Incentive Slabs Verified', category: 'Policy', severity: 'Info', ip: '192.168.1.104', details: 'Slab 2 target set to 11–20 admissions at ₹700/adm' },
  { id: 'log_02', timestamp: '2026-09-16 09:24:45', user: 'Kavitha N. (HR)', action: 'Student Admission Confirmed', category: 'CRM', severity: 'Success', ip: '192.168.2.45', details: 'Enrolled Keerthana R. into Batch TF-CBE-CPC-07' },
  { id: 'log_03', timestamp: '2026-09-16 08:55:10', user: 'System (Automated)', action: 'Nightly Database Sync', category: 'System', severity: 'Info', ip: '10.0.0.1', details: 'Synced 3,970 active students & 487 leads' },
  { id: 'log_04', timestamp: '2026-09-16 08:12:30', user: 'Executive Admin', action: 'User Session Initiated', category: 'Auth', severity: 'Info', ip: '192.168.1.104', details: 'Admin login via admin@thoughtflows.in' },
  { id: 'log_05', timestamp: '2026-09-15 18:40:19', user: 'Finance Controller', action: 'Course Fee Rate Updated', category: 'Finance', severity: 'Warning', ip: '192.168.1.112', details: 'Updated CPC training fee to ₹21,000' }
];

// Official HR Roster (Exact 38 team members grouped across 5 departments matching User Reference)
const OFFICIAL_HR_ROSTER = [
  {
    department: 'Leadership',
    borderAccent: 'border-l-4 border-l-purple-600',
    avatarBg: 'bg-[#7c3aed]',
    members: [
      { name: 'Kartheeswari K', role: 'Operational Head', empId: '-', initials: 'KK' },
      { name: 'Aswanth V K', role: 'Regional head', empId: 'TFB8683', initials: 'AK' }
    ]
  },
  {
    department: 'HR Leadership',
    borderAccent: 'border-l-4 border-l-teal-500',
    avatarBg: 'bg-[#0d9488]',
    members: [
      { name: 'Jasmin', role: 'Head of HR Department', empId: 'TFB8561', initials: 'J' },
      { name: 'A. Lokesh Babu', role: 'Head of HR /Digital Marketing', empId: 'TFB8559', initials: 'AB' }
    ]
  },
  {
    department: 'Branch Management',
    borderAccent: 'border-l-4 border-l-blue-600',
    avatarBg: 'bg-[#2563eb]',
    members: [
      { name: 'Gayathri B', role: 'Branch Manager of SVM', empId: 'TFB8558', initials: 'GB' },
      { name: 'Sruthi G', role: 'Branch Manager Of Hopes', empId: 'TFB8578', initials: 'SG' },
      { name: 'Sindhu S', role: 'Process Coach / Branch Manager Of GPM', empId: 'TFB8588', initials: 'SS' }
    ]
  },
  {
    department: 'HR — Team Leads',
    borderAccent: 'border-l-4 border-l-amber-500',
    avatarBg: 'bg-[#ea580c]',
    members: [
      { name: 'Kalaiselvi C', role: 'Team Lead', empId: 'TFB8591', initials: 'KC' },
      { name: 'Punitha', role: 'Team Lead', empId: 'TFB8593', initials: 'P' },
      { name: 'R Priyadharshini', role: 'Team Lead', empId: 'TFB8783', initials: 'RP' },
      { name: 'Guru Vigneshwar S', role: 'Team Lead', empId: 'TFB8697', initials: 'GS' },
      { name: 'Sindhuja Erothu', role: 'Team Lead', empId: 'TFB8637', initials: 'SE' },
      { name: 'Anakha Suresh M', role: 'Team Lead', empId: 'TFB8575', initials: 'AM' },
      { name: 'Peemuthannagari Supraja', role: 'Team Lead', empId: 'TFB8643', initials: 'PS' }
    ]
  },
  {
    department: 'HR — Counsellors',
    borderAccent: 'border-l-4 border-l-emerald-600',
    avatarBg: 'bg-[#059669]',
    members: [
      { name: 'Sangavi', role: 'HR Executive', empId: 'TFB8711', initials: 'S' },
      { name: 'Reshma V Jenifer', role: 'HR Executive', empId: 'TFB8687', initials: 'RJ' },
      { name: 'Pavithra N', role: 'HR Executive', empId: 'TFB8678', initials: 'PN' },
      { name: 'Prabhu M', role: 'HR Executive', empId: 'TFB8653', initials: 'PM' },
      { name: 'Julie Arokiam', role: 'HR Executive', empId: 'TFB8702', initials: 'JA' },
      { name: 'K.V.K.Kanchana', role: 'HR Executive', empId: 'TFB8685', initials: 'K' },
      { name: 'Dhivya S', role: 'HR Executive', empId: '-', initials: 'DS' },
      { name: 'Deepthi G', role: 'HR Executive', empId: '-', initials: 'DG' },
      { name: 'Dharshini', role: 'HR Executive', empId: 'TFB8642', initials: 'D' },
      { name: 'Subiksha M', role: 'HR Executive', empId: 'TFB8689', initials: 'SM' },
      { name: 'Kannan S', role: 'HR Executive', empId: '-', initials: 'KS' },
      { name: 'Keerthiga M', role: 'HR Executive', empId: '-', initials: 'KM' },
      { name: 'Dubba Manjula', role: 'HR Executive', empId: 'TFB8788', initials: 'DM' },
      { name: 'Divya Kannuri', role: 'HR Executive', empId: 'TFB8718', initials: 'DK' },
      { name: 'Bonda Likitha', role: 'HR Executive', empId: '-', initials: 'BL' },
      { name: 'Gayathri Uppara', role: 'HR Executive', empId: 'TFB8662', initials: 'GU' },
      { name: 'G.Vishnupriya', role: 'HR Executive', empId: 'TFB8728', initials: 'G' },
      { name: 'Nidanakavi Rahul', role: 'HR Executive & OM', empId: 'TFB8722', initials: 'NR' },
      { name: 'Anitha', role: 'HR Executive', empId: 'TFV858', initials: 'A' },
      { name: 'Sai Deepthi', role: 'HR Executive', empId: 'TFV866', initials: 'SD' },
      { name: 'Bhanu Priyanka', role: 'HR Executive', empId: 'TFV867', initials: 'BP' },
      { name: 'Vishnupriya Dev', role: 'HR Executive', empId: 'TFB8784', initials: 'VD' },
      { name: 'SREELEKHA P C', role: 'HR Executive', empId: 'TFB8618', initials: 'SC' },
      { name: 'ARYASREE A', role: 'HR Executive', empId: 'TFB8647', initials: 'AA' }
    ]
  }
];

export default function AdminManagementDashboard({ 
  onClose, 
  currentUser, 
  onLogout, 
  onSwitchDepartment, 
  theme = 'classic' 
}) {
  // Active module view: 'overview' | 'users' | 'slabs' | 'directory' | 'branches' | 'catalog' | 'founders' | 'audit'
  const [activeModule, setActiveModule] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState(null);
  const [dashboardsMenuOpen, setDashboardsMenuOpen] = useState(false);

  // Live Executive Stats
  const [executiveStats, setExecutiveStats] = useState({
    grossRevenue: 9240000,
    activeStudents: 3970,
    placementRate: '98.4%',
    activeStaff: 280,
    activeLeads: 48,
    placedStudents: 156
  });

  const fetchLiveExecutiveStats = async () => {
    try {
      const stats = await getStats();
      if (stats) {
        setExecutiveStats(prev => ({
          ...prev,
          grossRevenue: stats.grossRevenue || prev.grossRevenue,
          activeStudents: stats.activeStudents || prev.activeStudents,
          placementRate: stats.placementRate || prev.placementRate,
          activeLeads: stats.activeLeads || prev.activeLeads,
          placedStudents: stats.placedStudents || prev.placedStudents
        }));
      }
    } catch (err) {
      console.warn('Live executive stats fetch notice:', err.message);
    }
  };

  useEffect(() => {
    fetchLiveExecutiveStats();

    const unsub = onDataUpdate((entity) => {
      fetchLiveExecutiveStats();
    });
    return () => unsub();
  }, []);

  // Live State
  const [incentivePolicy, setIncentivePolicy] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_incentive_policy');
      return saved ? JSON.parse(saved) : DEFAULT_INCENTIVE_POLICY;
    } catch {
      return DEFAULT_INCENTIVE_POLICY;
    }
  });

  const [slabs, setSlabs] = useState(DEFAULT_SLABS);

  // Live Slabs and Audit Logs from DB
  useEffect(() => {
    let isMounted = true;
    const fetchSlabsAndLogs = async () => {
      try {
        const [slabsData, logsData] = await Promise.all([
          getAdminSlabs().catch(() => null),
          getAuditLogs().catch(() => null)
        ]);
        if (!isMounted) return;
        if (Array.isArray(slabsData) && slabsData.length > 0) {
          setSlabs(slabsData);
        }
        if (Array.isArray(logsData) && logsData.length > 0) {
          setAuditLogs(logsData);
        }
      } catch (err) {
        console.warn('Admin slabs/logs fetch error:', err.message);
      }
    };

    fetchSlabsAndLogs();

    const unsub = onDataUpdate((entity) => {
      if (['slabs', 'audit_logs'].includes(entity)) {
        fetchSlabsAndLogs();
      }
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  const [users, setUsers] = useState(() => {
    // Older builds cached every account password in the browser — wipe it
    try { localStorage.removeItem('thoughtflows_admin_users'); } catch (_) {}
    return INITIAL_USERS;
  });

  // Password visibility controls
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [showAllPasswords, setShowAllPasswords] = useState(false);

  const togglePasswordVisibility = (userId) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  // Load live user accounts directly from MongoDB database
  useEffect(() => {
    axios.get('/api/admin/users')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setUsers(res.data);
        }
      })
      .catch(err => {
        console.warn('Backend users notice:', err.message);
      });
  }, []);

  const [staffList, setStaffList] = useState(INITIAL_STAFF);
  const [branchesList, setBranchesList] = useState(ACADEMY_BRANCHES);
  const [auditLogs, setAuditLogs] = useState(INITIAL_AUDIT_LOGS);
  const [courseRates, setCourseRates] = useState([]);
  const [loadingRates, setLoadingRates] = useState(false);

  // Modals for Actions
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingSlab, setEditingSlab] = useState(null);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'HR',
    department: 'Admissions & Counseling',
    branch: 'Saravanampatti',
    password: '',
    // Trainer-only fields — shown when role === 'Trainer' and used to
    // seed the Trainer roster (Demo Booking eligibility engine)
    trainerId: '',
    zoomEmail: '',
    expertCourse: 'CPC',
    trainerLanguages: ['Tamil', 'English'],
    shiftStart: '06:00',
    shiftEnd: '14:00',
    demoTrainer: false
  });

  // Selected Department Filter for Employee Directory
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');

  // User Accounts Search & Role Filter
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('All');

  // Branch Setup Search & State Filter
  const [branchSearchQuery, setBranchSearchQuery] = useState('');
  const [selectedBranchState, setSelectedBranchState] = useState('All');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch course fee rates
  useEffect(() => {
    setLoadingRates(true);
    axios.get('/api/fees/rates')
      .then(res => {
        if (Array.isArray(res.data) && res.data.length > 0) {
          setCourseRates(res.data);
        }
        setLoadingRates(false);
      })
      .catch(() => {
        setCourseRates(ALL_COURSES.map(c => ({
          code: c.code,
          name: c.name,
          duration: c.duration,
          registrationFee: 2000,
          trainingFee: Math.max(0, c.fee - 2000),
          examFee: c.examFee,
          courseFee: c.fee,
          totalPayable: c.total
        })));
        setLoadingRates(false);
      });
  }, []);

  const logAdminAction = async (logData) => {
    try {
      await createAuditLog(logData);
    } catch (e) {
      console.warn('Audit log write notice:', e.message);
    }
    setAuditLogs(prev => [logData, ...prev]);
  };

  // Save Slabs
  const handleSaveSlab = async (updatedSlab) => {
    const updated = slabs.map(s => (s.id === updatedSlab.id || (s._id && s._id === updatedSlab._id)) ? updatedSlab : s);
    setSlabs(updated);
    try {
      await updateAdminSlabs(updated);
    } catch (e) {
      console.warn('Failed to save slabs to API', e);
    }
    
    // Append to audit log
    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser?.name || 'Executive Admin',
      action: 'Incentive Slab Updated',
      category: 'Policy',
      severity: 'Info',
      ip: '192.168.1.104',
      details: `${updatedSlab.slab}: Rate set to ₹${updatedSlab.rate} for ${updatedSlab.range}`
    };
    logAdminAction(newLog);

    setEditingSlab(null);
    showToast(`✓ ${updatedSlab.slab} successfully updated! HR Target Banner synced.`);
  };

  // Add a new progressive incentive band
  const handleAddBand = () => {
    const bands = incentivePolicy.bands || [];
    const lastBand = bands[bands.length - 1];
    const prevUpTo = lastBand ? Number(lastBand.upTo) : 0;
    const nextUpTo = prevUpTo + 5;
    const newBand = {
      id: `b_${Date.now()}`,
      label: `${prevUpTo + 1}–${nextUpTo} past target`,
      upTo: nextUpTo,
      rate: lastBand ? Number(lastBand.rate) + 250 : 500
    };
    setIncentivePolicy(prev => ({
      ...prev,
      bands: [...(prev.bands || []), newBand]
    }));
  };

  // Update a band field
  const handleUpdateBand = (index, field, value) => {
    setIncentivePolicy(prev => {
      const nextBands = [...(prev.bands || [])];
      nextBands[index] = { ...nextBands[index], [field]: value };
      return { ...prev, bands: nextBands };
    });
  };

  // Remove a band
  const handleRemoveBand = (index) => {
    if ((incentivePolicy.bands || []).length <= 1) {
      showToast('⚠️ At least one incentive band is required.');
      return;
    }
    setIncentivePolicy(prev => ({
      ...prev,
      bands: prev.bands.filter((_, i) => i !== index)
    }));
  };

  // Save policy and update HR banner
  const handleSaveIncentivePolicy = (e) => {
    if (e) e.preventDefault();
    try {
      localStorage.setItem('thoughtflows_incentive_policy', JSON.stringify(incentivePolicy));
      // Sync legacy slabs format for HrMyTargets compatibility
      const syncedSlabs = (incentivePolicy.bands || []).map((b, idx) => ({
        id: `slab_${idx + 1}`,
        slab: `Tier ${idx + 1}`,
        range: b.label,
        rate: Number(b.rate),
        labelRate: `₹${b.rate} / lead`,
        status: idx === 0 ? 'Active Tier' : 'Higher Tier',
        isCurrent: idx === 0
      }));
      localStorage.setItem('thoughtflows_admin_slabs', JSON.stringify(syncedSlabs));
      setSlabs(syncedSlabs);
    } catch (err) {
      console.warn('Failed to save policy', err);
    }

    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser?.name || 'Executive Admin',
      action: 'Incentive Policy Saved',
      category: 'Policy',
      severity: 'Success',
      ip: '192.168.1.104',
      details: `Default Target: ${incentivePolicy.defaultTarget}, ${incentivePolicy.bands.length} bands updated`
    };
    logAdminAction(newLog);

    showToast('✓ Incentive policy saved! HR Target banner updated.');
  };

  // Add New User
  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) {
      showToast('⚠️ Please enter name and email.');
      return;
    }

    const newUser = {
      id: `usr_${Date.now()}`,
      name: newUserForm.name,
      email: newUserForm.email.toLowerCase(),
      phone: newUserForm.phone || '',
      password: newUserForm.password,
      role: newUserForm.role,
      department: newUserForm.department,
      branch: newUserForm.branch,
      status: 'Active',
      lastLogin: 'Never',
      avatarBg: 'bg-indigo-600'
    };

    // Save to MongoDB
    try {
      const res = await axios.post('/api/admin/users', newUser);
      if (res.data?.id || res.data?._id) {
        newUser.id = res.data.id || res.data._id;
        newUser._id = res.data._id || res.data.id;
      }
    } catch (err) {
      showToast(`⚠ ${err?.response?.data?.error || 'Could not create the user'}`);
      return;
    }
    delete newUser.password;

    // Trainer accounts also need a Trainer roster record (Demo Booking
    // eligibility engine matches on course/language/branch/shift — none of
    // which live on the generic User login).
    if (newUserForm.role === 'Trainer' && newUserForm.trainerId) {
      const courseLabel = TRAINER_COURSES.find((c) => c.key === newUserForm.expertCourse)?.label || newUserForm.expertCourse;
      try {
        await axios.put(`/api/trainer/settings/${encodeURIComponent(newUserForm.trainerId)}`, {
          trainerName: newUserForm.name,
          // Login email links this roster record to the trainer's portal account
          email: (newUserForm.email || '').trim().toLowerCase(),
          zoomEmail: (newUserForm.zoomEmail || newUserForm.email || '').trim().toLowerCase(),
          courseKey: newUserForm.expertCourse,
          expertCourse: courseLabel,
          specialization: courseLabel,
          languages: newUserForm.trainerLanguages,
          branchName: newUserForm.branch,
          demoTrainer: newUserForm.demoTrainer,
          active: true,
          isExperienced: true,
          shift: `${newUserForm.shiftStart} – ${newUserForm.shiftEnd}`,
          shiftStartMin: timeToMinutes(newUserForm.shiftStart),
          shiftEndMin: timeToMinutes(newUserForm.shiftEnd)
        });
      } catch (err) {
        console.warn('Trainer roster save notice', err.message);
      }
    }

    const nextUsers = [newUser, ...users];
    setUsers(nextUsers);
    try {
      localStorage.setItem('thoughtflows_admin_users', JSON.stringify(nextUsers));
    } catch (e) {
      console.warn('Failed to save user', e);
    }

    const newLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      user: currentUser?.name || 'Executive Admin',
      action: 'User Account Created',
      category: 'Auth',
      severity: 'Success',
      ip: '192.168.1.104',
      details: `Created login for ${newUser.name} (${newUser.email}) - Role: ${newUser.role}`
    };
    logAdminAction(newLog);

    setShowAddUserModal(false);
    setIsRoleDropdownOpen(false);
    setNewUserForm({
      name: '',
      email: '',
      phone: '',
      role: 'HR',
      department: 'Admissions & Counseling',
      branch: 'Saravanampatti',
      password: '',
      trainerId: '',
      zoomEmail: '',
      expertCourse: 'CPC',
      trainerLanguages: ['Tamil', 'English'],
      shiftStart: '06:00',
      shiftEnd: '14:00',
      demoTrainer: false
    });
    showToast(`✓ Account created for ${newUser.name}`);
  };

  // Delete User
  const handleDeleteUser = async (id, name, email) => {
    if (confirm(`Remove account for ${name}?`)) {
      try {
        await axios.delete(`/api/admin/users/${id}?email=${encodeURIComponent(email || '')}`);
      } catch (err) {
        console.warn('Backend user delete notice', err.message);
      }
      const next = users.filter(u => u.id !== id && u._id !== id);
      setUsers(next);
      try {
        localStorage.setItem('thoughtflows_admin_users', JSON.stringify(next));
      } catch (e) {
        console.warn('Failed to save users', e);
      }
      showToast(`User ${name} removed.`);
    }
  };

  // Edit / Reset User Login Password
  const handleEditPassword = async (id, name, _unused, email) => {
    const newPwd = prompt(`Set a new login password for ${name} (min 8 characters):`, '');
    if (newPwd === null) return;
    if (newPwd.trim().length < 8) { showToast('⚠ Password must be at least 8 characters'); return; }
    try {
      await axios.put(`/api/admin/users/${id}`, { password: newPwd.trim(), email });
      showToast(`✓ Password updated for ${name}`);
    } catch (err) {
      showToast(`⚠ ${err?.response?.data?.error || 'Could not update the password'}`);
    }
  };

  return (
    // Standalone Full-Page Dashboard Container (Not a modal popup)
    <div className="fixed inset-0 z-50 overflow-y-auto min-h-screen w-full bg-[#f4f7fa] flex flex-col font-sans text-slate-800 animate-fadeIn selection:bg-indigo-100 selection:text-indigo-900">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-8 z-60 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-indigo-500/50 text-xs font-semibold flex items-center gap-2.5 animate-bounce">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Full-Width Executive Header Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 flex-wrap">
        
        {/* Left: Brand Emblem & Portal Title */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-3">
            <div className="px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs">
              <img src="/thoughtflows-logo.png" alt="Thoughtflows" className="h-6 w-auto object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Admin & Management Dashboard
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200/80 uppercase tracking-wider">
                  Executive Command Bridge
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden md:block">
                Academy Policy Engine • Incentive Slabs & Governance • 12 Hubs Connected
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search / Shortcut */}
        <div className="hidden lg:flex items-center gap-2 flex-1 max-w-xs mx-auto">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search policies, staff, logs..."
              className="w-full rounded-xl pl-8 pr-10 py-1.5 text-xs bg-slate-100 border border-slate-200 focus:bg-white focus:border-indigo-500 outline-none transition-all text-slate-800"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </div>
        </div>

        {/* Right: Quick Controls & Session Actions */}
        <div className="flex items-center gap-2.5 relative">


          {/* User Profile Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
            <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
              TF
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">Executive Admin</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Master Access
              </div>
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={onLogout || onClose}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 shadow-2xs transition-all active:scale-95 cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Dashboard Canvas */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">

        {/* Top Executive Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Gross Revenue MTD</div>
            <div className="text-2xl font-black text-slate-900 mt-1">₹{(executiveStats.grossRevenue || 9240000).toLocaleString('en-IN')}</div>
            <div className="text-[10.5px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Live MTD Tracking
            </div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Enrolled Students</div>
            <div className="text-2xl font-black text-indigo-700 mt-1">{executiveStats.activeStudents.toLocaleString()}</div>
            <div className="text-[10.5px] font-medium text-slate-500 mt-1">Across 12 Campus Hubs</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Placement Success</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">{executiveStats.placementRate}</div>
            <div className="text-[10.5px] font-medium text-slate-500 mt-1">{executiveStats.placedStudents || 156} Verified Placed</div>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono">Active Staff & Faculty</div>
            <div className="text-2xl font-black text-slate-900 mt-1">{executiveStats.activeStaff}+</div>
            <div className="text-[10.5px] font-bold text-indigo-600 mt-1">8 Operating Divisions</div>
          </div>
        </div>

        {/* Dashboard Navigation Bar */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none bg-white p-2 rounded-2xl border border-slate-200 shadow-2xs">
          <button
            onClick={() => setActiveModule('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'overview'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Settings className="w-4 h-4" /> Overview Hub
          </button>

          <button
            onClick={() => setActiveModule('users')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <UserPlus className="w-4 h-4" /> User Accounts
          </button>

          <button
            onClick={() => setActiveModule('slabs')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'slabs'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Award className="w-4 h-4" /> Incentive Slabs
          </button>

          <button
            onClick={() => setActiveModule('directory')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'directory'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" /> Employee Directory
          </button>

          <button
            onClick={() => setActiveModule('team-performance')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'team-performance'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-purple-300" /> Team Performance
          </button>

          <button
            onClick={() => setActiveModule('branches')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'branches'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" /> Branch Setup
          </button>

          <button
            onClick={() => setActiveModule('catalog')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'catalog'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Course Catalog
          </button>

          <button
            onClick={() => setActiveModule('schedules')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'schedules'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Trainer Schedules
          </button>

          <button
            onClick={() => setActiveModule('founders')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'founders'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" /> Founders Desk
          </button>

          <button
            onClick={() => setActiveModule('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeModule === 'audit'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-4 h-4" /> Audit Logs
          </button>
        </nav>

        {/* ========================================================================= */}
        {/* 1. OVERVIEW HUB - EXACT MATCH TO USER'S SCREENSHOT CONTAINER */}
        {/* ========================================================================= */}
        {activeModule === 'overview' && (
          <div className="space-y-6">
            
            {/* The Exact White Card Container from Screenshot */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-[0_4px_25px_rgba(0,0,0,0.04)] border border-slate-200/90 text-slate-900 transition-all">
              
              {/* Header Section from screenshot */}
              <div className="mb-7 sm:mb-9">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl leading-none" role="img" aria-label="settings">
                    ⚙️
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-[#1e293b] tracking-tight">
                    Admin & Management
                  </h2>
                </div>
                <p className="text-xs sm:text-[13.5px] text-[#64748b] font-medium mt-1.5 max-w-3xl leading-relaxed">
                  Set the policies the whole academy runs on. Start with the incentive slabs that drive the HR target banner.
                </p>
              </div>

              {/* Grid of the 7 Cards matching the screenshot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                
                {/* Card 1: Create User Accounts */}
                <div 
                  onClick={() => {
                    setActiveModule('users');
                    setShowAddUserModal(true);
                  }}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      👤
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-purple-700 transition-colors">
                      Create User Accounts
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      Add staff & student logins (Firebase)
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#10b981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      • LIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-purple-600 transition-colors" />
                  </div>
                </div>

                {/* Card 2: Incentive Slabs */}
                <div 
                  onClick={() => setActiveModule('slabs')}
                  className="group relative bg-white hover:bg-amber-50/40 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      🏆
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-amber-700 transition-colors">
                      Incentive Slabs
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      Set admission tiers & monthly target
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#10b981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      • LIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-amber-600 transition-colors" />
                  </div>
                </div>

                {/* Card 3: Employee Directory */}
                <div 
                  onClick={() => setActiveModule('directory')}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      👥
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-indigo-700 transition-colors">
                      Employee Directory
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      All 38 members across 5 groups
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#10b981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      • LIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
                  </div>
                </div>

                {/* Card 4: Branch Setup */}
                <div 
                  onClick={() => setActiveModule('branches')}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      🏢
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-sky-700 transition-colors">
                      Branch Setup
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      14 official hubs across 5 states
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#10b981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      • LIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-sky-600 transition-colors" />
                  </div>
                </div>

                {/* Card 5: Course Catalog */}
                <div 
                  onClick={() => setActiveModule('catalog')}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      📚
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-emerald-700 transition-colors">
                      Course Catalog
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      Courses, fees, durations
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 tracking-wider">
                      SOON
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                  </div>
                </div>

                {/* Card 6: Founders Dashboard */}
                <div 
                  onClick={() => setActiveModule('founders')}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      📊
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-rose-700 transition-colors">
                      Founders Dashboard
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      Org-wide KPIs & revenue
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs font-extrabold text-[#10b981]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                      • LIVE
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-rose-600 transition-colors" />
                  </div>
                </div>

                {/* Card 7: Audit & Access Logs */}
                <div 
                  onClick={() => setActiveModule('audit')}
                  className="group relative bg-white hover:bg-slate-50/70 rounded-2xl p-5 sm:p-6 border border-[#e2e8f0] shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:shadow-[0_12px_28px_rgba(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xl mb-4 group-hover:scale-110 transition-transform">
                      🔐
                    </div>
                    <h3 className="font-black text-[#1e293b] text-base leading-snug group-hover:text-slate-800 transition-colors">
                      Audit & Access Logs
                    </h3>
                    <p className="text-[12.5px] text-[#64748b] font-medium mt-1 leading-relaxed">
                      Who did what, when
                    </p>
                  </div>
                  <div className="mt-4 pt-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 tracking-wider">
                      SOON
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors" />
                  </div>
                </div>

              </div>

            </div>

            {/* Quick Policy Snapshot Banner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60">
                  <Award className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Active HR Incentive Policy</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">Slab 2: ₹700/adm (11–20)</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Directly drives the target banner and counsellor earnings calculations.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Authentication & Security</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">{users.length} Registered Accounts</div>
                  <p className="text-xs text-slate-500 mt-1">
                    Role-segregated credentials across 7 unique department views.
                  </p>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200/60">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Campus Infrastructure</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">12 Hubs Connected</div>
                  <p className="text-xs text-slate-500 mt-1">
                    TN, Karnataka, Telangana, Kerala & AP campuses linked in real-time.
                  </p>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. INCENTIVE SLABS CONFIGURATION (LIVE) */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* 2. INCENTIVE SLABS CONFIGURATION (MATCHING USER SCREENSHOT) */}
        {/* ========================================================================= */}
        {activeModule === 'slabs' && (() => {
          const target = Number(incentivePolicy.demoTarget) || 25;
          const closed = Number(incentivePolicy.demoClosed) || 0;
          const pastTarget = Math.max(0, closed - target);
          const percent = target > 0 ? Math.round((closed / target) * 100) : 0;
          const barWidth = Math.min(100, percent);
          const earned = calculateProgressiveIncentive(closed, target, incentivePolicy.bands);
          const currentMonth = new Date().toLocaleString('en-US', { month: 'short' }).toUpperCase();
          const firstBandRate = incentivePolicy.bands?.[0]?.rate || 500;

          return (
            <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-9 shadow-[0_4px_25px_rgba(0,0,0,0.04)] border border-slate-200/90 text-slate-900 transition-all space-y-6">
              
              {/* Header matching Screenshot */}
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl" role="img" aria-label="trophy">
                    🏆
                  </span>
                  <h3 className="text-xl font-black text-[#1e293b] tracking-tight">
                    Incentive Slab Configuration
                  </h3>
                </div>
                <p className="text-xs sm:text-[13px] text-[#64748b] font-medium mt-1.5 leading-relaxed">
                  Incentive applies <strong className="text-slate-800 font-bold">only after</strong> an HR hits their monthly target. Admissions past the target earn per-lead, in progressive bands. Management sets the default target &amp; bands here; a Branch Manager can override the target per HR.
                </p>
              </div>

              {/* 1. DEFAULT MONTHLY TARGET (ADMISSIONS) */}
              <div>
                <label className="text-slate-500 font-bold text-[11px] font-mono tracking-wider uppercase mb-1.5 block">
                  DEFAULT MONTHLY TARGET (ADMISSIONS)
                </label>
                <input
                  type="number"
                  value={incentivePolicy.defaultTarget}
                  onChange={(e) => setIncentivePolicy({ ...incentivePolicy, defaultTarget: parseInt(e.target.value, 10) || 0 })}
                  className="w-full sm:w-80 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm shadow-2xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* 2. INCENTIVE BANDS */}
              <div className="space-y-3">
                <div>
                  <div className="text-slate-500 font-bold text-[11px] font-mono tracking-wider uppercase">
                    INCENTIVE BANDS · per lead, counted PAST the target
                  </div>
                  <p className="text-[11.5px] text-[#64748b] font-medium mt-0.5 leading-relaxed">
                    Each band&apos;s &ldquo;up to&rdquo; is how many leads past target it covers (cumulative). Progressive: each lead is paid at its own band&apos;s rate.
                  </p>
                </div>

                {/* Bands List Cards */}
                <div className="space-y-2.5">
                  {incentivePolicy.bands.map((band, idx) => (
                    <div
                      key={band.id || idx}
                      className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200/90 shadow-2xs flex items-end gap-3"
                    >
                      <div className="flex-1">
                        <label className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1">
                          BAND LABEL
                        </label>
                        <input
                          type="text"
                          value={band.label}
                          onChange={(e) => handleUpdateBand(idx, 'label', e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </div>

                      <div className="w-28 sm:w-36">
                        <label className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1 truncate">
                          UP TO (LEADS PAST TARGET)
                        </label>
                        <input
                          type="number"
                          value={band.upTo}
                          onChange={(e) => handleUpdateBand(idx, 'upTo', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </div>

                      <div className="w-24 sm:w-32">
                        <label className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1">
                          ₹ / LEAD
                        </label>
                        <input
                          type="number"
                          value={band.rate}
                          onChange={(e) => handleUpdateBand(idx, 'rate', parseInt(e.target.value, 10) || 0)}
                          className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveBand(idx)}
                        className="w-9 h-9 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 flex items-center justify-center text-xs font-bold shrink-0 transition-colors cursor-pointer mb-0.5"
                        title="Remove Band"
                      >
                        ✕
                      </button>
                    </div>
                  ))}

                  {/* + Add a band button */}
                  <button
                    type="button"
                    onClick={handleAddBand}
                    className="w-full py-3 rounded-2xl border-2 border-dashed border-blue-200 hover:border-blue-400 bg-blue-50/40 hover:bg-blue-50/80 text-blue-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    + Add a band
                  </button>
                </div>
              </div>

              {/* 3. DEMO HR · KAVITHA */}
              <div className="space-y-2">
                <div className="text-slate-400 font-bold text-[10.5px] font-mono tracking-wider uppercase">
                  DEMO HR · KAVITHA · used for the preview &amp; banner
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1">
                      KAVITHA&apos;S TARGET (BRANCH-HEAD OVERRIDE)
                    </label>
                    <input
                      type="number"
                      value={incentivePolicy.demoTarget}
                      onChange={(e) => setIncentivePolicy({ ...incentivePolicy, demoTarget: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-400 block mb-1">
                      ADMISSIONS CLOSED (THIS MONTH)
                    </label>
                    <input
                      type="number"
                      value={incentivePolicy.demoClosed}
                      onChange={(e) => setIncentivePolicy({ ...incentivePolicy, demoClosed: parseInt(e.target.value, 10) || 0 })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* 4. LIVE PREVIEW */}
              <div className="space-y-2">
                <div className="text-slate-400 font-bold text-[10.5px] font-mono tracking-wider uppercase">
                  LIVE PREVIEW · how Kavitha&apos;s HR banner will look
                </div>

                <div className="rounded-2xl p-5 sm:p-6 bg-[#fde047] text-amber-950 border border-amber-300 shadow-sm space-y-3">
                  <div>
                    <div className="text-[10px] font-mono font-extrabold tracking-widest text-[#78350f] uppercase">
                      MONTHLY TARGET · {currentMonth}
                    </div>
                    <h4 className="text-base sm:text-lg font-black text-[#451a03] mt-0.5 tracking-tight">
                      Target {target} admissions · {closed} closed
                    </h4>
                    <p className="text-xs text-[#78350f] font-medium mt-0.5">
                      {closed < target ? (
                        `${target - closed} more to hit target — then incentive starts (from ₹${firstBandRate}/lead)`
                      ) : (
                        `Target achieved! ${pastTarget} leads past target — earned ₹${earned.toLocaleString('en-IN')} incentive!`
                      )}
                    </p>
                  </div>

                  {/* Progress Track */}
                  <div className="w-full h-2.5 bg-[#78350f]/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#78350f] rounded-full transition-all duration-300"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {/* Progress Footer */}
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-[#78350f]">
                    <span>{closed} / {target} · {percent}%</span>
                    <span>MTD ₹{earned.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              {/* 5. SAVE ACTION BUTTON */}
              <button
                type="button"
                onClick={handleSaveIncentivePolicy}
                className="w-full py-3.5 rounded-xl bg-[#24245c] hover:bg-[#1a1a48] text-white font-black text-sm shadow-md transition-all active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Save policy → update HR banner</span>
              </button>

            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 3. USER ACCOUNTS MANAGEMENT (LIVE) */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* 3. USER ACCOUNTS MANAGEMENT (LIVE TABLE WITH MODAL TRIGGER) */}
        {/* ========================================================================= */}
        {activeModule === 'users' && (() => {
          const q = userSearchQuery.trim().toLowerCase();
          const filteredUsers = users.filter((u) => {
            const matchesSearch =
              !q ||
              u.name?.toLowerCase().includes(q) ||
              u.email?.toLowerCase().includes(q) ||
              u.role?.toLowerCase().includes(q) ||
              u.department?.toLowerCase().includes(q) ||
              u.branch?.toLowerCase().includes(q);
            const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter;
            return matchesSearch && matchesRole;
          });

          return (
            <div className="space-y-5">
              {/* Table Top Controls & Create Account Button */}
              <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className="text-xl" role="img" aria-label="user">
                      👤
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-[#1e293b] tracking-tight">
                      Registered Academy User Accounts
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-purple-100 text-purple-800">
                      {filteredUsers.length} of {users.length} Accounts
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    Manage login credentials, designated roles, and branch assignments across all campuses.
                  </p>
                </div>

                {/* Toolbar: Search, Role Filter, and + Create Account Button */}
                <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                  {/* Search Bar */}
                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 shadow-2xs font-medium transition-all"
                    />
                    {userSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setUserSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Role Filter */}
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white text-xs text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs font-medium cursor-pointer transition-all"
                  >
                    <option value="All">All Roles ({users.length})</option>
                    {ACADEMY_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  {/* The User-Requested "Create Account" Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      setShowAddUserModal(true);
                    }}
                    className="px-4 sm:px-5 py-2.5 rounded-xl bg-[#1d63ed] hover:bg-blue-700 text-white font-extrabold text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
                    title="Open Create User Account popup modal"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Create Account</span>
                  </button>
                </div>
              </div>

              {/* Accounts Table */}
              <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1040px] text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                      <tr>
                        <th className="p-4 w-[22%]">User</th>
                        <th className="p-4 w-[11%]">Role</th>
                        <th className="p-4 w-[15%]">Department</th>
                        <th className="p-4 w-[13%]">Branch</th>
                        <th className="p-4 w-[17%]">
                          <div className="flex items-center justify-between gap-2">
                            <span>Password</span>
                          </div>
                        </th>
                        <th className="p-4 w-[8%]">Status</th>
                        <th className="p-4 w-[10%]">Last Active</th>
                        <th className="p-4 w-[4%] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-12 text-center">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <span className="text-3xl">🔍</span>
                              <div className="font-bold text-slate-800 text-sm">No accounts found</div>
                              <p className="text-xs text-slate-400 max-w-sm">
                                No registered user matches "{userSearchQuery || userRoleFilter}". Try resetting your filters or create a new account.
                              </p>
                              <div className="flex items-center gap-2.5 mt-2">
                                {(userSearchQuery || userRoleFilter !== 'All') && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setUserSearchQuery('');
                                      setUserRoleFilter('All');
                                    }}
                                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all cursor-pointer"
                                  >
                                    Clear Filters
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setShowAddUserModal(true)}
                                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#1d63ed] hover:bg-blue-700 text-white transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <UserPlus className="w-3.5 h-3.5" /> Create Account
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="p-4">
                              <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-full ${u.avatarBg || 'bg-indigo-600'} flex items-center justify-center font-bold text-white text-xs shrink-0 shadow-2xs`}>
                                  {u.name.slice(0, 2).toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 leading-tight">{u.name}</div>
                                  <div className="text-[11px] text-slate-500">{u.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="p-4">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold bg-purple-50 text-purple-700 border border-purple-200/60">
                                {u.role}
                              </span>
                            </td>
                            <td className="p-4 text-slate-700 font-medium">{u.department}</td>
                            <td className="p-4 text-slate-500">{u.branch}</td>

                            {/* Password: stored as a hash — can only be reset */}
                            <td className="p-4">
                              <button
                                type="button"
                                onClick={() => handleEditPassword(u.id || u._id, u.name, null, u.email)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-amber-50 text-slate-600 hover:text-amber-700 border border-slate-200 text-[11px] font-bold transition-colors cursor-pointer"
                                title="Set a new password"
                              >
                                <Key className="w-3.5 h-3.5" /> Reset password
                              </button>
                            </td>

                            <td className="p-4">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                {u.status}
                              </span>
                            </td>
                            <td className="p-4 text-slate-500 text-[11px] font-mono">{u.lastLogin}</td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleDeleteUser(u.id || u._id, u.name, u.email)}
                                className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-all cursor-pointer"
                                title={`Delete ${u.name}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="p-4 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                  <span>Showing {filteredUsers.length} of {users.length} accounts</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRoleDropdownOpen(false);
                      setShowAddUserModal(true);
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> + Add Another Account
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 4. EMPLOYEE DIRECTORY (LIVE) */}
        {/* ========================================================================= */}
        {/* ========================================================================= */}
        {/* 4. EMPLOYEE DIRECTORY (LIVE - OFFICIAL HR ROSTER) */}
        {/* ========================================================================= */}
        {activeModule === 'directory' && (() => {
          const query = directorySearchQuery.trim().toLowerCase();
          const filteredGroups = OFFICIAL_HR_ROSTER.map((group) => {
            const matchingMembers = group.members.filter((m) => {
              if (!query) return true;
              return (
                m.name.toLowerCase().includes(query) ||
                (m.empId && m.empId.toLowerCase().includes(query)) ||
                m.role.toLowerCase().includes(query)
              );
            });
            return {
              ...group,
              members: matchingMembers
            };
          }).filter((group) => group.members.length > 0);

          return (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6 max-w-4xl mx-auto">
              {/* Header */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">👥</span>
                  <h2 className="text-lg font-bold text-slate-900 tracking-tight">Employee Directory</h2>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  All 38 team members, grouped by department — from the official HR roster. Search by name, ID, or role.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search name, employee ID, or role..."
                  value={directorySearchQuery}
                  onChange={(e) => setDirectorySearchQuery(e.target.value)}
                  className="w-full bg-[#f8fafc] hover:bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition-all font-medium"
                />
                {directorySearchQuery && (
                  <button
                    onClick={() => setDirectorySearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                    title="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Department Groups */}
              {filteredGroups.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl">
                  <p className="text-sm font-semibold text-slate-600">No team members found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    No results for "{directorySearchQuery}". Search by name, role, or ID.
                  </p>
                  <button
                    onClick={() => setDirectorySearchQuery('')}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg"
                  >
                    Clear Search
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredGroups.map((group) => (
                    <div key={group.department} className="space-y-3">
                      {/* Department Header Strip */}
                      <div
                        className={`flex items-center justify-between px-3.5 py-2.5 bg-[#f8fafc] rounded-xl border border-slate-100 ${group.borderAccent}`}
                      >
                        <span className="font-bold text-xs sm:text-sm text-slate-900 tracking-tight">
                          {group.department}
                        </span>
                        <span className="w-6 h-6 rounded-full bg-slate-200/80 text-slate-600 text-[11px] font-bold flex items-center justify-center">
                          {group.members.length}
                        </span>
                      </div>

                      {/* 2-Column Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        {group.members.map((emp, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-slate-200/85 hover:border-slate-300 rounded-2xl p-3.5 sm:p-4 flex items-center gap-3.5 transition-shadow shadow-[0_1px_3px_rgba(0,0,0,0.02)]"
                          >
                            <div
                              className={`w-11 h-11 rounded-xl ${group.avatarBg} text-white font-bold text-xs sm:text-sm flex items-center justify-center shrink-0 tracking-wide select-none`}
                            >
                              {emp.initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-900 text-xs sm:text-sm truncate leading-snug">
                                {emp.name}
                              </h4>
                              <p className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                                {emp.role}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                {emp.empId || '—'}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* TEAM PERFORMANCE BOARD (EXACT QUALITY SCORECARD) */}
        {/* ========================================================================= */}
        {activeModule === 'team-performance' && (
          <div className="max-w-5xl mx-auto">
            <TeamPerformanceBoard />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. BRANCH SETUP (14 OFFICIAL OPERATIONAL HUBS) */}
        {/* ========================================================================= */}
        {activeModule === 'branches' && (() => {
          const q = branchSearchQuery.trim().toLowerCase();
          const filteredBranches = branchesList.filter(b => {
            const matchesQuery = !q || 
              b.name.toLowerCase().includes(q) || 
              b.city.toLowerCase().includes(q) || 
              b.state.toLowerCase().includes(q) || 
              b.code.toLowerCase().includes(q) ||
              (b.head && b.head.toLowerCase().includes(q));
            const matchesState = selectedBranchState === 'All' || b.state === selectedBranchState;
            return matchesQuery && matchesState;
          });

          const totalCapacity = branchesList.reduce((acc, b) => acc + (b.capacity || 0), 0);
          const totalStudents = branchesList.reduce((acc, b) => acc + (b.activeStudents || 0), 0);
          const totalStaff = branchesList.reduce((acc, b) => acc + (b.staffCount || 0), 0);

          const states = ['All', 'Tamil Nadu', 'Telangana', 'Kerala', 'Andhra Pradesh', 'Maharashtra'];

          return (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-sky-500/10 border border-sky-200">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏢</span>
                    <h3 className="text-lg font-black text-sky-950">Academy Branches & Campus Network</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-600 text-white uppercase tracking-wider">
                      14 Official Hubs
                    </span>
                  </div>
                  <p className="text-xs text-sky-900/80 mt-1 font-medium">
                    Official network of 14 operational training hubs across Tamil Nadu, Telangana, Andhra Pradesh, Kerala, and Maharashtra.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-white text-sky-900 border border-sky-200 text-xs font-bold shadow-2xs">
                    {totalCapacity} Seats Capacity
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-xs font-bold shadow-2xs">
                    {totalStudents} Active Students
                  </span>
                  <span className="px-3 py-1.5 rounded-xl bg-white text-slate-700 border border-slate-200 text-xs font-bold shadow-2xs">
                    {totalStaff} Staff Personnel
                  </span>
                </div>
              </div>

              {/* Official Campus Visual Showcase (Matching User Reference Image) */}
              <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-2xs">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span>📸</span> Official Campus Network
                    </h4>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Real campus photos and headquarters across 5 key states
                    </p>
                  </div>
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 border border-sky-200 px-3 py-1 rounded-full">
                    14 Campuses
                  </span>
                </div>

                {/* Circular Branches Gallery matching user screenshot */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 sm:gap-6 pt-2">
                  {branchesList.map((b) => {
                    const isSelected = branchSearchQuery.toLowerCase() === b.name.toLowerCase();
                    return (
                      <button
                        key={b.code}
                        type="button"
                        onClick={() => {
                          if (branchSearchQuery.toLowerCase() === b.name.toLowerCase()) {
                            setBranchSearchQuery('');
                          } else {
                            setBranchSearchQuery(b.name);
                          }
                        }}
                        className={`group flex flex-col items-center p-2 rounded-2xl transition-all duration-200 cursor-pointer ${
                          isSelected ? 'bg-sky-50 ring-2 ring-sky-500' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-dashed border-[#00b4d8] p-1 flex items-center justify-center bg-white shadow-2xs group-hover:scale-105 group-hover:border-sky-600 transition-all duration-200">
                          <img
                            src={b.image}
                            alt={b.name}
                            className="w-full h-full rounded-full object-cover"
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        </div>
                        <span className="mt-2.5 text-xs font-bold text-[#0f2744] group-hover:text-sky-700 transition-colors text-center truncate max-w-full">
                          {b.name}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate max-w-full">
                          {b.city}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Filters & Search */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search branch name, city, or campus code..."
                    value={branchSearchQuery}
                    onChange={(e) => setBranchSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:bg-white transition-all font-medium"
                  />
                  {branchSearchQuery && (
                    <button
                      onClick={() => setBranchSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* State Filter Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {states.map(state => (
                    <button
                      key={state}
                      onClick={() => setSelectedBranchState(state)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedBranchState === state
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {state === 'All' ? 'All States (14)' : state}
                    </button>
                  ))}
                </div>
              </div>

              {/* Branches Grid */}
              {filteredBranches.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
                  <p className="text-sm font-semibold text-slate-600">No branches match your search</p>
                  <p className="text-xs text-slate-400 mt-1">Try resetting the state filter or clear your search query.</p>
                  <button
                    onClick={() => {
                      setBranchSearchQuery('');
                      setSelectedBranchState('All');
                    }}
                    className="mt-3 px-3 py-1.5 text-xs font-bold text-sky-600 bg-sky-50 rounded-lg"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredBranches.map((b) => (
                    <div
                      key={b.code}
                      className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#00b4d8] p-0.5 shrink-0 overflow-hidden bg-slate-50">
                              <img
                                src={b.image}
                                alt={b.name}
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="text-base font-extrabold text-slate-900 leading-tight">{b.name}</h4>
                              <p className="text-xs text-slate-500 font-medium mt-0.5">{b.city}, {b.state}</p>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="font-mono text-[11px] font-bold text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md">
                              {b.code}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {b.status}
                            </span>
                          </div>
                        </div>

                        {/* Head / Manager info */}
                        <div className="mt-3.5 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Head:</span>
                          <span className="font-bold text-slate-900 truncate ml-2">
                            {b.head} {b.role ? `· ${b.role}` : ''}
                          </span>
                        </div>

                        {/* Metrics */}
                        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="text-[10px] text-slate-400 font-medium">Capacity</div>
                            <div className="text-sm font-black text-slate-900 mt-0.5">{b.capacity}</div>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="text-[10px] text-slate-400 font-medium">Students</div>
                            <div className="text-sm font-black text-teal-700 mt-0.5">{b.activeStudents}</div>
                          </div>
                          <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200/60">
                            <div className="text-[10px] text-slate-400 font-medium">Staff</div>
                            <div className="text-sm font-black text-amber-700 mt-0.5">{b.staffCount}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="text-[11px] text-slate-400 font-medium">Smart Classroom Ready</span>
                        <button
                          onClick={() => showToast(`Hub settings for ${b.name} (${b.code}) configured.`)}
                          className="text-sky-600 hover:text-sky-800 font-bold text-xs cursor-pointer"
                        >
                          Hub Details →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* 6. COURSE CATALOG & FEE STRUCTURE */}
        {/* ========================================================================= */}
        {activeModule === 'schedules' && <TrainerScheduleEditor />}

        {activeModule === 'catalog' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-emerald-500/10 border border-emerald-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📚</span>
                  <h3 className="text-lg font-black text-emerald-950">AAPC & Medical Coding Course Catalog</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600 text-white uppercase tracking-wider">
                    Official Rate Card
                  </span>
                </div>
                <p className="text-xs text-emerald-900/80 mt-1 font-medium">
                  Curriculum durations, training fees, AAPC examination fees, and total payable amounts.
                </p>
              </div>
            </div>

            {/* Course Catalog Table */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="p-4">Code / Course</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Old Fee</th>
                      <th className="p-4 text-rose-600">New Fee (w/o Disc)</th>
                      <th className="p-4 text-emerald-700">Course Fee (Incl. Taxes)</th>
                      <th className="p-4">Duration</th>
                      <th className="p-4 text-right">Exam Fee</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {courseRates.map((course, idx) => (
                      <tr key={course.code || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4">
                          <div className="font-mono font-bold text-emerald-700">{course.code}</div>
                          <div className="font-bold text-slate-900 text-xs mt-0.5">{course.name}</div>
                        </td>
                        <td className="p-4 font-semibold text-slate-500 text-[11px]">{course.category || 'Specialty Track'}</td>
                        <td className="p-4 text-slate-400 font-medium line-through">{course.oldFee ? `₹${Number(course.oldFee).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-4 text-rose-600 font-medium line-through">{course.newFeeNoDiscount ? `₹${Number(course.newFeeNoDiscount).toLocaleString('en-IN')}` : course.standardFee ? `₹${Number(course.standardFee).toLocaleString('en-IN')}` : '—'}</td>
                        <td className="p-4 font-black text-emerald-700 text-sm">
                          ₹{Number(course.courseFee || course.fee || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-4 text-slate-700 font-medium">{course.duration || '3 Months'}</td>
                        <td className="p-4 text-right font-semibold text-slate-800">
                          {course.examFeeText || (course.examFee ? `₹${Number(course.examFee).toLocaleString('en-IN')}` : 'NO EXAM')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 7. FOUNDERS DASHBOARD (KPIs & REVENUE) */}
        {/* ========================================================================= */}
        {activeModule === 'founders' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-rose-500/10 border border-rose-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h3 className="text-lg font-black text-rose-950">Founders Executive Command & Revenue P&L</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                    Executive Desk
                  </span>
                </div>
                <p className="text-xs text-rose-900/80 mt-1 font-medium">
                  Consolidated academy revenue, admission conversions, branch performance, and placement metrics.
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-medium">Current Month Target</div>
                <div className="text-lg font-black text-rose-700">₹1.20 Cr (77% Achieved)</div>
              </div>
            </div>

            {/* 4 Big KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-400 uppercase">Gross Revenue MTD</div>
                <div className="text-2xl font-black text-emerald-700 mt-1">₹92,40,000</div>
                <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3.5 h-3.5" /> +18.4% vs last month
                </div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-400 uppercase">Total Enrolled Scholars</div>
                <div className="text-2xl font-black text-slate-900 mt-1">3,970</div>
                <div className="text-[11px] text-teal-700 font-semibold mt-1">Across 12 Campuses</div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-400 uppercase">AAPC Certification Rate</div>
                <div className="text-2xl font-black text-amber-700 mt-1">94.8%</div>
                <div className="text-[11px] text-amber-800 font-bold mt-1">National Benchmark: 72%</div>
              </div>
              <div className="p-5 rounded-3xl bg-white border border-slate-200/90 shadow-2xs">
                <div className="text-xs font-bold text-slate-400 uppercase">Corporate Placements</div>
                <div className="text-2xl font-black text-purple-700 mt-1">98.4%</div>
                <div className="text-[11px] text-purple-700 font-bold mt-1">140+ Partner Healthcare MNCs</div>
              </div>
            </div>

            {/* Branch Revenue Leaderboard */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/90 shadow-2xs space-y-4">
              <h4 className="text-sm font-extrabold text-slate-900">Branch Revenue Leaderboard (Top 4 Hubs)</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200">
                  <div className="text-rose-900 font-black">1. Chennai - Guindy (HQ)</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹28,60,000</div>
                  <div className="text-[11px] text-slate-500 font-medium">124 admissions MTD</div>
                </div>
                <div className="p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                  <div className="text-purple-900 font-black">2. Bangalore - Indiranagar</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹22,40,000</div>
                  <div className="text-[11px] text-slate-500 font-medium">96 admissions MTD</div>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200">
                  <div className="text-amber-900 font-black">3. Coimbatore - Gandhipuram</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹17,80,000</div>
                  <div className="text-[11px] text-slate-500 font-medium">78 admissions MTD</div>
                </div>
                <div className="p-4 rounded-2xl bg-sky-50/60 border border-sky-200">
                  <div className="text-sky-900 font-black">4. Hyderabad - Madhapur</div>
                  <div className="text-base font-black text-slate-900 mt-1">₹14,20,000</div>
                  <div className="text-[11px] text-slate-500 font-medium">62 admissions MTD</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 8. AUDIT & ACCESS LOGS */}
        {/* ========================================================================= */}
        {activeModule === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-3xl bg-slate-100 border border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🔐</span>
                  <h3 className="text-lg font-black text-slate-900">Academy Audit Trail & Security Access Logs</h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-white uppercase tracking-wider">
                    Immutable Log
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1 font-medium">
                  Traceability of who modified policies, enrolled students, altered fee rates, and system logins.
                </p>
              </div>

              <button
                onClick={() => showToast('Audit logs exported as CSV.')}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 transition-all flex items-center gap-1.5 shadow-2xs"
              >
                <Download className="w-3.5 h-3.5" /> Export Logs
              </button>
            </div>

            {/* Logs Stream */}
            <div className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[11px]">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">User / Initiator</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">IP Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11.5px]">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-4 text-slate-500">{log.timestamp}</td>
                        <td className="p-4 font-sans font-bold text-slate-900">{log.user}</td>
                        <td className="p-4 font-sans font-semibold text-indigo-700">{log.action}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 font-sans border border-slate-200">
                            {log.category}
                          </span>
                        </td>
                        <td className="p-4 font-sans text-slate-700">{log.details}</td>
                        <td className="p-4 text-slate-400">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* MODAL: Edit Slab */}
      {editingSlab && (
        <div className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-amber-300 text-slate-900 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏆</span>
                <h3 className="font-extrabold text-base">Edit {editingSlab.slab}</h3>
              </div>
              <button
                onClick={() => setEditingSlab(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tier Title</label>
                <input
                  type="text"
                  value={editingSlab.slab}
                  onChange={(e) => setEditingSlab({ ...editingSlab, slab: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Admission Range Display</label>
                <input
                  type="text"
                  value={editingSlab.range}
                  onChange={(e) => setEditingSlab({ ...editingSlab, range: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Commission Rate (₹)</label>
                  <input
                    type="number"
                    value={editingSlab.rate}
                    onChange={(e) => setEditingSlab({ ...editingSlab, rate: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 font-bold text-emerald-700"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Milestone Bonus (₹)</label>
                  <input
                    type="number"
                    value={editingSlab.milestoneBonus || 0}
                    onChange={(e) => setEditingSlab({ ...editingSlab, milestoneBonus: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 font-bold text-amber-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Operational Policy Note</label>
                <input
                  type="text"
                  value={editingSlab.note}
                  onChange={(e) => setEditingSlab({ ...editingSlab, note: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:border-amber-500 text-slate-600"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setEditingSlab(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-300 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSlab(editingSlab)}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 font-bold text-xs text-slate-950 transition-all"
              >
                Save & Sync HR
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Create User Account (Exact Screenshot Style) */}
      {showAddUserModal && (
        <div 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddUserModal(false);
              setIsRoleDropdownOpen(false);
            }
          }}
          className="fixed inset-0 z-60 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 pt-16 sm:pt-24 pb-8 overflow-y-auto animate-in fade-in duration-150"
        >
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 text-slate-900 space-y-5 animate-in zoom-in-95 duration-150 relative max-h-[calc(100vh-6rem)] overflow-y-auto my-auto mt-4 sm:mt-6">
            {/* Header with Title and Close Button */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-lg shrink-0 shadow-2xs mt-0.5">
                  👤
                </div>
                <div>
                  <h3 className="text-xl font-black text-[#1e293b] tracking-tight leading-snug">
                    Create User Accounts
                  </h3>
                  <p className="text-xs text-[#64748b] font-medium mt-1 leading-relaxed">
                    Create login accounts for staff and students. They sign in with their email + the temporary password you set, and are asked to change it on first login.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddUserModal(false);
                  setIsRoleDropdownOpen(false);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 flex items-center justify-center text-xs font-bold transition-all cursor-pointer shrink-0 mt-0.5"
                title="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                  FULL NAME
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Kavitha N."
                  value={newUserForm.name}
                  onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                  EMAIL
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g., kavitha@thoughtflows.in"
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                />
              </div>

              <div className="relative">
                <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                  ROLE
                </label>
                <div
                  onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                  className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 text-sm font-semibold flex items-center justify-between cursor-pointer shadow-2xs transition-all ${
                    isRoleDropdownOpen
                      ? 'border-2 border-[#3b82f6] ring-2 ring-blue-500/20 bg-white'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span>{newUserForm.role || 'HR'}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 stroke-[2.5] transition-transform ${isRoleDropdownOpen ? 'rotate-180 text-blue-600' : ''}`} />
                </div>

                {isRoleDropdownOpen && (
                  <div className="mt-1 w-full bg-white rounded-xl border border-slate-800 shadow-xl overflow-hidden z-30 divide-y divide-slate-100 max-h-56 overflow-y-auto">
                    {ACADEMY_ROLES.map((role) => {
                      const isSelected = (newUserForm.role || 'HR') === role;
                      return (
                        <div
                          key={role}
                          onClick={() => {
                            setNewUserForm(prev => ({
                              ...prev,
                              role,
                              department: ROLE_TO_DEPARTMENT[role] || 'Admissions & Counseling',
                              trainerId: role === 'Trainer' && !prev.trainerId
                                ? `TR-${Math.floor(100 + Math.random() * 900)}`
                                : prev.trainerId
                            }));
                            setIsRoleDropdownOpen(false);
                          }}
                          className={`px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-[#1d63ed] text-white font-bold'
                              : 'text-slate-800 hover:bg-slate-100'
                          }`}
                        >
                          {role}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase block">
                    TEMPORARY PASSWORD
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const generated = `TF@${Math.floor(1000 + Math.random() * 9000)}`;
                      setNewUserForm({ ...newUserForm, password: generated });
                      showToast(`Generated temporary password: ${generated}`);
                    }}
                    className="text-[10.5px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider cursor-pointer flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" /> Auto-Generate
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Min 8 characters (or auto-generate)"
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                />
              </div>

              <div>
                <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                  CAMPUS BRANCH
                </label>
                <div className="relative">
                  <select
                    value={newUserForm.branch}
                    onChange={(e) => setNewUserForm({ ...newUserForm, branch: e.target.value })}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 focus:outline-none text-sm shadow-2xs font-medium appearance-none cursor-pointer transition-all"
                  >
                    {branchesList.map(b => (
                      <option key={b.code} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                </div>
              </div>

              {(newUserForm.role === 'HR' || newUserForm.role === 'Dept Head · HR') && (
                <div className="space-y-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                  <p className="text-[11px] font-extrabold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" /> HR Details
                  </p>

                  <div>
                    <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                      MOBILE NUMBER
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="e.g., +91 98765 43210"
                      value={newUserForm.phone}
                      onChange={(e) => setNewUserForm({ ...newUserForm, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                    />
                    <p className="text-[10.5px] text-slate-500 font-medium mt-1.5 leading-relaxed">
                      Used as the Exotel agent number for the Click-to-Call feature — HR won't be able to call leads without it.
                    </p>
                  </div>
                </div>
              )}

              {newUserForm.role === 'Trainer' && (
                <div className="space-y-4 rounded-2xl border border-blue-100 bg-blue-50/50 p-4">
                  <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5" /> Trainer Details
                  </p>

                  <div>
                    <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                      TRAINER ID
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., TR-CBG-001"
                      value={newUserForm.trainerId}
                      onChange={(e) => setNewUserForm({ ...newUserForm, trainerId: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                      ZOOM ACCOUNT EMAIL (HOST)
                    </label>
                    <input
                      type="email"
                      placeholder="Trainer's own Zoom user — defaults to login email"
                      value={newUserForm.zoomEmail || ''}
                      onChange={(e) => setNewUserForm({ ...newUserForm, zoomEmail: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 placeholder:text-slate-400 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                      EXPERT COURSE / SPECIALIZATION
                    </label>
                    <div className="relative">
                      <select
                        value={newUserForm.expertCourse}
                        onChange={(e) => setNewUserForm({ ...newUserForm, expertCourse: e.target.value })}
                        className="w-full px-4 py-2.5 pr-10 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 focus:outline-none text-sm shadow-2xs font-medium appearance-none cursor-pointer transition-all"
                      >
                        {COURSE_CATEGORIES.map((cat) => (
                          <optgroup key={cat.category} label={cat.title}>
                            {cat.courses.map((c) => (
                              <option key={c.code} value={c.code}>
                                {c.code} — {c.name}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none stroke-[2.5]" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                      LANGUAGES TAUGHT
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {TRAINER_LANGUAGES.map((lang) => {
                        const selected = newUserForm.trainerLanguages.includes(lang);
                        return (
                          <button
                            type="button"
                            key={lang}
                            onClick={() => {
                              const next = selected
                                ? newUserForm.trainerLanguages.filter((l) => l !== lang)
                                : [...newUserForm.trainerLanguages, lang];
                              setNewUserForm({ ...newUserForm, trainerLanguages: next });
                            }}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border transition-all cursor-pointer ${
                              selected
                                ? 'bg-blue-600 border-blue-600 text-white'
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            {lang}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                        SHIFT START
                      </label>
                      <input
                        type="time"
                        value={newUserForm.shiftStart}
                        onChange={(e) => setNewUserForm({ ...newUserForm, shiftStart: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                      />
                    </div>
                    <div>
                      <label className="text-[#2563eb] font-extrabold text-[11px] tracking-wider uppercase mb-1.5 block">
                        SHIFT END
                      </label>
                      <input
                        type="time"
                        value={newUserForm.shiftEnd}
                        onChange={(e) => setNewUserForm({ ...newUserForm, shiftEnd: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 hover:border-slate-300 focus:border-blue-500 bg-white text-slate-800 focus:outline-none text-sm shadow-2xs font-medium transition-all"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newUserForm.demoTrainer}
                      onChange={(e) => setNewUserForm({ ...newUserForm, demoTrainer: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">Eligible to receive demo booking notifications</span>
                  </label>
                </div>
              )}

              <div className="pt-3 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddUserModal(false);
                    setIsRoleDropdownOpen(false);
                  }}
                  className="flex-1 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-[#1d63ed] hover:bg-blue-700 text-white font-extrabold text-xs transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <UserPlus className="w-4 h-4" /> Create User Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
