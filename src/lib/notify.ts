/**
 * notify — thin wrapper around sonner's toast.
 * Import this anywhere in the app to show a toast:
 *
 *   import { notify } from '@/src/lib/notify';
 *   notify.success('Client saved');
 *   notify.error('Failed to send email');
 *   notify.info('No changes detected');
 *   notify.warning('Supabase not configured — using local storage');
 */
import { toast } from 'sonner';

export const notify = {
  success: (message: string, description?: string) =>
    toast.success(message, { description }),

  error: (message: string, description?: string) =>
    toast.error(message, { description }),

  info: (message: string, description?: string) =>
    toast.info(message, { description }),

  warning: (message: string, description?: string) =>
    toast.warning(message, { description }),

  loading: (message: string) =>
    toast.loading(message),

  dismiss: (id?: string | number) =>
    toast.dismiss(id),
};
