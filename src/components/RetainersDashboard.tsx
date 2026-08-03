import React, { useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  AlertCircle,
  Zap,
  Power
} from 'lucide-react';
import { Retainer, AppState } from '../types';

interface RetainersDashboardProps {
  state: AppState;
  onSaveRetainer: (retainer: Retainer) => void;
  onDeleteRetainer: (retainerId: string) => void;
  onSelectClient: (clientId: string) => void;
  isAdmin: boolean;
}

export default function RetainersDashboard({
  state,
  onSaveRetainer,
  onDeleteRetainer,
  onSelectClient,
  isAdmin
}: RetainersDashboardProps) {
  const [filterClient, setFilterClient] = useState<string>('all');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterState, setFilterState] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit states
  const [editForm, setEditForm] = useState<Partial<Retainer>>({});

  // Add new states
  const [newForm, setNewForm] = useState({
    client_id: '',
    service_type: 'web maintenance' as Retainer['service_type'],
    billing_amount: '',
    billing_cycle_day: '15',
    is_active: true
  });
  const [addError, setAddError] = useState('');

  // Helpers
  const getClientName = (clientId: string) => {
    const client = state.clients.find(c => c.id === clientId);
    return client ? client.company_name : 'Unknown Client';
  };

  // Math Stats
  const activeRetainers = state.retainers.filter(r => r.is_active);
  const activeMRR = activeRetainers.reduce((sum, r) => sum + r.billing_amount, 0);
  const totalRetainersCount = state.retainers.length;
  const activeCount = activeRetainers.length;
  const averageRecurring = activeCount > 0 ? Math.round(activeMRR / activeCount) : 0;

  // Filters
  const filteredRetainers = state.retainers.filter(r => {
    const matchesClient = filterClient === 'all' || r.client_id === filterClient;
    const matchesService = filterService === 'all' || r.service_type === filterService;
    const matchesState = 
      filterState === 'all' || 
      (filterState === 'active' && r.is_active) || 
      (filterState === 'inactive' && !r.is_active);

    return matchesClient && matchesService && matchesState;
  });

  const handleStartEdit = (retainer: Retainer) => {
    if (!isAdmin) return;
    setEditingId(retainer.id);
    setEditForm(retainer);
  };

  const handleSaveEdit = () => {
    if (!editForm.service_type || !editForm.billing_cycle_day) return;

    const updated: Retainer = {
      ...editForm as Retainer,
      billing_amount: Number(editForm.billing_amount) || 0,
      billing_cycle_day: Number(editForm.billing_cycle_day) || 1,
      updated_at: new Date().toISOString()
    };

    onSaveRetainer(updated);
    setEditingId(null);
  };

  const handleToggleActive = (retainer: Retainer) => {
    if (!isAdmin) return;
    const updated: Retainer = {
      ...retainer,
      is_active: !retainer.is_active,
      updated_at: new Date().toISOString()
    };
    onSaveRetainer(updated);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newForm.client_id) {
      setAddError('Please select a client profile.');
      return;
    }
    if (!newForm.billing_amount || !newForm.billing_cycle_day) {
      setAddError('Please specify billing amount and monthly cycle day.');
      return;
    }

    const dayNum = Number(newForm.billing_cycle_day);
    if (dayNum < 1 || dayNum > 31) {
      setAddError('Billing day must be between 1 and 31.');
      return;
    }

    const created: Retainer = {
      id: crypto.randomUUID(),
      client_id: newForm.client_id,
      service_type: newForm.service_type,
      billing_amount: Number(newForm.billing_amount) || 0,
      billing_cycle_day: dayNum,
      is_active: newForm.is_active,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveRetainer(created);
    setIsAdding(false);
    setNewForm({
      client_id: '',
      service_type: 'web maintenance',
      billing_amount: '',
      billing_cycle_day: '15',
      is_active: true
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Active SLA Streams</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{activeCount} <span className="text-xs text-slate-500 font-normal">/ {totalRetainersCount}</span></h4>
            <span className="text-[10px] text-slate-500 font-mono font-bold">active contracts</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-emerald-900/50 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-emerald-400 font-mono font-semibold tracking-wide uppercase">Active MRR Volume</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-emerald-400">R {activeMRR.toLocaleString()}</h4>
            <span className="text-[9px] bg-emerald-950 text-emerald-400 border border-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">RECURRING</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Average Retainer</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-slate-200">R {averageRecurring.toLocaleString()}</h4>
            <span className="text-[10px] text-slate-500 font-mono">per SLA</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Cycle Peak Day</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-cyan-400">Day 15</h4>
            <span className="text-[10px] text-slate-500 font-mono">invoice batch</span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filtering */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto font-mono text-xs">
          {/* Client Filter */}
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 max-w-[170px] cursor-pointer"
          >
            <option value="all">All Clients</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>

          {/* Service Filter */}
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Service Types</option>
            <option value="web hosting">Web Hosting</option>
            <option value="web maintenance">Web Maintenance</option>
            <option value="SEO">SEO Search Marketing</option>
            <option value="Google Ads">Google Ads Management</option>
          </select>

          {/* Status Filter */}
          <select
            value={filterState}
            onChange={e => setFilterState(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Billing Status</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {isAdmin && (
          <button
            onClick={() => {
              if (state.clients.length === 0) {
                alert('Please register at least one client company profile before generating a recurring billing retainer.');
                return;
              }
              setIsAdding(!isAdding);
            }}
            className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer w-full md:w-auto justify-center"
          >
            {isAdding ? <X size={13} /> : <Plus size={13} />}
            <span>{isAdding ? 'Cancel' : 'Add Retainer'}</span>
          </button>
        )}
      </div>

      {/* 3. Collapsible Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-[#0b0f19] border border-[#1a2234] p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn font-mono">
          <div className="border-b border-[#1a2234] pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
              <Zap size={15} className="text-emerald-400" />
              <span>Create Monthly Billing Retainer</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Adds a recurring SLA stream bound to an active client profile.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2.5 rounded-lg">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Select Client *</label>
              <select
                required
                value={newForm.client_id}
                onChange={e => setNewForm({ ...newForm, client_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="">-- Choose Client --</option>
                {state.clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Service Type *</label>
              <select
                required
                value={newForm.service_type}
                onChange={e => setNewForm({ ...newForm, service_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="web hosting">Web Hosting</option>
                <option value="web maintenance">Web Maintenance</option>
                <option value="SEO">SEO Marketing</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Billing Amount (R/mo) *</label>
              <input
                type="number"
                placeholder="e.g. 1500"
                required
                value={newForm.billing_amount}
                onChange={e => setNewForm({ ...newForm, billing_amount: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Cycle Day (1-31) *</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
                required
                value={newForm.billing_cycle_day}
                onChange={e => setNewForm({ ...newForm, billing_cycle_day: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newForm.is_active}
                  onChange={e => setNewForm({ ...newForm, is_active: e.target.checked })}
                  className="rounded border-[#1a2234] bg-[#06080d] text-cyan-400 focus:ring-cyan-400 h-4 w-4"
                />
                <span>Active Stream</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-1 px-5 py-2.5 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-300 hover:to-teal-400 text-slate-950 font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Deploy Retainer Contract</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Table Grid of Retainers */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] shadow-xl overflow-hidden">
        
        {/* DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1a2234] bg-[#070a12] font-mono text-[10px] text-slate-400 uppercase tracking-wider">
                <th className="py-4 px-6">Client Profile</th>
                <th className="py-4 px-6">Service Category</th>
                <th className="py-4 px-6 text-center">Cycle Day</th>
                <th className="py-4 px-6 text-right">Billing Rate</th>
                <th className="py-4 px-6 text-center">State</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a2234] text-xs md:text-sm">
              {filteredRetainers.map((retainer) => {
                const isEditing = editingId === retainer.id;

                return (
                  <tr key={retainer.id} className="hover:bg-[#121826]/60 transition-colors">
                    {/* Client name */}
                    <td className="py-4 px-6 font-medium text-white">
                      <span 
                        onClick={() => onSelectClient(retainer.client_id)}
                        className="hover:text-cyan-400 hover:underline cursor-pointer font-bold"
                      >
                        {getClientName(retainer.client_id)}
                      </span>
                    </td>

                    {/* Service type */}
                    <td className="py-4 px-6 text-slate-300 font-mono">
                      {isEditing ? (
                        <select
                          value={editForm.service_type || 'web maintenance'}
                          onChange={e => setEditForm({ ...editForm, service_type: e.target.value as any })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white focus:outline-none"
                        >
                          <option value="web hosting">web hosting</option>
                          <option value="web maintenance">web maintenance</option>
                          <option value="SEO">SEO</option>
                          <option value="Google Ads">Google Ads</option>
                        </select>
                      ) : (
                        <span className="capitalize">{retainer.service_type}</span>
                      )}
                    </td>

                    {/* Billing Day */}
                    <td className="py-4 px-6 text-center font-mono font-bold text-slate-400">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editForm.billing_cycle_day || ''}
                          onChange={e => setEditForm({ ...editForm, billing_cycle_day: e.target.value })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[60px] text-center"
                        />
                      ) : (
                        <>Day {retainer.billing_cycle_day}</>
                      )}
                    </td>

                    {/* Billing Amount */}
                    <td className="py-4 px-6 text-right font-mono font-bold text-emerald-400">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.billing_amount || ''}
                          onChange={e => setEditForm({ ...editForm, billing_amount: e.target.value })}
                          className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[90px] text-right"
                        />
                      ) : (
                        <>R {retainer.billing_amount.toLocaleString()} / mo</>
                      )}
                    </td>

                    {/* Status Toggle / View */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(retainer)}
                        disabled={!isAdmin}
                        className={`
                          px-3 py-1 rounded font-mono text-[9px] uppercase font-bold border transition-all cursor-pointer flex items-center space-x-1 mx-auto
                          ${retainer.is_active 
                            ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800 hover:bg-emerald-900' 
                            : 'bg-[#070a12] text-slate-500 border-[#1a2234] hover:bg-[#121826]'
                          }
                        `}
                      >
                        <Power size={10} className={retainer.is_active ? 'text-emerald-400 animate-pulse' : 'text-slate-500'} />
                        <span>{retainer.is_active ? 'Active' : 'Paused'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {isEditing ? (
                          <>
                            <button
                              onClick={handleSaveEdit}
                              className="p-1 bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 rounded-lg transition-colors cursor-pointer"
                              title="Save retainer"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-[#06080d] border border-[#1a2234] text-slate-400 hover:bg-[#121826] rounded-lg transition-colors cursor-pointer"
                              title="Cancel"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            {isAdmin && (
                              <button
                                onClick={() => handleStartEdit(retainer)}
                                className="p-1 hover:bg-[#121826] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Edit Retainer Details"
                              >
                                <Edit2 size={13} />
                              </button>
                            )}
                            {isAdmin && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to permanently cancel and delete this monthly retainer billing subscription?`)) {
                                    onDeleteRetainer(retainer.id);
                                  }
                                }}
                                className="p-1 hover:bg-[#121826] rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Delete Retainer Profile"
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
          {filteredRetainers.map((retainer) => {
            const isEditing = editingId === retainer.id;

            return (
              <div key={retainer.id} className="p-4 space-y-3 bg-[#0b0f19]">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span 
                      onClick={() => onSelectClient(retainer.client_id)}
                      className="text-[10px] font-mono text-cyan-400 font-bold uppercase hover:underline cursor-pointer"
                    >
                      {getClientName(retainer.client_id)}
                    </span>
                    {isEditing ? (
                      <select
                        value={editForm.service_type || 'web maintenance'}
                        onChange={e => setEditForm({ ...editForm, service_type: e.target.value as any })}
                        className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white block mt-1 font-mono"
                      >
                        <option value="web hosting">web hosting</option>
                        <option value="web maintenance">web maintenance</option>
                        <option value="SEO">SEO</option>
                        <option value="Google Ads">Google Ads</option>
                      </select>
                    ) : (
                      <h4 className="font-display font-bold text-white text-sm capitalize">
                        {retainer.service_type}
                      </h4>
                    )}
                  </div>

                  <button
                    onClick={() => handleToggleActive(retainer)}
                    disabled={!isAdmin}
                    className={`
                      px-2 py-0.5 rounded font-mono text-[8px] uppercase font-bold border transition-all flex items-center space-x-1
                      ${retainer.is_active 
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-800' 
                        : 'bg-[#070a12] text-slate-500 border-[#1a2234]'
                      }
                    `}
                  >
                    <Power size={8} />
                    <span>{retainer.is_active ? 'Active' : 'Paused'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 bg-[#06080d] px-3 rounded-lg border border-[#1a2234]">
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">Monthly Amount</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.billing_amount || ''}
                        onChange={e => setEditForm({ ...editForm, billing_amount: e.target.value })}
                        className="px-2 py-0.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-2/3 block mt-0.5"
                      />
                    ) : (
                      <span className="text-emerald-400 font-bold">R {retainer.billing_amount}/mo</span>
                    )}
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[9px] uppercase font-semibold">Invoice Cycle</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.billing_cycle_day || ''}
                        onChange={e => setEditForm({ ...editForm, billing_cycle_day: e.target.value })}
                        className="px-2 py-0.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-2/3 block mt-0.5"
                      />
                    ) : (
                      <span className="text-white font-bold">Day {retainer.billing_cycle_day}</span>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-1 font-mono">
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 bg-cyan-950 border border-cyan-700 text-cyan-300 text-xs rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-[#06080d] text-slate-400 text-xs rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {!isEditing && isAdmin && (
                  <div className="flex items-center justify-end space-x-3 pt-2 border-t border-[#1a2234] font-mono">
                    <button
                      onClick={() => handleStartEdit(retainer)}
                      className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <Edit2 size={11} />
                      <span>Edit Billing</span>
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete retainer?`)) {
                          onDeleteRetainer(retainer.id);
                        }
                      }}
                      className="text-xs text-slate-500 hover:text-rose-400 flex items-center space-x-1"
                    >
                      <Trash2 size={11} />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {filteredRetainers.length === 0 && (
          <div className="text-center py-12 bg-[#0b0f19] space-y-2">
            <AlertCircle size={24} className="text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">No retainers found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
