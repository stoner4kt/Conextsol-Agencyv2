import React, { useState } from 'react';
import { 
  Building2, 
  Mail, 
  Phone, 
  Calendar, 
  ArrowLeft, 
  DollarSign, 
  FileText, 
  ShieldAlert, 
  Plus, 
  Trash2,
  Trash
} from 'lucide-react';
import { AppState, Client, Project, Retainer, DocumentAndNote } from '../types';

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
      <div className="bg-white p-6 rounded-xl text-center space-y-4">
        <p className="text-sm text-slate-500 font-mono">Client not found in state context.</p>
        <button onClick={onBack} className="text-xs text-brand-purple-500 hover:underline">Back to registry</button>
      </div>
    );
  }

  // Filter projects and retainers associated with this client
  const clientProjects = state.projects.filter(p => p.client_id === client.id);
  const clientRetainers = state.retainers.filter(r => r.client_id === client.id);

  // Quick State for Add Retainer form
  const [showAddRetainer, setShowAddRetainer] = useState(false);
  const [retainerForm, setRetainerForm] = useState({
    serviceType: 'web maintenance',
    billingAmount: 500,
    billingCycleDay: 1,
  });

  // State for Add Doc form
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
      {/* Back link */}
      <button 
        id="client-detail-back"
        onClick={onBack}
        className="flex items-center space-x-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Back to Accounts Registry</span>
      </button>

      {/* Profile Header Cards */}
      <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-4">
          <div className="h-14 w-14 rounded-xl bg-gradient-to-tr from-[#581c87] to-purple-900 text-emerald-400 flex items-center justify-center font-display font-bold text-2xl shadow-inner shrink-0 border border-purple-900/30">
            {client.company_name.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-display font-extrabold text-white tracking-tight">
                {client.company_name}
              </h2>
              <span className={`
                px-2.5 py-0.5 rounded-full font-mono text-[9px] uppercase font-bold border
                ${client.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : ''}
                ${client.status === 'paused' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : ''}
                ${client.status === 'inactive' ? 'bg-white/5 text-gray-400 border-purple-900/20' : ''}
              `}>
                {client.status}
              </span>
            </div>
            <p className="text-xs text-gray-400 flex items-center space-x-1">
              <span>Primary contact:</span>
              <strong className="text-white">{client.primary_contact_name}</strong>
            </p>
          </div>
        </div>

        {/* Contact info block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-gray-300 font-sans border-t md:border-t-0 md:border-l border-purple-900/20 pt-4 md:pt-0 md:pl-6 max-w-lg shrink-0">
          <div className="flex items-center space-x-2">
            <Mail size={14} className="text-gray-400" />
            <a href={`mailto:${client.email}`} className="hover:underline text-emerald-400 font-semibold">{client.email}</a>
          </div>
          <div className="flex items-center space-x-2">
            <Phone size={14} className="text-gray-400" />
            <a href={`tel:${client.phone}`} className="hover:underline">{client.phone || 'No phone recorded'}</a>
          </div>
          <div className="flex items-center space-x-2 sm:col-span-2 text-gray-500 font-mono text-[10px]">
            <Calendar size={13} />
            <span>Profile created {new Date(client.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Inner split: Active projects vs Retainers contract */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PROJECTS SECTION */}
        <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900/20 pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base">
                Client Fixed Projects
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">Projects explicitly tied to this company profile</p>
            </div>
            <span className="text-xs font-mono bg-[#0F081C] text-gray-400 border border-purple-900/30 font-bold px-2 py-0.5 rounded">
              {clientProjects.length} projects
            </span>
          </div>

          <div className="space-y-4">
            {clientProjects.map(project => (
              <div 
                key={project.id} 
                onClick={() => onSelectProject(project.id)}
                className="border border-purple-900/10 bg-[#0F081C] hover:bg-purple-900/10 p-4 rounded-xl cursor-pointer transition-all space-y-2 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <h4 className="font-display font-bold text-white text-sm group-hover:text-emerald-400 transition-colors">
                    {project.project_name}
                  </h4>
                  <span className="font-mono text-xs font-bold text-white">
                    ${project.invoiced_amount.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-400 line-clamp-2">
                  {project.short_note || 'No operational summary.'}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-purple-900/20 text-[10px] text-gray-500 font-mono">
                  <span>Target end: {project.end_date}</span>
                  <span className="text-emerald-400 group-hover:text-emerald-300 font-bold">View details & documents →</span>
                </div>
              </div>
            ))}

            {clientProjects.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-500 font-sans">
                No active fixed-price projects. Use Onboarding Wizard to link projects.
              </div>
            )}
          </div>

          {/* Seed Doc Modal Form (Admin Restricted conceptually but allowed in dashboard UI) */}
          {clientProjects.length > 0 && state.isAdmin && (
            <div className="pt-4 border-t border-purple-900/20">
              {!showAddDoc ? (
                <button
                  id="toggle-add-doc"
                  onClick={() => {
                    setSelectedProjectForDoc(clientProjects[0].id);
                    setShowAddDoc(true);
                  }}
                  className="w-full py-2.5 border border-dashed border-purple-900/40 hover:border-purple-900/70 bg-[#0F081C] rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer text-center"
                >
                  + Add Documentation (Admin Only)
                </button>
              ) : (
                <form onSubmit={handleDocSubmit} className="bg-[#0F081C] p-4 rounded-xl border border-purple-900/30 space-y-3.5">
                  <h4 className="font-display font-bold text-white text-xs">Add Documentation / Note</h4>
                  
                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Target Project</label>
                    <select
                      value={selectedProjectForDoc}
                      onChange={e => setSelectedProjectForDoc(e.target.value)}
                      className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      {clientProjects.map(p => (
                        <option key={p.id} value={p.id}>{p.project_name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Document Title</label>
                    <input 
                      type="text"
                      placeholder="e.g. Deployment credentials specification"
                      value={docForm.title}
                      onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">Markdown Content</label>
                    <textarea 
                      rows={3}
                      placeholder="Markdown notes or key credentials list..."
                      value={docForm.content}
                      onChange={e => setDocForm({ ...docForm, content: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-gray-400 mb-1">File links / PDF references (comma separated)</label>
                    <input 
                      type="text"
                      placeholder="/storage/credentials.pdf"
                      value={docForm.fileReferences}
                      onChange={e => setDocForm({ ...docForm, fileReferences: e.target.value })}
                      className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-2 text-[11px] pt-1">
                    <button 
                      type="button" 
                      onClick={() => setShowAddDoc(false)}
                      className="px-2.5 py-1 text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3.5 py-1.5 bg-emerald-500 text-[#0F081C] font-extrabold rounded-lg hover:bg-emerald-600"
                    >
                      Publish Specs
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>

        {/* RETAINERS SECTION */}
        <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-purple-900/20 pb-3">
            <div>
              <h3 className="font-display font-bold text-white text-sm md:text-base">
                Client Retainers Registry
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">Recurring billing and flat-rate support streams</p>
            </div>
            <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold px-2 py-0.5 rounded">
              {clientRetainers.length} retainers
            </span>
          </div>

          <div className="space-y-4">
            {clientRetainers.map((retainer) => (
              <div 
                key={retainer.id}
                className={`
                  border p-4 rounded-xl space-y-2.5 transition-all
                  ${retainer.is_active 
                    ? 'border-emerald-500/20 bg-emerald-500/5' 
                    : 'border-purple-900/10 bg-white/5 opacity-60'
                  }
                `}
              >
                <div className="flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="text-[9px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono font-bold uppercase px-1.5 py-0.2 rounded">
                      {retainer.service_type}
                    </span>
                    <h4 className="font-display font-bold text-white text-xs md:text-sm capitalize mt-1">
                      {retainer.service_type} Contract
                    </h4>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 font-semibold font-mono">Amount due</p>
                    <p className="font-display font-extrabold text-white text-sm md:text-base">
                      ${retainer.billing_amount.toLocaleString()} <span className="text-[10px] text-gray-400 font-normal">/mo</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-purple-900/20 text-[10px] font-mono text-gray-400">
                  <span className="flex items-center space-x-1">
                    <span className={`h-2 w-2 rounded-full ${retainer.is_active ? 'bg-emerald-400' : 'bg-gray-500'}`} />
                    <span>{retainer.is_active ? 'Active contract' : 'Paused contract'}</span>
                  </span>
                  <span>Billed on Day {retainer.billing_cycle_day}</span>
                </div>
              </div>
            ))}

            {clientRetainers.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-500 font-sans">
                No active recurring retainers configured. Setup contract below.
              </div>
            )}
          </div>

          {/* Add Retainer form (Conceptual Database INSERT) */}
          {state.isAdmin && (
            <div className="pt-4 border-t border-purple-900/20">
              {!showAddRetainer ? (
                <button
                  id="toggle-add-retainer"
                  onClick={() => setShowAddRetainer(true)}
                  className="w-full py-2.5 bg-[#0F081C] hover:bg-white/5 text-emerald-400 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center space-x-1.5 border border-purple-900/30"
                >
                  <Plus size={14} />
                  <span>Configure New Retainer (Admin)</span>
                </button>
              ) : (
                <form onSubmit={handleRetainerSubmit} className="bg-[#0F081C] p-4 rounded-xl border border-purple-900/30 space-y-3">
                  <h4 className="font-display font-bold text-white text-xs">Configure Retainer Model</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Service Category</label>
                      <select
                        value={retainerForm.serviceType}
                        onChange={e => setRetainerForm({ ...retainerForm, serviceType: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none"
                      >
                        <option value="web maintenance">Web Maintenance & Support</option>
                        <option value="web hosting">Web Cloud Hosting</option>
                        <option value="SEO">SEO Audits & Backlinks</option>
                        <option value="Google Ads">Google Search & PPC Ads</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Monthly Billing ($)</label>
                      <input 
                        type="number"
                        placeholder="e.g. 1500"
                        value={retainerForm.billingAmount}
                        onChange={e => setRetainerForm({ ...retainerForm, billingAmount: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-gray-400 mb-1">Cycle Day (1-31)</label>
                      <input 
                        type="number"
                        min={1}
                        max={31}
                        placeholder="1"
                        value={retainerForm.billingCycleDay}
                        onChange={e => setRetainerForm({ ...retainerForm, billingCycleDay: Number(e.target.value) })}
                        className="w-full px-3 py-1.5 bg-[#1B122B] border border-purple-900/40 rounded text-xs text-white focus:outline-none"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end space-x-2 text-[11px] pt-2 border-t border-purple-900/20">
                    <button 
                      type="button" 
                      onClick={() => setShowAddRetainer(false)}
                      className="px-2.5 py-1 text-gray-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-3.5 py-1.5 bg-emerald-500 text-[#0F081C] font-extrabold rounded-lg hover:bg-emerald-600"
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
