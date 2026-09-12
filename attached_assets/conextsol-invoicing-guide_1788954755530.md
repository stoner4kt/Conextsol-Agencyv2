# Conextsol Admin Panel — Custom Invoicing System Integration Guide

> **Codebase analysed:** `stoner4kt/Conextsol-Agencyv2` (main branch)  
> **Stack confirmed:** React 19 · TypeScript · Vite · Tailwind v4 · Supabase (PostgreSQL + Deno Edge Functions) · LocalStorage fallback · Lucide React  
> **Admin guard pattern:** `auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR = 'reeqieric41@gmail.com'`

---

## Architecture Overview

```
invoices_dash tab
     │
     ├── InvoicesDashboard.tsx    ← list, search/filter, mark-paid, PDF download
     ├── InvoiceForm.tsx           ← create / edit modal (line items, due date)
     └── invoicePDF.ts             ← jsPDF generator (client-side, no server)

supabaseService.ts  (add invoice CRUD)
types.ts            (Invoice + InvoiceLineItem interfaces + AppState)
App.tsx             (state, handlers, routing)
Sidebar.tsx         (new nav entry code=10)

supabase/functions/invoice-reminders/index.ts  ← Deno + Resend API
supabase-schema.sql migration (append)
```

---

## Step 1 — Database Migration

Append this to `supabase-schema.sql` and run it in Supabase SQL Editor.

```sql
-- ====================================================================
-- INVOICES TABLE MIGRATION
-- ====================================================================

CREATE TABLE IF NOT EXISTS invoices (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    TEXT NOT NULL UNIQUE,         -- e.g. "INV-2026-0042"
  client_id         UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  line_items        JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- line_items shape: [{ description, quantity, unit_price, amount }]
  subtotal          NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate          NUMERIC(5, 2) NOT NULL DEFAULT 0.00,  -- percentage e.g. 15.00
  tax_amount        NUMERIC(12, 2) GENERATED ALWAYS AS
                      (ROUND(subtotal * tax_rate / 100, 2)) STORED,
  total             NUMERIC(12, 2) GENERATED ALWAYS AS
                      (subtotal + ROUND(subtotal * tax_rate / 100, 2)) STORED,
  status            TEXT NOT NULL DEFAULT 'unpaid'
                      CHECK (status IN ('unpaid', 'paid', 'overdue', 'draft')),
  due_date          DATE NOT NULL,
  issued_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at           TIMESTAMPTZ,
  payment_notes     TEXT,
  reminder_sent_at  TIMESTAMPTZ,                  -- last reminder email timestamp
  notes             TEXT,                          -- internal admin notes on invoice
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_invoices_client_id  ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON invoices(due_date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);

-- Auto-update trigger
CREATE TRIGGER update_invoices_modtime
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

-- RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins have full access to invoices"
ON invoices FOR ALL TO authenticated
USING (
  auth.jwt() ->> 'email' LIKE '%@conextsol.com'
  OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
)
WITH CHECK (
  auth.jwt() ->> 'email' LIKE '%@conextsol.com'
  OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com'
);

-- Sequence for auto-increment invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;
```

---

## Step 2 — Install Client-Side PDF Library

```bash
npm install jspdf jspdf-autotable
npm install --save-dev @types/jspdf
```

> **Why jsPDF?** It runs entirely in the browser (no Deno/server needed), matches your existing client-side architecture, and `jspdf-autotable` gives clean line-item table rendering. No extra Vite config required.

---

## Step 3 — TypeScript Types (`src/types.ts`)

Add the following interfaces to the **bottom** of `src/types.ts`, then update `AppState`.

```typescript
// ---- INVOICING SYSTEM TYPES ----

export interface InvoiceLineItem {
  id: string;            // crypto.randomUUID() client-side
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;        // quantity * unit_price (computed, stored for DB integrity)
}

export interface Invoice {
  id: string;                                 // UUID
  invoice_number: string;                     // "INV-2026-0042"
  client_id: string;                          // FK → clients.id
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;                           // percentage e.g. 15
  tax_amount: number;                         // computed by DB
  total: number;                              // computed by DB
  status: 'unpaid' | 'paid' | 'overdue' | 'draft';
  due_date: string;                           // YYYY-MM-DD
  issued_date: string;                        // YYYY-MM-DD
  paid_at: string | null;
  payment_notes: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Update AppState — add invoices field
// (find the existing AppState interface and add the line below)
// invoices: Invoice[];
```

**Updated `AppState`:**

```typescript
export interface AppState {
  clients: Client[];
  projects: Project[];
  retainers: Retainer[];
  documents: DocumentAndNote[];
  alertsLog: WebhookAlert[];
  aiToolAccounts: AIToolAccount[];
  invoices: Invoice[];          // ← ADD THIS
  isAdmin: boolean;
  userEmail: string | null;
}
```

---

## Step 4 — Service Layer (`src/supabaseService.ts`)

Add the following block **before** the closing `};` of `supabaseService`:

```typescript
// ---- INVOICES CRUD ----

const INVOICES_KEY = 'conextsol_invoices';

async getInvoices(): Promise<Invoice[]> {
  if (!isSupabaseConfigured || !supabase) {
    return getLocalCollection<Invoice>(INVOICES_KEY, []);
  }
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .order('issued_date', { ascending: false });
    if (error) throw error;
    return (data || []).map(inv => ({
      ...inv,
      line_items: Array.isArray(inv.line_items)
        ? inv.line_items
        : JSON.parse(inv.line_items || '[]'),
    }));
  } catch (err) {
    console.warn('Supabase invoices fetch failed, using LocalStorage:', err);
    return getLocalCollection<Invoice>(INVOICES_KEY, []);
  }
},

async saveInvoice(invoice: Invoice): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalCollection<Invoice>(INVOICES_KEY, []);
    const exists = current.some(i => i.id === invoice.id);
    const updated = exists
      ? current.map(i => (i.id === invoice.id ? invoice : i))
      : [...current, invoice];
    saveLocalCollection(INVOICES_KEY, updated);
    return;
  }
  try {
    const { error } = await supabase.from('invoices').upsert({
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      client_id: invoice.client_id,
      line_items: invoice.line_items,
      subtotal: invoice.subtotal,
      tax_rate: invoice.tax_rate,
      status: invoice.status,
      due_date: invoice.due_date,
      issued_date: invoice.issued_date,
      paid_at: invoice.paid_at,
      payment_notes: invoice.payment_notes,
      reminder_sent_at: invoice.reminder_sent_at,
      notes: invoice.notes,
      created_at: invoice.created_at,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase invoice save failed:', err);
    const current = getLocalCollection<Invoice>(INVOICES_KEY, []);
    const exists = current.some(i => i.id === invoice.id);
    const updated = exists
      ? current.map(i => (i.id === invoice.id ? invoice : i))
      : [...current, invoice];
    saveLocalCollection(INVOICES_KEY, updated);
  }
},

async deleteInvoice(id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalCollection<Invoice>(INVOICES_KEY, []);
    saveLocalCollection(INVOICES_KEY, current.filter(i => i.id !== id));
    return;
  }
  try {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.warn('Supabase invoice delete failed:', err);
    const current = getLocalCollection<Invoice>(INVOICES_KEY, []);
    saveLocalCollection(INVOICES_KEY, current.filter(i => i.id !== id));
  }
},

async markInvoicePaid(id: string, notes: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const current = getLocalCollection<Invoice>(INVOICES_KEY, []);
    const updated = current.map(i =>
      i.id === id
        ? { ...i, status: 'paid' as const, paid_at: new Date().toISOString(), payment_notes: notes }
        : i
    );
    saveLocalCollection(INVOICES_KEY, updated);
    return;
  }
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      payment_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
},
```

