import React from 'react';
import { LogOut, FileText, FolderKanban, CreditCard } from 'lucide-react';
import { AppState } from '../types';

interface ClientPortalProps {
  state: AppState;
  onSignOut: () => void;
}

export default function ClientPortal({ state, onSignOut }: ClientPortalProps) {
  const client = state.clients[0];
  const clientProjects = state.projects.filter(project => project.client_id === client?.id);
  const clientInvoices = state.invoices
    .filter(invoice => invoice.client_id === client?.id)
    .sort((a, b) => b.issued_date.localeCompare(a.issued_date));

  const currency = (amount: number) => new Intl.NumberFormat('en-ZA', {
    style: 'currency', currency: 'ZAR',
  }).format(Number(amount || 0));

  return (
    <div className="min-h-screen bg-[#06080d] text-slate-200">
      <header className="border-b border-[#1a2234] bg-[#090d16] px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="Conextsol" className="h-9 w-9 object-contain" />
          <div>
            <p className="font-bold text-white">Conextsol Client Portal</p>
            <p className="text-xs text-slate-400">{client?.company_name ?? state.userEmail}</p>
          </div>
        </div>
        <button onClick={onSignOut} className="inline-flex items-center gap-2 rounded-lg border border-[#263249] px-3 py-2 text-xs text-slate-300 hover:text-white">
          <LogOut size={14} /> Sign out
        </button>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-6">
        <section>
          <h1 className="text-2xl font-bold text-white">Your account overview</h1>
          <p className="mt-1 text-sm text-slate-400">View your project progress, invoices, and payment information.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-[#1d263b] bg-[#0b0f19] p-5">
            <FolderKanban className="mb-3 text-cyan-400" size={20} />
            <p className="text-xs text-slate-400">Assigned projects</p>
            <p className="mt-1 text-2xl font-bold text-white">{clientProjects.length}</p>
          </div>
          <div className="rounded-xl border border-[#1d263b] bg-[#0b0f19] p-5">
            <FileText className="mb-3 text-cyan-400" size={20} />
            <p className="text-xs text-slate-400">Invoices</p>
            <p className="mt-1 text-2xl font-bold text-white">{clientInvoices.length}</p>
          </div>
          <div className="rounded-xl border border-[#1d263b] bg-[#0b0f19] p-5">
            <CreditCard className="mb-3 text-cyan-400" size={20} />
            <p className="text-xs text-slate-400">Outstanding balance</p>
            <p className="mt-1 text-2xl font-bold text-white">{currency(clientInvoices.filter(invoice => invoice.status !== 'paid' && invoice.status !== 'draft').reduce((sum, invoice) => sum + Number(invoice.total || 0), 0))}</p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Your projects</h2>
          {clientProjects.length === 0 ? <p className="rounded-xl border border-[#1d263b] p-5 text-sm text-slate-400">No projects are currently linked to this account.</p> : clientProjects.map(project => (
            <article key={project.id} className="rounded-xl border border-[#1d263b] bg-[#0b0f19] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-semibold text-white">{project.project_name}</h3>
                <span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-2.5 py-1 text-[11px] text-cyan-300">{'In progress'}</span>
              </div>
              <p className="mt-2 text-xs text-slate-400">Target completion: {project.end_date}</p>
              {project.short_note && <p className="mt-3 text-sm text-slate-300">{project.short_note}</p>}
              {project.production_url && <a className="mt-3 inline-block text-xs text-cyan-400 underline" href={project.production_url} target="_blank" rel="noreferrer">View live website</a>}
            </article>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-white">Invoices and payment information</h2>
          {clientInvoices.length === 0 ? <p className="rounded-xl border border-[#1d263b] p-5 text-sm text-slate-400">No invoices are available for this account.</p> : (
            <div className="overflow-x-auto rounded-xl border border-[#1d263b]">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[#0b0f19] text-xs uppercase text-slate-400">
                  <tr><th className="p-4">Invoice</th><th className="p-4">Issued</th><th className="p-4">Due</th><th className="p-4">Amount</th><th className="p-4">Status</th><th className="p-4">Payment details</th></tr>
                </thead>
                <tbody>
                  {clientInvoices.map(invoice => (
                    <tr key={invoice.id} className="border-t border-[#1d263b]">
                      <td className="p-4 font-medium text-white">{invoice.invoice_number}</td>
                      <td className="p-4 text-slate-300">{invoice.issued_date}</td>
                      <td className="p-4 text-slate-300">{invoice.due_date}</td>
                      <td className="p-4 text-white">{currency(invoice.total)}</td>
                      <td className="p-4 capitalize text-slate-300">{invoice.status}</td>
                      <td className="p-4 text-xs text-slate-400">{invoice.status === 'paid' ? `Paid ${invoice.paid_at ? new Date(invoice.paid_at).toLocaleDateString('en-ZA') : ''}` : invoice.payment_notes || 'Payment pending'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <p className="text-center text-[11px] text-slate-500">This portal is read-only. Contact Conextsol for invoice corrections or account changes.</p>
      </main>
    </div>
  );
}
