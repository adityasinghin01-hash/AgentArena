'use client';
// Screen 5a: Battle Live — Side-by-side agent panels + live leaderboard
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @frontend-developer
//         @react-best-practices @senior-fullstack @performance-optimization

import { useEffect, useReducer, useRef, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAccessToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Agent color palette ─────────────────────────────────────
const AGENT_COLORS = [
  { bg: 'rgba(124, 58, 237, 0.15)', border: 'rgba(124, 58, 237, 0.3)', accent: '#a78bfa' },
  { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)', accent: '#22d3ee' },
  { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', accent: '#fbbf24' },
  { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)', accent: '#f472b6' },
];

// ── State machine ── @react-best-practices ───────────────────
const INIT = {
  status: 'connecting', // connecting | running | done | error
  agents: {},           // { agentId: { name, outputs: [{round, text, score}], totalScore } }
  agentOrder: [],       // ordered agentIds for consistent column layout
  currentRound: 0,
  totalRounds: 0,
  leaderboard: [],
  winner: null,
  auditionId: null,
  thinkingAgents: new Set(), // agents currently generating
  error: null,
};

function battleReducer(state, action) {
  switch (action.type) {
    case 'STARTED':
      return { ...state, status: 'running', totalRounds: action.totalRounds || 0 };

    case 'AGENT_THINKING': {
      const next = new Set(state.thinkingAgents);
      next.add(action.agentId);
      return { ...state, thinkingAgents: next };
    }

    case 'AGENT_OUTPUT': {
      const { agentId, agentName, output, slot, slotIndex, responseTimeMs } = action;
      const existing = state.agents[agentId] || { name: agentName, outputs: [], totalScore: 0 };
      const next = new Set(state.thinkingAgents);
      next.delete(agentId);
      return {
        ...state,
        thinkingAgents: next,
        currentRound: Math.max(state.currentRound, slotIndex + 1),
        agents: {
          ...state.agents,
          [agentId]: {
            ...existing,
            name: agentName,
            outputs: [...existing.outputs, { round: slotIndex, slot, text: output, responseTimeMs, score: null }],
          },
        },
        agentOrder: state.agentOrder.includes(agentId) ? state.agentOrder : [...state.agentOrder, agentId],
      };
    }

    case 'AGENT_SCORES': {
      const { agentId, scores, slotIndex } = action;
      const agent = state.agents[agentId];
      if (!agent) return state;
      const updatedOutputs = agent.outputs.map(o =>
        o.round === slotIndex && o.score === null ? { ...o, score: scores } : o
      );
      return {
        ...state,
        agents: {
          ...state.agents,
          [agentId]: { ...agent, outputs: updatedOutputs, totalScore: agent.totalScore + (scores?.total || 0) },
        },
      };
    }

    case 'ROUND_COMPLETE':
      return {
        ...state,
        currentRound: action.roundNumber,
        totalRounds: action.totalRounds,
        leaderboard: action.leaderboard,
      };

    case 'WINNER':
      return {
        ...state,
        status: 'done',
        winner: { id: action.winnerId, name: action.winnerName },
        leaderboard: action.finalLeaderboard,
        auditionId: action.auditionId,
      };

    case 'COMPLETE':
      return { ...state, status: 'done', auditionId: action.auditionId || state.auditionId };

    case 'ERROR':
      return { ...state, status: 'error', error: action.message };

    default:
      return state;
  }
}

// ── Score badge helper ───────────────────────────────────────
function ScoreBadge({ score }) {
  if (score == null) return null;
  const cls = score >= 70 ? 'high' : score >= 40 ? 'mid' : 'low';
  return <span className={`score-badge ${cls}`}>{Math.round(score)}/100</span>;
}

// ── Typing indicator component ───────────────────────────────
function TypingIndicator() {
  return (
    <div className="typing-indicator">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  );
}

// ── Agent Panel component ── @glassmorphism ───────────────────
function AgentPanel({ agentId, agent, colorIdx, isThinking, currentRound }) {
  const color = AGENT_COLORS[colorIdx % AGENT_COLORS.length];
  const bodyRef = useRef(null);
  const initial = (agent?.name || '?')[0].toUpperCase();

  // Auto-scroll on new output
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [agent?.outputs?.length]);

  // Group outputs by round
  const roundGroups = {};
  (agent?.outputs || []).forEach(o => {
    if (!roundGroups[o.round]) roundGroups[o.round] = [];
    roundGroups[o.round].push(o);
  });

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <div className="agent-panel-avatar" style={{ background: `linear-gradient(135deg, ${color.accent}, ${color.border})` }}>
          {initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {agent?.name || 'Agent'}
          </div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
            Score: {agent?.totalScore || 0}
          </div>
        </div>
        {agent?.totalScore > 0 && <ScoreBadge score={agent.totalScore / (Object.keys(roundGroups).length || 1)} />}
      </div>

      <div className="agent-panel-body" ref={bodyRef}>
        {Object.entries(roundGroups).map(([roundIdx, outputs]) => (
          <div key={roundIdx}>
            <div className="round-label">Round {parseInt(roundIdx) + 1} — {outputs[0]?.slot || ''}</div>
            {outputs.map((o, i) => (
              <div key={i}>
                <div className="agent-bubble">
                  <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{o.text}</div>
                </div>
                {o.score && (
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                    <ScoreBadge score={o.score.total} />
                    <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>
                      {o.responseTimeMs ? `${(o.responseTimeMs / 1000).toFixed(1)}s` : ''}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}

        {isThinking && <TypingIndicator />}

        {(!agent?.outputs || agent.outputs.length === 0) && !isThinking && (
          <div style={{ color: 'rgba(255,255,255,0.15)', fontSize: 12, textAlign: 'center', padding: 40 }}>
            Waiting for battle to start...
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN BATTLE PAGE
// ═══════════════════════════════════════════════════════════════
export default function BattlePage() {
  const { id: pipelineId } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const userInput = searchParams.get('input') || '';
  const [state, dispatch] = useReducer(battleReducer, INIT);
  const startedRef = useRef(false);

  // ── SSE stream connection ── @senior-fullstack ─────────────
  const connectSSE = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !pipelineId) return;

    try {
      const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api/v1';
      const response = await fetch(`${BASE}/audition/run/${pipelineId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userInput }),
      });

      if (!response.ok) {
        dispatch({ type: 'ERROR', message: `Server error: ${response.status}` });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      dispatch({ type: 'STARTED', totalRounds: 0 });

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            handleSSEEvent(data);
          } catch { /* skip malformed */ }
        }
      }
    } catch (err) {
      dispatch({ type: 'ERROR', message: err.message || 'Connection failed' });
    }
  }, [pipelineId, userInput]);

  const handleSSEEvent = useCallback((data) => {
    switch (data.event) {
      case 'started':
        dispatch({ type: 'STARTED', totalRounds: data.slotCount });
        break;
      case 'agent_output':
        dispatch({
          type: 'AGENT_OUTPUT',
          agentId: data.agentId,
          agentName: data.agentName,
          output: data.output,
          slot: data.slot,
          slotIndex: data.slotIndex,
          responseTimeMs: data.responseTimeMs,
        });
        break;
      case 'agent_scores':
        dispatch({
          type: 'AGENT_SCORES',
          agentId: data.agentId,
          scores: data.scores,
          slotIndex: data.slotIndex,
        });
        break;
      case 'round_complete':
        dispatch({
          type: 'ROUND_COMPLETE',
          roundNumber: data.roundNumber,
          totalRounds: data.totalRounds,
          leaderboard: data.leaderboard,
        });
        break;
      case 'overall_winner':
        dispatch({
          type: 'WINNER',
          winnerId: data.winnerId,
          winnerName: data.winnerName,
          auditionId: data.auditionId,
          finalLeaderboard: data.finalLeaderboard,
        });
        break;
      case 'complete':
        dispatch({ type: 'COMPLETE', auditionId: data.auditionId });
        break;
      case 'error':
        dispatch({ type: 'ERROR', message: data.message });
        break;
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) { router.replace('/login'); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    connectSSE();
  }, [connectSSE, router]);

  // ── Computed values ────────────────────────────────────────
  const agentCount = state.agentOrder.length;
  const gridCols = agentCount <= 2 ? agentCount : agentCount <= 3 ? 3 : 2;

  const statusLabel = {
    connecting: '🔌 Connecting...',
    running: `⚔️ Round ${state.currentRound}/${state.totalRounds || '?'}`,
    done: '🏆 Battle Complete',
    error: '❌ Error',
  };

  const maxScore = Math.max(...(state.leaderboard.map(l => l.cumulativeScore || l.totalScore || 0)), 1);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0">
        <Beams beamWidth={3} beamHeight={30} beamNumber={12} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay"></div>
      <Navbar />

      <main className="relative z-10 flex min-h-screen w-full flex-col px-6 pt-[72px] pb-12">
        {/* ── Battle Header ── */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`h-2.5 w-2.5 rounded-full ${
              state.status === 'running' ? 'bg-cyan-400 status-pulse' :
              state.status === 'done' ? 'bg-green-400' :
              state.status === 'error' ? 'bg-red-400' : 'bg-amber-400 status-pulse'
            }`} />
            <h1 className="font-serif italic text-xl text-white">{statusLabel[state.status]}</h1>
          </div>
          {state.status === 'done' && (
            <button
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
              onClick={() => router.push('/arena')}
            >
              ← Back to Arena
            </button>
          )}
        </div>

        {/* ── Challenge prompt ── */}
        {userInput && (
          <div className="mb-4 rounded-xl border border-white/6 bg-white/[0.02] p-3">
            <span className="text-[10px] uppercase tracking-[0.15em] text-white/25 mr-2">Challenge:</span>
            <span className="text-xs text-white/50">{userInput.length > 150 ? userInput.slice(0, 150) + '...' : userInput}</span>
          </div>
        )}

        {/* ── Main layout: panels + leaderboard ── */}
        <div className="flex gap-4 flex-1" style={{ minHeight: 0 }}>
          {/* Agent Panels grid */}
          <div className="flex-1" style={{ minWidth: 0 }}>
            <div
              className="grid gap-4 h-full"
              style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
            >
              {state.agentOrder.map((agentId, idx) => (
                <AgentPanel
                  key={agentId}
                  agentId={agentId}
                  agent={state.agents[agentId]}
                  colorIdx={idx}
                  isThinking={state.thinkingAgents.has(agentId)}
                  currentRound={state.currentRound}
                />
              ))}
            </div>

            {/* Connecting state */}
            {state.status === 'connecting' && (
              <div className="flex flex-col items-center gap-4 mt-16">
                <div className="shimmer" style={{ width: 300, height: 60 }}></div>
                <div className="shimmer" style={{ width: 250, height: 40 }}></div>
                <p className="text-white/20 text-xs">Connecting to battle server...</p>
              </div>
            )}
          </div>

          {/* ── Live Leaderboard sidebar ── */}
          {state.leaderboard.length > 0 && (
            <div className="w-[260px] flex-shrink-0">
              <div className="rounded-2xl border border-white/6 bg-white/[0.02] backdrop-blur-sm p-4 sticky top-[76px]">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">
                  🏆 Leaderboard
                </h3>
                <div className="flex flex-col gap-2">
                  {state.leaderboard.map((entry, idx) => {
                    const score = entry.cumulativeScore ?? entry.totalScore ?? 0;
                    const color = AGENT_COLORS[state.agentOrder.indexOf(entry.agentId) % AGENT_COLORS.length];
                    return (
                      <div
                        key={entry.agentId}
                        className={`leaderboard-row${idx === 0 ? ' rank-1' : ''}`}
                      >
                        <span style={{ fontSize: 14, fontWeight: 700, color: idx === 0 ? '#ffd700' : 'rgba(255,255,255,0.3)', width: 20 }}>
                          {idx + 1}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {entry.agentName}
                          </div>
                          <div className="leaderboard-bar" style={{
                            width: `${Math.round((score / maxScore) * 100)}%`,
                            background: color.accent,
                            marginTop: 4,
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: color.accent }}>
                          {Math.round(score)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Winner Announcement ── */}
        {state.winner && (
          <div className="mt-8 max-w-lg mx-auto">
            <div className="winner-card">
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <h2 className="font-serif italic text-2xl text-white mb-2">{state.winner.name}</h2>
              <p className="text-white/40 text-sm mb-6">Champion of the Arena</p>
              <div className="flex gap-3 justify-center">
                <button
                  className="glow-button group h-10 transition-transform active:scale-95"
                  style={{ borderRadius: 999 }}
                  onClick={() => router.push('/arena')}
                >
                  <div className="glow-button-track" style={{ borderRadius: 999 }}></div>
                  <div className="glow-button-inner px-6" style={{ borderRadius: 999 }}>
                    <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">
                      New Battle
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Error state ── */}
        {state.error && (
          <div className="mt-8 max-w-lg mx-auto rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
            <p className="text-red-400 text-sm mb-4">{state.error}</p>
            <button
              className="text-xs text-white/40 hover:text-white/70 transition-colors"
              onClick={() => router.push('/arena')}
            >
              ← Back to Arena
            </button>
          </div>
        )}
      </main>

      <div className="fixed inset-0 z-50 m-4 pointer-events-none border border-white/5"></div>
    </div>
  );
}
