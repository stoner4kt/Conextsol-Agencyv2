import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  LogOut, 
  Mail, 
  Menu,
  Activity,
  Cpu,
  Radio,
  Clock
} from 'lucide-react';
import { AppState, Client, Project, Retainer, DocumentAndNote, WebhookAlert, AIToolAccount } from './types';
import { 
  getInitialState
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
import AIToolTrackerDashboard from './components/AIToolTrackerDashboard';
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
          const [clients, projects, retainers, documents, alertsLog, aiToolAccounts] = await Promise.all([
            supabaseService.getClients(),
            supabaseService.getProjects(),
            supabaseService.getRetainers(),
            supabaseService.getDocuments(),
            supabaseService.getAlertsLog(),
            supabaseService.getAIToolAccounts()
          ]);
          
          setState(prev => ({
            ...prev,
            clients,
            projects,
            retainers,
            documents,
            alertsLog,
            aiToolAccounts
          }));
        } else {
          // Clear cached state if signed out
          setState(prev => ({
            ...prev,
            clients: [],
            projects: [],
            retainers: [],
            documents: [],
            alertsLog: [],
            aiToolAccounts: []
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

  // AI Tool Accounts Handlers
  const handleSaveAIToolAccount = async (account: AIToolAccount) => {
    setState(prev => {
      const exists = prev.aiToolAccounts.some(a => a.id === account.id);
      let updated;
      if (exists) {
        updated = prev.aiToolAccounts.map(a => a.id === account.id ? account : a);
      } else {
        updated = [account, ...prev.aiToolAccounts];
      }
      return { ...prev, aiToolAccounts: updated };
    });
    await supabaseService.saveAIToolAccount(account);
  };

  const handleDeleteAIToolAccount = async (id: string) => {
    setState(prev => ({
      ...prev,
      aiToolAccounts: prev.aiToolAccounts.filter(a => a.id !== id)
    }));
    await supabaseService.deleteAIToolAccount(id);
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
    const wizardAlertId = crypto.randomUUID();
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
    const inTwoDays = new Date();
    inTwoDays.setDate(inTwoDays.getDate() + 2);
    const targetDate = `${inTwoDays.getFullYear()}-${String(inTwoDays.getMonth() + 1).padStart(2, '0')}-${String(inTwoDays.getDate()).padStart(2, '0')}`;
    
    // Find matching projects
    const matchingProjects = state.projects.filter(p => p.end_date === targetDate);
    
    if (matchingProjects.length > 0) {
      const newAlerts: WebhookAlert[] = matchingProjects.map(project => {
        const client = state.clients.find(c => c.id === project.client_id);
        const clientName = client ? client.company_name : 'Unknown Client';
        
        return {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'deadline',
          title: `Deadline Alert: ${project.project_name}`,
          message: `⚠️ Telegram Alert Sent: Project "${project.project_name}" for client "${clientName}" is completing on ${project.end_date} (In 2 Days). Flat rate: R ${project.invoiced_amount.toLocaleString()}. Webhook forwarded to Bot API.`,
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
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        type: 'deadline',
        title: 'Daily Deadline Scanner Executed',
        message: `🔍 Scan complete: Checked all projects due on ${targetDate}. Zero matches found in database backlog.`,
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

  // Simulate Deno Edge Function: Scan Active Retainers Due Today
  const handleRunRetainerAlerts = async () => {
    const todayDayNum = new Date().getDate();

    const matchingRetainers = state.retainers.filter(r => r.is_active && r.billing_cycle_day === todayDayNum);

    if (matchingRetainers.length > 0) {
      const newAlerts: WebhookAlert[] = matchingRetainers.map(ret => {
        const client = state.clients.find(c => c.id === ret.client_id);
        const clientName = client ? client.company_name : 'Unknown Client';

        return {
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          type: 'retainer',
          title: `Retainer Billing Due: ${clientName}`,
          message: `💰 Telegram Alert Sent: Active "${ret.service_type.toUpperCase()}" retainer is due for billing today (Day ${ret.billing_cycle_day}). Amount: R ${ret.billing_amount.toLocaleString()}. Generating QuickBooks invoice.`,
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
        id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
      id: crypto.randomUUID(),
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
    const [clients, projects, retainers, documents, alertsLog, aiToolAccounts] = await Promise.all([
      supabaseService.getClients(),
      supabaseService.getProjects(),
      supabaseService.getRetainers(),
      supabaseService.getDocuments(),
      supabaseService.getAlertsLog(),
      supabaseService.getAIToolAccounts()
    ]);
    setState(prev => ({
      ...prev,
      clients,
      projects,
      retainers,
      documents,
      alertsLog,
      aiToolAccounts
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
      alertsLog: [],
      aiToolAccounts: []
    }));
    setIsLoading(false);
  };

  // Render Login Frame if not authenticated
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#06080d] bg-command-grid flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans text-slate-200">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-900/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center space-y-3">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-[#0a0e1a] border border-cyan-500/40 p-2 shadow-2xl shadow-cyan-950/60 justify-center items-center relative">
            <img 
              src="/logo.png" 
              alt="Conextsol Command Centre Logo" 
              className="h-full w-full object-contain"
              referrerPolicy="no-referrer"
            />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-display font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
              Conextsol <span className="text-cyan-400 font-mono text-sm px-2 py-0.5 bg-cyan-950 border border-cyan-800 rounded-md">ADMIN OS</span>
            </h2>
            <p className="text-[10px] text-cyan-400 font-mono font-bold uppercase tracking-widest mt-1">
              Command Centre Terminal
            </p>
          </div>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Authorized operations only. Client registries, project telemetry, retainers, and dispatch engines.
          </p>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-[#0b0f19] border border-[#1d263b] py-8 px-4 shadow-2xl rounded-2xl sm:px-8 space-y-5">
            <div className="border-b border-[#1d263b] pb-3 flex items-center justify-between">
              <div>
                <span className={`text-[10px] font-mono font-bold tracking-wider px-2 py-0.5 rounded uppercase border ${
                  isSupabaseConfigured 
                    ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' 
                    : 'bg-cyan-950/80 text-cyan-400 border-cyan-800'
                }`}>
                  {isSupabaseConfigured ? 'Supabase Live' : 'Local Sandbox Engine'}
                </span>
                <h3 className="text-xs font-mono font-semibold text-slate-300 mt-2">ACCESS AUTHENTICATION</h3>
              </div>
              <Radio size={16} className="text-cyan-400 animate-pulse" />
            </div>

            {authError && (
              <div className="p-3 bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs rounded-xl font-mono">
                {authError}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleLogin}>
              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">User Handle / Email</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail size={14} />
                  </div>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#06080d] border border-[#1d263b] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                    placeholder="admin@conextsol.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-300 mb-1.5">Command Cipher</label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={14} />
                  </div>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-[#06080d] border border-[#1d263b] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-sans text-xs font-extrabold rounded-xl shadow-lg shadow-cyan-950 transition-all cursor-pointer text-center"
              >
                Authenticate Operations Session
              </button>

              <div className="pt-3 border-t border-[#1d263b] flex flex-col space-y-2">
                <p className="text-[10px] text-slate-400 text-center font-mono uppercase tracking-wider">
                  Instant Simulation Modes:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(true)}
                    className="py-2 bg-[#121826] hover:bg-[#1a2234] border border-cyan-800/60 text-cyan-300 font-mono text-[11px] font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1"
                  >
                    <ShieldCheck size={13} />
                    Admin OS
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDemoLogin(false)}
                    className="py-2 bg-[#090d16] hover:bg-[#101624] border border-[#1d263b] text-slate-400 font-mono text-[11px] font-medium rounded-xl transition-all cursor-pointer text-center"
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
      case 'dashboard': return 'Command Deck';
      case 'clients_dash': return 'Client Registry Command';
      case 'projects_dash': return 'Project Operations Board';
      case 'retainers_dash': return 'Recurring Revenue Console';
      case 'documents_dash': return 'Specification Vault';
      case 'ai_tools_tracker': return 'AI Resource Capacity Grid';
      case 'alerts_dash': return 'Dispatch Event Stream';
      case 'wizard': return 'Client Intake Pipeline';
      case 'dev_center': return 'Deployment & Data Operations';
      default: return 'Command Centre';
    }
  };

  // Render Loader if DB is synchronizing
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#06080d] bg-command-grid flex flex-col items-center justify-center font-sans space-y-4">
        <div className="relative">
          <img 
            src="/logo.png" 
            alt="Conextsol Command Centre" 
            className="w-14 h-14 object-contain animate-pulse"
            referrerPolicy="no-referrer"
          />
          <span className="absolute -inset-2 rounded-full border border-cyan-500/30 animate-ping" />
        </div>
        <div className="h-6 w-6 border-2 border-slate-800 border-t-cyan-400 rounded-full animate-spin" />
        <p className="text-xs text-slate-400 font-mono font-bold uppercase tracking-widest animate-pulse">
          Syncing Command Centre Database...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06080d] bg-command-grid flex overflow-hidden font-sans text-slate-200">
      
      {/* Operations Rail */}
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

      {/* Main Mission Canvas Viewport */}
      <main className="flex-1 overflow-y-auto lg:pl-64 min-h-screen flex flex-col justify-between bg-radial-glow">
        
        {/* Sticky Command Header */}
        <header className="bg-[#090d16]/95 backdrop-blur-md border-b border-[#1a2234] px-5 py-3.5 flex items-center justify-between sticky top-0 z-20 shadow-md shadow-black/40">
          <div className="flex items-center space-x-3 min-w-0">
            {/* Hamburger toggle on mobile */}
            <button
              id="mobile-menu-toggle"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-1.5 bg-[#121826] border border-[#1a2234] hover:bg-[#1a2234] rounded-lg text-white transition-colors cursor-pointer shrink-0"
              aria-label="Open Operations Rail"
            >
              <Menu size={20} />
            </button>

            <div className="flex items-center space-x-3 min-w-0">
              <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d1322] border border-cyan-500/30 text-cyan-400 shrink-0">
                <Cpu size={18} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h1 className="font-display font-extrabold tracking-tight text-white text-base md:text-lg truncate">
                    {selectedDocumentId 
                      ? 'Specification Document Console' 
                      : selectedClientId 
                        ? 'Account Intelligence Profile' 
                        : getTabTitle()
                    }
                  </h1>
                  <span className="hidden md:inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                    ONLINE
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider uppercase truncate">
                  Admin Command Layer • {state.isAdmin ? 'FULL ACCESS' : 'SIMULATION MODE'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <div className="hidden lg:flex items-center space-x-2 text-xs font-mono text-slate-400 bg-[#0d1322] border border-[#1a2234] px-2.5 py-1 rounded-lg">
              <Activity size={13} className="text-cyan-400" />
              <span>LATENCY: 12ms</span>
            </div>

            <button
              id="signout-btn"
              onClick={handleSignOut}
              className="flex items-center space-x-1.5 text-slate-300 hover:text-white font-mono text-xs transition-colors font-medium cursor-pointer bg-[#121826] hover:bg-[#1a2234] px-3 py-1.5 rounded-lg border border-[#1a2234]"
            >
              <LogOut size={14} className="text-slate-400" />
              <span className="hidden sm:inline">Terminate Session</span>
            </button>
          </div>
        </header>

        {/* Mission Canvas Primary Grid */}
        <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          
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
                const doc = state.documents.find(d => d.project_id === projectId);
                if (doc) {
                  setSelectedDocumentId(doc.id);
                } else {
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

              {currentTab === 'ai_tools_tracker' && (
                <AIToolTrackerDashboard 
                  state={state}
                  onSaveAccount={handleSaveAIToolAccount}
                  onDeleteAccount={handleDeleteAIToolAccount}
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

        {/* System Status Bar Footer */}
        <footer className="bg-[#080b12] border-t border-[#1a2234] py-3 px-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono">
              {isSupabaseConfigured 
                ? 'Production Cloud :: Synchronized with Live PostgreSQL / Supabase Ledger' 
                : 'Local Sandbox :: Synchronized with Local Storage Persistence Engine'}
            </span>
          </div>
          <div className="flex items-center space-x-3 font-mono text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <Clock size={11} className="text-cyan-400" />
              SYSTEM ACTIVE
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-300 font-semibold">Conextsol Command Centre v2.0</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
