import React, { useState, useEffect } from 'react';
import { 
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
  Info,
  LayoutDashboard,
  Sliders,
  Key,
  LogOut,
  Clock,
  Edit2,
  Eye,
  AlertTriangle,
  Mail,
  ChevronDown
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
  Bar,
  LineChart,
  Line
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
  const isEmployeeOnlyMode = new URLSearchParams(window.location.search).get('app') === 'employee';

  // Navigation / Routing State: 'landing' | 'login' | 'admin' | 'tl' | 'employee'
  const [currentRole, setCurrentRole] = useState(() => {
    if (isEmployeeOnlyMode) return 'employee';
    const saved = localStorage.getItem('civil_role');
    return saved || 'landing';
  });

  const [activeAdminTab, setActiveAdminTab] = useState('overview'); // 'overview' | 'users' | 'provision' | 'rules' | 'audit'
  const [activeTlTab, setActiveTlTab] = useState('overview'); // 'overview' | 'members' | 'timesheets'

  // Global Session Authentication State
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('civil_session_token') || '');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginRole, setLoginRole] = useState('admin'); // 'admin' | 'tl' | 'employee'
  const [loginError, setLoginError] = useState('');

  // Core Data Lists (loaded from localStorage or defaults)
  const [employees, setEmployees] = useState(() => {
    const saved = localStorage.getItem('civil_employees');
    return saved ? JSON.parse(saved) : INITIAL_EMPLOYEES;
  });

  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('civil_projects');
    return saved ? JSON.parse(saved) : INITIAL_PROJECTS;
  });

  const [teamLeads, setTeamLeads] = useState(() => {
    const saved = localStorage.getItem('civil_team_leads');
    return saved ? JSON.parse(saved) : INITIAL_TEAM_LEADS;
  });

  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem('civil_logs');
    return saved ? JSON.parse(saved) : INITIAL_LOGS;
  });

  const [auditLogs, setAuditLogs] = useState(() => {
    const saved = localStorage.getItem('civil_audit');
    return saved ? JSON.parse(saved) : AUDIT_LOGS;
  });

  // Sync Log Simulator
  const [syncLogs, setSyncLogs] = useState([
    { id: 1, time: '10:00:00 AM', status: 'Success', batch: 'CM-4912', records: 12 },
    { id: 2, time: '09:00:00 AM', status: 'Success', batch: 'CM-1823', records: 8 }
  ]);

  // Toast & Notifications State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const logAudit = (user, action) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setAuditLogs(prev => [
      { id: Date.now(), user, action, time: timeStr },
      ...prev
    ]);
  };

  // Sync local data changes to localStorage
  useEffect(() => {
    localStorage.setItem('civil_employees', JSON.stringify(employees));
  }, [employees]);

  useEffect(() => {
    localStorage.setItem('civil_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('civil_team_leads', JSON.stringify(teamLeads));
  }, [teamLeads]);

  useEffect(() => {
    localStorage.setItem('civil_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('civil_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Session Token Validation on Mount
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
          } else {
            setCurrentRole(savedRole);
          }
        } catch (err) {
          console.warn('Session verification skipped offline.');
        }
      }
    };
    verifySession();
  }, []);

  // Productivity Rule Configurations
  const [productiveKeywords, setProductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_productive_keys');
    return saved ? JSON.parse(saved) : ['vscode', 'terminal', 'autocad', 'revit', 'excel', 'chronotrack', 'app.tsx', 'code', 'github', 'dev'];
  });
  
  const [unproductiveKeywords, setUnproductiveKeywords] = useState(() => {
    const saved = localStorage.getItem('civil_unproductive_keys');
    return saved ? JSON.parse(saved) : ['youtube', 'facebook', 'twitter', 'netflix', 'game', 'gaming', 'social', 'idle', 'unknown'];
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [keywordTarget, setKeywordTarget] = useState('whitelist');

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const cleanKey = newKeyword.trim().toLowerCase();
    if (keywordTarget === 'whitelist') {
      if (productiveKeywords.includes(cleanKey)) return;
      const updated = [...productiveKeywords, cleanKey];
      setProductiveKeywords(updated);
      localStorage.setItem('civil_productive_keys', JSON.stringify(updated));
      logAudit('Admin', `Added "${cleanKey}" to Whitelist rules.`);
      showToast(`Added "${cleanKey}" to Whitelist.`, 'success');
    } else {
      if (unproductiveKeywords.includes(cleanKey)) return;
      const updated = [...unproductiveKeywords, cleanKey];
      setUnproductiveKeywords(updated);
      localStorage.setItem('civil_unproductive_keys', JSON.stringify(updated));
      logAudit('Admin', `Added "${cleanKey}" to Blacklist rules.`);
      showToast(`Added "${cleanKey}" to Blacklist.`, 'success');
    }
    setNewKeyword('');
  };

  const removeKeyword = (key, target) => {
    if (target === 'whitelist') {
      const updated = productiveKeywords.filter(k => k !== key);
      setProductiveKeywords(updated);
      localStorage.setItem('civil_productive_keys', JSON.stringify(updated));
      logAudit('Admin', `Removed "${key}" from Whitelist rules.`);
    } else {
      const updated = unproductiveKeywords.filter(k => k !== key);
      setUnproductiveKeywords(updated);
      localStorage.setItem('civil_unproductive_keys', JSON.stringify(updated));
      logAudit('Admin', `Removed "${key}" from Blacklist rules.`);
    }
    showToast(`Removed rule: ${key}`, 'info');
  };

  // Local Daemon Polling Loop
  const [localDaemonState, setLocalDaemonState] = useState({
    online: false,
    activeWindow: "AutoCAD 2026",
    keystrokes: 42,
    mouseMovements: 120,
    status: "active",
    history: []
  });
  const [telemetryTicker, setTelemetryTicker] = useState([
    { time: '10:44:12 AM', event: 'Active Window: AutoCAD 2026' },
    { time: '10:44:09 AM', event: 'Local Input: 12 keys, 45 mouse motions' }
  ]);

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
          setLocalDaemonState(prev => ({ 
            ...prev, 
            online: true, 
            isSimulated: true 
          }));
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

  // Automatic Cloud Demonstration & Telemetry Simulator Loop
  useEffect(() => {
    if (localDaemonState.online && !localDaemonState.isSimulated) return;
    
    const timer = setInterval(() => {
      const names = ['Sarah Jenkins', 'John Doe', 'Alex Rivera', 'Emily Chen', 'Rohan Sharma', 'Neha Gupta'];
      const randomName = names[Math.floor(Math.random() * names.length)];
      
      const apps = ['Autodesk Revit', 'AutoCAD 2026', 'Excel (Structural Calculation)', 'Chrome (Slack)', 'VS Code', 'YouTube (Focus Playlist)'];
      const randomApp = apps[Math.floor(Math.random() * apps.length)];
      
      const isProd = productiveKeywords.some(k => randomApp.toLowerCase().includes(k)) || !unproductiveKeywords.some(k => randomApp.toLowerCase().includes(k));
      const activityScore = isProd ? Math.floor(Math.random() * 25 + 75) : Math.floor(Math.random() * 25 + 15);
      
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const dateStr = now.toISOString().split('T')[0];

      // Update daemon simulation state
      setLocalDaemonState(prev => ({
        online: true,
        isSimulated: true,
        activeWindow: randomApp,
        keystrokes: Math.floor(Math.random() * 50 + 10),
        mouseMovements: Math.floor(Math.random() * 120 + 20),
        status: activityScore > 50 ? 'active' : 'idle',
        history: prev.history
      }));

      // Push ticker update
      setTelemetryTicker(prev => [
        { time: timeStr, event: `Simulated [${randomName}] active in ${randomApp} (Focus: ${activityScore}%)` },
        ...prev.slice(0, 4)
      ]);

      // Append/Update logs dynamically to localStorage
      setLogs(prev => {
        const empLogs = prev[randomName] || [];
        const updatedLogs = [...empLogs];
        
        if (updatedLogs.length > 0 && Math.random() > 0.4) {
          updatedLogs[0] = {
            ...updatedLogs[0],
            activeApp: randomApp,
            productivity: activityScore,
            activityScore: activityScore,
            task: `Updated: Working on ${randomApp}`
          };
        } else {
          const newLogId = Date.now();
          const targetEmp = employees.find(e => e.name === randomName);
          updatedLogs.unshift({
            id: newLogId,
            project: targetEmp ? targetEmp.activeProject : 'Project Alpha',
            hours: Math.floor(Math.random() * 8 + 1),
            mins: Math.floor(Math.random() * 60),
            task: `Running tasks in ${randomApp}`,
            start: '09:00 AM',
            end: '05:00 PM',
            date: dateStr,
            activityScore: activityScore,
            isManual: false,
            status: 'Approved',
            activeApp: randomApp,
            productivity: activityScore
          });
        }
        
        return {
          ...prev,
          [randomName]: updatedLogs.slice(0, 4)
        };
      });

      if (Math.random() > 0.75) {
        logAudit('Telemetry Simulator', `Polled active app for ${randomName}: ${randomApp}`);
      }
    }, 4000);
    
    return () => clearInterval(timer);
  }, [localDaemonState.online]);

  // Cloud Sync Simulation Loop
  useEffect(() => {
    if (!localDaemonState.online) return;
    const interval = setInterval(() => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const batchNum = 'CM-' + Math.floor(Math.random() * 9000 + 1000);
      const recs = Math.floor(Math.random() * 15 + 1);
      
      setSyncLogs(prev => [
        { id: Date.now(), time: timeStr, status: 'Success', batch: batchNum, records: recs },
        ...prev.slice(0, 4)
      ]);
      showToast(`Batch sync complete: Pushed ${recs} records to Cloud.`, 'success');
      logAudit('Sync Engine', `Database synchronization completed: Batch ${batchNum} pushed to Cloud.`);
    }, 15000);
    return () => clearInterval(interval);
  }, [localDaemonState.online]);

  // Authentication Submission
  const handleLoginSubmit = async (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: loginRole, password: loginPassword })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('civil_session_token', data.token);
        localStorage.setItem('civil_role', loginRole);
        setSessionToken(data.token);
        setCurrentRole(loginRole);
        setLoginPassword('');
        showToast(`Logged in successfully as ${loginRole === 'admin' ? 'Administrator' : 'Team Lead'}.`, 'success');
        logAudit('Authentication', `Logged in successfully as ${loginRole}`);
      } else {
        setLoginError(data.error || 'Authentication failed');
      }
    } catch (err) {
      // Local Dev Mode Fallback
      const fallbackPass = loginRole === 'admin' ? 'admin123' : 'lead123';
      if (loginPassword === fallbackPass) {
        const dummyToken = `local-token-${loginRole}-${Date.now()}`;
        localStorage.setItem('civil_session_token', dummyToken);
        localStorage.setItem('civil_role', loginRole);
        setSessionToken(dummyToken);
        setCurrentRole(loginRole);
        setLoginPassword('');
        showToast(`Logged in (Local Fallback) as ${loginRole === 'admin' ? 'Administrator' : 'Team Lead'}.`, 'info');
      } else {
        setLoginError('Incorrect password credentials.');
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('civil_session_token');
    localStorage.removeItem('civil_role');
    setSessionToken('');
    setCurrentRole('landing');
    showToast('Logged out successfully.', 'info');
  };

  // Interactive CRUD State for User Management
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empForm, setEmpForm] = useState({
    name: '',
    role: '',
    dept: 'Civil Engineering',
    teamLeadId: 'TL-01',
    activeProject: 'Project Alpha',
    baseSalary: 50000,
    benefits: 10000,
    status: 'Active'
  });

  const handleAddEmployee = (e) => {
    e.preventDefault();
    if (!empForm.name || !empForm.role) {
      showToast('Please fill in name and role.', 'error');
      return;
    }
    const newId = 'EMP' + String(employees.length + 1).padStart(3, '0');
    const newEmp = {
      id: newId,
      ...empForm,
      avgHours: 160
    };
    const updatedList = [...employees, newEmp];
    setEmployees(updatedList);
    setShowAddForm(false);
    setEmpForm({
      name: '',
      role: '',
      dept: 'Civil Engineering',
      teamLeadId: 'TL-01',
      activeProject: 'Project Alpha',
      baseSalary: 50000,
      benefits: 10000,
      status: 'Active'
    });
    logAudit('Admin', `Added new employee account ${newId} (${newEmp.name})`);
    showToast(`Added ${newEmp.name} successfully.`, 'success');
  };

  const handleEditEmployee = (e) => {
    e.preventDefault();
    if (!empForm.name || !empForm.role) {
      showToast('Please fill in name and role.', 'error');
      return;
    }
    const updatedList = employees.map(emp => {
      if (emp.id === selectedEmp.id) {
        return { ...emp, ...empForm };
      }
      return emp;
    });
    setEmployees(updatedList);
    setShowEditForm(false);
    setSelectedEmp(null);
    logAudit('Admin', `Modified employee account ${selectedEmp.id}`);
    showToast('Employee account updated successfully.', 'success');
  };

  const handleDeleteEmployee = (id) => {
    const confirmDelete = window.confirm('Are you sure you want to remove this employee account?');
    if (!confirmDelete) return;
    const target = employees.find(e => e.id === id);
    const updated = employees.filter(emp => emp.id !== id);
    setEmployees(updated);
    logAudit('Admin', `Removed employee account ${id} (${target?.name})`);
    showToast('Employee account removed.', 'info');
  };

  const openEditForm = (emp) => {
    setSelectedEmp(emp);
    setEmpForm({
      name: emp.name,
      role: emp.role,
      dept: emp.dept,
      teamLeadId: emp.teamLeadId,
      activeProject: emp.activeProject,
      baseSalary: emp.baseSalary,
      benefits: emp.benefits,
      status: emp.status
    });
    setShowEditForm(true);
  };

  // Manager Provisioning Activation Codes
  const [provisionEmail, setProvisionEmail] = useState('');
  const [provisionName, setProvisionName] = useState('');
  const [pendingActivations, setPendingActivations] = useState([
    { name: 'Sarah Jenkins', email: 'sarah.jenkins@civilmantra.com', code: 'CM-8931-A', status: 'Active' },
    { name: 'David Miller', email: 'david.miller@civilmantra.com', code: 'CM-1029-B', status: 'Pending' }
  ]);

  const generateActivationCode = (e) => {
    e.preventDefault();
    if (!provisionEmail || !provisionName) {
      showToast('Please fill name and corporate email.', 'error');
      return;
    }
    const randCode = 'CM-' + Math.floor(Math.random() * 9000 + 1000) + '-' + String.fromCharCode(65 + Math.floor(Math.random() * 26));
    const newActivation = {
      name: provisionName,
      email: provisionEmail,
      code: randCode,
      status: 'Pending'
    };
    setPendingActivations([newActivation, ...pendingActivations]);
    setProvisionEmail('');
    setProvisionName('');
    logAudit('Admin', `Generated activation code ${randCode} for ${provisionName}`);
    showToast(`Activation code created: ${randCode}`, 'success');
  };

  // Contact Form State
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const handleContactSubmit = (e) => {
    e.preventDefault();
    if (!contactName || !contactEmail || !contactMsg) {
      showToast('Please fill in all contact fields.', 'error');
      return;
    }
    showToast('Thank you! Our enterprise team will contact you shortly.', 'success');
    setContactName('');
    setContactEmail('');
    setContactMsg('');
  };

  // Desktop App states
  const [desktopActivated, setDesktopActivated] = useState(() => {
    return localStorage.getItem('civil_desktop_activated') === 'true';
  });
  const [activationCodeInput, setActivationCodeInput] = useState('');
  const [grantedPermissions, setGrantedPermissions] = useState({
    input: false,
    startup: false,
    notifications: false,
    storage: false
  });

  const handleActivateDesktop = (e) => {
    e.preventDefault();
    if (!activationCodeInput.trim()) {
      showToast('Enter activation code.', 'error');
      return;
    }
    localStorage.setItem('civil_desktop_activated', 'true');
    setDesktopActivated(true);
    logAudit('Employee Desktop', 'Desktop Agent client activated successfully.');
    showToast('Client activated successfully.', 'success');
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 selection:text-white font-sans antialiased">
      
      {/* TOAST SYSTEM */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-in-bottom">
          <div className={`px-5 py-3 rounded-xl border flex items-center space-x-3 shadow-2xl backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
              : toast.type === 'error'
              ? 'bg-red-500/10 border-red-500/20 text-red-400'
              : 'bg-zinc-900/90 border-zinc-800 text-zinc-300'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"></span>
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* APPLE-STYLE MARKETING LANDING PAGE */}
      {currentRole === 'landing' && (
        <div className="flex flex-col min-h-screen">
          {/* Header */}
          <header className="fixed top-0 w-full z-40 bg-background/80 backdrop-blur-md border-b border-border transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-extrabold text-sm tracking-widest bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent uppercase">CIVIL MANTRA</span>
              </div>
              <nav className="hidden md:flex items-center space-x-8 text-xs font-bold uppercase tracking-wider text-zinc-400">
                <a href="#features" className="hover:text-white transition-colors">Features</a>
                <a href="#about" className="hover:text-white transition-colors">Security</a>
                <a href="#contact" className="hover:text-white transition-colors">Contact</a>
              </nav>
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => setCurrentRole('login')} 
                  className="px-4 py-2 bg-secondary hover:bg-zinc-800 text-white font-bold text-xs uppercase rounded-full border border-zinc-800 transition-all duration-200"
                >
                  Console Access
                </button>
                <button 
                  onClick={() => showToast('Download triggered. Standalone installer packaging loaded.', 'info')} 
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs uppercase rounded-full transition-all duration-200 active:scale-[0.98]"
                >
                  Download Agent
                </button>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="relative pt-32 pb-24 md:pt-40 md:pb-36 bg-dot-pattern max-w-7xl mx-auto px-6 text-center space-y-8 flex flex-col items-center">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              <span>Next-Gen Telemetry Pipeline</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight text-white max-w-4xl leading-tight">
              Privacy-First Telemetry for <br />
              <span className="bg-gradient-to-r from-primary via-indigo-400 to-blue-500 bg-clip-text text-transparent">High-Trust Teams</span>
            </h1>
            <p className="text-zinc-400 text-sm md:text-base max-w-2xl leading-relaxed">
              Verify resource utilization, map project costs, and prevent profitability leaks with transparent desktop analytics. No keystrokes, no screen buffers, complete privacy.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button 
                onClick={() => setCurrentRole('login')} 
                className="w-full sm:w-auto px-8 py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-full transition-all active:scale-[0.98]"
              >
                Access Work Console
              </button>
              <button 
                onClick={() => showToast('Standalone installation wizard initiated.', 'info')} 
                className="w-full sm:w-auto px-8 py-3.5 bg-secondary hover:bg-zinc-800 text-white font-bold text-xs uppercase tracking-widest rounded-full border border-zinc-800 transition-all"
              >
                Download Desktop App
              </button>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-20 bg-zinc-950/40 border-t border-b border-border">
            <div className="max-w-7xl mx-auto px-6 space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Engine Capabilities</h2>
                <p className="text-xs text-zinc-500 max-w-xl mx-auto uppercase tracking-wide">Structured tracking features mapped directly to organizational workflows.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-zinc-800 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">Non-Intrusive Polling</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Queries active window titles and maps keyboard/mouse events per interval. Does not capture sensitive inputs, logs, or tabs.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-zinc-800 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Lock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">At-Rest Database Encryption</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Telemetry logs are stored in a local SQLite file securely locked with AES-256 Fernet ciphers to prevent administrative data tampering.
                  </p>
                </div>

                <div className="p-8 rounded-3xl bg-card border border-border space-y-4 hover:border-zinc-800 transition-all duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-extrabold text-white">AI-Driven Anomaly Mapping</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Predictive models forecast idle benches and flag active outliers without disrupting employee focus.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* About Section */}
          <section id="about" className="py-20 max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-2xl font-black text-white uppercase tracking-wider">High Trust Telemetry</h2>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Organizations must operate at scale without compromising privacy. Civil Mantra replaces legacy screen recorders with metadata-driven pipelines. By tracking active applications and input density counters, it provides clear workforce analytics while preserving absolute employee safety.
              </p>
              <div className="space-y-3">
                {[
                  'Zero key-logging guarantees credential security',
                  'Local SQLite caches allow offline mapping capabilities',
                  'Fully signed installer targets for Linux, macOS & Windows'
                ].map((txt, idx) => (
                  <div key={idx} className="flex items-center space-x-3 text-xs text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    <span>{txt}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 rounded-3xl bg-zinc-900/40 border border-border space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-4">
                <span className="text-xs font-black text-white uppercase tracking-wider">Telemetry Profile</span>
                <span className="text-[10px] bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase">Active</span>
              </div>
              <div className="font-mono text-[10px] text-zinc-400 space-y-2">
                <div>[SYSTEM] Initiating local daemon port check on 5050...</div>
                <div className="text-emerald-400">[SYSTEM] Connection secure. Auth token accepted.</div>
                <div>[DAEMON] Active Window: AutoCAD 2026 (Focus verified)</div>
                <div>[DAEMON] Keystrokes: 18 | Mouse Movements: 104</div>
                <div className="text-zinc-500">[DAEMON] Encrypting SQLite telemetry block [AES-256]</div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section id="contact" className="py-20 bg-zinc-950/40 border-t border-border">
            <div className="max-w-xl mx-auto px-6 space-y-8">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-white uppercase tracking-wider">Enterprise Inquiries</h2>
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Request a sandbox instance for your organization.</p>
              </div>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Full Name</label>
                    <input 
                      type="text" 
                      value={contactName} 
                      onChange={(e) => setContactName(e.target.value)} 
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 outline-none transition-colors"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Corporate Email</label>
                    <input 
                      type="email" 
                      value={contactEmail} 
                      onChange={(e) => setContactEmail(e.target.value)} 
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 outline-none transition-colors"
                      placeholder="jane@company.com"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Message</label>
                  <textarea 
                    rows="4" 
                    value={contactMsg} 
                    onChange={(e) => setContactMsg(e.target.value)} 
                    className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 outline-none transition-colors resize-none"
                    placeholder="Describe your organization and requirement..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  Submit Inquiry
                </button>
              </form>
            </div>
          </section>

          {/* Footer */}
          <footer className="mt-auto border-t border-border bg-background py-8 text-center text-[10px] text-zinc-650 uppercase tracking-widest">
            Civil Mantra Telemetry Systems License MIT.
          </footer>
        </div>
      )}

      {/* SECURE CARD LOGIN PAGE */}
      {currentRole === 'login' && (
        <div className="min-h-screen flex items-center justify-center bg-dot-pattern px-6">
          <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl space-y-6 hover:border-zinc-800 transition-all duration-300 relative">
            <button 
              onClick={() => setCurrentRole('landing')} 
              className="absolute top-6 right-6 p-1.5 rounded-full text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-2">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl border border-primary/20 text-primary">
                <Shield className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider">Console Access Gateway</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Enter credentials to unlock secure workstation portals.</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Select Role Scope</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'admin', label: 'Admin', icon: Shield },
                    { id: 'tl', label: 'Team Lead', icon: Users },
                    { id: 'employee', label: 'Employee', icon: User }
                  ].map(r => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setLoginRole(r.id)}
                      className={`py-2.5 rounded-xl border text-[10px] font-black uppercase flex flex-col items-center justify-center space-y-1.5 transition-all ${
                        loginRole === r.id 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-background border-border text-zinc-400 hover:text-white'
                      }`}
                    >
                      <r.icon className="w-4 h-4" />
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Password input */}
              {loginRole !== 'employee' ? (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black tracking-wider text-zinc-400">Security Password</label>
                  <input 
                    type="password" 
                    value={loginPassword} 
                    onChange={(e) => setLoginPassword(e.target.value)} 
                    placeholder="••••••••"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-3 text-xs text-white placeholder-zinc-700 outline-none transition-colors"
                  />
                </div>
              ) : (
                <div className="bg-zinc-950 border border-border p-4 rounded-xl text-center space-y-2">
                  <p className="text-xs text-zinc-400">Employees access logs via the local standalone Desktop Agent Client.</p>
                  <button 
                    type="button" 
                    onClick={() => setCurrentRole('employee')}
                    className="text-[10px] font-black uppercase text-primary hover:underline"
                  >
                    Simulate Desktop View
                  </button>
                </div>
              )}

              {loginError && (
                <div className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-3 rounded-xl text-center">
                  {loginError}
                </div>
              )}

              {loginRole !== 'employee' && (
                <button 
                  type="submit" 
                  className="w-full py-3.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  Verify Credentials
                </button>
              )}
            </form>
          </div>
        </div>
      )}

      {/* ADMIN CONSOLE PORTAL (SIDEBAR LAYOUT) */}
      {currentRole === 'admin' && (
        <div className="min-h-screen flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Shield className="w-5 h-5 text-primary" />
                <span className="font-extrabold text-xs tracking-widest text-white uppercase">ADMIN PANEL</span>
              </div>
              <button onClick={handleLogout} className="p-1 text-zinc-500 hover:text-white transition-colors md:hidden">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {[
                { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'users', label: 'User Directory', icon: Users },
                { id: 'provision', label: 'Provision Keys', icon: Key },
                { id: 'rules', label: 'Productivity Rules', icon: Sliders },
                { id: 'audit', label: 'Immutable Audit', icon: Terminal }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveAdminTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase flex items-center space-x-3 transition-all ${
                    activeAdminTab === tab.id 
                      ? 'bg-primary/10 border border-primary/20 text-primary' 
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white border border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-zinc-500">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-semibold uppercase tracking-wider">Session Active</span>
              </div>
              <button 
                onClick={handleLogout} 
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border hover:text-white rounded-lg transition-all flex items-center space-x-1 uppercase text-[10px] font-bold"
              >
                <LogOut className="w-3 h-3" />
                <span>Logout</span>
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
            
            {/* Overview Panel with AI/ML Analytics */}
            {activeAdminTab === 'overview' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">AI Predictive Workspace Analytics</h2>
                    <p className="text-xs text-zinc-400 mt-1">Simulated intelligence outputs forecasting bench capacity and profit optimizations.</p>
                  </div>
                  <div className="flex items-center space-x-2 text-[10px] bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-full text-primary font-black uppercase tracking-wider">
                    <Activity className="w-3.5 h-3.5" />
                    <span>Live Modeling: Active</span>
                  </div>
                </div>

                {/* Bento Grid KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="p-6 rounded-3xl bg-card border border-border space-y-3 hover:border-zinc-800 transition-all">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Total Portfolio Revenue</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">Rs. 30.0 Cr</span>
                      <span className="text-[10px] text-emerald-400 font-bold">+12%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-primary h-full w-3/4"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-card border border-border space-y-3 hover:border-zinc-800 transition-all">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Total Resource Costs</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">Rs. 19.8 Cr</span>
                      <span className="text-[10px] text-zinc-500 font-semibold">Budgeted</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full w-[66%]"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-card border border-border space-y-3 hover:border-zinc-800 transition-all">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Net Profit Margin</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">34.0%</span>
                      <span className="text-[10px] text-emerald-400 font-bold">+6.2%</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full w-[85%]"></div>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-card border border-border space-y-3 hover:border-zinc-800 transition-all">
                    <span className="text-[10px] uppercase font-black tracking-widest text-zinc-500 block">Idle Bench Latency</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-black text-white">4.0%</span>
                      <span className="text-[10px] text-emerald-400 font-bold">-8% Anomaly</span>
                    </div>
                    <div className="w-full bg-zinc-900 h-1 rounded-full overflow-hidden">
                      <div className="bg-emerald-400 h-full w-[96%]"></div>
                    </div>
                  </div>
                </div>

                {/* AI / ML Forecast Panel */}
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <span className="text-[9px] bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded-full font-black uppercase tracking-widest inline-block">ML Insights Feed</span>
                    <h3 className="text-sm font-extrabold text-white">Projected Idle Bench Capacity & Overhead Adjustments</h3>
                    <p className="text-xs text-zinc-400 leading-relaxed">
                      Based on real-time keystroke density trends and focus-application transitions, our ML pipeline projects active utilization increases to 96% next month. Flagged anomalous patterns remain below 1.2%.
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 shrink-0">
                    <div className="text-center p-3.5 bg-card border border-border rounded-2xl w-24">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">Saved</span>
                      <span className="text-sm font-black text-emerald-400">Rs. 14.5L</span>
                    </div>
                    <div className="text-center p-3.5 bg-card border border-border rounded-2xl w-24">
                      <span className="text-[9px] uppercase font-bold text-zinc-500 block">Risk Status</span>
                      <span className="text-sm font-black text-primary">LOW</span>
                    </div>
                  </div>
                </div>

                {/* Recharts Area / Bar Graphs */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Telemetry Transition Trajectory (Historical vs Projected)</span>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={TRANSITION_TRENDS}>
                          <defs>
                            <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="year" stroke="#4b5563" fontSize={10} />
                          <YAxis stroke="#4b5563" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '10px' }} />
                          <Area type="monotone" dataKey="revenue" stroke="#6366f1" fillOpacity={1} fill="url(#colorRev)" strokeWidth={2} name="Forecast Revenue (Rs.)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-xs font-black text-white uppercase tracking-wider">Bench Latency Ratios (%)</span>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={TRANSITION_TRENDS}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                          <XAxis dataKey="year" stroke="#4b5563" fontSize={10} />
                          <YAxis stroke="#4b5563" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#1f2937', borderRadius: '12px', fontSize: '10px' }} />
                          <Bar dataKey="benchRatio" fill="#10b981" radius={[4, 4, 0, 0]} name="Bench Ratio %" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Directory (CRUD Table) */}
            {activeAdminTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-wider">User Directory & Assignments</h2>
                    <p className="text-xs text-zinc-400 mt-1">Manage corporate accounts, roles, and project mapping.</p>
                  </div>
                  <button 
                    onClick={() => { setShowAddForm(true); setShowEditForm(false); }}
                    className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-full transition-all flex items-center space-x-1.5 active:scale-[0.98]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Employee</span>
                  </button>
                </div>

                {/* Add Employee Form */}
                {showAddForm && (
                  <form onSubmit={handleAddEmployee} className="p-6 rounded-3xl bg-card border border-primary/20 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest text-primary">Provision New Employee Profile</h3>
                      <button type="button" onClick={() => setShowAddForm(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.name} 
                          onChange={(e) => setEmpForm({...empForm, name: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                          placeholder="Sarah Jenkins"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Designation / Role</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.role} 
                          onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                          placeholder="CAD Designer"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Department</label>
                        <select 
                          value={empForm.dept} 
                          onChange={(e) => setEmpForm({...empForm, dept: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="Civil Engineering">Civil Engineering</option>
                          <option value="Structural Design">Structural Design</option>
                          <option value="Site Planning">Site Planning</option>
                          <option value="Costing & Estimating">Costing & Estimating</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Assign Team Lead</label>
                        <select 
                          value={empForm.teamLeadId} 
                          onChange={(e) => setEmpForm({...empForm, teamLeadId: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          {teamLeads.map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name} ({tl.dept})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Active Project</label>
                        <select 
                          value={empForm.activeProject} 
                          onChange={(e) => setEmpForm({...empForm, activeProject: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Base Salary (Rs/mo)</label>
                        <input 
                          type="number" 
                          value={empForm.baseSalary} 
                          onChange={(e) => setEmpForm({...empForm, baseSalary: Number(e.target.value)})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-primary text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                      Add to Registry
                    </button>
                  </form>
                )}

                {/* Edit Employee Form */}
                {showEditForm && (
                  <form onSubmit={handleEditEmployee} className="p-6 rounded-3xl bg-card border border-indigo-500/20 space-y-4 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-black text-white uppercase tracking-widest text-indigo-400">Edit Employee Profile: {selectedEmp?.id}</h3>
                      <button type="button" onClick={() => setShowEditForm(false)} className="text-zinc-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Full Name</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.name} 
                          onChange={(e) => setEmpForm({...empForm, name: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Designation / Role</label>
                        <input 
                          type="text" 
                          required
                          value={empForm.role} 
                          onChange={(e) => setEmpForm({...empForm, role: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Department</label>
                        <select 
                          value={empForm.dept} 
                          onChange={(e) => setEmpForm({...empForm, dept: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="Civil Engineering">Civil Engineering</option>
                          <option value="Structural Design">Structural Design</option>
                          <option value="Site Planning">Site Planning</option>
                          <option value="Costing & Estimating">Costing & Estimating</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Team Lead</label>
                        <select 
                          value={empForm.teamLeadId} 
                          onChange={(e) => setEmpForm({...empForm, teamLeadId: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          {teamLeads.map(tl => (
                            <option key={tl.id} value={tl.id}>{tl.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Active Project</label>
                        <select 
                          value={empForm.activeProject} 
                          onChange={(e) => setEmpForm({...empForm, activeProject: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.id}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Status</label>
                        <select 
                          value={empForm.status} 
                          onChange={(e) => setEmpForm({...empForm, status: e.target.value})} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        >
                          <option value="Active">Active</option>
                          <option value="On Leave">On Leave</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                      Update Profile
                    </button>
                  </form>
                )}

                {/* Directory Table */}
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-zinc-900/50 text-[10px] uppercase font-black tracking-wider text-zinc-500">
                          <th className="p-4">Employee ID</th>
                          <th className="p-4">Name</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Team Lead</th>
                          <th className="p-4">Active Project</th>
                          <th className="p-4">Status</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-zinc-300 divide-y divide-border">
                        {employees.map(emp => {
                          const tl = teamLeads.find(l => l.id === emp.teamLeadId);
                          return (
                            <tr key={emp.id} className="hover:bg-zinc-900/30 transition-colors">
                              <td className="p-4 font-mono font-bold text-zinc-550">{emp.id}</td>
                              <td className="p-4 font-extrabold text-white">{emp.name}</td>
                              <td className="p-4 text-zinc-400">{emp.role}</td>
                              <td className="p-4">{tl ? tl.name : emp.teamLeadId}</td>
                              <td className="p-4 font-semibold">{emp.activeProject}</td>
                              <td className="p-4">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  emp.status === 'Active' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-zinc-800 text-zinc-400'
                                }`}>
                                  {emp.status}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-2">
                                <button 
                                  onClick={() => openEditForm(emp)} 
                                  className="p-1.5 rounded-lg border border-border bg-zinc-900 hover:text-white transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => handleDeleteEmployee(emp.id)} 
                                  className="p-1.5 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/15 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

            {/* Account Provisioning (Activation code generator) */}
            {activeAdminTab === 'provision' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Account Provisioning Console</h2>
                  <p className="text-xs text-zinc-400 mt-1">Generate dynamic keys to register standalone desktop clients and coordinate onboarding flows.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left input card */}
                  <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-550 block">Generate Activation Key</span>
                    <form onSubmit={generateActivationCode} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-black text-zinc-400">Employee Name</label>
                        <input 
                          type="text" 
                          required
                          value={provisionName} 
                          onChange={(e) => setProvisionName(e.target.value)} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                          placeholder="John Doe"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[9px] uppercase font-black text-zinc-450">Corporate Email</label>
                        <input 
                          type="email" 
                          required
                          value={provisionEmail} 
                          onChange={(e) => setProvisionEmail(e.target.value)} 
                          className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                          placeholder="john@civilmantra.com"
                        />
                      </div>
                      <button type="submit" className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all">
                        Generate Key
                      </button>
                    </form>
                  </div>

                  {/* Middle pending activations list */}
                  <div className="md:col-span-2 p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-550 block">Pending Registration Keys</span>
                    <div className="border border-border rounded-2xl overflow-hidden">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-border bg-zinc-900/30 text-[9px] uppercase font-black tracking-wider text-zinc-500">
                            <th className="p-3">Candidate</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Activation Key</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="text-xs text-zinc-300 divide-y divide-border font-mono">
                          {pendingActivations.map((p, idx) => (
                            <tr key={idx} className="hover:bg-zinc-900/10">
                              <td className="p-3 font-sans font-extrabold text-white">{p.name}</td>
                              <td className="p-3 text-[10px] text-zinc-500">{p.email}</td>
                              <td className="p-3 text-primary font-bold">{p.code}</td>
                              <td className="p-3">
                                <span className={`inline-flex px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  p.status === 'Active' 
                                    ? 'bg-emerald-500/10 text-emerald-400' 
                                    : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {p.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Productivity Rules */}
            {activeAdminTab === 'rules' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Productivity Keyword Configurator</h2>
                  <p className="text-xs text-zinc-400 mt-1">Configure whitelisted (productive) and blacklisted (unproductive) software triggers for telemetry activity ratings.</p>
                </div>

                <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                  <div className="flex items-end gap-4 flex-wrap">
                    <div className="space-y-1.5 flex-1 min-w-[200px]">
                      <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Add Rule Keyword</label>
                      <input 
                        type="text" 
                        value={newKeyword} 
                        onChange={(e) => setNewKeyword(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                        placeholder="e.g. autocad, netflix, slither.io"
                      />
                    </div>
                    <div className="space-y-1.5 w-40">
                      <label className="text-[9px] uppercase font-black text-zinc-450 tracking-wider">Rule Category</label>
                      <select 
                        value={keywordTarget} 
                        onChange={(e) => setKeywordTarget(e.target.value)} 
                        className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-white outline-none"
                      >
                        <option value="whitelist">Whitelist</option>
                        <option value="blacklist">Blacklist</option>
                      </select>
                    </div>
                    <button 
                      onClick={addKeyword}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/95 text-primary-foreground font-black text-xs uppercase tracking-widest rounded-xl transition-all h-10 flex items-center space-x-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Rule</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Whitelist keywords */}
                  <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>Whitelisted (Productive App Keywords)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {productiveKeywords.map(key => (
                        <div key={key} className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-350 flex items-center space-x-2">
                          <span className="font-mono">{key}</span>
                          <button onClick={() => removeKeyword(key, 'whitelist')} className="text-zinc-600 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Blacklist keywords */}
                  <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                    <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-red-500"></span>
                      <span>Blacklisted (Unproductive App Keywords)</span>
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {unproductiveKeywords.map(key => (
                        <div key={key} className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-border text-xs text-zinc-350 flex items-center space-x-2">
                          <span className="font-mono">{key}</span>
                          <button onClick={() => removeKeyword(key, 'blacklist')} className="text-zinc-600 hover:text-white transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Audit Trail */}
            {activeAdminTab === 'audit' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Immutable System Audit Log Trail</h2>
                  <p className="text-xs text-zinc-400 mt-1">Read-only ledger logging access actions, manager key configurations, and telemetry events.</p>
                </div>

                <div className="bg-card border border-border p-6 rounded-3xl space-y-4 shadow-xl">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-550 flex items-center space-x-2">
                      <Terminal className="w-4 h-4 text-primary" />
                      <span>Ledger Storage Block Feed</span>
                    </span>
                    <span className="text-[8px] bg-zinc-900 border border-border px-2.5 py-1 rounded-full text-zinc-400 font-bold uppercase">SECURED</span>
                  </div>

                  <div className="bg-black/80 border border-zinc-900 p-5 rounded-2xl font-mono text-[10px] text-zinc-400 space-y-2.5 max-h-96 overflow-y-auto">
                    {auditLogs.map(log => (
                      <div key={log.id} className="flex justify-between border-b border-zinc-900/50 pb-2 last:border-0 last:pb-0">
                        <span>[{log.time}] <strong className="text-zinc-300">{log.user}:</strong> {log.action}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* TEAM LEAD CONSOLE PORTAL */}
      {currentRole === 'tl' && (
        <div className="min-h-screen flex flex-col md:flex-row">
          {/* Sidebar */}
          <aside className="w-full md:w-64 bg-card border-r border-border flex flex-col shrink-0">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span className="font-extrabold text-xs tracking-widest text-white uppercase">TEAM LEAD PORTAL</span>
              </div>
              <button onClick={handleLogout} className="p-1 text-zinc-500 hover:text-white transition-colors md:hidden">
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            <nav className="flex-1 p-4 space-y-1">
              {[
                { id: 'overview', label: 'Team Live Board', icon: LayoutDashboard },
                { id: 'members', label: 'Telemetry Logs', icon: Clock }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTlTab(tab.id)}
                  className={`w-full px-4 py-3 rounded-xl text-xs font-bold uppercase flex items-center space-x-3 transition-all ${
                    activeTlTab === tab.id 
                      ? 'bg-indigo-500/10 border border-indigo-500/20 text-indigo-400' 
                      : 'text-zinc-400 hover:bg-zinc-900/60 hover:text-white border border-transparent'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </nav>

            <div className="p-4 border-t border-border flex items-center justify-between text-xs text-zinc-500">
              <span className="font-semibold uppercase tracking-wider">TL Mode active</span>
              <button onClick={handleLogout} className="px-2.5 py-1 bg-zinc-900 border border-border hover:text-white rounded-lg transition-all uppercase text-[10px] font-bold">
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto max-w-7xl mx-auto w-full">
            
            {activeTlTab === 'overview' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Team Activity & Uptime Live Board</h2>
                  <p className="text-xs text-zinc-400 mt-1">Real-time application polling and timesheet validations for assigned engineers.</p>
                </div>

                {/* Team member status grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {employees.filter(e => e.teamLeadId === 'TL-01').map(emp => {
                    const empLogs = logs[emp.name] || [];
                    const activeLog = empLogs[0];
                    return (
                      <div key={emp.id} className="p-6 rounded-3xl bg-card border border-border space-y-4 hover:border-zinc-800 transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-sm font-extrabold text-white">{emp.name}</h3>
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">{emp.role}</span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                            emp.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800'
                          }`}>{emp.status}</span>
                        </div>

                        <div className="space-y-2 border-t border-b border-border/40 py-3 font-mono text-[10px] text-zinc-400">
                          <div className="flex justify-between">
                            <span>Tracked Window:</span>
                            <span className="text-white truncate max-w-[150px] font-sans font-semibold">{activeLog?.activeApp || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Activity Score:</span>
                            <span className={`font-bold ${activeLog?.activityScore > 70 ? 'text-emerald-400' : 'text-amber-400'}`}>{activeLog?.activityScore || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Active Project:</span>
                            <span className="text-white font-sans">{emp.activeProject}</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-zinc-550 font-bold uppercase">Timesheet Status</span>
                          <span className={`font-black uppercase tracking-wider ${
                            activeLog?.status === 'Approved' ? 'text-emerald-400' : 'text-amber-400'
                          }`}>{activeLog?.status || 'Pending'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTlTab === 'members' && (
              <div className="space-y-6">
                <div className="border-b border-border pb-4">
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Detailed Team Telemetry Logs</h2>
                  <p className="text-xs text-zinc-400 mt-1">Review verified active application logs, keystroke/pointer densities, and manual inputs.</p>
                </div>

                <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                  <span className="text-xs font-black text-white uppercase tracking-wider block">Raw Log Ledger</span>
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-zinc-900/30 text-[9px] uppercase font-black tracking-wider text-zinc-550">
                          <th className="p-3">Member</th>
                          <th className="p-3">Task Details</th>
                          <th className="p-3">Logged App</th>
                          <th className="p-3">Duration</th>
                          <th className="p-3">Activity Score</th>
                          <th className="p-3 text-right">Verification</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs text-zinc-300 divide-y divide-border">
                        {Object.entries(logs).map(([name, items]) => 
                          items.map(l => (
                            <tr key={l.id} className="hover:bg-zinc-900/10">
                              <td className="p-3 font-extrabold text-white">{name}</td>
                              <td className="p-3 text-zinc-400 font-medium">{l.task}</td>
                              <td className="p-3 font-mono text-xs">{l.activeApp}</td>
                              <td className="p-3 font-semibold">{l.hours}h {l.mins}m</td>
                              <td className="p-3 font-bold text-indigo-400">{l.activityScore}%</td>
                              <td className="p-3 text-right">
                                <span className="inline-flex px-2 py-0.5 rounded text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-black uppercase tracking-wider">
                                  {l.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* EMPLOYEE CLIENT INTERACTION BOARD (STANDALONE DESKTOP VIEW) */}
      {currentRole === 'employee' && (
        <div className="min-h-screen flex flex-col bg-zinc-950">
          {/* Header */}
          <header className="px-6 h-16 border-b border-border bg-card flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Laptop className="w-5 h-5 text-primary" />
              <div className="flex flex-col">
                <span className="font-extrabold text-xs text-white uppercase tracking-wider">CivilMantra Desktop Agent</span>
                <span className="text-[8px] text-zinc-550 font-bold uppercase tracking-widest">Version 1.0.0</span>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`w-2 h-2 rounded-full ${localDaemonState.online ? (localDaemonState.isSimulated ? 'bg-indigo-500 animate-pulse' : 'bg-emerald-500') : 'bg-red-500 animate-pulse'}`}></span>
              <span className="text-[10px] uppercase font-bold text-zinc-400">
                {localDaemonState.isSimulated ? 'Cloud Simulation Active' : localDaemonState.online ? 'Daemon Active (Port 5050)' : 'Daemon Offline'}
              </span>
              <button 
                onClick={handleLogout}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 border border-border text-zinc-400 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-wider transition-all"
              >
                Exit Agent
              </button>
            </div>
          </header>

          {!desktopActivated ? (
            /* ONBOARDING ACTIVATION CARD */
            <div className="flex-1 flex items-center justify-center p-6 bg-dot-pattern">
              <div className="w-full max-w-md bg-card border border-border p-8 rounded-3xl shadow-2xl space-y-6">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-3 bg-primary/10 border border-primary/20 rounded-2xl text-primary">
                    <Laptop className="w-6 h-6 animate-bounce" />
                  </div>
                  <h2 className="text-lg font-black text-white uppercase tracking-wider">Desktop Agent Onboarding</h2>
                  <p className="text-xs text-zinc-450 leading-relaxed">
                    Verify consent permissions and connect your local workspace node with the corporate Vercel database cloud.
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-border rounded-xl">
                    <input 
                      type="checkbox" 
                      id="perm_input"
                      checked={grantedPermissions.input}
                      onChange={(e) => setGrantedPermissions({...grantedPermissions, input: e.target.checked})}
                      className="mt-1 accent-primary" 
                    />
                    <label htmlFor="perm_input" className="text-[11px] text-zinc-300 font-medium">
                      <strong>Input Counters Consent:</strong> Record keystroke and mouse movement counts in 30s buckets. No logs of input contents.
                    </label>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-zinc-900/50 border border-border rounded-xl">
                    <input 
                      type="checkbox" 
                      id="perm_focus"
                      checked={grantedPermissions.startup}
                      onChange={(e) => setGrantedPermissions({...grantedPermissions, startup: e.target.checked})}
                      className="mt-1 accent-primary" 
                    />
                    <label htmlFor="perm_focus" className="text-[11px] text-zinc-300 font-medium">
                      <strong>Window Focus Tracking:</strong> Monitor active foreground window titles to verify productive tasks.
                    </label>
                  </div>
                </div>

                <form onSubmit={handleActivateDesktop} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[9px] uppercase font-black text-zinc-500 tracking-wider">8-Digit Activation Code</label>
                    <input 
                      type="text" 
                      required
                      value={activationCodeInput} 
                      onChange={(e) => setActivationCodeInput(e.target.value)} 
                      placeholder="CM-XXXX-X"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl px-4 py-2.5 text-xs text-white placeholder-zinc-700 outline-none uppercase font-mono"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={!grantedPermissions.input || !grantedPermissions.startup}
                    className="w-full py-3 bg-primary hover:bg-primary/95 text-primary-foreground disabled:bg-zinc-800 disabled:text-zinc-500 font-black text-xs uppercase tracking-widest rounded-xl transition-all"
                  >
                    Activate Workspace Node
                  </button>
                </form>
              </div>
            </div>
          ) : (
            /* ACTIVE WORKSPACE CLIENT CONSOLE */
            <main className="flex-1 p-6 md:p-8 space-y-6 max-w-7xl mx-auto w-full overflow-y-auto">
              
              {/* Connected Banner */}
              <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-wider">Active Workspace Telemetry</h2>
                  <p className="text-xs text-zinc-400 mt-1">This node is verified and syncing logs securely with the Cloud Database.</p>
                </div>
                <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Syncing Live Logs</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Live Console Tracking Details */}
                <div className="md:col-span-2 p-6 rounded-3xl bg-card border border-border space-y-4">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Activity className="w-4 h-4 text-primary animate-pulse" />
                    <span>Real-Time Local Tracking Event Log</span>
                  </span>

                  <div className="bg-zinc-950 border border-border p-5 rounded-2xl font-mono text-[10px] text-zinc-400 space-y-2.5 max-h-48 overflow-y-auto">
                    {telemetryTicker.map((t, idx) => (
                      <div key={idx} className="flex justify-between border-b border-border/30 pb-2 last:border-0 last:pb-0">
                        <span>[{t.time}] {t.event}</span>
                        <span className="text-emerald-500">[encrypted]</span>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-3 gap-4 pt-2">
                    <div className="p-4 bg-zinc-900/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-zinc-550 block">Active App</span>
                      <span className="text-xs font-extrabold text-white mt-1 block truncate">{localDaemonState.activeWindow}</span>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-zinc-550 block">Keystroke Count</span>
                      <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">{localDaemonState.keystrokes}</span>
                    </div>
                    <div className="p-4 bg-zinc-900/50 border border-border/80 rounded-2xl text-center">
                      <span className="text-[8px] uppercase font-bold text-zinc-550 block">Mouse Count</span>
                      <span className="text-xs font-mono font-bold text-indigo-400 mt-1 block">{localDaemonState.mouseMovements}</span>
                    </div>
                  </div>
                </div>

                {/* Right Cloud Database Sync Log status */}
                <div className="p-6 rounded-3xl bg-card border border-border space-y-4">
                  <span className="text-xs font-black text-white uppercase tracking-wider flex items-center space-x-2">
                    <Server className="w-4 h-4 text-indigo-400" />
                    <span>PostgreSQL Cloud Sync</span>
                  </span>

                  <div className="space-y-3 font-mono text-[9px] text-zinc-400">
                    {syncLogs.map(l => (
                      <div key={l.id} className="p-3 bg-zinc-900/50 border border-border/40 rounded-xl space-y-1">
                        <div className="flex justify-between font-bold">
                          <span className="text-white">{l.batch}</span>
                          <span className="text-emerald-400">{l.status}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>{l.time}</span>
                          <span>Pushed {l.records} events</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </main>
          )}
        </div>
      )}

    </div>
  );
}
