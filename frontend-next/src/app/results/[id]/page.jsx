'use client';
// Screen 6a: Results — Post-battle analytics & breakdowns
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @design-spells
//         @react-best-practices @frontend-developer @senior-fullstack

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAccessToken } from '@/lib/auth';
import { getAudition, generateApiKey } from '@/lib/api';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Agent colors ─────────────────────────────────────────────
const COLORS = ['#a78bfa', '#22d3ee', '#fbbf24', '#f472b6'];
const GRADIENTS = [
  'linear-gradient(135deg, #7c3aed, #a78bfa)',
  'linear-gradient(135deg, #0891b2, #22d3ee)',
  'linear-gradient(135deg, #d97706, #fbbf24)',
  'linear-gradient(135deg, #db2777, #f472b6)',
];

// ── Medal + rank labels ──────────────────────────────────────
const MEDALS = ['🥇', '🥈', '🥉'];
const RANK_COLORS = ['#ffd700', '#c0c0c0', '#cd7f32'];

// ── Score bar component ──────────────────────────────────────
function ScoreBar({ label, value, max = 100, color }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="results-score-row">
      <span className="results-score-label">{label}</span>
      <div className="results-score-track">
        <div className="results-score-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="results-score-value" style={{ color }}>{Math.round(value)}</span>
    </div>
  );
}

