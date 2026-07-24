import React, { useState } from 'react';
import { 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  ArrowRight, 
  UserPlus, 
  AlertCircle 
} from 'lucide-react';
import { Client, AppState } from '../types';

interface ClientsListProps {
  state: AppState;
  onSelectClient: (clientId: string) => void;
  onOpenWizard: () => void;
}

export default function ClientsList({ state, onSelectClient, onOpenWizard }: ClientsListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Helper counters
  const getProjectCount = (clientId: string) => {
    return state.projects.filter(p => p.client_id === clientId).length;
  };

  const getRetainerCount = (clientId: string) => {
    return state.retainers.filter(r => r.client_id === clientId && r.is_active).length;
  };

  const filteredClients = state.clients.filter(client => {
    const matchesSearch = 
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Filtering Header Toolbar */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-4 md:p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 max-w-md relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search accounts by company, contact, or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-xl text-xs font-semibold text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="paused">Paused only</option>
            <option value="inactive">Inactive only</option>
          </select>

          <button
            id="wizard-create-client-btn"
            onClick={onOpenWizard}
            className="flex items-center space-x-1.5 px-4.5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] font-sans text-xs font-extrabold rounded-xl shadow-md shadow-emerald-500/10 hover:shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <UserPlus size={14} />
            <span>Onboard Client</span>
          </button>
        </div>
      </div>

      {/* Grid of accounts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredClients.map((client) => {
          const projectsCount = getProjectCount(client.id);
          const retainersCount = getRetainerCount(client.id);
          
          return (
            <div 
              key={client.id}
              className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-5 shadow-lg hover:border-purple-900/40 transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                {/* Header Row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-900/30 flex items-center justify-center font-display font-extrabold text-lg shadow-inner">
                      {client.company_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-white text-sm md:text-base leading-tight">
                        {client.company_name}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium">{client.primary_contact_name}</p>
                    </div>
                  </div>

                  <span className={`
                    px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold border
                    ${client.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                    ${client.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                    ${client.status === 'inactive' ? 'bg-white/5 text-gray-400 border-purple-900/20' : ''}
                  `}>
                    {client.status}
                  </span>
                </div>

                {/* Info block */}
                <div className="space-y-1.5 font-sans text-xs text-gray-300 border-t border-purple-900/20 pt-3">
                  <div className="flex items-center space-x-2">
                    <Mail size={13} className="text-gray-400 shrink-0" />
                    <span className="truncate">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone size={13} className="text-gray-400 shrink-0" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer status counts & action */}
              <div className="pt-3 border-t border-purple-900/20 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center space-x-3 text-gray-400">
                  <span>Projects: <strong className="text-white font-bold">{projectsCount}</strong></span>
                  <span>Retainers: <strong className="text-white font-bold">{retainersCount}</strong></span>
                </div>

                <button
                  id={`manage-client-${client.id.substring(0,8)}`}
                  onClick={() => onSelectClient(client.id)}
                  className="flex items-center space-x-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer group"
                >
                  <span>Manage</span>
                  <ArrowRight size={13} className="transform group-hover:translate-x-0.5 transition-transform text-emerald-400" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredClients.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-[#1B122B] rounded-xl border border-purple-900/20 space-y-2">
            <AlertCircle size={24} className="text-gray-500 mx-auto" />
            <p className="text-xs text-gray-400 font-medium">No company accounts match your query parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
