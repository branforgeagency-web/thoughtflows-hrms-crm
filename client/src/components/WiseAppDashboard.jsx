import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  PieChart,
  Users,
  GraduationCap,
  ShoppingBag,
  Store,
  Sparkles,
  Building2,
  HelpCircle,
  Video,
  Radio,
  Menu,
  ChevronLeft,
  ChevronDown,
  ArrowRightCircle,
  Home,
  LogOut,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  Calendar,
  GitBranch,
  MessageSquare,
  BookOpen,
  CheckCircle2,
  Star,
  User,
  X,
  Circle,
  FileText,
  Layers
} from 'lucide-react';
import DashboardNavSwitcher from './DashboardNavSwitcher';
import { getWiseAppOverview } from '../services/api';
import { WiseAppQuestionsSection, WiseAppTestsSection } from './wiseapp/WiseAppQuestionsAndTests';
import {
  WiseAppStudentsSection,
  WiseAppTeachersSection,
  WiseAppSchedulesSection,
  WiseAppAllocationsSection
} from './wiseapp/WiseAppStudentsAndOps';
import {
  WiseAppVideosSection,
  WiseAppPackagesSection,
  WiseAppFeedbackAndResourcesSection,
  WiseAppReportsAndSopSection
} from './wiseapp/WiseAppContentAndReports';
import {
  WiseAppCatalogSection,
  WiseAppCentersSection
} from './wiseapp/WiseAppCatalogViews';

const ROLE_TABS = [
  {
    id: 'students',
    label: 'Students',
    responsibility: 'Check relevant updates, participate in learning activities, practice medical coding questions, and share feedback.',
    benefits: [
      'Easy access to relevant learning resources',
      'Better coordination regarding training schedules',
      'Opportunities to practise medical coding questions',
      'Improved learning consistency & structured experience',
      'An opportunity to share feedback'
    ]
  },
  {
    id: 'trainers',
    label: 'Trainers',
    responsibility: 'Update class schedules promptly and maintain accurate student, batch, and assessment training information.',
    benefits: [
      'Organized schedule management',
      'Better coordination with team leaders',
      'Improved visibility of assigned training activities',
      'Easier follow-up on student-related activities',
      'Support in identifying student learning requirements'
    ]
  },
  {
    id: 'tl',
    label: 'Team Leaders',
    responsibility: 'Monitor schedule and onboarding updates and follow up with trainers on pending activities.',
    benefits: [
      'Better monitoring of trainer schedules',
      'Easier follow-up on pending activities',
      'Improved coordination between trainers and students',
      'Support in identifying operational gaps',
      'Improved accountability within the team'
    ]
  },
  {
    id: 'managers',
    label: 'Team Managers',
    responsibility: 'Coordinate operations across batches and branches and ensure agreed WiseApp processes are followed.',
    benefits: [
      'Consistent batch & class allocation execution',
      'Unified visibility of trainer capacity & onboarding',
      'Timely resolution of reported questions & gaps'
    ]
  },
  {
    id: 'management',
    label: 'Management',
    responsibility: 'Review available records, feedback, and reports to take necessary operational and quality decisions.',
    benefits: [
      'Centralized access to available training information',
      'Improved coordination across teams',
      'Better visibility of training operations',
      'Support for monitoring student feedback',
      'Improved operational planning & continuous quality improvement'
    ]
  }
];