Also update `seedDemoData` and `clearAllData` to include the invoices key:

```typescript
// In seedDemoData():
saveLocalCollection(INVOICES_KEY, []);

// In clearAllData():
localStorage.removeItem(INVOICES_KEY);
```

---

## Step 5 — PDF Generator (`src/lib/invoicePDF.ts`)

Create this new file:

```typescript
// src/lib/invoicePDF.ts
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice, Client } from '../types';

export function generateInvoicePDF(invoice: Invoice, client: Client): void {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 20;

  // ── Header brand block ──────────────────────────────────────────
  doc.setFillColor(6, 8, 13);           // #06080d — matches app bg
  doc.rect(0, 0, pageW, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text('CONEXTSOL', margin, 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 180, 210);      // cyan-400 approximation
  doc.text('AGENCY — COMMAND CENTRE', margin, 27);

  // Invoice label (right-aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('INVOICE', pageW - margin, 22, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(150, 170, 200);
  doc.text(invoice.invoice_number, pageW - margin, 30, { align: 'right' });

  // ── Meta grid (issued / due / status) ───────────────────────────
  let y = 52;
  doc.setTextColor(30, 30, 30);

  const statusColors: Record<string, [number, number, number]> = {
    paid:    [16, 185, 129],   // emerald
    unpaid:  [250, 204, 21],   // amber
    overdue: [239, 68, 68],    // rose
    draft:   [148, 163, 184],  // slate
  };
  const [sr, sg, sb] = statusColors[invoice.status] ?? [148, 163, 184];
  doc.setFillColor(sr, sg, sb);
  doc.roundedRect(margin, y - 5, 28, 7, 1.5, 1.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(invoice.status.toUpperCase(), margin + 14, y, { align: 'center' });

  doc.setTextColor(80, 80, 80);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Issued: ${invoice.issued_date}`, margin + 34, y);
  doc.text(`Due:    ${invoice.due_date}`, margin + 80, y);
  if (invoice.paid_at) {
    doc.text(`Paid:   ${invoice.paid_at.split('T')[0]}`, margin + 120, y);
  }

  // ── Bill To block ───────────────────────────────────────────────
  y += 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(120, 140, 160);
  doc.text('BILL TO', margin, y);
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 20, 20);
  doc.text(client.company_name, margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  doc.text(client.primary_contact_name, margin, y);
  y += 5;
  doc.text(client.email, margin, y);
  if (client.phone) { y += 5; doc.text(client.phone, margin, y); }

  // ── Line items table ────────────────────────────────────────────
  y += 12;
  autoTable(doc, {
    startY: y,
    head: [['Description', 'Qty', 'Unit Price', 'Amount']],
    body: invoice.line_items.map(li => [
      li.description,
      li.quantity.toString(),
      `R ${li.unit_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
      `R ${li.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`,
    ]),
    headStyles: {
      fillColor: [11, 15, 25],      // #0b0f19
      textColor: [100, 180, 210],
      fontStyle: 'bold',
      fontSize: 8,
    },
    bodyStyles: { fontSize: 9, textColor: [30, 30, 30] },
    alternateRowStyles: { fillColor: [247, 249, 252] },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', cellWidth: 32 },
    },
    margin: { left: margin, right: margin },
    theme: 'striped',
  });

  // ── Totals block ────────────────────────────────────────────────
  const finalY = (doc as any).lastAutoTable.finalY + 8;
  const totalsX = pageW - margin - 70;

  const drawTotal = (label: string, value: string, bold = false, color?: [number, number, number]) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 10 : 9);
    doc.setTextColor(...(color ?? ([60, 60, 60] as [number, number, number])));
    doc.text(label, totalsX, finalY + drawTotal._y);
    doc.text(value, pageW - margin, finalY + drawTotal._y, { align: 'right' });
    drawTotal._y += 6;
  };
  drawTotal._y = 0;

  drawTotal('Subtotal', `R ${invoice.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);
  drawTotal(`VAT (${invoice.tax_rate}%)`, `R ${invoice.tax_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`);

  // separator line
  const sepY = finalY + drawTotal._y - 2;
  doc.setDrawColor(200, 210, 220);
  doc.line(totalsX, sepY, pageW - margin, sepY);
  drawTotal._y += 2;

  drawTotal('TOTAL DUE', `R ${invoice.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`, true, [6, 182, 212]);

  // ── Payment notes ───────────────────────────────────────────────
  if (invoice.payment_notes) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(120, 130, 150);
    doc.text(`Payment note: ${invoice.payment_notes}`, margin, finalY + drawTotal._y + 6);
  }

  // ── Footer ──────────────────────────────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 14;
  doc.setFillColor(6, 8, 13);
  doc.rect(0, footerY - 4, pageW, 20, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 120, 140);
  doc.text('Conextsol Agency · conextsol.com', margin, footerY + 4);
  doc.text(`Generated ${new Date().toLocaleDateString('en-ZA')} · ${invoice.invoice_number}`, pageW - margin, footerY + 4, { align: 'right' });

  doc.save(`${invoice.invoice_number}_${client.company_name.replace(/\s+/g, '_')}.pdf`);
}
```

---

## Step 6 — InvoicesDashboard Component (`src/components/InvoicesDashboard.tsx`)

Create `src/components/InvoicesDashboard.tsx`:

```tsx
import React, { useState, useMemo } from 'react';
import {
  Plus, Search, X, Check, Download, Edit2, Trash2,
  FileText, DollarSign, Clock, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Save, Filter
} from 'lucide-react';
import { Invoice, InvoiceLineItem, AppState, Client } from '../types';
import { generateInvoicePDF } from '../lib/invoicePDF';

interface Props {
  state: AppState;
  isAdmin: boolean;
  onSaveInvoice: (invoice: Invoice) => void;
  onDeleteInvoice: (id: string) => void;
  onMarkPaid: (id: string, notes: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateInvoiceNumber(existingInvoices: Invoice[]): string {
  const year = new Date().getFullYear();
  const nums = existingInvoices
    .map(i => parseInt(i.invoice_number.split('-')[2] ?? '0'))
    .filter(n => !isNaN(n));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `INV-${year}-${String(next).padStart(4, '0')}`;
}

const EMPTY_LINE_ITEM = (): InvoiceLineItem => ({
  id: crypto.randomUUID(),
  description: '',
  quantity: 1,
  unit_price: 0,
  amount: 0,
});

const STATUS_STYLES = {
  paid:    'bg-emerald-950/80 text-emerald-400 border-emerald-800',
  unpaid:  'bg-amber-950/80 text-amber-400 border-amber-800',
  overdue: 'bg-rose-950/80 text-rose-400 border-rose-800',
  draft:   'bg-slate-800/80 text-slate-400 border-slate-700',
};

// ── Mark Paid Modal ───────────────────────────────────────────────────────────

function MarkPaidModal({
  invoice, clientName, onConfirm, onClose
}: {
  invoice: Invoice; clientName: string;
  onConfirm: (notes: string) => void; onClose: () => void;
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
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>
        <div className="bg-[#06080d] border border-[#1a2234] rounded-xl p-4 font-mono text-xs space-y-1">
          <div className="flex justify-between"><span className="text-slate-400">Invoice</span><span className="text-white">{invoice.invoice_number}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Client</span><span className="text-white">{clientName}</span></div>
          <div className="flex justify-between"><span className="text-slate-400">Total</span><span className="text-emerald-400 font-bold">R {invoice.total.toLocaleString()}</span></div>
        </div>
        <div>
          <label className="block text-xs font-mono text-slate-300 mb-1.5">Payment Verification Notes (optional)</label>
          <textarea
            rows={3}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. EFT confirmed via bank statement 2026-09-08, ref #TXN992..."
            className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono focus:outline-none focus:border-emerald-500 resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-xs font-mono text-slate-400 hover:text-white border border-[#1a2234] rounded-xl transition-colors">Cancel</button>
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

// ── Invoice Form ──────────────────────────────────────────────────────────────

function InvoiceForm({
  clients, existingInvoices, invoiceToEdit, onSave, onClose
}: {
  clients: Client[]; existingInvoices: Invoice[];
  invoiceToEdit?: Invoice; onSave: (inv: Invoice) => void; onClose: () => void;
}) {
  const isEdit = !!invoiceToEdit;
  const [clientId, setClientId] = useState(invoiceToEdit?.client_id ?? '');
  const [status, setStatus] = useState<Invoice['status']>(invoiceToEdit?.status ?? 'draft');
  const [dueDate, setDueDate] = useState(invoiceToEdit?.due_date ?? '');
  const [issuedDate, setIssuedDate] = useState(invoiceToEdit?.issued_date ?? new Date().toISOString().split('T')[0]);
  const [taxRate, setTaxRate] = useState(invoiceToEdit?.tax_rate ?? 15);
  const [notes, setNotes] = useState(invoiceToEdit?.notes ?? '');
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(
    invoiceToEdit?.line_items?.length ? invoiceToEdit.line_items : [EMPTY_LINE_ITEM()]
  );
  const [error, setError] = useState('');

  const updateLine = (idx: number, field: keyof InvoiceLineItem, val: string | number) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li;
      const updated = { ...li, [field]: val };
      updated.amount = Number(updated.quantity) * Number(updated.unit_price);
      return updated;
    }));
  };

  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxAmt = parseFloat((subtotal * taxRate / 100).toFixed(2));
  const total = parseFloat((subtotal + taxAmt).toFixed(2));

  const handleSubmit = () => {
    setError('');
    if (!clientId) { setError('Please select a client.'); return; }
    if (!dueDate)  { setError('Please set a due date.'); return; }
    if (lineItems.some(li => !li.description)) { setError('All line items need a description.'); return; }

    const invoice: Invoice = {
      id: invoiceToEdit?.id ?? crypto.randomUUID(),
      invoice_number: invoiceToEdit?.invoice_number ?? generateInvoiceNumber(existingInvoices),
      client_id: clientId,
      line_items: lineItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmt,
      total,
      status,
      due_date: dueDate,
      issued_date: issuedDate,
      paid_at: invoiceToEdit?.paid_at ?? null,
      payment_notes: invoiceToEdit?.payment_notes ?? null,
      reminder_sent_at: invoiceToEdit?.reminder_sent_at ?? null,
      notes: notes || null,
      created_at: invoiceToEdit?.created_at ?? new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSave(invoice);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-2xl w-full max-w-3xl p-6 space-y-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#1a2234] pb-4">
          <h3 className="font-display font-bold text-white flex items-center gap-2">
            <FileText size={16} className="text-cyan-400" />
            {isEdit ? `Edit ${invoiceToEdit!.invoice_number}` : 'New Invoice'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={16} /></button>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs rounded-xl font-mono">⚠️ {error}</div>
        )}

        {/* Meta row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 font-mono text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5">Client *</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none cursor-pointer">
              <option value="">-- Select --</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as Invoice['status'])}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none cursor-pointer">
              <option value="draft">Draft</option>
              <option value="unpaid">Unpaid</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Issued Date *</label>
            <input type="date" value={issuedDate} onChange={e => setIssuedDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-slate-400 mb-1.5">Due Date *</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white focus:border-cyan-500 focus:outline-none" />
          </div>
        </div>

        {/* Line items */}
        <div className="space-y-2">
          <div className="grid grid-cols-12 gap-2 font-mono text-[10px] text-slate-400 uppercase tracking-wider px-1">
            <span className="col-span-5">Description</span>
            <span className="col-span-2 text-center">Qty</span>
            <span className="col-span-2 text-right">Unit Price</span>
            <span className="col-span-2 text-right">Amount</span>
            <span className="col-span-1" />
          </div>
          {lineItems.map((li, idx) => (
            <div key={li.id} className="grid grid-cols-12 gap-2 items-center">
              <input value={li.description} onChange={e => updateLine(idx, 'description', e.target.value)}
                placeholder="Service / item description"
                className="col-span-5 px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none" />
              <input type="number" min="1" value={li.quantity} onChange={e => updateLine(idx, 'quantity', parseFloat(e.target.value) || 0)}
                className="col-span-2 px-2 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono text-center focus:border-cyan-500 focus:outline-none" />
              <input type="number" min="0" step="0.01" value={li.unit_price} onChange={e => updateLine(idx, 'unit_price', parseFloat(e.target.value) || 0)}
                className="col-span-2 px-2 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono text-right focus:border-cyan-500 focus:outline-none" />
              <span className="col-span-2 text-right text-xs font-mono font-bold text-emerald-400">
                R {li.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
              </span>
              <button onClick={() => setLineItems(prev => prev.filter((_, i) => i !== idx))}
                disabled={lineItems.length === 1}
                className="col-span-1 flex justify-center text-slate-500 hover:text-rose-400 disabled:opacity-20">
                <X size={13} />
              </button>
            </div>
          ))}
          <button onClick={() => setLineItems(prev => [...prev, EMPTY_LINE_ITEM()])}
            className="flex items-center gap-1.5 text-xs font-mono text-cyan-400 hover:text-cyan-300 mt-2 transition-colors">
            <Plus size={13} /> Add line item
          </button>
        </div>

        {/* Totals + Tax */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-t border-[#1a2234] pt-4">
          <div className="flex items-center gap-3 font-mono text-xs">
            <label className="text-slate-400">VAT %</label>
            <input type="number" min="0" max="100" step="0.5" value={taxRate}
              onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-20 px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-white text-center focus:border-cyan-500 focus:outline-none" />
          </div>
          <div className="font-mono text-xs space-y-1 text-right">
            <div className="text-slate-400">Subtotal: <span className="text-white">R {subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>
            <div className="text-slate-400">VAT ({taxRate}%): <span className="text-white">R {taxAmt.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span></div>
            <div className="text-base font-extrabold text-emerald-400">Total: R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</div>
          </div>
        </div>

        {/* Internal notes */}
        <div>
          <label className="block text-xs font-mono text-slate-400 mb-1.5">Internal Notes (admin only)</label>
          <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Banking details, special instructions, etc."
            className="w-full px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono focus:border-cyan-500 focus:outline-none resize-none" />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-xs font-mono text-slate-400 border border-[#1a2234] rounded-xl hover:text-white">Cancel</button>
          <button onClick={handleSubmit}
            className="flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md">
            <Save size={13} /> {isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function InvoicesDashboard({ state, isAdmin, onSaveInvoice, onDeleteInvoice, onMarkPaid }: Props) {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterClient, setFilterClient] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editInvoice, setEditInvoice] = useState<Invoice | undefined>();
  const [markPaidInvoice, setMarkPaidInvoice] = useState<Invoice | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const getClient = (id: string) => state.clients.find(c => c.id === id);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return state.invoices.filter(inv => {
      const client = getClient(inv.client_id);
      const matchSearch = !q
        || inv.invoice_number.toLowerCase().includes(q)
        || client?.company_name.toLowerCase().includes(q)
        || client?.primary_contact_name.toLowerCase().includes(q);
      const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
      const matchClient = filterClient === 'all' || inv.client_id === filterClient;
      return matchSearch && matchStatus && matchClient;
    });
  }, [state.invoices, state.clients, search, filterStatus, filterClient]);

  // KPI stats
  const totalUnpaid = state.invoices.filter(i => i.status === 'unpaid').reduce((s, i) => s + i.total, 0);
  const totalPaid   = state.invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0);
  const overdueCount = state.invoices.filter(i => i.status === 'overdue').length;

  return (
    <div className="space-y-6">
      {/* Mark Paid Modal */}
      {markPaidInvoice && (
        <MarkPaidModal
          invoice={markPaidInvoice}
          clientName={getClient(markPaidInvoice.client_id)?.company_name ?? '—'}
          onConfirm={(notes) => { onMarkPaid(markPaidInvoice.id, notes); setMarkPaidInvoice(null); }}
          onClose={() => setMarkPaidInvoice(null)}
        />
      )}

      {/* Invoice Form Modal */}
      {(showForm || editInvoice) && (
        <InvoiceForm
          clients={state.clients}
          existingInvoices={state.invoices}
          invoiceToEdit={editInvoice}
          onSave={(inv) => { onSaveInvoice(inv); setShowForm(false); setEditInvoice(undefined); }}
          onClose={() => { setShowForm(false); setEditInvoice(undefined); }}
        />
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Invoices', value: state.invoices.length.toString(), sub: 'all time', color: 'text-white', icon: FileText },
          { label: 'Outstanding', value: `R ${totalUnpaid.toLocaleString()}`, sub: 'unpaid balance', color: 'text-amber-400', icon: Clock },
          { label: 'Revenue Collected', value: `R ${totalPaid.toLocaleString()}`, sub: 'paid invoices', color: 'text-emerald-400', icon: DollarSign },
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

      {/* Toolbar */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full">
          {/* Search */}
          <div className="relative min-w-[220px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text" placeholder="Search invoice # or client…"
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-white font-mono placeholder-slate-600 focus:border-cyan-500 focus:outline-none"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>
          {/* Status filter */}
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer">
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
            <option value="overdue">Overdue</option>
          </select>
          {/* Client filter */}
          <select value={filterClient} onChange={e => setFilterClient(e.target.value)}
            className="px-3 py-2 bg-[#06080d] border border-[#1a2234] rounded-xl text-xs text-slate-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer">
            <option value="all">All Clients</option>
            {state.clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
          </select>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 text-xs font-extrabold rounded-xl shadow-md shrink-0">
            <Plus size={13} /> New Invoice
          </button>
        )}
      </div>

      {/* Invoice List */}
      <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] shadow-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <FileText size={24} className="text-slate-600 mx-auto" />
            <p className="text-xs text-slate-400 font-mono">No invoices found. Adjust filters or create one.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#1a2234]">
            {filtered.map(inv => {
              const client = getClient(inv.client_id);
              const isExpanded = expandedId === inv.id;
              return (
                <div key={inv.id}>
                  {/* Row */}
                  <div className="flex flex-wrap items-center gap-3 px-5 py-4 hover:bg-[#121826]/60 transition-colors">
                    {/* Expand toggle */}
                    <button onClick={() => setExpandedId(isExpanded ? null : inv.id)}
                      className="text-slate-400 hover:text-white shrink-0">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    {/* Number + client */}
                    <div className="flex-1 min-w-[160px]">
                      <p className="text-xs font-mono font-bold text-white">{inv.invoice_number}</p>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">{client?.company_name ?? 'Unknown'}</p>
                    </div>
                    {/* Status */}
                    <span className={`px-2.5 py-0.5 rounded font-mono text-[9px] uppercase font-bold border ${STATUS_STYLES[inv.status]}`}>
                      {inv.status}
                    </span>
                    {/* Dates */}
                    <div className="hidden sm:block font-mono text-[10px] text-slate-400">
                      <p>Issued: {inv.issued_date}</p>
                      <p>Due: {inv.due_date}</p>
                    </div>
                    {/* Total */}
                    <p className="font-mono font-bold text-emerald-400 text-sm">
                      R {inv.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                    </p>
                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      <button onClick={() => generateInvoicePDF(inv, client!)}
                        title="Download PDF"
                        className="p-1.5 bg-[#06080d] border border-[#1a2234] rounded-lg text-slate-400 hover:text-cyan-400 hover:border-cyan-800 transition-colors">
                        <Download size={13} />
                      </button>
                      {isAdmin && inv.status !== 'paid' && (
                        <button onClick={() => setMarkPaidInvoice(inv)}
                          title="Mark as Paid"
                          className="p-1.5 bg-emerald-950/50 border border-emerald-800/50 rounded-lg text-emerald-400 hover:bg-emerald-950 transition-colors">
                          <Check size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={() => setEditInvoice(inv)}
                          title="Edit"
                          className="p-1.5 hover:bg-[#1a2234] rounded-lg text-slate-400 hover:text-white transition-colors">
                          <Edit2 size={13} />
                        </button>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => { if (confirm(`Delete ${inv.invoice_number}? This cannot be undone.`)) onDeleteInvoice(inv.id); }}
                          title="Delete"
                          className="p-1.5 hover:bg-[#1a2234] rounded-lg text-slate-500 hover:text-rose-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Expanded line items */}
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
                          {inv.line_items.map(li => (
                            <tr key={li.id} className="border-b border-[#1a2234]/50 text-slate-300">
                              <td className="py-1.5">{li.description}</td>
                              <td className="py-1.5 text-center">{li.quantity}</td>
                              <td className="py-1.5 text-right">R {li.unit_price.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                              <td className="py-1.5 text-right text-emerald-400 font-bold">R {li.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="mt-3 text-right space-y-0.5 font-mono text-xs text-slate-400">
                        <p>Subtotal: R {inv.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                        <p>VAT ({inv.tax_rate}%): R {inv.tax_amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                        <p className="text-emerald-400 font-bold text-sm">Total: R {inv.total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                        {inv.payment_notes && <p className="text-slate-500 italic text-[10px]">Note: {inv.payment_notes}</p>}
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
```

---

## Step 7 — Wire Up `App.tsx`

### 7a. Add to state initialization

In `getInitialState()` inside `src/mockData.ts`, add `invoices: []`.

In `App.tsx`, update the initial `AppState`:
```typescript
const [state, setState] = useState<AppState>({
  ...getInitialState(),
  invoices: [],  // ← ADD
});
```

### 7b. Add handlers (paste alongside existing handlers in App.tsx)

```typescript
const handleSaveInvoice = async (invoice: Invoice) => {
  setState(prev => {
    const exists = prev.invoices.some(i => i.id === invoice.id);
    const updated = exists
      ? prev.invoices.map(i => (i.id === invoice.id ? invoice : i))
      : [...prev.invoices, invoice];
    return { ...prev, invoices: updated };
  });
  await supabaseService.saveInvoice(invoice);
};

const handleDeleteInvoice = async (id: string) => {
  setState(prev => ({ ...prev, invoices: prev.invoices.filter(i => i.id !== id) }));
  await supabaseService.deleteInvoice(id);
};

const handleMarkInvoicePaid = async (id: string, notes: string) => {
  setState(prev => ({
    ...prev,
    invoices: prev.invoices.map(i =>
      i.id === id
        ? { ...i, status: 'paid' as const, paid_at: new Date().toISOString(), payment_notes: notes }
        : i
    ),
  }));
  await supabaseService.markInvoicePaid(id, notes);
};
```

### 7c. Load invoices in `loadDbState()`

Inside the `loadDbState` useEffect, alongside the other Promise.all:

```typescript
const [clients, projects, retainers, documents, alertsLog, aiToolAccounts, invoices] =
  await Promise.all([
    supabaseService.getClients(),
    supabaseService.getProjects(),
    supabaseService.getRetainers(),
    supabaseService.getDocuments(),
    supabaseService.getAlertsLog(),
    supabaseService.getAIToolAccounts(),
    supabaseService.getInvoices(),   // ← ADD
  ]);

setState(prev => ({ ...prev, clients, projects, retainers, documents, alertsLog, aiToolAccounts, invoices }));
```

### 7d. Add the route in the JSX render block

```tsx
{currentTab === 'invoices_dash' && (
  <InvoicesDashboard
    state={state}
    isAdmin={state.isAdmin}
    onSaveInvoice={handleSaveInvoice}
    onDeleteInvoice={handleDeleteInvoice}
    onMarkPaid={handleMarkInvoicePaid}
  />
)}
```

### 7e. Add getTabTitle case

```typescript
case 'invoices_dash': return 'Invoice Command Centre';
```

---

## Step 8 — Update Sidebar (`src/components/Sidebar.tsx`)

```typescript
import { Receipt } from 'lucide-react'; // add to imports

// Add to navItems array (after github, code='10'):
{ id: 'invoices_dash', label: 'Invoicing', icon: Receipt, code: '10' },

// Also update the READY badge count: '10 READY'
```

---

## Step 9 — Edge Function: Invoice Reminders

Create `supabase/functions/invoice-reminders/index.ts`:

```typescript
// ====================================================================
// EDGE FUNCTION: invoice-reminders
// Runs daily via pg_cron. Scans for unpaid/overdue invoices past due
// date and sends reminder emails to clients via Resend API.
// Secrets required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRow {
  id: string;
  invoice_number: string;
  total: number;
  due_date: string;
  status: string;
  clients: {
    company_name: string;
    primary_contact_name: string;
    email: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      throw new Error("Missing Supabase environment secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Find all invoices that are unpaid AND past their due date
    const today = new Date().toISOString().split("T")[0];

    const { data: overdueInvoices, error: fetchError } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, total, due_date, status,
        clients ( company_name, primary_contact_name, email )
      `)
      .in("status", ["unpaid", "overdue"])
      .lt("due_date", today);   // due_date < today = overdue

    if (fetchError) throw fetchError;

    if (!overdueInvoices || overdueInvoices.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No overdue invoices found.", checkedDate: today }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${overdueInvoices.length} overdue invoice(s). Sending reminders...`);

    const results = [];

    for (const invoice of overdueInvoices as InvoiceRow[]) {
      const client = invoice.clients;
      const daysOverdue = Math.floor(
        (new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
      );

      // 2. Mark as overdue in DB
      await supabase
        .from("invoices")
        .update({ status: "overdue", updated_at: new Date().toISOString() })
        .eq("id", invoice.id)
        .eq("status", "unpaid");

      // 3. Send reminder email via Resend
      if (resendApiKey) {
        const emailBody = `
          <div style="font-family: Arial, sans-serif; background: #06080d; color: #e2e8f0; padding: 32px; border-radius: 12px; max-width: 520px; margin: 0 auto;">
            <div style="background: #0b0f19; border: 1px solid #1a2234; border-radius: 8px; padding: 24px;">
              <h2 style="color: #22d3ee; font-size: 14px; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 8px;">
                Payment Reminder
              </h2>
              <p style="font-size: 22px; font-weight: 900; color: #ffffff; margin: 0 0 24px;">
                Invoice ${invoice.invoice_number}
              </p>
              <table style="width: 100%; font-size: 13px; border-collapse: collapse; font-family: monospace;">
                <tr><td style="color: #94a3b8; padding: 6px 0;">Client</td><td style="color: #fff; text-align: right;">${client.company_name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Contact</td><td style="color: #fff; text-align: right;">${client.primary_contact_name}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Due Date</td><td style="color: #f87171; text-align: right;">${invoice.due_date}</td></tr>
                <tr><td style="color: #94a3b8; padding: 6px 0;">Days Overdue</td><td style="color: #f87171; font-weight: bold; text-align: right;">${daysOverdue} day${daysOverdue !== 1 ? 's' : ''}</td></tr>
                <tr style="border-top: 1px solid #1a2234;">
                  <td style="color: #94a3b8; padding: 10px 0 0;">Amount Due</td>
                  <td style="color: #34d399; font-weight: 900; font-size: 18px; text-align: right; padding-top: 10px;">
                    R ${Number(invoice.total).toLocaleString("en-ZA", { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </table>
              <p style="color: #64748b; font-size: 12px; margin-top: 24px; line-height: 1.6;">
                Please arrange payment at your earliest convenience. If you have any questions regarding this invoice, 
                please contact us directly at billing@conextsol.com.
              </p>
            </div>
            <p style="color: #334155; font-size: 11px; text-align: center; margin-top: 16px;">
              Conextsol Agency · conextsol.com
            </p>
          </div>
        `;

        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "billing@conextsol.com",           // Must be verified in Resend
            to: [client.email],
            subject: `Payment Reminder — ${invoice.invoice_number} (${daysOverdue}d overdue)`,
            html: emailBody,
          }),
        });

        if (resendResponse.ok) {
          // Update reminder_sent_at timestamp
          await supabase
            .from("invoices")
            .update({ reminder_sent_at: new Date().toISOString() })
            .eq("id", invoice.id);

          console.log(`Reminder sent to ${client.email} for ${invoice.invoice_number}`);
          results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, status: "sent", email: client.email });
        } else {
          const errText = await resendResponse.text();
          console.error(`Resend failed for ${invoice.invoice_number}:`, errText);
          results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, status: "failed", error: errText });
        }
      } else {
        console.warn(`RESEND_API_KEY not set. Reminder simulated for ${invoice.invoice_number}`);
        results.push({ invoiceId: invoice.id, invoiceNumber: invoice.invoice_number, status: "simulated" });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checkedDate: today, overdueCount: overdueInvoices.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (error: any) {
    console.error("invoice-reminders edge function error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
```

### Deploy the function

```bash
# From project root
supabase functions deploy invoice-reminders
```

### Add Resend API Key to Supabase Secrets

```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxxxxxx
```

Or in **Supabase Dashboard → Settings → Edge Function Secrets → Add new secret**.

### Schedule daily with pg_cron

Run in Supabase SQL Editor:

```sql
-- Requires pg_cron extension (enabled by default on Supabase)
SELECT cron.schedule(
  'invoice-reminders-daily',
  '0 8 * * *',    -- 08:00 UTC every day
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/invoice-reminders',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
```

### Add manual trigger to App.tsx (alongside existing `handleRunDeadlineAlerts`)

```typescript
const handleRunInvoiceReminders = async () => {
  try {
    if (!isSupabaseConfigured || !supabase) throw new Error('Supabase not configured.');
    const { data, error } = await supabase.functions.invoke('invoice-reminders');
    if (error) throw error;

    const alert: WebhookAlert = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: 'deadline',
      title: 'Invoice Reminder Scan Executed',
      message: `📧 Reminder check: ${data?.overdueCount ?? 0} overdue invoice(s) processed. Emails dispatched via Resend.`,
      recipient: 'Client Email Addresses (via Resend)',
      status: 'sent',
    };
    setState(prev => ({ ...prev, alertsLog: [alert, ...prev.alertsLog] }));
    await supabaseService.saveAlert(alert);
  } catch (err: any) {
    console.error('invoice-reminders invocation failed:', err);
  }
};
```

---

## Step 10 — Resend Domain Verification

1. Log in at [resend.com](https://resend.com) → **Domains** → Add `conextsol.com`
2. Add the DNS records (SPF, DKIM, DMARC) Resend provides to your domain registrar
3. Verify the domain (takes 2–10 mins)
4. Set `from: "billing@conextsol.com"` in the Edge Function — this address **must** be on your verified domain

---

## File Change Summary

| File | Action |
|---|---|
| `supabase-schema.sql` | Append invoices table + sequence + RLS |
| `src/types.ts` | Add `InvoiceLineItem`, `Invoice`, update `AppState` |
| `src/lib/invoicePDF.ts` | **New** — jsPDF generator |
| `src/supabaseService.ts` | Add invoice CRUD methods |
| `src/components/InvoicesDashboard.tsx` | **New** — full admin panel component |
| `src/App.tsx` | Add state, 3 handlers, load in useEffect, route, tab title |
| `src/components/Sidebar.tsx` | Add `invoices_dash` nav entry |
| `supabase/functions/invoice-reminders/index.ts` | **New** — Deno edge function |
| `package.json` | Add `jspdf` + `jspdf-autotable` |

---

---

# AI Coding Assistant Prompt

> Copy this entire block into Codex, Cursor, or any AI coding assistant to execute the implementation.

---

```
TASK: Integrate a custom invoicing system into the Conextsol Agency admin panel.

REPO: https://github.com/stoner4kt/Conextsol-Agencyv2 (main branch)
STACK: React 19, TypeScript, Vite, Tailwind CSS v4, Supabase (PostgreSQL + Deno Edge Functions), Lucide React, LocalStorage fallback pattern.
STYLE SYSTEM: Dark-only. Background #06080d, surface #0b0f19, border #1a2234. Primary accent: cyan-400 (#22d3ee). Emerald for success/paid. Amber for warnings/unpaid. Rose for errors/overdue. All inputs use bg-[#06080d] border border-[#1a2234] rounded-xl font-mono text-xs focus:border-cyan-500 focus:outline-none. All primary action buttons use bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-extrabold rounded-xl.

IMPORTANT PATTERNS TO FOLLOW:
- The app uses a dual persistence strategy: Supabase when isSupabaseConfigured is true, otherwise falls back to getLocalCollection/saveLocalCollection (localStorage). Every new CRUD method must implement BOTH paths.
- Admin guard: auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR = 'reeqieric41@gmail.com'. Apply this pattern to ALL new RLS policies.
- Currency is South African Rand (R). Use toLocaleString('en-ZA', { minimumFractionDigits: 2 }) throughout.
- Tab routing is handled by currentTab state string in App.tsx. Each new view = a new string case.
- Edge functions follow the pattern in supabase/functions/deadline-alerts/index.ts: Deno serve, createClient with service role, CORS preflight, try/catch with JSON error response.
- All components receive state: AppState and isAdmin: boolean as props. Write-actions are callbacks passed from App.tsx.

IMPLEMENT THE FOLLOWING IN ORDER:

═══════════════════════════════════════════════════════════
1. DATABASE MIGRATION — append to supabase-schema.sql
═══════════════════════════════════════════════════════════

Add this SQL:

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT NOT NULL UNIQUE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
  line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  tax_rate NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  tax_amount NUMERIC(12, 2) GENERATED ALWAYS AS (ROUND(subtotal * tax_rate / 100, 2)) STORED,
  total NUMERIC(12, 2) GENERATED ALWAYS AS (subtotal + ROUND(subtotal * tax_rate / 100, 2)) STORED,
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid', 'overdue', 'draft')),
  due_date DATE NOT NULL,
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  paid_at TIMESTAMPTZ,
  payment_notes TEXT,
  reminder_sent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins have full access to invoices" ON invoices FOR ALL TO authenticated
  USING (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' LIKE '%@conextsol.com' OR auth.jwt() ->> 'email' = 'reeqieric41@gmail.com');
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1;

═══════════════════════════════════════════════════════════
2. TYPES — src/types.ts
═══════════════════════════════════════════════════════════

Append these interfaces to the end of src/types.ts:

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  amount: number; // quantity * unit_price
}

export interface Invoice {
  id: string;
  invoice_number: string;        // format: "INV-YYYY-NNNN"
  client_id: string;             // FK → clients.id
  line_items: InvoiceLineItem[];
  subtotal: number;
  tax_rate: number;              // percentage (e.g. 15)
  tax_amount: number;            // computed
  total: number;                 // computed
  status: 'unpaid' | 'paid' | 'overdue' | 'draft';
  due_date: string;              // YYYY-MM-DD
  issued_date: string;           // YYYY-MM-DD
  paid_at: string | null;
  payment_notes: string | null;
  reminder_sent_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

Then in the existing AppState interface, add: invoices: Invoice[];

═══════════════════════════════════════════════════════════
3. INSTALL DEPENDENCIES
═══════════════════════════════════════════════════════════

Run: npm install jspdf jspdf-autotable
Do NOT add @react-pdf/renderer. Use jsPDF only.

═══════════════════════════════════════════════════════════
4. PDF GENERATOR — src/lib/invoicePDF.ts (NEW FILE)
═══════════════════════════════════════════════════════════

Create src/lib/invoicePDF.ts. Export one function:
  generateInvoicePDF(invoice: Invoice, client: Client): void

The function must:
- Use jsPDF (portrait, A4, mm units) + jspdf-autotable
- Header: dark fill (#06080d), white "CONEXTSOL" text left, cyan "INVOICE" + invoice_number right
- A status badge (emerald=paid, amber=unpaid, rose=overdue, slate=draft)
- Issued date, due date, paid date (if paid) in one row
- "BILL TO" block: company_name, primary_contact_name, email, phone
- Line items table via autoTable: columns Description / Qty / Unit Price / Amount. Head row uses fillColor [11,15,25], textColor [100,180,210]. Striped body.
- Totals block (right-aligned): Subtotal, VAT (tax_rate%), separator line, TOTAL in cyan
- Payment notes in italic if present
- Footer bar: dark fill, "Conextsol Agency · conextsol.com" left, "Generated DATE · invoice_number" right
- Save as: `${invoice_number}_${company_name_underscored}.pdf`
- All currency formatted: R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}

═══════════════════════════════════════════════════════════
5. SERVICE LAYER — src/supabaseService.ts
═══════════════════════════════════════════════════════════

Add these methods to the supabaseService object (before closing `}`):
  const INVOICES_KEY = 'conextsol_invoices'; (add near other key constants at top)

  async getInvoices(): Promise<Invoice[]>
    — Supabase: select * from invoices order by issued_date desc, parse line_items as JSON array
    — LocalStorage fallback: getLocalCollection(INVOICES_KEY, [])

  async saveInvoice(invoice: Invoice): Promise<void>
    — Supabase: upsert all fields except computed columns (tax_amount, total)
    — LocalStorage fallback: upsert by id

  async deleteInvoice(id: string): Promise<void>
    — Supabase: delete where id=id
    — LocalStorage fallback: filter out

  async markInvoicePaid(id: string, notes: string): Promise<void>
    — Supabase: update status='paid', paid_at=now(), payment_notes=notes where id=id
    — LocalStorage fallback: map and update the record

Also add localStorage.removeItem(INVOICES_KEY) to clearAllData() and
saveLocalCollection(INVOICES_KEY, []) to seedDemoData().

═══════════════════════════════════════════════════════════
6. MAIN DASHBOARD COMPONENT — src/components/InvoicesDashboard.tsx (NEW FILE)
═══════════════════════════════════════════════════════════

Props: { state: AppState; isAdmin: boolean; onSaveInvoice: (inv: Invoice)=>void; onDeleteInvoice: (id: string)=>void; onMarkPaid: (id: string, notes: string)=>void }

SUBCOMPONENTS TO BUILD INSIDE THE SAME FILE:

A) InvoiceForm (modal)
- Fields: client select, status select (draft/unpaid/paid/overdue), issued_date input[type=date], due_date input[type=date], tax_rate number input (default 15)
- Dynamic line items: array of { description text input, quantity number, unit_price number, computed amount display }. "Add line item" button. Remove button per row (disabled if only 1 row).
- Live computed totals: subtotal = sum(amounts), tax = subtotal*taxRate/100, total = subtotal+tax. Display right-aligned.
- Internal notes textarea (admin only)
- Invoice number auto-generated as "INV-YYYY-NNNN" where NNNN is max existing number + 1, padded to 4 digits
- Validation: client required, due_date required, all descriptions non-empty
- Save builds a full Invoice object with crypto.randomUUID() id and calls onSave prop

B) MarkPaidModal
- Shows invoice_number, client company_name, total
- Optional textarea for payment verification notes
- "Confirm Payment" button calls onConfirm(notes)

C) InvoicesDashboard (default export)
State: search (string), filterStatus (string, default 'all'), filterClient (string, default 'all'), showForm (bool), editInvoice (Invoice|undefined), markPaidInvoice (Invoice|null), expandedId (string|null)

KPI CARDS ROW (4 cards, matching RetainersDashboard style):
- "Total Invoices" — count of all invoices
- "Outstanding" — sum of total where status=unpaid, amber text
- "Revenue Collected" — sum where status=paid, emerald text
- "Overdue" — count where status=overdue, rose text

TOOLBAR:
- Text search input with Search icon (lucide) — searches invoice_number AND client company_name AND primary_contact_name (case-insensitive, OR logic)
- Status filter select: All Statuses / Draft / Unpaid / Paid / Overdue
- Client filter select: All Clients + one option per client in state.clients
- "New Invoice" button (admin only) — opens InvoiceForm modal

FILTERING: use useMemo combining all three filters

INVOICE LIST (accordion rows):
Each row shows: expand toggle (ChevronDown/Up), invoice_number + company_name, status badge, issued_date + due_date, total in emerald, action buttons:
  - Download PDF (Download icon) — calls generateInvoicePDF(invoice, client)
  - Mark Paid (Check icon, emerald, hidden when already paid, admin only) — opens MarkPaidModal
  - Edit (Edit2, admin only) — opens InvoiceForm with invoiceToEdit
  - Delete (Trash2, admin only) — confirm dialog then onDeleteInvoice

STATUS BADGE STYLES:
  paid:    'bg-emerald-950/80 text-emerald-400 border-emerald-800'
  unpaid:  'bg-amber-950/80 text-amber-400 border-amber-800'
  overdue: 'bg-rose-950/80 text-rose-400 border-rose-800'
  draft:   'bg-slate-800/80 text-slate-400 border-slate-700'

EXPANDED ROW: shows a mini table of line items (description, qty, unit price, amount) + right-aligned totals block + payment_notes in italic

Empty state: FileText icon + "No invoices found." message

═══════════════════════════════════════════════════════════
7. APP.TSX CHANGES
═══════════════════════════════════════════════════════════

a) Import InvoicesDashboard from './components/InvoicesDashboard'
b) Import Invoice from './types'

c) In the useState<AppState> initializer, add invoices: [] to the initial value

d) Add to the Promise.all in loadDbState useEffect:
   supabaseService.getInvoices()
   Destructure as invoices and add to setState call

e) Add three handlers:
   handleSaveInvoice(invoice: Invoice) — optimistic state update + supabaseService.saveInvoice(invoice)
   handleDeleteInvoice(id: string) — optimistic filter + supabaseService.deleteInvoice(id)
   handleMarkInvoicePaid(id: string, notes: string) — optimistic status update + supabaseService.markInvoicePaid(id, notes)

f) Add case to getTabTitle(): 'invoices_dash': return 'Invoice Command Centre'

g) Add route in the JSX render block (alongside other currentTab === '...' blocks):
   {currentTab === 'invoices_dash' && (
     <InvoicesDashboard
       state={state}
       isAdmin={state.isAdmin}
       onSaveInvoice={handleSaveInvoice}
       onDeleteInvoice={handleDeleteInvoice}
       onMarkPaid={handleMarkInvoicePaid}
     />
   )}

═══════════════════════════════════════════════════════════
8. SIDEBAR.TSX CHANGES
═══════════════════════════════════════════════════════════

a) Add Receipt to the lucide-react import
b) Add to navItems array: { id: 'invoices_dash', label: 'Invoicing', icon: Receipt, code: '10' }
c) Update the READY badge text from '9 READY' to '10 READY'

═══════════════════════════════════════════════════════════
9. EDGE FUNCTION — supabase/functions/invoice-reminders/index.ts (NEW FILE)
═══════════════════════════════════════════════════════════

Pattern: mirror supabase/functions/deadline-alerts/index.ts exactly.

Logic:
1. Initialize Supabase client with service role key (bypasses RLS)
2. Get today's date as YYYY-MM-DD string
3. Query invoices where status IN ('unpaid','overdue') AND due_date < today
   Join clients: select company_name, primary_contact_name, email
4. For each result:
   a. UPDATE invoices SET status='overdue', updated_at=now() WHERE id=invoice.id AND status='unpaid'
   b. Calculate daysOverdue = floor((today - due_date) / 86400000)
   c. POST to https://api.resend.com/emails with:
      - Authorization: Bearer ${RESEND_API_KEY}
      - from: "billing@conextsol.com"
      - to: [client.email]
      - subject: `Payment Reminder — ${invoice_number} (${daysOverdue}d overdue)`
      - html: a dark-themed branded HTML email showing invoice_number, company_name, due_date, daysOverdue, total (R formatted)
   d. If Resend succeeds: UPDATE invoices SET reminder_sent_at=now() WHERE id=invoice.id
   e. If RESEND_API_KEY not set: log simulated, add status='simulated' to results
5. Return JSON: { success, checkedDate, overdueCount, results[] }

Required env secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY

═══════════════════════════════════════════════════════════
CONSTRAINTS
═══════════════════════════════════════════════════════════
- Do NOT modify any existing component except App.tsx and Sidebar.tsx
- Do NOT change existing Supabase RLS policies — only ADD new ones
- Do NOT use React Router — tab routing must remain the currentTab string pattern
- Do NOT use useState for forms with HTML <form> submit — use onClick handlers
- Match ALL styling exactly: bg-[#0b0f19] surfaces, border-[#1a2234] borders, font-mono for data, font-display font-extrabold for headings, text-xs as base size
- All number inputs for currency must use type="number" min="0" step="0.01"
- The PDF download must be triggered entirely client-side (no server call)
- The invoice_number auto-generation must read from state.invoices (passed as existingInvoices prop to InvoiceForm), NOT from a separate API call
```
