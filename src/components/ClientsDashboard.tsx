import React, { useState } from 'react';
import { 
  Search, 
  Building2, 
  Mail, 
  Phone, 
  ArrowRight, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  AlertCircle,
  UserCheck,
  Users
} from 'lucide-react';
import { Client, AppState } from '../types';

interface ClientsDashboardProps {
  state: AppState;
  onSelectClient: (clientId: string) => void;
  onSaveClient: (client: Client) => void;
  onDeleteClient: (clientId: string) => void;
  onOpenWizard: () => void;
  isAdmin: boolean;
}

export default function ClientsDashboard({
  state,
  onSelectClient,
  onSaveClient,
  onDeleteClient,
  onOpenWizard,
  isAdmin
}: ClientsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit states
  const [editForm, setEditForm] = useState<Partial<Client>>({});

  // Add new states
  const [newForm, setNewForm] = useState({
    company_name: '',
    primary_contact_name: '',
    email: '',
    phone: '',
    status: 'active' as Client['status']
  });
  const [addError, setAddError] = useState('');

  // Math helper stats
  const totalCount = state.clients.length;
  const activeCount = state.clients.filter(c => c.status === 'active').length;
  const pausedCount = state.clients.filter(c => c.status === 'paused').length;
  const inactiveCount = state.clients.filter(c => c.status === 'inactive').length;

  const getProjectCount = (clientId: string) => {
    return state.projects.filter(p => p.client_id === clientId).length;
  };

  const getRetainerValue = (clientId: string) => {
    return state.retainers
      .filter(r => r.client_id === clientId && r.is_active)
      .reduce((sum, r) => sum + r.billing_amount, 0);
  };

  const filteredClients = state.clients.filter(client => {
    const matchesSearch = 
      client.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.primary_contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || client.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const handleStartEdit = (client: Client) => {
    if (!isAdmin) return;
    setEditingId(client.id);
    setEditForm(client);
  };

  const handleSaveEdit = () => {
    if (!editForm.company_name || !editForm.primary_contact_name || !editForm.email) {
      return;
    }
    onSaveClient(editForm as Client);
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newForm.company_name || !newForm.primary_contact_name || !newForm.email) {
      setAddError('Please fill in all required (*) fields.');
      return;
    }

    if (state.clients.some(c => c.email.toLowerCase() === newForm.email.toLowerCase())) {
      setAddError('This email is already registered to another client profile.');
      return;
    }

    const created: Client = {
      id: crypto.randomUUID(),
      company_name: newForm.company_name,
      primary_contact_name: newForm.primary_contact_name,
      email: newForm.email,
      phone: newForm.phone,
      status: newForm.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveClient(created);
    setIsAdding(false);
    setNewForm({
      company_name: '',
      primary_contact_name: '',
      email: '',
      phone: '',
      status: 'active'
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Total Registries</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{totalCount}</h4>
            <span className="text-[10px] text-slate-500 font-mono">accounts table</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-emerald-900/50 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold tracking-wide uppercase">Active Clients</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{activeCount}</h4>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">OPERATIONAL</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-amber-900/50 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-amber-400 font-mono font-semibold tracking-wide uppercase">Paused Accounts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-slate-200">{pausedCount}</h4>
            <span className="text-[9px] bg-amber-950 text-amber-400 border border-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">STANDBY</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Inactive</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-slate-400">{inactiveCount}</h4>
            <span className="text-[9px] bg-[#070a12] text-slate-500 border border-[#1a2234] px-1.5 py-0.2 rounded font-mono font-bold">ARCHIVED</span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filtering */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search accounts by company, contact, or email address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs font-mono font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="paused">Paused Only</option>
            <option value="inactive">Inactive Only</option>
          </select>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-[#121826] hover:bg-[#1a2234] border border-cyan-500/40 text-cyan-300 font-mono text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {isAdding ? <X size={13} /> : <Plus size={13} />}
                <span>{isAdding ? 'Cancel' : 'New Client'}</span>
              </button>
              <button
                onClick={onOpenWizard}
                className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
              >
                <UserCheck size={13} />
                <span>Onboard Pipeline</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. Collapsible Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-[#0b0f19] border border-[#1a2234] p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn">
          <div className="border-b border-[#1a2234] pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-2">
              <Users size={15} className="text-cyan-400" />
              <span>Create Client Profile Record</span>
            </h3>
            <p className="text-[10px] font-mono text-slate-400 mt-0.5">
              Inserts a new institutional account record into the database.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2.5 rounded-lg font-mono">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Zenith Retail"
                required
                value={newForm.company_name}
                onChange={e => setNewForm({ ...newForm, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Contact Name *</label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                required
                value={newForm.primary_contact_name}
                onChange={e => setNewForm({ ...newForm, primary_contact_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="e.g. contact@zenithretail.co"
                required
                value={newForm.email}
                onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +27-82-555-0192"
                value={newForm.phone}
                onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Account Status</label>
              <select
                value={newForm.status}
                onChange={e => setNewForm({ ...newForm, status: e.target.value as any })}
                className="bg-[#06080d] border border-[#1a2234] rounded-lg text-xs font-mono font-semibold text-slate-300 p-2 cursor-pointer"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              type="submit"
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Insert Client Profile</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Table Grid (Desktop) and Card view (Mobile) */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] shadow-xl overflow-hidden">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a2234] bg-[#070a12] font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Company Entity</th>
                <th className="py-4 px-6">Primary Contact</th>
                <th className="py-4 px-6">Email / Phone</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Projects</th>
                <th className="py-4 px-6 text-center">Active MRR</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2234] text-xs md:text-sm">
              {filteredClients.map((client) => {
                const isEditing = editingId === client.id;
                const projectsCount = getProjectCount(client.id);
                const activeMRR = getRetainerValue(client.id);

                return (
                  <tr key={client.id} className="hover:bg-[#121826]/60 transition-colors">
                    {/* Company */}
                    <td className="py-4 px-6 font-medium text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.company_name || ''}
                          onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[150px] font-mono"
                        />
                      ) : (
                        <span 
                          onClick={() => onSelectClient(client.id)}
                          className="hover:text-cyan-400 hover:underline cursor-pointer font-bold text-slate-100"
                        >
                          {client.company_name}
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-6 text-slate-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.primary_contact_name || ''}
                          onChange={e => setEditForm({ ...editForm, primary_contact_name: e.target.value })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[130px] font-mono"
                        />
                      ) : (
                        client.primary_contact_name
                      )}
                    </td>

                    {/* Email / Phone */}
                    <td className="py-4 px-6 font-mono text-[11px] text-slate-400 space-y-1">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[150px] block"
                          />
                          <input
                            type="text"
                            value={editForm.phone || ''}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[150px] block"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1.5 text-slate-300">
                            <Mail size={12} className="text-cyan-400" />
                            <span>{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center space-x-1.5 text-slate-400">
                              <Phone size={12} className="text-slate-500" />
                              <span>{client.phone}</span>
                            </div>
                          )}
                        </>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-6 text-center">
                      {isEditing ? (
                        <select
                          value={editForm.status || 'active'}
                          onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white font-mono"
                        >
                          <option value="active">active</option>
                          <option value="paused">paused</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <span className={`
                          px-2 py-0.5 rounded font-mono text-[9px] uppercase font-bold border inline-block
                          ${client.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : ''}
                          ${client.status === 'paused' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : ''}
                          ${client.status === 'inactive' ? 'bg-[#070a12] text-slate-500 border-[#1a2234]' : ''}
                        `}>
                          {client.status}
                        </span>
                      )}
                    </td>

                    {/* Projects counter */}
                    <td className="py-4 px-6 text-center font-mono font-bold text-white">
                      {projectsCount}
                    </td>

                    {/* Active MRR */}
                    <td className="py-4 px-6 text-center font-mono font-bold text-emerald-400">
                      R {activeMRR.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 rounded-lg transition-colors cursor-pointer"
                              title="Save client profile"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-[#06080d] border border-[#1a2234] text-slate-400 hover:bg-[#121826] rounded-lg transition-colors cursor-pointer"
                              title="Cancel edit"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <button
                                onClick={() => handleStartEdit(client)}
                                className="p-1 hover:bg-[#121826] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit client profile"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectClient(client.id)}
                              className="p-1 bg-[#121826] hover:bg-[#1a2234] border border-[#1a2234] text-cyan-400 rounded-lg transition-colors cursor-pointer"
                              title="Inspect client workspace"
                            >
                              <ArrowRight size={13} />
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to permanently delete client "${client.company_name}"? All associated projects, retainers, and specs will be cascade-deleted.`)) {
                                    onDeleteClient(client.id);
                                  }
                                }}
                                className="p-1 hover:bg-[#121826] rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete client profile"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="block md:hidden divide-y divide-[#1a2234]">
          {filteredClients.map((client) => {
            const isEditing = editingId === client.id;
            const projectsCount = getProjectCount(client.id);
            const activeMRR = getRetainerValue(client.id);

            return (
              <div key={client.id} className="p-4 space-y-3 bg-[#0b0f19] hover:bg-[#121826] transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.company_name || ''}
                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                        className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white block w-full mb-1 font-mono"
                      />
                    ) : (
                      <h4 
                        onClick={() => onSelectClient(client.id)}
                        className="font-display font-bold text-white text-sm hover:text-cyan-400 cursor-pointer"
                      >
                        {client.company_name}
                      </h4>
                    )}
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.primary_contact_name || ''}
                        onChange={e => setEditForm({ ...editForm, primary_contact_name: e.target.value })}
                        className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white block w-full font-mono"
                      />
                    ) : (
                      <p className="text-xs text-slate-400">{client.primary_contact_name}</p>
                    )}
                  </div>

                  {isEditing ? (
                    <select
                      value={editForm.status || 'active'}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="px-1.5 py-0.5 bg-[#06080d] border border-[#1a2234] rounded text-[10px] text-white font-mono"
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="inactive">inactive</option>
                    </select>
                  ) : (
                    <span className={`
                      px-2 py-0.5 rounded font-mono text-[8px] uppercase font-bold border
                      ${client.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : ''}
                      ${client.status === 'paused' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : ''}
                      ${client.status === 'inactive' ? 'bg-[#070a12] text-slate-500 border-[#1a2234]' : ''}
                    `}>
                      {client.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono py-2 bg-[#06080d] px-3 rounded-lg border border-[#1a2234]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">Active Projects</span>
                    <span className="text-white font-bold">{projectsCount} accounts</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">Active MRR</span>
                    <span className="text-emerald-400 font-bold">R {activeMRR.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-slate-400 font-mono">
                  {isEditing ? (
                    <div className="space-y-1 pt-1">
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white w-full block"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white w-full block"
                        placeholder="Phone"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1.5 text-slate-300">
                        <Mail size={11} className="text-cyan-400 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center space-x-1.5 text-slate-400">
                          <Phone size={11} className="text-slate-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1a2234]">
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-center space-x-1 text-xs font-bold text-cyan-400 hover:underline"
                  >
                    <span>Inspect Account Intelligence</span>
                    <ArrowRight size={12} />
                  </button>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 bg-cyan-950 text-cyan-300 rounded-lg text-xs font-mono font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-[#06080d] text-slate-400 rounded-lg text-xs font-mono"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {isAdmin && (
                          <button
                            onClick={() => handleStartEdit(client)}
                            className="p-1 text-slate-400 hover:text-white"
                          >
                            <Edit2 size={12} />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete client "${client.company_name}"?`)) {
                                onDeleteClient(client.id);
                              }
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredClients.length === 0 && (
          <div className="text-center py-12 bg-[#06080d]/40 space-y-2">
            <AlertCircle size={24} className="text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">No company account records match your search filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