export default function WiseAppDashboard({
  onClose,
  currentUser,
  onLogout,
  onSwitchDepartment
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [expandedGroups, setExpandedGroups] = useState({
    misc: false,
    institute: false,
    questions: false,
    tests: false,
    videos: false
  });
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeRoleTab, setActiveRoleTab] = useState('trainers');

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getWiseAppOverview();
      setOverview(data);
    } catch (_) {
      setOverview(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const kpis = overview?.kpis || {
    totalTests: 0,
    totalPackages: 0,
    userRegistrations: 0,
    totalQuestions: 0,
    reportedQuestions: 0,
    exclusiveServices: 0
  };
  const ops = overview?.operational || {};

  const KPI_TILES = [
    {
      key: 'tests',
      value: kpis.totalTests,
      label: 'Total Tests',
      bg: 'bg-[#00c0ef]',
      footerBg: 'bg-[#00acd6]',
      cta: 'More info',
      icon: ShoppingBag,
      target: 'tests'
    },
    {
      key: 'packages',
      value: kpis.totalPackages,
      label: 'Total Package',
      bg: 'bg-[#00a65a]',
      footerBg: 'bg-[#008d4c]',
      cta: 'More info',
      icon: BarChart3,
      target: 'packages'
    },
    {
      key: 'registrations',
      value: kpis.userRegistrations,
      label: 'User Registrations',
      bg: 'bg-[#f39c12]',
      footerBg: 'bg-[#db8b0b]',
      cta: 'More info',
      icon: Users,
      target: 'students'
    },
    {
      key: 'questions',
      value: kpis.totalQuestions,
      label: 'Total Questions',
      bg: 'bg-[#dd4b39]',
      footerBg: 'bg-[#c64333]',
      cta: 'More info',
      icon: PieChart,
      target: 'questions'
    },
    {
      key: 'reported',
      value: kpis.reportedQuestions,
      label: 'Reported Questions',
      bg: 'bg-[#a94442]',
      footerBg: 'bg-[#953b39]',
      cta: 'View by Test',
      icon: AlertTriangle,
      target: 'reported_questions'
    },
    {
      key: 'exclusive',
      value: kpis.exclusiveServices,
      label: 'Exclusive Services',
      bg: 'bg-[#605ca8]',
      footerBg: 'bg-[#555299]',
      cta: 'Explore Services',
      icon: Star,
      target: 'exclusive_services'
    }
  ];

  const PAGE_TITLES = {
    dashboard: 'Dashboard',
    courses: 'Courses',
    sub_courses: 'Sub Courses',
    subjects: 'Subjects',
    chapters: 'Chapters',
    topics: 'Topics',
    instruction_files: 'Instruction Files',
    documents: 'Documents',
    news: 'News',
    notifications: 'Notifications',
    students: 'Students',
    teachers: 'Teachers',
    centers: 'Center',
    schedules: 'Class Schedule',
    allocations: 'Class Allocation',
    questions: 'Questions',
    passages: 'Passages',
    instruction_parts: 'Instructions Parts',
    reported_questions: 'Reported Questions',
    tests: 'Tests',
    subjective_tests: 'Subjective Test',
    test_series: 'Test Series',
    videos: 'Videos',
    video_series: 'Video Series',
    live_videos: 'Manage Live Videos',
    pdfs: 'Manage PDFs',
    packages: 'Manage Packages/Batches',
    store: 'Store',
    exclusive_services: 'Exclusive Services',
    feedback: 'Student Feedback',
    resources: 'Learning Resources',
    attendance: 'Attendance',
    reports: 'All Reports',
    sop: 'WiseApp Playbook & SOP'
  };

  const userDisplayName = currentUser?.name || currentUser?.userName || 'WiseApp Coordinator';
  const currentRoleInfo = ROLE_TABS.find((r) => r.id === activeRoleTab) || ROLE_TABS[1];

  const navItemClass = (pageId) =>
    `w-full flex items-center justify-between px-4 py-2.5 text-[13px] transition-colors cursor-pointer text-left ${
      activePage === pageId
        ? 'bg-[#f1f5f9] text-slate-900 font-bold border-l-[3px] border-l-[#00a65a]'
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium border-l-[3px] border-l-transparent'
    }`;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#ecf0f5] text-slate-800 font-sans overflow-hidden">
      {/* Top Navbar */}
      <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-3 sm:px-4 shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-600 cursor-pointer"
            title="Toggle Navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#00a65a] text-white font-extrabold text-xs flex items-center justify-center shadow-xs">
              W
            </span>
            <span className="text-sm font-extrabold tracking-tight text-slate-800">
              WiseApp <span className="text-xs font-semibold text-slate-400 hidden sm:inline">· Thoughtflows LMS</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <DashboardNavSwitcher
            currentDepartment="wiseapp"
            onSwitchDepartment={onSwitchDepartment}
            lightTheme={true}
          />
          <button
            type="button"
            onClick={fetchOverview}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center">
              <User className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-semibold text-slate-700 max-w-[130px] truncate">{userDisplayName}</span>
          </div>
          <button
            type="button"
            onClick={onLogout || onClose}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </header>

      {/* Body Shell: Sidebar + Main Canvas */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Sidebar */}
        {sidebarOpen && (
          <aside className="w-60 bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto">
            {/* User Panel */}
            <div className="p-3.5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800 truncate">{userDisplayName}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00a65a]" />
                  <span>Online</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 text-[10px] font-bold tracking-wider text-slate-400 uppercase bg-slate-50/70 border-b border-slate-100">
              MAIN NAVIGATION
            </div>

            <nav className="flex-1 py-1">
              <button onClick={() => setActivePage('dashboard')} className={navItemClass('dashboard')}>
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4 text-slate-500" />
                  <span>Dashboard</span>
                </span>
              </button>

              {/* Misc expandable — matches uploaded screenshot */}
              <button
                onClick={() => toggleGroup('misc')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer border-l-[3px] border-l-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <PieChart className="w-4 h-4 text-slate-500" />
                  <span>Misc</span>
                </span>
                {expandedGroups.misc ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
              {expandedGroups.misc && (
                <div className="bg-[#f8fafc] py-1 space-y-0.5 text-[12.5px]">
                  {[
                    ['courses', 'Courses'],
                    ['sub_courses', 'Sub Courses'],
                    ['subjects', 'Subjects'],
                    ['chapters', 'Chapters'],
                    ['topics', 'Topics'],
                    ['instruction_files', 'Instruction Files'],
                    ['documents', 'Documents'],
                    ['news', 'News'],
                    ['notifications', 'Notifications'],
                    ['resources', 'Learning Resources'],
                    ['attendance', 'Attendance'],
                    ['feedback', 'Student Feedback']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-1.5 text-left cursor-pointer transition-colors ${
                        activePage === id ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className={`w-3 h-3 shrink-0 ${activePage === id ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setActivePage('students')} className={navItemClass('students')}>
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4 text-slate-500" />
                  <span>Students</span>
                </span>
              </button>

              <button onClick={() => setActivePage('teachers')} className={navItemClass('teachers')}>
                <span className="flex items-center gap-2.5">
                  <GraduationCap className="w-4 h-4 text-slate-500" />
                  <span>Teachers</span>
                </span>
              </button>

              <button onClick={() => setActivePage('packages')} className={navItemClass('packages')}>
                <span className="flex items-center gap-2.5">
                  <ShoppingBag className="w-4 h-4 text-slate-500" />
                  <span>Shopping</span>
                </span>
              </button>

              <button onClick={() => setActivePage('store')} className={navItemClass('store')}>
                <span className="flex items-center gap-2.5">
                  <Store className="w-4 h-4 text-slate-500" />
                  <span>Store</span>
                </span>
              </button>

              <button onClick={() => setActivePage('exclusive_services')} className={navItemClass('exclusive_services')}>
                <span className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-slate-500" />
                  <span>Exclusive Services</span>
                </span>
              </button>

              {/* Institute expandable */}
              <button
                onClick={() => toggleGroup('institute')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer border-l-[3px] border-l-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <Building2 className="w-4 h-4 text-slate-500" />
                  <span>Institute</span>
                </span>
                {expandedGroups.institute ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
              {expandedGroups.institute && (
                <div className="bg-[#f8fafc] py-1 space-y-0.5 text-[12.5px]">
                  {[
                    ['centers', 'Center'],
                    ['schedules', 'Class Schedule'],
                    ['allocations', 'Class Allocation'],
                    ['sop', 'WiseApp SOP Guide']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-1.5 text-left cursor-pointer transition-colors ${
                        activePage === id ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className={`w-3 h-3 shrink-0 ${activePage === id ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manage Questions expandable */}
              <button
                onClick={() => toggleGroup('questions')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer border-l-[3px] border-l-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-slate-500" />
                  <span>Manage Questions</span>
                </span>
                {expandedGroups.questions ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
              {expandedGroups.questions && (
                <div className="bg-[#f8fafc] py-1 space-y-0.5 text-[12.5px]">
                  {[
                    ['questions', 'Questions'],
                    ['passages', 'Passages'],
                    ['instruction_parts', 'Instructions Parts'],
                    ['reported_questions', `Reported Questions (${kpis.reportedQuestions})`]
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-1.5 text-left cursor-pointer transition-colors ${
                        activePage === id ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className={`w-3 h-3 shrink-0 ${activePage === id ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manage Test expandable */}
              <button
                onClick={() => toggleGroup('tests')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer border-l-[3px] border-l-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4 text-slate-500" />
                  <span>Manage Test</span>
                </span>
                {expandedGroups.tests ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
              {expandedGroups.tests && (
                <div className="bg-[#f8fafc] py-1 space-y-0.5 text-[12.5px]">
                  {[
                    ['tests', 'Test'],
                    ['subjective_tests', 'Subjective Test'],
                    ['test_series', 'Test Series'],
                    ['reports', 'All Reports']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-1.5 text-left cursor-pointer transition-colors ${
                        activePage === id ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className={`w-3 h-3 shrink-0 ${activePage === id ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Manage Videos expandable */}
              <button
                onClick={() => toggleGroup('videos')}
                className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium cursor-pointer border-l-[3px] border-l-transparent"
              >
                <span className="flex items-center gap-2.5">
                  <Video className="w-4 h-4 text-slate-500" />
                  <span>Manage Videos</span>
                </span>
                {expandedGroups.videos ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
              {expandedGroups.videos && (
                <div className="bg-[#f8fafc] py-1 space-y-0.5 text-[12.5px]">
                  {[
                    ['videos', 'Videos'],
                    ['video_series', 'Video Series']
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      onClick={() => setActivePage(id)}
                      className={`w-full flex items-center gap-2.5 pl-6 pr-3 py-1.5 text-left cursor-pointer transition-colors ${
                        activePage === id ? 'text-slate-900 font-bold bg-slate-100' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Circle className={`w-3 h-3 shrink-0 ${activePage === id ? 'text-slate-900 stroke-[2.5]' : 'text-slate-400'}`} />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}

              <button onClick={() => setActivePage('live_videos')} className={navItemClass('live_videos')}>
                <span className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-slate-500" />
                  <span>Manage Live Videos</span>
                </span>
              </button>

              <button onClick={() => setActivePage('pdfs')} className={navItemClass('pdfs')}>
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-slate-500" />
                  <span>Manage PDFs</span>
                </span>
              </button>

              <button onClick={() => setActivePage('packages')} className={navItemClass('packages')}>
                <span className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-slate-500" />
                  <span>Manage Packages/Batches</span>
                </span>
              </button>
            </nav>
          </aside>
        )}

        {/* Main Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Page Header & Breadcrumb (matching screenshot) */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-normal text-slate-800">
              {PAGE_TITLES[activePage] || 'Dashboard'}
            </h1>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <button onClick={() => setActivePage('dashboard')} className="inline-flex items-center gap-1 hover:text-slate-800 cursor-pointer">
                <Home className="w-3 h-3" /> Home
              </button>
              <span>&gt;</span>
              <span className="text-slate-700 font-semibold">
                {activePage === 'tests' ? 'Test' : (PAGE_TITLES[activePage] || 'Dashboard')}
              </span>
            </div>
          </div>

          {/* Dashboard Home View */}
          {activePage === 'dashboard' && (
            <div className="space-y-6">
              {/* 6 Signature AdminLTE Colored KPI Tiles (4 on row 1, 2 on row 2) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {KPI_TILES.map((tile) => {
                  const Icon = tile.icon;
                  return (
                    <div
                      key={tile.key}
                      onClick={() => setActivePage(tile.target)}
                      className={`${tile.bg} rounded-xs text-white shadow-xs overflow-hidden relative group cursor-pointer transition-transform hover:-translate-y-0.5`}
                    >
                      <div className="p-4 pb-5 relative z-10 min-h-[104px] flex flex-col justify-between">
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-none">
                          {loading ? '—' : tile.value}
                        </div>
                        <div className="text-xs sm:text-sm font-medium text-white/95 mt-2">
                          {tile.label}
                        </div>
                      </div>
                      {/* Faint Watermark Icon */}
                      <Icon className="w-16 h-16 text-black/15 absolute right-3 top-3 transition-transform duration-300 group-hover:scale-110 pointer-events-none" />
                      {/* Bottom Darker Strip */}
                      <div className={`${tile.footerBg} py-1.5 px-3 text-center text-xs font-medium text-white/95 flex items-center justify-center gap-1.5 group-hover:bg-black/15 transition-colors`}>
                        <span>{tile.cta}</span>
                        <ArrowRightCircle className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* WiseApp 6-Step Operational Pulse */}
              <div className="bg-white rounded border border-slate-200 border-t-[3px] border-t-[#00a65a] p-4 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800">WiseApp 6-Step Operational Workflow (Live Sync)</h2>
                    <p className="text-xs text-slate-500">Click any step to manage live records, schedules, allocations, practice, feedback & follow-ups.</p>
                  </div>
                  <button
                    onClick={() => setActivePage('sop')}
                    className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Full SOP & Reflection Table
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[
                    {
                      step: 'Step 1',
                      title: 'Student Info & Onboarding',
                      metric: `${ops.pendingIntroCount || 0} intro pending`,
                      sub: `${ops.syncedAllocationCount || 0} allocation-synced`,
                      color: 'border-l-[#f39c12]',
                      target: 'students'
                    },
                    {
                      step: 'Step 2',
                      title: 'Class Schedule Management',
                      metric: `${ops.pendingScheduleUpdates || 0} pending updates`,
                      sub: `${ops.followUpNeededCount || 0} TL follow-ups needed`,
                      color: 'border-l-[#00a65a]',
                      target: 'schedules'
                    },
                    {
                      step: 'Step 3',
                      title: 'Class Allocation & WhatsApp',
                      metric: `${ops.unallocatedCount || 0} unallocated`,
                      sub: `${ops.pendingWhatsappCount || 0} online need WhatsApp`,
                      color: 'border-l-[#605ca8]',
                      target: 'allocations'
                    },
                    {
                      step: 'Step 4',
                      title: 'Learning & Practice',
                      metric: `${kpis.totalQuestions} questions · ${kpis.totalTests} tests`,
                      sub: `${ops.materialsCount || 0} resources · ${ops.recordedVideosCount || 0} videos`,
                      color: 'border-l-[#00c0ef]',
                      target: 'questions'
                    },
                    {
                      step: 'Step 5',
                      title: 'Student Feedback',
                      metric: `${ops.avgFeedbackRating || '—'} ★ average`,
                      sub: `${ops.feedbackCount || 0} feedback entries`,
                      color: 'border-l-[#dd4b39]',
                      target: 'feedback'
                    },
                    {
                      step: 'Step 6',
                      title: 'Monitoring & Follow-up',
                      metric: `${ops.attendanceRate || 0}% attendance`,
                      sub: `${kpis.reportedQuestions} reported questions open`,
                      color: 'border-l-slate-700',
                      target: 'reports'
                    }
                  ].map((item) => (
                    <button
                      key={item.step}
                      onClick={() => setActivePage(item.target)}
                      className={`text-left p-3.5 rounded border border-slate-200 border-l-4 ${item.color} hover:bg-slate-50 transition cursor-pointer`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{item.step}</span>
                        <span className="text-xs font-bold text-slate-800">{item.metric}</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 mt-1">{item.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{item.sub}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Team Responsibilities & Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-white rounded border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-800">Role Responsibilities & WiseApp Benefits</h3>
                    <div className="flex flex-wrap gap-1">
                      {ROLE_TABS.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => setActiveRoleTab(r.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer ${
                            activeRoleTab === r.id ? 'bg-[#00a65a] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <strong className="text-slate-900">Core Responsibility:</strong> {currentRoleInfo.responsibility}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {currentRoleInfo.benefits.map((b, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#00a65a] shrink-0 mt-0.5" />
                        <span>{b}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Registrations & Feedback */}
                <div className="bg-white rounded border border-slate-200 p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">Recent Registrations</h3>
                    <button onClick={() => setActivePage('students')} className="text-[11px] font-bold text-[#00c0ef] cursor-pointer">
                      View All
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {(overview?.recentRegistrations || []).length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">No recent registrations.</div>
                    ) : (
                      overview.recentRegistrations.slice(0, 5).map((st) => (
                        <div key={st.studentId} className="py-2 flex items-center justify-between text-xs">
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{st.name}</div>
                            <div className="text-[11px] text-slate-500">{st.course} · {st.mode}</div>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                            st.classAllocationSynced ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {st.classAllocationSynced ? 'Synced' : 'Pending'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activePage === 'courses' && <WiseAppCatalogSection kind="course" />}
          {activePage === 'sub_courses' && <WiseAppCatalogSection kind="sub_course" />}
          {activePage === 'subjects' && <WiseAppCatalogSection kind="subject" />}
          {activePage === 'chapters' && <WiseAppCatalogSection kind="chapter" />}
          {activePage === 'topics' && <WiseAppCatalogSection kind="topic" />}
          {activePage === 'instruction_files' && <WiseAppCatalogSection kind="instruction_file" />}
          {activePage === 'documents' && <WiseAppCatalogSection kind="document" />}
          {activePage === 'news' && <WiseAppCatalogSection kind="news" />}
          {activePage === 'notifications' && <WiseAppCatalogSection kind="notification" />}
          {activePage === 'centers' && <WiseAppCentersSection />}
          {activePage === 'students' && <WiseAppStudentsSection onChanged={fetchOverview} />}
          {activePage === 'teachers' && <WiseAppTeachersSection onNavigate={setActivePage} />}
          {activePage === 'schedules' && <WiseAppSchedulesSection onChanged={fetchOverview} />}
          {activePage === 'allocations' && <WiseAppAllocationsSection onChanged={fetchOverview} />}
          {activePage === 'questions' && <WiseAppQuestionsSection initialReportedOnly={false} onChanged={fetchOverview} />}
          {activePage === 'passages' && <WiseAppCatalogSection kind="passage" />}
          {activePage === 'instruction_parts' && <WiseAppCatalogSection kind="instruction_part" />}
          {activePage === 'reported_questions' && <WiseAppQuestionsSection initialReportedOnly={true} onChanged={fetchOverview} />}
          {activePage === 'tests' && <WiseAppTestsSection initialType="" onChanged={fetchOverview} />}
          {activePage === 'subjective_tests' && <WiseAppTestsSection initialType="Subjective Test" onChanged={fetchOverview} />}
          {activePage === 'test_series' && <WiseAppCatalogSection kind="test_series" />}
          {activePage === 'videos' && <WiseAppVideosSection mode="recorded" onChanged={fetchOverview} />}
          {activePage === 'video_series' && <WiseAppCatalogSection kind="video_series" />}
          {activePage === 'live_videos' && <WiseAppVideosSection mode="live" onChanged={fetchOverview} />}
          {activePage === 'pdfs' && <WiseAppCatalogSection kind="pdf" />}
          {activePage === 'packages' && <WiseAppPackagesSection defaultKind="package" onChanged={fetchOverview} />}
          {activePage === 'store' && <WiseAppPackagesSection defaultKind="store_item" onChanged={fetchOverview} />}
          {activePage === 'exclusive_services' && <WiseAppPackagesSection defaultKind="exclusive_service" onChanged={fetchOverview} />}
          {activePage === 'feedback' && <WiseAppFeedbackAndResourcesSection initialTab="feedback" onChanged={fetchOverview} />}
          {activePage === 'resources' && <WiseAppFeedbackAndResourcesSection initialTab="resources" onChanged={fetchOverview} />}
          {activePage === 'attendance' && <WiseAppFeedbackAndResourcesSection initialTab="attendance" onChanged={fetchOverview} />}
          {activePage === 'reports' && <WiseAppReportsAndSopSection initialView="reports" />}
          {activePage === 'sop' && <WiseAppReportsAndSopSection initialView="sop" />}
        </main>
      </div>
    </div>
  );
}
