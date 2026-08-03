import React, { useState } from 'react';
import {
  Building2,
  Briefcase,
  ShieldCheck,
  User,
  Settings,
  FileText,
  Terminal,
  UserCheck,
  Menu,
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
    { id: 'dashboard', label: 'System Overview', icon: PieChart },
    { id: 'clients_dash', label: 'Clients Dashboard', icon: Building2 },
    { id: 'projects_dash', label: 'Projects Dashboard', icon: Layers },
    { id: 'retainers_dash', label: 'Retainers Dashboard', icon: CreditCard },
    { id: 'documents_dash', label: 'Specifications Docs', icon: FileText },
    { id: 'ai_tools_tracker', label: 'AI Tool Limits', icon: Zap },
    { id: 'alerts_dash', label: 'Dispatched Webhooks', icon: BellRing },
    { id: 'wizard', label: 'Onboarding Pipeline', icon: UserCheck },
    { id: 'dev_center', label: 'Dev & Deployment Center', icon: Terminal },
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
      {/* Sidebar Container */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-command-950/95 text-slate-100 flex flex-col justify-between
        transform lg:transform-none lg:opacity-100 transition-all duration-300 border-r border-teal-400/15 shadow-[20px_0_80px_rgba(8,145,178,.08)] backdrop-blur-xl
        ${mobileOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-6 border-b border-teal-400/10 flex items-center justify-between lg:block bg-gradient-to-b from-teal-400/5 to-transparent">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="Conextsol Dash Logo"
              className="w-10 h-10 object-contain rounded-xl bg-command-950/60 border border-slate-700/30 p-0.5 shrink-0 shadow-lg shadow-teal-950/40"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="font-display font-black tracking-tight text-white text-base leading-tight">Command Centre</h1>
              <p className="text-[8px] text-teal-400 font-mono font-bold tracking-widest uppercase mt-0.5">
                Admin OS • Live Ops
              </p>
            </div>
          </div>
          {/* Close button on mobile inside the drawer */}
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 hover:bg-command-700 rounded-lg text-slate-400 hover:text-white transition-colors"
            aria-label="Close Navigation Menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-semibold px-2 mb-3">
            Operations Rail
          </p>
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
                  w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group cursor-pointer
                  ${isActive
                    ? 'bg-teal-400/10 border-l-4 border-teal-300 text-white rounded-r-md font-bold shadow-[0_0_24px_rgba(45,212,191,.12)]'
                    : 'text-slate-400 hover:bg-command-700/60 hover:text-white'
                  }
                `}
              >
                <Icon size={18} className={`transition-colors duration-150 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Access Control Information Widget */}
          <div className="mt-8 pt-6 border-t border-slate-700/30">
            <p className="text-[10px] font-mono uppercase text-slate-400 tracking-widest font-semibold px-2 mb-3">
              Security Context
            </p>
            <div className="command-panel p-4 text-xs space-y-2.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5 font-medium text-slate-400">
                  <User size={13} className="text-slate-400" />
                  <span>Account:</span>
                </span>
                <span className="font-mono text-[10px] font-semibold text-white truncate max-w-[110px]" title={userEmail || ''}>
                  {userEmail?.split('@')[0]}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-300">
                <span className="flex items-center space-x-1.5 font-medium text-slate-400">
                  <ShieldCheck size={13} className="text-slate-400" />
                  <span>Role:</span>
                </span>
                <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] uppercase font-bold ${isAdmin ? 'bg-white/10 text-white border border-slate-600/40' : 'bg-command-700 text-slate-400 border border-slate-600/40'}`}>
                  {isAdmin ? 'Admin' : 'Client Guest'}
                </span>
              </div>

              {!isAdmin && (
                <div className="text-[10px] text-slate-400 leading-normal flex items-start space-x-1 mt-1 font-sans">
                  <AlertCircle size={10} className="shrink-0 mt-0.5 text-slate-400" />
                  <span>Docs read-only, billing details hidden.</span>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* User Context Controls (Role Toggle Switcher) */}
        <div className="p-4 border-t border-slate-700/30 bg-command-800/90/95 sticky bottom-0">
          <button
            id="role-toggle-btn"
            onClick={toggleAdmin}
            className="w-full flex items-center justify-between bg-command-950/90 hover:bg-command-700 border border-slate-700/30 rounded-xl p-3 text-xs text-slate-200 transition-colors cursor-pointer group"
          >
            <div className="text-left">
              <p className="font-semibold text-[11px] group-hover:text-white transition-colors">Role Simulator</p>
              <p className="text-[9px] text-slate-400 font-mono">RLS context switch</p>
            </div>
            <div className="relative inline-flex items-center h-5 rounded-full w-9 transition-colors bg-command-700">
              <span className={`inline-block w-3.5 h-3.5 transform rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-4.5' : 'translate-x-1'}`} />
            </div>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 bg-command-950/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
}
