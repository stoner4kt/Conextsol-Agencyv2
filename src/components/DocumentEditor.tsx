import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Edit3, 
  Save, 
  Lock, 
  Unlock, 
  ArrowLeft, 
  Link, 
  Clock, 
  Check, 
  ShieldAlert 
} from 'lucide-react';
import { AppState, DocumentAndNote, Project } from '../types';

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
      <div className="bg-[#1B122B] border border-purple-900/20 p-6 rounded-xl text-center space-y-4">
        <p className="text-sm text-gray-400 font-mono">Documentation entry not found.</p>
        <button onClick={onBack} className="text-xs text-emerald-400 hover:underline">Return</button>
      </div>
    );
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!state.isAdmin) return; // double check role restriction
    
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
          className="flex items-center space-x-1.5 text-xs font-semibold text-gray-400 hover:text-emerald-400 transition-colors cursor-pointer shrink-0"
        >
          <ArrowLeft size={14} />
          <span>Back to accounts detail</span>
        </button>

        {success && (
          <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs font-semibold flex items-center space-x-1 animate-fadeIn">
            <Check size={12} />
            <span>Postgres UPDATE committed successfully.</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Doc content panel */}
        <div className="lg:col-span-2 bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-6">
          <div className="border-b border-purple-900/20 pb-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <FileText size={18} className="text-purple-400" />
                <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-mono font-bold uppercase px-2 py-0.5 rounded">
                  System specifications
                </span>
              </div>
              <h2 className="text-lg md:text-xl font-display font-bold text-white mt-1">
                {isEditing ? 'Editing Documentation Model' : doc.title}
              </h2>
              {project && (
                <p className="text-xs text-gray-400 font-medium">
                  Associated Project: <strong className="text-white">{project.project_name}</strong>
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
                    className="flex items-center space-x-1 px-4 py-2 bg-[#1B122B] hover:bg-white/5 border border-purple-900/30 text-emerald-400 font-sans text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <Edit3 size={13} />
                    <span>Edit Document</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-2 text-xs font-semibold text-gray-400 hover:text-white bg-[#0F081C] hover:bg-white/5 border border-purple-900/30 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      id="doc-save-btn"
                      onClick={handleSave}
                      className="flex items-center space-x-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0F081C] font-sans text-xs font-extrabold rounded-lg transition-all cursor-pointer shadow-md shadow-emerald-500/10"
                    >
                      <Save size={13} />
                      <span>Save Changes</span>
                    </button>
                  </div>
                )
              ) : (
                <div className="flex items-center space-x-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-lg text-xs font-medium font-sans">
                  <Lock size={13} />
                  <span>Read Only Access</span>
                </div>
              )}
            </div>
          </div>

          {/* EDIT FORM VIEW */}
          {isEditing && state.isAdmin ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Document Title</label>
                  <input 
                    type="text"
                    value={editedTitle}
                    onChange={e => setEditedTitle(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Specifications Content (Supports Markdown & code segments)</label>
                  <textarea 
                    rows={12}
                    value={editedContent}
                    onChange={e => setEditedContent(e.target.value)}
                    className="w-full px-4 py-3 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Directives support standard typography headers (###), lists, code blocks, and blockquotes.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1.5">Files / Storage paths (Comma-separated)</label>
                  <input 
                    type="text"
                    value={editedFileRefs}
                    onChange={e => setEditedFileRefs(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#0F081C] border border-purple-900/40 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
            </form>
          ) : (
            /* READ-ONLY MARKDOWN COMPLIANT VIEWER */
            <div className="space-y-5 font-sans leading-relaxed text-gray-300">
              {/* Access control warning if user is Guest */}
              {!state.isAdmin && (
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-xs flex items-start space-x-2.5 font-sans">
                  <ShieldAlert size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <div className="space-y-1">
                    <p className="font-bold">Administrative Editing Only</p>
                    <p className="text-amber-400/80 leading-normal">
                      This documentation contains sensitive operational directives. According to database policy <code className="bg-[#0F081C] border border-amber-500/20 px-1 py-0.2 rounded font-mono text-amber-400">Admins have full access to documents</code>, editing privileges are locked for client emails.
                    </p>
                  </div>
                </div>
              )}

              {/* Parsed content mock styling */}
              <div className="prose prose-slate max-w-none text-sm space-y-4">
                {doc.content.split('\n\n').map((paragraph, pIdx) => {
                  if (paragraph.startsWith('###')) {
                    return (
                      <h3 key={pIdx} className="font-display font-bold text-white text-base md:text-lg border-b border-purple-900/20 pb-1 mt-6">
                        {paragraph.replace('###', '').trim()}
                      </h3>
                    );
                  }
                  if (paragraph.startsWith('####')) {
                    return (
                      <h4 key={pIdx} className="font-display font-semibold text-gray-200 text-sm mt-4">
                        {paragraph.replace('####', '').trim()}
                      </h4>
                    );
                  }
                  if (paragraph.startsWith('1.') || paragraph.startsWith('-')) {
                    return (
                      <ul key={pIdx} className="list-disc pl-5 space-y-1 bg-[#0F081C] p-4 rounded-xl border border-purple-900/20 text-xs">
                        {paragraph.split('\n').map((li, liIdx) => (
                          <li key={liIdx} className="font-sans">
                            {li.replace(/^\d+\.\s*/, '').replace(/^-\s*/, '').trim()}
                          </li>
                        ))}
                      </ul>
                    );
                  }
                  if (paragraph.includes('```')) {
                    const lines = paragraph.split('\n').filter(l => !l.includes('```'));
                    return (
                      <pre key={pIdx} className="bg-[#0A0514] text-emerald-400 p-4 rounded-xl font-mono text-xs overflow-x-auto border border-purple-900/40">
                        <code>{lines.join('\n')}</code>
                      </pre>
                    );
                  }
                  return (
                    <p key={pIdx} className="text-gray-300 whitespace-pre-line text-xs md:text-sm leading-relaxed">
                      {paragraph}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Info card: details & attachment file links */}
        <div className="space-y-6">
          
          {/* Metadata Card */}
          <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-white text-sm">
              Document Registry Data
            </h3>

            <div className="space-y-3 font-mono text-[11px] text-gray-400">
              <div className="flex justify-between py-1.5 border-b border-purple-900/20">
                <span>Database ID:</span>
                <span className="text-emerald-400 font-bold">{doc.id.substring(0,8)}...</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-purple-900/20">
                <span>Relational FK:</span>
                <span className="text-emerald-400 font-bold" title={doc.project_id}>
                  {doc.project_id.substring(0,8)}... (Project)
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
          <div className="bg-[#1B122B] rounded-xl border border-purple-900/20 p-6 shadow-lg space-y-4">
            <h3 className="font-display font-bold text-white text-sm">
              Secure Storage References
            </h3>

            <div className="space-y-2">
              {doc.file_references.map((f, idx) => (
                <div 
                  key={idx}
                  className="bg-[#0F081C] border border-purple-900/20 p-3 rounded-xl flex items-center justify-between text-xs"
                >
                  <span className="font-mono text-[10px] text-gray-300 truncate max-w-[170px]" title={f}>
                    {f}
                  </span>
                  <a 
                    href={f.startsWith('http') ? f : '#'} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-emerald-400 hover:text-emerald-300 p-1.5 hover:bg-white/5 rounded transition-colors"
                  >
                    <Link size={12} />
                  </a>
                </div>
              ))}

              {doc.file_references.length === 0 && (
                <p className="text-center py-4 text-xs text-gray-500 font-sans">
                  No binary files associated with this spec sheet.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
