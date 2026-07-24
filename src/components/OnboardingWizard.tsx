import React, { useState } from 'react';
import { 
  User, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Plus, 
  Code,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { Client, Project, DocumentAndNote } from '../types';

interface OnboardingWizardProps {
  onComplete: (newClient: Client, newProject: Project, newDoc: DocumentAndNote) => void;
  onCancel: () => void;
}

export default function OnboardingWizard({ onComplete, onCancel }: OnboardingWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Auto-generate realistic UUIDs for simulation
  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  // State for Step 1: Client
  const [clientForm, setClientForm] = useState({
    companyName: '',
    contactName: '',
    email: '',
    phone: '',
    status: 'active' as 'active' | 'paused' | 'inactive',
  });

  // State for Step 2: Project (depends on Client ID)
  const [projectForm, setProjectForm] = useState({
    projectName: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    invoicedAmount: 15000,
    shortNote: '',
    stagingUrl: '',
    productionUrl: '',
    githubUrl: '',
    servicesListed: '',
    associatedEmails: '',
  });

  // State for Step 3: Document (depends on Project ID)
  const [docForm, setDocForm] = useState({
    title: 'Initial Discovery & Specifications',
    content: `### Client Engagement Plan\n\nInitial notes and architectural directives for Conextsol dev team.\n\n#### Core Milestones\n1. Initial UI/UX Wireframes approval\n2. Stripe API setup & backend server staging\n3. Client handoff & manual review`,
    fileReferences: '',
  });

  // Simulated Database Identifiers
  const [generatedIds, setGeneratedIds] = useState({
    clientId: '',
    projectId: '',
    docId: '',
  });

  const [formErrors, setFormErrors] = useState<string>('');

  // Handle Step 1 Submit
  const handleStep1Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.companyName || !clientForm.contactName || !clientForm.email) {
      setFormErrors('Company Name, Contact Name, and Email are required.');
      return;
    }
    setFormErrors('');
    
    // Simulate INSERT INTO clients RETURNING id
    const newClientId = generateUUID();
    setGeneratedIds(prev => ({ ...prev, clientId: newClientId }));
    setStep(2);
  };

  // Handle Step 2 Submit
  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.projectName) {
      setFormErrors('Project Name is required.');
      return;
    }
    setFormErrors('');

    // Simulate INSERT INTO projects RETURNING id
    const newProjectId = generateUUID();
    setGeneratedIds(prev => ({ ...prev, projectId: newProjectId }));
    
    // Pre-populate document associated email references with the client's email
    setDocForm(prev => ({
      ...prev,
      content: prev.content + `\n\n---\n**Associated Client Email:** ${clientForm.email}\n**Project Contact:** ${clientForm.contactName}`
    }));

    setStep(3);
  };

  // Handle Step 3 Submit
  const handleStep3Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.title || !docForm.content) {
      setFormErrors('Document Title and Content are required.');
      return;
    }
    setFormErrors('');

    // Generate Doc UUID
    const newDocId = generateUUID();
    const finalIds = { ...generatedIds, docId: newDocId };
    setGeneratedIds(finalIds);

    // Complete the transaction object construction
    const finalClient: Client = {
      id: finalIds.clientId,
      company_name: clientForm.companyName,
      primary_contact_name: clientForm.contactName,
      email: clientForm.email,
      phone: clientForm.phone,
      status: clientForm.status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const parsedServices = projectForm.servicesListed
      ? projectForm.servicesListed.split(',').map(s => s.trim()).filter(Boolean)
      : ['Custom Solution'];

    const parsedEmails = projectForm.associatedEmails
      ? projectForm.associatedEmails.split(',').map(e => e.trim()).filter(Boolean)
      : [clientForm.email];

    const finalProject: Project = {
      id: finalIds.projectId,
      client_id: finalIds.clientId,
      project_name: projectForm.projectName,
      start_date: projectForm.startDate,
      end_date: projectForm.endDate,
      invoiced_amount: Number(projectForm.invoicedAmount) || 0,
      short_note: projectForm.shortNote,
      staging_url: projectForm.stagingUrl,
      production_url: projectForm.productionUrl,
      github_url: projectForm.githubUrl,
      services_listed: parsedServices,
      associated_emails: parsedEmails,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const parsedFiles = docForm.fileReferences
      ? docForm.fileReferences.split(',').map(f => f.trim()).filter(Boolean)
      : [];

    const finalDoc: DocumentAndNote = {
      id: finalIds.docId,
      project_id: finalIds.projectId,
      title: docForm.title,
      content: docForm.content,
      file_references: parsedFiles,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Forward the assembled entities
    onComplete(finalClient, finalProject, finalDoc);
    setStep(4);
  };

  const handleReset = () => {
    setClientForm({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      status: 'active',
    });
    setProjectForm({
      projectName: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      invoicedAmount: 15000,
      shortNote: '',
      stagingUrl: '',
      productionUrl: '',
      githubUrl: '',
      servicesListed: '',
      associatedEmails: '',
    });
    setDocForm({
      title: 'Initial Discovery & Specifications',
      content: `### Client Engagement Plan\n\nInitial notes and architectural directives for Conextsol dev team.\n\n#### Core Milestones\n1. Initial UI/UX Wireframes approval\n2. Stripe API setup & backend server staging\n3. Client handoff & manual review`,
      fileReferences: '',
    });
    setGeneratedIds({ clientId: '', projectId: '', docId: '' });
    setFormErrors('');
    setStep(1);
  };

  return (
    <div className="bg-[#1B122B] rounded-2xl shadow-2xl border border-purple-900/20 overflow-hidden">
      {/* Wizard Header Bar */}
      <div className="bg-gradient-to-r from-[#3b0764] to-[#12072b] p-6 md:p-8 text-white border-b border-purple-900/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] bg-emerald-500 text-[#0F081C] font-mono font-extrabold tracking-wider px-2 py-0.5 rounded uppercase">
              LINEAR FLOW
            </span>
            <h2 className="text-xl md:text-2xl font-display font-extrabold mt-1 text-white">
              Agency Client Onboarding Wizard
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Creates linked Client profile, Project registry, and specs in a unified pipeline.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            {step < 4 ? (
              <button 
                id="wizard-cancel-btn"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-400 hover:text-white bg-[#0F081C] hover:bg-white/5 rounded-lg transition-colors border border-purple-900/30"
              >
                Cancel
              </button>
            ) : (
              <button
                id="wizard-reset-btn"
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] rounded-lg transition-colors cursor-pointer font-sans"
              >
                <RefreshCw size={13} />
                <span>Onboard Another</span>
              </button>
            )}
          </div>
        </div>

        {/* Chained Steps visual tracker */}
        <div className="relative flex justify-between items-center max-w-xl mx-auto mt-8 px-4">
          {/* Background line tracker */}
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#0F081C] -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-emerald-500 -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />

          {/* Step circles */}
          {[
            { nr: 1, label: 'Client info', icon: User },
            { nr: 2, label: 'Add Project', icon: Briefcase },
            { nr: 3, label: 'Initial specs', icon: FileText },
            { nr: 4, label: 'Success', icon: CheckCircle2 }
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.nr;
            const isCurrent = step === s.nr;
            return (
              <div key={s.nr} className="flex flex-col items-center relative z-10">
                <div className={`
                  h-9 w-9 rounded-full flex items-center justify-center font-display font-bold text-xs transition-all duration-200 border
                  ${isCompleted ? 'bg-emerald-500 text-[#0F081C] border-emerald-400 shadow shadow-emerald-500/20 font-extrabold' : ''}
                  ${isCurrent ? 'bg-purple-600 text-white border-purple-400 ring-4 ring-purple-500/10 font-bold' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-[#0F081C] text-gray-500 border-purple-900/30' : ''}
                `}>
                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap hidden sm:inline ${isCurrent ? 'text-emerald-400 font-bold' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Form Area */}
      <div className="p-6 md:p-8">
        {formErrors && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start space-x-2 text-sm text-red-400">
            <span className="font-bold">⚠️ Error:</span>
            <span>{formErrors}</span>
          </div>
        )}

        {/* STEP 1: CLIENT DETAILS */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-5 animate-fadeIn">
            <div className="border-b border-purple-900/20 pb-3">
              <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                <span className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-mono text-xs text-purple-300 font-bold">1</span>
                <span>Enter Client Profile details</span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5 font-sans">Define core institutional metadata for billing and contacts</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Company Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="e.g. Acme Corp Solutions"
                  value={clientForm.companyName}
                  onChange={e => setClientForm({ ...clientForm, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Primary Contact Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={clientForm.contactName}
                  onChange={e => setClientForm({ ...clientForm, contactName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Email Address <span className="text-red-500">*</span></label>
                <input 
                  type="email"
                  placeholder="e.g. contact@acmecorp.com"
                  value={clientForm.email}
                  onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Phone Number</label>
                <input 
                  type="tel"
                  placeholder="e.g. +1 (555) 019-2834"
                  value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Client Status</label>
                <select 
                  value={clientForm.status}
                  onChange={e => setClientForm({ ...clientForm, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                >
                  <option value="active">Active (Onboard immediately)</option>
                  <option value="paused">Paused (On hold)</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-purple-900/20">
              <button
                type="submit"
                id="wizard-step1-next"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-sm font-extrabold bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] rounded-lg transition-colors cursor-pointer font-sans"
              >
                <span>Save Client & Add Project</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: LINKED PROJECT */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5 animate-fadeIn">
            <div className="border-b border-purple-900/20 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                  <span className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-mono text-xs text-purple-300 font-bold">2</span>
                  <span>Set Up Project Registry</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Auto-linking this project to Client: <strong className="text-emerald-400">{clientForm.companyName}</strong> (ID: {generatedIds.clientId.substring(0,8)}...)
                </p>
              </div>
              <span className="text-[10px] bg-purple-500/10 text-purple-300 border border-purple-500/20 font-mono px-2 py-0.5 rounded font-bold">
                CLIENT_ID INJECTED
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Project Name <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  placeholder="e.g. B2B Headless Redesign"
                  value={projectForm.projectName}
                  onChange={e => setProjectForm({ ...projectForm, projectName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Launch Start Date</label>
                <input 
                  type="date"
                  value={projectForm.startDate}
                  onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Target Completion Date</label>
                <input 
                  type="date"
                  value={projectForm.endDate}
                  onChange={e => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Invoiced Fixed Price ($)</label>
                <input 
                  type="number"
                  placeholder="e.g. 18500"
                  value={projectForm.invoicedAmount}
                  onChange={e => setProjectForm({ ...projectForm, invoicedAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Services Delivered (Comma-separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. UI/UX Design, NextJS, Stripe Billing"
                  value={projectForm.servicesListed}
                  onChange={e => setProjectForm({ ...projectForm, servicesListed: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Operational Summary (Short Notes)</label>
                <textarea 
                  rows={2}
                  placeholder="Provide a quick review of core deliverables, tech stack, or client constraints..."
                  value={projectForm.shortNote}
                  onChange={e => setProjectForm({ ...projectForm, shortNote: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Staging Link</label>
                <input 
                  type="url"
                  placeholder="https://staging.conextsol.dev"
                  value={projectForm.stagingUrl}
                  onChange={e => setProjectForm({ ...projectForm, stagingUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">GitHub Repository Link</label>
                <input 
                  type="url"
                  placeholder="https://github.com/conextsol-agency/repo"
                  value={projectForm.githubUrl}
                  onChange={e => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Associated Managing Emails (Comma-separated access list)</label>
                <input 
                  type="text"
                  placeholder="e.g. team@conextsol.com, client.admin@acmecorp.com"
                  value={projectForm.associatedEmails}
                  onChange={e => setProjectForm({ ...projectForm, associatedEmails: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
                <p className="text-[10px] text-gray-500 mt-1">Users logged in with these emails will have secure visibility of this project under RLS constraints.</p>
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-purple-900/20">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-1 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white bg-[#0F081C] hover:bg-white/5 border border-purple-900/30 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Step 1</span>
              </button>
              <button
                type="submit"
                id="wizard-step2-next"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-sm font-extrabold bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] rounded-lg transition-colors cursor-pointer font-sans"
              >
                <span>Save Project & Add Specs</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: INITIAL DOCUMENTATION */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-5 animate-fadeIn">
            <div className="border-b border-purple-900/20 pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                  <span className="h-5 w-5 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center font-mono text-xs text-purple-300 font-bold">3</span>
                  <span>Attach Initial Documentation</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Linked to Project: <strong className="text-emerald-400">{projectForm.projectName}</strong>
                </p>
              </div>
              <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono px-2 py-0.5 rounded font-bold">
                PROJECT_ID INJECTED
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Document / Notes Title <span className="text-red-500">*</span></label>
                <input 
                  type="text"
                  value={docForm.title}
                  onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">Document Content (Supports Markdown styling) <span className="text-red-500">*</span></label>
                <textarea 
                  rows={6}
                  value={docForm.content}
                  onChange={e => setDocForm({ ...docForm, content: e.target.value })}
                  className="w-full px-4 py-3 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 mb-1.5">File Attachments / PDF URLs (Comma-separated paths)</label>
                <input 
                  type="text"
                  placeholder="e.g. /storage/acme_discovery.pdf, https://docs.conextsol.com/spec.png"
                  value={docForm.fileReferences}
                  onChange={e => setDocForm({ ...docForm, fileReferences: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 focus:bg-[#0F081C] transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-purple-900/20">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-1 px-4 py-2.5 text-xs font-semibold text-gray-400 hover:text-white bg-[#0F081C] hover:bg-white/5 border border-purple-900/30 rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back to Step 2</span>
              </button>
              <button
                type="submit"
                id="wizard-step3-submit"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-sm font-extrabold bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] rounded-lg transition-all shadow-md hover:shadow-emerald-500/10 cursor-pointer font-sans"
              >
                <Sparkles size={14} className="animate-pulse" />
                <span>Assemble & Dispatch Pipeline</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS SUMMARY */}
        {step === 4 && (
          <div className="text-center py-6 md:py-10 space-y-6 animate-fadeIn max-w-xl mx-auto">
            <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-white text-lg md:text-xl">
                Pipeline Constructed Successfully!
              </h3>
              <p className="text-xs text-gray-400">
                A single chained transaction generated and linked 3 entities in the backoffice.
              </p>
            </div>

            {/* Entity UUID map */}
            <div className="bg-[#0F081C] border border-purple-900/20 rounded-xl p-4 text-left font-mono text-[11px] text-gray-300 space-y-2.5">
              <div className="flex items-center justify-between border-b border-purple-900/10 pb-2">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-500" />
                  <span>1. Client Registered</span>
                </span>
                <span className="text-emerald-400 font-bold truncate max-w-[200px]" title={generatedIds.clientId}>
                  {generatedIds.clientId}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-purple-900/10 pb-2">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-purple-400" />
                  <span>2. Project Created</span>
                </span>
                <span className="text-emerald-400 font-bold truncate max-w-[200px]" title={generatedIds.projectId}>
                  {generatedIds.projectId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>3. Document Seeded</span>
                </span>
                <span className="text-emerald-400 font-bold truncate max-w-[200px]" title={generatedIds.docId}>
                  {generatedIds.docId}
                </span>
              </div>
            </div>

            {/* Postgres SQL Equivalent Simulator Log */}
            <div className="bg-[#0A0514] text-gray-300 rounded-xl p-4 text-left border border-purple-900/40 font-mono text-[10px] space-y-3 shadow-inner">
              <p className="text-emerald-400 font-semibold border-b border-purple-900/20 pb-1.5 flex items-center space-x-1.5">
                <Code size={12} />
                <span>Simulated Supabase SQL Transaction</span>
              </p>
              <div className="space-y-1.5 text-gray-400 max-h-40 overflow-y-auto pr-2">
                <p className="text-emerald-500/80">-- Step 1: Client record</p>
                <p>INSERT INTO <span className="text-purple-300">clients</span> (id, company_name, status) VALUES ('{generatedIds.clientId.substring(0,8)}...', '{clientForm.companyName}', 'active');</p>
                <p className="text-emerald-500/80 mt-2">-- Step 2: Project with implicit client_id</p>
                <p>INSERT INTO <span className="text-purple-300">projects</span> (id, client_id, name) VALUES ('{generatedIds.projectId.substring(0,8)}...', '<span className="text-emerald-400">{generatedIds.clientId.substring(0,8)}...</span>', '{projectForm.projectName}');</p>
                <p className="text-emerald-500/80 mt-2">-- Step 3: Document linked with project_id</p>
                <p>INSERT INTO <span className="text-purple-300">documents_and_notes</span> (id, project_id, title) VALUES ('{generatedIds.docId.substring(0,8)}...', '<span className="text-emerald-400">{generatedIds.projectId.substring(0,8)}...</span>', '{docForm.title}');</p>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-xs font-extrabold bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] rounded-lg transition-colors cursor-pointer"
              >
                Return to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
