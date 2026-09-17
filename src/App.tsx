import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  ShieldCheck, 
  LogOut, 
  Mail, 
  Menu,
  Activity,
  Cpu,
  Radio,
  Clock
} from 'lucide-react';
import { AppState, Client, Project, Retainer, DocumentAndNote, WebhookAlert, AIToolAccount, Invoice } from './types';
import { 
  getInitialState
} from './mockData';
import Sidebar from './components/Sidebar';
import DashboardStats from './components/DashboardStats';
import OnboardingWizard from './components/OnboardingWizard';
import ClientDetail from './components/ClientDetail';
import DocumentEditor from './components/DocumentEditor';
import ClientsDashboard from './components/ClientsDashboard';
import ProjectsDashboard from './components/ProjectsDashboard';
import RetainersDashboard from './components/RetainersDashboard';
import DocumentsDashboard from './components/DocumentsDashboard';
import AlertsDashboard from './components/AlertsDashboard';
import AIToolTrackerDashboard from './components/AIToolTrackerDashboard';
import InvoicesDashboard from './components/InvoicesDashboard';
import ExpensesRoute from './components/ExpensesRoute';
import { supabaseService } from './supabaseService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export default function App() {
  // Load initial local state
  const [state, setState] = useState<AppState>(getInitialState);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Tab Routing: 'dashboard' | 'clients_dash' | 'projects_dash' | ...
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  
  // Drill-down Detail States
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  // Mobile responsive sidebar drawer state
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);

  // Authentication State Simulation / Real
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem('conextsol_auth_logged_in') === 'true';
  });
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // PLACEHOLDER_REST_OF_APP - will fail if incomplete
}
