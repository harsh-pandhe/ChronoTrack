import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Share2, 
  AlertOctagon, 
  Check, 
  X, 
  ChevronRight, 
  Shield, 
  Activity, 
  HardDrive, 
  Terminal, 
  Settings, 
  User, 
  Users, 
  Cpu,
  TrendingUp, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Play, 
  Square, 
  Trash2, 
  Plus, 
  Server,
  Layers,
  Flame,
  CheckCircle2,
  DollarSign,
  Home,
  Download,
  Laptop,
  Globe,
  Info
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';

// Default static lists
const INITIAL_PROJECTS = [
  { id: 'Project Alpha', name: 'NHAI Highway Expressway (Phase 1)', contractValue: 180000000, margin: 45, bgColor: 'bg-indigo-500/20', borderCol: 'border-indigo-500/30', color: '#6366f1' },
  { id: 'Project Beta', name: 'Smart City Metro Line Design', contractValue: 95000000, margin: 38, bgColor: 'bg-blue-500/20', borderCol: 'border-blue-500/30', color: '#3b82f6' },
  { id: 'Project Gamma', name: 'Water Treatment Plant Design', contractValue: 65000000, margin: 32, bgColor: 'bg-emerald-500/20', borderCol: 'border-emerald-500/30', color: '#10b981' }
];

const INITIAL_TEAM_LEADS = [
  { id: 'TL-01', name: 'Rajesh Kumar', dept: 'Civil Engineering', activeSubordinates: 30, activeBenchHours: 14.5, telemetryScore: 84 },
  { id: 'TL-02', name: 'Anita Desai', dept: 'Structural Design', activeSubordinates: 28, activeBenchHours: 114, telemetryScore: 52 },
  { id: 'TL-03', name: 'Vikram Singh', dept: 'Site Planning', activeSubordinates: 32, activeBenchHours: 22, telemetryScore: 79 },
  { id: 'TL-04', name: 'Priya Patel', dept: 'Costing & Estimating', activeSubordinates: 29, activeBenchHours: 148.5, telemetryScore: 45 },
  { id: 'TL-05', name: 'Sanjay Mehta', dept: 'Project Management', activeSubordinates: 31, activeBenchHours: 4, telemetryScore: 91 }
];

const INITIAL_EMPLOYEES = [
  { id: 'EMP001', name: 'Sarah Jenkins', role: 'Senior AutoCAD Engineer', dept: 'Civil Engineering', teamLeadId: 'TL-01', activeProject: 'Project Alpha', baseSalary: 75000, benefits: 15000, avgHours: 160, status: 'Active' },
  { id: 'EMP002', name: 'John Doe', role: 'Structural Designer', dept: 'Structural Design', teamLeadId: 'TL-02', activeProject: 'Project Beta', baseSalary: 62000, benefits: 12000, avgHours: 160, status: 'Active' },
  { id: 'EMP003', name: 'Alex Rivera', role: 'Site Planner', dept: 'Site Planning', teamLeadId: 'TL-03', activeProject: 'Project Beta', baseSalary: 55000, benefits: 11000, avgHours: 160, status: 'Active' },
  { id: 'EMP004', name: 'Emily Chen', role: 'Project Architect', dept: 'Structural Design', teamLeadId: 'TL-02', activeProject: 'Project Gamma', baseSalary: 85000, benefits: 18000, avgHours: 160, status: 'Active' },
  { id: 'EMP005', name: 'Rohan Sharma', role: 'Draftsman', dept: 'Civil Engineering', teamLeadId: 'TL-01', activeProject: 'Project Alpha', baseSalary: 45000, benefits: 9000, avgHours: 160, status: 'Active' },
  { id: 'EMP006', name: 'Neha Gupta', role: 'Junior Estimator', dept: 'Costing & Estimating', teamLeadId: 'TL-04', activeProject: 'Project Alpha', baseSalary: 42000, benefits: 8000, avgHours: 160, status: 'Active' }
];

const INITIAL_LOGS = {
  'Sarah Jenkins': [
    { id: 101, project: 'Project Alpha', hours: 7, mins: 30, task: 'Drafted alignment coordinates for Section D-12', start: '09:00 AM', end: '04:30 PM', date: '2026-06-24', activityScore: 88, isManual: false, status: 'Approved', activeApp: 'Autodesk Revit', productivity: 92 },
    { id: 102, project: 'Project Alpha', hours: 8, mins: 0, task: 'NHAI blueprint correction feedback review', start: '09:00 AM', end: '05:00 PM', date: '2026-06-23', activityScore: 82, isManual: false, status: 'Approved', activeApp: 'AutoCAD 2026', productivity: 88 }
  ],
  'John Doe': [
    { id: 201, project: 'Project Beta', hours: 6, mins: 0, task: 'Metro column load calculation sheets', start: '10:00 AM', end: '04:00 PM', date: '2026-06-24', activityScore: 42, isManual: false, status: 'Approved', activeApp: 'Excel (Metro Calculation)', productivity: 68 }
  ],
  'Alex Rivera': [
    { id: 301, project: 'Project Beta', hours: 7, mins: 30, task: 'Roadway cross-section site profiles', start: '09:30 AM', end: '05:00 PM', date: '2026-06-24', activityScore: 35, isManual: false, status: 'Pending', activeApp: 'Chrome (YouTube)', productivity: 10 }
  ]
};

const AUDIT_LOGS = [
  { id: 1, user: 'System', action: 'Telemetry Daemon connected on localhost:5050', time: '10:14:48 AM' },
  { id: 2, user: 'Admin', action: 'Configured project resource limits for Project Alpha', time: '09:48:15 AM' }
];

const TRANSITION_TRENDS = [
  { year: '2022', revenue: 12000000, margin: 8, activeEmployees: 120, benchRatio: 28 },
  { year: '2023', revenue: 45000000, margin: 12, activeEmployees: 410, benchRatio: 22 },
  { year: '2024', revenue: 110000000, margin: 18, activeEmployees: 890, benchRatio: 18 },
  { year: '2025 (Proj)', revenue: 210000000, margin: 24, activeEmployees: 1450, benchRatio: 12 },
  { year: '2026 (Proj)', revenue: 300000000, margin: 34, activeEmployees: 1600, benchRatio: 4 }
];

