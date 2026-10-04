import React, { useMemo, useState } from 'react';
import {
  Star, Send, CheckCircle, Clock, Settings, Power, ExternalLink,
  Mail, Users, Activity, RefreshCw
} from 'lucide-react';
import { AppState, Client, Project } from '../types';
import SendReviewEmailModal from './SendReviewEmailModal';
import ClientReviewSettings from './ClientReviewSettings';

interface Props {
  state: AppState;
  isAdmin: boolean;
  onProjectStatusChange: (projectId: string, newStatus: string) => void;
  onReviewSent: (projectId: string) => void;
}

export default function ReviewAutomationDashboard({
  state,
  isAdmin,
  onProjectStatusChange,
  onReviewSent,
}: Props) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const clients = state.clients;
  const projects = state.projects;
  const requests = state.reviewRequests || [];

  const enabledClients = clients.filter(c => c.review_automation_enabled).length;
  const configuredClients = clients.filter(c => c.google_review_url).length;
  const completedProjects = projects.filter(p =>
    p.completion_status === 'completed' ||
    p.completion_status === 'review_requested' ||
    p.completion_status === 'review_received'
  ).length;
  const awaitingReviews = projects.filter(p => p.completion_status === 'review_requested').length;
  const receivedReviews = projects.filter(p => p.completion_status === 'review_received').length;

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;
  const selectedProjects = useMemo(
    () => selectedClient ? projects.filter(p => p.client_id === selectedClient.id) : [],
    [selectedClient, projects]
  );
  const selectedRequests = useMemo(
    () => selectedClient ? requests.filter(r => r.client_id === selectedClient.id) : [],
    [selectedClient, requests]
  );

  const clientFor = (project: Project) =>
    clients.find(c => c.id === project.client_id);

  const handleSent = (projectId: string) => {
    onProjectStatusChange(projectId, 'review_requested');
    onReviewSent(projectId);
    setSelectedProject(null);
  };

  if (!isAdmin) {
    return (
      <div className="bg-[#0b0f19] border border-rose-900/50 rounded-xl p-8 text-center">
        <p className="text-sm font-mono text-rose-400">Administrator access is required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Product management header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold">
            Resold Service Control
          </p>
          <h2 className="text-2xl font-display font-extrabold text-white mt-1">
            Review Automation Manager
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage review automation as a service for every client, configure their Google review destination,
            email sender, tenant subdomain, automation state, and review-request activity.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-400 border border-emerald-800 bg-emerald-950/40 px-2.5 py-1.5 rounded-lg shrink-0">
          <Activity size={12} /> ADMIN CONTROL
        </div>
      </div>

      {/* Service-level metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Metric label="Clients" value={clients.length} icon={<Users />} />
        <Metric label="Automation On" value={enabledClients} icon={<Power />} />
        <Metric label="Review Links" value={configuredClients} icon={<ExternalLink />} />
        <Metric label="Completed" value={completedProjects} icon={<CheckCircle />} />
        <Metric label="Awaiting Review" value={awaitingReviews} icon={<Clock />} />
        <Metric label="Received" value={receivedReviews} icon={<Star />} />
      </div>

      {/* Client service accounts */}
      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl overflow-hidden">
        <div className="p-5 border-b border-[#1a2234] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-display font-bold text-white">Client Service Accounts</h3>
            <p className="text-[10px] font-mono text-slate-600 mt-1">
              Select a client to manage their review automation service.
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">{clients.length} tenant{clients.length === 1 ? '' : 's'}</span>
        </div>

        {clients.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-500 font-mono">No clients have been created.</div>
        ) : (
          <div className="divide-y divide-[#1a2234]">
            {clients.map(client => {
              const clientProjects = projects.filter(p => p.client_id === client.id);
              const clientRequests = requests.filter(r => r.client_id === client.id);
              const active = selectedClientId === client.id;

              return (
                <div key={client.id}>
                  <button
                    onClick={() => {
                      setSelectedClientId(active ? null : client.id);
                      setShowSettings(false);
                    }}
                    className={'w-full text-left p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ' +
                      (active ? 'bg-cyan-950/20' : 'hover:bg-[#0d1321]')}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-white">{client.company_name}</p>
                        <span className={'text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ' +
                          (client.review_automation_enabled
                            ? 'text-emerald-400 bg-emerald-950/40 border-emerald-800/60'
                            : 'text-slate-500 bg-slate-950/40 border-slate-800')}>
                          {client.review_automation_enabled ? 'Automation ON' : 'Automation OFF'}
                        </span>
                      </div>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">
                        {client.email}{client.subdomain ? ' · ' + client.subdomain + '.conextsol.co.za' : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 shrink-0">
                      <span>{clientProjects.length} projects</span>
                      <span>{clientRequests.length} requests</span>
                      <span className={client.google_review_url ? 'text-emerald-500' : 'text-amber-600'}>
                        {client.google_review_url ? 'Google link ready' : 'Google link missing'}
                      </span>
                    </div>
                  </button>

                  {active && (
                    <div className="border-t border-[#1a2234] bg-[#080c14] p-4 md:p-5 space-y-5">
                      {/* Tenant controls */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                        <ControlCard
                          icon={<Power />}
                          title="Automation"
                          value={client.review_automation_enabled ? 'Enabled' : 'Disabled'}
                          detail={client.review_automation_enabled
                            ? 'Completion webhook can trigger the review flow.'
                            : 'Automatic review requests are disabled.'}
                        />
                        <ControlCard
                          icon={<Mail />}
                          title="Sender"
                          value={client.review_from_email || 'Agency default'}
                          detail={client.review_from_name || 'Conextsol Agency'}
                        />
                        <ControlCard
                          icon={<ExternalLink />}
                          title="Google Review"
                          value={client.google_review_url ? 'Configured' : 'Not configured'}
                          detail={client.google_place_id || 'Add the client review destination below.'}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => setShowSettings(v => !v)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-mono"
                        >
                          <Settings size={13} />
                          {showSettings ? 'Hide Service Settings' : 'Manage Service Settings'}
                        </button>

                        {client.google_review_url && (
                          <a
                            href={client.google_review_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-2 border border-[#1a2234] hover:border-cyan-800 text-slate-300 rounded-lg text-xs font-mono"
                          >
                            <ExternalLink size={13} /> Test Review Link
                          </a>
                        )}
                      </div>

                      {showSettings && (
                        <ClientReviewSettings
                          client={client}
                          onClientUpdated={() => {
                            // App state is refreshed by the normal client-management flow.
                            // Keep this dashboard open without navigating away.
                          }}
                        />
                      )}

                      {/* Client projects and actions */}
                      <div className="border-t border-[#1a2234] pt-5">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="text-xs font-display font-bold text-white">Review-Eligible Projects</h4>
                            <p className="text-[10px] font-mono text-slate-600 mt-1">
                              Send or resend a review request for completed client projects.
                            </p>
                          </div>
                          <span className="text-[10px] font-mono text-slate-600">{selectedRequests.length} historical requests</span>
                        </div>

                        <div className="space-y-2">
                          {selectedProjects.map(project => {
                            const status = project.completion_status || 'in_progress';
                            const eligible = status === 'completed' || status === 'review_requested';
                            return (
                              <div key={project.id} className="bg-[#0b0f19] border border-[#1a2234] rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold text-white">{project.project_name}</p>
                                  <span className="text-[10px] font-mono text-slate-500 mt-1 inline-flex items-center gap-1">
                                    {status === 'review_received'
                                      ? <CheckCircle size={11} className="text-cyan-400" />
                                      : <Clock size={11} className="text-amber-400" />}
                                    {status.replaceAll('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {project.production_url && (
                                    <a href={project.production_url} target="_blank" rel="noreferrer"
                                      className="p-2 border border-[#1a2234] rounded-lg text-slate-500 hover:text-white" title="Open production site">
                                      <ExternalLink size={13} />
                                    </a>
                                  )}
                                  {eligible && (
                                    <button
                                      onClick={() => setSelectedProject(project)}
                                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-800/40 rounded-lg text-xs font-mono"
                                    >
                                      <Send size={13} />
                                      {status === 'review_requested' ? 'Resend Request' : 'Request Review'}
                                    </button>
                                  )}
                                  {status === 'review_received' && (
                                    <span className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-mono text-cyan-400 border border-cyan-900/50 rounded-lg">
                                      <Star size={13} /> Review Received
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                          {selectedProjects.length === 0 && (
                            <div className="p-6 border border-dashed border-[#1a2234] rounded-lg text-center text-[10px] font-mono text-slate-600">
                              No projects are assigned to this client.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Recent tenant history */}
                      {selectedRequests.length > 0 && (
                        <div className="border-t border-[#1a2234] pt-5">
                          <h4 className="text-xs font-display font-bold text-white mb-3">Recent Review Requests</h4>
                          <div className="space-y-2">
                            {selectedRequests.slice(0, 5).map(request => (
                              <div key={request.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#0b0f19] border border-[#1a2234] rounded-lg p-3">
                                <div>
                                  <p className="text-[11px] font-mono text-slate-300">{request.recipient_email}</p>
                                  <p className="text-[9px] font-mono text-slate-600 mt-1">{new Date(request.sent_at).toLocaleString()}</p>
                                </div>
                                <span className={'text-[9px] font-mono uppercase ' +
                                  (request.status === 'failed' || request.status === 'bounced'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400')}>
                                  {request.status}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selectedProject && selectedClient && (
        <SendReviewEmailModal
          project={selectedProject}
          client={selectedClient}
          onClose={() => setSelectedProject(null)}
          onSent={handleSent}
        />
      )}
    </div>
  );
}

function Metric({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-slate-600">
        {React.cloneElement(icon as React.ReactElement, { size: 13 })}
        <span className="text-[9px] font-mono uppercase">{label}</span>
      </div>
      <p className="text-xl font-display font-extrabold text-white mt-1">{value}</p>
    </div>
  );
}

function ControlCard({ icon, title, value, detail }: {
  icon: React.ReactNode;
  title: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="bg-[#0b0f19] border border-[#1a2234] rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-cyan-500">
        {React.cloneElement(icon as React.ReactElement, { size: 13 })}
        <span className="text-[9px] font-mono uppercase">{title}</span>
      </div>
      <p className="text-xs font-mono text-slate-200 mt-2 truncate">{value}</p>
      <p className="text-[9px] font-mono text-slate-600 mt-1 truncate">{detail}</p>
    </div>
  );
}
