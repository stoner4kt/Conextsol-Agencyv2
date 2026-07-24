import React, { useState } from 'react';
import { 
  BellRing, 
  Search, 
  Trash2, 
  AlertCircle, 
  Calendar, 
  Clock, 
  Bot, 
  Send,
  Sparkles,
  RefreshCw,
  X
} from 'lucide-react';
import { WebhookAlert, AppState } from '../types';

interface AlertsDashboardProps {
  state: AppState;
  onClearAlertsLog: () => void;
  onRunDeadlineAlerts: () => void;
  onRunRetainerAlerts: () => void;
  isAdmin: boolean;
}

export default function AlertsDashboard({
  state,
  onClearAlertsLog,
  onRunDeadlineAlerts,
  onRunRetainerAlerts,
  isAdmin
}: AlertsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [runningAlert, setRunningAlert] = useState<'deadline' | 'retainer' | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Stats
  const totalCount = state.alertsLog.length;
  const deadlineCount = state.alertsLog.filter(a => a.type === 'deadline').length;
  const retainerCount = state.alertsLog.filter(a => a.type === 'retainer').length;

  // Filters
  const filteredAlerts = state.alertsLog.filter(alert => {
    const matchesSearch = 
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || alert.type === filterType;

    return matchesSearch && matchesType;
  });

  // Action dispatches
  const handleRunDeadline = () => {
    setRunningAlert('deadline');
    setTimeout(() => {
      onRunDeadlineAlerts();
      setRunningAlert(null);
      setSuccessMsg('Daily Scan Complete: Triggered telegram alert sequence for projects terminating within 48h.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 700);
  };

  const handleRunRetainers = () => {
    setRunningAlert('retainer');
    setTimeout(() => {
      onRunRetainerAlerts();
      setRunningAlert(null);
      setSuccessMsg('Retainer Cycle Scan Complete: Dispatched telegram alerts for accounts billed on Day 15.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Simulation success alerts toast */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-between text-xs md:text-sm shadow-md animate-fadeIn">
          <div className="flex items-center space-x-2.5">
            <Bot size={18} className="shrink-0" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1B122B] border border-purple-900/20 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-gray-400 font-mono font-semibold tracking-wide uppercase">Total Alerts Fired</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{totalCount}</h4>
            <span className="text-[10px] text-purple-400 font-mono">logs table</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-purple-500/10 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-purple-400 font-mono font-semibold tracking-wide uppercase">Deadline Alerts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-purple-300">{deadlineCount}</h4>
            <span className="text-[9px] bg-purple-500/10 text-purple-300 px-1.5 py-0.2 rounded font-mono font-bold">CRON DAILY</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-emerald-500/10 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold tracking-wide uppercase">Billing Invoices</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-emerald-400">{retainerCount}</h4>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">CRON HOURLY</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-emerald-500/10 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold tracking-wide uppercase">Delivery Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-emerald-400">100%</h4>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">TRANSMITTED</span>
          </div>
        </div>
      </div>

      {/* 2. Admin trigger block */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-5 shadow-lg space-y-4">
        <div>
          <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
            <Bot size={15} className="text-purple-400" />
            <span>Manual Script / Webhook Executions</span>
          </h3>
          <p className="text-[10px] text-gray-400 mt-0.5">
            Trigger simulated scans to query active postgres tables, parse deadlines or billing days, and fire outgoing webhooks.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={handleRunDeadline}
            disabled={runningAlert !== null}
            className="flex items-center justify-center space-x-2 py-3 bg-[#130B21] hover:bg-[#0F081C] border border-purple-900/40 text-xs text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={runningAlert === 'deadline' ? 'animate-spin text-purple-400' : 'text-purple-400'} />
            <span>{runningAlert === 'deadline' ? 'Scanning Projects...' : 'Trigger Project Deadline Scan'}</span>
          </button>

          <button
            onClick={handleRunRetainers}
            disabled={runningAlert !== null}
            className="flex items-center justify-center space-x-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] text-xs font-black rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={runningAlert === 'retainer' ? 'animate-spin text-black' : 'text-black'} />
            <span>{runningAlert === 'retainer' ? 'Scanning Retainers...' : 'Trigger Retainer Billing Scan'}</span>
          </button>
        </div>
      </div>

      {/* 3. Filtering Toolbar */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search dispatch logs by message payload, title, client names..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-xl text-xs font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All Webhook Types</option>
            <option value="deadline">Project Deadlines Only</option>
            <option value="retainer">Billing Invoices Only</option>
          </select>

          {isAdmin && state.alertsLog.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to permanently clear the transmission logs history?')) {
                  onClearAlertsLog();
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 font-sans text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Reset Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Logs rendering */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 shadow-xl overflow-hidden divide-y divide-purple-900/10">
        {filteredAlerts.map((alert) => {
          const isDeadline = alert.type === 'deadline';
          return (
            <div key={alert.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-purple-900/5 transition-all">
              <div className="space-y-2 text-left flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`
                    px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-black border
                    ${isDeadline 
                      ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }
                  `}>
                    {isDeadline ? 'Project Deadline scanner' : 'Retainer invoice due'}
                  </span>
                  <span className="flex items-center space-x-1 text-[10px] text-gray-500 font-mono">
                    <Clock size={11} />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </span>
                </div>

                <h4 className="font-display font-bold text-white text-xs md:text-sm">
                  {alert.title}
                </h4>

                <p className="text-xs text-gray-300 bg-[#0A0514] border border-purple-900/20 p-3 rounded-lg leading-relaxed font-sans font-medium whitespace-pre-wrap max-w-4xl">
                  {alert.message}
                </p>
              </div>

              <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-purple-900/10">
                <div>
                  <span className="text-[9px] font-mono font-bold text-gray-500 uppercase block">Transmission Channel</span>
                  <span className="text-xs font-mono font-bold text-gray-400 block">{alert.recipient}</span>
                </div>

                <span className="text-[10px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>TRANSMITTED OK</span>
                </span>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 bg-[#1B122B]/30 space-y-3">
            <BellRing size={28} className="text-gray-600 mx-auto animate-bounce" />
            <h4 className="font-display font-bold text-white text-xs md:text-sm">No Webhook Logs Recorded</h4>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Outbound Telegram dispatch logs are empty. Run simulated daily/hourly monitors above to dispatch notifications.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
