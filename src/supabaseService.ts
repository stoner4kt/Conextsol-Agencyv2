import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Client, Project, Retainer, DocumentAndNote, WebhookAlert } from './types';
import { 
  INITIAL_CLIENTS, 
  INITIAL_PROJECTS, 
  INITIAL_RETAINERS, 
  INITIAL_DOCUMENTS, 
  INITIAL_ALERTS 
} from './mockData';

const CLIENTS_KEY = 'conextsol_clients';
const PROJECTS_KEY = 'conextsol_projects';
const RETAINERS_KEY = 'conextsol_retainers';
const DOCS_KEY = 'conextsol_documents';
const ALERTS_STORAGE_KEY = 'conextsol_alerts_log';

// Helper for local storage reading with default initial dataset
function getLocalCollection<T>(key: string, initialDefault: T[]): T[] {
  try {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(initialDefault));
      return initialDefault;
    }
    return JSON.parse(data);
  } catch {
    return initialDefault;
  }
}

function saveLocalCollection<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.warn(`Failed to save local collection ${key}:`, err);
  }
}

export const supabaseService = {
  // CLIENTS CRUD
  async getClients(): Promise<Client[]> {
    if (!isSupabaseConfigured || !supabase) {
      return getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
    }
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company_name', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to LocalStorage:', err);
      return getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
    }
  },

  async saveClient(client: Client): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
      const exists = current.some(c => c.id === client.id);
      const updated = exists ? current.map(c => c.id === client.id ? client : c) : [...current, client];
      saveLocalCollection(CLIENTS_KEY, updated);
      return;
    }
    try {
      const { error } = await supabase
        .from('clients')
        .upsert({
          id: client.id,
          company_name: client.company_name,
          primary_contact_name: client.primary_contact_name,
          email: client.email,
          phone: client.phone,
          status: client.status,
          created_at: client.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase save failed, saving to LocalStorage:', err);
      const current = getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
      const exists = current.some(c => c.id === client.id);
      const updated = exists ? current.map(c => c.id === client.id ? client : c) : [...current, client];
      saveLocalCollection(CLIENTS_KEY, updated);
    }
  },

  async deleteClient(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
      saveLocalCollection(CLIENTS_KEY, current.filter(c => c.id !== id));
      return;
    }
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, removing from LocalStorage:', err);
      const current = getLocalCollection<Client>(CLIENTS_KEY, INITIAL_CLIENTS);
      saveLocalCollection(CLIENTS_KEY, current.filter(c => c.id !== id));
    }
  },

  // PROJECTS CRUD
  async getProjects(): Promise<Project[]> {
    if (!isSupabaseConfigured || !supabase) {
      return getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
    }
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('project_name', { ascending: true });
      
      if (error) throw error;

      return (data || []).map(p => ({
        ...p,
        services_listed: Array.isArray(p.services_listed) 
          ? p.services_listed 
          : typeof p.services_listed === 'string'
            ? JSON.parse(p.services_listed)
            : [],
        associated_emails: Array.isArray(p.associated_emails)
          ? p.associated_emails
          : typeof p.associated_emails === 'string'
            ? JSON.parse(p.associated_emails)
            : []
      }));
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to LocalStorage:', err);
      return getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
    }
  },

  async saveProject(project: Project): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
      const exists = current.some(p => p.id === project.id);
      const updated = exists ? current.map(p => p.id === project.id ? project : p) : [...current, project];
      saveLocalCollection(PROJECTS_KEY, updated);
      return;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .upsert({
          id: project.id,
          client_id: project.client_id,
          project_name: project.project_name,
          start_date: project.start_date,
          end_date: project.end_date,
          invoiced_amount: project.invoiced_amount,
          short_note: project.short_note,
          staging_url: project.staging_url,
          production_url: project.production_url,
          github_url: project.github_url,
          services_listed: project.services_listed,
          associated_emails: project.associated_emails,
          created_at: project.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase save failed, saving to LocalStorage:', err);
      const current = getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
      const exists = current.some(p => p.id === project.id);
      const updated = exists ? current.map(p => p.id === project.id ? project : p) : [...current, project];
      saveLocalCollection(PROJECTS_KEY, updated);
    }
  },

  async deleteProject(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
      saveLocalCollection(PROJECTS_KEY, current.filter(p => p.id !== id));
      return;
    }
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, removing from LocalStorage:', err);
      const current = getLocalCollection<Project>(PROJECTS_KEY, INITIAL_PROJECTS);
      saveLocalCollection(PROJECTS_KEY, current.filter(p => p.id !== id));
    }
  },

  // RETAINERS CRUD
  async getRetainers(): Promise<Retainer[]> {
    if (!isSupabaseConfigured || !supabase) {
      return getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
    }
    try {
      const { data, error } = await supabase
        .from('retainers')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to LocalStorage:', err);
      return getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
    }
  },

  async saveRetainer(retainer: Retainer): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
      const exists = current.some(r => r.id === retainer.id);
      const updated = exists ? current.map(r => r.id === retainer.id ? retainer : r) : [...current, retainer];
      saveLocalCollection(RETAINERS_KEY, updated);
      return;
    }
    try {
      const { error } = await supabase
        .from('retainers')
        .upsert({
          id: retainer.id,
          client_id: retainer.client_id,
          service_type: retainer.service_type,
          billing_amount: retainer.billing_amount,
          billing_cycle_day: retainer.billing_cycle_day,
          is_active: retainer.is_active,
          created_at: retainer.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase save failed, saving to LocalStorage:', err);
      const current = getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
      const exists = current.some(r => r.id === retainer.id);
      const updated = exists ? current.map(r => r.id === retainer.id ? retainer : r) : [...current, retainer];
      saveLocalCollection(RETAINERS_KEY, updated);
    }
  },

  async deleteRetainer(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
      saveLocalCollection(RETAINERS_KEY, current.filter(r => r.id !== id));
      return;
    }
    try {
      const { error } = await supabase
        .from('retainers')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, removing from LocalStorage:', err);
      const current = getLocalCollection<Retainer>(RETAINERS_KEY, INITIAL_RETAINERS);
      saveLocalCollection(RETAINERS_KEY, current.filter(r => r.id !== id));
    }
  },

  // DOCUMENTS CRUD
  async getDocuments(): Promise<DocumentAndNote[]> {
    if (!isSupabaseConfigured || !supabase) {
      return getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
    }
    try {
      const { data, error } = await supabase
        .from('documents_and_notes')
        .select('*')
        .order('title', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.warn('Supabase fetch failed, falling back to LocalStorage:', err);
      return getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
    }
  },

  async saveDocument(doc: DocumentAndNote): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
      const exists = current.some(d => d.id === doc.id);
      const updated = exists ? current.map(d => d.id === doc.id ? doc : d) : [...current, doc];
      saveLocalCollection(DOCS_KEY, updated);
      return;
    }
    try {
      const { error } = await supabase
        .from('documents_and_notes')
        .upsert({
          id: doc.id,
          project_id: doc.project_id,
          title: doc.title,
          content: doc.content,
          file_references: doc.file_references,
          created_at: doc.created_at,
          updated_at: new Date().toISOString()
        });
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase save failed, saving to LocalStorage:', err);
      const current = getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
      const exists = current.some(d => d.id === doc.id);
      const updated = exists ? current.map(d => d.id === doc.id ? doc : d) : [...current, doc];
      saveLocalCollection(DOCS_KEY, updated);
    }
  },

  async deleteDocument(id: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
      const current = getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
      saveLocalCollection(DOCS_KEY, current.filter(d => d.id !== id));
      return;
    }
    try {
      const { error } = await supabase
        .from('documents_and_notes')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      console.warn('Supabase delete failed, removing from LocalStorage:', err);
      const current = getLocalCollection<DocumentAndNote>(DOCS_KEY, INITIAL_DOCUMENTS);
      saveLocalCollection(DOCS_KEY, current.filter(d => d.id !== id));
    }
  },

  // ALERTS LOG
  async getAlertsLog(): Promise<WebhookAlert[]> {
    return getLocalCollection<WebhookAlert>(ALERTS_STORAGE_KEY, INITIAL_ALERTS);
  },

  async saveAlert(alert: WebhookAlert): Promise<void> {
    const list = getLocalCollection<WebhookAlert>(ALERTS_STORAGE_KEY, INITIAL_ALERTS);
    list.unshift(alert);
    saveLocalCollection(ALERTS_STORAGE_KEY, list.slice(0, 100));
  },

  async clearAlertsLog(): Promise<void> {
    localStorage.removeItem(ALERTS_STORAGE_KEY);
  },

  // SEED & WIPE
  async seedDemoData(): Promise<void> {
    saveLocalCollection(CLIENTS_KEY, INITIAL_CLIENTS);
    saveLocalCollection(PROJECTS_KEY, INITIAL_PROJECTS);
    saveLocalCollection(RETAINERS_KEY, INITIAL_RETAINERS);
    saveLocalCollection(DOCS_KEY, INITIAL_DOCUMENTS);
    saveLocalCollection(ALERTS_STORAGE_KEY, INITIAL_ALERTS);
  },

  async clearAllData(): Promise<void> {
    localStorage.removeItem(CLIENTS_KEY);
    localStorage.removeItem(PROJECTS_KEY);
    localStorage.removeItem(RETAINERS_KEY);
    localStorage.removeItem(DOCS_KEY);
    localStorage.removeItem(ALERTS_STORAGE_KEY);
  }
};