// ── Expandable round card ────────────────────────────────────
function RoundCard({ slotName, roundIdx, agentResults, agentColorMap }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="results-round-card">
      <button className="results-round-header" onClick={() => setOpen(!open)}>
        <span className="results-round-title">
          Round {roundIdx + 1} — {slotName}
        </span>
        <span className={`results-chevron ${open ? 'open' : ''}`}>▾</span>
      </button>
      {open && (
        <div className="results-round-body">
          {agentResults.map((r, i) => {
            const colorIdx = agentColorMap[r.agentId?._id || r.agentId] ?? i;
            const color = COLORS[colorIdx % COLORS.length];
            const failed = r.output === 'Agent failed to respond';
            return (
              <div key={i} className="results-agent-round">
                <div className="results-agent-round-header">
                  <div className="results-agent-dot" style={{ background: color }} />
                  <span className="results-agent-round-name">{r.agentName}</span>
                  {failed ? (
                    <span className="results-failed-badge">⚠ Failed</span>
                  ) : (
                    <span className="results-total-badge" style={{ color }}>
                      {Math.round(r.scores?.total || 0)}/100
                    </span>
                  )}
                </div>
                {!failed && r.scores && (
                  <div className="results-score-bars">
                    <ScoreBar label="Accuracy" value={r.scores.accuracy} color={color} />
                    <ScoreBar label="Completeness" value={r.scores.completeness} color={color} />
                    <ScoreBar label="Format" value={r.scores.format} color={color} />
                    <ScoreBar label="Hallucination" value={r.scores.hallucination} color={color} />
                  </div>
                )}
                {!failed && (
                  <div className="results-response-time">
                    ⚡ {(r.responseTimeMs / 1000).toFixed(1)}s
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN RESULTS PAGE
// ═══════════════════════════════════════════════════════════════
export default function ResultsPage() {
  const { id: auditionId } = useParams();
  const router = useRouter();
  const [audition, setAudition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [apiKeyState, setApiKeyState] = useState({ phase: 'idle', rawKey: null, keyPrefix: null, error: null });
  // phase: idle | generating | done | error

  const loadAudition = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getAudition(auditionId);
      setAudition(res.data);
    } catch (err) {
      setError(err.message || 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [auditionId]);

  useEffect(() => {
    if (!getAccessToken()) { router.replace('/login'); return; }
    loadAudition();
  }, [loadAudition, router]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-surface">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="shimmer" style={{ width: 320, height: 60, borderRadius: 16 }} />
            <div className="shimmer" style={{ width: 260, height: 40, borderRadius: 12 }} />
            <p className="text-white/20 text-xs">Loading battle results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative min-h-screen w-full bg-surface">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center max-w-md">
            <p className="text-red-400 text-sm mb-4">{error}</p>
            <button className="text-xs text-white/40 hover:text-white/70" onClick={() => router.push('/arena')}>← Back to Arena</button>
          </div>
        </div>
      </div>
    );
  }

  // ── Compute data ──────────────────────────────────────────
  const leaderboard = (audition?.finalLeaderboard || [])
    .sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  const winner = leaderboard[0];
  const winnerId = audition?.overallWinner?._id || audition?.overallWinner;
  const maxScore = Math.max(...leaderboard.map(l => l.totalScore || 0), 1);

  // Map agent IDs to color indices
  const agentColorMap = {};
  leaderboard.forEach((entry, idx) => {
    const id = entry.agentId?._id || entry.agentId;
    agentColorMap[id] = idx;
  });

  // Group results by slot (round)
  const roundMap = {};
  (audition?.results || []).forEach(r => {
    if (!roundMap[r.slotName]) roundMap[r.slotName] = [];
    roundMap[r.slotName].push(r);
  });
  const rounds = Object.entries(roundMap);

  // Stats
  const totalRounds = rounds.length;
  const totalAgents = leaderboard.length;
  const avgScore = totalAgents > 0
    ? Math.round(leaderboard.reduce((sum, l) => sum + (l.totalScore || 0), 0) / totalAgents / totalRounds)
    : 0;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0" style={{ opacity: 0.3 }}>
        <Beams beamWidth={3} beamHeight={30} beamNumber={4} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay" />
      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-[80px] pb-16">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-2">
          <button className="text-xs text-white/30 hover:text-white/60 transition-colors" onClick={() => router.push('/arena')}>
            ← Back to Arena
          </button>
          <span className="text-[10px] text-white/15 font-mono">{auditionId?.slice(-8)}</span>
        </div>

        <h1 className="font-serif italic text-3xl text-white mb-1">Battle Results</h1>
        {audition?.pipelineId?.outcomeText && (
          <p className="text-white/30 text-sm mb-8 max-w-2xl">{audition.pipelineId.outcomeText}</p>
        )}

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Rounds', value: totalRounds, icon: '⚔️' },
            { label: 'Agents', value: totalAgents, icon: '🤖' },
            { label: 'Avg Score', value: `${avgScore}/100`, icon: '📊' },
          ].map((s) => (
            <div key={s.label} className="results-stat-card">
              <span className="results-stat-icon">{s.icon}</span>
              <div>
                <div className="results-stat-value">{s.value}</div>
                <div className="results-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Winner banner ── */}
        {winner && (
          <div className="winner-card mb-10">
            <div className="winner-trophy">🏆</div>
            <h2 className="font-serif italic text-3xl text-white mb-1">{winner.agentName}</h2>
            <p className="text-white/30 text-sm mb-2">Champion of the Arena</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <span className="text-2xl font-bold" style={{ color: '#ffd700' }}>{Math.round(winner.totalScore || 0)}</span>
              <span className="text-white/20 text-sm">total points across {totalRounds} rounds</span>
            </div>
            <div className="flex gap-3 justify-center flex-wrap">
              <button className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: 999 }}
                onClick={() => router.push('/arena')}>
                <div className="glow-button-track" style={{ borderRadius: 999 }} />
                <div className="glow-button-inner px-6" style={{ borderRadius: 999 }}>
                  <span className="font-headline text-xs font-bold tracking-widest text-black uppercase group-hover:text-white">⚔️ New Battle</span>
                </div>
              </button>
              {/* Generate API Key — Skills: @ui-ux-pro-max @design-spells @senior-fullstack */}
              {apiKeyState.phase === 'idle' && (
                <button
                  className="h-10 px-6 rounded-full border border-white/10 bg-white/[0.03] text-xs font-bold tracking-widest text-white/70 uppercase hover:bg-white/[0.06] hover:border-white/20 transition-all active:scale-95"
                  onClick={async () => {
                    try {
                      setApiKeyState({ phase: 'generating', rawKey: null, keyPrefix: null, error: null });
                      const res = await generateApiKey(`${winner.agentName} - Battle Key`);
                      const data = res.data || res;
                      setApiKeyState({ phase: 'done', rawKey: data.rawKey, keyPrefix: data.key?.keyPrefix, error: null });
                    } catch (err) {
                      setApiKeyState({ phase: 'error', rawKey: null, keyPrefix: null, error: err.message || 'Failed to generate key' });
                    }
                  }}
                >
                  🔑 Generate API Key
                </button>
              )}
              {apiKeyState.phase === 'generating' && (
                <div className="h-10 px-6 rounded-full border border-white/10 bg-white/[0.03] flex items-center gap-2">
                  <span className="text-xs text-white/40 animate-pulse">Generating key...</span>
                </div>
              )}
            </div>

            {/* API Key Display — shown after generation */}
            {apiKeyState.phase === 'done' && apiKeyState.rawKey && (
              <div className="mt-5 w-full max-w-md mx-auto rounded-xl border border-emerald-500/20 bg-emerald-500/[0.05] p-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold tracking-[0.2em] text-emerald-400/60 uppercase">🔑 Your API Key</span>
                  <span className="text-[9px] text-white/20">Shown once only!</span>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-xs text-emerald-300 bg-black/30 rounded-lg px-3 py-2 font-mono break-all select-all">
                    {apiKeyState.rawKey}
                  </code>
                  <button
                    className="px-3 py-2 rounded-lg border border-white/10 bg-white/[0.03] text-xs text-white/60 hover:bg-white/[0.08] transition-all"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKeyState.rawKey);
                      const btn = event.currentTarget;
                      btn.textContent = '✓';
                      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
                    }}
                  >Copy</button>
                </div>
                <p className="text-[10px] text-white/20 mt-2">Use this key to access {winner.agentName} via API</p>
              </div>
            )}
            {apiKeyState.phase === 'error' && (
              <div className="mt-4 w-full max-w-md mx-auto rounded-xl border border-red-500/20 bg-red-500/[0.05] p-3 text-center">
                <p className="text-xs text-red-400">{apiKeyState.error}</p>
                <button className="text-[10px] text-white/30 mt-1 hover:text-white/50" onClick={() => setApiKeyState({ phase: 'idle', rawKey: null, keyPrefix: null, error: null })}>Try again</button>
              </div>
            )}
          </div>
        )}

        {/* ── Final Leaderboard ── */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase mb-4">Final Leaderboard</h2>
          <div className="flex flex-col gap-3">
            {leaderboard.map((entry, idx) => {
              const score = entry.totalScore || 0;
              const color = COLORS[idx % COLORS.length];
              const gradient = GRADIENTS[idx % GRADIENTS.length];
              const pct = Math.round((score / maxScore) * 100);
              return (
                <div key={entry.agentId} className={`results-lb-row ${idx === 0 ? 'results-lb-winner' : ''}`}>
                  <div className="results-lb-rank" style={{ color: RANK_COLORS[idx] || 'rgba(255,255,255,0.2)' }}>
                    {MEDALS[idx] || idx + 1}
                  </div>
                  <div className="results-lb-avatar" style={{ background: gradient }}>
                    {(entry.agentName || '?')[0].toUpperCase()}
                  </div>
                  <div className="results-lb-info">
                    <div className="results-lb-name">{entry.agentName}</div>
                    <div className="results-lb-bar-track">
                      <div className="results-lb-bar-fill" style={{ width: `${pct}%`, background: color }} />
                    </div>
                    {/* Per-round breakdown mini */}
                    <div className="results-lb-slots">
                      {(entry.slotScores || []).map((ss, si) => (
                        <span key={si} className="results-slot-chip" style={{ borderColor: `${color}30`, color: `${color}cc` }}>
                          R{si + 1}: {Math.round(ss.score)}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="results-lb-score" style={{ color }}>{Math.round(score)}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Round-by-round breakdown ── */}
        <div className="mb-10">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase mb-4">Round-by-Round Breakdown</h2>
          <div className="flex flex-col gap-3">
            {rounds.map(([slotName, results], idx) => (
              <RoundCard
                key={slotName}
                slotName={slotName}
                roundIdx={idx}
                agentResults={results}
                agentColorMap={agentColorMap}
              />
            ))}
          </div>
        </div>

        {/* ── Battle metadata ── */}
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-center">
          <p className="text-[10px] text-white/15">
            Battle completed {audition?.createdAt ? new Date(audition.createdAt).toLocaleString() : ''} • ID: {auditionId?.slice(-8)}
          </p>
        </div>
      </main>
    </div>
  );
}
