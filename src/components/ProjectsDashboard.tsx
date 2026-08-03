import React, { useState } from 'react';
import {
  Search,
  Briefcase,
  Calendar,
  DollarSign,
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
  ShieldAlert
} from 'lucide-react';
import { Project, Client, AppState } from '../types';

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
      <section data-command-briefing className="command-panel relative overflow-hidden p-5 md:p-6">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal-300/70 to-transparent" />
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <span className="signal-badge text-teal-200 border-teal-300/25 bg-teal-400/5"><span className="signal-dot text-teal-300" /> Admin OS</span>
            <div>
              <h2 className="font-display text-2xl md:text-3xl font-black tracking-tight text-white">Project Operations Board</h2>
              <p className="mt-1 max-w-3xl text-xs md:text-sm text-slate-400">Track fixed-price missions, deadlines, links, services, and client delivery status.</p>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/30 bg-command-950/70 px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-slate-400">
            <span className="text-teal-300">Signal:</span> Production UI Layer
          </div>
        </div>
      </section>
      {/* 1. Header Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="command-panel p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Active Projects</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">{projectCount}</h4>
            <span className="text-[10px] text-slate-400 font-mono">projects table</span>
          </div>
        </div>
        <div className="bg-command-800/90 border border-slate-600/40 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-white font-mono font-semibold tracking-wide uppercase">Total Flat Value</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">R {totalVolume.toLocaleString()}</h4>
            <span className="text-[9px] bg-white/10 text-white px-1.5 py-0.2 rounded font-mono font-bold">TOTAL REVENUE</span>
          </div>
        </div>
        <div className="command-panel p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-400 font-mono font-semibold tracking-wide uppercase">Average Flat Rate</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className="text-xl md:text-2xl font-display font-extrabold text-white">R {averageVolume.toLocaleString()}</h4>
            <span className="text-[10px] text-slate-400 font-mono">per solution</span>
          </div>
        </div>
        <div className="bg-command-800/90 border border-slate-600/40 rounded-xl p-4 md:p-5 shadow-lg">
          <p className="text-[10px] md:text-xs text-slate-300 font-mono font-semibold tracking-wide uppercase">Urgent Deadlines</p>
          <div className="flex items-baseline justify-between mt-1">
            <h4 className={`text-xl md:text-2xl font-display font-extrabold ${urgentDeadlineCount > 0 ? 'text-white' : 'text-slate-400'}`}>{urgentDeadlineCount}</h4>
            <span className="text-[9px] bg-command-700 text-slate-200 px-1.5 py-0.2 rounded font-mono font-bold">2 DAYS AWAY</span>
          </div>
        </div>
      </div>

      {/* 2. Toolbar & Filtering */}
      <div className="command-panel p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex-1 relative w-full">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search size={15} />
          </span>
          <input
            type="text"
            placeholder="Search projects by name, services, tech keywords..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-command-950 border border-slate-700/30 rounded-xl text-xs md:text-sm text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-neutral-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          <select
            value={filterClient}
            onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-command-950 border border-slate-700/30 rounded-xl text-xs font-semibold text-slate-300 focus:outline-none focus:ring-2 focus:ring-white/20 max-w-[200px]"
          >
            <option value="all">All Clients</option>
            {state.clients.map(c => (
              <option key={c.id} value={c.id}>{c.primary_contact_name}</option>
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
              className="flex items-center space-x-1.5 px-4.5 py-2.5 bg-white hover:bg-neutral-200 text-black font-sans text-xs font-extrabold rounded-xl shadow-md transition-all cursor-pointer"
            >
              {isAdding ? <X size={13} /> : <Plus size={13} />}
              <span>{isAdding ? 'Cancel' : 'Add Project'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. Collapsible Add Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="bg-command-800/90 border border-slate-700/30 p-5 md:p-6 rounded-xl shadow-xl space-y-4 animate-fadeIn">
          <div className="border-b border-slate-700/30 pb-3">
            <h3 className="font-display font-bold text-white text-xs md:text-sm flex items-center space-x-1.5">
              <Briefcase size={15} className="text-white" />
              <span>Register New Client Project</span>
            </h3>
            <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
              Inserts a new project into the PostgreSQL table connected with an active client.
            </p>
          </div>

          {addError && (
            <p className="text-xs text-slate-200 bg-command-950/90 border border-slate-600/40 p-2.5 rounded-lg font-mono">
              ⚠️ {addError}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
    Select Client * <span className="text-slate-300 font-mono">({state.clients.length} registered)</span>
  </label>
  <select
    required
    value={newForm.client_id}
    onChange={e => setNewForm({ ...newForm, client_id: e.target.value })}
    className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500 cursor-pointer appearance-auto"
  >
    <option value="" disabled>-- Choose Client --</option>
    {state.clients
      .filter(c => c.status === 'active')  // Prefer active clients
      .map(c => (
        <option key={c.id} value={c.id}>
          {c.primary_contact_name}</option>
      ))}
  </select>
</div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Project Name *</label>
              <input
                type="text"
                placeholder="e.g. Acme Mobile App"
                required
                value={newForm.project_name}
                onChange={e => setNewForm({ ...newForm, project_name: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Flat Rate Invoiced * (R)</label>
              <input
                type="number"
                placeholder="e.g. 15000"
                required
                value={newForm.invoiced_amount}
                onChange={e => setNewForm({ ...newForm, invoiced_amount: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={newForm.start_date}
                onChange={e => setNewForm({ ...newForm, start_date: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">End Date / Deadline *</label>
              <input
                type="date"
                required
                value={newForm.end_date}
                onChange={e => setNewForm({ ...newForm, end_date: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Staging Preview URL</label>
              <input
                type="url"
                placeholder="https://staging.acme.com"
                value={newForm.staging_url}
                onChange={e => setNewForm({ ...newForm, staging_url: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">GitHub Repo URL</label>
              <input
                type="url"
                placeholder="https://github.com/..."
                value={newForm.github_url}
                onChange={e => setNewForm({ ...newForm, github_url: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Production URL</label>
              <input
                type="url"
                placeholder="https://acme.com"
                value={newForm.production_url}
                onChange={e => setNewForm({ ...newForm, production_url: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white focus:outline-none"
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
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Alert Contact Emails (Comma-separated)</label>
              <input
                type="text"
                placeholder="sarah.j@acmecorp.com, admin@conextsol.com"
                value={newForm.emails_input}
                onChange={e => setNewForm({ ...newForm, emails_input: e.target.value })}
                className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-400 mb-1">Detailed Description / Short Notes</label>
            <textarea
              placeholder="Provide context, integration keys, staging notes, and next priorities..."
              rows={3}
              value={newForm.short_note}
              onChange={e => setNewForm({ ...newForm, short_note: e.target.value })}
              className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white placeholder-neutral-600 focus:outline-none"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="flex items-center space-x-1 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
            >
              <Check size={14} />
              <span>Deploy Project Registry</span>
            </button>
          </div>
        </form>
      )}

      {/* 4. Grid of Projects (Optimized for all screens) */}
      <div className="space-y-4">
        {filteredProjects.map((project) => {
          const isEditing = editingId === project.id;
          const daysLeft = getDaysUntilEnd(project.end_date);
          const isEndingInTwoDays = daysLeft >= 0 && daysLeft <= 2;

          return (
            <div
              key={project.id}
              className={`
                bg-command-800/90 border rounded-xl p-5 shadow-lg transition-all space-y-4
                ${isEndingInTwoDays
                  ? 'border-slate-600/40 bg-command-800/90 ring-1 ring-neutral-600'
                  : 'border-slate-700/30 hover:border-slate-600/40'
                }
              `}
            >
              {/* Header section */}
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <span
                      onClick={() => onSelectClient(project.client_id)}
                      className="text-[10px] font-mono text-white font-bold tracking-widest uppercase hover:underline cursor-pointer"
                    >
                      {getClientName(project.client_id)}
                    </span>
                    {isEndingInTwoDays && (
                      <span className="text-[8px] bg-command-700 border border-slate-600/40 text-white font-mono font-bold uppercase px-1.5 py-0.2 rounded flex items-center space-x-0.5">
                        <ShieldAlert size={8} />
                        <span>DEADLINE EXPIRED IN 2 DAYS</span>
                      </span>
                    )}
                  </div>

                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.project_name || ''}
                      onChange={e => setEditForm({ ...editForm, project_name: e.target.value })}
                      className="px-3 py-1.5 bg-command-950 border border-slate-700/30 rounded text-xs text-white font-bold w-full block mt-1"
                    />
                  ) : (
                    <h3 className="font-display font-bold text-white text-base">
                      {project.project_name}
                    </h3>
                  )}
                </div>

                <div className="md:text-right shrink-0">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Flat Rate Fee</span>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editForm.invoiced_amount || ''}
                      onChange={e => setEditForm({ ...editForm, invoiced_amount: e.target.value })}
                      className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white max-w-[100px] text-right font-mono font-bold mt-0.5"
                    />
                  ) : (
                    <span className="font-display font-black text-white text-lg tracking-tight">
                      R {project.invoiced_amount.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Fields (Date & URLs) */}
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-command-950 p-4 rounded-lg border border-slate-700/30">
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">Start Date</label>
                    <input
                      type="date"
                      value={editForm.start_date || ''}
                      onChange={e => setEditForm({ ...editForm, start_date: e.target.value })}
                      className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">End Date</label>
                    <input
                      type="date"
                      value={editForm.end_date || ''}
                      onChange={e => setEditForm({ ...editForm, end_date: e.target.value })}
                      className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">Staging Link</label>
                    <input
                      type="url"
                      value={editForm.staging_url || ''}
                      onChange={e => setEditForm({ ...editForm, staging_url: e.target.value })}
                      className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">Github Link</label>
                    <input
                      type="url"
                      value={editForm.github_url || ''}
                      onChange={e => setEditForm({ ...editForm, github_url: e.target.value })}
                      className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                    />
                  </div>
                </div>
              ) : null}

              {/* Description */}
              {isEditing ? (
                <textarea
                  value={editForm.short_note || ''}
                  onChange={e => setEditForm({ ...editForm, short_note: e.target.value })}
                  className="w-full px-3 py-2 bg-command-950 border border-slate-700/30 rounded-lg text-xs text-white"
                  placeholder="Notes..."
                />
              ) : (
                <p className="text-xs text-slate-300 leading-relaxed font-sans bg-command-950 border border-slate-700/30 p-3 rounded-xl">
                  {project.short_note || 'No descriptive notes logged for this scope.'}
                </p>
              )}

              {/* Tags Section */}
              <div className="space-y-2">
                {isEditing ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-command-950 p-4 rounded-lg border border-slate-700/30">
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">Services Listed (comma-separated)</label>
                      <input
                        type="text"
                        value={editServices}
                        onChange={e => setEditServices(e.target.value)}
                        className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-mono text-slate-400 uppercase font-bold mb-1">Alert Emails (comma-separated)</label>
                      <input
                        type="text"
                        value={editEmails}
                        onChange={e => setEditEmails(e.target.value)}
                        className="px-2 py-1 bg-command-950 border border-slate-700/30 rounded text-xs text-white w-full"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* Services */}
                    {project.services_listed.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 flex-1">
                        <Tag size={11} className="text-slate-400" />
                        {project.services_listed.map((service, idx) => (
                          <span key={idx} className="text-[10px] bg-command-700 border border-slate-600/40 text-slate-200 font-bold px-2 py-0.5 rounded">
                            {service}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Recipient Emails */}
                    {project.associated_emails.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end">
                        <Mail size={11} className="text-white" />
                        {project.associated_emails.map((mail, idx) => (
                          <span key={idx} className="text-[10px] font-mono text-slate-400 bg-command-950 border border-slate-700/30 px-2 py-0.5 rounded truncate max-w-[150px]">
                            {mail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Metadata Bar & Actions */}
              <div className="pt-3 border-t border-slate-700/30 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-3">
                <div className="flex items-center space-x-3 flex-wrap">
                  {project.staging_url && (
                    <a
                      href={project.staging_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-white transition-colors font-mono font-bold"
                    >
                      <Globe size={12} className="text-slate-500" />
                      <span>Staging Host</span>
                    </a>
                  )}
                  {project.github_url && (
                    <a
                      href={project.github_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-white transition-colors font-mono font-bold"
                    >
                      <Github size={12} className="text-slate-500" />
                      <span>Repository</span>
                    </a>
                  )}
                  {project.production_url && (
                    <a
                      href={project.production_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1.5 hover:text-white transition-colors font-mono font-bold"
                    >
                      <Globe size={12} className="text-white" />
                      <span>Live App</span>
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
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={handleSaveEdit}
                        className="p-1.5 bg-command-700 border border-slate-600/40 text-white rounded-lg hover:bg-neutral-700 transition-colors cursor-pointer"
                        title="Save Project"
                      >
                        <Save size={12} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-command-950 border border-slate-700/30 text-slate-400 rounded-lg hover:bg-command-700 transition-colors cursor-pointer"
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
                          className="p-1 hover:bg-command-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
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
                          className="p-1 hover:bg-command-700 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
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
          <div className="text-center py-12 command-panel space-y-2">
            <AlertCircle size={24} className="text-slate-500 mx-auto" />
            <p className="text-xs text-slate-400 font-medium">No projects match the active query parameters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
