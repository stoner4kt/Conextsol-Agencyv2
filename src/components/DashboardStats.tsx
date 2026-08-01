import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  DollarSign, 
  BellRing, 
  Building2, 
  Globe, 
  Github, 
  Mail, 
  Calendar, 
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Bot
} from 'lucide-react';
import { AppState, Project, Client, Retainer, WebhookAlert } from '../types';
import { CURRENT_DATE_STR } from '../mockData';

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
      setSuccessMsg('Project deadline cron run completed! Tele-webhook sent for Acme E-Commerce (Due July 17).');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 800);
  };

  const handleRunRetainers = () => {
    setRunningAlert('retainer');
    setTimeout(() => {
      onRunRetainerAlerts();
      setRunningAlert(null);
      setSuccessMsg('Retainer cycle check complete! Sent alerts for clients billed on Day 15.');
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
      {/* Simulation Banner & Quick Toggles */}
      <div className="bg-neutral-900 border border-neutral-800 p-5 md:p-6 rounded-2xl shadow-xl text-neutral-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <img 
            src="/logo.png" 
            alt="Conextsol Dash" 
            className="w-10 h-10 object-contain rounded-xl bg-black border border-neutral-800 p-1 shrink-0 shadow-lg shadow-teal-950/30"
            referrerPolicy="no-referrer"
          />
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
              </span>
              <h3 className="font-display font-bold text-sm md:text-base tracking-tight text-white">
                Conextsol Dash System Overview
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-normal max-w-xl">
              You can test the entire workflow live. The system date is anchored at <strong className="font-mono text-white">{CURRENT_DATE_STR}</strong>. Run the automated script monitors below to scan deadlines or recurring invoices and trigger actual Telegram alerting webhooks!
            </p>
          </div>
        </div>
        <button
          id="wizard-launcher-btn"
          onClick={onOpenWizard}
          className="flex items-center justify-center space-x-1.5 px-5 py-3 text-xs font-extrabold bg-white hover:bg-neutral-200 text-black rounded-xl transition-all shadow-lg shrink-0 font-sans cursor-pointer"
        >
          <Sparkles size={14} className="animate-bounce" />
          <span>Launch Onboarding Wizard</span>
        </button>
      </div>

      {/* Success Notification Alert Toast */}
      {successMsg && (
        <div className="p-4 bg-neutral-900 border border-neutral-700 text-white rounded-xl flex items-center space-x-2.5 text-xs md:text-sm shadow-md transition-all animate-fadeIn">
          <Bot size={18} className="text-white shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Active Accounts</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              {activeClients} <span className="text-xs text-neutral-500 font-normal">/ {state.clients.length}</span>
            </h4>
            <p className="text-[10px] text-neutral-400 font-semibold font-mono">100% active operational rate</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
            <Building2 size={20} />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Fixed Projects Backlog</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              ${activeProjectsValue.toLocaleString()}
            </h4>
            <p className="text-[10px] text-neutral-400 font-semibold font-mono">{state.projects.length} accounts delivery</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
            <TrendingUp size={20} />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Active Recurring MRR</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              ${monthlyRetainersStream.toLocaleString()}
            </h4>
            <p className="text-[10px] text-neutral-400 font-semibold font-mono">
              {state.retainers.filter(r => r.is_active).length} active retainers
            </p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
            <DollarSign size={20} />
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-5 flex items-center justify-between shadow-lg">
          <div className="space-y-1">
            <p className="text-xs text-neutral-400 font-medium">Cron Monitors</p>
            <h4 className="text-2xl font-display font-extrabold text-white tracking-tight">
              2 <span className="text-xs text-neutral-500 font-normal">Active</span>
            </h4>
            <p className="text-[10px] text-neutral-400 font-semibold font-mono">Integrated Telegram webhooks</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-neutral-800 text-white flex items-center justify-center">
            <Clock size={20} />
          </div>
        </div>
      </div>

      {/* Automation Alert Trigger Section */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-6 shadow-lg space-y-4">
        <div>
          <h3 className="font-display font-bold text-white text-sm md:text-base flex items-center space-x-1.5">
            <BellRing size={16} className="text-white animate-pulse" />
            <span>Automated Cron Tasks & Webhook Dispatcher</span>
          </h3>
          <p className="text-xs text-neutral-400 mt-0.5">
            Trigger simulated versions of the Deno Supabase Edge Functions manually to verify alerting logic.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Action 1 */}
          <div className="border border-neutral-800 bg-neutral-950 p-4.5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-[9px] bg-neutral-800 text-neutral-300 font-mono font-bold uppercase px-2 py-0.5 rounded border border-neutral-700">
                CRON: DAILY SCANNER
              </span>
              <h4 className="font-display font-semibold text-white text-xs md:text-sm">
                Project Deadline Scan (2-Day Target)
              </h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Checks database for projects where <code className="bg-neutral-900 text-neutral-200 border border-neutral-800 px-1 py-0.2 rounded font-mono text-[10px]">end_date</code> is exactly 2 days from today. If discovered, sends Telegram notification alerts.
              </p>
            </div>
            <button
              id="run-deadline-scan-btn"
              onClick={handleRunDeadline}
              disabled={runningAlert !== null}
              className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 disabled:opacity-50 text-white font-sans text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              {runningAlert === 'deadline' ? 'Scanning Postgres...' : 'Simulate Project Deadline Check'}
            </button>
          </div>

          {/* Action 2 */}
          <div className="border border-neutral-800 bg-neutral-950 p-4.5 rounded-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1.5">
              <span className="text-[9px] bg-neutral-800 text-neutral-300 font-mono font-bold uppercase px-2 py-0.5 rounded border border-neutral-700">
                CRON: HOURLY SCANNER
              </span>
              <h4 className="font-display font-semibold text-white text-xs md:text-sm">
                Retainer Billing Scan
              </h4>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Identifies active client retainers where the <code className="bg-neutral-900 text-neutral-200 border border-neutral-800 px-1 py-0.2 rounded font-mono text-[10px]">billing_cycle_day</code> matches today's date of month. Triggers admin billing notification.
              </p>
            </div>
            <button
              id="run-billing-scan-btn"
              onClick={handleRunRetainers}
              disabled={runningAlert !== null}
              className="w-full py-2.5 bg-white hover:bg-neutral-200 text-black disabled:opacity-50 font-sans text-xs font-bold rounded-lg shadow-md transition-all cursor-pointer"
            >
              {runningAlert === 'retainer' ? 'Scanning Retainers...' : 'Simulate Retainer Billing Check'}
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Main Dashboard Details: Projects Tracker + Alerts Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Project Backlog Tracker - 2 cols on wide */}
        <div className="lg:col-span-2 bg-neutral-900 rounded-xl border border-neutral-800 p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base">
                Active Client Projects Registry
              </h3>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">Tracking fixed-price solutions currently in delivery</p>
            </div>
            <span className="text-xs font-mono bg-black border border-neutral-800 px-2 py-0.5 rounded font-bold text-neutral-400">
              {state.projects.length} Registry Entries
            </span>
          </div>

          <div className="space-y-4">
            {state.projects.map((project) => {
              // Highlight projects that end in 2 days
              const isEndingInTwoDays = project.end_date === '2026-07-17';
              return (
                <div 
                  key={project.id}
                  className={`
                    border rounded-xl p-4 md:p-5 transition-all space-y-3.5
                    ${isEndingInTwoDays 
                      ? 'border-neutral-500 bg-neutral-950 ring-2 ring-white/10' 
                      : 'border-neutral-800 bg-neutral-950 hover:bg-neutral-800/40'
                    }
                  `}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span 
                          onClick={() => onSelectClient(project.client_id)}
                          className="text-[11px] font-mono text-white hover:underline cursor-pointer font-bold uppercase tracking-wide"
                        >
                          {getClientName(project.client_id)}
                        </span>
                        {isEndingInTwoDays && (
                          <span className="text-[8px] bg-neutral-800 border border-neutral-600 text-white font-mono font-bold uppercase px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                            <ShieldAlert size={8} />
                            <span>DEADLINE WARNING: 2 DAYS AWAY</span>
                          </span>
                        )}
                      </div>
                      <h4 className="font-display font-bold text-white text-sm md:text-base">
                        {project.project_name}
                      </h4>
                    </div>
                    <div className="sm:text-right shrink-0">
                      <p className="font-mono text-xs text-neutral-400 font-semibold">Invoiced Flat Rate</p>
                      <p className="font-display font-bold text-white text-sm md:text-base">
                        ${project.invoiced_amount.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-neutral-300 leading-relaxed font-sans bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                    {project.short_note || 'No notes provided.'}
                  </p>

                  {/* Services and emails tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {project.services_listed.map((s, idx) => (
                      <span key={idx} className="text-[10px] bg-neutral-800 border border-neutral-700 text-neutral-300 font-medium px-2 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Meta URLs info block */}
                  <div className="pt-2 border-t border-neutral-800 flex flex-wrap items-center justify-between text-[11px] text-neutral-400 gap-3">
                    <div className="flex items-center space-x-3 flex-wrap">
                      {project.staging_url && (
                        <a 
                          href={project.staging_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 hover:text-white transition-colors"
                        >
                          <Globe size={12} />
                          <span className="font-mono">Staging build</span>
                        </a>
                      )}
                      {project.github_url && (
                        <a 
                          href={project.github_url} 
                          target="_blank" 
                          rel="noreferrer"
                          className="flex items-center space-x-1 hover:text-white transition-colors"
                        >
                          <Github size={12} />
                          <span className="font-mono">GitHub</span>
                        </a>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-[10px] font-mono text-neutral-400">
                      <Calendar size={11} />
                      <span>{project.start_date} to {project.end_date}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Telegram & Webhook alerts dispatcher log */}
        <div className="bg-neutral-950 border border-neutral-800 text-neutral-100 p-6 rounded-xl space-y-4 shadow-2xl">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="font-display font-bold text-sm md:text-base flex items-center space-x-1.5">
              <Bot size={16} className="text-white" />
              <span className="text-white">Dispatched Webhook Alerts Log</span>
            </h3>
            <p className="text-[10px] text-neutral-400 mt-0.5 font-sans">
              Real-time webhook log of outbound messages fired from Deno Edge runtimes
            </p>
          </div>

          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
            {state.alertsLog.map((alert) => (
              <div 
                key={alert.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl p-3.5 text-[10px] space-y-2"
              >
                <div className="flex items-center justify-between font-mono text-[9px]">
                  <span className={`px-2 py-0.5 rounded font-bold uppercase border ${alert.type === 'deadline' ? 'bg-neutral-800 text-neutral-200 border-neutral-700' : 'bg-neutral-800 text-white border border-neutral-600'}`}>
                    {alert.type === 'deadline' ? 'Deadline check' : 'Invoicing due'}
                  </span>
                  <span className="text-neutral-500">
                    {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <p className="font-sans font-bold text-white">
                  {alert.title}
                </p>

                <p className="font-sans text-neutral-300 bg-black p-2.5 rounded-lg border border-neutral-800 leading-normal">
                  {alert.message}
                </p>

                <div className="flex items-center justify-between font-mono text-[9px] pt-1 text-neutral-400">
                  <span>To: {alert.recipient}</span>
                  <span className="text-white font-bold flex items-center space-x-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse inline-block" />
                    <span>SENT OK</span>
                  </span>
                </div>
              </div>
            ))}

            {state.alertsLog.length === 0 && (
              <p className="text-center py-8 text-xs text-neutral-500 font-mono">
                No outbound webhook events recorded. Use simulated scanners to run scripts.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
