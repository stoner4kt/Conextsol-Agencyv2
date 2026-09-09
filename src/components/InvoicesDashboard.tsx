import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  Edit2,
  FileText,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import type { AppState, Client, Invoice, InvoiceLineItem } from '../types';
import { generateInvoicePDF } from '../lib/invoicePDF';

interface InvoicesDashboardProps {
  state: AppState;
  isAdmin: boolean;
  onSaveInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onMarkPaid: (id: string, notes: string) => void;
  onRunInvoiceReminders: () => void;
}

const STATUS_STYLES: Record<Invoice['status'], string> = {
  paid: 'bg-emerald-950/80 text-emerald-400 border-emerald-800',
  unpaid: 'bg-amber-950/80 text-amber-400 border-amber-800',
  overdue: 'bg-rose-950/80 text-rose-400 border-rose-800',
  draft: 'bg-slate-800/80 text-slate-400 border-slate-700',
};

const formatCurrency = (value: number) =>
  `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;

function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const numbers = existingInvoices
    .map(invoice => parseInt(invoice.invoice_number.split('-')[2] ?? '0', 10))
    .filter(number => !Number.isNaN(number));
  const nextNumber = numbers.length > 0 ? Math.max(...numbers) + 1 : 1;
  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
}

const createEmptyLineItem = (): InvoiceLineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
});

function MarkPaidModal({
  invoice,
  clientName,
  onConfirm,
  onClose,
}: {
  invoice: Invoice;
  clientName: string;
  onConfirm: (notes: string) => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#0b0f19] border border-emerald-800/60 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-400" />
            Mark as Paid
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close payment dialog">
            <X size={16} />
          </button>
        </div>

        <div className="bg-[#06080d] border border-[#1a2234] rounded-xl p-4 font-mono text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-400">Invoice</span>
            <span className="text-white">{invoice.invoice_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Client</span>
            <span className="text-white">{clientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Total</span>
            <span className="text-emerald-400 font-bold">{formatCurrency(invoice.total)}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">
            Payment Verification Notes (optional)
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="e.g. EFT confirmed via bank statement..."
            className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white border border-[#1a2234] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            className="px-5 py-2 bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md flex items-center gap-1.5"
          >
            <Check size={13} /> Confirm Payment
          </button>
        </div>
      </div>
    </div>
  );
}

function InvoiceForm({
  clients,
  existingInvoices,
  invoiceToEdit,
  onSave,
  onClose,
}: {
  clients: Client[];
  existingInvoices: Invoice[];
  invoiceToEdit?: Invoice;
  onSave: (invoice: Invoice) => void;
  onClose: () => void;
}) {
  const isEdit = Boolean(invoiceToEdit);
  const [clientId, setClientId] = useState(invoiceToEdit?.client_id ?? '');
  const [status, setStatus] = useState<Invoice['status']>(invoiceToEdit?.status ?? 'draft');
  const [dueDate, setDueDate] = useState(invoiceToEdit?.due_date ?? '');
  const [issuedDate, setIssuedDate] = useState(
    invoiceToEdit?.issued_date ?? new Date().toISOString().split('T')[0]
  );
  const [taxRate, setTaxRate] = useState(invoiceToEdit?.tax_rate ?? 15);
  const [notes, setNotes] = useState(invoiceToEdit?.notes ?? '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoiceToEdit?.line_items?.length ? invoiceToEdit.line_items : [createEmptyLineItem()]
  );
  const [error, setError] = useState('');

  const updateLine = (index: number, field: keyof InvoiceLineItem, value: string | number) => {
    setLineItems(current => current.map((lineItem, itemIndex) => {
      if (itemIndex !== index) return lineItem;
      const updated = { ...lineItem, [field]: value };
      updated.amount = Number(updated.quantity) * Number(updated.unit_price);
      return updated;
    }));
  };

  const subtotal = lineItems.reduce((sum, lineItem) => sum + lineItem.amount, 0);
  const taxAmount = Number((subtotal * taxRate / 100).toFixed(2));
  const total = Number((subtotal + taxAmount).toFixed(2));

  const handleSubmit = () => {
    setError('');
    if (!clientId) {
      setError('Please select a client.');
      return;
    }
    if (!dueDate) {
      setError('Please set a due date.');
      return;
    }
    if (lineItems.some(lineItem => !lineItem.description.trim())) {
      setError('All line items need a description.');
      return;
    }

    const now = new Date().toISOString();
    onSave({
      id: invoiceToEdit?.id ?? crypto.randomUUID(),
      invoice_number: invoiceToEdit?.invoice_number ?? generateInvoiceNumber(existingInvoices),
      client_id: clientId,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
      status,
      due_date: dueDate,
      issued_date: issuedDate,
      paid_at: invoiceToEdit?.paid_at ?? null,
      payment_notes: invoiceToEdit?.payment_notes ?? null,
      reminder_sent_at: invoiceToEdit?.reminder_sent_at ?? null,
      notes: notes || null,
      created_at: invoiceToEdit?.created_at ?? now,
      updated_at: now,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#1a2234] pb-4">
          <h3 className="font-display font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            {isEdit ? `Edit ${invoiceToEdit?.invoice_number}` : 'New Invoice'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white" aria-label="Close invoice form">
            <X size={16} />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl font-mono">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5">Client *</label>
            <select
              value={clientId}
              onChange={event => setClientId(event.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Select --</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Status</label>
            <select
              value={status}
              onChange={event => setStatus(event.target.value as Invoice['status'])}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="draft">Draft</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Issued Date *</label>
            <input
              type="date"
              value={issuedDate}
              onChange={event => setIssuedDate(event.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={event => setDueDate(event.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 font-mono text-[10px] text-slate-400 uppercase tracking-wider px-1">
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-right">Amount</span>
            <span className="col-span-1" />
          </div>
          {lineItems.map((lineItem, index) => (
            <div key={lineItem.id} className="grid grid-cols-12 gap-2 items-center">
              <input
                value={lineItem.description}
                onChange={event => updateLine(index, 'description', event.target.value)}
                placeholder="Service / item description"
                className="col-span-5 px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="number"
                min="1"
                value={lineItem.quantity}
                onChange={event => updateLine(index, 'quantity', parseFloat(event.target.value) || 0)}
                className="col-span-2 px-2 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono text-center focus:border-cyan-500 focus:outline-none"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={lineItem.unit_price}
                onChange={event => updateLine(index, 'unit_price', parseFloat(event.target.value) || 0)}
                className="col-span-2 px-2 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono text-right focus:border-cyan-500 focus:outline-none"
              />
              <span className="col-span-2 text-right text-xs font-mono font-bold text-emerald-400">
                {formatCurrency(lineItem.amount)}
              </span>
              <button
                onClick={() => setLineItems(current => current.filter((_, itemIndex) => itemIndex !== index))}
                disabled={lineItems.length === 1}
                className="col-span-1 flex justify-center text-slate-500 hover:text-rose-400 disabled:opacity-20"
                aria-label={`Remove line item ${index + 1}`}
              >
                <X size={13} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setLineItems(current => [...current, createEmptyLineItem()])}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 mt-2 transition-colors"
          >
            <Plus size={13} /> Add line item
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-[#1a2234] pt-4">
          <div className="flex items-center gap-3 font-mono text-xs">
            <label className="text-slate-400">VAT %</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={taxRate}
              onChange={event => setTaxRate(parseFloat(event.target.value) || 0)}
              className="w-20 px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white text-center focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div className="font-mono text-xs space-y-1 text-right">
            <div className="text-slate-400">Subtotal: <span className="text-white">{formatCurrency(subtotal)}</span></div>
            <div className="text-slate-400">VAT ({taxRate}%): <span className="text-white">{formatCurrency(taxAmount)}</span></div>
            <div className="text-base font-extrabold text-emerald-400">Total: {formatCurrency(total)}</div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5">Internal Notes (admin only)</label>
          <textarea
            rows={2}
            value={notes}
            onChange={event => setNotes(event.target.value)}
            placeholder="Banking details, special instructions, etc."
            className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono focus:border-cyan-500 focus:outline-none resize-none"
          />
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-mono text-slate-400 border border-[#1a2234] rounded-xl hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md"
          >
            <Save size={13} /> {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function InvoicesDashboard({
  state,
  isAdmin,
  onSaveInvoice,
  onDeleteInvoice,
  onMarkPaid,
  onRunInvoiceReminders,
}: InvoicesDashboardProps) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getClient = (clientId: string) => state.clients.find(client => client.id === clientId);

  const filteredInvoices = useMemo(() => {
    const query = search.toLowerCase().trim();
    return state.invoices.filter(invoice => {
      const client = getClient(invoice.client_id);
      const matchesSearch = !query
        || invoice.invoice_number.toLowerCase().includes(query)
        || client?.company_name.toLowerCase().includes(query)
        || client?.primary_contact_name.toLowerCase().includes(query);
      const matchesStatus = filterStatus === 'all' || invoice.status === filterStatus;
      const matchesClient = filterClient === 'all' || invoice.client_id === filterClient;
      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [state.invoices, state.clients, search, filterStatus, filterClient]);

  const totalUnpaid = state.invoices
    .filter(invoice => invoice.status === 'unpaid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const totalPaid = state.invoices
    .filter(invoice => invoice.status === 'paid')
    .reduce((sum, invoice) => sum + invoice.total, 0);
  const overdueCount = state.invoices.filter(invoice => invoice.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {markPaidInvoice && (
        <MarkPaidModal
          invoice={markPaidInvoice}
          clientName={getClient(markPaidInvoice.client_id)?.company_name ?? '—'}
          onConfirm={notes => {
            onMarkPaid(markPaidInvoice.id, notes);
            setMarkPaidInvoice(null);
          }}
          onClose={() => setMarkPaidInvoice(null)}
        />
      )}

      {(showForm || editInvoice) && (
        <InvoiceForm
          clients={state.clients}
          existingInvoices={state.invoices}
          invoiceToEdit={editInvoice}
          onSave={invoice => {
            onSaveInvoice(invoice);
            setShowForm(false);
            setEditInvoice(undefined);
          }}
          onClose={() => {
            setShowForm(false);
            setEditInvoice(undefined);
          }}
        />
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: state.invoices.length.toString(), sub: 'all time', color: 'text-white', icon: FileText },
          { label: 'Outstanding', value: formatCurrency(totalUnpaid), sub: 'unpaid balance', color: 'text-amber-400', icon: Clock },
          { label: 'Revenue Collected', value: formatCurrency(totalPaid), sub: 'paid invoices', color: 'text-emerald-400', icon: DollarSign },
          { label: 'Overdue', value: overdueCount.toString(), sub: 'require action', color: 'text-rose-400', icon: AlertTriangle },
        ].map(({ label, value, sub, color, icon: Icon }) => (
          <div key={label} className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-5 shadow-lg">
            <p className="text-[10px] text-slate-400 font-mono font-semibold uppercase tracking-wide">{label}</p>
            <div className="flex items-baseline justify-between mt-1">
              <h4 className={`text-xl font-display font-extrabold ${color}`}>{value}</h4>
              <Icon size={14} className={`${color} opacity-60`} />
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full">
          <div className="relative min-w-[220px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoice # or client…"
              value={search}
              onChange={event => setSearch(event.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                aria-label="Clear invoice search"
              >
                <X size={12} />
              </button>
            )}
          </div>
          <select
            value={filterStatus}
            onChange={event => setFilterStatus(event.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          <select
            value={filterClient}
            onChange={event => setFilterClient(event.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="all">All Clients</option>
            {state.clients.map(client => (
              <option key={client.id} value={client.id}>{client.company_name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 shrink-0 w-full md:w-auto">
          {isAdmin && (
            <button
              onClick={onRunInvoiceReminders}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#121826] border border-[#1a2234] hover:border-cyan-800 text-cyan-300 text-xs font-mono font-bold rounded-xl transition-colors"
            >
              <Clock size={13} /> Scan Reminders
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md"
            >
              <Plus size={13} /> New Invoice
            </button>
          )}
        </div>
      </div>

      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] shadow-xl overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <FileText size={24} className="text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">No invoices found. Adjust filters or create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2234]">
            {filteredInvoices.map(invoice => {
              const client = getClient(invoice.client_id);
              const isExpanded = expandedId === invoice.id;
              return (
                <div key={invoice.id}>
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#121826]/60 transition-colors">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : invoice.id)}
                      className="text-slate-400 hover:text-white shrink-0"
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${invoice.invoice_number}`}
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-xs font-mono font-bold text-white">{invoice.invoice_number}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{client?.company_name ?? 'Unknown'}</p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold border ${STATUS_STYLES[invoice.status]}`}>
                      {invoice.status}
                    </span>
                    <div className="hidden sm:block font-mono text-[10px] text-slate-400">
                      <p>Issued: {invoice.issued_date}</p>
                      <p>Due: {invoice.due_date}</p>
                    </div>
                    <p className="font-mono font-bold text-emerald-400 text-sm">{formatCurrency(invoice.total)}</p>
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      <button
                        onClick={() => client && generateInvoicePDF(invoice, client)}
                        disabled={!client}
                        title="Download PDF"
                        className="p-1.5 bg-[#06080d] border border-[#1a2234] rounded-lg text-slate-400 hover:text-cyan-400 hover:border-cyan-800 transition-colors disabled:opacity-40"
                      >
                        <Download size={13} />
                      </button>
                      {isAdmin && invoice.status !== 'paid' && (
                        <button
                          onClick={() => setMarkPaidInvoice(invoice)}
                          title="Mark as Paid"
                          className="p-1.5 bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-emerald-400 hover:bg-emerald-950 transition-colors"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => setEditInvoice(invoice)}
                          title="Edit"
                          className="p-1.5 hover:bg-[#1a2234] rounded-lg text-slate-400 hover:text-white transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => {
                            if (confirm(`Delete ${invoice.invoice_number}? This cannot be undone.`)) {
                              onDeleteInvoice(invoice.id);
                            }
                          }}
                          title="Delete"
                          className="p-1.5 hover:bg-[#1a2234] rounded-lg text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-10 pb-4 bg-[#070a12]">
                      <table className="w-full text-xs font-mono border-collapse">
                        <thead>
                          <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-[#1a2234]">
                            <th className="py-2 text-left font-semibold">Description</th>
                            <th className="py-2 text-center font-semibold">Qty</th>
                            <th className="py-2 text-right font-semibold">Unit Price</th>
                            <th className="py-2 text-right font-semibold">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoice.line_items.map(lineItem => (
                            <tr key={lineItem.id} className="border-b border-[#1a2234]/50 text-slate-300">
                              <td className="py-1.5">{lineItem.description}</td>
                              <td className="py-1.5 text-center">{lineItem.quantity}</td>
                              <td className="py-1.5 text-right">{formatCurrency(lineItem.unit_price)}</td>
                              <td className="py-1.5 text-right text-emerald-400 font-bold">{formatCurrency(lineItem.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-right space-y-0.5 font-mono text-xs text-slate-400">
                        <p>Subtotal: {formatCurrency(invoice.subtotal)}</p>
                        <p>VAT ({invoice.tax_rate}%): {formatCurrency(invoice.tax_amount)}</p>
                        <p className="text-emerald-400 font-bold text-sm">Total: {formatCurrency(invoice.total)}</p>
                        {invoice.payment_notes && (
                          <p className="text-slate-500 italic text-[10px]">Note: {invoice.payment_notes}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}