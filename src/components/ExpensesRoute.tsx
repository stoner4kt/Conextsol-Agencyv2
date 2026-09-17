import React from 'react';
import ExpensesDashboard from './ExpensesDashboard';
import { AppState, RecurringExpense } from '../types';
import { supabaseService } from '../supabaseService';

interface Props {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
}

export default function ExpensesRoute({ state, setState }: Props) {
  const handleSaveRecurringExpense = async (expense: RecurringExpense) => {
    setState(prev => {
      const list = prev.recurringExpenses || [];
      const exists = list.some(e => e.id === expense.id);
      const recurringExpenses = exists
        ? list.map(e => e.id === expense.id ? expense : e)
        : [...list, expense];
      return { ...prev, recurringExpenses };
    });
    try {
      await supabaseService.saveRecurringExpense(expense);
      const entries = await supabaseService.ensureMonthlyExpenseEntries(
        [expense],
        await supabaseService.getExpenseEntries()
      );
      setState(prev => ({ ...prev, expenseEntries: entries }));
    } catch (err) {
      console.warn('Expense save failed:', err);
    }
  };

  const handleDeleteRecurringExpense = async (id: string) => {
    setState(prev => ({
      ...prev,
      recurringExpenses: (prev.recurringExpenses || []).filter(e => e.id !== id)
    }));
    try {
      await supabaseService.deleteRecurringExpense(id);
    } catch (err) {
      console.warn('Expense delete failed:', err);
    }
  };

  return (
    <ExpensesDashboard
      state={state}
      isAdmin={state.isAdmin}
      onSaveRecurringExpense={handleSaveRecurringExpense}
      onDeleteRecurringExpense={handleDeleteRecurringExpense}
    />
  );
}
