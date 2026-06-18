import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  LayoutDashboard, User, Clock, Briefcase, Users, Activity, Calendar, 
  ArrowRight, Lock, Unlock, Settings, AlertCircle, CheckCircle2, XCircle, 
  Plus, Play, Pause, Save, FileSpreadsheet, Sparkles, Send, Database, 
  TrendingUp, BarChart3, Flame, ShieldAlert, RefreshCw, FileText, Check,
  ChevronRight, Inbox, HelpCircle
} from 'lucide-react';

// Predefined Projects & Colors
const PROJECTS = [
  { id: 'Project A', name: 'Project A (Core Platform)', hours: 4500, budget: 6000, color: '#3b82f6', bgColor: 'bg-blue-500', textColors: 'text-blue-600 bg-blue-50', rate: 100 },
  { id: 'Project B', name: 'Project B (API Gateway)', hours: 3200, budget: 4000, color: '#8b5cf6', bgColor: 'bg-purple-500', textColors: 'text-purple-600 bg-purple-50', rate: 120 },
  { id: 'Project C', name: 'Project C (Mobile Web Client)', hours: 1800, budget: 2000, color: '#10b981', bgColor: 'bg-emerald-500', textColors: 'text-emerald-600 bg-emerald-50', rate: 90 },
];

const ROLES = [
  { name: 'Engineering', value: 60, color: '#3b82f6' },
  { name: 'Design', value: 20, color: '#ec4899' },
  { name: 'Management', value: 10, color: '#f59e0b' },
  { name: 'QA', value: 10, color: '#64748b' },
];

const INITIAL_USERS = [
  { name: 'Sarah Jenkins', role: 'Senior Frontend Developer', dept: 'Engineering', avatar: 'https://i.pravatar.cc/150?u=sarah', rate: 100 },
  { name: 'John Doe', role: 'Product Manager', dept: 'Management', avatar: 'https://i.pravatar.cc/150?u=john', rate: 120 },
  { name: 'Alex Rivera', role: 'QA Engineer', dept: 'QA', avatar: 'https://i.pravatar.cc/150?u=alex', rate: 80 },
  { name: 'Emily Chen', role: 'UX Lead Designer', dept: 'Design', avatar: 'https://i.pravatar.cc/150?u=emily', rate: 95 },
];

const INITIAL_LOGS = {
  'Sarah Jenkins': [
    { id: 1, project: 'Project A', hours: 2, mins: 0, task: 'Frontend component library setup', start: '09:00 AM', end: '11:00 AM', bgColor: 'bg-blue-500', color: '#3b82f6', date: '2026-06-19' },
    { id: 2, project: 'Project B', hours: 3, mins: 0, task: 'Database schema migration and seeding', start: '11:00 AM', end: '02:00 PM', bgColor: 'bg-purple-500', color: '#8b5cf6', date: '2026-06-19' },
    { id: 3, project: 'Project B', hours: 1, mins: 30, task: 'API gateway endpoint load testing', start: '02:30 PM', end: '04:00 PM', bgColor: 'bg-purple-500', color: '#8b5cf6', date: '2026-06-19' }, 
    { id: 4, project: 'Project C', hours: 2, mins: 0, task: 'Client requirements workshop & alignment', start: '04:00 PM', end: '06:00 PM', bgColor: 'bg-emerald-500', color: '#10b981', date: '2026-06-19' },
  ],
  'John Doe': [
    { id: 10, project: 'Project A', hours: 4, mins: 0, task: 'Roadmap planning and stakeholder alignment', start: '09:00 AM', end: '01:00 PM', bgColor: 'bg-blue-500', color: '#3b82f6', date: '2026-06-19' },
    { id: 11, project: 'Project C', hours: 3, mins: 30, task: 'Sprint grooming and design feedback session', start: '02:00 PM', end: '05:30 PM', bgColor: 'bg-emerald-500', color: '#10b981', date: '2026-06-19' },
  ],
  'Alex Rivera': [
    { id: 20, project: 'Project B', hours: 5, mins: 0, task: 'Writing Jest & Playwright integration test suites', start: '09:00 AM', end: '02:00 PM', bgColor: 'bg-purple-500', color: '#8b5cf6', date: '2026-06-19' },
    { id: 21, project: 'Project A', hours: 2, mins: 30, task: 'Bug verification on production-staging branch', start: '02:30 PM', end: '05:00 PM', bgColor: 'bg-blue-500', color: '#3b82f6', date: '2026-06-19' },
  ],
  'Emily Chen': [
    { id: 30, project: 'Project C', hours: 6, mins: 0, task: 'High-fidelity dashboard interactive user testing', start: '10:00 AM', end: '04:00 PM', bgColor: 'bg-emerald-500', color: '#10b981', date: '2026-06-19' },
    { id: 31, project: 'Project A', hours: 1, mins: 30, task: 'Iconography style guide review & audit', start: '04:30 PM', end: '06:00 PM', bgColor: 'bg-blue-500', color: '#3b82f6', date: '2026-06-19' },
  ],
};

const SUGGESTIONS = [
  { id: 's1', project: 'Project B', hours: 1, mins: 30, task: 'API Design Review Sync (Google Calendar)', type: 'calendar' },
  { id: 's2', project: 'Project A', hours: 2, mins: 0, task: 'Refactored auth routing system (GitHub Commit)', type: 'github' },
  { id: 's3', project: 'Project C', hours: 1, mins: 0, task: 'Mobile feedback discussion (Slack Channel)', type: 'slack' },
];

