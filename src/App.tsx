import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  Briefcase, 
  ArrowRight, 
  Terminal, 
  Bot, 
  Compass, 
  Sparkles,
  LogOut,
  Mail,
  ShieldAlert,
  Menu
} from 'lucide-react';
import { AppState, Client, Project, Retainer, DocumentAndNote, WebhookAlert } from './types';
import { 
  getInitialState, 
  CURRENT_DATE_STR
} from './mockData';
import Sidebar from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import OnboardingWizard from './components/OnboardingWizard';
import ClientDetail from './components/ClientDetail';
import DocumentEditor from './components/DocumentEditor';
import ClientsDashboard from './components/ClientsDashboard';
import ProjectsDashboard from './components/ProjectsDashboard';
import RetainersDashboard from './components/RetainersDashboard';
import DocumentsDashboard from './components/DocumentsDashboard';
import AlertsDashboard from './components/AlertsDashboard';
import DevCenter from './components/DevCenter';
import { supabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export default function App() {
  // Load initial local state
  const [state, setState] = useState<AppState>(getInitialState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Tab Routing: 'dashboard' | 'clients_dash' | 'projects_dash' | ...
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Drill-down Detail States
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Mobile responsive sidebar drawer state
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Authentication State Simulation / Real
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('conextsol_auth_logged_in') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // Sync state with Database on mount and auth status changes
  useEffect(() => {
    async function loadDbState() {
      try {
        setIsLoading(true);
        let currentEmail = '';
        let hasActiveSession = false;
        
        // If Supabase is configured, check for active session
        if (isSupabaseConfigured && supabase) {
          const { data: { session }, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) {
            console.error('Error fetching Supabase session:', sessionError);
          }
          if (session) {
            currentEmail = session.user.email || '';
            localStorage.setItem('conextsol_auth_logged_in', 'true');
            setIsLoggedIn(true);
            const adminMode = currentEmail.endsWith('@conextsol.com') || currentEmail === 'reeqieric41@gmail.com';
            setState(prev => ({
              ...prev,
              isAdmin: adminMode,
              userEmail: currentEmail
            }));
            hasActiveSession = true;
          } else {
            // No active session in Supabase - clear login if we had one
            localStorage.removeItem('conextsol_auth_logged_in');
            setIsLoggedIn(false);
          }
        }

        // Only fetch data if we have an active session or are logged in
        if (hasActiveSession || isLoggedIn) {
          const [clients, projects, retainers, documents, alertsLog] = await Promise.all([
            supabaseService.getClients(),
            supabaseService.getProjects(),
            supabaseService.getRetainers(),
            supabaseService.getDocuments(),
            supabaseService.getAlertsLog()
          ]);
          
          setState(prev => ({
            ...prev,
            clients,
            projects,
            retainers,
            documents,
            alertsLog
          }));
        } else {
          // Clear cached state if signed out
          setState(prev => ({
            ...prev,
            clients: [],
            projects: [],
            retainers: [],
            documents: [],
            alertsLog: []
          }));
        }
      } catch (err) {
        console.error('Failed to load initial DB state:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadDbState();
  }, [isLoggedIn]);

  // Handle Real Supabase Authentication or Local Demo Mode
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setAuthError('Please fill in both email and password fields.');
      return;
    }
    
    if (isSupabaseConfigured && supabase) {
      try {
        setIsLoading(true);
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password: loginPassword,
        });

        if (error) {
          setAuthError(error.message);
          setIsLoading(false);
          return;
        }

        localStorage.setItem('conextsol_auth_logged_in', 'true');
        setIsLoggedIn(true);
        setAuthError('');

        const userEmail = data.user?.email || loginEmail;
        const adminMode = userEmail.endsWith('@conextsol.com') || userEmail === 'reeqieric41@gmail.com';
        setState(prev => ({
          ...prev,
          isAdmin: adminMode,
          userEmail: userEmail
        }));
      } catch (err: any) {
        setAuthError(err.message || 'An error occurred during authentication.');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Local Sandbox Demo Mode
      localStorage.setItem('conextsol_auth_logged_in', 'true');
      setIsLoggedIn(true);
      setAuthError('');
      const userEmail = loginEmail || 'admin@conextsol.com';
      const adminMode = userEmail.endsWith('@conextsol.com') || userEmail === 'reeqieric41@gmail.com' || userEmail.includes('admin');
      setState(prev => ({
        ...prev,
        isAdmin: adminMode,
        userEmail: userEmail
      }));
    }
  };

  const handleDemoLogin = (asAdmin: boolean = true) => {
    localStorage.setItem('conextsol_auth_logged_in', 'true');
    setIsLoggedIn(true);
    setAuthError('');
    const userEmail = asAdmin ? 'admin@conextsol.com' : 'client@zenithretail.co';
    setState(prev => ({
      ...prev,
      isAdmin: asAdmin,
      userEmail: userEmail
    }));
  };

  const handleSignOut = async () => {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Error signing out from Supabase:', err);
      }
    }
    localStorage.removeItem('conextsol_auth_logged_in');
    setIsLoggedIn(false);
    // Return tab to default
    setCurrentTab('dashboard');
    setSelectedClientId(null);
    setSelectedDocumentId(null);
  };

  // Save/Edit Client (persists to DB and react state)
  const handleSaveClient = async (client: Client) => {
    setState(prev => {
      const exists = prev.clients.some(c => c.id === client.id);
      let updated;
      if (exists) {
        updated = prev.clients.map(c => c.id === client.id ? client : c);
      } else {
        updated = [...prev.clients, client];
      }
      return { ...prev, clients: updated };
    });
    await supabaseService.saveClient(client);
  };

  // Delete Client (persists to DB and react state)
  const handleDeleteClient = async (id: string) => {
    setState(prev => ({
      ...prev,
      clients: prev.clients.filter(c => c.id !== id),
      projects: prev.projects.filter(p => p.client_id !== id),
      retainers: prev.retainers.filter(r => r.client_id !== id)
    }));
    await supabaseService.deleteClient(id);
  };

  // Save/Edit Project
  const handleSaveProject = async (project: Project) => {
    setState(prev => {
      const exists = prev.projects.some(p => p.id === project.id);
      let updated;
      if (exists) {
        updated = prev.projects.map(p => p.id === project.id ? project : p);
      } else {
        updated = [...prev.projects, project];
      }
      return { ...prev, projects: updated };
    });
    await supabaseService.saveProject(project);
  };

  // Delete Project
  const handleDeleteProject = async (id: string) => {
    setState(prev => ({
      ...prev,
      projects: prev.projects.filter(p => p.id !== id),
      documents: prev.documents.filter(d => d.project_id !== id)
    }));
    await supabaseService.deleteProject(id);
  };

  // Save/Edit Retainer
  const handleSaveRetainer = async (retainer: Retainer) => {
    setState(prev => {
      const exists = prev.retainers.some(r => r.id === retainer.id);
      let updated;
      if (exists) {
        updated = prev.retainers.map(r => r.id === retainer.id ? retainer : r);
      } else {
        updated = [...prev.retainers, retainer];
      }
      return { ...prev, retainers: updated };
    });
    await supabaseService.saveRetainer(retainer);
  };

  // Delete Retainer
  const handleDeleteRetainer = async (id: string) => {
    setState(prev => ({
      ...prev,
      retainers: prev.retainers.filter(r => r.id !== id)
    }));
    await supabaseService.deleteRetainer(id);
  };

  // Save/Edit Document from Dashboard view (takes a single object)
  const handleSaveDocumentSingle = async (doc: DocumentAndNote) => {
    setState(prev => {
      const exists = prev.documents.some(d => d.id === doc.id);
      let updated;
      if (exists) {
        updated = prev.documents.map(d => d.id === doc.id ? doc : d);
      } else {
        updated = [...prev.documents, doc];
      }
      return { ...prev, documents: updated };
    });
    await supabaseService.saveDocument(doc);
  };

  // Delete Document
  const handleDeleteDocument = async (id: string) => {
    setState(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id)
    }));
    await supabaseService.deleteDocument(id);
  };

  // Clear Alerts Logs
  const handleClearAlertsLog = async () => {
    setState(prev => ({
      ...prev,
      alertsLog: []
    }));
    await supabaseService.clearAlertsLog();
  };

  // Onboarding Wizard complete callback (chains Client + Project + Specs)
  const handleOnboardingComplete = async (newClient: Client, newProject: Project, newDoc: DocumentAndNote) => {
    const wizardAlertId = 'wizard-' + Date.now();
    const newAlert: WebhookAlert = {
      id: wizardAlertId,
      timestamp: new Date().toISOString(),
      type: 'deadline',
      title: `Wizard Transaction for ${newClient.company_name}`,
      message: `⚡ Relational Pipeline Fired: Ingested and linked Client Profile (${newClient.company_name}), associated Project (${newProject.project_name}), and initial Markdown Specs in a unified PostgreSQL cascading transaction.`,
      recipient: 'Backoffice DB ledger',
      status: 'sent'
    };

    setState(prev => {
      const updatedClients = [...prev.clients, newClient];
      const updatedProjects = [...prev.projects, newProject];
      const updatedDocs = [...prev.documents, newDoc];

      return {
        ...prev,
        clients: updatedClients,
        projects: updatedProjects,
        documents: updatedDocs,
        alertsLog: [newAlert, ...prev.alertsLog]
      };
    });

    // Save each to database service asynchronously
    await supabaseService.saveClient(newClient);
    await supabaseService.saveProject(newProject);
    await supabaseService.saveDocument(newDoc);
    await supabaseService.saveAlert(newAlert);

    // Take the user to the newly created client details page
    setTimeout(() => {
      setSelectedClientId(newClient.id);
      setCurrentTab('clients_dash');
    }, 1500);
  };

  // Simulate Deno Edge Function: Scan Projects Due in exactly 2 Days
  const handleRunDeadlineAlerts = async () => {
    // Current anchored date is '2026-07-15'. 2 Days away is '2026-07-17'.
    const targetDate = '2026-07-17';
    
    // Find matching projects
    const matchingProjects = state.projects.filter(p => p.end_date === targetDate);
    
    if (matchingProjects.length > 0) {
      const newAlerts: WebhookAlert[] = matchingProjects.map(project => {
        const client = state.clients.find(c => c.id === project.client_id);
        const clientName = client ? client.company_name : 'Unknown Client';
        
        return {
          id: `deadline-alert-${project.id}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'deadline',
          title: `Deadline Alert: ${project.project_name}`,
          message: `⚠️ Telegram Alert Sent: Project "${project.project_name}" for client "${clientName}" is completing on ${project.end_date} (In 2 Days). Flat rate: $${project.invoiced_amount.toLocaleString()}. Webhook forwarded to Bot API.`,
          recipient: 'Telegram Admin Feed (@conextsol_ops)',
          status: 'sent'
        };
      });

      setState(prev => ({
        ...prev,
        alertsLog: [...newAlerts, ...prev.alertsLog]
      }));

      for (const alert of newAlerts) {
        await supabaseService.saveAlert(alert);
      }
    } else {
      // Log negative search outcome
      const dryAlert: WebhookAlert = {
        id: `deadline-dry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'deadline',
        title: 'Daily Deadline Scanner Executed',
        message: '🔍 Scan complete: Checked all projects due on 2026-07-17. Zero matches found in database backlog.',
        recipient: 'System Console',
        status: 'sent'
      };
      setState(prev => ({
        ...prev,
        alertsLog: [dryAlert, ...prev.alertsLog]
      }));
      await supabaseService.saveAlert(dryAlert);
    }
  };

  // Simulate Deno Edge Function: Scan Active Retainers Due Today (Cycle Day === 15)
  const handleRunRetainerAlerts = async () => {
    // Current anchored date is July 15, so billing day is 15
    const todayDayNum = 15;

    const matchingRetainers = state.retainers.filter(r => r.is_active && r.billing_cycle_day === todayDayNum);

    if (matchingRetainers.length > 0) {
      const newAlerts: WebhookAlert[] = matchingRetainers.map(ret => {
        const client = state.clients.find(c => c.id === ret.client_id);
        const clientName = client ? client.company_name : 'Unknown Client';

        return {
          id: `retainer-alert-${ret.id}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          type: 'retainer',
          title: `Retainer Billing Due: ${clientName}`,
          message: `💰 Telegram Alert Sent: Active "${ret.service_type.toUpperCase()}" retainer is due for billing today (Day ${ret.billing_cycle_day}). Amount: $${ret.billing_amount.toLocaleString()}. Generating QuickBooks invoice.`,
          recipient: 'Telegram Admin Billing Feed',
          status: 'sent'
        };
      });

      setState(prev => ({
        ...prev,
        alertsLog: [...newAlerts, ...prev.alertsLog]
      }));

      for (const alert of newAlerts) {
        await supabaseService.saveAlert(alert);
      }
    } else {
      const dryAlert: WebhookAlert = {
        id: `retainer-dry-${Date.now()}`,
        timestamp: new Date().toISOString(),
        type: 'retainer',
        title: 'Billing Scanner Executed',
        message: `🔍 Scan complete: Checked active retainers billed on Day ${todayDayNum}. Zero active entries matched.`,
        recipient: 'System Console',
        status: 'sent'
      };
      setState(prev => ({
        ...prev,
        alertsLog: [dryAlert, ...prev.alertsLog]
      }));
      await supabaseService.saveAlert(dryAlert);
    }
  };

  // Insert a new retainer contract for a specific client
  const handleAddRetainer = async (clientId: string, serviceType: string, amount: number, cycleDay: number) => {
    const newRetainer: Retainer = {
      id: 'ret-' + Math.random().toString(36).substring(2, 9),
      client_id: clientId,
      service_type: serviceType,
      billing_amount: amount,
      billing_cycle_day: cycleDay,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      retainers: [...prev.retainers, newRetainer]
    }));
    await supabaseService.saveRetainer(newRetainer);
  };

  // Insert documentation tied to a project
  const handleAddDoc = async (projectId: string, title: string, content: string, files: string) => {
    const parsedFiles = files ? files.split(',').map(f => f.trim()).filter(Boolean) : [];
    
    const newDoc: DocumentAndNote = {
      id: 'doc-' + Math.random().toString(36).substring(2, 9),
      project_id: projectId,
      title: title,
      content: content,
      file_references: parsedFiles,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setState(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
    await supabaseService.saveDocument(newDoc);

    // Auto-open this newly created document
    setSelectedDocumentId(newDoc.id);
  };

  // Edit / Save document (Restricted to Admin inside the component)
  const handleSaveDocument = async (id: string, title: string, content: string, fileRefs: string[]) => {
    setState(prev => {
      const updatedDocs = prev.documents.map(d => {
        if (d.id === id) {
          return {
            ...d,
            title,
            content,
            file_references: fileRefs,
            updated_at: new Date().toISOString()
          };
        }
        return d;
      });

      return {
        ...prev,
        documents: updatedDocs
      };
    });

    const existing = state.documents.find(d => d.id === id);
    if (existing) {
      await supabaseService.saveDocument({
        ...existing,
        title,
        content,
        file_references: fileRefs,
        updated_at: new Date().toISOString()
      });
    }
  };



  // Seed & Wipe Handlers for Local Sandbox Mode
  const handleSeedDemoData = async () => {
    setIsLoading(true);
    await supabaseService.seedDemoData();
    const [clients, projects, retainers, documents, alertsLog] = await Promise.all([
      supabaseService.getClients(),
      supabaseService.getProjects(),
      supabaseService.getRetainers(),
      supabaseService.getDocuments(),
      supabaseService.getAlertsLog()
    ]);
    setState(prev => ({
      ...prev,
      clients,
      projects,
      retainers,
      documents,
      alertsLog
    }));
    setIsLoading(false);
  };

  const handleClearAllData = async () => {
    setIsLoading(true);
    await supabaseService.clearAllData();
    setState(prev => ({
      ...prev,
      clients: [],
      projects: [],
      retainers: [],
      documents: [],
      alertsLog: []
    }));
    setIsLoading(false);
  };

  // Render Login Frame if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-neutral-200">
        {/* Subtle monochrome ambient light */}
        <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] bg-neutral-800/30 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] bg-neutral-900/40 rounded-full blur-[120px]" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-3">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-white p-0.5 shadow-xl shadow-white/5">
            <div className="h-full w-full bg-black rounded-[14px] flex items-center justify-center font-display font-black text-white text-xl tracking-tight">
              CX
            </div>
          </div>
          <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white">
            Conextsol Agency Portal
          </h2>
          <p className="text-xs text-neutral-400 max-w-xs mx-auto">
            Secure client, project, retainer management, and automated notifications ledger.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-neutral-900 border border-neutral-800 py-8 px-4 shadow-2xl rounded-2xl sm:px-10 space-y-6">
            <div className="border-b border-neutral-800 pb-3 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded uppercase ${isSupabaseConfigured ? 'bg-neutral-800 text-white border border-neutral-700' : 'bg-neutral-800 text-neutral-300 border border-neutral-700'}`}>
                  {isSupabaseConfigured ? 'Supabase Auth' : 'Local Sandbox Mode'}
                </span>
                <h3 className="text-sm font-semibold text-white mt-1.5">Sign in to Portal</h3>
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-neutral-950 border border-neutral-700 text-neutral-200 text-xs rounded-xl">
                {authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Email Address</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-500 transition-colors"
                    placeholder="e.g. admin@conextsol.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Secret Password</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400">
                    <Lock size={14} />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-black border border-neutral-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-500 transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black font-sans text-xs font-extrabold rounded-xl shadow-lg transition-all cursor-pointer text-center"
              >
                Sign In & Synchronize Portal
              </button>

              <div className="pt-2 border-t border-neutral-800 flex flex-col space-y-2">
                <p className="text-[10px] text-neutral-400 text-center font-mono">
                  Quick Access Demo Sign In:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(true)}
                    className="py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white font-mono text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center"
                  >
                    Admin Demo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(false)}
                    className="py-2 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 font-mono text-[11px] font-medium rounded-xl transition-all cursor-pointer text-center"
                  >
                    Client Guest
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Helper title bar maps
  const getTabTitle = () => {
    switch (currentTab) {
      case 'dashboard': return 'Operational Control Dashboard';
      case 'clients_dash': return 'Accounts & Contract Registries';
      case 'projects_dash': return 'Assigned Development Projects';
      case 'retainers_dash': return 'Active Retainer Engagements';
      case 'documents_dash': return 'System Specifications Sheets';
      case 'alerts_dash': return 'Dispatched Webhooks & Alerts';
      case 'wizard': return 'Linked Client Pipeline';
      case 'dev_center': return 'Dev & Deployment Center';
      default: return 'Backoffice';
    }
  };

  // Render Loader if DB is synchronizing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center font-sans space-y-4">
        <div className="h-10 w-10 border-4 border-neutral-800 border-t-white rounded-full animate-spin" />
        <p className="text-xs text-neutral-400 font-mono font-bold uppercase tracking-widest animate-pulse">
          Synchronizing Conextsol Database...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex overflow-hidden font-sans text-neutral-300">
      
      {/* Brand Sidebar Left Frame */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          setSelectedClientId(null);
          setSelectedDocumentId(null);
        }}
        isAdmin={state.isAdmin}
        setIsAdmin={(admin) => setState(prev => ({ ...prev, isAdmin: admin }))}
        userEmail={state.userEmail}
        setUserEmail={(email) => setState(prev => ({ ...prev, userEmail: email }))}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />

      {/* Main content viewport */}
      <main className="flex-1 overflow-y-auto lg:pl-64 min-h-screen flex flex-col justify-between bg-black">
        
        {/* Dynamic Nav Header Bar */}
        <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center space-x-3">
            {/* Hamburger button on mobile */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 hover:bg-neutral-800 rounded-lg text-white transition-colors mr-1 cursor-pointer"
              aria-label="Open Navigation Menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <h1 className="font-display font-extrabold tracking-tight text-white text-base md:text-lg flex items-center gap-2">
                {/* Micro branding on mobile header */}
                <span className="lg:hidden text-xs bg-neutral-800 border border-neutral-700 text-white font-mono px-1.5 py-0.5 rounded uppercase font-bold tracking-widest shrink-0">
                  Conextsol
                </span>
                <span className="truncate">
                  {selectedDocumentId 
                    ? 'System Specifications Sheets' 
                    : selectedClientId 
                      ? 'Client Profile Registry' 
                      : getTabTitle()
                  }
                </span>
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono font-semibold tracking-wider uppercase mt-0.5">
                Conextsol Backoffice • Active Context
              </p>
            </div>
          </div>

          <button
            id="signout-btn"
            onClick={handleSignOut}
            className="flex items-center space-x-1 text-neutral-400 hover:text-white font-sans text-xs transition-colors font-semibold cursor-pointer shrink-0 bg-neutral-800 lg:bg-transparent px-3 py-1.5 lg:p-0 rounded-lg lg:rounded-none border border-neutral-700 lg:border-none"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sign Out</span>
          </button>
        </header>

        {/* Primary Page Grid */}
        <div className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* RENDER SPECIFIC SUB-FLOWS */}
          {selectedDocumentId ? (
            <DocumentEditor 
              documentId={selectedDocumentId}
              state={state}
              onBack={() => setSelectedDocumentId(null)}
              onSaveDocument={handleSaveDocument}
            />
          ) : selectedClientId ? (
            <ClientDetail 
              clientId={selectedClientId}
              state={state}
              onBack={() => setSelectedClientId(null)}
              onAddRetainer={handleAddRetainer}
              onAddDoc={handleAddDoc}
              onSelectProject={(projectId) => {
                // Find matching document for this project
                const doc = state.documents.find(d => d.project_id === projectId);
                if (doc) {
                  setSelectedDocumentId(doc.id);
                } else {
                  // Fallback to creating a doc if none exists
                  handleAddDoc(projectId, 'Initial Spec Sheet', '### Project Guidelines\n\nAdd technical documentation here.', '');
                }
              }}
            />
          ) : (
            /* RENDER THE ACTIVE TAB CONTENT */
            <>
              {currentTab === 'dashboard' && (
                <DashboardStats 
                  state={state}
                  onRunDeadlineAlerts={handleRunDeadlineAlerts}
                  onRunRetainerAlerts={handleRunRetainerAlerts}
                  onSelectClient={(id) => {
                    setSelectedClientId(id);
                    setCurrentTab('clients_dash');
                  }}
                  onOpenWizard={() => setCurrentTab('wizard')}
                />
              )}

              {currentTab === 'wizard' && (
                <OnboardingWizard 
                  onComplete={handleOnboardingComplete}
                  onCancel={() => setCurrentTab('dashboard')}
                />
              )}

              {currentTab === 'clients_dash' && (
                <ClientsDashboard 
                  state={state}
                  onSelectClient={setSelectedClientId}
                  onSaveClient={handleSaveClient}
                  onDeleteClient={handleDeleteClient}
                  onOpenWizard={() => setCurrentTab('wizard')}
                  isAdmin={state.isAdmin}
                />
              )}

              {currentTab === 'projects_dash' && (
                <ProjectsDashboard 
                  state={state}
                  onSaveProject={handleSaveProject}
                  onDeleteProject={handleDeleteProject}
                  onSelectClient={(id) => {
                    setSelectedClientId(id);
                    setCurrentTab('clients_dash');
                  }}
                  isAdmin={state.isAdmin}
                />
              )}

              {currentTab === 'retainers_dash' && (
                <RetainersDashboard 
                  state={state}
                  onSaveRetainer={handleSaveRetainer}
                  onDeleteRetainer={handleDeleteRetainer}
                  onSelectClient={(id) => {
                    setSelectedClientId(id);
                    setCurrentTab('clients_dash');
                  }}
                  isAdmin={state.isAdmin}
                />
              )}

              {currentTab === 'documents_dash' && (
                <DocumentsDashboard 
                  state={state}
                  onSaveDocument={handleSaveDocumentSingle}
                  onDeleteDocument={handleDeleteDocument}
                  isAdmin={state.isAdmin}
                />
              )}

              {currentTab === 'alerts_dash' && (
                <AlertsDashboard 
                  state={state}
                  onClearAlertsLog={handleClearAlertsLog}
                  onRunDeadlineAlerts={handleRunDeadlineAlerts}
                  onRunRetainerAlerts={handleRunRetainerAlerts}
                  isAdmin={state.isAdmin}
                />
              )}

              {currentTab === 'dev_center' && (
                <DevCenter 
                  onSeedDemoData={handleSeedDemoData}
                  onClearAllData={handleClearAllData}
                  isSupabaseConnected={isSupabaseConfigured}
                />
              )}
            </>
          )}

        </div>

        {/* Footer Credit & Status Line */}
        <footer className="bg-neutral-950 border-t border-neutral-800 py-3.5 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-neutral-400 gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full inline-block bg-white animate-pulse" />
            <span className="font-mono">
              {isSupabaseConfigured 
                ? 'Production Cloud synchronized with live Supabase database' 
                : 'Local Sandbox synchronized with localStorage database'}
            </span>
          </div>
          <div>
            <span className="font-semibold text-neutral-200">Conextsol Internal Backoffice</span> v1.4.0
          </div>
        </footer>
      </main>
    </div>
  );
}
