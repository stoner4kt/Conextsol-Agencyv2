import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Edit3, 
  Save, 
  Lock, 
  ArrowLeft, 
  Link, 
  Clock, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { AppState } from '../types';

interface DocumentEditorProps {
  documentId: string;
  state: AppState;
  onBack: () => void;
  onSaveDocument: (id: string, title: string, content: string, fileRefs: string[]) => void;
}

export default function DocumentEditor({
  documentId,
  state,
  onBack,
  onSaveDocument
}: DocumentEditorProps) {
  const doc = state.documents.find(d => d.id === documentId);
  const project = doc ? state.projects.find(p => p.id === doc.project_id) : null;

  // Edit local state variables
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [editedFileRefs, setEditedFileRefs] = useState('');
  const [success, setSuccess] = useState(false);

  // Sync state if document selection shifts
  useEffect(() => {
    if (doc) {
      setEditedTitle(doc.title);
      setEditedContent(doc.content);
      setEditedFileRefs(doc.file_references.join(', '));
      setIsEditing(false);
      setSuccess(false);
    }
  }, [doc]);

  if (!doc) {
    return (
      <div className="bg-[#0b0f19] border border-[#1a2234] p-6 rounded-xl text-center space-y-4">
        <p className="text-sm text-slate-400 font-mono">Documentation entry not found.</p>
        <button onClick={onBack} className="text-xs text-cyan-400 hover:underline font-mono">Return to Vault</button>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.isAdmin) return;
    
    const parsedRefs = editedFileRefs
      ? editedFileRefs.split(',').map(r => r.trim()).filter(Boolean)
      : [];

    onSaveDocument(doc.id, editedTitle, editedContent, parsedRefs);
    setIsEditing(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Navigation and state bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          id="doc-editor-back"
          onClick={onBack}
          className="flex items-center space-x-1.5 text-xs font-mono font-bold text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft size={14} />
          <span>Return to Specification Vault</span>
        </button>

        {success && (
          <div className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-lg text-xs font-mono font-bold flex items-center space-x-1.5 animate-fadeIn">
            <Check size={12} />
            <span>Specification updated in database.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Doc content panel */}
        <div className="lg:col-span-2 bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-xl space-y-6">
          <div className="border-b border-[#1a2234] pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileText size={18} className="text-cyan-400" />
                <span className="text-[10px] bg-[#06080d] border border-[#1a2234] text-cyan-300 font-mono font-bold uppercase px-2 py-0.5 rounded">
                  Tech Spec Sheet
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-display font-extrabold text-white mt-1">
                {isEditing ? 'Editing Tech Spec' : doc.title}
              </h2>
              {project && (
                <p className="text-xs text-slate-400 font-mono">
                  Target Project: <strong className="text-slate-200">{project.project_name}</strong>
                </p>
              )}
            </div>

            {/* Access control button */}
            <div className="shrink-0">
              {state.isAdmin ? (
                !isEditing ? (
                  <button
                    id="doc-edit-toggle-btn"
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-1 px-4 py-2 bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] text-slate-200 font-mono text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} className="text-cyan-400" />
                    <span>Edit Spec</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2 font-mono">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-[#06080d] hover:bg-[#121826] border border-[#1a2234] rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="doc-save-btn"
                      onClick={handleSave}
                      className="flex items-center space-x-1 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 font-sans text-xs font-extrabold rounded-lg transition-all cursor-pointer shadow-md"
                    >
                      <Save size={13} />
                      <span>Save Spec</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center space-x-1.5 bg-[#06080d] text-slate-400 border border-[#1a2234] px-3 py-1.5 rounded-lg text-xs font-mono">
                  <Lock size={13} />
                  <span>Read Only</span>
                </div>
              )}
            </div>
          </div>

          {/* EDIT FORM VIEW */}
          {isEditing && state.isAdmin ? (
            <form onSubmit={handleSave} className="space-y-4 font-mono">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Document Title</label>
                  <input 
                    type="text"
                    value={editedTitle}
                    onChange={e => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">Specifications Content (Markdown syntax)</label>
                  <textarea 
                    rows={12}
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    className="w-full px-4 py-3 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1.5">File Reference Links (Comma-separated)</label>
                  <input 
                    type="text"
                    value={editedFileRefs}
                    onChange={e => setEditedFileRefs(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* READ-ONLY MARKDOWN VIEW */
            <div className="space-y-5 font-sans leading-relaxed text-slate-300">
              {!state.isAdmin && (
                <div className="p-4 bg-[#06080d] border border-[#1a2234] rounded-xl text-slate-300 text-xs flex items-start space-x-2.5 font-mono">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-white">Administrative View Only</p>
                    <p className="text-slate-400 leading-normal">
                      Spec editing privileges require administrator authorization.
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-[#06080d] p-5 rounded-xl border border-[#1a2234] font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                {doc.content}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info card */}
        <div className="space-y-6">
          {/* Metadata Card */}
          <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-white text-sm">
              Specification Metadata
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-slate-400">
              <div className="flex justify-between py-1.5 border-b border-[#1a2234]">
                <span>Record ID:</span>
                <span className="text-white font-bold">{doc.id.substring(0,8)}...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#1a2234]">
                <span>Target Project:</span>
                <span className="text-cyan-400 font-bold" title={doc.project_id}>
                  {doc.project_id.substring(0,8)}...
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="flex items-center space-x-1">
                  <Clock size={11} />
                  <span>Modified:</span>
                </span>
                <span>{new Date(doc.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Attachments Card */}
          <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-white text-sm">
              Artifact References
            </h3>

            <div className="space-y-2">
              {doc.file_references.map((f, idx) => (
                <div 
                  key={idx}
                  className="bg-[#06080d] border border-[#1a2234] p-3 rounded-xl flex items-center justify-between text-xs font-mono"
                >
                  <span className="text-[10px] text-slate-300 truncate max-w-[170px]" title={f}>
                    {f}
                  </span>
                  <a 
                    href={f.startsWith('http') ? f : '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 p-1.5 hover:bg-[#121826] rounded transition-colors"
                  >
                    <Link size={12} />
                  </a>
                </div>
              ))}

              {doc.file_references.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-500 font-mono">
                  No binary links attached to this spec.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
