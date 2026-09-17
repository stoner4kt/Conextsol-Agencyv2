import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Wallet, Calendar, ToggleLeft, ToggleRight, TrendingDown, X, Save } from 'lucide-react';
import { AppState, RecurringExpense, ExpenseEntry } from '../types';

interface Props {
  state: AppState;
  isAdmin: boolean;
  onSaveRecurringExpense: (expense: RecurringExpense) => Promise<void>;
  onDeleteRecurringExpense: (id: string) => Promise<void>;
}

function monthLabel(iso: string) {
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' });
}

function monthStart() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export default function ExpensesDashboard({ state, isAdmin, onSaveRecurringExpense, onDeleteRecurringExpense }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState(monthStart());
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const list = state.recurringExpenses || [];
  const entries = state.expenseEntries || [];
  const active = list.filter(e => e.is_active);
  const burn = active.reduce((s, e) => s + e.amount, 0);

  const byMonth = useMemo(() => {
    const m = new Map<string, ExpenseEntry[]>();
    for (const e of entries) {
      if (!m.has(e.expense_month)) m.set(e.expense_month, []);
      m.get(e.expense_month)!.push(e);
    }
    return Array.from(m.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [entries]);

  const openCreate = () => {
    setEditing(null); setDescription(''); setAmount(''); setStartDate(monthStart()); setNotes(''); setIsActive(true); setShowForm(true);
  };

  const openEdit = (ex: RecurringExpense) => {
    setEditing(ex); setDescription(ex.description); setAmount(String(ex.amount));
    setStartDate(ex.start_date.slice(0, 10)); setNotes(ex.notes ?? ''); setIsActive(ex.is_active); setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsed = Number(amount);
    if (!description.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    setSaving(true);
    const now = new Date().toISOString();
    try {
      await onSaveRecurringExpense({
        id: editing?.id ?? crypto.randomUUID(),
        description: description.trim(),
        amount: parsed,
        start_date: startDate.slice(0, 10),
        is_active: isActive,
        notes: notes.trim() || null,
        created_at: editing?.created_at ?? now,
        updated_at: now,
      });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  const inp = 'w-full px-3 py-2 bg-[#070a12] border border-[#1a2234] rounded-lg text-sm text-white font-mono focus:outline-none focus:border-cyan-500/50';
  const lbl = 'block text-[11px] font-mono text-slate-400 mb-1';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Monthly burn</p>
            <h4 className="text-2xl font-display font-extrabold text-rose-400">R {burn.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-1">{active.length} active recurring</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-rose-500/20 text-rose-400 flex items-center justify-center"><TrendingDown size={20} /></div>
        </div>
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Templates</p>
            <h4 className="text-2xl font-display font-extrabold text-white">{list.length}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-1">Day 1 cycle</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-cyan-500/20 text-cyan-400 flex items-center justify-center"><Wallet size={20} /></div>
        </div>
        <div className="bg-[#0b0f19] rounded-xl border border-[#1a2234] p-5 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">Posted entries</p>
            <h4 className="text-2xl font-display font-extrabold text-white">{entries.length}</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-1">All months</p>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#101726] border border-amber-500/20 text-amber-400 flex items-center justify-center"><Calendar size={20} /></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-display font-bold text-white">Recurring expenses</h2>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Set once - applied on the 1st of every month. Subtracted from monthly profits.</p>
        </div>
        {isAdmin && (
          <button onClick={openCreate} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-mono font-bold">
            <Plus size={14} /> Add expense
          </button>
        )}
      </div>

      <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <p className="p-8 text-center text-xs text-slate-500">No recurring expenses yet. Add one to start subtracting monthly costs from profits.</p>
        ) : (
          <ul className="divide-y divide-[#1a2234]">
            {list.map(ex => (
              <li key={ex.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 hover:bg-[#0e1422]/60">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${ex.is_active ? 'text-white' : 'text-slate-500 line-through'}`}>{ex.description}</span>
                    <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded border ${ex.is_active ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                      {ex.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-slate-400">
                    R {ex.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })} / month · starts {monthLabel(ex.start_date)}
                    {ex.notes ? ` · ${ex.notes}` : ''}
                  </p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => onSaveRecurringExpense({ ...ex, is_active: !ex.is_active, updated_at: new Date().toISOString() })} className="p-2 rounded-lg border border-[#1a2234] text-slate-400 hover:text-cyan-400">
                      {ex.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                    </button>
                    <button onClick={() => openEdit(ex)} className="px-2.5 py-1.5 rounded-lg border border-[#1a2234] text-[11px] font-mono text-slate-300">Edit</button>
                    <button onClick={() => onDeleteRecurringExpense(ex.id)} className="p-2 rounded-lg border border-[#1a2234] text-slate-400 hover:text-rose-400"><Trash2 size={14} /></button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h3 className="text-sm font-display font-bold text-white mb-3">Posted monthly entries</h3>
        {byMonth.length === 0 ? (
          <p className="text-xs text-slate-500 bg-[#0b0f19] border border-[#1a2234] rounded-xl p-6 text-center">
            Entries appear automatically for each month after the expense start date.
          </p>
        ) : (
          <div className="space-y-3">
            {byMonth.map(([month, items]) => {
              const total = items.reduce((s, e) => s + e.amount, 0);
              return (
                <div key={month} className="bg-[#0b0f19] border border-[#1a2234] rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono font-semibold text-cyan-400">{monthLabel(month)}</span>
                    <span className="text-xs font-mono text-rose-400">- R {total.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <ul className="space-y-1">
                    {items.map(entry => (
                      <li key={entry.id} className="flex justify-between text-[11px] text-slate-400 font-mono">
                        <span>{entry.description}</span>
                        <span>R {entry.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0f19] border border-[#1a2234] rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-[#1a2234]">
              <h3 className="text-sm font-display font-bold text-white">{editing ? 'Edit recurring expense' : 'New recurring expense'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white"><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className={lbl}>Description</label>
                <input value={description} onChange={e => setDescription(e.target.value)} required placeholder="e.g. Office rent" className={inp} />
              </div>
              <div>
                <label className={lbl}>Amount (R)</label>
                <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} required className={inp} />
              </div>
              <div>
                <label className={lbl}>Start month (applies on the 1st)</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required className={inp} />
              </div>
              <div>
                <label className={lbl}>Notes (optional)</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} className={inp} />
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded border-slate-600" />
                Active (generate monthly entries)
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-3 py-2 rounded-lg border border-[#1a2234] text-xs font-mono text-slate-300">Cancel</button>
                <button type="submit" disabled={saving} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-cyan-500 text-slate-950 text-xs font-mono font-bold disabled:opacity-50">
                  <Save size={14} /> {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
