'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getMyAgentDetail, updateAgent, deleteAgent, toggleAgentStatus } from '@/lib/api';

const AgentSettingsPage = () => {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id;

  const [isPaid, setIsPaid] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [category, setCategory] = useState("Security");
  const [price, setPrice] = useState("0");
  const [activeModal, setActiveModal] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Changes saved successfully');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [agentName, setAgentName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [inputSchema, setInputSchema] = useState("");
  const [outputSchema, setOutputSchema] = useState("");
  const [agentStatus, setAgentStatus] = useState('active');
  const [badgeTier, setBadgeTier] = useState('tested');
  const [lastSaved, setLastSaved] = useState('');

  // Fetch agent data
  const fetchAgent = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMyAgentDetail(agentId);
      const agent = res.data?.agent;
      if (agent) {
        setAgentName(agent.name || '');
        setDescription(agent.description || '');
        setCategory((agent.category || 'other').charAt(0).toUpperCase() + (agent.category || 'other').slice(1));
        setSystemPrompt(agent.systemPrompt || '');
        setInputSchema(typeof agent.inputSchema === 'string' ? agent.inputSchema : JSON.stringify(agent.inputSchema || {}, null, 2));
        setOutputSchema(typeof agent.outputSchema === 'string' ? agent.outputSchema : JSON.stringify(agent.outputSchema || {}, null, 2));
        setIsPaid(agent.pricing === 'paid');
        setPrice(String(agent.price || 0));
        setAgentStatus(agent.isActive ? 'active' : 'paused');
        setBadgeTier(agent.badgeTier || 'tested');
        setLastSaved(agent.updatedAt ? new Date(agent.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '');
      }
    } catch (err) {
      console.error('Failed to fetch agent:', err);
    } finally {
      setIsLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    if (agentId) fetchAgent();
  }, [agentId, fetchAgent]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateAgent(agentId, {
        name: agentName,
        description,
        category: category.toLowerCase(),
        systemPrompt,
        inputSchema,
        outputSchema,
        pricing: isPaid ? 'paid' : 'free',
      });
      setToastMessage('Changes saved successfully');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      setToastMessage(err.message || 'Failed to save');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePause = async () => {
    try {
      await toggleAgentStatus(agentId);
      setActiveModal(null);
      setAgentStatus(prev => prev === 'active' ? 'paused' : 'active');
      setToastMessage('Agent status updated');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (err) {
      console.error('Failed to toggle status:', err);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteAgent(agentId);
      setActiveModal(null);
      router.push('/deployer');
    } catch (err) {
      console.error('Failed to delete agent:', err);
    }
  };

  const handleIncrement = () => {
    setPrice(prev => (parseInt(prev) || 0) + 1);
  };

  const handleDecrement = () => {
    setPrice(prev => {
      const val = parseInt(prev) || 0;
      return val > 0 ? val - 1 : 0;
    });
  };

  const categories = [
    "Security", "Writing", "Coding", "Data", "Business", "Education", "Marketing", "Assistant", "Other"
  ];

  const badgeConfig = {
    tested: { label: 'Tested', className: 'border-white/20 bg-white/5 text-white/70' },
    verified: { label: 'Verified', className: 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#4ade80]', icon: 'verified' },
    elite: { label: 'Elite', className: 'border-amber-400/20 bg-amber-400/10 text-amber-400', icon: 'star' },
    unverified: { label: 'Unverified', className: 'border-white/10 bg-white/5 text-white/50' },
  };
  const badge = badgeConfig[badgeTier] || badgeConfig.tested;

  if (isLoading) {
    return (
      <div className="w-full max-w-[800px] mx-auto flex items-center justify-center min-h-[60vh]">
        <span className="font-body text-sm text-on-surface-variant animate-pulse">Loading agent settings...</span>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col min-h-screen pt-8 pb-16 px-4">
        
        {/* Header section */}
        <div className="flex flex-col gap-3 mb-8">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => router.back()}
              className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors font-body text-sm font-medium"
            >
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
            </button>
            <h1 className="font-headline text-3xl font-bold tracking-tight text-white">
              Edit Agent
            </h1>
          </div>
          {lastSaved && <p className="font-body text-sm text-on-surface-variant">Last saved: {lastSaved}</p>}
          <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider w-fit ${badge.className}`}>
            {badge.icon && <span className="material-symbols-outlined text-[13px]">{badge.icon}</span>}
            Reliability: {badge.label}
          </div>
          <p className="font-body text-xs text-on-surface-variant/60 mt-1">
            <span className="text-red-400">*</span> fields are mandatory
          </p>
        </div>

        <div className="flex flex-col gap-8">
          
          {/* 1. Agent Name */}
          <div className="flex flex-col">
            <label className="font-headline text-sm font-semibold text-white mb-2">Agent Name <span className="text-red-400">*</span></label>
            <input 
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-body text-white placeholder-white/80 transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* 2. Description */}
          <div className="flex flex-col">
            <label className="font-headline text-sm font-semibold text-white mb-2">Description <span className="text-red-400">*</span></label>
            <textarea 
              rows="2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-body text-white placeholder-white/80 transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* 3. Category */}
          <div className="flex flex-col relative">
            <label className="font-headline text-sm font-semibold text-white mb-2">Category <span className="text-red-400">*</span></label>
            <div 
              onClick={() => setIsCategoryOpen(!isCategoryOpen)}
              className="flex w-full cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-body text-white transition-colors hover:bg-white/[0.05]"
            >
              {category}
              <span className="material-symbols-outlined text-sm text-on-surface-variant transition-transform duration-300" style={{ transform: isCategoryOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>expand_more</span>
            </div>

            {isCategoryOpen && (
              <div className="absolute top-[82px] z-50 flex max-h-[240px] w-full flex-col overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-xl p-2 shadow-2xl">
                {categories.map((cat) => (
                  <div 
                    key={cat}
                    onClick={() => { setCategory(cat); setIsCategoryOpen(false); }}
                    className={`cursor-pointer rounded-xl px-4 py-3 text-sm font-body transition-colors ${
                      category === cat 
                        ? 'bg-white/10 text-white font-semibold' 
                        : 'text-on-surface-variant hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    {cat}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. System Prompt */}
          <div className="flex flex-col">
            <label className="font-headline text-sm font-semibold text-white mb-1">System Prompt <span className="text-red-400">*</span></label>
            <span className="font-body text-xs text-on-surface-variant mb-4">
              This defines how your agent thinks and produces structured outputs.
            </span>
            <textarea 
              rows="14"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="w-full resize-y rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-sm font-mono text-white placeholder-white/80 leading-relaxed transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* 5. Input Schema */}
          <div className="flex flex-col">
            <label className="font-headline text-sm font-semibold text-white mb-1">Input Schema <span className="text-red-400">*</span></label>
            <span className="font-body text-xs text-on-surface-variant mb-4">
              Structured input required by this agent (used for pipeline execution).
            </span>
            <textarea 
              rows="5"
              value={inputSchema}
              onChange={(e) => setInputSchema(e.target.value)}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-mono text-white placeholder-white/80 transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* 6. Output Schema */}
          <div className="flex flex-col">
            <label className="font-headline text-sm font-semibold text-white mb-1">Output Schema <span className="text-red-400">*</span></label>
            <span className="font-body text-xs text-on-surface-variant mb-4">
              Structured output required for evaluation and downstream agents.
            </span>
            <textarea 
              rows="6"
              value={outputSchema}
              onChange={(e) => setOutputSchema(e.target.value)}
              className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm font-mono text-white placeholder-white/80 transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none"
            />
          </div>

          {/* 7. Pricing Toggle */}
          <div className="flex flex-col gap-4">
            <label className="font-headline text-sm font-semibold text-white mb-2 block">Pricing Structure</label>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setIsPaid(false)} 
                className={`flex-1 rounded-2xl py-3 px-6 text-sm font-semibold transition-all duration-300 ${!isPaid ? 'bg-white text-black active:scale-[0.98]' : 'bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10'}`}
              >
                Free
              </button>
              <button 
                onClick={() => setIsPaid(true)} 
                className={`flex-1 rounded-2xl py-3 px-6 text-sm font-semibold transition-all duration-300 ${isPaid ? 'bg-white text-black active:scale-[0.98]' : 'bg-white/5 border border-white/10 text-on-surface-variant hover:bg-white/10'}`}
              >
                Paid
              </button>
            </div>

            {isPaid && (
              <div className="animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col mt-2">
                <label className="font-headline text-sm font-semibold text-white mb-2">Price per call (₹)</label>
                <div className="relative flex items-center w-full">
                  <input 
                    type="number"
                    step="1"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.03] p-4 pr-12 text-sm font-body text-white placeholder-on-surface-variant/50 transition-colors hover:bg-white/[0.05] focus:border-white/30 focus:bg-white/[0.05] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    placeholder="e.g. 5"
                  />
                  <div className="absolute right-4 flex flex-col items-center justify-center gap-1">
                    <span onClick={handleIncrement} className="material-symbols-outlined text-[16px] leading-[0.8] text-on-surface-variant opacity-60 cursor-pointer hover:opacity-100 transition-opacity select-none">expand_less</span>
                    <span onClick={handleDecrement} className="material-symbols-outlined text-[16px] leading-[0.8] text-on-surface-variant opacity-60 cursor-pointer hover:opacity-100 transition-opacity select-none">expand_more</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Save Changes Button */}
        <div className="mt-12 flex items-center justify-end border-t border-white/10 pt-8">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-[28px] bg-white px-8 py-3 font-headline text-sm font-semibold tracking-wide text-black transition-opacity hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mt-12 flex items-center gap-4 border-t border-white/10 pt-8">
          <button 
            onClick={() => setActiveModal('pause')}
            className="rounded-[28px] bg-white px-6 py-3 font-headline text-sm font-semibold tracking-wide text-black transition-opacity hover:opacity-90 active:scale-[0.98]"
          >
            {agentStatus === 'active' ? 'Pause Agent' : 'Activate Agent'}
          </button>
          <button 
            onClick={() => setActiveModal('delete')}
            className="rounded-[28px] border border-red-400/30 bg-transparent px-6 py-3 font-headline text-sm font-semibold tracking-wide text-red-400 transition-opacity hover:opacity-80 active:scale-[0.98]"
          >
            Delete Agent
          </button>
        </div>
        
      </div>

      {/* Pause Confirmation Modal */}
      {activeModal === 'pause' && (
        <ConfirmModal
          title={agentStatus === 'active' ? 'Pause Agent?' : 'Activate Agent?'}
          message={agentStatus === 'active' 
            ? 'Are you sure you want to pause agent activity? Users will not be able to access this agent.' 
            : 'Activate this agent? It will become available in the marketplace.'}
          confirmLabel={agentStatus === 'active' ? 'Yes, Pause' : 'Yes, Activate'}
          confirmStyle="white"
          onCancel={() => setActiveModal(null)}
          onConfirm={handlePause}
        />
      )}

      {/* Delete Confirmation Modal */}
      {activeModal === 'delete' && (
        <ConfirmModal
          title="Delete Agent?"
          message="Are you sure you want to delete this agent? This action cannot be undone."
          confirmLabel="Yes, Delete"
          confirmStyle="danger"
          onCancel={() => setActiveModal(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* Save Success Toast */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl px-6 py-4 shadow-2xl min-w-[280px]">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-[20px] text-green-400">check_circle</span>
              <span className="font-body text-sm font-medium text-white">{toastMessage}</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
              <div className="h-full bg-green-500 rounded-full" style={{ animation: 'toast-progress 3s linear forwards' }} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toast-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </>
  );
};

// Reusable Confirmation Modal
const ConfirmModal = ({ title, message, confirmLabel, confirmStyle, onCancel, onConfirm }) => {
  React.useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center animate-in fade-in duration-200" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div 
        className="relative z-10 w-full max-w-[420px] mx-4 rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl p-8 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline text-xl font-bold text-white mb-3">{title}</h3>
        <p className="font-body text-sm text-on-surface-variant leading-relaxed mb-8">{message}</p>
        <div className="flex items-center justify-end gap-3">
          <button onClick={onCancel} className="rounded-[28px] border border-white/20 bg-transparent px-6 py-2.5 font-headline text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-80 active:scale-[0.98]">No</button>
          <button 
            onClick={onConfirm}
            className={`rounded-[28px] px-6 py-2.5 font-headline text-sm font-semibold tracking-wide transition-opacity hover:opacity-90 active:scale-[0.98] ${
              confirmStyle === 'danger' ? 'bg-red-500/90 text-white' : 'bg-white text-black'
            }`}
          >{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

export default AgentSettingsPage;
