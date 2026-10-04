import React, { useState } from 'react';
import { Star, Send, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { AppState, Project } from '../types';
import SendReviewEmailModal from './SendReviewEmailModal';

interface Props {
  state: AppState;
  isAdmin: boolean;
  onProjectStatusChange: (projectId: string, newStatus: string) => void;
  onReviewSent: (projectId: string) => void;
}

export default function ReviewAutomationDashboard({ state, isAdmin, onProjectStatusChange, onReviewSent }: Props) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const projects = state.projects;
  const requests = state.reviewRequests || [];
  const requested = projects.filter(p => p.completion_status === 'review_requested').length;
  const received = projects.filter(p => p.completion_status === 'review_received').length;

  const clientFor = (project: Project) => state.clients.find(c => c.id === project.client_id);

  const handleSent = (projectId: string) => {
    onProjectStatusChange(projectId, 'review_requested');
    onReviewSent(projectId);
    setSelectedProject(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">Review Automation</p>
          <h2 className="text-2xl font-display font-extrabold text-white mt-1">Client Review Console</h2>
          <p className="text-xs text-slate-400 mt-1">Send review requests, monitor request history, and track project review status.</p>
        </div>
        <span className="text-[10px] font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-2 py-1 rounded-lg">AUTOMATION ONLINE</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-5">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Requests Sent</p>
          <p className="text-2xl font-display font-extrabold text-white mt-1">{requests.length}</p>
        </div>
        <div className="bg-[#0b0f19] border border-amber-900/50 rounded-xl p-5">
          <p className="text-[10px] font-mono text-amber-400 uppercase">Awaiting Review</p>
          <p className="text-2xl font-display font-extrabold text-amber-300 mt-1">{requested}</p>
        </div>
        <div className="bg-[#0b0f19] border border-cyan-900/50 rounded-xl p-5">
          <p className="text-[10px] font-mono text-cyan-400 uppercase">Reviews Received</p>
          <p className="text-2xl font-display font-extrabold text-cyan-300 mt-1">{received}</p>
        </div>
      </div>

      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1a2234]">
          <h3 className="text-sm font-display font-bold text-white flex items-center gap-2"><Star size={15} className="text-amber-400" /> Project Review Actions</h3>
        </div>
        <div className="divide-y divide-[#1a2234]">
          {projects.map(project => {
            const client = clientFor(project);
            if (!client) return null;
            const status = project.completion_status || 'in_progress';
            return (
              <div key={project.id} className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{project.project_name}</p>
                  <p className="text-xs text-slate-500 font-mono mt-1">{client.company_name} · {client.email}</p>
                  <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-mono text-slate-400">
                    {status === 'review_received' ? <CheckCircle size={11} className="text-cyan-400" /> : <Clock size={11} className="text-amber-400" />}
                    {status.replace('_', ' ')}
                  </span>
                </div>
                {isAdmin && (
                  <button onClick={() => setSelectedProject(project)} className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-800/40 rounded-lg text-xs font-mono shrink-0">
                    <Send size={13} /> Send Review Request
                  </button>
                )}
              </div>
            );
          })}
          {projects.length === 0 && <div className="p-8 text-center text-xs text-slate-500 font-mono">No projects are available for review automation.</div>}
        </div>
      </div>

      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1a2234]">
          <h3 className="text-sm font-display font-bold text-white">Review Request History</h3>
        </div>
        {requests.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-mono">No review requests have been recorded yet.</div>
        ) : (
          <div className="divide-y divide-[#1a2234]">
            {requests.map(request => (
              <div key={request.id} className="p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-200 font-mono">{request.recipient_email}</p>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">{new Date(request.sent_at).toLocaleString()}</p>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1"><CheckCircle size={11} /> {request.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedProject && clientFor(selectedProject) && (
        <SendReviewEmailModal
          project={selectedProject}
          client={clientFor(selectedProject)!}
          onClose={() => setSelectedProject(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}
