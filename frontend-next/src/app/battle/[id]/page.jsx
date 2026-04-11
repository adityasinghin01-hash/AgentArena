'use client';
// Screen 5a: Battle Live — Vertical round layout with phone-like agent cards
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @design-spells
//         @react-best-practices @frontend-developer @senior-fullstack

import { useEffect, useReducer, useRef, useCallback, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { getAccessToken } from '@/lib/auth';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Agent color palette — @design-spells ─────────────────────
const AGENT_THEMES = [
  { accent: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.25)', gradient: 'linear-gradient(135deg, #7c3aed, #a78bfa)' },
  { accent: '#22d3ee', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.25)', gradient: 'linear-gradient(135deg, #0891b2, #22d3ee)' },
  { accent: '#fbbf24', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.25)', gradient: 'linear-gradient(135deg, #d97706, #fbbf24)' },
  { accent: '#f472b6', bg: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.25)', gradient: 'linear-gradient(135deg, #db2777, #f472b6)' },
];

// ── State machine — @react-best-practices ─────────────────────
const INIT = {
  status: 'connecting',
  agents: {},
  agentOrder: [],
  rounds: [],        // array of { index, slotName, agentOutputs: {agentId: {text,score,responseTimeMs,typing}} }
  currentRound: 0,
  totalRounds: 0,
  leaderboard: [],
  winner: null,
  auditionId: null,
  error: null,
};

function battleReducer(state, action) {
  switch (action.type) {
    case 'STARTED':
      return { ...state, status: 'running', totalRounds: action.totalRounds || 0 };

    case 'AGENT_TYPING': {
      // Mark agent as typing in a specific round
      const { agentId, agentName, slotIndex, slot } = action;
      const rounds = [...state.rounds];
      if (!rounds[slotIndex]) {
        rounds[slotIndex] = { index: slotIndex, slotName: slot, agentOutputs: {} };
      }
      rounds[slotIndex] = {
        ...rounds[slotIndex],
        agentOutputs: {
          ...rounds[slotIndex].agentOutputs,
          [agentId]: { ...rounds[slotIndex].agentOutputs[agentId], typing: true, text: '', agentName },
        },
      };
      return {
        ...state,
        currentRound: Math.max(state.currentRound, slotIndex + 1),
        agentOrder: state.agentOrder.includes(agentId) ? state.agentOrder : [...state.agentOrder, agentId],
        agents: state.agents[agentId] ? state.agents : { ...state.agents, [agentId]: { name: agentName, totalScore: 0 } },
        rounds,
      };
    }

    case 'AGENT_OUTPUT': {
      const { agentId, agentName, output, slot, slotIndex, responseTimeMs } = action;
      const rounds = [...state.rounds];
      if (!rounds[slotIndex]) {
        rounds[slotIndex] = { index: slotIndex, slotName: slot, agentOutputs: {} };
      }
      rounds[slotIndex] = {
        ...rounds[slotIndex],
        agentOutputs: {
          ...rounds[slotIndex].agentOutputs,
          [agentId]: { text: output, responseTimeMs, score: null, typing: false, agentName, animating: true },
        },
      };
      return {
        ...state,
        currentRound: Math.max(state.currentRound, slotIndex + 1),
        agentOrder: state.agentOrder.includes(agentId) ? state.agentOrder : [...state.agentOrder, agentId],
        agents: {
          ...state.agents,
          [agentId]: { ...(state.agents[agentId] || {}), name: agentName, totalScore: state.agents[agentId]?.totalScore || 0 },
        },
        rounds,
      };
    }

    case 'AGENT_SCORES': {
      const { agentId, scores, slotIndex } = action;
      const rounds = [...state.rounds];
      if (!rounds[slotIndex]?.agentOutputs?.[agentId]) return state;
      rounds[slotIndex] = {
        ...rounds[slotIndex],
        agentOutputs: {
          ...rounds[slotIndex].agentOutputs,
          [agentId]: { ...rounds[slotIndex].agentOutputs[agentId], score: scores },
        },
      };
      const agent = state.agents[agentId] || { totalScore: 0 };
      return {
        ...state,
        agents: {
          ...state.agents,
          [agentId]: { ...agent, totalScore: (agent.totalScore || 0) + (scores?.total || 0) },
        },
        rounds,
      };
    }

    case 'ROUND_COMPLETE':
      return {
        ...state,
        currentRound: action.roundNumber,
        totalRounds: action.totalRounds,
        leaderboard: action.leaderboard || state.leaderboard,
      };

    case 'WINNER':
      return {
        ...state,
        status: 'done',
        winner: { id: action.winnerId, name: action.winnerName },
        leaderboard: action.finalLeaderboard || state.leaderboard,
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

// ── Word-by-word typing animation — @design-spells ────────────
function TypewriterText({ text, speed = 18, onDone }) {
  const [displayed, setDisplayed] = useState('');
  const [done, setDone] = useState(false);
  const wordsRef = useRef([]);
  const idxRef = useRef(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!text) return;
    wordsRef.current = text.split(' ');
    idxRef.current = 0;
    setDisplayed('');
    setDone(false);

    const tick = () => {
      if (idxRef.current >= wordsRef.current.length) {
        setDone(true);
        onDone?.();
        return;
      }
      const chunk = wordsRef.current.slice(idxRef.current, idxRef.current + 3).join(' ');
      idxRef.current += 3;
      setDisplayed(prev => prev ? prev + ' ' + chunk : chunk);
      // Vary speed slightly for natural feel
      const delay = speed + Math.random() * 10;
      timerRef.current = setTimeout(tick, delay);
    };
    timerRef.current = setTimeout(tick, 60);
    return () => clearTimeout(timerRef.current);
  }, [text]);

  return (
    <span>
      {displayed}
      {!done && <span className="battle-cursor">▋</span>}
    </span>
  );
}

// ── Markdown renderer ─────────────────────────────────────────
function MarkdownContent({ children }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ inline, className, children: c, ...props }) {
          const lang = (className || '').replace('language-', '');
          if (inline) return <code className="chat-inline-code" {...props}>{c}</code>;
          return (
            <div className="chat-code-block">
              {lang && <div className="chat-code-lang">{lang}</div>}
              <pre><code {...props}>{c}</code></pre>
            </div>
          );
        },
        p: ({ children: c }) => <div className="chat-paragraph">{c}</div>,
        h1: ({ children: h }) => <h3 className="chat-heading">{h}</h3>,
        h2: ({ children: h }) => <h3 className="chat-heading">{h}</h3>,
        h3: ({ children: h }) => <h4 className="chat-heading-sm">{h}</h4>,
        ul: ({ children: c }) => <ul className="chat-list">{c}</ul>,
        ol: ({ children: c }) => <ol className="chat-list chat-list-ordered">{c}</ol>,
        li: ({ children: c }) => <li className="chat-list-item">{c}</li>,
        strong: ({ children: c }) => <strong className="chat-bold">{c}</strong>,
        a: ({ href, children: c }) => <a href={href} className="chat-link" target="_blank" rel="noopener">{c}</a>,
        blockquote: ({ children: c }) => <blockquote className="chat-blockquote">{c}</blockquote>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// ── Score badge ───────────────────────────────────────────────
function ScoreBadge({ score }) {
  if (score == null) return null;
  const r = Math.round(score);
  const cls = r >= 70 ? 'high' : r >= 40 ? 'mid' : 'low';
  return <span className={`score-badge ${cls}`}>{r}/100</span>;
}

// ── Phone-like Agent Card — 400px fixed height — @glassmorphism ──
function AgentCard({ agentId, outputData, colorIdx, isTyping }) {
  const theme = AGENT_THEMES[colorIdx % AGENT_THEMES.length];
  const name = outputData?.agentName || `Agent ${colorIdx + 1}`;
  const initial = name[0].toUpperCase();
  const isFailed = outputData?.text === 'Agent failed to respond' || outputData?.text?.includes('failed to respond');
  const [animDone, setAnimDone] = useState(false);

  return (
    <div className="battle-phone-card" style={{ '--agent-accent': theme.accent, '--agent-border': theme.border, '--agent-bg': theme.bg }}>
      {/* Card header — agent identity */}
      <div className="battle-phone-header">
        <div className="battle-phone-avatar" style={{ background: isFailed ? 'rgba(239,68,68,0.2)' : theme.gradient }}>
          {isFailed ? '⚠' : initial}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="battle-phone-name">{name}</div>
          <div className="battle-phone-status" style={{ color: isTyping ? theme.accent : 'rgba(255,255,255,0.2)' }}>
            {isTyping ? '● typing...' : outputData?.text ? '✓ done' : '○ waiting'}
          </div>
        </div>
        {outputData?.score && !isFailed && <ScoreBadge score={outputData.score.total} />}
        {outputData?.responseTimeMs && (
          <span className="battle-phone-time">{(outputData.responseTimeMs / 1000).toFixed(1)}s</span>
        )}
      </div>

      {/* Card body — 400px scrollable phone-like area */}
      <div className="battle-phone-body">
        {isTyping && !outputData?.text && (
          <div className="battle-typing-row">
            <div className="typing-indicator">
              <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
            </div>
            <span className="battle-typing-label">{name} is thinking…</span>
          </div>
        )}

        {isFailed && (
          <div className="battle-phone-error">
            <span style={{ fontSize: 22 }}>⚠️</span>
            <span>Agent failed to respond — rate limited or timed out</span>
          </div>
        )}

        {outputData?.text && !isFailed && (
          <div className="battle-phone-output">
            {outputData.animating && !animDone ? (
              <TypewriterText
                text={outputData.text}
                speed={18}
                onDone={() => setAnimDone(true)}
              />
            ) : (
              <MarkdownContent>{outputData.text}</MarkdownContent>
            )}
          </div>
        )}

        {!isTyping && !outputData && (
          <div className="battle-phone-waiting">
            <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.3 }}>💬</div>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.15)' }}>Waiting…</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Round Section — all 3 agents side-by-side ─────────────────
function RoundSection({ round, agentOrder, roundRef, isActive }) {
  const agentCount = agentOrder.length;
  const cols = agentCount <= 2 ? agentCount : agentCount <= 3 ? 3 : 2;

  return (
    <div ref={roundRef} className={`battle-round-section${isActive ? ' battle-round-active' : ''}`}>
      {/* Round header */}
      <div className="battle-round-header">
        <div className="battle-round-pill">
          <span className="battle-round-num">Round {round.index + 1}</span>
          {round.slotName && <><span className="battle-round-sep">—</span><span className="battle-round-slot">{round.slotName}</span></>}
        </div>
        <div className="battle-round-line" />
      </div>

      {/* Agents grid */}
      <div className="battle-agents-grid" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {agentOrder.map((agentId, idx) => {
          const outputData = round.agentOutputs?.[agentId];
          const isTyping = outputData?.typing === true;
          return (
            <AgentCard
              key={agentId}
              agentId={agentId}
              outputData={outputData}
              colorIdx={idx}
              isTyping={isTyping}
            />
          );
        })}
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
  const roundRefs = useRef({});
  const bottomRef = useRef(null);

  // Auto-scroll to new round — @design-spells
  useEffect(() => {
    const lastRound = state.rounds.length - 1;
    if (lastRound >= 0 && roundRefs.current[lastRound]) {
      setTimeout(() => {
        roundRefs.current[lastRound]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [state.rounds.length]);

  // Auto-scroll to winner
  useEffect(() => {
    if (state.winner) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 200);
    }
  }, [state.winner]);

  // ── SSE stream — @senior-fullstack ──────────────────────────
  const handleSSEEvent = useCallback((data) => {
    switch (data.event) {
      case 'started':
        dispatch({ type: 'STARTED', totalRounds: data.slotCount });
        break;
      case 'agent_output':
        // First mark as typing started (will show after short delay)
        dispatch({ type: 'AGENT_OUTPUT', ...data });
        break;
      case 'agent_scores':
        dispatch({ type: 'AGENT_SCORES', ...data });
        break;
      case 'round_complete':
        dispatch({ type: 'ROUND_COMPLETE', roundNumber: data.roundNumber, totalRounds: data.totalRounds, leaderboard: data.leaderboard });
        break;
      case 'overall_winner':
        dispatch({ type: 'WINNER', winnerId: data.winnerId, winnerName: data.winnerName, auditionId: data.auditionId, finalLeaderboard: data.finalLeaderboard });
        break;
      case 'complete':
        dispatch({ type: 'COMPLETE', auditionId: data.auditionId });
        break;
      case 'error':
        dispatch({ type: 'ERROR', message: data.message });
        break;
    }
  }, []);

  const connectSSE = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !pipelineId) return;
    try {
      dispatch({ type: 'STARTED', totalRounds: 0 });
      const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api/v1';
      const response = await fetch(`${BASE}/audition/run/${pipelineId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userInput }),
      });
      if (!response.ok) {
        dispatch({ type: 'ERROR', message: `Server error: ${response.status}` });
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try { handleSSEEvent(JSON.parse(line.slice(6))); } catch { /* skip */ }
        }
      }
    } catch (err) {
      dispatch({ type: 'ERROR', message: err.message || 'Connection failed' });
    }
  }, [pipelineId, userInput, handleSSEEvent]);

  useEffect(() => {
    if (!getAccessToken()) { router.replace('/login'); return; }
    if (startedRef.current) return;
    startedRef.current = true;
    connectSSE();
  }, [connectSSE, router]);

  const maxScore = Math.max(...(state.leaderboard.map(l => l.cumulativeScore || l.totalScore || 0)), 1);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0" style={{ opacity: 0.35 }}>
        <Beams beamWidth={3} beamHeight={30} beamNumber={6} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay" />
      <Navbar />

      <main className="relative z-10 flex min-h-screen w-full gap-5 px-5 pt-[72px] pb-16">

        {/* ── Left: vertical rounds feed ── */}
        <div className="flex-1 min-w-0 flex flex-col">

          {/* Battle header */}
          <div className="flex items-center justify-between mb-4 mt-2">
            <div className="flex items-center gap-3">
              <div className={`h-2.5 w-2.5 rounded-full ${
                state.status === 'running' ? 'bg-cyan-400 status-pulse' :
                state.status === 'done' ? 'bg-green-400' :
                state.status === 'error' ? 'bg-red-400' : 'bg-amber-400 status-pulse'
              }`} />
              <h1 className="font-serif italic text-xl text-white">
                {state.status === 'connecting' && '🔌 Connecting…'}
                {state.status === 'running' && `⚔️ Round ${state.currentRound}/${state.totalRounds || '?'}`}
                {state.status === 'done' && '🏆 Battle Complete'}
                {state.status === 'error' && '❌ Error'}
              </h1>
            </div>
            <button className="text-xs text-white/30 hover:text-white/60 transition-colors" onClick={() => router.push('/arena')}>
              ← Back to Arena
            </button>
          </div>

          {/* Challenge prompt */}
          {userInput && (
            <div className="mb-5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
              <span className="text-[10px] uppercase tracking-[0.15em] text-white/20 mr-2">Challenge:</span>
              <span className="text-xs text-white/50">{userInput.length > 220 ? userInput.slice(0, 220) + '…' : userInput}</span>
            </div>
          )}

          {/* Connecting shimmer */}
          {state.status === 'connecting' && (
            <div className="flex flex-col gap-4 items-center mt-12">
              <div className="shimmer" style={{ width: 340, height: 56, borderRadius: 12 }} />
              <div className="shimmer" style={{ width: 260, height: 36, borderRadius: 12 }} />
              <p className="text-white/20 text-xs mt-2">Connecting to battle server…</p>
            </div>
          )}

          {/* ── Rounds — stacked vertically ── */}
          {state.rounds.map((round, i) => (
            round && (
              <RoundSection
                key={i}
                round={round}
                agentOrder={state.agentOrder}
                roundRef={el => roundRefs.current[i] = el}
                isActive={state.status === 'running' && i === state.rounds.length - 1}
              />
            )
          ))}

          {/* ── Winner card — @design-spells ── */}
          {state.winner && (
            <div ref={bottomRef} className="mt-10 max-w-xl mx-auto w-full">
              <div className="winner-card">
                <div className="winner-trophy">🏆</div>
                <h2 className="font-serif italic text-3xl text-white mb-1">{state.winner.name}</h2>
                <p className="text-white/30 text-sm mb-8">Champion of the Arena</p>
                <div className="flex gap-3 justify-center flex-wrap">
                  <button className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: 999 }} onClick={() => router.push('/arena')}>
                    <div className="glow-button-track" style={{ borderRadius: 999 }} />
                    <div className="glow-button-inner px-6" style={{ borderRadius: 999 }}>
                      <span className="font-headline text-xs font-bold tracking-widest text-black uppercase transition-colors group-hover:text-white">New Battle</span>
                    </div>
                  </button>
                  {state.auditionId && (
                    <button className="h-10 px-6 rounded-full border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-all"
                      onClick={() => router.push(`/results/${state.auditionId}`)}>
                      View Results
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {state.error && (
            <div className="mt-8 max-w-lg mx-auto rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center">
              <p className="text-red-400 text-sm mb-4">{state.error}</p>
              <button className="text-xs text-white/40 hover:text-white/70 transition-colors" onClick={() => router.push('/arena')}>← Back to Arena</button>
            </div>
          )}
        </div>

        {/* ── Right: sticky leaderboard ── */}
        {(state.leaderboard.length > 0 || state.agentOrder.length > 0) && (
          <div className="w-[220px] flex-shrink-0">
            <div className="sticky top-[84px] rounded-2xl border border-white/[0.06] bg-white/[0.015] backdrop-blur-sm p-4">
              <h3 className="text-[10px] font-bold tracking-[0.2em] text-white/30 uppercase mb-3">🏆 Leaderboard</h3>
              <div className="flex flex-col gap-2.5">
                {(state.leaderboard.length > 0 ? state.leaderboard : state.agentOrder.map(id => ({
                  agentId: id, agentName: state.agents[id]?.name || id, cumulativeScore: 0
                }))).map((entry, idx) => {
                  const score = entry.cumulativeScore ?? entry.totalScore ?? 0;
                  const agentIdx = state.agentOrder.indexOf(entry.agentId);
                  const theme = AGENT_THEMES[(agentIdx >= 0 ? agentIdx : idx) % AGENT_THEMES.length];
                  return (
                    <div key={entry.agentId} className={`leaderboard-row${idx === 0 && score > 0 ? ' rank-1' : ''}`}>
                      <span className="leaderboard-rank" style={{ color: idx === 0 ? '#ffd700' : idx === 1 ? '#c0c0c0' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.25)' }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="leaderboard-name">{entry.agentName}</div>
                        <div className="leaderboard-bar" style={{ width: `${Math.round((score / maxScore) * 100)}%`, background: theme.accent }} />
                      </div>
                      <span className="leaderboard-score" style={{ color: theme.accent }}>{Math.round(score)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Round progress */}
              {state.totalRounds > 0 && (
                <div className="mt-4 pt-3 border-t border-white/[0.04]">
                  <div className="text-[10px] text-white/20 mb-1.5">Progress</div>
                  <div className="flex gap-1">
                    {Array.from({ length: state.totalRounds }).map((_, i) => (
                      <div key={i} className="flex-1 h-1 rounded-full" style={{
                        background: i < state.currentRound ? 'rgba(167,139,250,0.6)' : 'rgba(255,255,255,0.06)'
                      }} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
