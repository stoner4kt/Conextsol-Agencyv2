import React, { useState } from 'react';
import { 
  User, 
  Briefcase, 
  FileText, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
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
    return crypto.randomUUID();
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

    const newProjectId = generateUUID();
    setGeneratedIds(prev => ({ ...prev, projectId: newProjectId }));
    
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

    const newDocId = generateUUID();
    const finalIds = { ...generatedIds, docId: newDocId };
    setGeneratedIds(finalIds);

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
    <div className="bg-[#0b0f19] rounded-2xl shadow-2xl border border-[#1a2234] overflow-hidden">
      {/* Wizard Header Bar */}
      <div className="bg-[#06080d] p-6 md:p-8 text-white border-b border-[#1a2234]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] bg-cyan-950 text-cyan-300 font-mono font-bold tracking-wider px-2 py-0.5 rounded uppercase border border-cyan-800">
              Chained Pipeline
            </span>
            <h2 className="text-xl md:text-2xl font-display font-extrabold mt-1 text-white">
              Client Onboarding Wizard
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">
              Creates Client profile, Project registry, and initial Specs in a single pipeline.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0 font-mono">
            {step < 4 ? (
              <button 
                id="wizard-cancel-btn"
                onClick={onCancel}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white bg-[#0b0f19] hover:bg-[#121826] rounded-lg transition-colors border border-[#1a2234] cursor-pointer"
              >
                Cancel
              </button>
            ) : (
              <button
                id="wizard-reset-btn"
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg transition-colors cursor-pointer font-sans"
              >
                <RefreshCw size={13} />
                <span>Onboard Another</span>
              </button>
            )}
          </div>
        </div>

        {/* Chained Steps visual tracker */}
        <div className="relative flex justify-between items-center max-w-xl mx-auto mt-8 px-4 font-mono">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[#1a2234] -translate-y-1/2 z-0" />
          <div 
            className="absolute top-1/2 left-0 h-0.5 bg-cyan-400 -translate-y-1/2 z-0 transition-all duration-300"
            style={{ width: `${((step - 1) / 3) * 100}%` }}
          />

          {[
            { nr: 1, label: 'Client Profile', icon: User },
            { nr: 2, label: 'Project Registry', icon: Briefcase },
            { nr: 3, label: 'Tech Specs', icon: FileText },
            { nr: 4, label: 'Deployed', icon: CheckCircle2 }
          ].map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.nr;
            const isCurrent = step === s.nr;
            return (
              <div key={s.nr} className="flex flex-col items-center relative z-10">
                <div className={`
                  h-9 w-9 rounded-full flex items-center justify-center font-display font-bold text-xs transition-all duration-200 border
                  ${isCompleted ? 'bg-cyan-400 text-slate-950 border-cyan-400 font-extrabold' : ''}
                  ${isCurrent ? 'bg-[#0b0f19] text-cyan-400 border-cyan-500 ring-4 ring-cyan-500/20 font-bold' : ''}
                  ${!isCompleted && !isCurrent ? 'bg-[#06080d] text-slate-600 border-[#1a2234]' : ''}
                `}>
                  {isCompleted ? <CheckCircle2 size={16} /> : <Icon size={14} />}
                </div>
                <span className={`text-[10px] mt-1.5 font-medium whitespace-nowrap hidden sm:inline ${isCurrent ? 'text-white font-bold' : 'text-slate-500'}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Wizard Form Area */}
      <div className="p-6 md:p-8 font-mono">
        {formErrors && (
          <div className="mb-6 p-4 bg-rose-950/60 border border-rose-800/80 rounded-xl flex items-start space-x-2 text-xs text-rose-300">
            <span className="font-bold">⚠️ Error:</span>
            <span>{formErrors}</span>
          </div>
        )}

        {/* STEP 1: CLIENT DETAILS */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="space-y-5 animate-fadeIn">
            <div className="border-b border-[#1a2234] pb-3">
              <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                <span className="h-5 w-5 rounded bg-[#06080d] border border-[#1a2234] flex items-center justify-center font-mono text-xs text-cyan-400 font-bold">1</span>
                <span>Enter Client Profile</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">Institutional metadata for billing & contact management.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Company Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Acme Solutions"
                  value={clientForm.companyName}
                  onChange={e => setClientForm({ ...clientForm, companyName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Primary Contact Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={clientForm.contactName}
                  onChange={e => setClientForm({ ...clientForm, contactName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Email Address *</label>
                <input 
                  type="email"
                  placeholder="e.g. contact@acme.com"
                  value={clientForm.email}
                  onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Phone Number</label>
                <input 
                  type="tel"
                  placeholder="e.g. +27 82 123 4567"
                  value={clientForm.phone}
                  onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Client Status</label>
                <select 
                  value={clientForm.status}
                  onChange={e => setClientForm({ ...clientForm, status: e.target.value as any })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors cursor-pointer"
                >
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-[#1a2234]">
              <button
                type="submit"
                id="wizard-step1-next"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg transition-colors cursor-pointer font-sans"
              >
                <span>Save Profile & Proceed to Project</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 2: LINKED PROJECT */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-5 animate-fadeIn">
            <div className="border-b border-[#1a2234] pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                  <span className="h-5 w-5 rounded bg-[#06080d] border border-[#1a2234] flex items-center justify-center font-mono text-xs text-cyan-400 font-bold">2</span>
                  <span>Set Up Project Registry</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Auto-bound to Client: <strong className="text-white">{clientForm.companyName}</strong> ({generatedIds.clientId.substring(0,8)}...)
                </p>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono px-2 py-0.5 rounded font-bold">
                CLIENT_ID BOUND
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Project Name *</label>
                <input 
                  type="text"
                  placeholder="e.g. B2B Headless Commerce Platform"
                  value={projectForm.projectName}
                  onChange={e => setProjectForm({ ...projectForm, projectName: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Launch Start Date</label>
                <input 
                  type="date"
                  value={projectForm.startDate}
                  onChange={e => setProjectForm({ ...projectForm, startDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Target End Date</label>
                <input 
                  type="date"
                  value={projectForm.endDate}
                  onChange={e => setProjectForm({ ...projectForm, endDate: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Invoiced Price (R)</label>
                <input 
                  type="number"
                  placeholder="e.g. 25000"
                  value={projectForm.invoicedAmount}
                  onChange={e => setProjectForm({ ...projectForm, invoicedAmount: Number(e.target.value) })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Services Delivered (Comma-separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. UI/UX Design, React, Supabase"
                  value={projectForm.servicesListed}
                  onChange={e => setProjectForm({ ...projectForm, servicesListed: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Operational Summary</label>
                <textarea 
                  rows={2}
                  placeholder="Quick summary of scope and core deliverables..."
                  value={projectForm.shortNote}
                  onChange={e => setProjectForm({ ...projectForm, shortNote: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors resize-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Staging Link</label>
                <input 
                  type="url"
                  placeholder="https://staging.conextsol.dev"
                  value={projectForm.stagingUrl}
                  onChange={e => setProjectForm({ ...projectForm, stagingUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">GitHub Repository Link</label>
                <input 
                  type="url"
                  placeholder="https://github.com/conextsol/repo"
                  value={projectForm.githubUrl}
                  onChange={e => setProjectForm({ ...projectForm, githubUrl: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Associated Managing Emails</label>
                <input 
                  type="text"
                  placeholder="e.g. team@conextsol.com, client.admin@acme.com"
                  value={projectForm.associatedEmails}
                  onChange={e => setProjectForm({ ...projectForm, associatedEmails: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#1a2234]">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex items-center space-x-1 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                id="wizard-step2-next"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg transition-colors cursor-pointer font-sans"
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
            <div className="border-b border-[#1a2234] pb-3 flex justify-between items-center">
              <div>
                <h3 className="font-display font-bold text-white flex items-center space-x-1.5">
                  <span className="h-5 w-5 rounded bg-[#06080d] border border-[#1a2234] flex items-center justify-center font-mono text-xs text-cyan-400 font-bold">3</span>
                  <span>Attach Tech Specifications</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5 font-sans">
                  Bound to Project: <strong className="text-white">{projectForm.projectName}</strong>
                </p>
              </div>
              <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800 font-mono px-2 py-0.5 rounded font-bold">
                PROJECT_ID BOUND
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Document Title *</label>
                <input 
                  type="text"
                  value={docForm.title}
                  onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Specifications Content (Markdown) *</label>
                <textarea 
                  rows={6}
                  value={docForm.content}
                  onChange={e => setDocForm({ ...docForm, content: e.target.value })}
                  className="w-full px-4 py-3 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">File Links / Artifact URLs (Comma-separated)</label>
                <input 
                  type="text"
                  placeholder="e.g. /storage/discovery.pdf, https://figma.com/file/..."
                  value={docForm.fileReferences}
                  onChange={e => setDocForm({ ...docForm, fileReferences: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-between pt-4 border-t border-[#1a2234]">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex items-center space-x-1 px-4 py-2.5 text-xs font-semibold text-slate-400 hover:text-white bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] rounded-lg transition-colors cursor-pointer"
              >
                <ArrowLeft size={14} />
                <span>Back</span>
              </button>
              <button
                type="submit"
                id="wizard-step3-submit"
                className="flex items-center space-x-1.5 px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 rounded-lg transition-all shadow-md cursor-pointer font-sans"
              >
                <Sparkles size={14} />
                <span>Deploy Onboarding Pipeline</span>
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: SUCCESS SUMMARY */}
        {step === 4 && (
          <div className="text-center py-6 md:py-10 space-y-6 animate-fadeIn max-w-xl mx-auto">
            <div className="h-16 w-16 bg-emerald-950 border border-emerald-800 rounded-full flex items-center justify-center text-emerald-400 mx-auto shadow-md">
              <CheckCircle2 size={32} />
            </div>

            <div className="space-y-1">
              <h3 className="font-display font-extrabold text-white text-lg md:text-xl">
                Onboarding Complete!
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Successfully generated and linked Client, Project, and Tech Spec records.
              </p>
            </div>

            {/* Entity UUID map */}
            <div className="bg-[#06080d] border border-[#1a2234] rounded-xl p-4 text-left font-mono text-[11px] text-slate-300 space-y-2.5">
              <div className="flex items-center justify-between border-b border-[#1a2234] pb-2">
                <span className="font-semibold text-slate-400 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-cyan-400" />
                  <span>1. Client Profile</span>
                </span>
                <span className="text-white font-bold truncate max-w-[200px]" title={generatedIds.clientId}>
                  {generatedIds.clientId}
                </span>
              </div>
              <div className="flex items-center justify-between border-b border-[#1a2234] pb-2">
                <span className="font-semibold text-slate-400 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  <span>2. Project Registry</span>
                </span>
                <span className="text-white font-bold truncate max-w-[200px]" title={generatedIds.projectId}>
                  {generatedIds.projectId}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-400 flex items-center space-x-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span>3. Tech Spec Sheet</span>
                </span>
                <span className="text-white font-bold truncate max-w-[200px]" title={generatedIds.docId}>
                  {generatedIds.docId}
                </span>
              </div>
            </div>

            {/* Postgres SQL Log */}
            <div className="bg-[#06080d] text-slate-300 rounded-xl p-4 text-left border border-[#1a2234] font-mono text-[10px] space-y-3 shadow-inner">
              <p className="text-slate-400 font-semibold border-b border-[#1a2234] pb-1.5 flex items-center space-x-1.5">
                <Code size={12} className="text-cyan-400" />
                <span>Database Insert Executed</span>
              </p>
              <div className="space-y-1.5 text-slate-400 max-h-40 overflow-y-auto pr-2">
                <p className="text-slate-500">-- Step 1: Client record</p>
                <p>INSERT INTO <span className="text-cyan-400">clients</span> (id, company_name) VALUES ('{generatedIds.clientId.substring(0,8)}...', '{clientForm.companyName}');</p>
                <p className="text-slate-500 mt-2">-- Step 2: Project with client_id</p>
                <p>INSERT INTO <span className="text-blue-400">projects</span> (id, client_id) VALUES ('{generatedIds.projectId.substring(0,8)}...', '{generatedIds.clientId.substring(0,8)}...');</p>
                <p className="text-slate-500 mt-2">-- Step 3: Tech spec with project_id</p>
                <p>INSERT INTO <span className="text-emerald-400">documents_and_notes</span> (id, project_id) VALUES ('{generatedIds.docId.substring(0,8)}...', '{generatedIds.projectId.substring(0,8)}...');</p>
              </div>
            </div>

            <div className="flex justify-center space-x-3">
              <button
                type="button"
                onClick={onCancel}
                className="px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 rounded-lg transition-colors cursor-pointer font-sans"
              >
                Return to Command Deck
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
