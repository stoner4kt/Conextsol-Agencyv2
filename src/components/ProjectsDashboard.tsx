import React, { useState } from 'react';
import { 
  Search, 
  Briefcase, 
  Calendar, 
  Globe, 
  Github, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Check,
  AlertCircle,
  Tag,
  Mail,
  ShieldAlert,
  ExternalLink,
  Star
} from 'lucide-react';
import { Project, AppState } from '../types';
import GitHubResourceList from './github/GitHubResourceList';
import SendReviewEmailModal from './SendReviewEmailModal';

interface ProjectsDashboardProps {
  state: AppState;
  onSaveProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => void;
  onSelectClient: (clientId: string) => void;
  isAdmin: boolean;
  onProjectStatusChange: (projectId: string, newStatus: string) => void;
}

export default function ProjectsDashboard({
  state,
  onSaveProject,
  onDeleteProject,
  onSelectClient,
  isAdmin,
  onProjectStatusChange
}: ProjectsDashboardProps) {