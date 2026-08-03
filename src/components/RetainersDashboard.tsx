import React, { useState } from 'react';
import { 
  Search, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  AlertCircle,
  FileCheck,
  Zap,
  Power,
  Users
} from 'lucide-react';
import { Retainer, Client, AppState } from '../types';

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
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-neutral-400 font-mono font-semibold tracking-wide uppercase">Active Streams</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{activeCount} <span className="text-xs text-neutral-500 font-normal">/ {totalRetainersCount}</span></h4>
            <span className="text-[10px] text-neutral-400 font-mono">retainers table</span>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-white font-mono font-semibold tracking-wide uppercase">Active MRR Stream</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">R {activeMRR.toLocaleString()}</h4>
            <span className="text-[9px] bg-white/10 text-white px-1.5 py-0.2 rounded font-mono font-bold">MONTHLY</span>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-neutral-400 font-mono font-semibold tracking-wide uppercase">Average Retainer Size</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">R {averageRecurring.toLocaleString()}</h4>
            <span className="text-[10px] text-neutral-400 font-mono">per retainer</span>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-neutral-400 font-mono font-semibold tracking-wide uppercase">Cycle Peak Day</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">Day 15</h4>
            <span className="text-[10px] text-white font-semibold font-mono">Max volume check</span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filtering */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Client Filter */}
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 focus:outline-none focus:ring-2 focus:ring-white/20 max-w-[160px]"
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
            className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 focus:outline-none focus:ring-2 focus:ring-white/20"
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
            className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-300 focus:outline-none focus:ring-2 focus:ring-white/20"
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
            className="flex items-center space-x-1.5 px-4.5 py-2.5 bg-white hover:bg-neutral-200 text-black font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer w-full md:w-auto justify-center"
          >
            {isAdding ? <X size={13} /> : <Plus size={13} />}
            <span>{isAdding ? 'Cancel' : 'Add Retainer'}</span>
          </button>
        )}
      </div>

      {/* 3. Collapsible Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-neutral-900 border border-neutral-800 p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn">
          <div className="border-b border-neutral-800 pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
              <Zap size={15} className="text-white animate-pulse" />
              <span>Create Monthly Billing Retainer</span>
            </h3>
            <p className="text-[10px] text-neutral-400 mt-0.5 font-sans">
              Adds a recurring subscription directly linked to a client company profile.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-neutral-200 bg-neutral-950 border border-neutral-700 p-2.5 rounded-lg font-mono">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Select Client Profile *</label>
              <select
                required
                value={newForm.client_id}
                onChange={e => setNewForm({ ...newForm, client_id: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="">-- Choose Client --</option>
                {state.clients.map(c => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Service Classification *</label>
              <select
                required
                value={newForm.service_type}
                onChange={e => setNewForm({ ...newForm, service_type: e.target.value as any })}
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
              >
                <option value="web hosting">Web Hosting</option>
                <option value="web maintenance">Web Maintenance</option>
                <option value="SEO">SEO Marketing</option>
                <option value="Google Ads">Google Ads</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Billing Amount (R/month) *</label>
              <input
                type="number"
                placeholder="e.g. 1500"
                required
                value={newForm.billing_amount}
                onChange={e => setNewForm({ ...newForm, billing_amount: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Billing Cycle Day (1-31) *</label>
              <input
                type="number"
                min="1"
                max="31"
                placeholder="e.g. 15"
                required
                value={newForm.billing_cycle_day}
                onChange={e => setNewForm({ ...newForm, billing_cycle_day: e.target.value })}
                className="w-full px-3 py-2 bg-black border border-neutral-800 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div className="flex items-end pb-2">
              <label className="flex items-center space-x-2 text-xs font-bold text-neutral-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newForm.is_active}
                  onChange={e => setNewForm({ ...newForm, is_active: e.target.checked })}
                  className="rounded border-neutral-800 bg-black text-white focus:ring-white h-4 w-4"
                />
                <span>Active immediately</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-1 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Register Retainer Stream</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Table Grid of Retainers */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 shadow-xl overflow-hidden">
        
        {/* DESKTOP VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-800 bg-black/40 font-mono text-[10px] text-neutral-400 uppercase tracking-wider">
                <th className="py-4 px-6">Client Profile</th>
                <th className="py-4 px-6">Service Type</th>
                <th className="py-4 px-6 text-center">Monthly Cycle Day</th>
                <th className="py-4 px-6 text-right">Billing Amount</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-xs md:text-sm">
              {filteredRetainers.map((retainer) => {
                const isEditing = editingId === retainer.id;

                return (
                  <tr key={retainer.id} className="hover:bg-neutral-800/50 transition-colors">
                    {/* Client name */}
                    <td className="py-4 px-6 font-medium text-white">
                      <span 
                        onClick={() => onSelectClient(retainer.client_id)}
                        className="hover:text-neutral-300 hover:underline cursor-pointer font-bold"
                      >
                        {getClientName(retainer.client_id)}
                      </span>
                    </td>

                    {/* Service type */}
                    <td className="py-4 px-6 text-neutral-300">
                      {isEditing ? (
                        <select
                          value={editForm.service_type || 'web maintenance'}
                          onChange={e => setEditForm({ ...editForm, service_type: e.target.value as any })}
                          className="px-2 py-1 bg-black border border-neutral-800 rounded text-xs text-white focus:outline-none"
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
                    <td className="py-4 px-6 text-center font-mono font-bold text-neutral-400">
                      {isEditing ? (
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={editForm.billing_cycle_day || ''}
                          onChange={e => setEditForm({ ...editForm, billing_cycle_day: e.target.value })}
                          className="px-2 py-1 bg-black border border-neutral-800 rounded text-xs text-white max-w-[60px] text-center"
                        />
                      ) : (
                        <>Day {retainer.billing_cycle_day}</>
                      )}
                    </td>

                    {/* Billing Amount */}
                    <td className="py-4 px-6 text-right font-mono font-bold text-white">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editForm.billing_amount || ''}
                          onChange={e => setEditForm({ ...editForm, billing_amount: e.target.value })}
                          className="px-2 py-1 bg-black border border-neutral-800 rounded text-xs text-white max-w-[90px] text-right"
                        />
                      ) : (
                        <>R {retainer.billing_amount.toLocaleString()}/mo</>
                      )}
                    </td>

                    {/* Status Toggle / View */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleToggleActive(retainer)}
                        disabled={!isAdmin}
                        className={`
                          px-3 py-1 rounded-full font-mono text-[9px] uppercase font-bold border transition-all cursor-pointer flex items-center space-x-1 mx-auto
                          ${retainer.is_active 
                            ? 'bg-neutral-800 text-white border-neutral-700 hover:bg-neutral-700' 
                            : 'bg-black text-neutral-500 border-neutral-800 hover:bg-neutral-900'
                          }
                        `}
                      >
                        <Power size={10} className={retainer.is_active ? 'text-white animate-pulse' : 'text-neutral-500'} />
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
                              className="p-1 bg-neutral-800 border border-neutral-700 text-white hover:bg-neutral-700 rounded-lg transition-colors cursor-pointer"
                              title="Save retainer"
                            >
                              <Save size={13} />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-black border border-neutral-800 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
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
                                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
                                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
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
        <div className="block md:hidden divide-y divide-neutral-800">
          {filteredRetainers.map((retainer) => {
            const isEditing = editingId === retainer.id;

            return (
              <div key={retainer.id} className="p-4 space-y-3 bg-neutral-900">
                <div className="flex items-start justify-between">
                  <div className="space-y-0.5">
                    <span 
                      onClick={() => onSelectClient(retainer.client_id)}
                      className="text-[10px] font-mono text-white font-bold uppercase hover:underline cursor-pointer"
                    >
                      {getClientName(retainer.client_id)}
                    </span>
                    {isEditing ? (
                      <select
                        value={editForm.service_type || 'web maintenance'}
                        onChange={e => setEditForm({ ...editForm, service_type: e.target.value as any })}
                        className="px-2 py-1 bg-black border border-neutral-800 rounded text-xs text-white block mt-1"
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
                      px-2 py-0.5 rounded-full font-mono text-[8px] uppercase font-bold border transition-all flex items-center space-x-1
                      ${retainer.is_active 
                        ? 'bg-neutral-800 text-white border-neutral-700' 
                        : 'bg-black text-neutral-500 border-neutral-800'
                      }
                    `}
                  >
                    <Power size={8} />
                    <span>{retainer.is_active ? 'Active' : 'Paused'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono py-2 bg-black px-3 rounded-lg border border-neutral-800">
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-semibold">Monthly Cost</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.billing_amount || ''}
                        onChange={e => setEditForm({ ...editForm, billing_amount: e.target.value })}
                        className="px-2 py-0.5 bg-black border border-neutral-800 rounded text-xs text-white w-2/3 block mt-0.5"
                      />
                    ) : (
                      <span className="text-white font-bold">R {retainer.billing_amount}/mo</span>
                    )}
                  </div>
                  <div>
                    <span className="text-neutral-500 block text-[9px] uppercase font-semibold">Invoice Cycle</span>
                    {isEditing ? (
                      <input
                        type="number"
                        value={editForm.billing_cycle_day || ''}
                        onChange={e => setEditForm({ ...editForm, billing_cycle_day: e.target.value })}
                        className="px-2 py-0.5 bg-black border border-neutral-800 rounded text-xs text-white w-2/3 block mt-0.5"
                      />
                    ) : (
                      <span className="text-white font-bold">Day {retainer.billing_cycle_day}</span>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      onClick={handleSaveEdit}
                      className="px-2 py-1 bg-white text-black font-semibold text-xs rounded"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-1 bg-black text-neutral-400 text-xs rounded"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {!isEditing && isAdmin && (
                  <div className="flex items-center justify-end space-x-3 pt-2 border-t border-neutral-800">
                    <button
                      onClick={() => handleStartEdit(retainer)}
                      className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1"
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
                      className="text-xs text-neutral-400 hover:text-white flex items-center space-x-1"
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
          <div className="text-center py-12 bg-neutral-900 space-y-2">
            <AlertCircle size={24} className="text-neutral-500 mx-auto" />
            <p className="text-xs text-neutral-400 font-medium">No retainers found matching your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
