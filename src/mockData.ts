import { AppState, Client, Project, Retainer, DocumentAndNote, WebhookAlert, AIToolAccount, Invoice, RecurringExpense, ExpenseEntry } from './types';

export const INITIAL_CLIENTS: Client[] = [];
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_RETAINERS: Retainer[] = [];
export const INITIAL_DOCUMENTS: DocumentAndNote[] = [];
export const INITIAL_ALERTS: WebhookAlert[] = [];
export const INITIAL_AI_TOOL_ACCOUNTS: AIToolAccount[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_RECURRING_EXPENSES: RecurringExpense[] = [];
export const INITIAL_EXPENSE_ENTRIES: ExpenseEntry[] = [];

export function getInitialState(): AppState {
  return {
    clients: INITIAL_CLIENTS,
    projects: INITIAL_PROJECTS,
    retainers: INITIAL_RETAINERS,
    documents: INITIAL_DOCUMENTS,
    alertsLog: INITIAL_ALERTS,
    aiToolAccounts: INITIAL_AI_TOOL_ACCOUNTS,
    invoices: INITIAL_INVOICES,
    recurringExpenses: INITIAL_RECURRING_EXPENSES,
    expenseEntries: INITIAL_EXPENSE_ENTRIES,
    isAdmin: true,
    userEmail: 'admin@conextsol.com',
  };
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem('conextsol_clients', JSON.stringify(state.clients));
    localStorage.setItem('conextsol_projects', JSON.stringify(state.projects));
    localStorage.setItem('conextsol_retainers', JSON.stringify(state.retainers));
    localStorage.setItem('conextsol_documents', JSON.stringify(state.documents));
    localStorage.setItem('conextsol_alerts_log', JSON.stringify(state.alertsLog));
    localStorage.setItem('conextsol_ai_tool_accounts', JSON.stringify(state.aiToolAccounts));
    localStorage.setItem('conextsol_invoices', JSON.stringify(state.invoices));
    localStorage.setItem('conextsol_recurring_expenses', JSON.stringify(state.recurringExpenses));
    localStorage.setItem('conextsol_expense_entries', JSON.stringify(state.expenseEntries));
  } catch (err) {
    console.warn('Unable to persist state to LocalStorage:', err);
  }
}
