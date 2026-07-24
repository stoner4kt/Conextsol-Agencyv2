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

    // Email unique check locally
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
        <div className="bg-[#1B122B] border border-purple-900/20 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-gray-400 font-mono font-semibold tracking-wide uppercase">Total Accounts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{totalCount}</h4>
            <span className="text-[10px] text-purple-400 font-mono">clients table</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-emerald-500/10 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold tracking-wide uppercase">Active Accounts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-emerald-400">{activeCount}</h4>
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 rounded font-mono font-bold">LIVE</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-amber-500/10 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-amber-400 font-mono font-semibold tracking-wide uppercase">Paused Accounts</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-amber-400">{pausedCount}</h4>
            <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.2 rounded font-mono font-bold">ON HOLD</span>
          </div>
        </div>
        <div className="bg-[#1B122B] border border-purple-900/20 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-gray-400 font-mono font-semibold tracking-wide uppercase">Inactive</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-gray-400">{inactiveCount}</h4>
            <span className="text-[9px] bg-white/5 text-gray-500 px-1.5 py-0.2 rounded font-mono font-bold">ARCHIVED</span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filtering */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Filter clients by company, contact, or email address..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-xs md:text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
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

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAdding(!isAdding)}
                className="flex items-center space-x-1.5 px-4 py-2 bg-[#140C24] hover:bg-[#0F081C] border border-purple-900/40 text-white font-sans text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                {isAdding ? <X size={13} /> : <Plus size={13} />}
                <span>{isAdding ? 'Cancel' : 'Add Client'}</span>
              </button>
              <button
                onClick={onOpenWizard}
                className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
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
        <form onSubmit={handleAddSubmit} className="bg-[#1B122B] border border-purple-500/20 p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn">
          <div className="border-b border-purple-900/20 pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
              <Users size={15} className="text-purple-400" />
              <span>Create Client Profile Record</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-0.5 font-sans">
              Inserts a brand-new institutional billing entity into the PostgreSQL table.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-red-400 bg-red-950/20 border border-red-900/30 p-2.5 rounded-lg font-mono">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1">Company Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                required
                value={newForm.company_name}
                onChange={e => setNewForm({ ...newForm, company_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1">Contact Name *</label>
              <input
                type="text"
                placeholder="e.g. Sarah Jenkins"
                required
                value={newForm.primary_contact_name}
                onChange={e => setNewForm({ ...newForm, primary_contact_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1">Email Address *</label>
              <input
                type="email"
                placeholder="e.g. contact@acme.com"
                required
                value={newForm.email}
                onChange={e => setNewForm({ ...newForm, email: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +1-555-0192"
                value={newForm.phone}
                onChange={e => setNewForm({ ...newForm, phone: e.target.value })}
                className="w-full px-3 py-2 bg-[#0F081C] border border-purple-900/40 rounded-lg text-xs text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 mb-1">Status</label>
              <select
                value={newForm.status}
                onChange={e => setNewForm({ ...newForm, status: e.target.value as any })}
                className="bg-[#0F081C] border border-purple-900/40 rounded-lg text-xs font-semibold text-gray-300 p-2"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <button
              type="submit"
              className="flex items-center space-x-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Insert Client</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Table Grid (Desktop) and Card view (Mobile) */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 shadow-xl overflow-hidden">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-purple-900/30 bg-[#0F081C]/40 font-mono text-[10px] text-purple-400 uppercase tracking-wider">
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">Primary Contact</th>
                <th className="py-4 px-6">Email / Phone</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Projects</th>
                <th className="py-4 px-6 text-center">Active MRR</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-purple-900/10 text-xs md:text-sm">
              {filteredClients.map((client) => {
                const isEditing = editingId === client.id;
                const projectsCount = getProjectCount(client.id);
                const activeMRR = getRetainerValue(client.id);

                return (
                  <tr key={client.id} className="hover:bg-purple-900/5 transition-colors">
                    {/* Company */}
                    <td className="py-4 px-6 font-medium text-white">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.company_name || ''}
                          onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                          className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white max-w-[150px]"
                        />
                      ) : (
                        <span 
                          onClick={() => onSelectClient(client.id)}
                          className="hover:text-emerald-400 hover:underline cursor-pointer font-bold"
                        >
                          {client.company_name}
                        </span>
                      )}
                    </td>

                    {/* Contact */}
                    <td className="py-4 px-6 text-gray-300">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editForm.primary_contact_name || ''}
                          onChange={e => setEditForm({ ...editForm, primary_contact_name: e.target.value })}
                          className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white max-w-[130px]"
                        />
                      ) : (
                        client.primary_contact_name
                      )}
                    </td>

                    {/* Email / Phone */}
                    <td className="py-4 px-6 font-mono text-[11px] text-gray-400 space-y-1">
                      {isEditing ? (
                        <div className="space-y-1">
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                            className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white max-w-[150px] block"
                          />
                          <input
                            type="text"
                            value={editForm.phone || ''}
                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                            className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white max-w-[150px] block"
                          />
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-1.5">
                            <Mail size={12} className="text-gray-500" />
                            <span>{client.email}</span>
                          </div>
                          {client.phone && (
                            <div className="flex items-center space-x-1.5">
                              <Phone size={12} className="text-gray-500" />
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
                          className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white"
                        >
                          <option value="active">active</option>
                          <option value="paused">paused</option>
                          <option value="inactive">inactive</option>
                        </select>
                      ) : (
                        <span className={`
                          px-2 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold border inline-block
                          ${client.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                          ${client.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                          ${client.status === 'inactive' ? 'bg-white/5 text-gray-400 border-purple-900/20' : ''}
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
                      ${activeMRR.toLocaleString()}
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                              title="Save client profile"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-white/5 border border-purple-900/20 text-gray-400 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
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
                                className="p-1 hover:bg-white/5 rounded-lg text-purple-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit client profile"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => onSelectClient(client.id)}
                              className="p-1 hover:bg-white/5 rounded-lg text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
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
                                className="p-1 hover:bg-red-500/10 rounded-lg text-red-500 hover:text-red-400 transition-colors cursor-pointer"
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
        <div className="block md:hidden divide-y divide-purple-900/20">
          {filteredClients.map((client) => {
            const isEditing = editingId === client.id;
            const projectsCount = getProjectCount(client.id);
            const activeMRR = getRetainerValue(client.id);

            return (
              <div key={client.id} className="p-4 space-y-3 bg-[#1B122B]/30 hover:bg-[#1B122B]/70 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.company_name || ''}
                        onChange={e => setEditForm({ ...editForm, company_name: e.target.value })}
                        className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white block w-full mb-1"
                      />
                    ) : (
                      <h4 
                        onClick={() => onSelectClient(client.id)}
                        className="font-display font-bold text-white text-sm hover:text-emerald-400 hover:underline cursor-pointer"
                      >
                        {client.company_name}
                      </h4>
                    )}
                    
                    {isEditing ? (
                      <input
                        type="text"
                        value={editForm.primary_contact_name || ''}
                        onChange={e => setEditForm({ ...editForm, primary_contact_name: e.target.value })}
                        className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white block w-full"
                      />
                    ) : (
                      <p className="text-xs text-gray-400">{client.primary_contact_name}</p>
                    )}
                  </div>

                  {isEditing ? (
                    <select
                      value={editForm.status || 'active'}
                      onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                      className="px-1.5 py-0.5 bg-[#0F081C] border border-purple-900/40 rounded text-[10px] text-white"
                    >
                      <option value="active">active</option>
                      <option value="paused">paused</option>
                      <option value="inactive">inactive</option>
                    </select>
                  ) : (
                    <span className={`
                      px-2 py-0.5 rounded-full font-mono text-[8px] uppercase font-bold border
                      ${client.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                      ${client.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                      ${client.status === 'inactive' ? 'bg-white/5 text-gray-400 border-purple-900/20' : ''}
                    `}>
                      {client.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono py-2 bg-[#0F081C]/40 px-3 rounded-lg border border-purple-900/10">
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-semibold">Active Projects</span>
                    <span className="text-white font-bold">{projectsCount} accounts</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[9px] uppercase font-semibold">Active MRR</span>
                    <span className="text-emerald-400 font-bold">${activeMRR.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-1 text-xs text-gray-400">
                  {isEditing ? (
                    <div className="space-y-1 pt-1">
                      <input
                        type="email"
                        value={editForm.email || ''}
                        onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                        className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white w-full block"
                        placeholder="Email"
                      />
                      <input
                        type="text"
                        value={editForm.phone || ''}
                        onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                        className="px-2 py-1 bg-[#0F081C] border border-purple-900/40 rounded text-xs text-white w-full block"
                        placeholder="Phone"
                      />
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-1.5">
                        <Mail size={11} className="text-gray-500 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                      {client.phone && (
                        <div className="flex items-center space-x-1.5">
                          <Phone size={11} className="text-gray-500 shrink-0" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-900/10">
                  <button
                    onClick={() => onSelectClient(client.id)}
                    className="flex items-center space-x-1 text-xs font-bold text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    <span>Open Backoffice Workspace</span>
                    <ArrowRight size={12} />
                  </button>

                  <div className="flex items-center space-x-2">
                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSaveEdit}
                          className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 bg-white/5 text-gray-400 rounded-lg text-xs"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {isAdmin && (
                          <button
                            onClick={() => handleStartEdit(client)}
                            className="p-1 text-purple-400 hover:text-white"
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
                            className="p-1 text-red-500 hover:text-red-400"
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
          <div className="text-center py-12 bg-[#1B122B]/40 space-y-2">
            <AlertCircle size={24} className="text-gray-500 mx-auto" />
            <p className="text-xs text-gray-400 font-medium">No company accounts match your query parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
