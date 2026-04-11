'use client';
// Screen 4a: Arena — The Competitive AI Playground
// Skills: @frontend-developer @nextjs-patterns @react-best-practices @ui-ux-pro-max @dark-mode-ui @glassmorphism

import { useEffect, useState, useReducer, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAccessToken, getUser } from '@/lib/auth';
import { decomposeOutcome, createPipeline, fetchAgents } from '@/lib/api';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Prompt suggestion chips ──────────────────────────────────
const SUGGESTIONS = [
  { label: '🔍 Review my code', prompt: 'Review this Python function for bugs, performance issues, and best practices. Suggest improvements with code examples.' },
  { label: '📋 Plan a strategy', prompt: 'Create a detailed marketing strategy for launching a new SaaS product targeting small businesses. Include channels, budget allocation, and timeline.' },
  { label: '🐛 Debug this function', prompt: 'Debug this JavaScript authentication middleware that intermittently returns 401 errors for valid tokens. Find the root cause and fix it.' },
  { label: '🧪 Write unit tests', prompt: 'Write comprehensive unit tests for a REST API user registration endpoint. Cover happy paths, edge cases, validation errors, and database failures.' },
  { label: '⚡ Optimize SQL query', prompt: 'Optimize this SQL query that takes 12 seconds to execute on a table with 10M rows. Suggest indexes, query restructuring, and caching strategies.' },
  { label: '🏗️ Design an API', prompt: 'Design a RESTful API for an e-commerce platform. Include endpoints for products, orders, users, and payments with proper HTTP methods and status codes.' },
];

// ── State machine ── @react-best-practices ───────────────────
const INITIAL_STATE = {
  phase: 'idle', // idle | decomposing | preview | launching
  mode: 'auto',  // auto | manual
  prompt: '',
  slots: [],
  agents: [],
  selectedAgents: {},
  error: null,
};

function arenaReducer(state, action) {
  switch (action.type) {
    case 'SET_PROMPT': return { ...state, prompt: action.payload, error: null };
    case 'SET_MODE': return { ...state, mode: action.payload };
    case 'START_DECOMPOSE': return { ...state, phase: 'decomposing', error: null };
    case 'DECOMPOSE_SUCCESS': return { ...state, phase: 'preview', slots: action.payload.slots, agents: action.payload.agents };
    case 'DECOMPOSE_ERROR': return { ...state, phase: 'idle', error: action.payload };
    case 'SELECT_AGENT': {
      const { slotIdx, agentId } = action.payload;
      const current = state.selectedAgents[slotIdx] || [];
      const exists = current.includes(agentId);
      return {
        ...state,
        selectedAgents: {
          ...state.selectedAgents,
          [slotIdx]: exists ? current.filter(id => id !== agentId) : [...current, agentId],
        },
      };
    }
    case 'START_LAUNCH': return { ...state, phase: 'launching' };
    case 'LAUNCH_ERROR': return { ...state, phase: 'preview', error: action.payload };
    case 'RESET': return { ...INITIAL_STATE };
    default: return state;
  }
}

// ── Badge tier icon ──────────────────────────────────────────
function badgeIcon(tier) {
  const icons = { unverified: '○', tested: '◉', verified: '🏅', elite: '👑' };
  return icons[tier] || '○';
}

function winRateClass(rate) {
  if (rate >= 60) return 'win-high';
  if (rate >= 40) return 'win-mid';
  return 'win-low';
}

// Suspense wrapper for useSearchParams — @nextjs-best-practices
export default function ArenaPageWrapper() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-surface"><p className="text-white/40 font-body text-sm">Loading…</p></div>}>
      <ArenaPage />
    </Suspense>
  );
}

function ArenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedAgentIds = searchParams.get('agents')?.split(',').filter(Boolean) || [];
  const [state, dispatch] = useReducer(arenaReducer, INITIAL_STATE);
  const [loading, setLoading] = useState(true);
  const [marketplaceAgents, setMarketplaceAgents] = useState([]); // fetched agent details for display

  // ── Auth guard + auto-set Manual mode when coming from Marketplace ──
  useEffect(() => {
    if (!getAccessToken()) { router.replace('/login'); return; }
    // If marketplace sent agents, force Manual mode and fetch their details
    if (preselectedAgentIds.length > 0) {
      dispatch({ type: 'SET_MODE', payload: 'manual' });
      // Fetch all agents and filter to get names/categories for display
      fetchAgents().then(res => {
        const all = res.data?.agents || res.agents || [];
        const matched = all.filter(a => preselectedAgentIds.includes(a._id));
        setMarketplaceAgents(matched);
      }).catch(() => {});
    }
    setLoading(false);
  }, [router]);

  // ── Decompose prompt ── @senior-fullstack ──────────────────
  const handleLaunch = useCallback(async () => {
    if (state.prompt.trim().length < 10) {
      dispatch({ type: 'DECOMPOSE_ERROR', payload: 'Prompt must be at least 10 characters.' });
      return;
    }
    dispatch({ type: 'START_DECOMPOSE' });
    try {
      const [decomposeRes, agentsRes] = await Promise.all([
        decomposeOutcome(state.prompt),
        fetchAgents(),
      ]);
      const slots = decomposeRes.data?.slots || decomposeRes.slots || [];
      const agents = agentsRes.data?.agents || agentsRes.agents || [];

      // Pre-select agents: marketplace agents ONLY in manual mode
      const hasMarketplaceAgents = preselectedAgentIds.length > 0 && state.mode === 'manual';
      if (hasMarketplaceAgents && agents.length > 0) {
        // Marketplace flow: use the exact agents the user picked
        dispatch({ type: 'DECOMPOSE_SUCCESS', payload: { slots, agents } });
        slots.forEach((_, idx) => {
          preselectedAgentIds
            .filter(id => agents.some(a => a._id === id))
            .forEach(agentId => {
              dispatch({ type: 'SELECT_AGENT', payload: { slotIdx: idx, agentId } });
            });
        });
      } else if (state.mode === 'auto' && agents.length > 0) {
        // Auto-mode: pre-assign top agents to each slot
        const sorted = [...agents].sort((a, b) => (b.reliabilityScore || 0) - (a.reliabilityScore || 0));
        dispatch({ type: 'DECOMPOSE_SUCCESS', payload: { slots, agents } });
        slots.forEach((_, idx) => {
          sorted.slice(0, Math.min(3, sorted.length)).forEach(a => {
            dispatch({ type: 'SELECT_AGENT', payload: { slotIdx: idx, agentId: a._id } });
          });
        });
      } else {
        dispatch({ type: 'DECOMPOSE_SUCCESS', payload: { slots, agents } });
      }
    } catch (err) {
      dispatch({ type: 'DECOMPOSE_ERROR', payload: err.message || 'Failed to analyze prompt.' });
    }
  }, [state.prompt, state.mode]);

  // ── Start battle ── @senior-fullstack ──────────────────────
  const handleStartBattle = useCallback(async () => {
    dispatch({ type: 'START_LAUNCH' });
    try {
      // Build slots with assigned agents
      const slotsWithAgents = state.slots.map((slot, idx) => ({
        name: slot.name,
        task: slot.task,
        evaluationCriteria: slot.evaluationCriteria || slot.evaluation_criteria || slot.task || 'Evaluate quality, accuracy, and completeness',
        assignedAgents: state.selectedAgents[idx] || [],
      }));

      // Check all slots have agents
      const empty = slotsWithAgents.filter(s => s.assignedAgents.length === 0);
      if (empty.length > 0) {
        dispatch({ type: 'LAUNCH_ERROR', payload: `Select agents for: ${empty.map(s => s.name).join(', ')}` });
        return;
      }

      const pipeline = await createPipeline({
        outcomeText: state.prompt,
        slots: slotsWithAgents,
      });

      const pipelineId = pipeline.data?.pipelineId || pipeline.data?.pipeline?._id || pipeline._id;
      router.push(`/battle/${pipelineId}?input=${encodeURIComponent(state.prompt)}`);
    } catch (err) {
      dispatch({ type: 'LAUNCH_ERROR', payload: err.message || 'Failed to start battle.' });
    }
  }, [state.slots, state.selectedAgents, state.prompt, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <p className="text-white/40 font-body text-sm">Loading…</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={20} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>

      <Navbar />

      <main className="relative z-10 flex min-h-screen w-full flex-col items-center px-6 pt-[80px] pb-12">
        <div className="w-full max-w-[720px] animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col items-center">

          {/* ── Header ── */}
          <h1 className="text-glow font-serif text-5xl md:text-6xl italic font-bold tracking-tight text-white mb-2">
            Arena
          </h1>
          <p className="font-body text-sm text-white/40 mb-10 text-center">
            Describe your challenge and watch AI agents compete to solve it.
          </p>

          {/* ── Mode Toggle ── @ui-ux-pro-max ── */}
          <div className="mode-toggle mb-6">
            <button
              className={`mode-toggle-btn${state.mode === 'auto' ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'auto' })}
            >
              ⚡ Automatic
            </button>
            <button
              className={`mode-toggle-btn${state.mode === 'manual' ? ' active' : ''}`}
              onClick={() => dispatch({ type: 'SET_MODE', payload: 'manual' })}
            >
              🎯 Manual
            </button>
          </div>

          {/* ── Your Battle Squad — reactive to agent selection changes ── */}
          {/* Skills: @react-best-practices @ui-ux-pro-max @design-spells */}
          {state.mode === 'manual' && (() => {
            // Compute live squad: after decompose use state.selectedAgents, before use marketplaceAgents
            const CAT_ICONS_MAP = {'classifier':'🏷️','writer':'✍️','ranker':'📊','analyzer':'🔬','linter':'🧹','scanner':'🔍','explainer':'📖','scheduler':'📅','researcher':'🔬'};
            let squadAgents = [];
            if (state.phase !== 'idle' && state.agents.length > 0) {
              // After decompose: show agents actually selected in slots
              const allSelectedIds = [...new Set(Object.values(state.selectedAgents).flat())];
              squadAgents = allSelectedIds.map(id => state.agents.find(a => a._id === id)).filter(Boolean);
            } else {
              // Before decompose: show agents from marketplace URL
              squadAgents = marketplaceAgents;
            }
            if (squadAgents.length === 0) return null;
            return (
              <div className="w-full mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase">🎯 Your Battle Squad</span>
                  <span className="text-[10px] text-white/20">{squadAgents.length} agents selected</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {squadAgents.map(agent => (
                    <div key={agent._id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] transition-all hover:border-white/15 group">
                      <span style={{ fontSize: 14 }}>{CAT_ICONS_MAP[agent.category] || '🤖'}</span>
                      <span className="text-xs text-white/70 font-medium">{agent.name}</span>
                      <span className="text-[9px] text-white/20">{Math.round(agent.winRate || 0)}% WR</span>
                      {/* Remove button — syncs with slot selection below */}
                      {state.phase !== 'idle' && (
                        <button
                          className="ml-1 text-[10px] text-white/20 hover:text-red-400 transition-colors"
                          onClick={() => {
                            state.slots.forEach((_, idx) => {
                              if ((state.selectedAgents[idx] || []).includes(agent._id)) {
                                dispatch({ type: 'SELECT_AGENT', payload: { slotIdx: idx, agentId: agent._id } });
                              }
                            });
                          }}
                          title={`Remove ${agent.name}`}
                        >✕</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* ── Auto mode + marketplace agents warning ── */}
          {state.mode === 'auto' && preselectedAgentIds.length > 0 && (
            <div className="w-full mb-5 rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 text-center animate-in fade-in duration-300">
              <p className="text-sm text-amber-400">🎯 You have {preselectedAgentIds.length} agents from Marketplace — switch to <strong>Manual</strong> to use them</p>
            </div>
          )}

          {/* ── Prompt Input ── */}
          <div className="w-full relative">
            <textarea
              className="arena-textarea"
              placeholder="What do you want AI agents to solve?"
              value={state.prompt}
              onChange={(e) => dispatch({ type: 'SET_PROMPT', payload: e.target.value })}
              disabled={state.phase !== 'idle'}
              rows={4}
            />
            <div className="flex justify-between items-center mt-2 px-1">
              <span className="text-xs" style={{ color: state.prompt.length < 10 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)' }}>
                {state.prompt.length} characters
              </span>
              <span className="text-xs text-white/20">
                {state.mode === 'auto' ? 'AI picks best agents' : 'You pick the agents'}
              </span>
            </div>
          </div>

          {/* ── Suggestion Chips ── */}
          {state.phase === 'idle' && (
            <div className="flex flex-wrap gap-2 mt-5 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  className="prompt-chip"
                  onClick={() => dispatch({ type: 'SET_PROMPT', payload: s.prompt })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Error Message ── */}
          {state.error && (
            <div className="mt-4 w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center">
              <p className="text-sm text-red-400">{state.error}</p>
            </div>
          )}


          {/* ── Launch / Decomposing ── */}
          {state.phase === 'idle' && (
            <button
              className="glow-button group mt-8 h-12 transition-transform active:scale-95"
              style={{ borderRadius: 999 }}
              disabled={state.prompt.trim().length < 10}
              onClick={handleLaunch}
            >
              <div className="glow-button-track" style={{ borderRadius: 999 }}></div>
              <div className="glow-button-inner px-10" style={{ borderRadius: 999 }}>
                <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                  ⚡ Launch Battle
                </span>
              </div>
            </button>
          )}

          {state.phase === 'decomposing' && (
            <div className="mt-8 flex flex-col items-center gap-4">
              <div className="shimmer" style={{ width: 280, height: 40 }}></div>
              <div className="shimmer" style={{ width: 320, height: 80 }}></div>
              <div className="shimmer" style={{ width: 240, height: 40 }}></div>
              <p className="text-white/30 text-xs mt-2 font-body">Analyzing your challenge with AI...</p>
            </div>
          )}

          {/* ── Battle Preview ── @glassmorphism ── */}
          {(state.phase === 'preview' || state.phase === 'launching') && (
            <div className="battle-preview-enter w-full mt-8">
              {/* Rounds */}
              <div className="mb-6">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase mb-3">
                  ⚔️ Battle Rounds ({state.slots.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {state.slots.map((slot, i) => (
                    <div key={i} className="round-card">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs font-bold text-white/30">R{i + 1}</span>
                        <span className="text-sm font-medium text-white">{slot.name}</span>
                      </div>
                      <p className="text-xs text-white/40 leading-relaxed">{slot.task}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Agents — @react-best-practices @ui-ux-pro-max */}
              <div className="mb-6">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-[#888] uppercase mb-3">
                  {state.mode === 'auto'
                    ? '🤖 AI-Selected Agents (Top 3)'
                    : `🤖 Select Agents (${state.agents.length} available)`}
                </h3>

                {/* AUTO MODE — show only top 3, no interaction */}
                {state.mode === 'auto' && (
                  <div className="grid grid-cols-3 gap-3">
                    {(() => {
                      const selectedIds = Object.values(state.selectedAgents).flat();
                      const uniqueIds = [...new Set(selectedIds)];
                      const top3 = uniqueIds.slice(0, 3).map(id => state.agents.find(a => a._id === id)).filter(Boolean);
                      return top3.map((agent, idx) => (
                        <div key={agent._id} className="agent-card selected" style={{ cursor: 'default' }}>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm">{['🥇', '🥈', '🥉'][idx]}</span>
                            <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wider text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
                              {agent.category}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-medium ${winRateClass(agent.winRate || 0)}`}>
                              {agent.winRate || 0}% win
                            </span>
                            <span className="text-xs text-white/20">
                              {agent.totalAuditions || 0} battles
                            </span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {/* MANUAL MODE — show all agents, user picks */}
                {state.mode === 'manual' && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {state.agents.map((agent) => {
                      const isSelected = Object.values(state.selectedAgents).some(arr => arr.includes(agent._id));
                      return (
                        <div
                          key={agent._id}
                          className={`agent-card${isSelected ? ' selected' : ''}`}
                          onClick={() => {
                            state.slots.forEach((_, idx) => {
                              dispatch({ type: 'SELECT_AGENT', payload: { slotIdx: idx, agentId: agent._id } });
                            });
                          }}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`badge-${agent.badgeTier || 'unverified'} text-sm`}>
                              {badgeIcon(agent.badgeTier)}
                            </span>
                            <span className="text-sm font-medium text-white truncate">{agent.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] uppercase tracking-wider text-white/30 bg-white/[0.04] px-2 py-0.5 rounded-full">
                              {agent.category}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className={`text-xs font-medium ${winRateClass(agent.winRate || 0)}`}>
                              {agent.winRate || 0}% win
                            </span>
                            <span className="text-xs text-white/20">
                              {agent.totalAuditions || 0} battles
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7c3aed] flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <button
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                  onClick={() => dispatch({ type: 'RESET' })}
                >
                  ← Start Over
                </button>
                <button
                  className="glow-button group h-12 transition-transform active:scale-95"
                  style={{ borderRadius: 999 }}
                  onClick={handleStartBattle}
                  disabled={state.phase === 'launching'}
                >
                  <div className="glow-button-track" style={{ borderRadius: 999 }}></div>
                  <div className="glow-button-inner px-10" style={{ borderRadius: 999 }}>
                    <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                      {state.phase === 'launching' ? '⏳ Starting...' : '⚔️ Start Battle'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
