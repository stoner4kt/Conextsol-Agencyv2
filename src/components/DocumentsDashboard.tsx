import React, { useState } from 'react';
import { 
  Search, 
  FileText, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  BookOpen, 
  Link, 
  ChevronRight, 
  ExternalLink
} from 'lucide-react';
import { DocumentAndNote, AppState } from '../types';

interface DocumentsDashboardProps {
  state: AppState;
  onSaveDocument: (doc: DocumentAndNote) => void;
  onDeleteDocument: (docId: string) => void;
  isAdmin: boolean;
}

export default function DocumentsDashboard({
  state,
  onSaveDocument,
  onDeleteDocument,
  isAdmin
}: DocumentsDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit/Create states
  const [docForm, setDocForm] = useState<Partial<DocumentAndNote>>({});
  const [fileRefs, setFileRefs] = useState<string>('');
  const [addError, setAddError] = useState('');

  // Helpers
  const getProjectName = (projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    return project ? project.project_name : 'General Spec';
  };

  const getClientNameByProject = (projectId: string) => {
    const project = state.projects.find(p => p.id === projectId);
    if (!project) return 'General Client';
    const client = state.clients.find(c => c.id === project.client_id);
    return client ? client.company_name : 'Unknown Client';
  };

  // Filters
  const filteredDocs = state.documents.filter(doc => {
    const matchesSearch = 
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProject = filterProject === 'all' || doc.project_id === filterProject;

    return matchesSearch && matchesProject;
  });

  const selectedDoc = state.documents.find(d => d.id === selectedDocId) || filteredDocs[0];

  const handleStartCreate = () => {
    if (!isAdmin) return;
    setDocForm({
      project_id: state.projects[0]?.id || '',
      title: '',
      content: '### System Architecture Specification\n\n- **Primary Objective:** \n- **Core Components:** \n- **Staging / API Keys:** \n\n#### Operational Checklists:\n- [ ] Database Schema Verification\n- [ ] Security Headers Audit',
      file_references: []
    });
    setFileRefs('');
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleStartEdit = (doc: DocumentAndNote) => {
    if (!isAdmin) return;
    setDocForm(doc);
    setFileRefs(doc.file_references.join(', '));
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleSaveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    if (!docForm.title || !docForm.content) {
      setAddError('Title and Markdown content are required.');
      return;
    }

    const refs = fileRefs
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const updated: DocumentAndNote = {
      id: docForm.id || crypto.randomUUID(),
      project_id: docForm.project_id || '',
      title: docForm.title,
      content: docForm.content,
      file_references: refs,
      created_at: docForm.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    onSaveDocument(updated);
    setIsAdding(false);
    setIsEditing(false);
    setSelectedDocId(updated.id);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* 1. LEFT SIDEBAR: Document List & Filters (5 cols on wide screens) */}
      <div className="lg:col-span-5 space-y-4">
        {/* Statistics Header */}
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4 flex items-center justify-between shadow-lg">
          <div className="space-y-0.5">
            <span className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wider">Document Vault</span>
            <h4 className="text-xl font-display font-black text-white">{state.documents.length} Specs</h4>
          </div>
          {isAdmin && !isAdding && !isEditing && (
            <button
              onClick={handleStartCreate}
              className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer font-sans"
            >
              <Plus size={13} />
              <span>Create Spec</span>
            </button>
          )}
        </div>

        {/* Search & Project Filter */}
        <div className="bg-[#0b0f19] border border-[#1a2234] p-4 rounded-xl shadow-lg space-y-3 font-mono">
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Search specs by content..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterProject}
            onChange={e => setFilterProject(e.target.value)}
            className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs font-semibold text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Projects & Targets</option>
            {state.projects.map(p => (
              <option key={p.id} value={p.id}>{p.project_name}</option>
            ))}
          </select>
        </div>

        {/* Document Cards List */}
        <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
          {filteredDocs.map((doc) => {
            const isSelected = selectedDoc && selectedDoc.id === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => {
                  setSelectedDocId(doc.id);
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className={`
                  p-4 rounded-xl border transition-all cursor-pointer text-left space-y-2
                  ${isSelected
                    ? 'bg-[#121826] border-cyan-500/50 shadow-inner'
                    : 'bg-[#0b0f19] border-[#1a2234] hover:border-slate-700'
                  }
                `}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-mono font-bold text-cyan-400 uppercase tracking-widest">
                    {getClientNameByProject(doc.project_id)}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">
                    {new Date(doc.updated_at || doc.created_at).toLocaleDateString()}
                  </span>
                </div>

                <h4 className="font-display font-bold text-white text-xs md:text-sm line-clamp-1">
                  {doc.title}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-sans">
                  {doc.content.replace(/[#*`]/g, '').slice(0, 100)}...
                </p>

                <div className="flex items-center justify-between pt-1 border-t border-[#1a2234] text-[9px] text-slate-500 font-mono">
                  <span className="truncate max-w-[150px]">{getProjectName(doc.project_id)}</span>
                  {doc.file_references.length > 0 && (
                    <span className="bg-[#06080d] border border-[#1a2234] text-slate-400 px-1.5 py-0.2 rounded font-mono">
                      {doc.file_references.length} refs
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredDocs.length === 0 && (
            <div className="text-center py-12 bg-[#0b0f19] rounded-xl border border-[#1a2234] space-y-2 font-mono">
              <FileText size={20} className="text-slate-500 mx-auto" />
              <p className="text-xs text-slate-400">No specs match your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT PANEL: Reader / Editor Form (7 cols on wide screens) */}
      <div className="lg:col-span-7">
        
        {/* A. Create or Edit Mode */}
        {isAdding || isEditing ? (
          <form onSubmit={handleSaveSubmit} className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-5 md:p-6 shadow-xl space-y-4 animate-fadeIn font-mono">
            <div className="flex items-center justify-between border-b border-[#1a2234] pb-3">
              <div>
                <h3 className="font-display font-bold text-white text-sm">
                  {isAdding ? 'Compose New Tech Spec' : 'Modify Specifications Record'}
                </h3>
                <p className="text-[10px] text-slate-400">Markdown syntax supported natively.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="p-1.5 hover:bg-[#121826] rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {addError && (
              <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 p-2 rounded">{addError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Target Project *</label>
                <select
                  required
                  value={docForm.project_id || ''}
                  onChange={e => setDocForm({ ...docForm, project_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Project --</option>
                  {state.projects.map(p => (
                    <option key={p.id} value={p.id}>{p.project_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Document Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Acme API Staging Specification"
                  required
                  value={docForm.title || ''}
                  onChange={e => setDocForm({ ...docForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">External File / API Links (Comma-separated)</label>
              <input
                type="text"
                placeholder="/storage/credentials.pdf, https://stripe.com/docs"
                value={fileRefs}
                onChange={e => setFileRefs(e.target.value)}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-slate-400 mb-1">Specifications Content (Markdown) *</label>
              <textarea
                placeholder="Markdown formatted specifications, checklists, code blocks..."
                rows={12}
                required
                value={docForm.content || ''}
                onChange={e => setDocForm({ ...docForm, content: e.target.value })}
                className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setIsEditing(false);
                }}
                className="px-4 py-2 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-400 text-xs font-bold rounded-lg cursor-pointer"
              >
                Discard
              </button>
              <button
                type="submit"
                className="flex items-center space-x-1 px-5 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-sans text-xs font-extrabold rounded-lg shadow-md cursor-pointer"
              >
                <Save size={13} />
                <span>Save Specification</span>
              </button>
            </div>
          </form>
        ) : (
          /* B. Reader / Viewer Mode */
          selectedDoc ? (
            <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-5 md:p-6 shadow-xl space-y-5 text-left animate-fadeIn">
              {/* Header */}
              <div className="border-b border-[#1a2234] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2 flex-wrap font-mono">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      {getClientNameByProject(selectedDoc.project_id)}
                    </span>
                    <ChevronRight size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-400 font-semibold truncate max-w-[150px]">
                      {getProjectName(selectedDoc.project_id)}
                    </span>
                  </div>
                  <h3 className="font-display font-black text-white text-base md:text-lg">
                    {selectedDoc.title}
                  </h3>
                </div>

                <div className="flex items-center space-x-2 sm:self-center">
                  {isAdmin && (
                    <button
                      onClick={() => handleStartEdit(selectedDoc)}
                      className="p-1.5 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="Edit specifications"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                  {isAdmin && (
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete specification "${selectedDoc.title}"?`)) {
                          onDeleteDocument(selectedDoc.id);
                          setSelectedDocId(null);
                        }
                      }}
                      className="p-1.5 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-500 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Delete specification"
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              </div>

              {/* Rendered Markdown Viewer */}
              <div className="max-h-[500px] overflow-y-auto pr-1">
                <div className="bg-[#06080d] p-4 rounded-xl border border-[#1a2234] font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {selectedDoc.content}
                </div>
              </div>

              {/* File references / Attachments links */}
              {selectedDoc.file_references.length > 0 && (
                <div className="pt-4 border-t border-[#1a2234] space-y-2">
                  <span className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Documentation Artifact Links</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {selectedDoc.file_references.map((ref, idx) => {
                      const isWeb = ref.startsWith('http');
                      return (
                        <a
                          key={idx}
                          href={isWeb ? ref : '#'}
                          target={isWeb ? "_blank" : undefined}
                          rel={isWeb ? "noreferrer" : undefined}
                          className="flex items-center space-x-1 px-2.5 py-1 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-300 rounded-lg text-xs transition-colors font-mono font-bold cursor-pointer"
                        >
                          <Link size={10} className="text-cyan-400" />
                          <span className="truncate max-w-[200px]">{ref.split('/').pop()}</span>
                          {isWeb && <ExternalLink size={10} className="text-slate-500 ml-1 shrink-0" />}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-12 text-center shadow-lg space-y-3 font-mono">
              <BookOpen size={30} className="text-slate-600 mx-auto animate-pulse" />
              <h4 className="font-display font-bold text-white text-sm">No Document Selected</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Pick a spec from the left directory to view full system configurations and Markdown guidelines.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
}
