import React, { useState } from 'react';
import {
  Home,
  User,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Briefcase,
  PhoneCall,
  CreditCard,
  Target,
  FileText,
  Monitor,
  Award,
  MessageSquare,
  Users,
  Smartphone,
  ClipboardCheck,
  Headphones,
  BarChart2,
  RotateCcw,
  Medal,
  ChevronRight,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle2,
  Check,
  Lock,
  X,
  FileCheck,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Lightbulb,
  Compass,
  Calendar,
  Edit3,
  TrendingUp,
  Copy,
  CheckCheck,
  ChevronDown,
  Shield,
  MessageCircle,
  CheckSquare
} from 'lucide-react';

export default function HrLmsSection({ currentUser }) {
  const [activeNav, setActiveNav] = useState('Counselling Scripts');
  const [activeModuleModal, setActiveModuleModal] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [openScriptId, setOpenScriptId] = useState(null);
  const [openObjectionId, setOpenObjectionId] = useState(null);

  // Video player interactive state for module viewer
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [activeLesson, setActiveLesson] = useState(null);

  const userName = currentUser?.name || 'Kavitha N.';
  const userFirstName = userName.split(' ')[0] || 'Kavitha';
  const userInitial = userFirstName.charAt(0).toUpperCase() || 'K';

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Detailed data for Mandatory Modules & Guides (all using the video player layout)
  const [mediaModulesState, setMediaModulesState] = useState({
    // 5 Mandatory Modules
    'Brand Training': {
      title: 'ThoughtFlows Brand Training',
      subtitle: '7 videos · 5 PDFs · assessment · mandatory before any lead',
      hasWarning: false,
      progress: 100,
      testStatus: 'passed',
      testButtonText: '✓ Passed — Review Test',
      passingScore: '80%',
      items: [
        { id: 1, title: 'Brand story video', type: 'video', isCompleted: true },
        { id: 2, title: 'Our promise PDF', type: 'pdf', isCompleted: true },
        { id: 3, title: 'Brand voice & tone', type: 'video', isCompleted: true },
        { id: 4, title: 'What we never say', type: 'video', isCompleted: true },
        { id: 5, title: 'Quality standards', type: 'video', isCompleted: true },
        { id: 6, title: 'Brand assessment', type: 'quiz', isCompleted: true },
      ]
    },
    'Career Basics': {
      title: 'Medical Coding Career Basics',
      subtitle: '7 videos · 5 PDFs · assessment · mandatory before any lead',
      hasWarning: false,
      progress: 100,
      testStatus: 'passed',
      testButtonText: '✓ Passed — Review Test',
      passingScore: '80%',
      items: [
        { id: 1, title: 'What is medical coding', type: 'video', isCompleted: true },
        { id: 2, title: 'Career paths PDF', type: 'pdf', isCompleted: true },
        { id: 3, title: 'Salary & demand', type: 'video', isCompleted: true },
        { id: 4, title: 'US healthcare basics', type: 'video', isCompleted: true },
        { id: 5, title: 'Certifications overview', type: 'video', isCompleted: true },
        { id: 6, title: 'Career assessment', type: 'quiz', isCompleted: true },
      ]
    },
    'Lead Handling SOP': {
      title: 'Lead Handling SOP',
      subtitle: '11 videos · 6 PDFs · assessment · before CRM access',
      hasWarning: false,
      progress: 75,
      testStatus: 'pending',
      testButtonText: 'Take Test → (70% to pass)',
      passingScore: '70%',
      items: [
        { id: 1, title: 'Lead lifecycle', type: 'video', isCompleted: true },
        { id: 2, title: 'First call SOP', type: 'video', isCompleted: true },
        { id: 3, title: 'Logging & remarks', type: 'video', isCompleted: true },
        { id: 4, title: 'Follow-up rules', type: 'video', isCompleted: true },
        { id: 5, title: 'Demo handover', type: 'video', isCompleted: true },
        { id: 6, title: 'SOP assessment', type: 'quiz', isCompleted: false },
      ]
    },
    'Payment & Admission SOP': {
      title: 'Payment & Admission SOP',
      subtitle: '6 docs + quiz · mandatory',
      hasWarning: false,
      progress: 0,
      testStatus: 'pending',
      testButtonText: 'Take Test → (70% to pass)',
      passingScore: '70%',
      items: [
        { id: 1, title: 'Fee structure', type: 'doc', isCompleted: false },
        { id: 2, title: 'Payment links', type: 'doc', isCompleted: false },
        { id: 3, title: 'EMI options', type: 'doc', isCompleted: false },
        { id: 4, title: 'Receipt process', type: 'doc', isCompleted: false },
        { id: 5, title: 'Refund policy', type: 'doc', isCompleted: false },
        { id: 6, title: 'Payment quiz', type: 'quiz', isCompleted: false },
      ]
    },
    'Placement Explanation': {
      title: 'Placement Explanation (STRICT)',
      subtitle: 'policy doc + mandatory test · 80% to pass · before ANY lead',
      hasWarning: true,
      progress: 0,
      testStatus: 'pending',
      testButtonText: 'Take Test → (80% to pass)',
      passingScore: '80%',
      items: [
        { id: 1, title: 'Placement policy', type: 'doc', isCompleted: false },
        { id: 2, title: 'Safe wording rules', type: 'doc', isCompleted: false },
        { id: 3, title: 'What NOT to promise', type: 'doc', isCompleted: false },
        { id: 4, title: 'Real outcome data', type: 'doc', isCompleted: false },
        { id: 5, title: 'Compliance test (80%)', type: 'quiz', isCompleted: false },
      ]
    },

    // 3 Guides (Matching the latest 3 screenshots)
    'Course Recommendation': {
      title: 'Course Recommendation Guide',
      subtitle: 'video + quiz',
      hasWarning: false,
      progress: 50,
      testStatus: 'pending',
      testButtonText: 'Take Test → (70% to pass)',
      passingScore: '70%',
      items: [
        { id: 1, title: 'Matching student to course', type: 'video', isCompleted: true },
        { id: 2, title: 'Background-based suggestions', type: 'video', isCompleted: true },
        { id: 3, title: 'Comparison guide', type: 'doc', isCompleted: false },
        { id: 4, title: 'Recommendation quiz', type: 'quiz', isCompleted: false },
      ]
    },
    'Demo Booking & Handover': {
      title: 'Demo Booking & Handover Flow',
      subtitle: 'flow guide + checklist + quiz',
      hasWarning: false,
      progress: 100,
      testStatus: 'passed',
      testButtonText: '✓ Passed — Review Test',
      passingScore: '80%',
      items: [
        { id: 1, title: 'When to offer a demo', type: 'video', isCompleted: true },
        { id: 2, title: 'Booking flow', type: 'video', isCompleted: true },
        { id: 3, title: 'Trainer handover checklist', type: 'doc', isCompleted: true },
        { id: 4, title: 'Post-demo follow-up', type: 'video', isCompleted: true },
        { id: 5, title: 'Demo quiz', type: 'quiz', isCompleted: true },
      ]
    },
    'Certification Explanation': {
      title: 'Certification Explanation',
      subtitle: 'cert guide + quiz · mandatory',
      hasWarning: false,
      progress: 0,
      testStatus: 'pending',
      testButtonText: 'Take Test → (70% to pass)',
      passingScore: '70%',
      items: [
        { id: 1, title: 'AAPC vs AHIMA', type: 'video', isCompleted: false },
        { id: 2, title: 'Exam process', type: 'video', isCompleted: false },
        { id: 3, title: 'Cost & validity', type: 'doc', isCompleted: false },
        { id: 4, title: 'How we support', type: 'video', isCompleted: false },
        { id: 5, title: 'Cert quiz', type: 'quiz', isCompleted: false },
      ]
    }
  });

  // 5 Mandatory SOP Modules for Home & My Learning views
  const mandatoryModulesList = [
    {
      id: 'sop1',
      title: 'ThoughtFlows Brand Training',
      desc: '4 videos · 2 PDFs · Quiz',
      progress: 100,
      badge: 'COMPLETED',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      actionText: 'Review',
      iconColor: 'bg-emerald-600',
      isCompleted: true,
      passingScore: '80%'
    },
    {
      id: 'sop2',
      title: 'Medical Coding Career Basics',
      desc: '7 videos · 3 PDFs · Quiz',
      progress: 100,
      badge: 'COMPLETED',
      badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
      actionText: 'Review',
      iconColor: 'bg-emerald-600',
      isCompleted: true,
      passingScore: '80%'
    },
    {
      id: 'sop3',
      title: 'Lead Handling SOP',
      desc: '11 videos · 4 PDFs · Test',
      progress: 92,
      badge: '92%',
      badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300/60',
      actionText: 'Resume',
      iconColor: 'bg-amber-500',
      isCompleted: false,
      passingScore: '80%'
    },
    {
      id: 'sop4',
      title: 'Placement Explanation (strict)',
      desc: 'Outline + Test · 85% to pass',
      progress: 0,
      badge: 'NOT STARTED',
      badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
      actionText: 'Start',
      iconColor: 'bg-rose-500',
      isCompleted: false,
      passingScore: '85%'
    },
    {
      id: 'sop5',
      title: 'Payment & Admission SOP',
      desc: '6 docs + quiz',
      progress: 0,
      badge: 'NOT STARTED',
      badgeClass: 'bg-rose-100 text-rose-700 border border-rose-200',
      actionText: 'Start',
      iconColor: 'bg-rose-500',
      isCompleted: false,
      passingScore: '80%'
    }
  ];

  // 20 Course Knowledge Learning Modules
  const [courseModules, setCourseModules] = useState([
    { id: 'c1', title: 'CPC Course Module', sub: 'CPC', progress: 88, desc: 'videos + PDF · test · pass scale 80%', passingScore: '80%' },
    { id: 'c2', title: 'COC Course Module', sub: 'COC', progress: 82, desc: 'videos + PDF · test · pass scale 80%', passingScore: '80%' },
    { id: 'c3', title: 'CIC Course Module', sub: 'CIC', progress: 79, desc: 'videos + PDF · test · pass scale 80%', passingScore: '80%' },
    { id: 'c4', title: 'CRC Course Module', sub: 'CRC', progress: 35, desc: 'videos + PDF · test · 35% done', passingScore: '80%' },
    { id: 'c5', title: 'CPMA Course Module', sub: 'CPMA', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c6', title: 'CCS Course Module', sub: 'CCS', progress: 90, desc: 'videos + PDF · test · pass scale 90%', passingScore: '80%' },
    { id: 'c7', title: 'AMCT Beginner Course Module', sub: 'ACI', progress: 85, desc: 'videos + PDF · test · pass scale 85%', passingScore: '80%' },
    { id: 'c8', title: 'AMCT Inter Course Module', sub: 'AI', progress: 40, desc: 'videos + PDF · test · 40% done', passingScore: '80%' },
    { id: 'c9', title: 'AMCT Advanced Course Module', sub: 'AA', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c10', title: 'IP-DRG Course Module', sub: 'IPDRG', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c11', title: 'ED Coding Course Module', sub: 'ED', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c12', title: 'E/M Course Module', sub: 'EM', progress: 76, desc: 'videos + PDF · test · pass scale 76%', passingScore: '80%' },
    { id: 'c13', title: 'Surgical Course Module', sub: 'SUR', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c14', title: 'HCC Course Module', sub: 'HCC', progress: 25, desc: 'videos + PDF · test · 25% done', passingScore: '80%' },
    { id: 'c15', title: 'CEMC Course Module', sub: 'CEMC', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c16', title: 'CPT Course Module', sub: 'CPT', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c17', title: 'ICD-10 Course Module', sub: 'ICD', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c18', title: 'Anatomy Course Module', sub: 'ANAT', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c19', title: 'Radiology Course Module', sub: 'RAD', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' },
    { id: 'c20', title: 'CIC Crash Course Module', sub: 'CICX', progress: 0, desc: 'videos + PDF · test · 0% done', passingScore: '80%' }
  ]);

  const handleCompleteModule = (modId) => {
    if (mediaModulesState[activeNav]) {
      setMediaModulesState(prev => ({
        ...prev,
        [activeNav]: {
          ...prev[activeNav],
          progress: 100,
          testStatus: 'passed',
          testButtonText: '✓ Passed — Review Test',
          items: prev[activeNav].items.map(item => ({ ...item, isCompleted: true }))
        }
      }));
    }

    setCourseModules(prev => prev.map(c => {
      if (c.id === modId) {
        return {
          ...c,
          progress: 100,
          desc: 'videos + PDF · test · completed 100%'
        };
      }
      return c;
    }));

    setActiveModuleModal(null);
    showToast('🎉 Test passed! Status updated.');
  };

  // Detailed Course Eligibility List for My HR Profile view
  const PROFILE_COURSE_ELIGIBILITY = [
    { code: 'CPC', name: 'CPC', category: 'Medical Coding', status: 'ELIGIBLE' },
    { code: 'COC', name: 'COC', category: 'Outpatient Coding', status: 'ELIGIBLE' },
    { code: 'CIC', name: 'CIC', category: 'Inpatient Coding', status: 'ELIGIBLE' },
    { code: 'CRC', name: 'CRC', category: 'Risk Adjustment', status: 'LOCKED' },
    { code: 'CPMA', name: 'CPMA', category: 'Medical Auditing', status: 'LOCKED' },
    { code: 'CCS', name: 'CCS', category: 'Hospital Coding', status: 'ELIGIBLE' },
    { code: 'AMCI_BEG', name: 'AMCI Beginner', category: 'Foundation', status: 'ELIGIBLE' },
    { code: 'AMCI_MAS', name: 'AMCI Master', category: 'Advanced Mastery', status: 'LOCKED' },
  ];

  // 20 Course Cards Grid for dedicated Course Eligibility view
  const ALL_COURSE_ELIGIBILITY_GRID = [
    { code: 'CPC', title: 'CPC', sub: 'CPC', canCounsel: true, score: 88 },
    { code: 'COC', title: 'COC', sub: 'COC', canCounsel: true, score: 82 },
    { code: 'CIC', title: 'CIC', sub: 'CIC', canCounsel: true, score: 79 },
    { code: 'CRC', title: 'CRC', sub: 'CRC', canCounsel: false, score: 35 },
    { code: 'CPMA', title: 'CPMA', sub: 'CPMA', canCounsel: false, score: 0 },
    { code: 'CCS', title: 'CCS', sub: 'CCS', canCounsel: true, score: 90 },
    { code: 'AMCT_BEG', title: 'AMCT Beginner', sub: 'ACI', canCounsel: true, score: 85 },
    { code: 'AMCT_INT', title: 'AMCT Inter', sub: 'AI', canCounsel: false, score: 40 },
    { code: 'AMCT_ADV', title: 'AMCT Advanced', sub: 'AA', canCounsel: false, score: 0 },
    { code: 'IP_DRG', title: 'IP-DRG', sub: 'IPDRG', canCounsel: false, score: 0 },
    { code: 'ED', title: 'ED Coding', sub: 'ED', canCounsel: false, score: 0 },
    { code: 'EM', title: 'E/M', sub: 'EM', canCounsel: true, score: 76 },
    { code: 'SUR', title: 'Surgical', sub: 'SUR', canCounsel: false, score: 0 },
    { code: 'HCC', title: 'HCC', sub: 'HCC', canCounsel: false, score: 25 },
    { code: 'CEMC', title: 'CEMC', sub: 'CEMC', canCounsel: false, score: 0 },
    { code: 'CPT', title: 'CPT', sub: 'CPT', canCounsel: false, score: 0 },
    { code: 'ICD10', title: 'ICD-10', sub: 'ICD', canCounsel: false, score: 0 },
    { code: 'ANAT', title: 'Anatomy', sub: 'ANAT', canCounsel: false, score: 0 },
    { code: 'RAD', title: 'Radiology', sub: 'RAD', canCounsel: false, score: 0 },
    { code: 'CICX', title: 'CIC Crash', sub: 'CICX', canCounsel: false, score: 0 },
  ];

  // Reference Section: 14 Counselling Scripts matching screenshot
  const COUNSELLING_SCRIPTS = [
    {
      id: 'cs1',
      title: 'Opening / first call',
      version: 'v2',
      text: "Hello [Candidate Name], this is [HR Name] calling from ThoughtFlows Medical Coding Academy, Coimbatore. You recently enquired about our AAPC CPC Certification and Medical Coding career track. Do you have 2 quick minutes so I can understand your background and see which batch best fits your goals?"
    },
    {
      id: 'cs2',
      title: 'Fee explanation',
      version: 'v2',
      text: "Our total comprehensive training fee includes complete AAPC-aligned curriculum, live coding practicals, books and study materials, and dedicated placement drives. We also provide zero-interest monthly EMI options so you can pay conveniently in installments."
    },
    {
      id: 'cs3',
      title: 'Course comparison',
      version: 'v2',
      text: "While general medical billing courses only touch upon basic claims submission, our AAPC CPC certified program prepares you for specialized coding across ICD-10, CPT, and HCPCS. Certified coders earn 40-50% higher starting packages and have direct demand in top US healthcare MNCs."
    },
    {
      id: 'cs4',
      title: 'Demo invitation',
      version: 'v2',
      text: "I'd love for you to experience our live training environment before making any decision. We have a free live demo session scheduled today at 6:00 PM with our senior AAPC-certified trainer. Can I reserve your access link right now?"
    },
    {
      id: 'cs5',
      title: 'Follow-up nudge',
      version: 'v2',
      text: "Hi [Candidate Name], just checking in following your demo session with ThoughtFlows! Our upcoming batch in Saravanampatti only has 4 seats left under the current scholarship scheme. Have you had a chance to speak with your family?"
    },
    {
      id: 'cs6',
      title: 'Closing / admission',
      version: 'v2',
      text: "Based on your life science degree, you are an ideal fit for immediate placement. Let's confirm your enrollment today with an initial token of ₹5,000 so we can lock in your seat and dispatch your orientation kit immediately."
    },
    {
      id: 'cs7',
      title: 'Placement (safe wording)',
      version: 'v2',
      text: "ThoughtFlows provides 100% placement assistance through our 48+ hiring partners across Coimbatore, Chennai, and Bangalore. We arrange continuous interview drives until you are successfully placed, as long as you maintain 85%+ attendance and pass internal mock tests."
    },
    {
      id: 'cs8',
      title: 'Eligibility assessment & background query',
      version: 'v2',
      text: "To ensure you qualify for top hospital and MNC recruitment standards: could you confirm your degree, year of graduation, and whether you have studied anatomy or physiology coursework?"
    },
    {
      id: 'cs9',
      title: 'Handling skeptical parents',
      version: 'v2',
      text: "Namaste Uncle/Aunty, ThoughtFlows is an established training academy with over 1,200 placed candidates in Coimbatore. Medical coding is an evergreen US healthcare domain unaffected by IT layoffs. We welcome you to visit our campus directly in Saravanampatti to inspect our classroom and meet our placed alumni."
    },
    {
      id: 'cs10',
      title: 'AAPC certification validation',
      version: 'v2',
      text: "The CPC credential issued by AAPC USA is internationally recognized across all US healthcare RCM companies. Having this certification makes your resume stand out directly to hiring managers without needing prior coding work experience."
    },
    {
      id: 'cs11',
      title: 'EMI & payment plan walkthrough',
      version: 'v2',
      text: "You don't need to pay the entire tuition upfront. We have partnered with education financing providers to offer 3, 6, and 9 month zero-cost EMI plans with instant digital paperless approval using just your Aadhaar and PAN."
    },
    {
      id: 'cs12',
      title: 'Post-demo feedback script',
      version: 'v2',
      text: "How was your demo session today? Did you get a good understanding of how our trainers explain ICD-10 chapters and clinical case studies? What questions did you have about the upcoming batch schedule?"
    },
    {
      id: 'cs13',
      title: 'Document collection & KYC script',
      version: 'v2',
      text: "To generate your official Student ID and register you in the LMS portal, please WhatsApp us copies of your 10th marksheet, degree certificate/provisional, Aadhaar card front & back, and one passport size photo."
    },
    {
      id: 'cs14',
      title: 'Re-engagement / stale lead revival',
      version: 'v2',
      text: "Hello [Candidate Name], hope you are doing well! We are launching a new specialized weekend batch for working professionals starting next Saturday, with a special festive concession. Are you still interested in transitioning into medical coding?"
    }
  ];

  // Reference Section: 15 Objection Handling Items matching screenshot
  const OBJECTION_HANDLING_LIBRARY = [
    {
      id: 'oh1',
      objection: '"It\'s too expensive"',
      whatToSay: "I completely understand that budget is important. Consider this: the starting salary for a certified CPC coder ranges from ₹25,000 to ₹35,000 per month. That means your entire course investment is recouped within your first 2 months on the job. Plus, we provide 0% interest EMI options starting at just ₹4,500/month.",
      whatNotToSay: "Never say: 'No, our fees are actually very cheap compared to Bangalore' or 'If you don't have money you can't join'."
    },
    {
      id: 'oh2',
      objection: '"I\'m not from a medical background"',
      whatToSay: "More than 40% of our successful certified students come from non-medical streams like B.Sc Chemistry, Computer Science, and Arts. Our curriculum starts from the absolute fundamentals with intensive Medical Terminology and Anatomy modules before diving into coding guidelines.",
      whatNotToSay: "Never say: 'Non-life science students will struggle' or 'It might be too tough for you without biology'."
    },
    {
      id: 'oh3',
      objection: '"Will I really get a job?"',
      whatToSay: "ThoughtFlows provides structured placement assistance backed by our network of 48+ hiring partner MNCs in Coimbatore, Chennai, and Bangalore. We organize unlimited interview drives until you are placed, provided you meet our 85% attendance criteria and clear mock assessments.",
      whatNotToSay: "Never promise: '100% guarantee that you will get a job with ₹50,000 salary without studying' or make false legal guarantees."
    },
    {
      id: 'oh4',
      objection: '"I need to ask my parents"',
      whatToSay: "That's wonderful! Decisions about your career should involve your family. Would your parents like to join a 10-minute call with our Academic Director, or visit our Saravanampatti campus together this Saturday to see our lab and placement track record in person?",
      whatNotToSay: "Never say: 'Why do you need parents' permission, you are an adult' or push aggressively for an immediate spot decision."
    },
    {
      id: 'oh5',
      objection: '"Other institutes are cheaper"',
      whatToSay: "That's a fair point to look into. While some local tutors offer low-cost recorded classes, ThoughtFlows provides daily live interactive sessions with AAPC-certified trainers, authentic AAPC coding question banks, and dedicated campus placement drives with MNC HRs visiting our branch.",
      whatNotToSay: "Never badmouth competitors by name or say: 'Those institutes are frauds and will scam you'."
    },
    {
      id: 'oh6',
      objection: '"Can I do this course alongside my current job / studies?"',
      whatToSay: "Yes, absolutely! We specifically offer flexible evening batches (7:00 PM - 9:00 PM) and dedicated weekend batches (Saturday & Sunday) designed for final-year students and working professionals.",
      whatNotToSay: "Never say: 'You have to quit your job to do this' or 'You can just skip classes and read the PDF'."
    },
    {
      id: 'oh7',
      objection: '"Is online learning as effective as offline classroom training?"',
      whatToSay: "Our online sessions are 100% live with two-way audio, live chart coding exercises, daily doubt clearing, and recorded backups of every class if you ever miss a session. You get the exact same trainers and placement support.",
      whatNotToSay: "Never say: 'Offline is always better' or 'Online students don't get good placement'."
    },
    {
      id: 'oh8',
      objection: '"What if I fail the AAPC CPC exam on my first attempt?"',
      whatToSay: "ThoughtFlows students maintain a 94% first-time pass rate because we conduct 10 full-length mock exams. In the rare event you need a re-attempt, our faculty provides free retraining and access to doubt clinics until you clear.",
      whatNotToSay: "Never say: 'Nobody fails here' or 'Don't worry about the exam, it's very easy'."
    },
    {
      id: 'oh9',
      objection: '"Why should I pay token fee before attending the demo?"',
      whatToSay: "Our demo sessions are completely 100% free! You never have to pay a token fee just to attend a demo. The token fee is only required when you decide to lock in your seat in a limited batch of 20 students.",
      whatNotToSay: "Never demand: 'You must pay ₹1,000 right now to book your demo seat'."
    },
    {
      id: 'oh10',
      objection: '"Do you guarantee MNC placement in Coimbatore / Chennai?"',
      whatToSay: "Our placement drives feature leading US healthcare MNCs like Omega Healthcare, Access Healthcare, CorroHealth, and Episource, with branches in both Coimbatore and Chennai. You can specify your preferred city during placement registration.",
      whatNotToSay: "Never guarantee: 'I will put you directly into Omega next week without interview'."
    },
    {
      id: 'oh11',
      objection: '"I don\'t know English fluently, can I still work in medical coding?"',
      whatToSay: "Medical coding focuses primarily on clinical terminology, medical record comprehension, and code set guidelines rather than conversational English. Our trainers explain concepts in bilingual mode (Tamil/English) while helping you build professional technical vocabulary.",
      whatNotToSay: "Never say: 'If your English is bad you won't clear MNC interviews'."
    },
    {
      id: 'oh12',
      objection: '"Why is AAPC exam fee not included in course fee?"',
      whatToSay: "The AAPC exam fee is charged in USD directly by AAPC USA for official membership and exam vouchers. Keeping it transparent prevents unnecessary markup, and you only pay AAPC when you are fully ready to schedule your test date.",
      whatNotToSay: "Never hide the fact that AAPC exam vouchers are charged separately."
    },
    {
      id: 'oh13',
      objection: '"I need more time to think about it"',
      whatToSay: "Take your time! To help you decide, let me share our detailed syllabus PDF and 3 short success videos of recent graduates from your college/stream. May I follow up with you on Friday afternoon to answer any questions?",
      whatNotToSay: "Never say: 'If you don't decide right now the price will double tomorrow'."
    },
    {
      id: 'oh14',
      objection: '"Can you reduce the course fee or give a bigger discount?"',
      whatToSay: "Our pricing is standardized by management to ensure high trainer quality and live software lab access. However, I can check if you qualify for our Early Bird or Merit-Based Scholarship for this upcoming batch.",
      whatNotToSay: "Never say: 'Okay I will cut ₹10,000 just for you if you pay right now'."
    },
    {
      id: 'oh15',
      objection: '"Is medical coding in danger because of AI?"',
      whatToSay: "AI assists with preliminary computer-assisted coding (CAC), but US federal compliance requires certified human coders to review, audit, and sign off on all complex charts. In fact, coders trained in AI validation are in higher demand and command higher salaries.",
      whatNotToSay: "Never dismiss valid industry questions by saying: 'AI is fake news, don't read the internet'."
    }
  ];

  // Reference Section: 8 WhatsApp Templates matching screenshot
  const WHATSAPP_TEMPLATES = [
    {
      id: 'wa1',
      title: 'First Response',
      text: "Hi {name}! 👋 Thanks for your interest in ThoughtFlows Medical Coding. I'm {hr}, your counsellor. May I know your education background so I can suggest the right course?"
    },
    {
      id: 'wa2',
      title: 'Course Details',
      text: "Our CPC program is {duration}, fully job-oriented with live training, real coding practice and AAPC exam prep. Mode: online + offline. Placement support included. Want me to share the full syllabus?"
    },
    {
      id: 'wa3',
      title: 'Fee Details',
      text: "The CPC course fee is {fee} (EMI available). This covers training, study material and placement support. The AAPC exam/voucher fee is separate. Shall I check if any scholarship applies for you?"
    },
    {
      id: 'wa4',
      title: 'Demo Reminder',
      text: "Hi {name}, reminder for your free CPC demo today at {time} with trainer {trainer}. Joining link: {link}. Please be ready 5 mins early. See you there! 🎯"
    },
    {
      id: 'wa5',
      title: 'Payment Reminder',
      text: "Hi {name}, gentle reminder - your fee balance of {balance} is due on {date}. You can pay via UPI/card/bank transfer. Reply here if you'd like the payment link or to discuss EMI."
    },
    {
      id: 'wa6',
      title: 'Admission Confirmation',
      text: "Congratulations {name}! 🎉 Your admission to the CPC program is confirmed. Your Student ID is {sid}. Batch starts {date}. Welcome to ThoughtFlows!"
    },
    {
      id: 'wa7',
      title: 'Document Pending',
      text: "Hi {name}, to complete your admission we still need: {docs}. Please share them here or bring to the branch. This unlocks your batch allocation."
    },
    {
      id: 'wa8',
      title: 'Reactivation',
      text: "Hi {name}, hope you're doing well! A new CPC batch is starting {date} with a special scholarship this month. Would you like to revisit joining? Happy to help. 😊"
    }
  ];

  // MY RECORD Section Datasets matching reference screenshots
  const HR_ASSESSMENTS_DATA = [
    { id: 1, title: 'Brand Training', subtitle: 'passed', status: 'passed', score: '88%' },
    { id: 2, title: 'Career Basics', subtitle: 'passed', status: 'passed', score: '81%' },
    { id: 3, title: 'Lead Handling SOP', subtitle: 'not attempted yet', status: 'pending', score: 'PENDING' },
    { id: 4, title: 'Placement (80%)', subtitle: 'not attempted yet', status: 'pending', score: 'PENDING' },
    { id: 5, title: 'CPC Course', subtitle: 'passed', status: 'passed', score: '88%' },
    { id: 6, title: 'COC Course', subtitle: 'passed', status: 'passed', score: '82%' },
    { id: 7, title: 'CCS Course', subtitle: 'passed', status: 'passed', score: '90%' },
    { id: 8, title: 'E/M Course', subtitle: 'passed', status: 'passed', score: '76%' },
  ];

  const CALL_AUDIT_DATA = [
    {
      id: 1,
      score: 91,
      title: 'Call review · 18 May',
      note: 'Strong rapport. Slightly rushed the fee explanation.',
      isAction: false
    },
    {
      id: 2,
      score: 84,
      title: 'Call review · 14 May',
      note: 'Good. Remember to confirm the next follow-up date on the call.',
      isAction: false
    },
    {
      id: 3,
      score: 58,
      title: 'Call review · 9 May',
      note: 'Over-promised on placement timeline — corrected. Placement module re-assigned.',
      isAction: true
    }
  ];

  const PERFORMANCE_COURSE_BREAKDOWN = [
    { course: 'CPC', leads: 32, converted: 14, convRate: '44%', lmsScore: '88%' },
    { course: 'COC', leads: 18, converted: 6, convRate: '33%', lmsScore: '82%' },
    { course: 'CCS', leads: 12, converted: 4, convRate: '33%', lmsScore: '90%' },
    { course: 'E/M', leads: 9, converted: 2, convRate: '22%', lmsScore: '76%' },
  ];

  const INTERNAL_CERTIFICATION_LEVELS = [
    { level: 1, title: 'Level 1 · Enrolled', subtitle: 'Automatic on enrollment', isAchieved: true },
    { level: 2, title: 'Level 2 · Counsellor', subtitle: 'Granted by HR Lead', isAchieved: true },
    { level: 3, title: 'Level 3 · Senior Counsellor', subtitle: 'Management approval', isAchieved: false },
    { level: 4, title: 'Level 4 · Lead Counsellor', subtitle: 'Management approval', isAchieved: false },
    { level: 5, title: 'Level 5 · Master Counsellor', subtitle: 'Management approval', isAchieved: false },
  ];

  // Exact Sidebar items structure matching screenshots
  const SIDEBAR_SECTIONS = [
    {
      title: 'LEARNING SYSTEM',
      items: [
        { name: 'Home', icon: Home },
        { name: 'My HR Profile', icon: User },
        { name: 'Course Eligibility', icon: GraduationCap },
        { name: 'My Learning', icon: BookOpen }
      ]
    },
    {
      title: 'MANDATORY MODULES',
      items: [
        { name: 'Brand Training', icon: ShieldCheck, hasLock: true },
        { name: 'Career Basics', icon: Briefcase, hasLock: true },
        { name: 'Lead Handling SOP', icon: PhoneCall, hasLock: true },
        { name: 'Payment & Admission SOP', icon: CreditCard, hasLock: true },
        { name: 'Placement Explanation', icon: Award, hasLock: true }
      ]
    },
    {
      title: 'GUIDES',
      items: [
        { name: 'Course Recommendation', icon: Compass },
        { name: 'Demo Booking & Handover', icon: Calendar },
        { name: 'Certification Explanation', icon: FileCheck, hasLock: true }
      ]
    },
    {
      title: 'REFERENCE',
      items: [
        { name: 'Counselling Scripts', icon: Edit3 },
        { name: 'Objection Handling', icon: ShieldCheck },
        { name: 'WhatsApp Templates', icon: MessageSquare }
      ]
    },
    {
      title: 'MY RECORD',
      items: [
        { name: 'HR Assessments', icon: ClipboardCheck },
        { name: 'Call Audit Feedback', icon: Headphones },
        { name: 'Performance Report', icon: TrendingUp },
        { name: 'Retraining', icon: RotateCcw },
        { name: 'Internal Certification', icon: Medal }
      ]
    }
  ];

  // Check if activeNav is one of the video player modules (Mandatory or Guides)
  const currentMediaModule = mediaModulesState[activeNav];

  return (
    <div className="w-full flex flex-col lg:flex-row items-start gap-4 pb-16 relative">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-20 right-8 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-teal-400 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className="w-full lg:w-64 flex-shrink-0 bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/90 shadow-xs space-y-4">
        {SIDEBAR_SECTIONS.map((sec, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 py-0.5">
              {sec.title}
            </h4>
            <div className="space-y-0.5">
              {sec.items.map((item, iIdx) => {
                const isSelected = activeNav === item.name;
                const Icon = item.icon;
                return (
                  <button
                    key={iIdx}
                    onClick={() => {
                      setActiveNav(item.name);
                      setIsVideoPlaying(false);
                      setActiveLesson(null);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all text-left ${
                      isSelected
                        ? 'bg-[#b45309] text-white shadow-xs font-bold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <span className="truncate">{item.name}</span>
                    </div>
                    {item.hasLock && (
                      <Lock className={`w-3 h-3 flex-shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                    )}
                    {item.hasArrow && (
                      <ChevronRight className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-white' : 'text-amber-500'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Floating / Bottom Course Catalog Button */}
        <div className="pt-2 border-t border-slate-100">
          <button
            onClick={() => {
              setActiveNav('Course Eligibility');
              showToast('Opened Course Catalog & Eligibility');
            }}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#b45309] hover:bg-[#92400e] text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95"
          >
            <Lightbulb className="w-3.5 h-3.5 text-amber-200 fill-amber-200" />
            <span>Course Catalog</span>
          </button>
        </div>
      </aside>

      {/* RIGHT MAIN LMS CONTENT */}
      <main className="flex-1 w-full space-y-4 min-w-0">
        {/* VIEW 1: VIDEO PLAYER MODULE VIEW (Handles all 5 Mandatory Modules + all 3 Guides) */}
        {currentMediaModule && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                {currentMediaModule.hasWarning && (
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                )}
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  {currentMediaModule.title}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                {currentMediaModule.subtitle}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-8 space-y-3">
                <div className="w-full aspect-video bg-[#0f172a] rounded-2xl relative flex items-center justify-center overflow-hidden shadow-md group">
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 pointer-events-none" />

                  <button
                    onClick={() => {
                      setIsVideoPlaying(!isVideoPlaying);
                      showToast(isVideoPlaying ? 'Paused video' : 'Playing lesson video');
                    }}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 z-10 shadow-lg border border-white/20"
                  >
                    {isVideoPlaying ? (
                      <Pause className="w-6 h-6 fill-white" />
                    ) : (
                      <Play className="w-6 h-6 fill-white ml-0.5" />
                    )}
                  </button>

                  {isVideoPlaying && (
                    <div className="absolute top-4 right-4 bg-emerald-500/90 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 animate-pulse">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      <span>PLAYING</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs sm:text-[13px] font-bold text-slate-800">
                    <span className="text-slate-400">▶</span>
                    <span>
                      {activeLesson ? activeLesson.title : currentMediaModule.items[0]?.title}
                    </span>
                  </div>

                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#00897b] rounded-full transition-all duration-300"
                      style={{
                        width: `${currentMediaModule.progress > 0 ? currentMediaModule.progress : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-4 space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  MODULE CONTENTS
                </h4>

                <div className="space-y-2.5">
                  {currentMediaModule.items.map((item, idx) => {
                    const isCurrent = (activeLesson?.id === item.id) || (!activeLesson && idx === 0);
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setActiveLesson(item);
                          setIsVideoPlaying(true);
                          showToast(`Loaded: ${item.title}`);
                        }}
                        className={`flex items-center gap-2.5 text-xs cursor-pointer p-1.5 rounded-lg transition-all ${
                          isCurrent
                            ? 'bg-slate-50 font-bold text-slate-900'
                            : 'hover:bg-slate-50/70 text-slate-700'
                        }`}
                      >
                        {item.isCompleted ? (
                          <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-[10px] flex-shrink-0">
                            {idx + 1}
                          </div>
                        )}
                        <span className="truncate">{item.title}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => {
                  setActiveModuleModal({
                    id: activeNav,
                    title: currentMediaModule.title,
                    desc: currentMediaModule.subtitle,
                    passingScore: currentMediaModule.passingScore
                  });
                }}
                className="w-full py-3 px-4 rounded-xl bg-[#b45309] hover:bg-[#92400e] text-white font-black text-xs sm:text-sm tracking-wide shadow-xs transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{currentMediaModule.testButtonText}</span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: MY LEARNING MODULES */}
        {activeNav === 'My Learning' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-[#005a54] flex items-center justify-center">
                  <BookOpen className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  My Learning Modules
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-1">
                Finish 5 SOP modules first, then course knowledge · pass scale is 70%+ to unlock leads
              </p>
            </div>

            <div className="space-y-2">
              {mandatoryModulesList.map((mod) => (
                <div
                  key={mod.id}
                  className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white transition-all flex items-center justify-between gap-4 shadow-2xs"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 shadow-xs text-white ${
                        mod.isCompleted
                          ? 'bg-[#005a54]'
                          : mod.progress > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    >
                      {mod.isCompleted ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : mod.progress > 0 ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <Lock className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate">
                        {mod.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                        {mod.desc}
                      </div>

                      <div className="w-full max-w-md h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            mod.isCompleted
                              ? 'bg-[#005a54]'
                              : mod.progress > 0
                              ? 'bg-amber-500'
                              : 'bg-rose-400'
                          }`}
                          style={{ width: `${mod.progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-shrink-0">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${mod.badgeClass}`}
                    >
                      {mod.badge}
                    </span>

                    {mod.actionText && (
                      <button
                        onClick={() => {
                          const mapping = {
                            sop1: 'Brand Training',
                            sop2: 'Career Basics',
                            sop3: 'Lead Handling SOP',
                            sop4: 'Placement Explanation',
                            sop5: 'Payment & Admission SOP'
                          };
                          setActiveNav(mapping[mod.id] || 'Brand Training');
                        }}
                        className="bg-[#005a54] hover:bg-[#004742] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs active:scale-95"
                      >
                        {mod.actionText}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  COURSE KNOWLEDGE · 20 MODULES
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  Exam Scale: 70%+ to unlock
                </span>
              </div>

              <div className="space-y-2">
                {courseModules.map((c) => {
                  const isCompleted = c.progress >= 70;
                  const inProgress = c.progress > 0 && c.progress < 70;

                  return (
                    <div
                      key={c.id}
                      className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white transition-all flex items-center justify-between gap-4 shadow-2xs"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold flex-shrink-0 shadow-xs text-white ${
                            isCompleted
                              ? 'bg-[#005a54]'
                              : inProgress
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : inProgress ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <Lock className="w-3.5 h-3.5" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="font-extrabold text-xs sm:text-sm text-slate-900 leading-tight truncate">
                            {c.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {c.desc}
                          </div>

                          <div className="w-full max-w-md h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isCompleted
                                  ? 'bg-[#005a54]'
                                  : inProgress
                                  ? 'bg-amber-500'
                                  : 'bg-rose-400'
                              }`}
                              style={{ width: `${c.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase tracking-wider ${
                            isCompleted
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                              : inProgress
                              ? 'bg-amber-50 text-amber-800 border border-amber-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {isCompleted ? 'ELIGIBLE' : inProgress ? 'IN PROGRESS' : 'NOT STARTED'}
                        </span>

                        <button
                          onClick={() => setActiveModuleModal(c)}
                          className="bg-[#005a54] hover:bg-[#004742] text-white font-bold text-xs px-3.5 py-1.5 rounded-lg transition-all shadow-xs active:scale-95"
                        >
                          {isCompleted ? 'Review' : inProgress ? 'Resume' : 'Start'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: DEDICATED COURSE ELIGIBILITY GRID */}
        {activeNav === 'Course Eligibility' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Target className="w-4 h-4 stroke-[2.5]" />
                </div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  My Course Eligibility
                </h2>
              </div>
              <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-500 inline flex-shrink-0" />
                <span>= finish the module + pass the test (70%) to unlock leads for that course</span>
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2.5">
              {ALL_COURSE_ELIGIBILITY_GRID.map((c) => {
                return (
                  <div
                    key={c.code}
                    className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:shadow-xs min-h-[96px] ${
                      c.canCounsel
                        ? 'bg-[#f0fdf4] border-emerald-300'
                        : 'bg-[#fff1f2] border-rose-200/90'
                    }`}
                  >
                    <div>
                      <div className="font-extrabold text-xs sm:text-[13px] text-slate-900 truncate leading-tight">
                        {c.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                        {c.sub}
                      </div>
                    </div>

                    <div className="mt-3">
                      <div className="flex items-center gap-1 text-[10px] font-bold leading-none">
                        {c.canCounsel ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600 flex-shrink-0 stroke-[3]" />
                            <span className="text-emerald-700 truncate">
                              Can counsel · {c.score}%
                            </span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-2.5 h-2.5 text-rose-500 flex-shrink-0" />
                            <span className="text-rose-600 truncate">
                              Locked
                            </span>
                          </>
                        )}
                      </div>

                      <div
                        className={`w-full h-1 rounded-full mt-2 overflow-hidden ${
                          c.canCounsel ? 'bg-emerald-200/70' : 'bg-rose-200/60'
                        }`}
                      >
                        <div
                          className={`h-full rounded-full ${
                            c.canCounsel ? 'bg-emerald-500' : 'bg-rose-400'
                          }`}
                          style={{ width: `${c.score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 4: MY HR PROFILE */}
        {activeNav === 'My HR Profile' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md bg-purple-50 text-purple-700 flex items-center justify-center">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    My HR Profile
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Basic details, training status, and eligibility status
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pb-5 mb-5 border-b border-slate-100">
                <div className="w-12 h-12 rounded-full bg-[#005a54] text-white flex items-center justify-center text-lg font-black shadow-xs flex-shrink-0">
                  {userInitial}
                </div>
                <div className="min-w-0">
                  <div className="font-black text-slate-900 text-base sm:text-lg tracking-tight">
                    {userName}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 font-medium flex items-center gap-1.5">
                      <span className="font-mono text-[11px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                        TF-HR-001
                      </span>
                      <span>·</span>
                      <span>HR Coordinator</span>
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md">
                        HR OFFICE
                      </span>
                      <span className="bg-teal-50 text-teal-700 border border-teal-300 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md">
                        ACTIVE
                      </span>
                      <span className="bg-amber-50 text-amber-800 border border-amber-300 font-black text-[10px] tracking-wider uppercase px-2 py-0.5 rounded-md">
                        HIGH PERFORMER
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    FULL NAME
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    {userName}
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    ROLE
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    HR Desk
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    BRANCH
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    CBE - Saravanampatti
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    REPORTING TO
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    HR Executive
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    SHIFT
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    10:00 - 19:00
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    LANGUAGES
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    Tamil, English, Telugu
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    EMAIL
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    kavitha@thoughtflows.in
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    MOBILE
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    70xxxx 12345
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    JOINING DATE
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 truncate">
                    15 Jan 2024
                  </div>
                </div>

                <div className="p-3 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 bg-slate-50/40 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      STATUS
                    </div>
                    <div className="text-xs sm:text-sm font-semibold text-slate-900 mt-0.5 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                      <span>Active</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md bg-teal-50 text-[#005a54] flex items-center justify-center">
                  <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-black text-base sm:text-lg text-slate-900 leading-tight">
                    Course Eligibility Status
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                    Requisite courses, test score, and eligibility status
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {PROFILE_COURSE_ELIGIBILITY.map((course) => {
                  const isEligible = course.status === 'ELIGIBLE';
                  return (
                    <div
                      key={course.code}
                      className="p-3 sm:px-4 sm:py-3 rounded-xl border border-slate-200/80 hover:border-slate-300 bg-white transition-all flex items-center justify-between gap-3 shadow-2xs"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-xs ${
                            isEligible
                              ? 'bg-[#005a54] text-white'
                              : 'bg-amber-500 text-white'
                          }`}
                        >
                          {isEligible ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="font-black text-xs sm:text-sm text-slate-900 leading-tight">
                            {course.name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {course.category}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-wider flex-shrink-0 ${
                          isEligible
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {course.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: HOME DASHBOARD */}
        {activeNav === 'Home' && (
          <div className="space-y-4">
            <div className="bg-[#005a54] text-white rounded-2xl p-5 sm:p-6 shadow-xs flex items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Good afternoon, {userFirstName}
                </h1>
                <p className="text-xs sm:text-[13px] text-teal-100/85 mt-1 font-medium">
                  CBE - Saravanampatti · Complete your modules to unlock more courses
                </p>
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-3xl sm:text-4xl font-black text-amber-300 leading-none">
                  2
                </div>
                <div className="text-[9px] font-black uppercase tracking-widest text-teal-200 mt-0.5">
                  DEPT LEVEL
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-teal-600 flex flex-col justify-between">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
                  LMS COMPLETION
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
                  68%
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  11 of 16 modules
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-amber-500 flex flex-col justify-between">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
                  COURSE KNOWLEDGE
                </div>
                <div className="text-2xl sm:text-3xl font-black text-amber-600 mt-2">
                  82%
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  avg test score
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-blue-600 flex flex-col justify-between">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
                  CALL AUDIT
                </div>
                <div className="text-2xl sm:text-3xl font-black text-blue-600 mt-2">
                  91%
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  last review
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs border-t-4 border-t-emerald-600 flex flex-col justify-between">
                <div className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-slate-500">
                  CONVERSION
                </div>
                <div className="text-2xl sm:text-3xl font-black text-emerald-600 mt-2 flex items-center">
                  <span className="inline-block w-6 h-1 bg-emerald-500 rounded-full" />
                </div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">
                  this month
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-amber-500 font-black text-sm">⚠️</span>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Mandatory Pending Modules
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  Complete these — some leads are locked until you do
                </p>
              </div>

              <div className="space-y-3">
                {mandatoryModulesList.slice(2).map((mod) => (
                  <div
                    key={mod.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 hover:border-teal-300/80 bg-slate-50/40 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${mod.iconColor} text-white flex items-center justify-center font-bold flex-shrink-0 shadow-xs`}>
                        {mod.isCompleted ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : mod.progress > 0 ? (
                          <BookOpen className="w-5 h-5" />
                        ) : (
                          <Lock className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {mod.title}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          {mod.desc}
                        </div>

                        <div className="w-36 h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1.5">
                          <div
                            className="h-full bg-emerald-600 rounded-full transition-all"
                            style={{ width: `${mod.progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                      <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md uppercase tracking-wider ${mod.badgeClass}`}>
                        {mod.badge}
                      </span>

                      <button
                        onClick={() => {
                          const mapping = {
                            sop3: 'Lead Handling SOP',
                            sop4: 'Placement Explanation',
                            sop5: 'Payment & Admission SOP'
                          };
                          setActiveNav(mapping[mod.id] || 'Lead Handling SOP');
                        }}
                        className="bg-[#005a54] hover:bg-[#004742] text-white font-bold text-xs px-4 py-1.5 rounded-lg transition-all active:scale-95 shadow-xs"
                      >
                        {mod.actionText}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base">📋</span>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                    Course Eligibility Summary
                  </h3>
                </div>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                  What you can counsel right now
                </p>
              </div>

              <div className="flex items-center gap-8 sm:gap-14 pt-1">
                <div>
                  <div className="text-3xl sm:text-4xl font-black text-emerald-600 leading-none">
                    6
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Courses you can counsel</span>
                  </div>
                </div>

                <div>
                  <div className="text-3xl sm:text-4xl font-black text-rose-600 leading-none">
                    14
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>Locked — finish modules to unlock</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 6: REFERENCE - COUNSELLING SCRIPTS */}
        {activeNav === 'Counselling Scripts' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <span className="text-xl">📄</span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Counselling Scripts
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  14 reference scripts · read-only
                </p>
              </div>
            </div>

            {/* 14 Scripts matching screenshot layout */}
            <div className="space-y-2.5">
              {COUNSELLING_SCRIPTS.map((script) => {
                const isOpen = openScriptId === script.id;
                const isCopied = copiedId === script.id;
                return (
                  <div
                    key={script.id}
                    className="border border-slate-200/80 hover:border-slate-300 rounded-xl transition-all overflow-hidden bg-white shadow-xs"
                  >
                    <div
                      onClick={() => setOpenScriptId(isOpen ? null : script.id)}
                      className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#005a54] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                          <FileText className="w-4 h-4 text-emerald-100" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#005a54] transition-colors">
                            {script.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            reference script · read-only
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                          {script.version || 'v2'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {/* Expandable Script Content with Copy Action */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/60 space-y-3">
                        <div className="p-3.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                            Script Guide & Framework:
                          </div>
                          <p className="text-xs text-slate-700 italic leading-relaxed font-sans">
                            "{script.text}"
                          </p>
                        </div>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(script.text, script.id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#005a54] hover:bg-[#004742] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
                          >
                            {isCopied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{isCopied ? 'Copied! ✓' : 'Copy Script'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 7: REFERENCE - OBJECTION HANDLING */}
        {activeNav === 'Objection Handling' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <Shield className="w-5 h-5 text-blue-500 fill-blue-500" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Objection Handling Library
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  15 common objections · what to say and what NOT to say
                </p>
              </div>
            </div>

            {/* 15 Objections matching screenshot layout */}
            <div className="space-y-2.5">
              {OBJECTION_HANDLING_LIBRARY.map((obj) => {
                const isOpen = openObjectionId === obj.id;
                return (
                  <div
                    key={obj.id}
                    className="border border-slate-200/80 hover:border-slate-300 rounded-xl transition-all overflow-hidden bg-white shadow-xs"
                  >
                    <div
                      onClick={() => setOpenObjectionId(isOpen ? null : obj.id)}
                      className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer group hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#b45309] flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                          <Shield className="w-4 h-4 text-amber-100 fill-amber-100" />
                        </div>
                        <div>
                          <div className="font-bold text-xs sm:text-sm text-slate-900 group-hover:text-[#b45309] transition-colors">
                            {obj.objection}
                          </div>
                          <div className="text-[11px] text-slate-400 font-normal">
                            tap for what to say · what NOT to say
                          </div>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>

                    {/* Expandable What to Say & What NOT to Say */}
                    {isOpen && (
                      <div className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/60 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* What to Say */}
                          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                What to Say (Recommended)
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  copyToClipboard(obj.whatToSay, `obj_say_${obj.id}`);
                                }}
                                className="text-[10px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 cursor-pointer bg-white px-2 py-0.5 rounded border border-emerald-200"
                              >
                                {copiedId === `obj_say_${obj.id}` ? <CheckCheck className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                <span>{copiedId === `obj_say_${obj.id}` ? 'Copied' : 'Copy'}</span>
                              </button>
                            </div>
                            <p className="text-xs text-slate-700 leading-relaxed font-medium">
                              "{obj.whatToSay}"
                            </p>
                          </div>

                          {/* What NOT to Say */}
                          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 space-y-2">
                            <span className="text-[11px] font-black uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                              <X className="w-3.5 h-3.5 text-rose-600" />
                              What NOT to Say (Avoid)
                            </span>
                            <p className="text-xs text-rose-900 leading-relaxed font-medium">
                              {obj.whatNotToSay}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 8: REFERENCE - WHATSAPP TEMPLATES */}
        {activeNav === 'WhatsApp Templates' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <MessageCircle className="w-5 h-5 text-purple-600 fill-purple-100" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  WhatsApp Templates
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Copy-only · admin controlled · grouped by category
                </p>
              </div>
            </div>

            {/* 8 WhatsApp Templates matching screenshot layout */}
            <div className="space-y-2.5">
              {WHATSAPP_TEMPLATES.map((tmpl) => {
                const personalizedText = tmpl.text.replace('{hr}', userFirstName);
                const isCopied = copiedId === tmpl.id;
                return (
                  <div
                    key={tmpl.id}
                    className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white shadow-xs transition-all"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-[#10b981] flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-xs">
                        <MessageSquare className="w-3.5 h-3.5 fill-white" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="font-bold text-xs sm:text-sm text-slate-900">
                          {tmpl.title}
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed font-normal break-words">
                          {personalizedText}
                        </p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(personalizedText, tmpl.id)}
                        className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          isCopied
                            ? 'bg-slate-900 text-white'
                            : 'bg-[#10b981] hover:bg-emerald-600 text-white'
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <CheckCheck className="w-3.5 h-3.5" />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <span>Copy</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* VIEW 9: MY RECORD - HR ASSESSMENTS */}
        {activeNav === 'HR Assessments' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <span className="text-xl">📊</span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  HR Assessments
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  All module tests + your scores · 70% to pass (placement 80%)
                </p>
              </div>
            </div>

            {/* Assessment Cards matching screenshot */}
            <div className="space-y-2.5">
              {HR_ASSESSMENTS_DATA.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-white shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 shadow-xs ${
                        item.status === 'passed' ? 'bg-[#10b981]' : 'bg-slate-400'
                      }`}
                    >
                      {item.status === 'passed' ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <span className="font-bold text-sm leading-none">-</span>
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <div>
                    {item.status === 'passed' ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        {item.score}
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        PENDING
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 10: MY RECORD - CALL AUDIT FEEDBACK */}
        {activeNav === 'Call Audit Feedback' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <Headphones className="w-5 h-5 text-slate-600" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Call Audit Feedback
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Reviewed calls · score · what to improve
                </p>
              </div>
            </div>

            {/* 3 Call Reviews matching screenshot */}
            <div className="space-y-2.5">
              {CALL_AUDIT_DATA.map((item) => (
                <div
                  key={item.id}
                  className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-white shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-xs sm:text-sm flex-shrink-0 shadow-xs ${
                        item.isAction ? 'bg-rose-600' : 'bg-[#10b981]'
                      }`}
                    >
                      {item.score}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        {item.note}
                      </div>
                    </div>
                  </div>
                  <div>
                    {item.isAction ? (
                      <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        ACTION
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        OK
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* VIEW 11: MY RECORD - PERFORMANCE REPORT */}
        {activeNav === 'Performance Report' && (
          <div className="space-y-4">
            {/* 4 Top KPI Cards matching screenshot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs border-t-4 border-t-teal-700 flex flex-col justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CONVERSION
                </div>
                <div className="text-2xl font-black text-[#005a54] my-1">—</div>
                <div className="text-[11px] text-slate-400">vs last month</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs border-t-4 border-t-amber-400 flex flex-col justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  CALL AUDIT
                </div>
                <div className="text-2xl font-black text-amber-500 my-1">91%</div>
                <div className="text-[11px] text-slate-400">excellent</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs border-t-4 border-t-blue-500 flex flex-col justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  FOLLOW-UP DISCIPLINE
                </div>
                <div className="text-2xl font-black text-blue-600 my-1">88%</div>
                <div className="text-[11px] text-slate-400">on time</div>
              </div>

              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs border-t-4 border-t-emerald-500 flex flex-col justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  TARGET
                </div>
                <div className="text-2xl font-black text-emerald-600 my-1">61/70</div>
                <div className="text-[11px] text-slate-400">9 to go · 10 days</div>
              </div>
            </div>

            {/* Course-wise Breakdown Table matching screenshot */}
            <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 pb-1">
                <span className="text-xl">📈</span>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    Course-wise Breakdown
                  </h2>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Leads · converted · conversion % · audit · LMS score
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="pb-2.5 font-bold">COURSE</th>
                      <th className="pb-2.5 font-bold">LEADS</th>
                      <th className="pb-2.5 font-bold">CONVERTED</th>
                      <th className="pb-2.5 font-bold">CONV %</th>
                      <th className="pb-2.5 font-bold">LMS</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs divide-y divide-slate-100">
                    {PERFORMANCE_COURSE_BREAKDOWN.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 font-bold text-slate-900">{row.course}</td>
                        <td className="py-3 text-slate-600">{row.leads}</td>
                        <td className="py-3 text-slate-600">{row.converted}</td>
                        <td className="py-3 font-semibold text-slate-800">{row.convRate}</td>
                        <td className="py-3 font-bold text-emerald-700">{row.lmsScore}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 12: MY RECORD - RETRAINING */}
        {activeNav === 'Retraining' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-6">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <RotateCcw className="w-5 h-5 text-blue-500" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  My Retraining Modules
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  Assigned by your team lead · mandatory ones block leads until done
                </p>
              </div>
            </div>

            {/* Retraining Module Card matching screenshot */}
            <div className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-white shadow-xs transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center text-white flex-shrink-0 shadow-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <div className="font-bold text-xs sm:text-sm text-slate-900">
                    Placement Explanation — re-take
                  </div>
                  <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                    mandatory · assigned 9 May · due 23 May · blocks leads
                  </div>
                  <div className="w-44 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-slate-300 w-1/4 rounded-full"></div>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveNav('Placement Explanation');
                  showToast('Opening Placement Explanation retraining module...');
                }}
                className="px-4 py-1.5 bg-[#005a54] hover:bg-[#004742] text-white text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer"
              >
                Start
              </button>
            </div>

            {/* Footer message matching screenshot */}
            <div className="text-center text-xs text-slate-500 font-medium pt-2 flex items-center justify-center gap-1.5">
              <span>No other retraining assigned right now</span>
              <CheckSquare className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" />
            </div>
          </div>
        )}

        {/* VIEW 13: MY RECORD - INTERNAL CERTIFICATION */}
        {activeNav === 'Internal Certification' && (
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs space-y-4">
            {/* Header matching screenshot */}
            <div className="flex items-center gap-2.5 pb-1">
              <Medal className="w-5 h-5 text-amber-500" />
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                  Internal HR Certification
                </h2>
                <p className="text-xs text-slate-500 font-normal mt-0.5">
                  5 levels · Level 1-2 by team lead · Level 3-5 by management
                </p>
              </div>
            </div>

            {/* 5 Levels matching screenshot */}
            <div className="space-y-2.5">
              {INTERNAL_CERTIFICATION_LEVELS.map((item) => (
                <div
                  key={item.level}
                  className="border border-slate-200/80 hover:border-slate-300 rounded-xl p-3.5 flex items-center justify-between bg-white shadow-xs transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 shadow-xs ${
                        item.isAchieved
                          ? 'bg-[#b45309] text-white'
                          : 'bg-slate-100 text-slate-400 border border-slate-200'
                      }`}
                    >
                      {item.level}
                    </div>
                    <div>
                      <div className="font-bold text-xs sm:text-sm text-slate-900">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-normal">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>
                  <div>
                    {item.isAchieved ? (
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        ACHIEVED
                      </span>
                    ) : (
                      <span className="bg-rose-50 text-rose-600 border border-rose-200 text-[10px] font-bold px-2.5 py-0.5 rounded">
                        LOCKED
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Interactive Module Player / Test Modal */}
      {activeModuleModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#005a54] text-white flex items-center justify-center font-bold">
                  <ClipboardCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {activeModuleModal.title} — Assessment
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Passing score: {activeModuleModal.passingScore || '80%'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModuleModal(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-teal-50 border border-teal-200 p-3.5 rounded-xl text-teal-950">
                <div className="font-bold mb-1">Standard Operating Assessment Protocol</div>
                <p className="text-teal-800 leading-relaxed">
                  Review the questions below. Passing with {activeModuleModal.passingScore || '80%'} unlocks student lead allocation for these courses in your CRM dashboard.
                </p>
              </div>

              <div className="space-y-2">
                <div className="font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  Question Checklist
                </div>

                <div className="space-y-1.5">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">1. Student Intake & Qualification Standards</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">Accurate evaluation of candidate medical background and eligibility.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">2. Ethical Communication & Placement Promises</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">Adherence to strict ThoughtFlows placement explanation guidelines.</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-start gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800">3. CRM Stage Progression & Handover SOP</span>
                      <p className="text-slate-500 text-[11px] mt-0.5">Correct logging of remarks, demo bookings, and fee structures.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveModuleModal(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleCompleteModule(activeModuleModal.id)}
                  className="px-5 py-2 bg-[#005a54] hover:bg-[#004742] text-white font-bold rounded-xl text-xs transition-all shadow-sm cursor-pointer"
                >
                  Submit & Pass Assessment ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
