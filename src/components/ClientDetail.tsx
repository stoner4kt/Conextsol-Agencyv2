import React, { useState } from 'react';
import { 
  Mail, 
  Phone, 
  Calendar, 
  ArrowLeft, 
  Plus, 
  Layers,
  CreditCard,
  FileText,
  ShieldAlert,
  ArrowUpRight
} from 'lucide-react';
import { AppState } from '../types';

interface ClientDetailProps {
  clientId: string;
  state: AppState;
  onBack: () => void;
  onAddRetainer: (clientId: string, serviceType: string, amount: number, cycleDay: number) => void;
  onAddDoc: (projectId: string, title: string, content: string, files: string) => void;
  onSelectProject: (projectId: string) => void;
}

export default function ClientDetail({
  clientId,
  state,
  onBack,
  onAddRetainer,
  onAddDoc,
  onSelectProject
}: ClientDetailProps) {
  const client = state.clients.find(c => c.id === clientId);
  
  if (!client) {
    return (
      <div className="bg-[#0b0f19] border border-[#1a2234] p-8 rounded-xl text-center space-y-4">
        <p className="text-sm text-slate-400 font-mono">Client record not found in system state.</p>
        <button onClick={onBack} className="text-xs text-cyan-400 hover:underline font-mono">Back to Registry</button>
      </div>
    );
  }

  const clientProjects = state.projects.filter(p => p.client_id === client.id);
  const clientRetainers = state.retainers.filter(r => r.client_id === client.id);

  const [showAddRetainer, setShowAddRetainer] = useState(false);
  const [retainerForm, setRetainerForm] = useState({
    serviceType: 'web maintenance',
    billingAmount: 500,
    billingCycleDay: 1,
  });

  const [selectedProjectForDoc, setSelectedProjectForDoc] = useState<string>('');
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [docForm, setDocForm] = useState({
    title: '',
    content: '',
    fileReferences: ''
  });

  const handleRetainerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddRetainer(
      client.id,
      retainerForm.serviceType,
      Number(retainerForm.billingAmount),
      Number(retainerForm.billingCycleDay)
    );
    setShowAddRetainer(false);
    setRetainerForm({
      serviceType: 'web maintenance',
      billingAmount: 500,
      billingCycleDay: 1,
    });
  };

  const handleDocSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectForDoc) return;
    onAddDoc(
      selectedProjectForDoc,
      docForm.title,
      docForm.content,
      docForm.fileReferences
    );
    setShowAddDoc(false);
    setDocForm({ title: '', content: '', fileReferences: '' });
  };

  return (
    <div className="space-y-6">
      {/* Back button */}
      <button 
        id="client-detail-back"
        onClick={onBack}
        className="flex items-center space-x-1.5 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Return to Account Registries</span>
      </button>

      {/* Profile Header Hero */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-xl bg-[#06080d] border border-cyan-500/40 text-cyan-400 flex items-center justify-center font-display font-extrabold text-2xl shadow-inner shrink-0">
            {client.company_name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h2 className="text-xl font-display font-extrabold text-white tracking-tight">
                {client.company_name}
              </h2>
              <span className={`
                px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold border
                ${client.status === 'active' ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800' : ''}
                ${client.status === 'paused' ? 'bg-amber-950/80 text-amber-300 border-amber-800' : ''}
                ${client.status === 'inactive' ? 'bg-[#070a12] text-slate-500 border-[#1a2234]' : ''}
              `}>
                {client.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Primary Contact: <strong className="text-slate-200">{client.primary_contact_name}</strong>
            </p>
          </div>
        </div>

        {/* Contact info block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300 font-mono border-t md:border-t-0 md:border-l border-[#1a2234] pt-4 md:pt-0 md:pl-6 shrink-0">
          <div className="flex items-center space-x-2">
            <Mail size={13} className="text-cyan-400" />
            <a href={`mailto:${client.email}`} className="hover:underline text-cyan-300 font-semibold">{client.email}</a>
          </div>
          <div className="flex items-center space-x-2">
            <Phone size={13} className="text-slate-500" />
            <a href={`tel:${client.phone}`} className="hover:underline text-slate-300">{client.phone || 'No phone recorded'}</a>
          </div>
          <div className="flex items-center space-x-2 sm:col-span-2 text-slate-500 text-[10px]">
            <Calendar size={12} className="text-slate-500" />
            <span>Profile created {new Date(client.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Inner split: Active projects vs Retainers contract */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PROJECTS SECTION */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a2234] pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base flex items-center gap-2">
                <Layers size={16} className="text-cyan-400" />
                Linked Fixed Projects
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Projects assigned to this company account</p>
            </div>
            <span className="text-xs font-mono bg-[#06080d] text-cyan-400 border border-[#1a2234] font-bold px-2 py-0.5 rounded">
              {clientProjects.length} Projects
            </span>
          </div>

          <div className="space-y-3.5">
            {clientProjects.map(project => (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project.id)}
                className="border border-[#1a2234] bg-[#070a12] hover:border-cyan-500/40 p-4 rounded-xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-display font-bold text-white text-sm group-hover:text-cyan-400 transition-colors flex items-center gap-1">
                    {project.project_name}
                    <ArrowUpRight size={13} />
                  </h4>
                  <span className="font-mono text-xs font-extrabold text-white">
                    R {project.invoiced_amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-400 line-clamp-2 font-sans">
                  {project.short_note || 'No operational summary recorded.'}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-[#1a2234] text-[10px] text-slate-500 font-mono">
                  <span>Target date: {project.end_date}</span>
                  <span className="text-cyan-400 font-bold">Inspect Specs Sheet →</span>
                </div>
              </div>
            ))}

            {clientProjects.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                No active fixed-price projects linked to this profile.
              </div>
            )}
          </div>

          {/* Seed Doc Modal Form */}
          {clientProjects.length > 0 && state.isAdmin && (
            <div className="pt-4 border-t border-[#1a2234]">
              {!showAddDoc ? (
                <button
                  id="toggle-add-doc"
                  onClick={() => {
                    setSelectedProjectForDoc(clientProjects[0].id);
                    setShowAddDoc(true);
                  }}
                  className="w-full py-2.5 border border-dashed border-[#1a2234] hover:border-cyan-500/50 bg-[#06080d] rounded-xl text-xs font-mono font-semibold text-slate-400 hover:text-cyan-300 transition-all cursor-pointer text-center"
                >
                  + Append Documentation / Spec Sheet (Admin)
                </button>
              ) : (
                <form onSubmit={handleDocSubmit} className="bg-[#06080d] p-4 rounded-xl border border-[#1a2234] space-y-3.5">
                  <h4 className="font-display font-bold text-white text-xs">Append Specification Document</h4>
                  
                  <div>
                    <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Target Project</label>
                    <select
                      value={selectedProjectForDoc}
                      onChange={e => setSelectedProjectForDoc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                    >
                      {clientProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Document Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Deployment Specification"
                      value={docForm.title}
                      onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">Markdown Body</label>
                    <textarea 
                      rows={3}
                      placeholder="Markdown guidelines or API specifications..."
                      value={docForm.content}
                      onChange={e => setDocForm({ ...docForm, content: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono font-semibold text-slate-400 mb-1">File Artifact Links (Comma separated)</label>
                    <input 
                      type="text"
                      placeholder="/storage/credentials.pdf"
                      value={docForm.fileReferences}
                      onChange={e => setDocForm({ ...docForm, fileReferences: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white font-mono focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 text-[11px] pt-1 font-mono">
                    <button 
                      type="button" 
                      onClick={() => setShowAddDoc(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3.5 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-extrabold rounded-lg hover:from-cyan-400 hover:to-blue-500"
                    >
                      Publish Document
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RETAINERS SECTION */}
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-[#1a2234] pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" />
                Retainers & SLA Contracts
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Recurring billing & maintenance streams</p>
            </div>
            <span className="text-xs font-mono bg-[#06080d] text-emerald-400 border border-[#1a2234] font-bold px-2 py-0.5 rounded">
              {clientRetainers.length} Retainers
            </span>
          </div>

          <div className="space-y-3.5">
            {clientRetainers.map((retainer) => (
              <div 
                key={retainer.id}
                className={`
                  border p-4 rounded-xl space-y-2.5 transition-all
                  ${retainer.is_active 
                    ? 'border-emerald-800/60 bg-[#070a12]' 
                    : 'border-[#1a2234] bg-[#06080d] opacity-60'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-emerald-950 border border-emerald-800 text-emerald-300 font-mono font-bold uppercase px-1.5 py-0.2 rounded">
                      {retainer.service_type}
                    </span>
                    <h4 className="font-display font-bold text-white text-xs md:text-sm capitalize mt-1">
                      {retainer.service_type} Service
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-mono">Monthly Rate</p>
                    <p className="font-display font-extrabold text-emerald-400 text-sm md:text-base">
                      R {retainer.billing_amount.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">/mo</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1a2234] text-[10px] font-mono text-slate-400">
                  <span className="flex items-center space-x-1.5">
                    <span className={`h-2 w-2 rounded-full ${retainer.is_active ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                    <span>{retainer.is_active ? 'Active Contract' : 'Paused Contract'}</span>
                  </span>
                  <span>Cycle Day: {retainer.billing_cycle_day}</span>
                </div>
              </div>
            ))}

            {clientRetainers.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500 font-mono">
                Zero active recurring retainers linked to this account.
              </div>
            )}
          </div>

          {/* Add Retainer form */}
          {state.isAdmin && (
            <div className="pt-4 border-t border-[#1a2234]">
              {!showAddRetainer ? (
                <button
                  id="toggle-add-retainer"
                  onClick={() => setShowAddRetainer(true)}
                  className="w-full py-2.5 bg-[#06080d] hover:bg-[#121826] text-slate-300 text-xs font-mono font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 border border-[#1a2234]"
                >
                  <Plus size={14} className="text-emerald-400" />
                  <span>Configure Retainer Model (Admin)</span>
                </button>
              ) : (
                <form onSubmit={handleRetainerSubmit} className="bg-[#06080d] p-4 rounded-xl border border-[#1a2234] space-y-3 font-mono">
                  <h4 className="font-display font-bold text-white text-xs">Configure Retainer Model</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Service Category</label>
                      <select
                        value={retainerForm.serviceType}
                        onChange={e => setRetainerForm({ ...retainerForm, serviceType: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white focus:outline-none"
                      >
                        <option value="web maintenance">Web Maintenance & Support</option>
                        <option value="web hosting">Web Cloud Hosting</option>
                        <option value="SEO">SEO Audits & Backlinks</option>
                        <option value="Google Ads">Google Search & PPC Ads</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Monthly Amount (R)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 1500"
                        value={retainerForm.billingAmount}
                        onChange={e => setRetainerForm({ ...retainerForm, billingAmount: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 mb-1">Cycle Day (1-31)</label>
                      <input 
                        type="number"
                        min={1}
                        max={31}
                        placeholder="1"
                        value={retainerForm.billingCycleDay}
                        onChange={e => setRetainerForm({ ...retainerForm, billingCycleDay: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 text-[11px] pt-2 border-t border-[#1a2234]">
                    <button 
                      type="button" 
                      onClick={() => setShowAddRetainer(false)}
                      className="px-2.5 py-1 text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3.5 py-1.5 bg-emerald-500 text-slate-950 font-extrabold rounded-lg hover:bg-emerald-400"
                    >
                      Save Retainer Model
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
