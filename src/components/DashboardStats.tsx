import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  BellRing, 
  Building2, 
  Globe, 
  Github, 
  Calendar, 
  Sparkles,
  ShieldAlert,
  Bot,
  Activity,
  Layers,
  Zap,
  ArrowUpRight,
  Terminal
} from 'lucide-react';
import { AppState } from '../types';

interface DashboardStatsProps {
  state: AppState;
  onRunDeadlineAlerts: () => void;
  onRunRetainerAlerts: () => void;
  onSelectClient: (clientId: string) => void;
  onOpenWizard: () => void;
}

export default function DashboardStats({
  state,
  onRunDeadlineAlerts,
  onRunRetainerAlerts,
  onSelectClient,
  onOpenWizard
}: DashboardStatsProps) {
  const [runningAlert, setRunningAlert] = useState<'deadline' | 'retainer' | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Math helper stats
  const activeClients = state.clients.filter(c => c.status === 'active').length;
  
  const activeProjectsValue = state.projects.reduce((total, p) => total + p.invoiced_amount, 0);

  const monthlyRetainersStream = state.retainers
    .filter(r => r.is_active)
    .reduce((total, r) => total + r.billing_amount, 0);

  // Trigger simulated alerts
  const handleRunDeadline = () => {
    setRunningAlert('deadline');
    setTimeout(() => {
      onRunDeadlineAlerts();
      setRunningAlert(null);
      setSuccessMsg('Project deadline scanner completed! Dispatched alert for projects near completion window.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 800);
  };

  const handleRunRetainers = () => {
    setRunningAlert('retainer');
    setTimeout(() => {
      onRunRetainerAlerts();
      setRunningAlert(null);
      setSuccessMsg('Retainer cycle check complete! Dispatched billing webhooks for active retainers due today.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 800);
  };

  // Safe client name lookup
  const getClientName = (clientId: string) => {
    const client = state.clients.find(c => c.id === clientId);
    return client ? client.company_name : 'Unknown Client';
  };

  return (
    <div className="space-y-6">
      {/* Command Deck Hero Briefing Panel */}
      <div className="bg-gradient-to-r from-[#0d1322] via-[#0b101c] to-[#080b12] border border-[#1d263b] p-5 md:p-6 rounded-2xl shadow-xl text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-cyan-500/5 blur-3xl pointer-events-none" />
        
        <div className="flex items-start space-x-4 relative z-10">
          <div className="p-3 bg-[#06080d] border border-cyan-500/40 rounded-xl shadow-lg shadow-cyan-950/80 shrink-0">
            <Activity size={22} className="text-cyan-400" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-400" />
              </span>
              <h3 className="font-display font-extrabold text-base md:text-lg tracking-tight text-white flex items-center gap-2">
                Conextsol Command Deck <span className="text-cyan-400 font-mono text-[10px] px-1.5 py-0.5 bg-cyan-950/80 border border-cyan-800 rounded">LIVE TELEMETRY</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
              Real-time operations center tracking client contracts, active dev backlogs, recurring retainer streams, and automated dispatch webhooks. Browser clock synchronized.
            </p>
          </div>
        </div>

        <button
          id="wizard-launcher-btn"
          onClick={onOpenWizard}
          className="flex items-center justify-center space-x-2 px-5 py-3 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-xl transition-all shadow-lg shadow-cyan-950/60 shrink-0 font-sans cursor-pointer relative z-10"
        >
          <Sparkles size={15} />
          <span>Launch Intake Pipeline</span>
          <ArrowUpRight size={14} />
        </button>
      </div>

      {/* Success Notification Alert Toast */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800/80 text-emerald-200 rounded-xl flex items-center space-x-3 text-xs md:text-sm shadow-md font-mono animate-fadeIn">
          <Bot size={18} className="text-emerald-400 shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Metric KPI Telemetry Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between shadow-lg hover:border-cyan-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Client Registries</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              {activeClients} <span className="text-xs font-mono text-slate-500 font-normal">/ {state.clients.length} total</span>
            </h4>
            <p className="text-[10px] text-emerald-400 font-semibold font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              100% active contracts
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <Building2 size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between shadow-lg hover:border-cyan-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Fixed Projects Backlog</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              R {activeProjectsValue.toLocaleString()}
            </h4>
            <p className="text-[10px] text-cyan-400 font-semibold font-mono">
              {state.projects.length} project commitments
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between shadow-lg hover:border-cyan-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Active Recurring MRR</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              R {monthlyRetainersStream.toLocaleString()}
            </h4>
            <p className="text-[10px] text-emerald-400 font-semibold font-mono">
              {state.retainers.filter(r => r.is_active).length} active retainers stream
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between shadow-lg hover:border-cyan-500/30 transition-all">
          <div className="space-y-1">
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">System Cron Monitors</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              2 <span className="text-xs font-mono text-slate-500 font-normal">Active Jobs</span>
            </h4>
            <p className="text-[10px] text-amber-400 font-semibold font-mono">
              Automated Telegram Webhooks
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Command Dispatcher Automation Panel */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
        <div>
          <h3 className="font-display font-bold text-white text-sm md:text-base flex items-center space-x-2">
            <BellRing size={16} className="text-cyan-400 animate-pulse" />
            <span>Command Dispatchers & Edge Cron Monitors</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5 font-sans">
            Manually trigger automated scanner Edge functions to check database triggers and send live alert webhooks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1 */}
          <div className="border border-[#1a2234] bg-[#070a12] p-4.5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[9px] bg-cyan-950 text-cyan-300 font-mono font-bold uppercase px-2 py-0.5 rounded border border-cyan-800">
                EDGE JOB: DAILY DEADLINE SCAN
              </span>
              <h4 className="font-display font-semibold text-white text-xs md:text-sm">
                Project Target Deadline Scanner
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Scans projects where <code className="bg-[#121826] text-cyan-300 border border-[#1a2234] px-1 py-0.2 rounded font-mono text-[10px]">end_date</code> is within 2 days. Dispatches alerts to Telegram feeds.
              </p>
            </div>
            <button
              id="run-deadline-scan-btn"
              onClick={handleRunDeadline}
              disabled={runningAlert !== null}
              className="w-full py-2.5 bg-[#121826] hover:bg-[#1a2234] border border-cyan-500/40 text-cyan-300 hover:text-white font-mono text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              {runningAlert === 'deadline' ? 'Executing Database Scan...' : 'Run Target Deadline Scanner'}
            </button>
          </div>

          {/* Action 2 */}
          <div className="border border-[#1a2234] bg-[#070a12] p-4.5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <span className="text-[9px] bg-emerald-950 text-emerald-300 font-mono font-bold uppercase px-2 py-0.5 rounded border border-emerald-800">
                EDGE JOB: RECURRING BILLING SCAN
              </span>
              <h4 className="font-display font-semibold text-white text-xs md:text-sm">
                Retainer Cycle Billing Scanner
              </h4>
              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Identifies active retainers where <code className="bg-[#121826] text-emerald-300 border border-[#1a2234] px-1 py-0.2 rounded font-mono text-[10px]">billing_cycle_day</code> matches today's date. Generates billing webhooks.
              </p>
            </div>
            <button
              id="run-billing-scan-btn"
              onClick={handleRunRetainers}
              disabled={runningAlert !== null}
              className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-mono text-xs font-extrabold rounded-lg shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {runningAlert === 'retainer' ? 'Executing Retainer Scan...' : 'Run Retainer Billing Scanner'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Main Dashboard Details: Projects Operations + Dispatched Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Project Backlog Operations - 2 cols */}
        <div className="lg:col-span-2 bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a2234] pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                Active Project Operations Backlog
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Fixed-price client deliverables in active production</p>
            </div>
            <span className="text-xs font-mono bg-[#06080d] border border-[#1a2234] px-2.5 py-1 rounded font-semibold text-cyan-400">
              {state.projects.length} Committed
            </span>
          </div>

          <div className="space-y-4">
            {state.projects.map((project) => {
              const getDaysUntilEnd = (dateStr: string) => {
                if (!dateStr) return 999;
                const parts = dateStr.split('-').map(Number);
                if (parts.length < 3) return 999;
                const end = new Date(parts[0], parts[1] - 1, parts[2]);
                end.setHours(0, 0, 0, 0);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              };
              const daysLeft = getDaysUntilEnd(project.end_date);
              const isEndingInTwoDays = daysLeft >= 0 && daysLeft <= 2;
              return (
                <div 
                  key={project.id}
                  className={`
                    border rounded-xl p-4 md:p-5 transition-all space-y-3.5
                    ${isEndingInTwoDays 
                      ? 'border-amber-500/60 bg-[#120d06] ring-1 ring-amber-500/30' 
                      : 'border-[#1a2234] bg-[#070a12] hover:border-cyan-500/30'
                    }
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          onClick={() => onSelectClient(project.client_id)}
                          className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 cursor-pointer font-bold uppercase tracking-wide flex items-center gap-1"
                        >
                          {getClientName(project.client_id)}
                          <ArrowUpRight size={11} />
                        </span>
                        {isEndingInTwoDays && (
                          <span className="text-[9px] bg-amber-950/80 border border-amber-800 text-amber-300 font-mono font-bold uppercase px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldAlert size={10} />
                            DEADLINE WINDOW: 2 DAYS AWAY
                          </span>
                        )}
                      </div>
                      <h4 className="font-display font-bold text-white text-sm md:text-base">
                        {project.project_name}
                      </h4>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="font-mono text-[10px] text-slate-400 uppercase tracking-wider">Flat Rate Fee</p>
                      <p className="font-display font-extrabold text-white text-sm md:text-base">
                        R {project.invoiced_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans bg-[#0b0e17] border border-[#1a2234] p-3 rounded-lg">
                    {project.short_note || 'No operational notes documented.'}
                  </p>

                  {/* Services tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {project.services_listed.map((s, idx) => (
                      <span key={idx} className="text-[10px] font-mono bg-[#101624] border border-[#1a2234] text-slate-300 px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Meta links info block */}
                  <div className="pt-2 border-t border-[#1a2234] flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-3 font-mono">
                    <div className="flex items-center space-x-3 flex-wrap">
                      {project.staging_url && (
                        <a 
                          href={project.staging_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-cyan-400 hover:underline"
                        >
                          <Globe size={12} />
                          <span>Staging Environment</span>
                        </a>
                      )}
                      {project.github_url && (
                        <a 
                          href={project.github_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 text-slate-300 hover:text-white"
                        >
                          <Github size={12} />
                          <span>Repository</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] text-slate-400">
                      <Calendar size={11} className="text-cyan-400" />
                      <span>{project.start_date} → {project.end_date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telegram & Webhook alerts dispatcher log */}
        <div className="bg-[#0b0f19] border border-[#1a2234] text-slate-100 p-6 rounded-xl space-y-4 shadow-xl flex flex-col">
          <div className="border-b border-[#1a2234] pb-3">
            <h3 className="font-display font-bold text-sm md:text-base flex items-center space-x-2">
              <Terminal size={16} className="text-cyan-400" />
              <span>Dispatched Event Stream</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
              Live audit ledger of outbound webhook dispatches
            </p>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 flex-1">
            {state.alertsLog.map((alert) => (
              <div 
                key={alert.id}
                className="bg-[#070a12] border border-[#1a2234] rounded-xl p-3.5 text-[10px] space-y-2"
              >
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase border ${
                    alert.type === 'deadline' 
                      ? 'bg-amber-950/80 text-amber-300 border-amber-800' 
                      : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                  }`}>
                    {alert.type === 'deadline' ? 'Deadline Trigger' : 'Retainer Billing'}
                  </span>
                  <span className="text-slate-500">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="font-sans font-bold text-white text-xs">
                  {alert.title}
                </p>

                <p className="font-mono text-slate-300 bg-[#0b0e17] p-2.5 rounded-lg border border-[#1a2234] leading-relaxed text-[10px]">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between font-mono text-[9px] pt-1 text-slate-400">
                  <span className="truncate max-w-[140px]">Dest: {alert.recipient}</span>
                  <span className="text-emerald-400 font-bold flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                    <span>DISPATCHED</span>
                  </span>
                </div>
              </div>
            ))}

            {state.alertsLog.length === 0 && (
              <p className="text-center py-12 text-xs text-slate-500 font-mono">
                Zero webhook dispatches recorded. Run scanners to generate live events.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
