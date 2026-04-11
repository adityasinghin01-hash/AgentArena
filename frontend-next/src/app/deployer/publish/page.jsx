'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAgent } from '@/lib/api';

const PublishAgent = () => {
  const router = useRouter();
  const [isPaid, setIsPaid] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [category, setCategory] = useState("Security");
  const [price, setPrice] = useState("");

  // Controlled field values
  const [agentName, setAgentName] = useState("");
  const [description, setDescription] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [inputSchema, setInputSchema] = useState("");
  const [outputSchema, setOutputSchema] = useState("");

  // Touched tracking (shows error only after user leaves the field)
  const [touched, setTouched] = useState({});
  
  // Toast system
  const [toast, setToast] = useState(null); // { message, icon, type }
  
  // Publishing state
  const [isPublishing, setIsPublishing] = useState(false);

  const mandatoryFields = {
    agentName, description, systemPrompt, inputSchema, outputSchema,
  };

  const handleBlur = (field) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFieldError = (field) => {
    if (field === 'price') return isPaid && touched.price && !String(price).trim();
    return touched[field] && !mandatoryFields[field]?.trim();
  };

  const allFieldsFilled = Object.values(mandatoryFields).every(v => v.trim()) && (!isPaid || String(price).trim());

  const showToast = (message, icon = 'check_circle', duration = 3000) => {
    setToast({ message, icon, duration });
    setTimeout(() => setToast(null), duration);
  };

  const handleSaveDraft = () => {
    showToast('Draft saved successfully');
  };

  const handlePublish = async () => {
    // Mark all fields as touched to show errors
    const allTouched = {};
    Object.keys(mandatoryFields).forEach(k => allTouched[k] = true);
    if (isPaid) allTouched.price = true;
    setTouched(allTouched);

    if (!allFieldsFilled) return;

    // Start publishing animation
    setIsPublishing(true);

    try {
      await createAgent({
        name: agentName,
        description,
        category: category.toLowerCase(),
        systemPrompt,
        inputSchema,
        outputSchema,
        pricing: isPaid ? 'paid' : 'free',
        price: isPaid ? parseInt(price) || 0 : 0,
      });

      setIsPublishing(false);
      showToast('Published successfully', 'rocket_launch', 3000);

      // Navigate to deployer dashboard after a short delay
      setTimeout(() => {
        router.push('/deployer');
      }, 2000);
    } catch (err) {
      setIsPublishing(false);
      showToast(err.message || 'Failed to publish', 'error', 3000);
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

  const inputBaseClass = "w-full rounded-2xl border bg-white/[0.03] p-4 text-sm font-body text-white placeholder-white/80 transition-all hover:bg-white/[0.05] focus:bg-white/[0.05] focus:outline-none";
  const inputNormal = `${inputBaseClass} border-white/10 focus:border-white/30`;
  const inputError = `${inputBaseClass} border-red-400/50 focus:border-red-400/70`;

  return (
    <>
      <div className="w-full max-w-[800px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col min-h-screen pt-8 pb-16 px-4">
        
        {/* Header section */}
      <div className="flex flex-col gap-2 mb-8">
        <button 
          onClick={() => router.push('/deployer')}
          className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors self-start font-body text-sm font-medium mb-4"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          Back to My Agents
        </button>
        <h1 className="font-headline text-3xl font-bold tracking-tight text-white">
          Publish a New Agent
        </h1>
        <p className="font-body text-sm text-on-surface-variant">
          This is your agent&apos;s brain — define its behavior, inputs, and outputs carefully.
        </p>
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
            onBlur={() => handleBlur('agentName')}
            className={isFieldError('agentName') ? inputError : inputNormal}
            placeholder="e.g. Security Analyzer Pro"
          />
          {isFieldError('agentName') && (
            <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
          )}
        </div>

        {/* 2. Description */}
        <div className="flex flex-col">
          <label className="font-headline text-sm font-semibold text-white mb-2">Description <span className="text-red-400">*</span></label>
          <textarea 
            rows="2"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={() => handleBlur('description')}
            className={`resize-none ${isFieldError('description') ? inputError : inputNormal}`}
            placeholder="Explain what this agent does and what problem it solves"
          />
          {isFieldError('description') && (
            <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
          )}
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

          {/* Custom Dropdown Options Sheet */}
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
            This defines how your agent thinks, analyzes, and produces output. Be precise.
          </span>
          <textarea 
            rows="14"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            onBlur={() => handleBlur('systemPrompt')}
            className={`resize-y font-mono leading-relaxed p-6 ${isFieldError('systemPrompt') ? inputError : inputNormal}`}
            placeholder={`You are a security analysis agent.\n\nTASK:\nAnalyze the provided code for vulnerabilities.\n\nRULES:\n- Be precise\n- Avoid false positives\n\nOUTPUT FORMAT (STRICT JSON ONLY):\n{\n  "vulnerabilities": [\n    {\n      "type": "string",\n      "description": "string",\n      "severity": "Low | Medium | High"\n    }\n  ],\n  "summary": "string"\n}`}
          />
          {isFieldError('systemPrompt') && (
            <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
          )}
        </div>

        {/* 5. Input Schema */}
        <div className="flex flex-col">
          <label className="font-headline text-sm font-semibold text-white mb-1">Input Schema <span className="text-red-400">*</span></label>
          <span className="font-body text-xs text-on-surface-variant mb-4">
            Define the structured input your agent expects (used for pipeline compatibility).
          </span>
          <textarea 
            rows="5"
            value={inputSchema}
            onChange={(e) => setInputSchema(e.target.value)}
            onBlur={() => handleBlur('inputSchema')}
            className={`resize-none font-mono ${isFieldError('inputSchema') ? inputError : inputNormal}`}
            placeholder={`{\n  "code": "string"\n}`}
          />
          {isFieldError('inputSchema') && (
            <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
          )}
        </div>

        {/* 6. Output Schema */}
        <div className="flex flex-col">
          <label className="font-headline text-sm font-semibold text-white mb-1">Output Schema <span className="text-red-400">*</span></label>
          <span className="font-body text-xs text-on-surface-variant mb-4">
            Define structured output. Must be consistent for evaluation and pipeline usage.
          </span>
          <textarea 
            rows="6"
            value={outputSchema}
            onChange={(e) => setOutputSchema(e.target.value)}
            onBlur={() => handleBlur('outputSchema')}
            className={`resize-none font-mono ${isFieldError('outputSchema') ? inputError : inputNormal}`}
            placeholder={`{\n  "result": "string",\n  "summary": "string"\n}`}
          />
          {isFieldError('outputSchema') && (
            <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
          )}
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

          {/* Reveal amount input if paid */}
          {isPaid && (
            <div className="animate-in fade-in slide-in-from-top-4 duration-300 flex flex-col mt-2">
               <label className="font-headline text-sm font-semibold text-white mb-2">Price per call (₹) <span className="text-red-400">*</span></label>
               <div className="relative flex items-center w-full">
                 <input 
                    type="number"
                    step="1"
                    min="0"
                    value={price}
                    onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                    onBlur={() => handleBlur('price')}
                    className={`w-full rounded-2xl border bg-white/[0.03] p-4 pr-12 text-sm font-body text-white placeholder-on-surface-variant/50 transition-all hover:bg-white/[0.05] focus:bg-white/[0.05] focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${isFieldError('price') ? 'border-red-400/50 focus:border-red-400/70' : 'border-white/10 focus:border-white/30'}`}
                    placeholder="e.g. 5"
                  />
                  <div className="absolute right-4 flex flex-col items-center justify-center gap-1">
                    <span 
                      onClick={handleIncrement}
                      className="material-symbols-outlined text-[16px] leading-[0.8] text-on-surface-variant opacity-60 cursor-pointer hover:opacity-100 transition-opacity select-none"
                    >
                      expand_less
                    </span>
                    <span 
                      onClick={handleDecrement}
                      className="material-symbols-outlined text-[16px] leading-[0.8] text-on-surface-variant opacity-60 cursor-pointer hover:opacity-100 transition-opacity select-none"
                    >
                      expand_more
                    </span>
                  </div>
               </div>
               {isFieldError('price') && (
                 <span className="font-body text-xs text-red-400 mt-2 animate-in fade-in duration-200">This field is mandatory</span>
               )}
            </div>
          )}
        </div>

      </div>

      {/* Bottom Action Area */}
      <div className="mt-12 flex items-center justify-between border-t border-white/10 pt-8">
        <button 
          onClick={handleSaveDraft}
          className="rounded-[28px] border border-white/20 bg-transparent px-6 py-3 font-headline text-sm font-semibold tracking-wide text-white transition-opacity hover:opacity-80 active:scale-[0.98]"
        >
          Save Draft
        </button>
        <button 
          onClick={handlePublish}
          disabled={isPublishing}
          className="glow-button group transition-transform active:scale-[0.98]"
        >
          <div className="glow-button-track"></div>
          <div className="glow-button-inner px-6 py-3">
            <span className="font-headline flex items-center gap-2 text-sm font-semibold tracking-wide text-black transition-colors group-hover:text-white">
              Publish Agent
              <span className="material-symbols-outlined text-sm">north_east</span>
            </span>
          </div>
        </button>
      </div>
    </div>

    {/* Publishing Overlay */}
    {isPublishing && (
      <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl px-6 py-4 shadow-2xl min-w-[280px]">
          <div className="flex items-center gap-3">
            <div className="h-4 w-4 rounded-full border-2 border-green-400 border-t-transparent animate-spin"></div>
            <span className="font-body text-sm font-medium text-white">Publishing...</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ animation: 'publish-progress 2.5s linear forwards' }}
            />
          </div>
        </div>
      </div>
    )}

    {/* Toast Notification */}
    {toast && (
      <div className="fixed bottom-8 right-8 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#111]/95 backdrop-blur-xl px-6 py-4 shadow-2xl min-w-[280px]">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[20px] text-green-400">{toast.icon}</span>
            <span className="font-body text-sm font-medium text-white">{toast.message}</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/5">
            <div 
              className="h-full bg-green-500 rounded-full"
              style={{ animation: `toast-progress ${toast.duration}ms linear forwards` }}
            />
          </div>
        </div>
      </div>
    )}

    <style>{`
      @keyframes toast-progress {
        from { width: 0%; }
        to { width: 100%; }
      }
      @keyframes publish-progress {
        from { width: 0%; }
        to { width: 100%; }
      }
    `}</style>
    </>
  );
};

export default PublishAgent;
