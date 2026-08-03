import React, { useState } from 'react';
import { 
  BellRing, 
  Search, 
  Trash2, 
  Clock, 
  Bot, 
  RefreshCw, 
  X
} from 'lucide-react';
import { AppState } from '../types';

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
      setSuccessMsg('Deadline Scan Executed: Checked active project deliverables terminating within 48 hours.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 700);
  };

  const handleRunRetainers = () => {
    setRunningAlert('retainer');
    setTimeout(() => {
      onRunRetainerAlerts();
      setRunningAlert(null);
      setSuccessMsg('Retainer Cycle Scan Executed: Parsed billing cycle schedules for monthly SLA streams.');
      setTimeout(() => setSuccessMsg(null), 5000);
    }, 700);
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {successMsg && (
        <div className="p-4 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl flex items-center justify-between text-xs md:text-sm shadow-lg animate-fadeIn font-mono">
          <div className="flex items-center space-x-2.5">
            <Bot size={18} className="shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="p-1 hover:bg-emerald-900 rounded text-emerald-400">
            <X size={14} />
          </button>
        </div>
      )}

      {/* 1. Header Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Total Alert Dispatches</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{totalCount}</h4>
            <span className="text-[10px] text-slate-500 font-mono">logs table</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Deadline Alerts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-cyan-400">{deadlineCount}</h4>
            <span className="text-[9px] bg-[#06080d] border border-[#1a2234] text-slate-400 px-1.5 py-0.2 rounded font-mono font-bold">DAILY</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Billing Invoices</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-emerald-400">{retainerCount}</h4>
            <span className="text-[9px] bg-[#06080d] border border-[#1a2234] text-slate-400 px-1.5 py-0.2 rounded font-mono font-bold">MONTHLY</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Delivery Status</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-slate-200">100%</h4>
            <span className="text-[9px] bg-[#06080d] border border-[#1a2234] text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">ACTIVE</span>
          </div>
        </div>
      </div>

      {/* 2. Admin trigger block */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 shadow-lg space-y-4">
        <div>
          <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
            <Bot size={15} className="text-cyan-400" />
            <span>Manual Signal & Webhook Dispatchers</span>
          </h3>
          <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
            Trigger on-demand routine scans for project milestones or SLA retainer billing cycles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono">
          <button
            onClick={handleRunDeadline}
            disabled={runningAlert !== null}
            className="flex items-center justify-center space-x-2 py-3 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-xs text-slate-200 font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={12} className={runningAlert === 'deadline' ? 'animate-spin text-cyan-400' : 'text-slate-400'} />
            <span>{runningAlert === 'deadline' ? 'Scanning Projects...' : 'Run Project Deadline Scan'}</span>
          </button>

          <button
            onClick={handleRunRetainers}
            disabled={runningAlert !== null}
            className="flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 text-xs font-extrabold rounded-xl transition-all cursor-pointer disabled:opacity-50 font-sans"
          >
            <RefreshCw size={12} className={runningAlert === 'retainer' ? 'animate-spin text-slate-950' : 'text-slate-950'} />
            <span>{runningAlert === 'retainer' ? 'Scanning Retainers...' : 'Run Retainer Billing Scan'}</span>
          </button>
        </div>
      </div>

      {/* 3. Filtering Toolbar */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono">
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search dispatch logs..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Notification Types</option>
            <option value="deadline">Project Deadlines</option>
            <option value="retainer">Retainer Billing</option>
          </select>

          {isAdmin && state.alertsLog.length > 0 && (
            <button
              onClick={() => {
                if (confirm('Clear alert dispatch history?')) {
                  onClearAlertsLog();
                }
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-400 hover:text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Reset Logs</span>
            </button>
          )}
        </div>
      </div>

      {/* 4. Logs rendering */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] shadow-xl overflow-hidden divide-y divide-[#1a2234]">
        {filteredAlerts.map((alert) => {
          const isDeadline = alert.type === 'deadline';
          return (
            <div key={alert.id} className="p-4 md:p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-[#121826]/60 transition-all">
              <div className="space-y-2 text-left flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`
                    px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-black border
                    ${isDeadline 
                      ? 'bg-cyan-950 text-cyan-300 border-cyan-800' 
                      : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                    }
                  `}>
                    {isDeadline ? 'Project Milestone Alert' : 'Retainer Billing Alert'}
                  </span>
                  <span className="flex items-center space-x-1 text-[10px] text-slate-500 font-mono">
                    <Clock size={11} />
                    <span>{new Date(alert.timestamp).toLocaleString()}</span>
                  </span>
                </div>

                <h4 className="font-display font-bold text-white text-xs md:text-sm">
                  {alert.title}
                </h4>

                <p className="text-xs text-slate-300 bg-[#06080d] border border-[#1a2234] p-3 rounded-lg leading-relaxed font-sans font-medium whitespace-pre-wrap max-w-4xl">
                  {alert.message}
                </p>
              </div>

              <div className="shrink-0 flex md:flex-col items-center md:items-end justify-between md:justify-start gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-[#1a2234] font-mono">
                <div>
                  <span className="text-[9px] font-bold text-slate-500 uppercase block">Recipient</span>
                  <span className="text-xs font-bold text-slate-400 block">{alert.recipient}</span>
                </div>

                <span className="text-[10px] bg-[#06080d] border border-emerald-800/80 text-emerald-400 font-bold px-2 py-0.5 rounded flex items-center space-x-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse inline-block" />
                  <span>DISPATCHED</span>
                </span>
              </div>
            </div>
          );
        })}

        {filteredAlerts.length === 0 && (
          <div className="text-center py-16 bg-[#0b0f19] space-y-3 font-mono">
            <BellRing size={28} className="text-slate-600 mx-auto animate-bounce" />
            <h4 className="font-display font-bold text-white text-xs md:text-sm">No Webhook Logs Recorded</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-sans">
              Alert log history is clean. Execute a manual scan above to test dispatch routines.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
