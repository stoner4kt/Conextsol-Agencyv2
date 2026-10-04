import React, { useState } from 'react';
import { Star, Save, Loader2, ChevronDown, ChevronUp, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import { Client } from '../types';
import { supabaseService } from '../supabaseService';

interface Props { client: Client; onClientUpdated: (updated: Client) => void; }

export default function ClientReviewSettings({ client, onClientUpdated }: Props) {
  const [expanded,setExpanded]=useState(false);
  const [form,setForm]=useState({google_review_url:client.google_review_url||'',google_place_id:client.google_place_id||'',subdomain:client.subdomain||'',review_from_name:client.review_from_name||'',review_from_email:client.review_from_email||'',review_reply_to_email:client.review_reply_to_email||'',review_automation_enabled:client.review_automation_enabled??false});
  const [saving,setSaving]=useState(false),[saved,setSaved]=useState(false),[error,setError]=useState('');
  const handleSave=async()=>{setSaving(true);setError('');try{await supabaseService.updateClientReviewSettings(client.id,form);onClientUpdated({...client,...form});setSaved(true);setTimeout(()=>setSaved(false),3000)}catch(err){setError(err instanceof Error?err.message:'Save failed')}finally{setSaving(false)}};
  return <div className="bg-[#0b0f19] border border-[#1a2234] rounded-xl overflow-hidden mt-4">
    <button onClick={()=>setExpanded(p=>!p)} className="w-full flex items-center justify-between p-4 text-left"><span className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400"/><span className="text-sm font-mono text-slate-300">Review Automation</span>{form.review_automation_enabled&&<span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 rounded">ON</span>}</span>{expanded?<ChevronUp className="w-4 h-4"/>:<ChevronDown className="w-4 h-4"/>}</button>
    {expanded&&<div className="border-t border-[#1a2234] p-4 space-y-4">
      <div className="flex items-center justify-between"><div><p className="text-xs font-mono text-slate-300">Auto-send on completion</p><p className="text-[10px] font-mono text-slate-600">Triggers review email automatically via webhook</p></div><button onClick={()=>setForm(f=>({...f,review_automation_enabled:!f.review_automation_enabled}))} className={'relative w-10 h-5 rounded-full ' + (form.review_automation_enabled?'bg-cyan-600':'bg-[#1a2234]')}><span className={'absolute top-0.5 w-4 h-4 bg-white rounded-full ' + (form.review_automation_enabled?'translate-x-5':'translate-x-0.5')}/></button></div>
      <div className="border-t border-[#1a2234]"/><p className="text-[10px] font-mono text-slate-500 uppercase">Email Sender</p>
      <label className="block text-[10px] font-mono text-slate-500">Display Name<input value={form.review_from_name} onChange={e=>setForm(f=>({...f,review_from_name:e.target.value}))} className="mt-1 w-full bg-[#0d1321] border border-[#1a2234] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono" placeholder="Conextsol Agency"/></label>
      <label className="block text-[10px] font-mono text-slate-500">Sending Address <span className="text-slate-700">(must be verified in Resend)</span><div className="relative mt-1"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3"/><input type="email" value={form.review_from_email} onChange={e=>setForm(f=>({...f,review_from_email:e.target.value}))} className="w-full bg-[#0d1321] border border-[#1a2234] rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 font-mono" placeholder="noreply@clientdomain.com"/></div></label>
      <label className="block text-[10px] font-mono text-slate-500">Reply-To Address<input value={form.review_reply_to_email} onChange={e=>setForm(f=>({...f,review_reply_to_email:e.target.value}))} className="mt-1 w-full bg-[#0d1321] border border-[#1a2234] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono" placeholder="hello@clientdomain.com"/></label>
      <div className="border-t border-[#1a2234]"/><p className="text-[10px] font-mono text-slate-500 uppercase">Google Review</p>
      <label className="block text-[10px] font-mono text-slate-500">Google Review URL<input value={form.google_review_url} onChange={e=>setForm(f=>({...f,google_review_url:e.target.value}))} className="mt-1 w-full bg-[#0d1321] border border-[#1a2234] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono" placeholder="https://g.page/r/YOUR_PLACE_ID/review"/></label>
      <div className="border-t border-[#1a2234]"/><p className="text-[10px] font-mono text-slate-500 uppercase">Multi-Tenant</p>
      <label className="block text-[10px] font-mono text-slate-500">Client Subdomain<input value={form.subdomain} onChange={e=>setForm(f=>({...f,subdomain:e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,'')}))} className="mt-1 w-full bg-[#0d1321] border border-[#1a2234] rounded-lg px-3 py-1.5 text-xs text-slate-200 font-mono" placeholder="client-name"/></label>
      {error&&<div className="text-xs font-mono text-rose-400"><AlertCircle className="inline w-3.5 h-3.5 mr-1"/>{error}</div>}
      <div className="flex justify-end gap-2">{saved&&<span className="text-xs font-mono text-emerald-400"><CheckCircle className="inline w-3.5 h-3.5 mr-1"/>Saved</span>}<button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-cyan-600 text-white rounded-lg">{saving?<><Loader2 className="w-3.5 h-3.5 animate-spin"/>Saving…</>:<><Save className="w-3.5 h-3.5"/>Save</>}</button></div>
    </div>}
  </div>;
}
