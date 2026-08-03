import React from 'react';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  FileText, 
  UserCheck, 
  X, 
  AlertCircle,
  Layers,
  CreditCard,
  BellRing,
  PieChart,
  Zap
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  isAdmin: boolean;
  setIsAdmin: (admin: boolean) => void;
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({
  currentTab,
  setCurrentTab,
  isAdmin,
  setIsAdmin,
  userEmail,
  setUserEmail,
  mobileOpen,
  setMobileOpen,
}: SidebarProps) {

  const navItems = [
    { id: 'dashboard', label: 'System Overview', icon: PieChart, code: '01' },
    { id: 'clients_dash', label: 'Clients Dashboard', icon: Building2, code: '02' },
    { id: 'projects_dash', label: 'Projects Dashboard', icon: Layers, code: '03' },
    { id: 'retainers_dash', label: 'Retainers Dashboard', icon: CreditCard, code: '04' },
    { id: 'documents_dash', label: 'Specifications Docs', icon: FileText, code: '05' },
    { id: 'ai_tools_tracker', label: 'AI Tool Limits', icon: Zap, code: '06' },
    { id: 'alerts_dash', label: 'Dispatched Webhooks', icon: BellRing, code: '07' },
    { id: 'wizard', label: 'Onboarding Pipeline', icon: UserCheck, code: '08' },
  ];

  const toggleAdmin = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setUserEmail('client@zenithretail.co');
    } else {
      setIsAdmin(true);
      setUserEmail('reeqieric41@gmail.com');
    }
  };

  return (
    <>
      {/* Sidebar Operations Rail */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#080b12] text-slate-200 flex flex-col justify-between
        transform lg:transform-none lg:opacity-100 transition-all duration-300 border-r border-[#1a2234]
        ${mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-5 border-b border-[#1a2234] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/logo.png" 
                alt="Conextsol Command Centre Logo" 
                className="w-9 h-9 object-contain rounded-lg bg-black/80 border border-cyan-500/30 p-1 shrink-0 shadow-lg shadow-cyan-950/50"
                referrerPolicy="no-referrer"
              />
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse border-2 border-[#080b12]" />
            </div>
            <div>
              <h1 className="font-display font-bold tracking-tight text-white text-sm leading-tight flex items-center gap-1.5">
                Conextsol <span className="text-cyan-400 font-mono text-[10px] px-1 py-0.2 bg-cyan-950/60 border border-cyan-800/50 rounded">OS</span>
              </h1>
              <p className="text-[9px] text-slate-400 font-mono tracking-wider uppercase mt-0.5">
                Command Centre
              </p>
            </div>
          </div>
          <button 
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 hover:bg-[#121826] rounded-lg text-slate-400 hover:text-white transition-colors"
            aria-label="Close Operations Rail"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-semibold">
              Mission Modules
            </p>
            <span className="text-[9px] font-mono text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-900/40">8 READY</span>
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-tab-${item.id}`}
                onClick={() => {
                  setCurrentTab(item.id);
                  setMobileOpen(false);
                }}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150 group cursor-pointer border
                  ${isActive 
                    ? 'bg-gradient-to-r from-cyan-950/50 to-slate-900/40 border-cyan-500/50 text-white font-semibold shadow-sm shadow-cyan-950' 
                    : 'bg-transparent border-transparent text-slate-400 hover:bg-[#121826] hover:text-slate-200'
                  }
                `}
              >
                <div className="flex items-center space-x-2.5 min-w-0">
                  <Icon size={16} className={`shrink-0 transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span className="truncate">{item.label}</span>
                </div>
                <span className={`font-mono text-[9px] px-1.5 py-0.2 rounded border ${
                  isActive ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold' : 'bg-[#0e1422] text-slate-600 border-slate-800 group-hover:text-slate-400'
                }`}>
                  {item.code}
                </span>
              </button>
            );
          })}

          {/* Access Control Information Widget */}
          <div className="mt-6 pt-4 border-t border-[#1a2234]">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-semibold px-2 mb-2">
              Security Context
            </p>
            <div className="bg-[#0b0e17] border border-[#1a2234] rounded-xl p-3 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <User size={12} className="text-slate-500" />
                  <span className="text-[11px]">Account:</span>
                </span>
                <span className="font-mono text-[10px] font-semibold text-white truncate max-w-[100px]" title={userEmail || ''}>
                  {userEmail?.split('@')[0]}
                </span>
              </div>
              
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5 text-slate-400">
                  <ShieldCheck size={12} className="text-slate-500" />
                  <span className="text-[11px]">Role:</span>
                </span>
                <span className={`px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold border ${
                  isAdmin 
                    ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60' 
                    : 'bg-amber-950/60 text-amber-400 border-amber-800/60'
                }`}>
                  {isAdmin ? 'System Admin' : 'Client Guest'}
                </span>
              </div>

              {!isAdmin && (
                <div className="text-[10px] text-amber-400/90 bg-amber-950/30 border border-amber-900/40 rounded p-1.5 leading-tight flex items-start space-x-1.5 mt-1 font-sans">
                  <AlertCircle size={12} className="shrink-0 mt-0.5 text-amber-400" />
                  <span>Read-only simulation mode active. Editing restricted.</span>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* User Context Controls (Role Toggle Switcher) */}
        <div className="p-3 border-t border-[#1a2234] bg-[#080b12]">
          <button
            id="role-toggle-btn"
            onClick={toggleAdmin}
            className="w-full flex items-center justify-between bg-[#0e1422] hover:bg-[#141c2e] border border-[#1a2234] rounded-xl p-2.5 text-xs text-slate-200 transition-all cursor-pointer group"
          >
            <div className="text-left">
              <p className="font-semibold text-[11px] group-hover:text-white transition-colors">Role Simulation</p>
              <p className="text-[9px] text-slate-400 font-mono">Toggle Admin / Guest</p>
            </div>
            <div className={`relative inline-flex items-center h-5 rounded-full w-9 transition-colors border ${
              isAdmin ? 'bg-cyan-950 border-cyan-600' : 'bg-slate-900 border-slate-700'
            }`}>
              <span className={`inline-block w-3.5 h-3.5 transform rounded-full transition-transform ${
                isAdmin ? 'translate-x-4.5 bg-cyan-400 shadow-sm shadow-cyan-400' : 'translate-x-0.5 bg-slate-400'
              }`} />
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
}