export default function App() {
  const [activePortal, setActivePortal] = useState('roadmap'); // 'roadmap' or 'prototype'
  const [activeTab, setActiveTab] = useState('company'); // company, employee, workflows
  const [roadmapSubTab, setRoadmapSubTab] = useState('overview'); // overview, comparison, architecture, metrics

  // State for user records
  const [selectedUser, setSelectedUser] = useState(INITIAL_USERS[0]);
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const [calendarSuggestions, setCalendarSuggestions] = useState(SUGGESTIONS);

  // Form states
  const [formProject, setFormProject] = useState('Project A');
  const [formHours, setFormHours] = useState(2);
  const [formMins, setFormMins] = useState(0);
  const [formTask, setFormTask] = useState('');
  const [formDate, setFormDate] = useState('2026-06-19');

  // Timer states (FVP feature)
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerProject, setTimerProject] = useState('Project A');
  const timerIntervalRef = useRef(null);

  // Manager Approval workflow (FVP feature)
  const [timesheetApprovals, setTimesheetApprovals] = useState([
    { employee: 'Sarah Jenkins', role: 'Senior Frontend Developer', hours: 8.5, status: 'Pending', week: 'Jun 15 - Jun 21' },
    { employee: 'John Doe', role: 'Product Manager', hours: 7.5, status: 'Pending', week: 'Jun 15 - Jun 21' },
    { employee: 'Alex Rivera', role: 'QA Engineer', hours: 7.5, status: 'Approved', week: 'Jun 15 - Jun 21' },
    { employee: 'Emily Chen', role: 'UX Lead Designer', hours: 7.5, status: 'Approved', week: 'Jun 15 - Jun 21' },
  ]);

  // Lock Date settings (FVP feature)
  const [lockDatesEnabled, setLockDatesEnabled] = useState(false);

  // Audit Logs (FVP feature)
  const [auditLogs, setAuditLogs] = useState([
    { id: 1, user: 'System', action: 'ChronoTrack Enterprise Sandbox Initialized', time: '10:00:00 AM' },
    { id: 2, user: 'Manager', action: 'Approved Alex Rivera\'s Weekly Timesheet', time: '10:05:30 AM' },
    { id: 3, user: 'Manager', action: 'Approved Emily Chen\'s Weekly Timesheet', time: '10:06:15 AM' },
  ]);

  // DB Simulator states (MVP Metric)
  const [simRunning, setSimRunning] = useState(false);
  const [simQps, setSimQps] = useState(0);
  const [simLatency, setSimLatency] = useState(15);
  const [simUsers, setSimUsers] = useState(0);
  const [simHistory, setSimHistory] = useState([]);

  // Toast Notification state
  const [toast, setToast] = useState(null);

  // Trigger brief alert notification
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Add action to audit log
  const logAudit = (user, action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [
      { id: Date.now(), user, action, time: timeStr },
      ...prev
    ]);
  };

  // Timer Effect
  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  const handleStartStopTimer = () => {
    if (timerRunning) {
      // Stopping and importing
      const hrs = Math.floor(timerSeconds / 3600);
      const mins = Math.floor((timerSeconds % 3600) / 60);
      setFormHours(hrs || 1); // fallback to min 1 hr if small, or round
      setFormMins(mins || 30);
      setFormProject(timerProject);
      setFormTask('Session tracked with Live Timer widget');
      setTimerRunning(false);
      setTimerSeconds(0);
      showToast('Timer captured! Log populated below.', 'info');
      logAudit(selectedUser.name, `Stopped Live Timer on ${timerProject} (${hrs}h ${mins}m)`);
    } else {
      setTimerRunning(true);
      logAudit(selectedUser.name, `Started Live Timer on ${timerProject}`);
    }
  };

  const handleResetTimer = () => {
    setTimerRunning(false);
    setTimerSeconds(0);
    logAudit(selectedUser.name, `Reset Live Timer`);
  };

  // Format stopwatch output
  const formatTime = (totalSeconds) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [
      hrs.toString().padStart(2, '0'),
      mins.toString().padStart(2, '0'),
      secs.toString().padStart(2, '0')
    ].join(':');
  };

  // Handle Form Submission for logging time
  const handleAddLog = (e) => {
    if (e) e.preventDefault();

    if (lockDatesEnabled && new Date(formDate) < new Date('2026-06-01')) {
      showToast('Failed to log: Lock dates are active. Edits to past months are restricted.', 'error');
      logAudit(selectedUser.name, `Attempted write blocked by lock date constraint`);
      return;
    }

    if (!formTask.trim()) {
      showToast('Please enter a description of the work completed.', 'error');
      return;
    }

    const matchedProject = PROJECTS.find(p => p.id === formProject);
    const newEntry = {
      id: Date.now(),
      project: formProject,
      hours: Number(formHours),
      mins: Number(formMins),
      task: formTask,
      start: '09:00 AM', // Simple fallback mock
      end: `${(9 + Number(formHours)).toString().padStart(2, '0')}:00 PM`,
      bgColor: matchedProject ? matchedProject.bgColor : 'bg-slate-500',
      color: matchedProject ? matchedProject.color : '#64748b',
      date: formDate,
    };

    setLogs(prev => ({
      ...prev,
      [selectedUser.name]: [newEntry, ...prev[selectedUser.name]]
    }));

    // Recalculate approval hours for simulated week log
    setTimesheetApprovals(prev => prev.map(item => {
      if (item.employee === selectedUser.name) {
        const currentTotal = logs[selectedUser.name].reduce((sum, l) => sum + l.hours + (l.mins / 60), 0);
        const additional = Number(formHours) + (Number(formMins) / 60);
        return {
          ...item,
          hours: parseFloat((currentTotal + additional).toFixed(1)),
          status: 'Pending' // resets to pending as data changed
        };
      }
      return item;
    }));

    showToast(`Successfully logged ${formHours}h ${formMins}m for ${formProject}`);
    logAudit(selectedUser.name, `Logged ${formHours}h ${formMins}m for ${formProject}: "${formTask}"`);
    setFormTask('');
  };

  // Import Smart Calendar/GitHub suggestion
  const handleImportSuggestion = (suggestion) => {
    if (lockDatesEnabled) {
      showToast('Failed to import: Monthly lock dates are active.', 'error');
      return;
    }

    const matchedProject = PROJECTS.find(p => p.id === suggestion.project);
    const newEntry = {
      id: Date.now(),
      project: suggestion.project,
      hours: suggestion.hours,
      mins: suggestion.mins,
      task: suggestion.task,
      start: '10:00 AM',
      end: '11:30 AM',
      bgColor: matchedProject ? matchedProject.bgColor : 'bg-slate-500',
      color: matchedProject ? matchedProject.color : '#64748b',
      date: '2026-06-19',
    };

    setLogs(prev => ({
      ...prev,
      [selectedUser.name]: [newEntry, ...prev[selectedUser.name]]
    }));

    // Update suggestions remaining
    setCalendarSuggestions(prev => prev.filter(s => s.id !== suggestion.id));

    // Update approvals weekly total hours
    setTimesheetApprovals(prev => prev.map(item => {
      if (item.employee === selectedUser.name) {
        const addedHours = suggestion.hours + (suggestion.mins / 60);
        return {
          ...item,
          hours: parseFloat((item.hours + addedHours).toFixed(1)),
          status: 'Pending'
        };
      }
      return item;
    }));

    showToast(`Imported suggestion: "${suggestion.task}"`);
    logAudit(selectedUser.name, `Imported automated suggestion to timesheet (${suggestion.hours}h ${suggestion.mins}m)`);
  };

  // Approve timesheet
  const handleApproveTimesheet = (employeeName) => {
    setTimesheetApprovals(prev => prev.map(item => 
      item.employee === employeeName ? { ...item, status: 'Approved' } : item
    ));
    showToast(`Timesheet for ${employeeName} has been approved.`);
    logAudit('Manager', `Approved weekly timesheet for ${employeeName}`);
  };

  // Reject timesheet
  const handleRejectTimesheet = (employeeName) => {
    setTimesheetApprovals(prev => prev.map(item => 
      item.employee === employeeName ? { ...item, status: 'Needs Revision' } : item
    ));
    showToast(`Timesheet for ${employeeName} rejected & returned for corrections.`, 'info');
    logAudit('Manager', `Rejected weekly timesheet for ${employeeName}`);
  };

  // Trigger Slack Nudge Bot Simulation
  const handleTriggerSlackNudge = (employeeName, currentHours) => {
    showToast(`Polite Slack reminder pushed to ${employeeName}!`, 'info');
    logAudit('System Bot', `Dispatched automated Friday afternoon Slack reminder to ${employeeName} (${currentHours} hrs logged)`);
  };

  // Export Data to CSV (MVP feature)
  const handleExportCSV = () => {
    // Generate simple CSV structure of all current logged times
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Employee,Date,Project,Duration (Hrs),Task Description\n";

    Object.keys(logs).forEach(user => {
      logs[user].forEach(entry => {
        const duration = entry.hours + (entry.mins / 60);
        const escapedTask = entry.task.replace(/"/g, '""');
        csvContent += `"${user}","${entry.date}","${entry.project}",${duration},"${escapedTask}"\n`;
      });
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ChronoTrack_RawExport_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Raw logs exported successfully to CSV format!');
    logAudit('Admin', 'Exported company-wide timesheet records to CSV');
  };

  // DB Simulator Runner
  useEffect(() => {
    let interval;
    if (simRunning) {
      let step = 0;
      interval = setInterval(() => {
        step++;
        // Simulate progressive loading ramp-up of users logging in at 5:00 PM
        const randUsers = Math.min(1600, Math.floor(Math.sin(step / 3) * 800 + 850 + Math.random() * 80));
        const randQps = Math.floor(randUsers * 0.22 + Math.random() * 20);
        const randLatency = Math.floor(12 + (randQps > 300 ? (randQps - 300) * 0.3 : 0) + Math.random() * 4);
        
        setSimUsers(randUsers);
        setSimQps(randQps);
        setSimLatency(randLatency);

        setSimHistory(prev => {
          const updated = [...prev, { time: step, users: randUsers, qps: randQps, latency: randLatency }];
          if (updated.length > 15) updated.shift();
          return updated;
        });

        if (step >= 20) {
          setSimRunning(false);
          setSimUsers(0);
          setSimQps(0);
          setSimLatency(15);
          showToast('5:00 PM Rush load simulation completed. System remained responsive!', 'success');
          logAudit('Database Auditor', 'Scale performance test successfully completed: 0% data failures, 1600 users max');
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [simRunning]);

  const handleStartDbSim = () => {
    setSimRunning(true);
    setSimHistory([]);
    logAudit('Database Auditor', 'Initiated 5:00 PM Concurrent Logins stress-simulation');
  };

  // Compute stats based on current local state of logs
  const calculateOverviewStats = () => {
    let totalHrs = 0;
    const projectAgg = { 'Project A': 0, 'Project B': 0, 'Project C': 0 };

    Object.keys(logs).forEach(user => {
      logs[user].forEach(entry => {
        const entryHrs = entry.hours + (entry.mins / 60);
        totalHrs += entryHrs;
        if (projectAgg[entry.project] !== undefined) {
          projectAgg[entry.project] += entryHrs;
        }
      });
    });

    const projectData = PROJECTS.map(p => ({
      name: p.id,
      actualHours: parseFloat(projectAgg[p.id].toFixed(1)),
      budgetHours: p.budget,
      color: p.color,
      rate: p.rate,
      cost: parseFloat((projectAgg[p.id] * p.rate).toFixed(0))
    }));

    return {
      totalHours: parseFloat(totalHrs.toFixed(1)),
      projectData,
    };
  };

  const currentStats = calculateOverviewStats();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 flex items-center space-x-3 px-4 py-3 rounded-lg shadow-lg border transition-all duration-300 transform translate-y-0 ${
          toast.type === 'error' 
            ? 'bg-rose-50 border-rose-200 text-rose-800' 
            : toast.type === 'info'
            ? 'bg-sky-50 border-sky-200 text-sky-800'
            : 'bg-emerald-50 border-emerald-200 text-emerald-800'
        }`}>
          {toast.type === 'error' ? (
            <XCircle className="w-5 h-5 text-rose-500" />
          ) : toast.type === 'info' ? (
            <AlertCircle className="w-5 h-5 text-sky-500" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
        </div>
      )}

      {/* Main SaaS Top Bar */}
      <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center shadow-md shadow-blue-500/20">
                <Clock className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">ChronoTrack</span>
                <span className="ml-2 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider">Enterprise Sandbox</span>
              </div>
            </div>

            {/* Portal Switchers */}
            <div className="hidden md:flex space-x-2 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
              <button
                onClick={() => setActivePortal('roadmap')}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  activePortal === 'roadmap'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                1. Product Roadmap (MVP vs FVP)
              </button>
              <button
                onClick={() => {
                  setActivePortal('prototype');
                  setActiveTab('company');
                }}
                className={`px-4 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all ${
                  activePortal === 'prototype'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700'
                }`}
              >
                2. Interactive Prototype
              </button>
            </div>

            {/* Selected User Indicator */}
            <div className="flex items-center space-x-3">
              {activePortal === 'prototype' && (
                <div className="flex items-center space-x-2 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                  <span className="text-xs text-slate-400 font-medium">Logged as:</span>
                  <select 
                    value={selectedUser.name} 
                    onChange={(e) => {
                      const userObj = INITIAL_USERS.find(u => u.name === e.target.value);
                      setSelectedUser(userObj);
                      showToast(`Switched active user profile to ${userObj.name}`, 'info');
                    }}
                    className="bg-transparent text-xs text-blue-400 font-bold border-none outline-none focus:ring-0 cursor-pointer"
                  >
                    {INITIAL_USERS.map(u => (
                      <option key={u.name} value={u.name} className="bg-slate-850 text-slate-900">{u.name} ({u.dept})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="text-xs text-slate-400 font-medium border-l border-slate-700 pl-3 hidden sm:block">
                v1.2 (MVP-beta)
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Portal Navigation */}
      <div className="md:hidden flex border-b border-slate-200 bg-white p-2 sticky top-16 z-30">
        <button
          onClick={() => setActivePortal('roadmap')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${
            activePortal === 'roadmap' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Roadmap & Tech
        </button>
        <button
          onClick={() => setActivePortal('prototype')}
          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg ${
            activePortal === 'prototype' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Prototype Sandbox
        </button>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* ========================================================= */}
        {/* PORTAL SECTION A: ROADMAP & STRATEGIC PLANNING            */}
        {/* ========================================================= */}
        {activePortal === 'roadmap' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header info card */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-2xl shadow-xl border border-slate-800">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 max-w-3xl">
                  <span className="px-3 py-1 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider">Strategic Roadmap</span>
                  <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading">
                    ChronoTrack: Product Scaling & Architecture
                  </h1>
                  <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                    A multi-phase plan to deploy time-tracking and predictive analytics for <strong className="text-white">1,600 employees</strong>. 
                    Explore the evolution from an adoption-focused MVP (Weeks 8–12) to an automated, insights-driven FVP (Months 6–9).
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button 
                    onClick={() => {
                      setActivePortal('prototype');
                      setActiveTab('company');
                    }}
                    className="flex items-center px-5 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-500 font-bold text-sm shadow-lg shadow-blue-500/25 transition-all group"
                  >
                    Launch Prototype Sandbox
                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              
              {/* Internal roadmap submenu */}
              <div className="flex border-t border-slate-800/80 mt-8 pt-4 overflow-x-auto gap-2">
                {[
                  { id: 'overview', label: 'Roadmap Overview', icon: FileText },
                  { id: 'comparison', label: 'Feature Breakdown (MVP vs FVP)', icon: BarChart3 },
                  { id: 'architecture', label: 'Architecture Evolution', icon: Database },
                  { id: 'metrics', label: 'Success Metrics & Simulator', icon: TrendingUp }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setRoadmapSubTab(tab.id)}
                    className={`flex items-center whitespace-nowrap px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                      roadmapSubTab === tab.id
                        ? 'bg-slate-800 text-white border border-slate-700'
                        : 'text-slate-400 hover:text-white hover:bg-slate-850'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5 mr-2" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* TAB CONTENT: Overview */}
            {roadmapSubTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-slide-in-bottom">
                {/* Phase 1: MVP */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-8 -mt-8"></div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold uppercase border border-blue-100">Phase 1: MVP</span>
                    <span className="text-slate-500 text-xs font-medium flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> 8 - 12 Weeks (Beta rollout)
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 font-heading">Capturing the Data Core</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Stabilize the data collection loop and solve the core headache: getting employees to log timesheets easily and getting basic manager rolls.
                    </p>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key MVP Scope:</h4>
                    <ul className="space-y-2.5 text-slate-700 text-sm">
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>SSO Authenticated Users:</strong> Google Workspace / Entra integration.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Manual Log Form:</strong> Simple end-of-day input (date, project, task description, duration).</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Core Dashboard:</strong> Weekly timesheet tables for Managers & Daily Timeline lists for Employees.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-blue-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Admin Data Export:</strong> One-click CSV/Excel export for complex offline payroll accounting.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                    <span className="text-slate-400">🚫 Excludes Live timers & Slack bots</span>
                    <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">Beta: ~100 engineers</span>
                  </div>
                </div>

                {/* Phase 2: FVP */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-6 relative overflow-hidden transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full -mr-8 -mt-8"></div>
                  <div className="flex items-center justify-between">
                    <span className="px-3 py-1 rounded-full bg-violet-50 text-violet-700 text-xs font-bold uppercase border border-violet-100">Phase 2: FVP</span>
                    <span className="text-slate-500 text-xs font-medium flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" /> 6 - 9 Months (Iterative releases)
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold text-slate-900 font-heading">Frictionless Automation & Insights</h3>
                    <p className="text-slate-500 text-sm mt-1">
                      Convert ChronoTrack from a daily manual chore into an automated, predictive telemetry platform that eliminates time leaks and risk.
                    </p>
                  </div>
                  <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Key FVP Scope:</h4>
                    <ul className="space-y-2.5 text-slate-700 text-sm">
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-violet-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Frictionless Capture:</strong> Live desktop widgets, Google/Outlook Calendar smart suggestion logic, IDE integrations.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-violet-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Approval Workflows:</strong> Weekly timesheet manager portal & auto-nudge Slack notification bots.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-violet-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Deep Analytics:</strong> Real-time budget burn-down alarms, rate-based internal cost crunchers, utilization capacity heatmaps.</span>
                      </li>
                      <li className="flex items-start">
                        <CheckCircle2 className="w-4 h-4 text-violet-500 mr-2 mt-0.5 shrink-0" />
                        <span><strong>Enterprise Audit:</strong> Immutable audit logs of time revisions and monthly financial lock-out dates.</span>
                      </li>
                    </ul>
                  </div>
                  <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs">
                    <span className="text-slate-400">✨ Powered by Redis caching & Data Warehouses</span>
                    <span className="font-semibold text-violet-600 bg-violet-50 px-2 py-1 rounded">Scale: 1,600 users</span>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Feature Breakdown Table */}
            {roadmapSubTab === 'comparison' && (
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-slide-in-bottom">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="text-lg font-bold text-slate-900 font-heading">ChronoTrack Feature Comparison</h3>
                  <p className="text-sm text-slate-500">How the feature sets evolve to solve scaling and administrative challenges.</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 text-slate-600 font-bold text-xs uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-4">Capability Area</th>
                        <th className="px-6 py-4">Phase 1: MVP Solution</th>
                        <th className="px-6 py-4">Phase 2: FVP Automation</th>
                        <th className="px-6 py-4 text-right">Strategic Impact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">User Setup & Auth</td>
                        <td className="px-6 py-4 text-slate-600">
                          Single Sign-On (Google / Microsoft Entra) mapping to three basic roles (Employee, Manager, Global Admin).
                        </td>
                        <td className="px-6 py-4 text-violet-700 font-medium">
                          SSO + Org-chart synchronization. Dynamic manager assignment based on active projects.
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Zero password bloat</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">Time Logging</td>
                        <td className="px-6 py-4 text-slate-600 font-medium">
                          Manual "Time Block" log form at end of day. Includes Date, Project, Task, Duration.
                        </td>
                        <td className="px-6 py-4 text-violet-700 font-medium">
                          Smart calendar suggestion cards, live stopwatches, GitHub/Jira commit hook telemetry.
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Reduces logging friction by 70%</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">Workflows & Approvals</td>
                        <td className="px-6 py-4 text-slate-600">
                          None. Open data pipeline directly to DB with no manager verification gates.
                        </td>
                        <td className="px-6 py-4 text-violet-700 font-medium">
                          Weekly Timesheet submission, manager dashboards for quick approvals, Slack reminders.
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Financial audits & payroll readiness</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">Analytics & Insights</td>
                        <td className="px-6 py-4 text-slate-600">
                          Weekly totals per project. Daily lists. Basic pie/bar ratios of hours.
                        </td>
                        <td className="px-6 py-4 text-violet-700 font-medium">
                          Budget burn forecasts (actual vs budgeted), internal cost metrics, team burn-out heatmaps.
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Under/overutilization visibility</td>
                      </tr>
                      <tr>
                        <td className="px-6 py-4 font-bold text-slate-900">Compliance & Controls</td>
                        <td className="px-6 py-4 text-slate-600 text-xs">
                          Ad-hoc database corrections by administrators.
                        </td>
                        <td className="px-6 py-4 text-violet-700 font-medium">
                          Complete audit trails of all time revisions, monthly database lockout dates post-close.
                        </td>
                        <td className="px-6 py-4 text-right text-xs font-semibold text-slate-500">Regulatory compliance (DCAA)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Architecture Evolution Diagram */}
            {roadmapSubTab === 'architecture' && (
              <ArchitectureVisualizer />
            )}

            {/* TAB CONTENT: Success Metrics & DB Simulator */}
            {roadmapSubTab === 'metrics' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-in-bottom">
                
                {/* Metric Gauges */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 font-heading mb-1">MVP Success Metrics</h3>
                    <p className="text-xs text-slate-500 mb-6">Critical goals to prove viability before starting Phase 2 investment.</p>
                    
                    <div className="space-y-6">
                      {/* Metric 1 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-800">1. Weekly Adoption Rate</span>
                          <span className="font-bold text-blue-600">85% Current <span className="text-slate-400 font-normal">/ 80% Target</span></span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-blue-600 h-full rounded-full" style={{ width: '85%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400">Measured by checking unique active employee logins vs. total department roster weekly.</p>
                      </div>

                      {/* Metric 2 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-800">2. Timesheet Correction Rate</span>
                          <span className="font-bold text-emerald-600">2.4% Current <span className="text-slate-400 font-normal">/ &lt;5% Target</span></span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          {/* Lower is better, so color is green when low */}
                          <div className="bg-emerald-500 h-full rounded-full" style={{ width: '95%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400">Percentage of logged hours that require edits by project managers during monthly close.</p>
                      </div>

                      {/* Metric 3 */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-semibold text-slate-800">3. 5:00 PM Concurrent Peak Load</span>
                          <span className="font-bold text-indigo-600">1,600 Users <span className="text-slate-400 font-normal">/ 1,600 Target</span></span>
                        </div>
                        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div className="bg-indigo-600 h-full rounded-full" style={{ width: '100%' }}></div>
                        </div>
                        <p className="text-xs text-slate-400">Database capability to handle all employees logging hours simultaneously at the end of their shift.</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/60 rounded-xl p-5 flex items-start space-x-4">
                    <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-blue-800">Beta Rollout Strategy</h4>
                      <p className="text-xs text-blue-700 leading-relaxed">
                        Rather than forcing 1,600 people into a complex system on Day 1, we will test the MVP with a single pilot department (Engineering, ~100 people). We will gather feedback on the logging form speed, optimize the schema indexes for the 5:00 PM rush, and only then roll out company-wide.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Interactive DB Simulator */}
                <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-6 shadow-xl space-y-6 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Database className="w-5 h-5 text-indigo-400" />
                      <h3 className="text-base font-bold font-heading">5:00 PM Peak Load Simulator</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Simulate 1,600 employees simultaneously hitting the Node.js / PostgreSQL AWS RDS database to log hours. Test latency and response times.
                    </p>
                  </div>

                  {simRunning ? (
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
                      <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
                        <span className="flex items-center text-yellow-400">
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          Simulating Peak...
                        </span>
                        <span className="text-slate-400">Step {simHistory.length}/20</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center bg-slate-900 p-2.5 rounded border border-slate-800/80">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">Concur. Users</span>
                          <span className="text-lg font-bold text-white">{simUsers}</span>
                        </div>
                        <div className="text-center bg-slate-900 p-2.5 rounded border border-slate-800/80">
                          <span className="block text-[10px] text-slate-500 uppercase tracking-wider font-bold">QPS Peak</span>
                          <span className="text-lg font-bold text-white">{simQps}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] text-slate-400">
                          <span>DB Latency</span>
                          <span className={`${simLatency > 35 ? 'text-amber-400' : 'text-emerald-400'}`}>{simLatency} ms</span>
                        </div>
                        <div className="w-full bg-slate-800 h-2 rounded overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${simLatency > 35 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${Math.min(100, (simLatency / 50) * 100)}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950 p-6 rounded-xl border border-slate-800/60 text-center space-y-3">
                      <span className="text-3xl">⏱️</span>
                      <h4 className="text-xs font-bold text-slate-300">Database Idle State</h4>
                      <p className="text-[11px] text-slate-500">Ready to initiate connection pool stress test.</p>
                    </div>
                  )}

                  {/* Tiny Line chart showing performance graph */}
                  {simHistory.length > 0 && (
                    <div className="h-24 bg-slate-950/80 p-2 rounded-lg border border-slate-800/50">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={simHistory}>
                          <Line type="monotone" dataKey="qps" stroke="#8b5cf6" strokeWidth={1.5} dot={false} name="QPS" />
                          <Line type="monotone" dataKey="latency" stroke="#10b981" strokeWidth={1.5} dot={false} name="Latency (ms)" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <button
                    onClick={handleStartDbSim}
                    disabled={simRunning}
                    className="w-full py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
                  >
                    {simRunning ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Running Stress Simulator...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5" />
                        <span>Trigger 5:00 PM Rush Simulation</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>
        )}

        {/* ========================================================= */}
        {/* PORTAL SECTION B: INTERACTIVE PROTOTYPE                   */}
        {/* ========================================================= */}
        {activePortal === 'prototype' && (
          <div className="space-y-8 animate-fade-in">
            {/* Header and Sub tabs */}
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-950 font-heading">ChronoTrack Sandbox</h1>
                <p className="text-slate-500 text-sm mt-0.5">Explore the time-logging interface and try Phase 2 features (suggestions, live timers, locks).</p>
              </div>
              
              <div className="flex bg-slate-200/70 p-1 rounded-lg self-start sm:self-auto border border-slate-350">
                <button
                  onClick={() => setActiveTab('company')}
                  className={`flex items-center px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'company' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5 mr-1.5" />
                  Company Analytics
                </button>
                <button
                  onClick={() => setActiveTab('employee')}
                  className={`flex items-center px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'employee' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  Employee Portal
                </button>
                <button
                  onClick={() => setActiveTab('workflows')}
                  className={`flex items-center px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                    activeTab === 'workflows' 
                      ? 'bg-white text-blue-700 shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  <Settings className="w-3.5 h-3.5 mr-1.5" />
                  Manager / Admin
                </button>
              </div>
            </div>

            {/* TAB: Company Analytics */}
            {activeTab === 'company' && (
              <div className="space-y-6 animate-slide-in-bottom">
                
                {/* Stats Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-blue-50 text-blue-600">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Active Employees</p>
                      <h3 className="text-2xl font-extrabold text-slate-900">1,600</h3>
                      <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">1,542 Active Today (96%)</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-purple-50 text-purple-600">
                      <Briefcase className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tracked Projects</p>
                      <h3 className="text-2xl font-extrabold text-slate-900">3</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">A, B, and C in progress</p>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600">
                      <Activity className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Logged Hours (This Week)</p>
                      <h3 className="text-2xl font-extrabold text-slate-900">{currentStats.totalHours} hrs</h3>
                      <span className="text-[11px] text-slate-400 mt-0.5 flex items-center">
                        <Sparkles className="w-3 h-3 text-amber-500 mr-1" /> Dynamic sandbox recalculation
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  
                  {/* Chart 1: Project Allocation actual vs budget */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">Project Time Allocations</h3>
                      <p className="text-xs text-slate-500">Comparison of actual logged hours vs. project allocations.</p>
                    </div>
                    
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={currentStats.projectData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                          <RechartsTooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' }}
                          />
                          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="actualHours" name="Actual Hours Spent" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="budgetHours" name="Budget Hours Allocated" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Role Distribution */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">Department Role Distribution</h3>
                      <p className="text-xs text-slate-500">Allocation breakdown by work specialization.</p>
                    </div>
                    
                    <div className="h-72 flex flex-col justify-between">
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={ROLES}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {ROLES.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <RechartsTooltip 
                              formatter={(value) => `${value}%`}
                              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                </div>

                {/* FVP Showcase: Deep Analytics (Internal Cost Analysis & Heatmap) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Cost analysis */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px] uppercase tracking-wider">FVP Insight</span>
                        <h3 className="text-base font-bold text-slate-900 font-heading mt-1">Project Cost Ledger</h3>
                        <p className="text-xs text-slate-500">Multiplying actual logged hours by role-based billing rates.</p>
                      </div>
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">Real-Time Costing</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase">
                          <tr>
                            <th className="px-4 py-3">Project Name</th>
                            <th className="px-4 py-3">Total Hours Logged</th>
                            <th className="px-4 py-3">Estimated Rate (Avg)</th>
                            <th className="px-4 py-3 text-right">Calculated Internal Cost</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {currentStats.projectData.map(proj => (
                            <tr key={proj.name} className="hover:bg-slate-50">
                              <td className="px-4 py-3 font-bold text-slate-800 flex items-center">
                                <span className={`w-2 h-2 rounded-full mr-2`} style={{ backgroundColor: proj.color }}></span>
                                {proj.name}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">{proj.actualHours} hrs</td>
                              <td className="px-4 py-3 text-slate-500">${proj.rate}/hr</td>
                              <td className="px-4 py-3 text-right font-bold text-slate-900">${(proj.actualHours * proj.rate).toLocaleString(undefined, {maximumFractionDigits: 0})}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold">
                            <td className="px-4 py-3 text-slate-900">Total Calculated Cost</td>
                            <td className="px-4 py-3 text-slate-900">{currentStats.totalHours} hrs</td>
                            <td className="px-4 py-3 text-slate-400">-</td>
                            <td className="px-4 py-3 text-right text-blue-700 text-sm">
                              ${currentStats.projectData.reduce((sum, p) => sum + (p.actualHours * p.rate), 0).toLocaleString(undefined, {maximumFractionDigits: 0})}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Utilization Heatmap */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div>
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px] uppercase tracking-wider">FVP Insight</span>
                      <h3 className="text-base font-bold text-slate-900 font-heading mt-1">Utilization & Burnout Risk</h3>
                      <p className="text-xs text-slate-500">Weekly allocation capacity checks.</p>
                    </div>

                    <div className="space-y-3 pt-2">
                      {[
                        { name: 'Sarah Jenkins', hours: 38.5, capacity: 40, status: 'Optimal', color: 'bg-emerald-500' },
                        { name: 'John Doe', hours: 44.0, capacity: 40, status: 'Over Capacity (Burnout)', color: 'bg-rose-500' },
                        { name: 'Alex Rivera', hours: 32.5, capacity: 40, status: 'Under-utilized', color: 'bg-amber-400' },
                        { name: 'Emily Chen', hours: 39.0, capacity: 40, status: 'Optimal', color: 'bg-emerald-500' },
                      ].map(user => {
                        const pct = Math.min(100, (user.hours / user.capacity) * 100);
                        return (
                          <div key={user.name} className="space-y-1">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-800">{user.name}</span>
                              <span className="text-slate-500">{user.hours}h / {user.capacity}h</span>
                            </div>
                            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${user.color}`} style={{ width: `${pct}%` }}></div>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-slate-400">Weekly Capacity</span>
                              <span className="font-semibold text-slate-600">{user.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: Employee Portal */}
            {activeTab === 'employee' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-in-bottom">
                
                {/* Time entry and smart suggestions */}
                <div className="lg:col-span-2 space-y-6">
                  
                  {/* Daily visual timeline */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-heading">Sarah's Daily Breakdown</h3>
                        <p className="text-xs text-slate-500">Current visual distribution of today's logged intervals.</p>
                      </div>
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        {logs[selectedUser.name] ? logs[selectedUser.name].reduce((sum, l) => sum + l.hours + (l.mins/60), 0) : 0} hrs total
                      </span>
                    </div>

                    {/* Timeline bar */}
                    {logs[selectedUser.name] && logs[selectedUser.name].length > 0 ? (
                      <div>
                        <div className="w-full h-10 bg-slate-100 rounded-lg flex overflow-hidden border border-slate-200">
                          {logs[selectedUser.name].map((log) => {
                            const totalHours = logs[selectedUser.name].reduce((sum, l) => sum + l.hours + (l.mins/60), 0);
                            const widthPercentage = ((log.hours + (log.mins / 60)) / totalHours) * 100;
                            return (
                              <div 
                                key={log.id}
                                className={`${log.bgColor} h-full flex items-center justify-center text-[10px] font-bold text-white transition-all hover:brightness-95 cursor-help border-r border-white/20 last:border-r-0`}
                                style={{ width: `${widthPercentage}%` }}
                                title={`${log.project}: ${log.hours}h ${log.mins}m - ${log.task}`}
                              >
                                {widthPercentage > 12 ? `${log.project} (${log.hours}h)` : `${log.hours}h`}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-3">
                          {Array.from(new Set(logs[selectedUser.name].map(l => l.project))).map(projId => {
                            const projObj = PROJECTS.find(p => p.id === projId);
                            const color = projObj ? projObj.color : '#64748b';
                            return (
                              <span key={projId} className="flex items-center">
                                <span className="w-2.5 h-2.5 rounded-full mr-1.5" style={{ backgroundColor: color }}></span>
                                {projId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 text-center py-6 rounded-lg text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                        No time blocks logged for today. Use the logging form or smart suggestion cards below.
                      </div>
                    )}
                  </div>

                  {/* Manual Data Entry Form */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2">
                      <div className="p-1 rounded bg-blue-50 text-blue-600">
                        <Plus className="w-4 h-4" />
                      </div>
                      <h3 className="text-base font-bold text-slate-900 font-heading">Log a Time Block</h3>
                    </div>

                    <form onSubmit={handleAddLog} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Date</label>
                          <input 
                            type="date" 
                            value={formDate}
                            onChange={(e) => setFormDate(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Project dropdown</label>
                          <select 
                            value={formProject}
                            onChange={(e) => setFormProject(e.target.value)}
                            className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                          >
                            {PROJECTS.map(p => (
                              <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Duration (Hrs / Mins)</label>
                          <div className="flex space-x-2">
                            <input 
                              type="number" 
                              min="0"
                              max="24"
                              value={formHours}
                              onChange={(e) => setFormHours(e.target.value)}
                              placeholder="Hrs" 
                              className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center outline-none focus:border-blue-500"
                            />
                            <select
                              value={formMins}
                              onChange={(e) => setFormMins(e.target.value)}
                              className="w-1/2 text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-center outline-none focus:border-blue-500"
                            >
                              <option value="0">00m</option>
                              <option value="15">15m</option>
                              <option value="30">30m</option>
                              <option value="45">45m</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Task Description</label>
                        <input 
                          type="text" 
                          placeholder="What did you work on? (e.g. fixed login routing error)" 
                          value={formTask}
                          onChange={(e) => setFormTask(e.target.value)}
                          className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none focus:border-blue-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 flex items-center justify-center space-x-2 shadow-sm transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Log Time Block</span>
                      </button>
                    </form>
                  </div>

                  {/* Log list table */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <h3 className="text-base font-bold text-slate-900 font-heading">Today's Timesheet Records</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                          <tr>
                            <th className="px-4 py-3">Logged Interval</th>
                            <th className="px-4 py-3">Duration</th>
                            <th className="px-4 py-3">Project</th>
                            <th className="px-4 py-3">Task Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {logs[selectedUser.name] && logs[selectedUser.name].map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="px-4 py-3 font-semibold text-slate-700">{log.start} - {log.end}</td>
                              <td className="px-4 py-3 font-bold text-slate-900">{log.hours}h {log.mins > 0 ? `${log.mins}m` : ''}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${log.bgColor} text-white`}>
                                  {log.project}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-600">{log.task}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

                {/* Sidebar Widget (Live Timer and Calendar suggestions) */}
                <div className="space-y-6">
                  
                  {/* FVP Showcase: Live Stopwatch Timer */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
                        <h3 className="text-sm font-bold text-slate-900 font-heading">Live Stopwatches</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[9px] uppercase tracking-wider">FVP Beta</span>
                    </div>

                    <div className="bg-slate-900 text-white rounded-lg p-4 text-center space-y-3 border border-slate-800">
                      <div className="font-mono text-3xl font-extrabold tracking-widest text-slate-200">
                        {formatTime(timerSeconds)}
                      </div>
                      
                      <div className="flex justify-center space-x-2">
                        <select
                          value={timerProject}
                          onChange={(e) => setTimerProject(e.target.value)}
                          className="bg-slate-800 text-[10px] text-slate-300 font-bold rounded border border-slate-700 p-1 outline-none"
                        >
                          {PROJECTS.map(p => (
                            <option key={p.id} value={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex justify-center space-x-3 pt-2">
                        <button
                          onClick={handleStartStopTimer}
                          className={`px-4 py-1.5 rounded text-xs font-bold flex items-center space-x-1.5 transition-all ${
                            timerRunning 
                              ? 'bg-amber-600 hover:bg-amber-500 text-white' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          }`}
                        >
                          {timerRunning ? (
                            <>
                              <Pause className="w-3.5 h-3.5" />
                              <span>Stop & Capture</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5" />
                              <span>Start Timer</span>
                            </>
                          )}
                        </button>

                        <button 
                          onClick={handleResetTimer}
                          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-750 text-xs font-medium text-slate-400"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                      Start tracking a task in real-time. Pausing or stopping the widget automatically fills your entry log inputs below.
                    </p>
                  </div>

                  {/* FVP Showcase: Smart Suggestion Integrations */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 font-heading">Smart Suggestions</h3>
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[9px] uppercase tracking-wider">FVP Beta</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      ChronoTrack detects meetings from your Google Calendar, Figma edits, and GitHub commits to prompt easy imports.
                    </p>

                    <div className="space-y-3">
                      {calendarSuggestions.length > 0 ? (
                        calendarSuggestions.map(suggestion => (
                          <div 
                            key={suggestion.id} 
                            className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2 relative transition-all hover:bg-slate-100/60"
                          >
                            <div className="flex items-center justify-between">
                              <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold">
                                {suggestion.project}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold">{suggestion.hours}h {suggestion.mins > 0 ? `${suggestion.mins}m` : ''}</span>
                            </div>
                            
                            <p className="text-xs font-semibold text-slate-800 leading-snug">{suggestion.task}</p>
                            
                            <button
                              onClick={() => handleImportSuggestion(suggestion)}
                              className="w-full mt-1.5 py-1.5 bg-blue-50 border border-blue-100 hover:bg-blue-100 text-blue-700 font-bold text-[10px] rounded-lg transition-colors flex items-center justify-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Log this suggestion</span>
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="bg-slate-50 text-center py-6 rounded-lg text-xs text-slate-400 font-medium border border-dashed border-slate-200">
                          ✨ All suggestions reviewed!
                        </div>
                      )}
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB: Manager / Admin controls */}
            {activeTab === 'workflows' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-in-bottom">
                
                {/* Timesheet Approval Digest */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm lg:col-span-2 space-y-6">
                  <div>
                    <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[10px] uppercase tracking-wider">FVP Feature</span>
                    <h3 className="text-lg font-bold text-slate-900 font-heading mt-1">Timesheet Approvals</h3>
                    <p className="text-xs text-slate-500">Weekly manager digest. Approve submitted logs for payroll accounting.</p>
                  </div>

                  <div className="space-y-4">
                    {timesheetApprovals.map(approval => (
                      <div 
                        key={approval.employee} 
                        className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center overflow-hidden border">
                            <img src={INITIAL_USERS.find(u => u.name === approval.employee)?.avatar} alt="Avatar" className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{approval.employee}</h4>
                            <p className="text-[10px] text-slate-400">{approval.role} • {approval.week}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase">Weekly hours</span>
                            <span className="text-sm font-bold text-slate-800">{approval.hours} hrs</span>
                          </div>

                          <div>
                            <span className="block text-[9px] text-slate-400 font-bold uppercase text-center">Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                              approval.status === 'Approved' 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : approval.status === 'Needs Revision'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {approval.status}
                            </span>
                          </div>

                          <div className="flex items-center space-x-2">
                            {approval.status !== 'Approved' && (
                              <button
                                onClick={() => handleApproveTimesheet(approval.employee)}
                                className="p-1.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200"
                                title="Approve Timesheet"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {approval.status === 'Pending' && (
                              <button
                                onClick={() => handleRejectTimesheet(approval.employee)}
                                className="p-1.5 rounded bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200"
                                title="Reject / Ask for revision"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleTriggerSlackNudge(approval.employee, approval.hours)}
                              className="p-1.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200"
                              title="Send Slack Nudge"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Settings & Admin Utilities */}
                <div className="space-y-6">
                  
                  {/* Data Export Card (MVP Fallback) */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      <h3 className="text-sm font-bold text-slate-900 font-heading">MVP Data Export</h3>
                    </div>
                    <p className="text-xs text-slate-400">
                      Global Admin tool. Exports all timesheets in the system directly to a CSV spreadsheet.
                    </p>
                    <button
                      onClick={handleExportCSV}
                      className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-sm"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Download Raw CSV Export</span>
                    </button>
                  </div>

                  {/* FVP Showcase: Audit & Control Lock Dates */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {lockDatesEnabled ? <Lock className="w-5 h-5 text-amber-600" /> : <Unlock className="w-5 h-5 text-slate-450" />}
                        <h3 className="text-sm font-bold text-slate-900 font-heading">Lock Dates Control</h3>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[9px] uppercase tracking-wider">FVP Security</span>
                    </div>

                    <p className="text-xs text-slate-400">
                      Prevent editing or adding time entries in past billing cycles. Toggle to test database constraint checks.
                    </p>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <span className="text-xs font-semibold text-slate-700">Lock previous months</span>
                      <button
                        onClick={() => {
                          setLockDatesEnabled(!lockDatesEnabled);
                          showToast(lockDatesEnabled ? 'Database lock dates disabled' : 'Database lock dates enabled. May 2026 is locked.', 'info');
                          logAudit('Admin', `Lock dates toggled to ${!lockDatesEnabled}`);
                        }}
                        className={`w-11 h-6 rounded-full transition-all duration-300 relative ${
                          lockDatesEnabled ? 'bg-amber-600' : 'bg-slate-300'
                        }`}
                      >
                        <span className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                          lockDatesEnabled ? 'left-6' : 'left-1'
                        }`}></span>
                      </button>
                    </div>
                  </div>

                  {/* Audit Logs Trail */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900 font-heading">System Audit Logs</h3>
                      <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-700 font-bold text-[9px] uppercase tracking-wider">FVP Audit</span>
                    </div>

                    <div className="h-44 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
                      {auditLogs.map(log => (
                        <div key={log.id} className="text-[10px] text-slate-600 border-l border-slate-200 pl-2 leading-relaxed">
                          <span className="text-slate-400 font-medium">[{log.time}]</span>{' '}
                          <strong className="text-slate-800">{log.user}:</strong> {log.action}
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

              </div>
            )}

          </div>
        )}

      </main>
      
      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-450 gap-4">
          <div>
            <strong>ChronoTrack Scaling & Telemetry Platform</strong> • Designed for 1,600 Employees.
          </div>
          <div className="flex space-x-6">
            <button onClick={() => setActivePortal('roadmap')} className="hover:text-slate-700 font-medium">Roadmap Plan</button>
            <button onClick={() => { setActivePortal('prototype'); setActiveTab('company'); }} className="hover:text-slate-700 font-medium">Analytics Sandbox</button>
            <button onClick={() => { setActivePortal('prototype'); setActiveTab('employee'); }} className="hover:text-slate-700 font-medium">Employee Portal</button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Sub-Component: Architecture Evolution Visualizer (using clean React layout with detailed cards)
function ArchitectureVisualizer() {
  const [archTab, setArchTab] = useState('mvp'); // 'mvp' or 'fvp'

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm space-y-6 animate-slide-in-bottom">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 font-heading">Database & System Architecture</h3>
          <p className="text-xs text-slate-500">Interactive diagram showing how our infrastructure scales from MVP to FVP workloads.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-250">
          <button
            onClick={() => setArchTab('mvp')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              archTab === 'mvp'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Phase 1 (MVP): Speed & Stability
          </button>
          <button
            onClick={() => setArchTab('fvp')}
            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
              archTab === 'fvp'
                ? 'bg-violet-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Phase 2 (FVP): Scale & Analytics
          </button>
        </div>
      </div>

      {/* Render Architecture Layout */}
      {archTab === 'mvp' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
            
            {/* Frontend */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">Client Layer</span>
              <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">React.js / Next.js</h4>
              <p className="text-[11px] text-slate-500">Hosted on Vercel/Netlify. Highly responsive web-app, serving managers & employees.</p>
            </div>

            {/* Backend */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">API Server</span>
              <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <Settings className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Node.js Express / NestJS</h4>
              <p className="text-[11px] text-slate-500">Simple monolithic REST API. Serves authentication, data entry, and basic dashboard queries.</p>
            </div>

            {/* Database */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-bold rounded">Relational DB</span>
              <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">PostgreSQL (AWS RDS)</h4>
              <p className="text-[11px] text-slate-500">Structured tables for users, roles, projects, and timesheet blocks. Indexed for rapid daily write loops.</p>
            </div>

          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-600">MVP Performance Thresholds:</span>
            <span className="text-slate-500">Handles 5:00 PM rush via AWS RDS replica configuration.</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded">Stable for ~200 QPS</span>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
            
            {/* UI/Widgets */}
            <div className="bg-slate-50 border border-violet-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold rounded">Interface Clients</span>
              <div className="w-10 h-10 bg-violet-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Widgets & Integrations</h4>
              <p className="text-[11px] text-slate-500">Next.js UI plus menu-bar desktop widget timers, Slack notification bots, and IDE plugins.</p>
            </div>

            {/* Cache Layer */}
            <div className="bg-slate-50 border border-violet-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold rounded">Caching Tier</span>
              <div className="w-10 h-10 bg-violet-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <RefreshCw className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Redis In-Memory</h4>
              <p className="text-[11px] text-slate-500">Caches employee stats and daily dashboards to unload the main database during high morning and evening traffic spikes.</p>
            </div>

            {/* Microservices */}
            <div className="bg-slate-50 border border-violet-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold rounded">Core Engines</span>
              <div className="w-10 h-10 bg-violet-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <Settings className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Decoupled Microservices</h4>
              <p className="text-[11px] text-slate-500">Isolated servers handle heavy heavy operations: (1) Slack Reminder Scheduler, (2) Deep Analytics Compiler.</p>
            </div>

            {/* Data Warehousing */}
            <div className="bg-slate-50 border border-violet-200 rounded-xl p-5 text-center space-y-3 relative">
              <span className="absolute -top-3 left-4 px-2 py-0.5 bg-violet-100 text-violet-700 text-[9px] font-bold rounded">Big Data Ledger</span>
              <div className="w-10 h-10 bg-violet-500 text-white rounded-lg flex items-center justify-center mx-auto shadow">
                <Database className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Snowflake / BigQuery</h4>
              <p className="text-[11px] text-slate-500">Historical database. Real-time events pipe timesheet modifications into storage for large analytics reports.</p>
            </div>

          </div>

          <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center justify-between text-xs">
            <span className="font-semibold text-violet-700">FVP Scalability Metrics:</span>
            <span className="text-violet-650">Redis absorbs 90% of read queries. Big data reports loaded asynchronously.</span>
            <span className="text-violet-700 font-bold bg-violet-100 px-2 py-0.5 rounded">Enterprise-ready for 1,600+ users</span>
          </div>
        </div>
      )}
    </div>
  );
}
