import React, { useState } from 'react';
import { X, Star, Send, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Project, Client } from '../types';
import { supabaseService } from '../supabaseService';

interface Props { project: Project; client: Client; onClose: () => void; onSent: (projectId: string) => void; }

export default function SendReviewEmailModal({ project, client, onClose, onSent }: Props) {
  const [recipientEmail, setRecipientEmail] = useState(client.email);
  const [recipientName, setRecipientName] = useState(client.primary_contact_name);
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const handleSend = async () => {
    if (!recipientEmail.trim()) return;
    setLoading(true); setResult(null);
    const resp = await supabaseService.sendReviewEmail({ project_id: project.id, client_id: client.id, recipient_email: recipientEmail.trim(), recipient_name: recipientName.trim() || undefined, custom_message: customMessage.trim() || undefined });
    setLoading(false);
    if (resp.success) { setResult({ success: true, message: 'Review request sent successfully!' }); onSent(project.id); }
    else setResult({ success: false, message: resp.error || 'Failed to send email.' });
  };
  const labels: Record<string,string> = { in_progress:'In Progress', completed:'Completed', review_requested:'Review Requested', review_received:'Review Received' };
  const colors: Record<string,string> = { in_progress:'text-slate-400', completed:'text-emerald-400', review_requested:'text-amber-400', review_received:'text-cyan-400' };
  const status = project.completion_status || 'in_progress';
  const sender = client.review_from_email || 'noreply@conextsol.co.za (agency default)';
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
    <div className="w-full max-w-lg bg-[#0d1629] border border-[#1a2234] rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between p-6 border-b border-[#1a2234]">
        <div className="flex items-center gap-3"><div className="p-2 bg-amber-500/10 rounded-lg"><Star className="w-5 h-5 text-amber-400"/></div><div><h2 className="text-sm font-semibold text-slate-100 font-mono">Send Review Request</h2><p className="text-xs text-slate-500 font-mono mt-0.5">{project.project_name}</p></div></div>
        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-[#1a2234] rounded-lg"><X className="w-4 h-4"/></button>
      </div>
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-2"><div className="p-3 bg-[#0b0f19] border border-[#1a2234] rounded-lg"><p className="text-[10px] font-mono text-slate-600">Project status</p><p className={'text-xs font-mono font-medium ' + colors[status]}>{labels[status]}</p></div><div className="p-3 bg-[#0b0f19] border border-[#1a2234] rounded-lg"><p className="text-[10px] font-mono text-slate-600">Sending from</p><p className="text-xs font-mono text-slate-300 truncate">{sender}</p></div></div>
        {!client.google_review_url && <div className="flex items-start gap-2 p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg"><AlertCircle className="w-4 h-4 text-amber-400"/><p className="text-xs text-amber-400 font-mono">No Google Review URL set for this client. The email will link to a Google search. Set it in Client Review Settings for best results.</p></div>}
        <label className="block text-xs font-mono text-slate-400">Recipient Email *<input type="email" value={recipientEmail} onChange={e=>setRecipientEmail(e.target.value)} className="mt-1.5 w-full bg-[#0b0f19] border border-[#1a2234] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono" placeholder="client@example.com"/></label>
        <label className="block text-xs font-mono text-slate-400">Recipient Name<input type="text" value={recipientName} onChange={e=>setRecipientName(e.target.value)} className="mt-1.5 w-full bg-[#0b0f19] border border-[#1a2234] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono" placeholder="Jane Smith"/></label>
        <label className="block text-xs font-mono text-slate-400">Personal Note <span className="text-slate-600">(optional)</span><textarea value={customMessage} onChange={e=>setCustomMessage(e.target.value)} rows={3} className="mt-1.5 w-full bg-[#0b0f19] border border-[#1a2234] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono resize-none" placeholder="Add a personal note that will appear in the email…"/></label>
        {result && <div className={'flex items-center gap-2 p-3 rounded-lg border ' + (result.success ? 'bg-emerald-950/30 border-emerald-800/40 text-emerald-400' : 'bg-rose-950/30 border-rose-800/40 text-rose-400')}>{result.success?<CheckCircle className="w-4 h-4"/>:<AlertCircle className="w-4 h-4"/>}<p className="text-xs font-mono">{result.message}</p></div>}
      </div>
      <div className="flex items-center justify-end gap-3 p-6 border-t border-[#1a2234]"><button onClick={onClose} disabled={loading} className="px-4 py-2 text-xs font-mono text-slate-400 border border-[#1a2234] rounded-lg">{result?.success?'Close':'Cancel'}</button>{!result?.success&&<button onClick={handleSend} disabled={loading||!recipientEmail.trim()} className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-cyan-600 text-white rounded-lg disabled:opacity-50">{loading?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Sending…</>:<><Send className="w-3.5 h-3.5"/>Send Review Request</>}</button>}</div>
    </div>
  </div>;
}