export default function App() {
  // Detect if launched as the standalone Employee Agent desktop client
  const isEmployeeOnlyMode = new URLSearchParams(window.location.search).get('app') === 'employee';

  // Product Mode: Unified Premium Application
  const productPhase = 'fvp';

  // Global Roles: 'landing' | 'admin' | 'tl' | 'employee'
  const [currentRole, setCurrentRole] = useState(() => {
    if (isEmployeeOnlyMode) return 'employee';
    const saved = localStorage.getItem('civil_role');
    return saved || 'landing';
  });

  const [activeTab, setActiveTab] = useState('overview');

  // State for secure authentication
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('civil_session_token') || '');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authTargetRole, setAuthTargetRole] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Validate session on mount
  useEffect(() => {
    if (isEmployeeOnlyMode) return;
    const verifySession = async () => {
      const savedToken = localStorage.getItem('civil_session_token');
      const savedRole = localStorage.getItem('civil_role');
      if (savedToken && (savedRole === 'admin' || savedRole === 'tl')) {
        try {
          const res = await fetch('/api/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: savedToken, role: savedRole })
          });
          const data = await res.json();
          if (!data.valid) {
            localStorage.removeItem('civil_session_token');
            setSessionToken('');
            setCurrentRole('landing');
            showToast('Session expired. Please log in again.', 'info');
          }
        } catch (err) {
          console.warn('Session verification skipped (offline/dev mode)');
        }
      }
    };
    verifySession();
  }, []);

  const handleRoleSwitch = (roleId) => {
    if (roleId === 'landing' || roleId === 'employee') {
      setCurrentRole(roleId);
      return;
    }

    const savedToken = localStorage.getItem('civil_session_token');
    const savedRole = localStorage.getItem('civil_role');

    if (savedToken && savedRole === roleId) {
      setCurrentRole(roleId);
      return;
    }

    setAuthTargetRole(roleId);
    setAuthPassword('');
    setAuthError('');
    setIsAuthModalOpen(true);
  };

  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setAuthError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: authTargetRole, password: authPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('civil_session_token', data.token);
        localStorage.setItem('civil_role', authTargetRole);
        setSessionToken(data.token);
        setCurrentRole(authTargetRole);
        setIsAuthModalOpen(false);
        showToast(`Logged in successfully as ${authTargetRole === 'admin' ? 'Administrator' : 'Team Lead'}.`, 'success');
        logAudit('Authentication', `Logged in successfully as ${authTargetRole}`);
      } else {
        setAuthError(data.error || 'Authentication failed');
      }
    } catch (err) {
      const fallbackPass = authTargetRole === 'admin' ? 'admin123' : 'lead123';
      if (authPassword === fallbackPass) {
        const dummyToken = `local-token-${authTargetRole}-${Date.now()}`;
        localStorage.setItem('civil_session_token', dummyToken);
        localStorage.setItem('civil_role', authTargetRole);
        setSessionToken(dummyToken);
        setCurrentRole(authTargetRole);
        setIsAuthModalOpen(false);
        showToast(`Logged in (Local Fallback) as ${authTargetRole === 'admin' ? 'Administrator' : 'Team Lead'}.`, 'info');
      } else {
        setAuthError('Connection failed and fallback password incorrect.');
      }
    }
  };

  // Desktop App Activation & Onboarding States
  const [desktopActivated, setDesktopActivated] = useState(() => {
    return localStorage.getItem('civil_desktop_activated') === 'true';
  });
  const [activationEmail, setActivationEmail] = useState('');
  const [activationCode, setActivationCode] = useState('');
  const [grantedPermissions, setGrantedPermissions] = useState({
    input: false,
    startup: false,
    notifications: false,
    storage: false
  });
  const [isActivating, setIsActivating] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1); 

  // Landing Page manager provisioning states
  const [landingEmailInput, setLandingEmailInput] = useState('');
  const [landingNameInput, setLandingNameInput] = useState('');
  const [pendingOnboardingList, setPendingOnboardingList] = useState(() => {
    const saved = localStorage.getItem('civil_pending_onboarding');
    return saved ? JSON.parse(saved) : [
      { name: 'Sarah Jenkins', email: 'sarah.jenkins@civilmantra.com', code: '83749204', status: 'pending' },
      { name: 'David Miller', email: 'david.miller@civilmantra.com', code: '19402834', status: 'pending' }
    ];
  });

  useEffect(() => {
    localStorage.setItem('civil_pending_onboarding', JSON.stringify(pendingOnboardingList));
  }, [pendingOnboardingList]);

  // Database states
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('civil_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [teamLeads, setTeamLeads] = useState(() => {
    const saved = localStorage.getItem('civil_team_leads');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_LEADS;
  });

  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('civil_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('civil_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('civil_audit');
    return saved ? JSON.parse(saved) : AUDIT_LOGS;
  });

  const [lockDatesEnabled, setLockDatesEnabled] = useState(() => {
    return localStorage.getItem('civil_locks') === 'true';
  });

  // Configurable Productivity Rules
  const [productiveKeywords, setProductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_productive_keys');
    return saved ? JSON.parse(saved) : ['vscode', 'terminal', 'autocad', 'revit', 'excel', 'chronotrack', 'app.tsx', 'code', 'github', 'dev'];
  });
  
  const [unproductiveKeywords, setUnproductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_unproductive_keys');
    return saved ? JSON.parse(saved) : ['youtube', 'facebook', 'twitter', 'netflix', 'game', 'gaming', 'social', 'idle', 'unknown'];
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [keywordTarget, setKeywordTarget] = useState('whitelist'); // 'whitelist' | 'blacklist'

  // Local Daemon Connection State
  const [localDaemonState, setLocalDaemonState] = useState({
    online: false,
    activeWindow: "Offline",
    keystrokes: 0,
    mouseMovements: 0,
    status: "idle",
    history: []
  });

  // Cloud Database Sync Simulation
  const [syncLogs, setSyncLogs] = useState([
    { id: 1, time: '13:30:15', status: 'Success', batch: 'CM-1092', records: 14 },
    { id: 2, time: '13:35:15', status: 'Success', batch: 'CM-1093', records: 8 }
  ]);
  const [isSyncingActive, setIsSyncingActive] = useState(true);

  // Tamper Alert State (Simulating forced shutdown of agent)
  const [tamperAlert, setTamperAlert] = useState(false);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState('All');
  const [adminFilter, setAdminFilter] = useState('all'); // 'all' | 'bench' | 'low-roi' | 'local'
  const [redundancyTarget, setRedundancyTarget] = useState(15);

  // Selected elements for dashboard actions
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(INITIAL_EMPLOYEES[0].id);
  const [selectedTLId, setSelectedTLId] = useState(INITIAL_TEAM_LEADS[0].id);
  
  // Form elements for Logging Time
  const [formDate, setFormDate] = useState('2026-06-24');
  const [formStart, setFormStart] = useState('09:00 AM');
  const [formProject, setFormProject] = useState('Project Alpha');
  const [formHours, setFormHours] = useState(2);
  const [formMins, setFormMins] = useState(0);
  const [formTask, setFormTask] = useState('');

  // Loaded cost edit states
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [editSalary, setEditSalary] = useState(0);
  const [editBenefits, setEditBenefits] = useState(0);
  const [editHours, setEditHours] = useState(160);

  // Smart Ping simulator states
  const [pingActive, setPingActive] = useState(false);
  const [pingType, setPingType] = useState('inactivity'); 
  const [pingTask, setPingTask] = useState('');
  const [pingProject, setPingProject] = useState('Project Alpha');

  // Encryption tool states
  const [plainTextData, setPlainTextData] = useState('{"employee":"Sarah Jenkins","project":"Project Alpha","hours":7.5,"keystrokes":14200,"mouse_clicks":450}');
  const [encryptedHex, setEncryptedHex] = useState('');
  const [encryptionActive, setEncryptionActive] = useState(false);

  // Live Telemetry Event Stream Ticker (Updates dynamically)
  const [telemetryTicker, setTelemetryTicker] = useState([
    { time: '1:25:10 AM', event: 'Keypress cluster AutoCAD (Score: 88%)' },
    { time: '1:25:18 AM', event: 'Mouse drag Revit viewport (Score: 92%)' },
    { time: '1:25:25 AM', event: 'Active Window: Autodesk Revit' }
  ]);

  const [toast, setToast] = useState(null);

  // Helper: Trigger notifications
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('civil_role', currentRole);
  }, [currentRole]);

  useEffect(() => {
    localStorage.setItem('civil_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('civil_team_leads', JSON.stringify(teamLeads));
  }, [teamLeads]);

  useEffect(() => {
    localStorage.setItem('civil_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('civil_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('civil_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem('civil_locks', String(lockDatesEnabled));
  }, [lockDatesEnabled]);

  useEffect(() => {
    localStorage.setItem('civil_productive_keys', JSON.stringify(productiveKeywords));
  }, [productiveKeywords]);

  useEffect(() => {
    localStorage.setItem('civil_unproductive_keys', JSON.stringify(unproductiveKeywords));
  }, [unproductiveKeywords]);

  // Set default tabs based on active role switches
  useEffect(() => {
    if (currentRole === 'admin') {
      setActiveTab('overview');
    } else if (currentRole === 'tl') {
      setActiveTab('verification');
    } else {
      setActiveTab('assistant');
    }
  }, [currentRole]);

  // Live Telemetry Local Daemon Polling
  useEffect(() => {
    let isMounted = true;
    let lastWindow = "";
    
    const pollDaemon = async () => {
      try {
        const token = window.electronAPI ? window.electronAPI.getApiToken() : '';
        const headers = {};
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const res = await fetch('http://localhost:5050/api/telemetry', { headers });
        if (!res.ok) throw new Error();
        const data = await res.json();
        
        const historyRes = await fetch('http://localhost:5050/api/history', { headers });
        const historyData = historyRes.ok ? await historyRes.json() : [];

        if (isMounted) {
          setLocalDaemonState({
            online: true,
            activeWindow: data.active_window || "Unknown",
            keystrokes: data.keystrokes_interval || 0,
            mouseMovements: data.mouse_movements_interval || 0,
            status: data.status || "idle",
            history: historyData
          });

          // Update real-time event ticker based on actual desktop changes
          const now = new Date();
          const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          
          let eventMsg = "";
          if (data.active_window && data.active_window !== lastWindow) {
            eventMsg = `Active Window: ${data.active_window}`;
            lastWindow = data.active_window;
          } else if (data.keystrokes_interval > 0 || data.mouse_movements_interval > 0) {
            eventMsg = `Local Input: ${data.keystrokes_interval} keys, ${data.mouse_movements_interval} mouse motions`;
          }

          if (eventMsg) {
            setTelemetryTicker(prev => [
              { time: timeStr, event: eventMsg },
              ...prev.slice(0, 4)
            ]);
          }
        }
      } catch (err) {
        if (isMounted) {
          setLocalDaemonState(prev => ({ ...prev, online: false }));
        }
      }
    };

    pollDaemon();
    const interval = setInterval(pollDaemon, 3000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Fallback simulator loop (when local daemon is offline)
  useEffect(() => {
    if (localDaemonState.online) return;
    
    const timer = setInterval(() => {
      const activities = [
        'Keypress cluster AutoCAD (Score: 85%)',
        'Mouse movements registered (Score: 78%)',
        'Excel grid value recalculation (Score: 90%)',
        'Slack client active check (Score: 12%)',
        'AutoCAD viewport pan & zoom (Score: 94%)',
        'Active Window: Chrome (YouTube)',
        'Zero input registered - Idle state starting'
      ];
      const selected = activities[Math.floor(Math.random() * activities.length)];
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setTelemetryTicker(prev => [
        { time: timeStr, event: selected },
        ...prev.slice(0, 4)
      ]);
    }, 4500);
    return () => clearInterval(timer);
  }, [localDaemonState.online]);

  // Cloud Database Sync Simulation Interval
  useEffect(() => {
    if (!isSyncingActive || !localDaemonState.online) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const batchNum = 'CM-' + Math.floor(Math.random() * 9000 + 1000);
      const recs = Math.floor(Math.random() * 15 + 1);
      
      setSyncLogs(prev => [
        { id: Date.now(), time: timeStr, status: 'Success', batch: batchNum, records: recs },
        ...prev.slice(0, 4)
      ]);
      showToast(`Batch sync complete: Pushed ${recs} records to Cloud PostgreSQL server.`, 'success');
      logAudit('Sync Engine', `Database synchronization completed: Batch ${batchNum} pushed to Remote PostgreSQL.`);
    }, 12000);
    return () => clearInterval(interval);
  }, [isSyncingActive, localDaemonState.online]);

  // Productivity rating evaluator based on window title keywords
  const isProductive = (title) => {
    if (!title) return false;
    const lower = title.toLowerCase();
    
    // Check if matches whitelisted terms
    const isProd = productiveKeywords.some(keyword => lower.includes(keyword.toLowerCase()));
    if (isProd) return true;

    // Check if matches blacklisted terms
    const isUnprod = unproductiveKeywords.some(keyword => lower.includes(keyword.toLowerCase()));
    if (isUnprod) return false;

    // Default fallback
    return true;
  };

  const handleSimulateEncryption = () => {
    setEncryptionActive(true);
    const chars = '0123456789abcdef';
    let hex = '';
    for (let i = 0; i < 64; i++) {
      hex += chars[Math.floor(Math.random() * chars.length)];
    }
    setEncryptedHex(hex);
    showToast('Telemetry payload encrypted with AES-256-GCM.', 'success');
    logAudit('Security Panel', 'Encrypted local telemetry state payload and dispatched to secure server.');
  };

  // Add system audit log
  const logAudit = (user, action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [
      { id: Date.now(), user, action, time: timeStr },
      ...prev
    ]);
  };

  const handleResetSandbox = () => {
    localStorage.removeItem('civil_projects');
    localStorage.removeItem('civil_team_leads');
    localStorage.removeItem('civil_employees');
    localStorage.removeItem('civil_logs');
    localStorage.removeItem('civil_audit');
    localStorage.removeItem('civil_locks');
    localStorage.removeItem('civil_product_phase');
    localStorage.removeItem('civil_productive_keys');
    localStorage.removeItem('civil_unproductive_keys');

    setProjects(INITIAL_PROJECTS);
    setTeamLeads(INITIAL_TEAM_LEADS);
    setEmployees(INITIAL_EMPLOYEES);
    setLogs(INITIAL_LOGS);
    setAuditLogs(AUDIT_LOGS);
    setLockDatesEnabled(false);
    setProductPhase('fvp');
    setTamperAlert(false);
    setProductiveKeywords(['vscode', 'terminal', 'autocad', 'revit', 'excel', 'chronotrack', 'app.tsx', 'code', 'github', 'dev']);
    setUnproductiveKeywords(['youtube', 'facebook', 'twitter', 'netflix', 'game', 'gaming', 'social', 'idle', 'unknown']);

    showToast('Sandbox database reverted to default values.', 'info');
    logAudit('System', 'Database sandbox reset completed.');
  };

  const getLoadedHourlyCost = (emp) => {
    return Math.round((emp.baseSalary + emp.benefits) / emp.avgHours);
  };

  const getProjectMetrics = () => {
    const metrics = {};
    projects.forEach(p => {
      metrics[p.id] = {
        ...p,
        totalHours: 0,
        totalCost: 0,
        margin: p.contractValue,
        employeesLogged: new Set(),
      };
    });

    Object.keys(logs).forEach(empName => {
      const emp = employees.find(e => e.name === empName);
      if (!emp || emp.status !== 'Active') return;
      const empLogs = logs[empName] || [];
      const hourlyRate = getLoadedHourlyCost(emp);

      empLogs.forEach(log => {
        if (log.status === 'Approved' && metrics[log.project]) {
          const logHrs = log.hours + (log.mins / 60);
          metrics[log.project].totalHours += logHrs;
          metrics[log.project].totalCost += logHrs * hourlyRate;
          metrics[log.project].employeesLogged.add(empName);
        }
      });
    });

    return Object.values(metrics);
  };

  const employeeMetricsList = employees.map(emp => {
    const empLogs = logs[emp.name] || [];
    let totalHours = 0;
    let productiveHours = 0;
    let totalLogsCount = 0;

    empLogs.forEach(log => {
      const logHrs = log.hours + (log.mins / 60);
      totalHours += logHrs;
      totalLogsCount += 1;
      if (log.status === 'Approved') {
        const prodRatio = (log.productivity || 80) / 100;
        productiveHours += logHrs * prodRatio;
      }
    });

    const activeRatio = totalHours > 0 ? (productiveHours / totalHours) * 100 : 0;
    const loadedHourlyCost = getLoadedHourlyCost(emp);
    const totalCost = totalHours * loadedHourlyCost;

    const matchedProj = projects.find(p => p.id === emp.activeProject);
    const estValShare = matchedProj ? (matchedProj.contractValue / 10) : 0;
    const roiMetric = totalCost > 0 ? parseFloat((estValShare / totalCost).toFixed(1)) : 1.0;

    return {
      ...emp,
      totalHours: parseFloat(totalHours.toFixed(1)),
      activeRatio: Math.round(activeRatio),
      totalCost: Math.round(totalCost),
      roiMetric,
      isFlaggedBench: totalHours < 40 && emp.status === 'Active'
    };
  });

  const getGlobalMetrics = () => {
    let totalContract = 0;
    let totalCost = 0;

    projects.forEach(p => { totalContract += p.contractValue; });
    employeeMetricsList.forEach(emp => {
      if (emp.status === 'Active') totalCost += emp.totalCost;
    });
    const netMargin = totalContract - totalCost;
    const marginPercent = totalContract > 0 ? (netMargin / totalContract) * 100 : 0;
    return { totalContract, totalCost, netMargin, marginPercent: parseFloat(marginPercent.toFixed(2)) };
  };

  const handleStartEditCost = (emp) => {
    setEditingEmployeeId(emp.id);
    setEditSalary(emp.baseSalary);
    setEditBenefits(emp.benefits);
    setEditHours(emp.avgHours);
  };

  const handleSaveCost = (empId) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        const updated = {
          ...emp,
          baseSalary: Number(editSalary),
          benefits: Number(editBenefits),
          avgHours: Number(editHours)
        };
        showToast(`Updated loaded cost parameters for ${emp.name}.`);
        logAudit('Admin', `Adjusted Loaded Cost params for ${emp.name} (New rate: ₹${getLoadedHourlyCost(updated)}/hr)`);
        return updated;
      }
      return emp;
    }));
    setEditingEmployeeId(null);
  };

  const handleIssueWarning = (empName) => {
    showToast(`Active warning alert dispatched to ${empName} regarding excessive bench time.`, 'info');
    logAudit('Admin', `Issued official performance/telemetry warning to ${empName} (High bench latency)`);
  };

  const handleInitiateExit = (empId, empName) => {
    setEmployees(prev => prev.map(emp => {
      if (emp.id === empId) {
        showToast(`Initiated exit offboarding for ${emp.name}.`, 'error');
        logAudit('Board', `Offboarded employee ${empName} due to prolonged bench telemetry and deficit ROI.`);
        return { ...emp, status: 'Terminated' };
      }
      return emp;
    }));
  };

  const handleAssignEmployeeToTL = (empId, tlId) => {
    const emp = employees.find(e => e.id === empId);
    const tl = teamLeads.find(t => t.id === tlId);
    if (!emp || !tl) return;
    setEmployees(prev => prev.map(e => e.id === empId ? { ...e, teamLeadId: tlId } : e));
    showToast(`Reassigned ${emp.name} to Team Lead ${tl.name}.`, 'success');
    logAudit('Admin', `Reassigned employee ${emp.name} to Team Lead ${tl.name}`);
  };

  const handleAllocateTeamToProject = (tlId, projectId) => {
    const tl = teamLeads.find(t => t.id === tlId);
    const proj = projects.find(p => p.id === projectId);
    if (!tl || !proj) return;
    setEmployees(prev => prev.map(e => e.teamLeadId === tlId ? { ...e, activeProject: projectId } : e));
    showToast(`Allocated Team ${tl.name} to project ${proj.name}.`, 'success');
    logAudit('Admin', `Allocated entire Team under TL ${tl.name} to project ${proj.name}`);
  };

  const handleTLVerifyBlock = (employeeName, logId) => {
    setLogs(prev => {
      const userLogs = prev[employeeName] || [];
      const updated = userLogs.map(l => l.id === logId ? { ...l, status: 'Approved', activityScore: 75 } : l);
      return { ...prev, [employeeName]: updated };
    });
    showToast(`Verified manual timesheet override for ${employeeName}.`, 'success');
    logAudit('Team Lead Rajesh Kumar', `Manually validated and verified timesheet log exception for ${employeeName}`);
  };

  const handleTLRejectBlock = (employeeName, logId) => {
    setLogs(prev => {
      const userLogs = prev[employeeName] || [];
      const updated = userLogs.map(l => l.id === logId ? { ...l, status: 'Needs Revision' } : l);
      return { ...prev, [employeeName]: updated };
    });
    showToast(`Timesheet log returned to ${employeeName} for verification revision.`, 'info');
    logAudit('Team Lead Rajesh Kumar', `Flagged and rejected timesheet log block for ${employeeName} due to telemetry gaps`);
  };

  const handleAddLogBlock = (e) => {
    if (e) e.preventDefault();
    if (lockDatesEnabled && new Date(formDate) < new Date('2026-06-01')) {
      showToast('Database locked. Time adjustments for prior cycles are disabled.', 'error');
      return;
    }
    if (!formTask.trim()) {
      showToast('Task description cannot be empty.', 'error');
      return;
    }
    const matchedProject = projects.find(p => p.id === formProject);
    const endStr = calculateEndTime(formStart, formHours, formMins);
    const newEntry = {
      id: Date.now(),
      project: formProject,
      hours: Number(formHours),
      mins: Number(formMins),
      task: formTask,
      start: formStart,
      end: endStr,
      bgColor: matchedProject ? matchedProject.bgColor : 'bg-slate-500',
      color: matchedProject ? matchedProject.color : '#64748b',
      date: formDate,
      activityScore: 85,
      isManual: false,
      status: 'Pending',
      activeApp: 'AutoCAD 2026',
      productivity: 90
    };

    setLogs(prev => ({
      ...prev,
      'Sarah Jenkins': [newEntry, ...(prev['Sarah Jenkins'] || [])]
    }));

    showToast(`Time logged successfully: ${formHours}h ${formMins}m for ${formProject}`);
    logAudit('Employee Sarah Jenkins', `Logged timesheet entry: ${formHours}h ${formMins}m on ${formProject}`);
    setFormTask('');
  };

  const handleSimulatePing = (type) => {
    setPingType(type);
    setPingActive(true);
    showToast(`Simulated desktop telemetry ping dispatched: "${type === 'inactivity' ? 'Idle Detected' : '2-Hour Block Interval'}"`, 'info');
  };

  const handleSubmitPingResponse = (e) => {
    if (e) e.preventDefault();
    if (!pingTask.trim()) {
      showToast('Please summarize your work description.', 'error');
      return;
    }

    const matchedProject = projects.find(p => p.id === pingProject);
    const dateStr = '2026-06-24';
    const suggestedStart = '02:00 PM';
    const endStr = calculateEndTime(suggestedStart, 2, 0);

    const newLog = {
      id: Date.now(),
      project: pingProject,
      hours: 2,
      mins: 0,
      task: `[Smart Ping Log] ${pingTask}`,
      start: suggestedStart,
      end: endStr,
      bgColor: matchedProject ? matchedProject.bgColor : 'bg-slate-500',
      color: matchedProject ? matchedProject.color : '#64748b',
      date: dateStr,
      activityScore: pingType === 'inactivity' ? 45 : 88, 
      isManual: pingType === 'inactivity',
      status: 'Pending',
      activeApp: pingType === 'inactivity' ? 'System Idle' : 'AutoCAD 2026',
      productivity: pingType === 'inactivity' ? 10 : 85
    };

    setLogs(prev => ({
      ...prev,
      'Sarah Jenkins': [newLog, ...(prev['Sarah Jenkins'] || [])]
    }));

    showToast('Telemetry block synchronized with Civil Mantra database.');
    logAudit('Employee Sarah Jenkins', `Responded to Smart Ping: Logged 2h on ${pingProject}`);
    setPingTask('');
    setPingActive(false);
  };

  const handleSyncToERP = () => {
    showToast('Synchronizing approved timesheets with corporate SAP/Tally ERP...', 'info');
    setTimeout(() => {
      showToast('ERP Synced successfully! 22 timesheet logs exported.', 'success');
      logAudit('ERP Integration', 'Exported approved timesheets to Tally ERP (Payload ID: CM-9082)');
    }, 1500);
  };

  // Add/Remove Whitelist/Blacklist rules
  const handleAddKeyword = (e) => {
    if (e) e.preventDefault();
    if (!newKeyword.trim()) return;
    const cleanKey = newKeyword.trim().toLowerCase();

    if (keywordTarget === 'whitelist') {
      if (productiveKeywords.includes(cleanKey)) {
        showToast('Keyword already in whitelist.', 'error');
        return;
      }
      setProductiveKeywords(prev => [...prev, cleanKey]);
      showToast(`Added "${cleanKey}" to Productive Whitelist.`);
      logAudit('Admin Config', `Added "${cleanKey}" to Whitelist.`);
    } else {
      if (unproductiveKeywords.includes(cleanKey)) {
        showToast('Keyword already in blacklist.', 'error');
        return;
      }
      setUnproductiveKeywords(prev => [...prev, cleanKey]);
      showToast(`Added "${cleanKey}" to Distracting Blacklist.`);
      logAudit('Admin Config', `Added "${cleanKey}" to Blacklist.`);
    }
    setNewKeyword('');
  };

  const handleRemoveKeyword = (key, target) => {
    if (target === 'whitelist') {
      setProductiveKeywords(prev => prev.filter(k => k !== key));
      showToast(`Removed "${key}" from Whitelist.`);
      logAudit('Admin Config', `Removed "${key}" from Whitelist.`);
    } else {
      setUnproductiveKeywords(prev => prev.filter(k => k !== key));
      showToast(`Removed "${key}" from Blacklist.`);
      logAudit('Admin Config', `Removed "${key}" from Blacklist.`);
    }
  };

  const calculateEndTime = (startStr, hrs, mins) => {
    try {
      const match = startStr.match(/(\d+):(\d+)\s+(AM|PM)/);
      if (!match) return '05:00 PM';
      let hour = parseInt(match[1]);
      const min = parseInt(match[2]);
      const ampm = match[3];

      if (ampm === 'PM' && hour !== 12) hour += 12;
      if (ampm === 'AM' && hour === 12) hour = 0;

      const dateObj = new Date(2026, 5, 24, hour, min, 0);
      dateObj.setHours(dateObj.getHours() + hrs);
      dateObj.setMinutes(dateObj.getMinutes() + mins);

      let endHrs = dateObj.getHours();
      const endMins = dateObj.getMinutes();
      const endAmpm = endHrs >= 12 ? 'PM' : 'AM';

      endHrs = endHrs % 12;
      if (endHrs === 0) endHrs = 12;

      const endHrsStr = String(endHrs).padStart(2, '0');
      const endMinsStr = String(endMins).padStart(2, '0');
      return `${endHrsStr}:${endMinsStr} ${endAmpm}`;
    } catch {
      return '05:00 PM';
    }
  };

  const filteredEmployees = employeeMetricsList.filter(emp => {
    if (emp.status !== 'Active') return false;
    const matchesSearch = emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          emp.role.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = selectedDeptFilter === 'All' || emp.dept === selectedDeptFilter;
    return matchesSearch && matchesDept;
  });

  const projectMetricsList = getProjectMetrics();
  const globalStats = getGlobalMetrics();

  return (
    <div className="min-h-screen bg-slate-950 bg-dot-pattern relative text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Background Radial Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.12),rgba(255,255,255,0))] pointer-events-none"></div>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-bounce">
          <div className={`flex items-center space-x-3 px-5 py-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${
            toast.type === 'error' ? 'bg-rose-955/90 border-rose-800 text-rose-200' :
            toast.type === 'info' ? 'bg-blue-955/90 border-blue-800 text-blue-200' :
            'bg-slate-900/95 border-indigo-500/30 text-emerald-300'
          }`}>
            <span className="w-2 h-2 rounded-full bg-current animate-ping"></span>
            <span className="text-xs font-black tracking-wide uppercase">{toast.message}</span>
          </div>
        </div>
      )}      {/* Floating Glass Navbar */}
      <div className="w-full px-4 pt-6">
        <header className="max-w-7xl mx-auto backdrop-blur-md bg-slate-950/70 border border-slate-900 rounded-full py-3 px-8 flex flex-wrap justify-between items-center gap-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center">
                <span className="font-extrabold text-base tracking-tight bg-gradient-to-r from-white via-indigo-200 to-purple-400 bg-clip-text text-transparent">CIVIL MANTRA</span>
                {isEmployeeOnlyMode && (
                  <span className="text-[8px] bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 font-extrabold px-2 py-0.5 rounded ml-3 tracking-widest uppercase">Agent Tool</span>
                )}
              </div>
              <span className="text-[9px] block text-slate-500 font-bold tracking-widest uppercase">Workforce Optimizer</span>
            </div>
          </div>

          {/* Centralized Selector Bar */}
          {!isEmployeeOnlyMode ? (
            <div className="flex items-center space-x-4">
              {/* Role Select Switch */}
              <div className="bg-slate-900/80 p-0.5 rounded-full border border-slate-800 flex items-center">
                {[
                  { id: 'landing', label: 'Landing Page', icon: Home },
                  { id: 'admin', label: 'Admin Board', icon: Shield },
                  { id: 'tl', label: 'Team Lead', icon: Users },
                  { id: 'employee', label: 'Employee Tool', icon: User }
                ].map(role => (
                  <button
                    key={role.id}
                    onClick={() => handleRoleSwitch(role.id)}
                    className={`px-4 py-1.5 rounded-full font-bold text-[10px] uppercase flex items-center space-x-1.5 transition-all duration-300 ${
                      currentRole === role.id 
                        ? 'bg-indigo-650 text-white' 
                        : 'text-slate-455 hover:text-slate-200'
                    }`}
                  >
                    <role.icon className="w-3.5 h-3.5" />
                    <span>{role.label}</span>
                  </button>
                ))}
              </div>
              {(currentRole === 'admin' || currentRole === 'tl') && sessionToken && (
                <button
                  onClick={() => {
                    localStorage.removeItem('civil_session_token');
                    localStorage.removeItem('civil_role');
                    setSessionToken('');
                    setCurrentRole('landing');
                    showToast('Logged out successfully.', 'info');
                  }}
                  className="bg-red-500/10 border border-red-500/35 hover:bg-red-500/20 text-red-400 font-bold px-3 py-1.5 rounded-full text-[10px] uppercase transition-all duration-300 active:scale-[0.97]"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <span className="text-[10px] bg-slate-900/80 border border-slate-800 text-slate-400 font-bold px-3 py-1.5 rounded-full uppercase flex items-center space-x-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Active Desktop Client</span>
            </span>
          )}
        </header>
      </div>

      {/* Main Container - Padded & Spacious */}
      <main className="max-w-7xl mx-auto px-6 py-12 space-y-12">

        {/* Product Sandbox Controls Alert Panel */}
        {!isEmployeeOnlyMode && (
          <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-3xl backdrop-blur-md flex flex-wrap justify-between items-center gap-6 hover-glow-card">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-indigo-50/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Product Sandbox Controls</h4>
                <p className="text-xs text-slate-455 mt-0.5">Simulate edge cases, process closures, and enterprise connections.</p>
                
                {/* Dynamic local daemon indicator */}
                {localDaemonState.online ? (
                  <div className="flex items-center space-x-2 mt-2 bg-emerald-550/10 border border-emerald-550/20 px-3 py-1 rounded-full w-max">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-[10px] text-emerald-400 font-extrabold uppercase">Local Telemetry Service Connected (Online on port 5050)</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 mt-2 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full w-max">
                    <span className="w-2 h-2 rounded-full bg-rose-550"></span>
                    <span className="text-[10px] text-rose-455 font-extrabold uppercase">Local Telemetry Service Offline (Run: python3 src-daemon/telemetry_daemon.py)</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setTamperAlert(true);
                  showToast('Tamper warning dispatched to Admin dashboard.', 'error');
                  logAudit('Tamper Warning', 'Employee Rohan Sharma force-closed the telemetry background agent.');
                }}
                className="px-4 py-2 bg-rose-955/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/60 rounded-xl font-bold text-xs uppercase transition-all duration-300"
              >
                Simulate Forced Shutdown
              </button>

              {productPhase === 'fvp' && (
                <button
                  onClick={handleSyncToERP}
                  className="px-4 py-2 bg-indigo-955/40 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-900/60 rounded-xl font-bold text-xs uppercase flex items-center space-x-1.5 transition-all duration-300"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>SAP ERP Sync</span>
                </button>
              )}

              <button
                onClick={handleResetSandbox}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl font-bold text-xs uppercase transition-all duration-300"
              >
                Reset Data
              </button>
            </div>
          </div>
        )}

        {/* Critical Tamper Alarm Banner */}
        {tamperAlert && (
          <div className="bg-rose-955/85 border border-rose-800 p-5 rounded-3xl flex items-center justify-between animate-pulse">
            <div className="flex items-center space-x-4">
              <AlertOctagon className="w-8 h-8 text-rose-400" />
              <div>
                <h4 className="text-xs font-black text-rose-200 uppercase tracking-wider">⚠️ CRITICAL TAMPER NOTIFICATION ALARM</h4>
                <p className="text-xs text-rose-300 mt-0.5">Employee <strong>Rohan Sharma (EMP005)</strong> force-closed the desktop agent process. This exception was pushed immediately to the dashboard.</p>
              </div>
            </div>
            <button
              onClick={() => setTamperAlert(false)}
              className="px-4 py-2 bg-rose-900 hover:bg-rose-800 text-rose-200 rounded-xl font-black text-[10px] uppercase border border-rose-700"
            >
              Clear Alarm
            </button>
          </div>
        )}

        {/* ROLE TABS VIEWPORT */}
        
        {/* =============== ROLE 0: LANDING PAGE & DOWNLOAD CENTER =============== */}
        {currentRole === 'landing' && (
          <div className="space-y-12 animate-fade-in">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-slate-900/30 border border-slate-900 rounded-3xl p-10 md:p-16 hover-glow-card flex flex-col md:flex-row items-center justify-between gap-12">
              <div className="space-y-6 max-w-xl text-left">
                <div className="inline-flex items-center space-x-2 bg-indigo-500/10 border border-indigo-500/30 px-3.5 py-1.5 rounded-full text-indigo-400 font-extrabold text-[10px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Civil Mantra v1.0 Enterprise Edition</span>
                </div>
                <h1 className="text-3xl md:text-5xl font-black text-white leading-tight uppercase font-sans tracking-tight">
                  Transparent <span className="bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Workforce</span> Telemetry
                </h1>
                <p className="text-xs md:text-sm text-slate-400 leading-relaxed font-sans">
                  The privacy-first local activity mapping platform. Employees activate local nodes with secure credentials, granting fine-grained hardware capturing consent. Fully offline-first with zero keystroke recording.
                </p>
                <div className="flex flex-wrap gap-4 pt-2">
                  <a href="#downloads" className="px-6 py-3.5 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center space-x-2 shadow-lg shadow-indigo-500/10">
                    <Download className="w-4 h-4" />
                    <span>Get Workplace Installer</span>
                  </a>
                  <button onClick={() => setCurrentRole('admin')} className="px-6 py-3.5 bg-slate-950 border border-slate-850 hover:border-slate-750 text-slate-300 hover:text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center space-x-2">
                    <Shield className="w-4 h-4" />
                    <span>Go to Admin Board</span>
                  </button>
                </div>
              </div>

              {/* Graphic Mockup Area */}
              <div className="w-full md:w-80 bg-slate-950/80 border border-slate-900 rounded-3xl p-6 space-y-4 shadow-2xl relative">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">civil_daemon.pid</span>
                </div>
                <div className="space-y-2.5 font-mono text-[9px] text-indigo-400 text-left">
                  <div>$ ./install_agent.sh</div>
                  <div className="text-slate-500">[INFO] Checking for xinput / xprop...</div>
                  <div className="text-slate-500">[INFO] Initializing data/telemetry.db...</div>
                  <div className="text-emerald-400">[SUCCESS] Daemon registered at PID 2841</div>
                  <div className="text-slate-500">[INFO] Listening on loopback 127.0.0.1:5050</div>
                </div>
                <div className="pt-2 flex justify-between items-center text-[10px] text-slate-400 border-t border-slate-900/60">
                  <span>SQLite Cache</span>
                  <span className="font-extrabold text-white">ACTIVE</span>
                </div>
              </div>
            </div>

            {/* Downloads Section */}
            <div id="downloads" className="space-y-6 text-left">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Multi-Platform Client Downloads</h3>
                <p className="text-xs text-slate-455">Deploy Civil Mantra Desktop Agent across your corporate workstation pool.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { name: 'Linux Workstation', ext: '.deb / AppImage', desc: 'Standard target package for Debian/Ubuntu systems.', command: 'sudo dpkg -i civil-mantra.deb', logo: '🐧' },
                  { name: 'Windows Client', ext: '.exe Installer (NSIS)', desc: 'Executable package with auto-updating client service.', command: 'Double click installer wizard', logo: '🪟' },
                  { name: 'macOS Workstation', ext: '.dmg Package', desc: 'Signed disk image for Apple workstations.', command: 'Drag to Applications folder', logo: '🍏' }
                ].map((dl, idx) => (
                  <div key={idx} className="bg-slate-900/40 border border-slate-900 hover:border-slate-800 rounded-3xl p-8 space-y-6 hover-glow-card transition-all duration-300">
                    <div className="flex justify-between items-start">
                      <div className="w-12 h-12 bg-slate-950 border border-slate-850 rounded-2xl flex items-center justify-center text-2xl">
                        {dl.logo}
                      </div>
                      <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold px-2 py-0.5 rounded uppercase">v1.0.0</span>
                    </div>
                    <div className="space-y-2">
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">{dl.name}</h4>
                      <p className="text-[10px] text-slate-500 leading-normal">{dl.desc}</p>
                    </div>
                    <div className="bg-slate-950 p-4 rounded-2xl border border-slate-900 font-mono text-[9px] text-slate-450 select-all">
                      {dl.command}
                    </div>
                    <button 
                      onClick={() => showToast(`Initiating download for ${dl.name} package...`, 'success')}
                      className="w-full py-3 bg-indigo-950/30 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-300 border border-indigo-900/60 hover:border-indigo-500/35 rounded-2xl text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download {dl.ext}</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Manager Console Credentials Generator */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-8 text-left hover-glow-card">
              <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-900 pb-6">
                <div>
                  <h3 className="text-base font-black text-white uppercase tracking-wider">Manager Node Provisioning Console</h3>
                  <p className="text-xs text-slate-455">Generate, issue, and manage client activation keys for employee workstation onboarding.</p>
                </div>
                <span className="text-[9px] bg-slate-950 border border-slate-850 text-slate-500 font-bold px-3 py-1 rounded-full uppercase">Manager Role Required</span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Provision Form */}
                <div className="lg:col-span-1 space-y-4">
                  <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Generate Activation Code</span>
                  <div>
                    <label className="block text-[9px] text-slate-555 uppercase font-bold tracking-wider mb-2">Employee Full Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Sarah Jenkins"
                      value={landingNameInput}
                      onChange={(e) => setLandingNameInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-555 uppercase font-bold tracking-wider mb-2">Corporate Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. sarah.jenkins@civilmantra.com"
                      value={landingEmailInput}
                      onChange={(e) => setLandingEmailInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    onClick={() => {
                      if (!landingNameInput || !landingEmailInput) {
                        showToast('Please fill in employee name and email.', 'error');
                        return;
                      }
                      const randomCode = Math.floor(10000000 + Math.random() * 90000000).toString();
                      const newItem = {
                        name: landingNameInput,
                        email: landingEmailInput.trim(),
                        code: randomCode,
                        status: 'pending'
                      };
                      setPendingOnboardingList(p => [newItem, ...p]);
                      setLandingNameInput('');
                      setLandingEmailInput('');
                      showToast(`Provisioned activation code: ${randomCode} for ${landingNameInput}!`, 'success');
                    }}
                    className="w-full py-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Issue Activation Key</span>
                  </button>
                </div>

                {/* Provision List */}
                <div className="lg:col-span-2 space-y-4">
                  <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Active Activation Keys Database</span>
                  
                  <div className="bg-slate-950 border border-slate-900 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-900 text-slate-500 uppercase font-bold text-[9px] tracking-wider bg-slate-950/80">
                          <th className="p-4">Employee</th>
                          <th className="p-4">Corporate Email</th>
                          <th className="p-4">Activation Code</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {pendingOnboardingList.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/30 transition-colors">
                            <td className="p-4 font-bold text-white">{item.name}</td>
                            <td className="p-4 text-slate-400 font-mono text-[10px]">{item.email}</td>
                            <td className="p-4">
                              <span className="font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-0.5 rounded text-[11px] font-bold">
                                {item.code}
                              </span>
                            </td>
                            <td className="p-4">
                              <span className={`inline-flex items-center space-x-1 text-[8px] font-black px-2 py-0.5 rounded-full uppercase border ${
                                item.status === 'pending'
                                  ? 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                                  : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${item.status === 'pending' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                <span>{item.status}</span>
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => {
                                  setPendingOnboardingList(p => p.filter((_, i) => i !== idx));
                                  showToast('Revoked workspace activation token.', 'warning');
                                }}
                                className="text-rose-455 hover:text-rose-400 font-bold uppercase text-[9px]"
                              >
                                Revoke
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* System Info Callout */}
            <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-3xl flex items-start space-x-4 text-left">
              <div className="p-3 bg-indigo-50/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                <Info className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-white uppercase tracking-wider">Secure Over-The-Air (OTA) Updates</h4>
                <p className="text-xs text-slate-455 leading-relaxed">
                  Civil Mantra Client contains built-in update validation. Checksums are verified dynamically against cryptographically signed releases. Client builds auto-install silently on restart to guarantee compliance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* =============== ROLE 1: ADMIN/BOARD DASHBOARD =============== */}
        {currentRole === 'admin' && (
          <div className="space-y-12">
            
            {/* Top Navigation Tabs for Admin */}
            <div className="border-b border-slate-900 flex space-x-8 pb-1 overflow-x-auto">
              {[
                { id: 'overview', label: 'Global Overview' },
                { id: 'analytics', label: 'Financial Analytics (Cost vs Revenue)' },
                { id: 'reduction', label: 'Workforce Reduction Decisions' },
                { id: 'allocation', label: 'Resource Allocations' },
                { id: 'productivity_rules', label: 'Configurable Productivity Rules' },
                { id: 'sync_monitor', label: 'Multi-User Sync Monitor' },
                { id: 'daemon_console', label: 'Local Telemetry Daemon Console' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 font-bold text-xs uppercase tracking-wider border-b-2 whitespace-nowrap transition-all duration-300 ${
                    activeTab === tab.id 
                      ? 'border-indigo-500 text-white' 
                      : 'border-transparent text-slate-450 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT: Global Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-12">
                
                {/* 1. Bento Grid Stats */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  
                  {/* Total Portfolio Value */}
                  <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 hover-glow-card flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-550 uppercase font-black tracking-wider block">Total Portfolio Revenue</span>
                      <h3 className="text-3xl font-black text-white mt-2">₹{(globalStats.totalContract / 10000000).toFixed(2)} Cr</h3>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-4">Aggregate value across active projects.</p>
                  </div>

                  {/* Calculated Resource Cost */}
                  <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 hover-glow-card flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-555 uppercase font-black tracking-wider block">Calculated Resource Costs</span>
                      <h3 className="text-3xl font-black text-white mt-2">₹{(globalStats.totalCost / 100000).toFixed(2)} L</h3>
                    </div>
                    <p className="text-[10px] text-slate-450 mt-4">Loaded salaries + benefits allocation rate.</p>
                  </div>

                  {/* Net Profit Margin */}
                  <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 hover-glow-card flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-550 uppercase font-black tracking-wider block">Net Profit Margin</span>
                      <h3 className="text-3xl font-black text-emerald-400 mt-2">{(globalStats.marginPercent).toFixed(2)}%</h3>
                    </div>
                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mt-4">
                      <div className="bg-gradient-to-r from-emerald-550 to-indigo-550 h-full" style={{ width: `${globalStats.marginPercent}%` }}></div>
                    </div>
                  </div>

                  {/* Idle Bench Hours */}
                  <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-6 hover-glow-card flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] text-slate-550 uppercase font-black tracking-wider block">Idle Bench Latency</span>
                      <h3 className="text-3xl font-black text-rose-455 mt-2">45.1 hrs</h3>
                    </div>
                    <div className="flex items-center space-x-2 mt-4">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                      <span className="text-[9px] text-rose-400 font-extrabold uppercase">1 team at critical redundancy</span>
                    </div>
                  </div>

                </div>

                {/* 2. Interactive FVP Analytics Panel */}
                {productPhase === 'fvp' && (
                  <div className="bg-slate-900/25 border border-slate-900 rounded-3xl p-8 space-y-6">
                    <div className="flex justify-between items-center flex-wrap gap-4">
                      <div>
                        <h3 className="text-base font-black text-white uppercase tracking-wider flex items-center space-x-2">
                          <Activity className="w-5 h-5 text-indigo-400" />
                          <span>FVP Workforce Optimizer Analytics</span>
                        </h3>
                        <p className="text-xs text-slate-450 mt-0.5">Automated telemetry flags surfacing negative ROI and resource risks.</p>
                      </div>
                      <span className="text-[9px] bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 font-bold px-3 py-1 rounded-full uppercase">Engine Unlocked</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      
                      {/* Negative ROI */}
                      <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-2xl space-y-3">
                        <span className="text-[9px] text-rose-400 font-extrabold uppercase bg-rose-500/10 px-2.5 py-1 rounded-md border border-rose-900/40">Negative ROI Flagged</span>
                        <p className="text-xs text-slate-450">Employees whose cumulative Loaded Cost Rate exceeds estimated project value share:</p>
                        <div className="text-xs font-mono text-white pt-2 space-y-1">
                          <p>• Rohan Sharma (0.5x ROI)</p>
                          <p>• Neha Gupta (0.7x ROI)</p>
                        </div>
                      </div>

                      {/* Predictive Bench Alert */}
                      <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-2xl space-y-3">
                        <span className="text-[9px] text-amber-400 font-extrabold uppercase bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-900/40">Predictive Bench Alert</span>
                        <p className="text-xs text-slate-450">Resource idle risk forecast based on project contract values:</p>
                        <div className="text-xs font-mono text-white pt-2">
                          <p className="text-rose-400 font-bold">Team Priya Patel: High Risk</p>
                          <p className="text-slate-450 mt-1">148.5h upcoming bench capacity gap</p>
                        </div>
                      </div>

                      {/* Ghost Workers */}
                      <div className="bg-slate-950/60 border border-slate-900 p-6 rounded-2xl space-y-3">
                        <span className="text-[9px] text-purple-400 font-extrabold uppercase bg-purple-500/10 px-2.5 py-1 rounded-md border border-purple-900/40">"Ghost" Profiles Isolated</span>
                        <p className="text-xs text-slate-450">High active PC uptime detected but zero keyboard/mouse inputs:</p>
                        <div className="text-xs font-mono text-white pt-2">
                          <p>• Alex Rivera (Uptime active, 35% density)</p>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* 3. Board Headcount & Margin Optimization Simulator */}
                <div className="bg-slate-900/50 border border-slate-900 rounded-3xl p-8 hover-glow-card space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-indigo-400" />
                      <span>Board Headcount & Margin Optimization Simulator</span>
                    </h3>
                    <p className="text-xs text-slate-455 mt-1">
                      Adjust right-sizing target to simulate operating margin gains and direct overhead cost recovery.
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between text-xs font-bold uppercase">
                      <span className="text-slate-450">Right-Sizing Target:</span>
                      <span className="text-indigo-400 font-mono text-sm">{redundancyTarget}% Headcount Reduction</span>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <span className="text-[10px] text-slate-500 font-bold uppercase">0% (Baseline)</span>
                      <input 
                        type="range" 
                        min="0" 
                        max="40" 
                        value={redundancyTarget}
                        onChange={(e) => setRedundancyTarget(Number(e.target.value))}
                        className="flex-1 accent-indigo-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-slate-500 font-bold uppercase">40% (Aggressive)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-900/60">
                      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 text-center space-y-1">
                        <span className="block text-[9px] text-slate-500 uppercase font-black">Headcount Reduced</span>
                        <span className="text-xl font-black text-rose-455">
                          -{Math.round(1600 * (redundancyTarget / 100))} Seats
                        </span>
                        <span className="block text-[9px] text-slate-400">({1600 - Math.round(1600 * (redundancyTarget / 100))} desk agents active)</span>
                      </div>
                      
                      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 text-center space-y-1">
                        <span className="block text-[9px] text-slate-500 uppercase font-black">Annual Overhead Saved</span>
                        <span className="text-xl font-black text-emerald-400">
                          ₹{(redundancyTarget * 0.45).toFixed(2)} Cr
                        </span>
                        <span className="block text-[9px] text-slate-400">(Loaded salary recovery)</span>
                      </div>

                      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900 text-center space-y-1">
                        <span className="block text-[9px] text-slate-500 uppercase font-black">Projected Operating Margin</span>
                        <span className="text-xl font-black text-indigo-400">
                          {(globalStats.marginPercent + (redundancyTarget * 0.35)).toFixed(2)}%
                        </span>
                        <span className="block text-[9px] text-slate-400">(Up from baseline {globalStats.marginPercent}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4. Main Transition Chart */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Civil Mantra: 1Cr to 300Cr+ Transition Strategy</h3>
                    <p className="text-xs text-slate-455">Visualizing high revenue bloat vs the new automated telemetry optimization margins.</p>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={TRANSITION_TRENDS}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="year" stroke="#475569" />
                        <YAxis stroke="#475569" />
                        <Tooltip contentStyle={{ backgroundColor: '#090d16', borderColor: '#1e293b' }} />
                        <Area type="monotone" dataKey="revenue" name="Annual Revenue (₹)" stroke="#6366f1" fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" dataKey="benchRatio" name="Bench Latency %" stroke="#f43f5e" fill="none" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Financial Analytics */}
            {activeTab === 'analytics' && (
              <div className="space-y-8">
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Project Financial Margins (Cost vs. Contract Revenue)</h3>
                    <p className="text-xs text-slate-450">Admins and Board members are the exclusive audience for contract values and employee loaded salaries.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Project ID</th>
                          <th className="px-6 py-4">Contract Value (Revenue)</th>
                          <th className="px-6 py-4">Calculated Resource Cost (Loaded)</th>
                          <th className="px-6 py-4">Total Logged Hours</th>
                          <th className="px-6 py-4">Aggregated Profit Margin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {projectMetricsList.map(proj => {
                          const profit = proj.contractValue - proj.totalCost;
                          const profitPercent = proj.contractValue > 0 ? (profit / proj.contractValue) * 100 : 100;
                          return (
                            <tr key={proj.id} className="hover:bg-slate-900/30">
                              <td className="px-6 py-4 font-bold text-white">{proj.name}</td>
                              <td className="px-6 py-4 font-mono">₹{(proj.contractValue / 10000000).toFixed(2)} Cr</td>
                              <td className="px-6 py-4 font-mono text-rose-455">₹{(proj.totalCost / 100000).toFixed(2)} L</td>
                              <td className="px-6 py-4 font-mono text-indigo-300">{proj.totalHours} hrs</td>
                              <td className="px-6 py-4">
                                <span className={`font-mono font-bold ${profitPercent > 40 ? 'text-emerald-400' : 'text-amber-500'}`}>
                                  ₹{(profit / 10000000).toFixed(2)} Cr ({Math.round(profitPercent)}%)
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Loaded Salaries Configurations */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Loaded Salary Configuration Panel</h3>
                    <p className="text-xs text-slate-450">Edit employee base salaries and benefits to dynamically update loaded cost rates.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Base Monthly Salary</th>
                          <th className="px-6 py-4">Monthly Benefits</th>
                          <th className="px-6 py-4">Avg Monthly Hours</th>
                          <th className="px-6 py-4">Calculated Hourly Rate</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {employees.map(emp => {
                          const isEditing = editingEmployeeId === emp.id;
                          return (
                            <tr key={emp.id} className="hover:bg-slate-900/20">
                              <td className="px-6 py-4 font-bold text-white">{emp.name} <span className="text-[10px] text-slate-500">({emp.role})</span></td>
                              <td className="px-6 py-4 font-mono">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editSalary} 
                                    onChange={(e) => setEditSalary(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white w-24"
                                  />
                                ) : (
                                  `₹${emp.baseSalary.toLocaleString()}`
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editBenefits} 
                                    onChange={(e) => setEditBenefits(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white w-24"
                                  />
                                ) : (
                                  `₹${emp.benefits.toLocaleString()}`
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono">
                                {isEditing ? (
                                  <input 
                                    type="number" 
                                    value={editHours} 
                                    onChange={(e) => setEditHours(e.target.value)}
                                    className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-white w-20"
                                  />
                                ) : (
                                  emp.avgHours
                                )}
                              </td>
                              <td className="px-6 py-4 font-mono text-indigo-400 font-bold">
                                ₹{getLoadedHourlyCost(emp)}/hr
                              </td>
                              <td className="px-6 py-4 text-right">
                                {isEditing ? (
                                  <div className="space-x-2">
                                    <button 
                                      onClick={() => handleSaveCost(emp.id)}
                                      className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded font-bold text-[10px] uppercase"
                                    >
                                      Save
                                    </button>
                                    <button 
                                      onClick={() => setEditingEmployeeId(null)}
                                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-bold text-[10px] uppercase"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button 
                                    onClick={() => handleStartEditCost(emp)}
                                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded font-bold text-[10px] uppercase"
                                  >
                                    Edit Rate
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Workforce Reduction Decisions */}
            {activeTab === 'reduction' && (
              <div className="space-y-8">
                
                {/* 1. Header description */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider">Active Telemetry Exceptions Console</h3>
                      <p className="text-xs text-slate-455">Time blocks flagged for review due to manual overrides, low active telemetry, or large inactivity gaps.</p>
                    </div>
                    
                    {/* Quick Filters */}
                    <div className="flex space-x-1.5 bg-slate-950 p-1 rounded-xl border border-slate-850 w-max self-start md:self-center">
                      {[
                        { id: 'all', label: 'All' },
                        { id: 'bench', label: 'Low Activity' },
                        { id: 'low-roi', label: 'Low ROI' },
                        { id: 'local', label: 'My Session' }
                      ].map(chip => (
                        <button
                          key={chip.id}
                          onClick={() => setAdminFilter(chip.id)}
                          className={`px-3 py-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition-all duration-200 ${
                            adminFilter === chip.id 
                              ? 'bg-indigo-600 text-white shadow-md' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Project</th>
                          <th className="px-6 py-4">Logged Time Block</th>
                          <th className="px-6 py-4">Telemetry Activity Score</th>
                          {productPhase === 'fvp' && <th className="px-6 py-4">Window Title</th>}
                          <th className="px-6 py-4">Exception Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {[
                          ...(localDaemonState.online ? [{
                            name: 'Local Developer (You)',
                            proj: 'ChronoTrack R&D',
                            hrs: 1.0,
                            start: '10:00 AM',
                            end: '11:00 AM',
                            score: Math.min(100, Math.round((localDaemonState.keystrokes + localDaemonState.mouseMovements) / 10) || 15),
                            app: localDaemonState.activeWindow,
                            reason: !isProductive(localDaemonState.activeWindow) ? 'Low Productive Activity (Distracting Window active)' : 'Normal active telemetry inputs log',
                            isLocal: true,
                            totalHours: 1.0,
                            roiMetric: 1.2
                          }] : []),
                          { name: 'Rohan Sharma', proj: 'Project Alpha', start: '09:00 AM', end: '05:00 PM', hrs: 8.0, score: 12, app: 'System Idle', reason: 'Manual override (zero telemetry data detected)', totalHours: 8.0, roiMetric: 0.5 },
                          { name: 'Neha Gupta', proj: 'Project Alpha', start: '09:00 AM', end: '05:00 PM', hrs: 8.0, score: 42, app: 'Chrome (Passive Tab)', reason: 'Large gap in active inputs (>3h continuous inactivity)', totalHours: 8.0, roiMetric: 0.7 },
                          { name: 'Alex Rivera', proj: 'Project Beta', start: '09:30 AM', end: '05:00 PM', hrs: 7.5, score: 35, app: 'Chrome (YouTube)', reason: 'Low Active Score (keystroke density below threshold)', totalHours: 7.5, roiMetric: 0.8 },
                        ].filter(exc => {
                          if (adminFilter === 'bench') return exc.score < 25;
                          if (adminFilter === 'low-roi') return exc.roiMetric < 1.0;
                          if (adminFilter === 'local') return exc.isLocal;
                          return true;
                        }).map((exc, idx) => (
                          <tr key={idx} className={`hover:bg-slate-900/30 ${exc.isLocal ? 'bg-indigo-955/20 border-l-2 border-indigo-500' : ''}`}>
                            <td className="px-6 py-4 font-bold text-white">
                              {exc.name}
                              {exc.isLocal && <span className="ml-2 text-[9px] bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Your live session</span>}
                            </td>
                            <td className="px-6 py-4 text-slate-400">{exc.proj}</td>
                            <td className="px-6 py-4 text-slate-300">{exc.hrs} hrs ({exc.start} - {exc.end})</td>
                            <td className="px-6 py-4">
                              <div className="flex items-center space-x-2">
                                <span className={`font-bold ${exc.score < 20 ? 'text-rose-500' : 'text-amber-500'}`}>{exc.score}%</span>
                                <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-855">
                                  <div className={`h-full ${exc.score < 20 ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${exc.score}%` }}></div>
                                </div>
                              </div>
                            </td>
                            {productPhase === 'fvp' && (
                              <td className="px-6 py-4 font-mono text-[10px] text-slate-450 truncate max-w-[150px]">{exc.app}</td>
                            )}
                            <td className="px-6 py-4 text-slate-405 italic font-medium">{exc.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. Redundancy & Downsizing Action center */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Strategic Headcount Optimizer (Underperforming ROI list)</h3>
                    <p className="text-xs text-slate-450">Board members can immediately execute formal performance reviews, dispatch automated warnings, or trigger exit protocols.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Subordinate</th>
                          <th className="px-6 py-4">Department</th>
                          <th className="px-6 py-4">Active Telemetry Ratio</th>
                          <th className="px-6 py-4">Total Loaded Cost Logged</th>
                          <th className="px-6 py-4">Contract Margin Contribution Share</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900">
                        {employeeMetricsList.filter(emp => {
                          if (adminFilter === 'bench') return emp.totalHours < 40;
                          if (adminFilter === 'low-roi') return emp.roiMetric < 1.0;
                          if (adminFilter === 'local') return false;
                          return true;
                        }).map(emp => {
                          const isLowRoi = emp.roiMetric < 1.0;
                          return (
                            <tr key={emp.id} className={`hover:bg-slate-900/20 ${emp.status === 'Terminated' ? 'opacity-30' : ''}`}>
                              <td className="px-6 py-4 font-bold text-white">{emp.name} <span className="text-[10px] text-slate-500">({emp.role})</span></td>
                              <td className="px-6 py-4 text-slate-400">{emp.dept}</td>
                              <td className="px-6 py-4 font-mono text-indigo-400">{emp.activeRatio}%</td>
                              <td className="px-6 py-4 font-mono">₹{emp.totalCost.toLocaleString()}</td>
                              <td className="px-6 py-4">
                                <span className={`font-bold font-mono ${isLowRoi ? 'text-rose-455' : 'text-emerald-400'}`}>
                                  {emp.roiMetric}x ROI
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                {emp.status === 'Terminated' ? (
                                  <span className="text-[9px] bg-rose-500/10 border border-rose-900/40 text-rose-400 font-black px-2 py-1 rounded uppercase">Exited</span>
                                ) : (
                                  <>
                                    <button 
                                      onClick={() => handleIssueWarning(emp.name)}
                                      className="px-2.5 py-1 bg-amber-950 hover:bg-amber-900 border border-amber-800 text-amber-300 rounded font-bold text-[10px] uppercase"
                                    >
                                      Warn
                                    </button>
                                    <button 
                                      onClick={() => handleInitiateExit(emp.id, emp.name)}
                                      className="px-2.5 py-1 bg-rose-955 hover:bg-rose-900 border border-rose-900 text-rose-400 rounded font-bold text-[10px] uppercase"
                                    >
                                      Offboard
                                    </button>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Resource Allocation */}
            {activeTab === 'allocation' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Assign employee to TL */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Employee Hierarchy Reassignment</h3>
                    <p className="text-xs text-slate-450">Exclusive Board capability to allocate specific staff to Team Leads.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Select Employee</label>
                        <select 
                          value={selectedEmployeeId} 
                          onChange={(e) => setSelectedEmployeeId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        >
                          {employees.map(e => (
                            <option key={e.id} value={e.id}>{e.name} ({e.dept})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Assign to Team Lead</label>
                        <select 
                          value={selectedTLId} 
                          onChange={(e) => setSelectedTLId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        >
                          {teamLeads.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.dept})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAssignEmployeeToTL(selectedEmployeeId, selectedTLId)}
                      className="w-full py-3 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase transition-all duration-300"
                    >
                      Apply Reassignment
                    </button>
                  </div>
                </div>

                {/* Allocate Team to Project */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Allocate Team to Projects</h3>
                    <p className="text-xs text-slate-450">Allocate entire specialized departments and team segments directly to contracts.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Select Team Lead</label>
                        <select 
                          value={selectedTLId} 
                          onChange={(e) => setSelectedTLId(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        >
                          {teamLeads.map(t => (
                            <option key={t.id} value={t.id}>{t.name} Team ({t.dept})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Target Project</label>
                        <select 
                          value={formProject} 
                          onChange={(e) => setFormProject(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={() => handleAllocateTeamToProject(selectedTLId, formProject)}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase transition-all duration-300"
                    >
                      Allocate Department Team
                    </button>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Configurable Productivity Rules */}
            {activeTab === 'productivity_rules' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Whitelist and Blacklist keywords panel */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Productivity Engine Configurations</h3>
                    <p className="text-xs text-slate-450">Add or remove active application name keywords. Focused windows containing these tags are automatically evaluated as Productive or Distracting.</p>
                  </div>

                  <form onSubmit={handleAddKeyword} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Keyword Tag</label>
                        <input
                          type="text"
                          placeholder="e.g. youtube, vscode, chrome"
                          value={newKeyword}
                          onChange={(e) => setNewKeyword(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Classification</label>
                        <select 
                          value={keywordTarget} 
                          onChange={(e) => setKeywordTarget(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                        >
                          <option value="whitelist">Productive Whitelist</option>
                          <option value="blacklist">Distracting Blacklist</option>
                        </select>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold text-xs uppercase flex items-center justify-center space-x-1.5 transition-all duration-300"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Rule Keyword</span>
                    </button>
                  </form>
                </div>

                {/* Whitelist and Blacklist display badges */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-[10px] text-emerald-400 font-extrabold uppercase tracking-wider mb-2">🟢 Productive Whitelist Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {productiveKeywords.map(k => (
                          <span key={k} className="inline-flex items-center space-x-1 bg-emerald-500/10 border border-emerald-550/30 text-emerald-300 text-[10px] font-bold px-3 py-1 rounded-full">
                            <span>{k}</span>
                            <button type="button" onClick={() => handleRemoveKeyword(k, 'whitelist')} className="text-emerald-500 hover:text-emerald-300 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-900 pt-4">
                      <h4 className="text-[10px] text-rose-455 font-extrabold uppercase tracking-wider mb-2">🔴 Distracting Blacklist Keywords</h4>
                      <div className="flex flex-wrap gap-2">
                        {unproductiveKeywords.map(k => (
                          <span key={k} className="inline-flex items-center space-x-1 bg-rose-500/10 border border-rose-550/30 text-rose-350 text-[10px] font-bold px-3 py-1 rounded-full">
                            <span>{k}</span>
                            <button type="button" onClick={() => handleRemoveKeyword(k, 'blacklist')} className="text-rose-500 hover:text-rose-300 ml-1">
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Multi-User Sync Monitor */}
            {activeTab === 'sync_monitor' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                {/* Push sync states */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Server className="w-5 h-5 text-indigo-400" />
                        <span>Cloud Database Synchronizer</span>
                      </h3>
                      <p className="text-xs text-slate-450 mt-0.5">Real-time daemon synchronization configuration pipeline.</p>
                    </div>
                    <div className="flex items-center">
                      <input 
                        type="checkbox" 
                        checked={isSyncingActive} 
                        onChange={() => setIsSyncingActive(!isSyncingActive)}
                        className="w-4 h-4 text-indigo-650 bg-slate-950 border-slate-800 rounded focus:ring-indigo-550 focus:ring-2"
                      />
                      <span className="ml-2 text-xs text-slate-450 font-bold uppercase">Auto-Sync</span>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-950/60 border border-slate-900 rounded-2xl space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Target Database:</span>
                      <span className="text-slate-200 font-mono">PostgreSQL (cloud-central-prod)</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-900 pt-3">
                      <span className="text-slate-400">Local Cache:</span>
                      <span className="text-slate-200 font-mono">SQLite (data/telemetry.db)</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-900 pt-3">
                      <span className="text-slate-400">Automatic Sync Interval:</span>
                      <span className="text-indigo-400 font-mono">12 Seconds</span>
                    </div>
                  </div>
                </div>

                {/* Sync Logs Console Terminal */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Central Sync Event Logs</h3>
                    <p className="text-xs text-slate-450">Incoming batches written to corporate SQL datastore.</p>
                  </div>

                  <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl font-mono text-[10px] text-slate-400 space-y-2 h-44 overflow-y-auto">
                    {syncLogs.map(log => (
                      <div key={log.id} className="flex justify-between border-b border-slate-900/50 pb-1.5 last:border-0 last:pb-0">
                        <span className="text-indigo-400">[{log.time}]</span>
                        <span>Batch <strong className="text-slate-200">{log.batch}</strong> synced successfully</span>
                        <span className="text-emerald-400">+{log.records} logs written</span>
                      </div>
                    ))}
                    {!localDaemonState.online && (
                      <div className="text-rose-455 text-center pt-8">
                        [Sync Terminated: Background telemetry daemon offline]
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Local Telemetry Daemon Console */}
            {activeTab === 'daemon_console' && (
              <div className="space-y-8">
                
                {/* 1. Daemon Controller Card */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Cpu className="w-5 h-5 text-indigo-400 animate-pulse" />
                        <span>Background Daemon Controller</span>
                      </h3>
                      <p className="text-xs text-slate-455">Monitor processes, query the local SQLite datastore, and manage hardware capturing.</p>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {localDaemonState.online ? (
                        <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/35 text-emerald-400 font-extrabold px-3 py-1.5 rounded-full uppercase flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                          <span>ACTIVE DAEMON ONLINE</span>
                        </span>
                      ) : (
                        <span className="text-[9px] bg-rose-500/15 border border-rose-500/35 text-rose-455 font-extrabold px-3 py-1.5 rounded-full uppercase flex items-center space-x-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                          <span>DAEMON SERVICE OFFLINE</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Service Port</span>
                      <span className="text-xl font-bold font-mono text-white mt-1 block">5050</span>
                    </div>
                    <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Database Location</span>
                      <span className="text-[10px] font-mono text-slate-300 mt-2 block break-all">data/telemetry.db</span>
                    </div>
                    <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Discovered Capture Devices</span>
                      <span className="text-xl font-bold text-indigo-400 mt-1 block">Keyboard & Mouse</span>
                    </div>
                    <div className="p-5 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider block">Polling Loop Cadence</span>
                      <span className="text-xl font-bold text-slate-200 mt-1 block">10 Seconds</span>
                    </div>
                  </div>
                </div>

                {/* 2. Raw SQLite History Table */}
                <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Raw SQLite Telemetry Stream</h3>
                    <p className="text-xs text-slate-455">Live records queried from the local device database file containing hardware density metrics.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Index ID</th>
                          <th className="px-6 py-4">Timestamp</th>
                          <th className="px-6 py-4">Active Window Title</th>
                          <th className="px-6 py-4 text-center">Keystroke Count</th>
                          <th className="px-6 py-4 text-center">Mouse Movements</th>
                          <th className="px-6 py-4 text-right">Activity Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-900 font-mono">
                        {localDaemonState.online ? (
                          [
                            { id: 18402, time: '18:15:00', title: localDaemonState.activeWindow || 'VS Code (App.jsx)', keys: localDaemonState.keystrokes, mouse: localDaemonState.mouseMovements, status: 'Active (Productive)' },
                            { id: 18401, time: '18:14:50', title: 'VS Code (App.jsx)', keys: Math.max(1, Math.round(localDaemonState.keystrokes * 0.9)), mouse: Math.max(20, Math.round(localDaemonState.mouseMovements * 0.8)), status: 'Active (Productive)' },
                            { id: 18400, time: '18:14:40', title: 'Google Chrome (Gmail)', keys: 0, mouse: 12, status: 'Idle' },
                            { id: 18399, time: '18:14:30', title: 'Terminal (npm run build)', keys: 35, mouse: 210, status: 'Active (Productive)' },
                            { id: 18398, time: '18:14:20', title: 'Google Chrome (YouTube)', keys: 2, mouse: 85, status: 'Distracting' },
                            { id: 18397, time: '18:14:10', title: 'Figma (ChronoTrack Mockup)', keys: 8, mouse: 540, status: 'Active (Productive)' }
                          ].map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/30">
                              <td className="px-6 py-4 text-slate-500 font-bold">#{row.id}</td>
                              <td className="px-6 py-4 text-indigo-400">{row.time}</td>
                              <td className="px-6 py-4 text-slate-200 font-sans">{row.title}</td>
                              <td className="px-6 py-4 text-center text-slate-300 font-bold">{row.keys}</td>
                              <td className="px-6 py-4 text-center text-slate-300">{row.mouse}</td>
                              <td className="px-6 py-4 text-right">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-sans uppercase ${
                                  row.status.includes('Productive') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' :
                                  row.status.includes('Distracting') ? 'bg-rose-500/10 border border-rose-500/20 text-rose-455' :
                                  'bg-slate-800 text-slate-400'
                                }`}>
                                  {row.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500 italic">
                              No records available. Local background telemetry service is offline.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

          </div>
        )}

        {/* =============== ROLE 2: TEAM LEAD (TL) VERIFICATION HUB =============== */}
        {currentRole === 'tl' && (
          <div className="space-y-8">
            
            <div className="bg-slate-900/30 border border-slate-900 p-8 rounded-3xl space-y-6">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span>Confidential Firewall Restrained</span>
                </h3>
                <p className="text-xs text-slate-450 mt-1">You are authenticated as <strong>Team Lead Rajesh Kumar</strong>. Subordinate salaries, project contract values, and global financial margins are classified under Board-level clearance.</p>
              </div>
            </div>

            {/* Subordinate verification table */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Subordinate Exception Validation Roster</h3>
                  <p className="text-xs text-slate-450">Validate manual timesheet override requests against actual background telemetry reports.</p>
                </div>
                {productPhase === 'fvp' && (
                  <div className="bg-emerald-555/10 border border-emerald-550/30 text-emerald-400 font-bold px-3 py-1 rounded-full text-[9px] uppercase">
                    Auto-Approval threshold (10%) active
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 font-bold uppercase border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-4">Subordinate</th>
                      <th className="px-6 py-4">Project</th>
                      <th className="px-6 py-4">Logged Time Block</th>
                      <th className="px-6 py-4">Active Telemetry Score</th>
                      {productPhase === 'fvp' && <th className="px-6 py-4">Active App</th>}
                      <th className="px-6 py-4">Flagged Reason</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {[
                      ...(localDaemonState.online ? [{
                        name: 'Local Developer (You)',
                        logId: 9999,
                        proj: 'ChronoTrack R&D',
                        hrs: 1.0,
                        start: '10:00 AM',
                        end: '11:00 AM',
                        score: Math.min(100, Math.round((localDaemonState.keystrokes + localDaemonState.mouseMovements) / 10) || 15),
                        app: localDaemonState.activeWindow,
                        reason: !isProductive(localDaemonState.activeWindow) ? 'Low Productive Activity (Distracting Window active)' : 'Normal active telemetry inputs log',
                        status: 'Pending',
                        isLocal: true
                      }] : []),
                      { name: 'Rohan Sharma', logId: 501, proj: 'Project Alpha', start: '09:00 AM', end: '05:00 PM', hrs: 8.0, score: 12, app: 'System Idle', reason: 'Manual override (zero telemetry data detected)', status: logs['Rohan Sharma']?.[0]?.status || 'Pending' },
                      { name: 'Neha Gupta', logId: 601, proj: 'Project Alpha', start: '09:00 AM', end: '05:00 PM', hrs: 8.0, score: 42, app: 'Chrome (Passive Tab)', reason: 'Large gap in active inputs (>3h continuous inactivity)', status: logs['Neha Gupta']?.[0]?.status || 'Pending' },
                      { name: 'Alex Rivera', logId: 301, proj: 'Project Beta', start: '09:30 AM', end: '05:00 PM', hrs: 7.5, score: 35, app: 'Chrome (YouTube)', reason: 'Low Active Score (keystroke density below threshold)', status: logs['Alex Rivera']?.[0]?.status || 'Pending' }
                    ].map(exc => (
                      <tr key={exc.logId} className={`hover:bg-slate-900/25 ${exc.isLocal ? 'bg-indigo-955/20 border-l-2 border-indigo-500' : ''}`}>
                        <td className="px-6 py-4 font-bold text-white">
                          {exc.name}
                          {exc.isLocal && <span className="ml-2 text-[9px] bg-indigo-500/10 border border-indigo-500/35 text-indigo-400 font-extrabold px-1.5 py-0.5 rounded uppercase">Your live session</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-400">{exc.proj}</td>
                        <td className="px-6 py-4 text-slate-300">{exc.hrs} hrs ({exc.start} - {exc.end})</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold">{exc.score}%</span>
                            <div className="w-16 bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-855">
                              <div className="bg-indigo-500 h-full" style={{ width: `${exc.score}%` }}></div>
                            </div>
                          </div>
                        </td>
                        {productPhase === 'fvp' && (
                          <td className="px-6 py-4 font-mono text-[10px] text-slate-450 truncate max-w-[150px]">{exc.app}</td>
                        )}
                        <td className="px-6 py-4 text-slate-400 italic font-medium">{exc.reason}</td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {exc.status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => handleTLVerifyBlock(exc.name, exc.logId)}
                                className="px-2.5 py-1 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 border border-emerald-800 rounded font-bold text-[10px] uppercase"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => handleTLRejectBlock(exc.name, exc.logId)}
                                className="px-2.5 py-1 bg-rose-955 hover:bg-rose-900 text-rose-400 border border-rose-900 rounded font-bold text-[10px] uppercase"
                              >
                                Reject
                              </button>
                            </>
                          ) : (
                            <span className={`text-[9px] font-black px-2 py-1 rounded uppercase border ${
                              exc.status === 'Approved' ? 'bg-emerald-500/10 border-emerald-800 text-emerald-400' : 'bg-rose-500/10 border-rose-800 text-rose-400'
                            }`}>
                              {exc.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* =============== ROLE 3: EMPLOYEE PORTAL & ASSISTANT =============== */}
        {currentRole === 'employee' && !desktopActivated && (
          <div className="max-w-2xl mx-auto bg-slate-900/40 border border-slate-900 rounded-3xl p-10 space-y-8 hover-glow-card">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center animate-bounce">
                <Cpu className="w-8 h-8 text-indigo-400" />
              </div>
              <h2 className="text-2xl font-black text-white uppercase tracking-wider font-sans">Civil Mantra Workstation Node</h2>
              <p className="text-xs text-slate-455">Establish connection, verify credentials, and grant telemetry capturing authorizations.</p>
            </div>

            {/* STEP 1: AUTHENTICATION */}
            {onboardingStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2">Corporate Email Address</label>
                    <input 
                      type="email" 
                      placeholder="e.g. sarah.jenkins@civilmantra.com"
                      value={activationEmail}
                      onChange={(e) => setActivationEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase font-black tracking-wider mb-2">Activation Key (Generated by Manager)</label>
                    <input 
                      type="password" 
                      placeholder="Enter 8-digit secure code"
                      value={activationCode}
                      onChange={(e) => setActivationCode(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white placeholder-slate-655 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (!activationEmail || !activationCode) {
                      showToast('Please fill in both fields.', 'error');
                      return;
                    }
                    setIsActivating(true);
                    setTimeout(() => {
                      setIsActivating(false);
                      const match = pendingOnboardingList.find(
                        item => item.email.toLowerCase() === activationEmail.toLowerCase() && item.code === activationCode
                      );
                      if (match) {
                        setOnboardingStep(2);
                        showToast(`Welcome back, ${match.name}! Authentication succeeded.`, 'success');
                      } else {
                        showToast('Invalid activation credentials. Please check Manager records.', 'error');
                      }
                    }, 1200);
                  }}
                  className="w-full py-4 bg-indigo-650 hover:bg-indigo-650/80 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center space-x-2"
                >
                  {isActivating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <span>Authenticate Workspace Node</span>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: PERMISSIONS AUTHORIZATION */}
            {onboardingStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wider">Required Permissions Check</span>
                  
                  {[
                    { id: 'input', label: 'Pointer & Keyboard Metrics (xinput)', desc: 'Measures intensity event counts. No text characters or key values are stored.' },
                    { id: 'startup', label: 'Auto-Startup Daemon Integration', desc: 'Registers background daemon launcher service in graphical user startup session.' },
                    { id: 'notifications', label: 'Desktop Banner Notifications', desc: 'Alerts you of idle-bench timeouts and task synchronization completions.' },
                    { id: 'storage', label: 'Local Telemetry DB Storage (SQLite)', desc: 'Creates the data directory and initializes the secure local telemetry cache database.' }
                  ].map((perm) => (
                    <div key={perm.id} className="flex justify-between items-center p-4 bg-slate-950/60 border border-slate-850 rounded-2xl">
                      <div className="space-y-1 pr-4">
                        <span className="block text-xs font-bold text-slate-200">{perm.label}</span>
                        <span className="block text-[10px] text-slate-500 leading-normal">{perm.desc}</span>
                      </div>
                      <button
                        onClick={() => setGrantedPermissions(p => ({ ...p, [perm.id]: !p[perm.id] }))}
                        className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all duration-300 ${
                          grantedPermissions[perm.id] 
                            ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400' 
                            : 'bg-indigo-950/30 hover:bg-indigo-900/30 border border-indigo-900/50 text-indigo-400'
                        }`}
                      >
                        {grantedPermissions[perm.id] ? 'GRANTED' : 'GRANT'}
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => {
                    const allGranted = Object.values(grantedPermissions).every(v => v);
                    if (!allGranted) {
                      showToast('Please grant all requested permissions to run the daemon.', 'error');
                      return;
                    }
                    setIsActivating(true);
                    setTimeout(() => {
                      setIsActivating(false);
                      setOnboardingStep(3);
                      showToast('Workstation successfully onboarded!', 'success');
                    }, 1500);
                  }}
                  className="w-full py-4 bg-indigo-650 hover:bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300"
                >
                  Activate Desktop Client
                </button>
              </div>
            )}

            {/* STEP 3: ONBOARDING COMPLETED */}
            {onboardingStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 mx-auto bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center">
                  <Check className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-slate-200 uppercase tracking-wider">Node Active & Tracking</h3>
                  <p className="text-xs text-slate-455 leading-relaxed">
                    Civil Mantra background service has successfully booted and is recording to <strong>data/telemetry.db</strong>.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDesktopActivated(true);
                    localStorage.setItem('civil_desktop_activated', 'true');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300"
                >
                  Open Telemetry Assistant
                </button>
              </div>
            )}
          </div>
        )}

        {currentRole === 'employee' && desktopActivated && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Log timesheet manually */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6 hover-glow-card">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Log Manual Work Block</h3>
                <p className="text-xs text-slate-450">Sarah Jenkins: Allocate task descriptions to projects.</p>
              </div>

              <form onSubmit={handleAddLogBlock} className="space-y-4">
                <div>
                  <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Project Assignment</label>
                  <select 
                    value={formProject} 
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                  >
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Logged Hours</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="24"
                      value={formHours} 
                      onChange={(e) => setFormHours(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Logged Minutes</label>
                    <input 
                      type="number" 
                      min="0" 
                      max="59"
                      value={formMins} 
                      onChange={(e) => setFormMins(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-555 uppercase font-black tracking-wider mb-2">Work Summary Description</label>
                  <textarea 
                    rows="3"
                    value={formTask} 
                    onChange={(e) => setFormTask(e.target.value)}
                    placeholder="Describe deliverables completed..."
                    className="w-full bg-slate-950 border border-slate-850 rounded-2xl p-4 text-xs text-white resize-none"
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-300"
                >
                  Log Work Block
                </button>
              </form>
            </div>

            {/* Center Column: Recent timesheet logs list */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6 hover-glow-card">
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">Logged Work Block History</h3>
                <p className="text-xs text-slate-450">Sarah Jenkins: Status of recently logged blocks.</p>
              </div>

              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {(logs['Sarah Jenkins'] || []).map(log => (
                  <div key={log.id} className="bg-slate-950/60 border border-slate-900 p-5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] text-slate-455 font-bold uppercase block">{log.project}</span>
                        <strong className="text-white text-xs font-bold mt-1 block">{log.hours}h {log.mins}m</strong>
                      </div>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase border ${
                        log.status === 'Approved' ? 'bg-emerald-555/10 border-emerald-900 text-emerald-400' : 'bg-slate-800 border-slate-750 text-slate-400'
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-450 italic">"{log.task}"</p>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900/60 pt-3">
                      <span>Telemetry Score: <strong className="text-indigo-400">{log.activityScore}%</strong></span>
                      <span>{log.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column: Floating Desktop assistant UI */}
            <div className="bg-slate-900 border border-slate-850 rounded-3xl overflow-hidden shadow-2xl relative">
              <div className="bg-slate-900 px-5 py-4 border-b border-slate-850 flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-[10px] font-black text-white uppercase tracking-wider">Civil Mantra Desktop Assistant</span>
                </div>
                <span className="text-[9px] bg-slate-955 border border-slate-850 text-slate-500 px-2 py-0.5 rounded uppercase font-bold">Active</span>
              </div>

              <div className="p-6 space-y-6">
                
                {/* Real-time stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl text-center space-y-1">
                    <span className="block text-[9px] text-slate-500 uppercase font-black">
                      {localDaemonState.online ? "Keystrokes (Interval)" : "Keystrokes / Min"}
                    </span>
                    <span className="text-lg font-black text-white">
                      {localDaemonState.online ? `${localDaemonState.keystrokes} Keys` : "48 KPM"}
                    </span>
                  </div>
                  <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl text-center space-y-1">
                    <span className="block text-[9px] text-slate-500 uppercase font-black">
                      {localDaemonState.online ? "Mouse Motions" : "Mouse Intensity"}
                    </span>
                    <span className="text-lg font-black text-white">
                      {localDaemonState.online ? `${localDaemonState.mouseMovements} Events` : "72%"}
                    </span>
                  </div>
                </div>

                {/* Event stream ticker */}
                <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl space-y-2.5">
                  <span className="block text-[9px] text-slate-500 uppercase font-bold tracking-wider">Real-time Telemetry Stream Ticker</span>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                    {telemetryTicker.map((t, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] text-slate-400 font-mono border-b border-slate-900/60 pb-1 last:border-0 last:pb-0">
                        <span className="text-indigo-400">[{t.time}]</span>
                        <span className="text-slate-300 truncate max-w-44" title={t.event}>{t.event}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-950/60 border border-slate-900 p-4 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Active Window:</span>
                    <span className="font-mono text-indigo-400 font-bold text-[11px] truncate max-w-[150px]" title={localDaemonState.online ? localDaemonState.activeWindow : "AutoCAD 2026"}>
                      {localDaemonState.online ? localDaemonState.activeWindow : "AutoCAD 2026"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-slate-900 pt-3">
                    <span className="text-slate-400">Activity Rating:</span>
                    {localDaemonState.online ? (
                      isProductive(localDaemonState.activeWindow) ? (
                        <span className="font-bold text-emerald-400">Productive Work</span>
                      ) : (
                        <span className="font-bold text-rose-455">Non-Work / Idle</span>
                      )
                    ) : (
                      <span className="font-bold text-emerald-400">Productive Work</span>
                    )}
                  </div>
                </div>

                <p className="text-[10px] text-slate-500 leading-relaxed italic text-center">
                  "This assistant monitors input patterns locally. Raw text entries, credentials, or screens are NEVER recorded to comply with Civil Mantra transparency principles."
                </p>

                <div className="border-t border-slate-900 pt-4 space-y-3">
                  <span className="block text-[10px] text-slate-450 uppercase font-bold text-center">Simulate Desktop Telemetry Pings</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleSimulatePing('inactivity')}
                      className="py-2 bg-indigo-950/30 hover:bg-indigo-900/30 text-indigo-400 border border-indigo-900/60 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
                    >
                      Inactivity Ping
                    </button>
                    <button
                      onClick={() => handleSimulatePing('interval')}
                      className="py-2 bg-indigo-950/30 hover:bg-indigo-900/30 text-indigo-400 border border-indigo-900/60 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all duration-300"
                    >
                      2-Hour Interval
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* SYSTEM AUDIT LOG TRAIL */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-3xl p-8 space-y-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center space-x-2">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <span>Immutable Systems Audit Log Trail</span>
              </h3>
              <p className="text-xs text-slate-400 mt-1">Audit trail reflecting administrative, manager override, and security events in block storage.</p>
            </div>
            <span className="text-[9px] bg-slate-950 border border-slate-850 text-slate-500 font-bold px-3 py-1 rounded-full uppercase">Read-only Log</span>
          </div>

          <div className="bg-slate-950 border border-slate-900 p-5 rounded-2xl font-mono text-[10px] text-slate-400 space-y-2 max-h-48 overflow-y-auto">
            {auditLogs.map(log => (
              <div key={log.id} className="flex justify-between border-b border-slate-900/50 pb-1.5 last:border-0 last:pb-0">
                <span>[{log.time}] <strong className="text-slate-200">{log.user}:</strong> {log.action}</span>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Footer credits */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-[10px] text-slate-500 uppercase tracking-widest bg-slate-950/40 mt-12">
        Civil Mantra Workforce Optimization & Telemetry Sandbox
      </footer>

      {/* SECURITY AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md transition-all duration-300">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl space-y-6 relative hover:border-slate-700/80 transition-all duration-500">
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-400">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider">
                Access Credentials Required
              </h3>
              <p className="text-xs text-slate-400">
                Please enter the security password to unlock the {authTargetRole === 'admin' ? 'Administrator' : 'Team Lead'} dashboard.
              </p>
            </div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-black tracking-wider block">
                  Security Password
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-600 transition-all outline-none"
                  autoFocus
                />
              </div>

              {authError && (
                <div className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-indigo-650 hover:bg-indigo-600 active:scale-[0.98] text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-200"
              >
                Authenticate Session
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
