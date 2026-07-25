import React, { useState } from 'react';
import { 
  Bot, 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  HelpCircle, 
  X, 
  Save, 
  Mail, 
  Sparkles,
  Zap,
  Filter,
  Check,
  ChevronRight,
  Layers,
  ArrowRight
} from 'lucide-react';
import { AppState, AIToolAccount } from '../types';
import { CURRENT_DATE_STR } from '../mockData';

interface AIToolTrackerDashboardProps {
  state: AppState;
  onSaveAccount: (account: AIToolAccount) => Promise<void>;
  onDeleteAccount: (id: string) => Promise<void>;
  isAdmin: boolean;
}

const AVAILABLE_SERVICES: Array<'Replit' | 'Claude' | 'Codex' | 'Other'> = ['Replit', 'Claude', 'Codex', 'Other'];

export default function AIToolTrackerDashboard({
  state,
  onSaveAccount,
  onDeleteAccount,
  isAdmin
}: AIToolTrackerDashboardProps) {
  // Navigation & Filtering
  const [selectedEmailFilter, setSelectedEmailFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterService, setFilterService] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State for Single Email Multi-Service Configuration
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalEmail, setModalEmail] = useState('');
  const [isEditingExistingEmail, setIsEditingExistingEmail] = useState(false);

  // Form State for each service under the entered email
  // Service key -> { active: boolean, reset_date: string, status: string, notes: string, last_checked: string, id?: string }
  type ServiceConfig = {
    active: boolean;
    reset_date: string;
    status: 'Limited' | 'Usable' | 'Reset Soon' | 'Unknown';
    notes: string;
    last_checked: string;
    id?: string;
  };

  const [serviceConfigs, setServiceConfigs] = useState<Record<string, ServiceConfig>>({
    Replit: { active: true, reset_date: '2026-07-28', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
    Claude: { active: true, reset_date: '2026-07-18', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
    Codex: { active: true, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
    Other: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to calculate Days Until Reset
  const calculateDaysUntilReset = (targetResetDateStr: string): number => {
    if (!targetResetDateStr) return 0;
    const today = new Date(CURRENT_DATE_STR);
    const reset = new Date(targetResetDateStr);
    const diffTime = reset.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Get distinct list of account emails
  const uniqueEmails = Array.from(new Set(state.aiToolAccounts.map(a => a.account_email))).sort();

  // Open modal to add a brand new Google account (Email entered ONCE)
  const handleOpenAddAccountModal = () => {
    setModalEmail('');
    setIsEditingExistingEmail(false);
    setServiceConfigs({
      Replit: { active: true, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Claude: { active: true, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Codex: { active: true, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Other: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR }
    });
    setIsModalOpen(true);
  };

  // Open modal to edit services for an EXISTING email
  const handleOpenEditAccountModal = (emailToEdit: string) => {
    setModalEmail(emailToEdit);
    setIsEditingExistingEmail(true);

    const existingRecordsForEmail = state.aiToolAccounts.filter(a => a.account_email.toLowerCase() === emailToEdit.toLowerCase());
    
    const newConfigs: Record<string, ServiceConfig> = {
      Replit: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Claude: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Codex: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR },
      Other: { active: false, reset_date: '2026-08-01', status: 'Usable', notes: '', last_checked: CURRENT_DATE_STR }
    };

    existingRecordsForEmail.forEach(rec => {
      const serviceKey = rec.service_name as 'Replit' | 'Claude' | 'Codex' | 'Other';
      newConfigs[serviceKey] = {
        active: true,
        reset_date: rec.reset_date,
        status: rec.status,
        notes: rec.notes,
        last_checked: rec.last_checked || CURRENT_DATE_STR,
        id: rec.id
      };
    });

    setServiceConfigs(newConfigs);
    setIsModalOpen(true);
  };

  // Submit multi-service form
  const handleSubmitAccountForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEmail.trim()) return;

    setIsSubmitting(true);
    const cleanedEmail = modalEmail.trim().toLowerCase();

    // Iterate over active services in serviceConfigs and save them
    for (const serviceName of AVAILABLE_SERVICES) {
      const config = serviceConfigs[serviceName];
      if (config.active) {
        const idToUse = config.id || 'ai-acc-' + Math.random().toString(36).substring(2, 9);
        
        let finalStatus = config.status;
        const daysLeft = calculateDaysUntilReset(config.reset_date);
        if (config.status !== 'Limited' && config.status !== 'Unknown') {
          if (daysLeft >= 0 && daysLeft <= 7) {
            finalStatus = 'Reset Soon';
          }
        }

        const accountRecord: AIToolAccount = {
          id: idToUse,
          account_email: cleanedEmail,
          service_name: serviceName,
          reset_date: config.reset_date,
          status: finalStatus,
          notes: config.notes,
          last_checked: config.last_checked || CURRENT_DATE_STR,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await onSaveAccount(accountRecord);
      }
    }

    setIsSubmitting(false);
    setIsModalOpen(false);
  };

  // Quick Status Toggle Handler for a specific record
  const handleQuickStatusToggle = async (item: AIToolAccount, newStatus: 'Limited' | 'Usable' | 'Reset Soon' | 'Unknown') => {
    const updated = {
      ...item,
      status: newStatus,
      last_checked: CURRENT_DATE_STR,
      updated_at: new Date().toISOString()
    };
    await onSaveAccount(updated);
  };

  // Overall Statistics
  const totalTrackedEntries = state.aiToolAccounts.length;
  const limitedCount = state.aiToolAccounts.filter(a => a.status === 'Limited').length;
  const resetSoonCount = state.aiToolAccounts.filter(a => {
    const days = calculateDaysUntilReset(a.reset_date);
    return a.status === 'Reset Soon' || (days >= 0 && days <= 7 && a.status !== 'Limited');
  }).length;
  const usableCount = state.aiToolAccounts.filter(a => a.status === 'Usable').length;

  // Filter accounts based on selected email filter, search phrase, service filter, status filter
  const filteredRecords = state.aiToolAccounts.filter(item => {
    const matchesEmailFilter = selectedEmailFilter === 'all' || item.account_email.toLowerCase() === selectedEmailFilter.toLowerCase();
    const matchesSearch = item.account_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.notes.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.service_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesService = filterService === 'all' || item.service_name.toLowerCase() === filterService.toLowerCase();
    const matchesStatus = filterStatus === 'all' || item.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesEmailFilter && matchesSearch && matchesService && matchesStatus;
  });

  // Group filtered records by email address
  const groupedByEmail = filteredRecords.reduce<Record<string, AIToolAccount[]>>((acc, item) => {
    const emailKey = item.account_email.toLowerCase();
    if (!acc[emailKey]) acc[emailKey] = [];
    acc[emailKey].push(item);
    return acc;
  }, {});

  // Styling Helpers
  const getServiceBadgeStyle = (service: string) => {
    switch (service.toLowerCase()) {
      case 'replit':
        return 'bg-purple-950/80 border-purple-800 text-purple-300';
      case 'claude':
        return 'bg-amber-950/80 border-amber-800 text-amber-300';
      case 'codex':
        return 'bg-emerald-950/80 border-emerald-800 text-emerald-300';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-300';
    }
  };

  const getStatusBadgeStyle = (stat: string) => {
    switch (stat) {
      case 'Limited':
        return 'bg-red-950/90 border-red-800 text-red-300';
      case 'Reset Soon':
        return 'bg-amber-950/90 border-amber-800 text-amber-300';
      case 'Usable':
        return 'bg-emerald-950/90 border-emerald-800 text-emerald-300';
      default:
        return 'bg-neutral-800 border-neutral-700 text-neutral-400';
    }
  };

  const getStatusIcon = (stat: string) => {
    switch (stat) {
      case 'Limited':
        return <AlertTriangle size={12} className="shrink-0 text-red-400" />;
      case 'Reset Soon':
        return <Clock size={12} className="shrink-0 text-amber-400" />;
      case 'Usable':
        return <CheckCircle2 size={12} className="shrink-0 text-emerald-400" />;
      default:
        return <HelpCircle size={12} className="shrink-0 text-neutral-400" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Overview Banner */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="p-1.5 bg-neutral-800 border border-neutral-700 text-white rounded-lg">
                <Zap size={18} />
              </span>
              <h2 className="text-xl md:text-2xl font-display font-extrabold text-white">
                AI Tool Account Limits Tracker
              </h2>
            </div>
            <p className="text-xs text-neutral-400 max-w-2xl font-sans">
              Enter a Google account email once to manage and monitor limits across Replit, Claude, Codex, and other AI services.
            </p>
          </div>

          {isAdmin && (
            <button
              id="add-ai-account-single-btn"
              onClick={handleOpenAddAccountModal}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-black rounded-xl transition-all cursor-pointer shadow-lg shrink-0"
            >
              <Plus size={16} />
              <span>Add New Google Account</span>
            </button>
          )}
        </div>

        {/* 4 Overview Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 mt-6 relative z-10">
          <div className="bg-black/60 border border-neutral-800 rounded-xl p-4">
            <p className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider">Unique Accounts</p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-display font-black text-white">{uniqueEmails.length}</h3>
              <span className="text-[10px] font-mono text-neutral-500">{totalTrackedEntries} service seats</span>
            </div>
          </div>

          <div className={`bg-black/60 border rounded-xl p-4 ${limitedCount > 0 ? 'border-red-900/60' : 'border-neutral-800'}`}>
            <p className="text-[10px] font-mono font-bold text-red-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} />
              <span>Currently Limited</span>
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-display font-black text-red-400">{limitedCount}</h3>
              <span className="text-[9px] bg-red-950 border border-red-900 text-red-300 px-1.5 py-0.5 rounded font-mono font-bold">THROTTLED</span>
            </div>
          </div>

          <div className={`bg-black/60 border rounded-xl p-4 ${resetSoonCount > 0 ? 'border-amber-900/60' : 'border-neutral-800'}`}>
            <p className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <Clock size={10} />
              <span>Resetting Soon (≤7d)</span>
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-display font-black text-amber-400">{resetSoonCount}</h3>
              <span className="text-[9px] bg-amber-950 border border-amber-900 text-amber-300 px-1.5 py-0.5 rounded font-mono font-bold">UPCOMING</span>
            </div>
          </div>

          <div className="bg-black/60 border border-neutral-800 rounded-xl p-4">
            <p className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 size={10} />
              <span>Fully Usable</span>
            </p>
            <div className="flex items-baseline justify-between mt-1">
              <h3 className="text-2xl font-display font-black text-emerald-400">{usableCount}</h3>
              <span className="text-[9px] bg-emerald-950 border border-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">AVAILABLE</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACCOUNT EMAIL SELECTOR PILL TABS */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mail size={15} className="text-white" />
            <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">
              Select Google Account to Inspect Data
            </span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            {selectedEmailFilter === 'all' ? `Showing all ${uniqueEmails.length} accounts` : `1 account selected`}
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedEmailFilter('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-1.5 border ${
              selectedEmailFilter === 'all'
                ? 'bg-white text-black border-white shadow-md'
                : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-700'
            }`}
          >
            <Layers size={13} />
            <span>All Accounts ({uniqueEmails.length})</span>
          </button>

          {uniqueEmails.map(email => {
            const isSelected = selectedEmailFilter.toLowerCase() === email.toLowerCase();
            const emailRecords = state.aiToolAccounts.filter(a => a.account_email.toLowerCase() === email.toLowerCase());
            const hasLimited = emailRecords.some(a => a.status === 'Limited');

            return (
              <button
                key={email}
                onClick={() => setSelectedEmailFilter(email)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer whitespace-nowrap flex items-center space-x-2 border ${
                  isSelected
                    ? 'bg-white text-black border-white shadow-md'
                    : 'bg-black text-neutral-300 border-neutral-800 hover:border-neutral-700'
                }`}
              >
                <span>{email}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                  hasLimited 
                    ? isSelected ? 'bg-red-200 text-red-900' : 'bg-red-950 border border-red-800 text-red-300' 
                    : isSelected ? 'bg-neutral-200 text-black' : 'bg-neutral-800 text-neutral-400'
                }`}>
                  {emailRecords.length} services
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className="bg-neutral-900 rounded-xl border border-neutral-800 p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search notes, account emails, or services..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-black border border-neutral-800 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 transition-colors"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 overflow-x-auto shrink-0">
          <div className="flex items-center space-x-1 text-xs text-neutral-400 font-mono">
            <Filter size={13} />
            <span>Service:</span>
          </div>
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-200 focus:outline-none"
          >
            <option value="all">All Services</option>
            <option value="replit">Replit</option>
            <option value="claude">Claude</option>
            <option value="codex">Codex</option>
            <option value="other">Other</option>
          </select>

          <div className="flex items-center space-x-1 text-xs text-neutral-400 font-mono ml-2">
            <span>Status:</span>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-black border border-neutral-800 rounded-xl text-xs font-semibold text-neutral-200 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="limited">Limited</option>
            <option value="reset soon">Reset Soon</option>
            <option value="usable">Usable</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
      </div>

      {/* ACCOUNT GROUPED DATA CARDS */}
      <div className="space-y-6">
        {Object.entries(groupedByEmail).map(([email, records]) => {
          const emailLimitedCount = records.filter(r => r.status === 'Limited').length;
          const emailResetSoonCount = records.filter(r => {
            const days = calculateDaysUntilReset(r.reset_date);
            return r.status === 'Reset Soon' || (days >= 0 && days <= 7 && r.status !== 'Limited');
          }).length;

          return (
            <div 
              key={email}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-4 transition-all"
            >
              {/* Account Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-black border border-neutral-800 text-white rounded-xl">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="font-mono text-sm md:text-base font-extrabold text-white flex items-center space-x-2">
                      <span>{email}</span>
                      {emailLimitedCount > 0 && (
                        <span className="px-2 py-0.5 bg-red-950 border border-red-800 text-red-300 rounded text-[10px] font-bold font-sans">
                          {emailLimitedCount} Limited
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-neutral-400 font-sans mt-0.5">
                      {records.length} AI Services configured for this Google account seat.
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={() => handleOpenEditAccountModal(email)}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shrink-0"
                  >
                    <Edit3 size={13} />
                    <span>Manage Services for Email</span>
                  </button>
                )}
              </div>

              {/* Service Grid under this specific email */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {records.map(serviceItem => {
                  const daysLeft = calculateDaysUntilReset(serviceItem.reset_date);
                  const isUrgent = serviceItem.status === 'Limited' || daysLeft <= 3;

                  return (
                    <div 
                      key={serviceItem.id}
                      className={`bg-black/70 border rounded-xl p-4 shadow-sm space-y-3 flex flex-col justify-between ${
                        isUrgent ? 'border-neutral-700/80' : 'border-neutral-800'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${getServiceBadgeStyle(serviceItem.service_name)}`}>
                            {serviceItem.service_name}
                          </span>

                          <span className={`inline-flex items-center space-x-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getStatusBadgeStyle(serviceItem.status)}`}>
                            {getStatusIcon(serviceItem.status)}
                            <span>{serviceItem.status}</span>
                          </span>
                        </div>

                        <div className="flex items-baseline justify-between pt-1">
                          <span className="text-[10px] text-neutral-500 font-mono">Reset Date: <strong className="text-neutral-300">{serviceItem.reset_date}</strong></span>
                          <span className={`text-xs font-mono font-bold ${daysLeft <= 7 ? 'text-amber-400' : 'text-neutral-300'}`}>
                            {daysLeft < 0 
                              ? 'Passed' 
                              : daysLeft === 0 
                                ? 'Resets Today' 
                                : `${daysLeft} days left`
                            }
                          </span>
                        </div>

                        {serviceItem.notes && (
                          <p className="text-xs text-neutral-300 font-sans bg-neutral-900 border border-neutral-800 p-2.5 rounded-lg leading-relaxed line-clamp-3">
                            {serviceItem.notes}
                          </p>
                        )}
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-2 border-t border-neutral-800 flex items-center justify-between text-[10px] font-mono text-neutral-500">
                        <span>Checked: {serviceItem.last_checked || 'N/A'}</span>

                        {isAdmin && (
                          <div className="flex items-center space-x-1">
                            {serviceItem.status === 'Limited' ? (
                              <button
                                onClick={() => handleQuickStatusToggle(serviceItem, 'Usable')}
                                title="Quick Mark Usable"
                                className="p-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 text-emerald-300 rounded transition-colors"
                              >
                                <Check size={12} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleQuickStatusToggle(serviceItem, 'Limited')}
                                title="Quick Mark Limited"
                                className="p-1 bg-neutral-800 hover:bg-red-950 border border-neutral-700 text-neutral-300 hover:text-red-300 rounded transition-colors"
                              >
                                <AlertTriangle size={12} />
                              </button>
                            )}

                            <button
                              onClick={() => {
                                if (confirm(`Remove ${serviceItem.service_name} limit record for ${email}?`)) {
                                  onDeleteAccount(serviceItem.id);
                                }
                              }}
                              title="Delete Record"
                              className="p-1 hover:text-white transition-colors"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {Object.keys(groupedByEmail).length === 0 && (
          <div className="py-16 bg-neutral-900/40 border border-neutral-800 rounded-2xl text-center space-y-3">
            <Bot size={32} className="text-neutral-600 mx-auto animate-bounce" />
            <h3 className="font-display font-bold text-white text-sm">No Account Limit Records Found</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto font-sans">
              No entries found for the selected email or filters. Click "Add New Google Account" above to register an account email once and set up its AI services.
            </p>
          </div>
        )}
      </div>

      {/* SINGLE EMAIL MULTI-SERVICE CONFIGURATION MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 relative max-h-[90vh] overflow-y-auto animate-fadeIn">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4 sticky top-0 bg-neutral-900 z-10">
              <div className="flex items-center space-x-2">
                <Sparkles size={18} className="text-white" />
                <h3 className="font-display font-bold text-white text-base">
                  {isEditingExistingEmail ? 'Manage Services for Account' : 'Register Google Account AI Limits'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 hover:bg-neutral-800 rounded-lg text-neutral-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmitAccountForm} className="space-y-5">
              
              {/* STEP 1: Enter Email ONCE */}
              <div className="bg-black/60 border border-neutral-800 p-4 rounded-xl space-y-2">
                <label className="block text-xs font-bold text-white font-mono uppercase tracking-wider">
                  1. Google Account Email *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-500">
                    <Mail size={15} />
                  </span>
                  <input
                    type="email"
                    required
                    disabled={isEditingExistingEmail}
                    value={modalEmail}
                    onChange={e => setModalEmail(e.target.value)}
                    placeholder="e.g. ai.dev01@conextsol.com"
                    className="w-full pl-9 pr-4 py-2.5 bg-black border border-neutral-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-neutral-500 transition-colors disabled:opacity-75 disabled:bg-neutral-950"
                  />
                </div>
                <p className="text-[10px] text-neutral-400 font-sans">
                  Enter the Google account email once. Below you can enable and set limit parameters for Replit, Claude, Codex, and Other.
                </p>
              </div>

              {/* STEP 2: Configure Services for this Email */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-white font-mono uppercase tracking-wider">
                  2. AI Services Tied to this Email
                </label>

                <div className="space-y-3">
                  {AVAILABLE_SERVICES.map(serviceName => {
                    const cfg = serviceConfigs[serviceName];

                    return (
                      <div 
                        key={serviceName}
                        className={`border rounded-xl p-4 transition-all ${
                          cfg.active ? 'bg-black/80 border-neutral-700' : 'bg-black/30 border-neutral-800/60 opacity-60'
                        }`}
                      >
                        {/* Toggle header */}
                        <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3">
                          <label className="flex items-center space-x-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={cfg.active}
                              onChange={e => {
                                const active = e.target.checked;
                                setServiceConfigs(prev => ({
                                  ...prev,
                                  [serviceName]: { ...prev[serviceName], active }
                                }));
                              }}
                              className="h-4 w-4 rounded border-neutral-700 text-white focus:ring-0 bg-neutral-900 cursor-pointer"
                            />
                            <span className={`text-xs font-mono font-bold uppercase px-2 py-0.5 rounded border ${getServiceBadgeStyle(serviceName)}`}>
                              {serviceName}
                            </span>
                          </label>

                          <span className="text-[10px] font-mono text-neutral-400">
                            {cfg.active ? 'Enabled for this account' : 'Disabled'}
                          </span>
                        </div>

                        {/* Fields if active */}
                        {cfg.active && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                                Reset Date *
                              </label>
                              <input
                                type="date"
                                required={cfg.active}
                                value={cfg.reset_date}
                                onChange={e => {
                                  const val = e.target.value;
                                  setServiceConfigs(prev => ({
                                    ...prev,
                                    [serviceName]: { ...prev[serviceName], reset_date: val }
                                  }));
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                                Status *
                              </label>
                              <select
                                value={cfg.status}
                                onChange={e => {
                                  const val = e.target.value as any;
                                  setServiceConfigs(prev => ({
                                    ...prev,
                                    [serviceName]: { ...prev[serviceName], status: val }
                                  }));
                                }}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none font-semibold"
                              >
                                <option value="Usable">Usable</option>
                                <option value="Limited">Limited</option>
                                <option value="Reset Soon">Reset Soon</option>
                                <option value="Unknown">Unknown</option>
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <label className="block text-[10px] font-semibold text-neutral-400 mb-1">
                                Notes & Limits Details
                              </label>
                              <input
                                type="text"
                                value={cfg.notes}
                                onChange={e => {
                                  const val = e.target.value;
                                  setServiceConfigs(prev => ({
                                    ...prev,
                                    [serviceName]: { ...prev[serviceName], notes: val }
                                  }));
                                }}
                                placeholder={`Specific notes for ${serviceName} on ${modalEmail || 'this account'}...`}
                                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-lg text-xs text-white focus:outline-none font-sans"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Form Actions */}
              <div className="pt-3 border-t border-neutral-800 flex items-center justify-end space-x-2 sticky bottom-0 bg-neutral-900 z-10 py-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-black hover:bg-neutral-800 border border-neutral-800 text-neutral-300 text-xs font-semibold rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center space-x-1.5 px-5 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-extrabold rounded-xl transition-all cursor-pointer shadow-lg disabled:opacity-50"
                >
                  <Save size={14} />
                  <span>{isSubmitting ? 'Saving...' : 'Save Account Services'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
