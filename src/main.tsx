import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Toaster } from 'sonner';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      theme="dark"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        style: {
          background: '#0d111a',
          border: '1px solid #1a2234',
          color: '#e2e8f0',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: '12px',
          borderRadius: '12px',
        },
        classNames: {
          title: 'font-sans text-xs font-semibold text-white',
          description: 'font-mono text-[11px] text-slate-400',
          actionButton: 'font-mono text-xs',
          cancelButton: 'font-mono text-xs',
          closeButton: 'border border-[#1a2234] bg-[#0b0f19] text-slate-400 hover:text-white',
        },
      }}
    />
  </StrictMode>,
);
