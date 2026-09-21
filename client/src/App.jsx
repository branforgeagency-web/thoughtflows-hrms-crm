import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PortalHero from './components/PortalHero';
import SevenDashboardsSection from './components/SevenDashboardsSection';
import ConstellationCanvas from './components/ConstellationCanvas';
import FloatingStaffDots from './components/FloatingStaffDots';
import DepartmentsModal from './components/DepartmentsModal';
import DashboardModal from './components/DashboardModal';
import LoginModal from './components/LoginModal';
import axios from 'axios';

export default function App() {
  const [isDepartmentsOpen, setIsDepartmentsOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [loginDepartment, setLoginDepartment] = useState('hr');
  const [showLoginDeptSelector, setShowLoginDeptSelector] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);

  // Department card reference
  const DEPT_CARDS = [
    { id: 'hr', title: 'HR Department', status: 'LIVE', description: 'Academic counsellors who turn enquiries into futures · lead capture, calls, follow-ups & admissions' },
    { id: 'training', title: 'Training Department', status: '3 LIVE', description: 'Trainers across 12 branches running batches, attendance, assessments & mastery tracking' },
    { id: 'cccp', title: 'CCCP Dashboard', status: '8 TODAY', description: 'Placement Cell · Examination Cell · College & Company Cell — three cells, one career path' },
    { id: 'marketing', title: 'Marketing Department', status: 'ACTIVE', description: 'Digital, outdoor & campaigns driving 100+ lead sources every month across all branches' },
    { id: 'leadership', title: 'Leadership Hub', status: '4 ROLES', description: 'All the heads in one place — Operational, Department, Regional & Branch. Open to pick your role.' },
    { id: 'student', title: 'Student Dashboard', status: '247 ONLINE', description: 'Students log in here to track attendance, syllabus, exam slot bookings, assignments & placement opportunities' },
    { id: 'admin', title: 'Admin & Management', status: '3 ALERTS', description: "Founders' command bridge · back-office operations · strategy, red-line alerts & administration" }
  ];

  // Persistent user state across page refresh
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('thoughtflows_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [selectedDashboard, setSelectedDashboard] = useState(() => {
    try {
      const userSaved = localStorage.getItem('thoughtflows_user');
      if (userSaved) {
        const u = JSON.parse(userSaved);
        let dept = u.department;
        if (!dept || dept === 'Medical Coding Faculty') dept = 'training';
        const matched = DEPT_CARDS.find(c => c.id === dept);
        if (matched) return matched;
      }
      const saved = localStorage.getItem('thoughtflows_dashboard');
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  const [isDashboardOpen, setIsDashboardOpen] = useState(() => {
    try {
      const userSaved = localStorage.getItem('thoughtflows_user');
      // If user is logged in, remain in dashboard on page refresh
      return !!userSaved;
    } catch {
      return false;
    }
  });

  // Claymorphism Theme State (default: 'clay')
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('thoughtflows_theme') || 'clay';
    } catch {
      return 'clay';
    }
  });

  const handleToggleTheme = () => {
    setTheme(prev => {
      const next = prev === 'clay' ? 'classic' : 'clay';
      try {
        localStorage.setItem('thoughtflows_theme', next);
      } catch (e) {
        console.warn('Failed to save theme to localStorage', e);
      }
      return next;
    });
  };

  useEffect(() => {
    // Check backend health on initial load
    axios.get('/api/health')
      .then(res => setBackendHealth(res.data))
      .catch(err => {
        console.log('Backend starting up or running in offline mode');
      });
  }, []);

  const handleNodeClick = (node) => {
    setSelectedStaff(node);
  };

  const handleSelectDashboard = (card) => {
    setSelectedDashboard(card);
    localStorage.setItem('thoughtflows_dashboard', JSON.stringify(card));
    // If user is already authenticated (or is admin), grant immediate seamless access
    if (currentUser) {
      setIsDashboardOpen(true);
    } else {
      // Require department-specific login (no 7 options selector for these individual cards)
      setLoginDepartment(card.id);
      setShowLoginDeptSelector(false);
      setIsLoginOpen(true);
    }
  };

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    localStorage.setItem('thoughtflows_user', JSON.stringify(user));
    setIsLoginOpen(false);

    // Open dashboard corresponding to the authenticated department
    let targetDept = user.department;
    if (!targetDept || targetDept === 'Medical Coding Faculty') targetDept = 'training';
    const matchedCard = DEPT_CARDS.find(c => c.id === targetDept) || DEPT_CARDS[0];
    setSelectedDashboard(matchedCard);
    localStorage.setItem('thoughtflows_dashboard', JSON.stringify(matchedCard));
    setIsDashboardOpen(true);
  };

  const handleSignOut = () => {
    localStorage.removeItem('thoughtflows_user');
    localStorage.removeItem('thoughtflows_dashboard');
    localStorage.removeItem('thoughtflows_hr_active_tab');
    setCurrentUser(null);
    setSelectedDashboard(null);
    setIsDashboardOpen(false);
  };

  const handleOpenMyDashboardHero = () => {
    if (currentUser) {
      setIsDashboardOpen(true);
    } else {
      setLoginDepartment('hr');
      setShowLoginDeptSelector(true);
      setIsLoginOpen(true);
    }
  };

  const handleSwitchDepartment = (targetDeptId) => {
    if (targetDeptId) {
      const matchedCard = DEPT_CARDS.find(c => c.id === targetDeptId) || { id: targetDeptId, title: targetDeptId };
      setSelectedDashboard(matchedCard);
      localStorage.setItem('thoughtflows_dashboard', JSON.stringify(matchedCard));
      setIsDashboardOpen(true);
      return;
    }
    setIsDashboardOpen(false);
    setLoginDepartment(currentUser?.department || 'hr');
    setIsLoginOpen(true);
  };

  const handleExploreDepartments = () => {
    const el = document.getElementById('dashboards-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      setIsDepartmentsOpen(true);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-x-hidden bg-[#f4fcfb] selection:bg-teal-200 selection:text-teal-950 font-sans flex flex-col justify-between">
      {/* Background Gradient Mesh matching the exact bright mint aesthetic in screenshot */}
      <div 
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 25%, rgba(255, 255, 255, 0.95) 0%, rgba(235, 252, 249, 0.8) 40%, transparent 75%),
            radial-gradient(circle at 88% 15%, rgba(175, 241, 234, 0.5) 0%, transparent 55%),
            radial-gradient(circle at 5% 90%, rgba(195, 244, 238, 0.6) 0%, transparent 50%),
            linear-gradient(135deg, #f6fdfc 0%, #ebf9f6 38%, #daf4f0 75%, #c8efe8 100%)
          `
        }}
      />

      {/* Banner Section (Navbar + Hero) */}
      <div 
        id="banner-section"
        className="relative z-20 w-full min-h-screen flex flex-col justify-between bg-no-repeat bg-cover bg-[position:82%_center] lg:bg-[position:right_center]"
        style={{
          backgroundImage: `url('/hero-banner-bg.png')`,
        }}
      >
        {/* Top Navigation */}
        <Navbar
          onSignInClick={() => {
            if (currentUser) {
              setIsDashboardOpen(true);
            } else {
              setLoginDepartment(currentUser?.department || 'hr');
              setShowLoginDeptSelector(true);
              setIsLoginOpen(true);
            }
          }}
          onHomeClick={() => {
            setIsDepartmentsOpen(false);
            setIsDashboardOpen(false);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          currentUser={currentUser}
          onSignOut={handleSignOut}
          onSwitchDepartment={handleSwitchDepartment}
          theme={theme}
          onToggleTheme={handleToggleTheme}
        />

        {/* Main Hero View */}
        <main className="relative flex-1 flex flex-col justify-between">
          <PortalHero
            onOpenDashboard={handleOpenMyDashboardHero}
            onExploreDepartments={handleExploreDepartments}
            theme={theme}
          />
        </main>
      </div>

      {/* Second Section: Seven Dashboards. One Mission. */}
      <SevenDashboardsSection
        onSelectDashboard={handleSelectDashboard}
        currentUser={currentUser}
        theme={theme}
      />

      {/* Footer */}
      <footer className={`relative z-20 py-8 px-6 text-center border-t transition-all ${
        theme === 'clay' 
          ? 'bg-white/70 border-white shadow-[0_-8px_24px_rgba(7,55,52,0.03)] backdrop-blur-md' 
          : 'border-teal-500/15 bg-white/40 backdrop-blur-sm'
      } mt-12`}>
        <div className="max-w-[1360px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] font-semibold tracking-[0.25em] text-[#6b9691] uppercase select-none">
            PEOPLE &nbsp;&nbsp;|&nbsp;&nbsp; PROCESS &nbsp;&nbsp;|&nbsp;&nbsp; POSSIBILITIES
          </p>
          <p className="text-xs text-[#557b77]">
            Thoughtflows Medical Coding Academy • Internal Operations & ERP
          </p>
        </div>
      </footer>

      {/* Selected Staff Quick Drawer / Toast */}
      {selectedStaff && (
        <div className="fixed bottom-6 left-6 z-40 p-4 rounded-xl bg-slate-900/90 border border-teal-500/40 backdrop-blur-md shadow-2xl flex items-center gap-3 animate-fadeIn text-white">
          <div className="w-10 h-10 rounded-full bg-teal-500/30 border border-teal-400/50 flex items-center justify-center font-bold text-teal-200">
            {selectedStaff.initials}
          </div>
          <div>
            <div className="text-sm font-bold text-white">{selectedStaff.name}</div>
            <div className="text-xs text-teal-300">{selectedStaff.dept}</div>
          </div>
          <button
            onClick={() => setSelectedStaff(null)}
            className="ml-4 text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
      )}

      {/* Modals */}
      <DepartmentsModal
        isOpen={isDepartmentsOpen}
        onClose={() => setIsDepartmentsOpen(false)}
        theme={theme}
      />

      <DashboardModal
        isOpen={isDashboardOpen}
        onClose={() => {
          setIsDashboardOpen(false);
        }}
        selectedDashboard={selectedDashboard}
        currentUser={currentUser}
        onSwitchDepartment={handleSwitchDepartment}
        onSignOut={handleSignOut}
        theme={theme}
      />

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        initialDepartment={loginDepartment}
        showDepartmentSelector={showLoginDeptSelector}
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
      />
    </div>
  );
}

