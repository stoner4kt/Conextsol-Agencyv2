import React, { useState } from 'react';
import { 
  Search, 
  Briefcase, 
  Calendar, 
  Globe, 
  Github, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  AlertCircle,
  Tag,
  Mail,
  ShieldAlert,
  ExternalLink
} from 'lucide-react';
import { Project, AppState } from '../types';

interface ProjectsDashboardProps {
  state: AppState;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectClient: (clientId: string) => void;
  isAdmin: boolean;
}

export default function ProjectsDashboard({
  state,
  onSaveProject,
  onDeleteProject,
  onSelectClient,
  isAdmin
}: ProjectsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  // Edit states
  const [editForm, setEditForm] = useState<Partial<Project>>({});
  const [editServices, setEditServices] = useState<string>('');
  const [editEmails, setEditEmails] = useState<string>('');

  // Add new states
  const [newForm, setNewForm] = useState({
    client_id: '',
    project_name: '',
    start_date: '',
    end_date: '',
    invoiced_amount: '',
    short_note: '',
    staging_url: '',
    production_url: '',
    github_url: '',
    services_input: '',
    emails_input: ''
  });
  const [addError, setAddError] = useState('');

  // Helpers
  const getClientName = (clientId: string) => {
    const client = state.clients.find(c => c.id === clientId);
    return client ? client.company_name : 'Unknown Client';
  };

  // Math stats
  const totalVolume = state.projects.reduce((sum, p) => sum + p.invoiced_amount, 0);
  const averageVolume = state.projects.length > 0 
    ? Math.round(totalVolume / state.projects.length) 
    : 0;
  const projectCount = state.projects.length;

  const getDaysUntilEnd = (dateStr: string) => {
    if (!dateStr) return 999;
    const parts = dateStr.split('-').map(Number);
    if (parts.length < 3) return 999;
    const end = new Date(parts[0], parts[1] - 1, parts[2]);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const urgentDeadlineCount = state.projects.filter(p => {
    const diffDays = getDaysUntilEnd(p.end_date);
    return diffDays >= 0 && diffDays <= 2;
  }).length;

  // Filters
  const filteredProjects = state.projects.filter(project => {
    const matchesSearch = 
      project.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (project.short_note || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = filterClient === 'all' || project.client_id === filterClient;

    return matchesSearch && matchesClient;
  });

  const handleStartEdit = (project: Project) => {
    if (!isAdmin) return;
    setEditingId(project.id);
    setEditForm(project);
    setEditServices(project.services_listed.join(', '));
    setEditEmails(project.associated_emails.join(', '));
  };

  const handleSaveEdit = () => {
    if (!editForm.project_name || !editForm.start_date || !editForm.end_date) {
      return;
    }

    const services = editServices
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const emails = editEmails
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const updated: Project = {
      ...editForm as Project,
      services_listed: services,
      associated_emails: emails,
      invoiced_amount: Number(editForm.invoiced_amount) || 0,
      updated_at: new Date().toISOString()
    };

    onSaveProject(updated);
    setEditingId(null);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!newForm.client_id) {
      setAddError('Please select an active client for this project.');
      return;
    }
    if (!newForm.project_name || !newForm.start_date || !newForm.end_date || !newForm.invoiced_amount) {
      setAddError('Please fill in all required (*) fields.');
      return;
    }

    const services = newForm.services_input
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const emails = newForm.emails_input
      .split(',')
      .map(e => e.trim())
      .filter(e => e.length > 0);

    const created: Project = {
      id: crypto.randomUUID(),
      client_id: newForm.client_id,
      project_name: newForm.project_name,
      start_date: newForm.start_date,
      end_date: newForm.end_date,
      invoiced_amount: Number(newForm.invoiced_amount) || 0,
      short_note: newForm.short_note,
      staging_url: newForm.staging_url,
      production_url: newForm.production_url,
      github_url: newForm.github_url,
      services_listed: services,
      associated_emails: emails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveProject(created);
    setIsAdding(false);
    setNewForm({
      client_id: '',
      project_name: '',
      start_date: '',
      end_date: '',
      invoiced_amount: '',
      short_note: '',
      staging_url: '',
      production_url: '',
      github_url: '',
      services_input: '',
      emails_input: ''
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Active Projects</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{projectCount}</h4>
            <span className="text-[10px] text-slate-500 font-mono">active builds</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-cyan-400 font-mono font-semibold tracking-wide uppercase">Total Volume</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">R {totalVolume.toLocaleString()}</h4>
            <span className="text-[9px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-1.5 py-0.2 rounded font-mono font-bold">CONTRACT VALUE</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Average Flat Fee</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-slate-200">R {averageVolume.toLocaleString()}</h4>
            <span className="text-[10px] text-slate-500 font-mono">per build</span>
          </div>
        </div>
        <div className="bg-[#0b0f19] border border-amber-900/50 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-amber-400 font-mono font-semibold tracking-wide uppercase">Urgent Deadlines</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className={`text-xl md:text-2xl font-display font-extrabold ${urgentDeadlineCount > 0 ? 'text-amber-300' : 'text-slate-400'}`}>{urgentDeadlineCount}</h4>
            <span className="text-[9px] bg-amber-950 text-amber-300 border border-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">≤ 2 DAYS</span>
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
            placeholder="Search projects by scope, keywords, or technology stack..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs md:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs font-mono font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer max-w-[200px]"
          >
            <option value="all">All Clients</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>{c.company_name}</option>
            ))}
          </select>

          {isAdmin && (
            <button
              onClick={() => {
                if (state.clients.length === 0) {
                  alert('Please register at least one client company profile before staging a project registry.');
                  return;
                }
                if (!isAdding && state.clients.length === 1) {
                  setNewForm(prev => ({ ...prev, client_id: state.clients[0].id }));
                }
                setIsAdding(!isAdding);
              }}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isAdding ? <X size={13} /> : <Plus size={13} />}
              <span>{isAdding ? 'Cancel' : 'New Project'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Collapsible Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-[#0b0f19] border border-[#1a2234] p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn font-mono">
          <div className="border-b border-[#1a2234] pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
              <Briefcase size={15} className="text-cyan-400" />
              <span>Register New Client Project</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Inserts a new fixed-price build contract into the system.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2.5 rounded-lg">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                Select Client *
              </label>
              <select
                required
                value={newForm.client_id}
                onChange={e => setNewForm({ ...newForm, client_id: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="" disabled>-- Choose Client --</option>
                {state.clients
                  .filter(c => c.status === 'active')
                  .map(c => (
                    <option key={c.id} value={c.id}>
                      {c.company_name} ({c.primary_contact_name})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme E-Commerce Portal"
                required
                value={newForm.project_name}
                onChange={e => setNewForm({ ...newForm, project_name: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Invoiced Amount * (R)</label>
              <input
                type="number"
                placeholder="e.g. 25000"
                required
                value={newForm.invoiced_amount}
                onChange={e => setNewForm({ ...newForm, invoiced_amount: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={newForm.start_date}
                onChange={e => setNewForm({ ...newForm, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">End Date / Deadline *</label>
              <input
                type="date"
                required
                value={newForm.end_date}
                onChange={e => setNewForm({ ...newForm, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Staging URL</label>
              <input
                type="url"
                placeholder="https://staging.acme.com"
                value={newForm.staging_url}
                onChange={e => setNewForm({ ...newForm, staging_url: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">GitHub Repo URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={newForm.github_url}
                onChange={e => setNewForm({ ...newForm, github_url: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Production URL</label>
              <input
                type="url"
                placeholder="https://acme.com"
                value={newForm.production_url}
                onChange={e => setNewForm({ ...newForm, production_url: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Services Listed (Comma-separated)</label>
              <input
                type="text"
                placeholder="React, Next.js, Stripe, SEO"
                value={newForm.services_input}
                onChange={e => setNewForm({ ...newForm, services_input: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Alert Contact Emails (Comma-separated)</label>
              <input
                type="text"
                placeholder="sarah@acme.com, admin@conextsol.co.za"
                value={newForm.emails_input}
                onChange={e => setNewForm({ ...newForm, emails_input: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Short Notes / Context</label>
            <textarea
              placeholder="Provide scope overview, staging credentials, or next tasks..."
              rows={3}
              value={newForm.short_note}
              onChange={e => setNewForm({ ...newForm, short_note: e.target.value })}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-1 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Deploy Project Record</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Grid of Projects */}
      <div className="space-y-4">
        {filteredProjects.map((project) => {
          const isEditing = editingId === project.id;
          const daysLeft = getDaysUntilEnd(project.end_date);
          const isEndingInTwoDays = daysLeft >= 0 && daysLeft <= 2;

          return (
            <div 
              key={project.id}
              className={`
                bg-[#0b0f19] border rounded-xl p-5 shadow-lg transition-all space-y-4
                ${isEndingInTwoDays 
                  ? 'border-amber-700/60 ring-1 ring-amber-500/20' 
                  : 'border-[#1a2234] hover:border-cyan-500/30'
                }
              `}
            >
              {/* Header section */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span 
                      onClick={() => onSelectClient(project.client_id)}
                      className="text-[10px] font-mono text-cyan-400 font-bold tracking-widest uppercase hover:underline cursor-pointer"
                    >
                      {getClientName(project.client_id)}
                    </span>
                    {isEndingInTwoDays && (
                      <span className="text-[8px] bg-amber-950 border border-amber-800 text-amber-300 font-mono font-bold uppercase px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                        <ShieldAlert size={9} />
                        <span>DEADLINE IN {daysLeft === 0 ? 'TODAY' : `${daysLeft} DAYS`}</span>
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.project_name || ''}
                      onChange={e => setEditForm({ ...editForm, project_name: e.target.value })}
                      className="px-3 py-1.5 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white font-mono font-bold w-full block mt-1"
                    />
                  ) : (
                    <h3 className="font-display font-bold text-white text-base">
                      {project.project_name}
                    </h3>
                  )}
                </div>

                <div className="md:text-right shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Flat Contract Fee</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.invoiced_amount || ''}
                      onChange={e => setEditForm({ ...editForm, invoiced_amount: e.target.value })}
                      className="px-2 py-1 bg-[#06080d] border border-[#1a2234] rounded text-xs text-white max-w-[120px] text-right font-mono font-bold mt-0.5"
                    />
                  ) : (
                    <span className="font-display font-black text-emerald-400 text-lg tracking-tight">
                      R {project.invoiced_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Fields (Date & URLs) */}
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-[#06080d] p-4 rounded-lg border border-[#1a2234] font-mono">
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm.start_date || ''}
                      onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">End Date</label>
                    <input
                      type="date"
                      value={editForm.end_date || ''}
                      onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Staging URL</label>
                    <input
                      type="url"
                      value={editForm.staging_url || ''}
                      onChange={e => setEditForm({ ...editForm, staging_url: e.target.value })}
                      className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Github URL</label>
                    <input
                      type="url"
                      value={editForm.github_url || ''}
                      onChange={e => setEditForm({ ...editForm, github_url: e.target.value })}
                      className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                    />
                  </div>
                </div>
              ) : null}

              {/* Description */}
              {isEditing ? (
                <textarea
                  value={editForm.short_note || ''}
                  onChange={e => setEditForm({ ...editForm, short_note: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white font-mono"
                  placeholder="Notes..."
                />
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-[#06080d] border border-[#1a2234] p-3 rounded-xl">
                  {project.short_note || 'No descriptive notes logged for this scope.'}
                </p>
              )}

              {/* Tags Section */}
              <div className="space-y-2">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-[#06080d] p-4 rounded-lg border border-[#1a2234] font-mono">
                    <div>
                      <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Services Listed</label>
                      <input
                        type="text"
                        value={editServices}
                        onChange={e => setEditServices(e.target.value)}
                        className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-slate-400 uppercase font-bold mb-1">Alert Emails</label>
                      <input
                        type="text"
                        value={editEmails}
                        onChange={e => setEditEmails(e.target.value)}
                        className="px-2 py-1 bg-[#0b0f19] border border-[#1a2234] rounded text-xs text-white w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Services */}
                    {project.services_listed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 flex-1">
                        <Tag size={11} className="text-cyan-400" />
                        {project.services_listed.map((service, idx) => (
                          <span key={idx} className="text-[10px] bg-[#06080d] border border-[#1a2234] text-cyan-300 font-mono font-bold px-2 py-0.5 rounded">
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recipient Emails */}
                    {project.associated_emails.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                        <Mail size={11} className="text-slate-500" />
                        {project.associated_emails.map((mail, idx) => (
                          <span key={idx} className="text-[10px] font-mono text-slate-400 bg-[#06080d] border border-[#1a2234] px-2 py-0.5 rounded truncate max-w-[150px]">
                            {mail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Metadata Bar & Actions */}
              <div className="pt-3 border-t border-[#1a2234] flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-3">
                <div className="flex items-center space-x-3 flex-wrap">
                  {project.staging_url && (
                    <a 
                      href={project.staging_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-cyan-300 transition-colors font-mono font-bold text-slate-300"
                    >
                      <Globe size={12} className="text-cyan-400" />
                      <span>Staging Host</span>
                    </a>
                  )}
                  {project.github_url && (
                    <a 
                      href={project.github_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-white transition-colors font-mono font-bold text-slate-300"
                    >
                      <Github size={12} className="text-slate-400" />
                      <span>Repository</span>
                    </a>
                  )}
                  {project.production_url && (
                    <a 
                      href={project.production_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-emerald-300 transition-colors font-mono font-bold text-emerald-400"
                    >
                      <ExternalLink size={12} />
                      <span>Production</span>
                    </a>
                  )}
                </div>

                <div className="flex items-center space-x-3 ml-auto">
                  <div className="flex items-center space-x-1 font-mono text-[10px] text-slate-500">
                    <Calendar size={11} />
                    <span>{project.start_date} to {project.end_date}</span>
                  </div>

                  {/* Edit action buttons */}
                  {isEditing ? (
                    <div className="flex items-center space-x-1 font-mono">
                      <button
                        onClick={handleSaveEdit}
                        className="p-1.5 bg-cyan-950 border border-cyan-700 text-cyan-300 rounded-lg hover:bg-cyan-900 transition-colors cursor-pointer"
                        title="Save Project"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-[#06080d] border border-[#1a2234] text-slate-400 rounded-lg hover:bg-[#121826] transition-colors cursor-pointer"
                        title="Cancel"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      {isAdmin && (
                        <button
                          onClick={() => handleStartEdit(project)}
                          className="p-1 hover:bg-[#121826] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Edit project specifications"
                        >
                          <Edit2 size={12} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete project "${project.project_name}"?`)) {
                              onDeleteProject(project.id);
                            }
                          }}
                          className="p-1 hover:bg-[#121826] rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Delete project"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {filteredProjects.length === 0 && (
          <div className="text-center py-12 bg-[#0b0f19] rounded-xl border border-[#1a2234] space-y-2">
            <AlertCircle size={24} className="text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">No project records match the search or client query.</p>
          </div>
        )}
      </div>
    </div>
  );
}
