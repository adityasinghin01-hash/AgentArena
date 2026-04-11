'use client';
// Screen 8a: User Dashboard — battle history & stats
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @design-spells
//         @react-best-practices @frontend-developer @senior-fullstack

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { getAccessToken } from '@/lib/auth';
import { getMyBattles } from '@/lib/api';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Badge color map ──────────────────────────────────────────
const BADGE_COLORS = {
  elite: '#ffd700',
  verified: '#22d3ee',
  tested: '#a78bfa',
};

// ── Category icons ───────────────────────────────────────────
const CAT_ICONS = {
  scanner: '🔍', writer: '✍️', analyzer: '📊', linter: '🧹',
  reviewer: '👁️', explainer: '📖', evaluator: '⚖️', default: '🤖',
};

function getCatIcon(cat) {
  if (!cat) return CAT_ICONS.default;
  const key = cat.toLowerCase();
  return CAT_ICONS[key] || CAT_ICONS.default;
}

// ── Time ago helper ──────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ═══════════════════════════════════════════════════════════════
// MAIN DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════
export default function DashboardPage() {
  const router = useRouter();
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const loadBattles = useCallback(async (p = 1) => {
    try {
      setLoading(true);
      const res = await getMyBattles(p);
      setBattles(res.data);
      setTotalPages(res.totalPages || 1);
      setTotal(res.total || 0);
      setPage(p);
    } catch (err) {
      setError(err.message || 'Failed to load battles');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) { router.replace('/login'); return; }
    loadBattles(1);
  }, [loadBattles, router]);

  // ── Stats ────────────────────────────────────────────────
  const totalBattles = total;
  const uniqueWinners = new Set(battles.map(b => b.overallWinner?.name).filter(Boolean)).size;
  const avgScore = battles.length > 0
    ? Math.round(battles.reduce((sum, b) => {
        const top = b.finalLeaderboard?.[0]?.totalScore || 0;
        const rounds = b.finalLeaderboard?.[0]?.slotScores?.length || 1;
        return sum + (top / rounds);
      }, 0) / battles.length)
    : 0;

  // ── Loading ──────────────────────────────────────────────
  if (loading && battles.length === 0) {
    return (
      <div className="relative min-h-screen w-full bg-surface">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="shimmer" style={{ width: 320, height: 60, borderRadius: 16 }} />
            <div className="shimmer" style={{ width: 260, height: 40, borderRadius: 12 }} />
            <div className="shimmer" style={{ width: 200, height: 40, borderRadius: 12 }} />
            <p className="text-white/20 text-xs">Loading your dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0" style={{ opacity: 0.25 }}>
        <Beams beamWidth={3} beamHeight={30} beamNumber={4} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay" />
      <Navbar />

      <main className="relative z-10 max-w-5xl mx-auto px-6 pt-[80px] pb-16">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-serif italic text-3xl text-white mb-1">Dashboard</h1>
          <p className="text-white/30 text-sm">Your battle history and agent insights</p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Total Battles', value: totalBattles, icon: '⚔️', color: '#a78bfa' },
            { label: 'Unique Winners', value: uniqueWinners, icon: '🏆', color: '#ffd700' },
            { label: 'Avg Top Score', value: `${avgScore}/100`, icon: '📊', color: '#22d3ee' },
          ].map((s) => (
            <div key={s.label} className="dash-stat-card">
              <span className="dash-stat-icon">{s.icon}</span>
              <div>
                <div className="dash-stat-value" style={{ color: s.color }}>{s.value}</div>
                <div className="dash-stat-label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="flex gap-3 mb-10">
          <button className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: 999 }}
            onClick={() => router.push('/arena')}>
            <div className="glow-button-track" style={{ borderRadius: 999 }} />
            <div className="glow-button-inner px-6" style={{ borderRadius: 999 }}>
              <span className="font-headline text-xs font-bold tracking-widest text-black uppercase group-hover:text-white">⚔️ New Battle</span>
            </div>
          </button>
        </div>

        {/* ── Error state ── */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-6 text-center mb-8">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* ── Battle History ── */}
        <div className="mb-8">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase mb-4">
            Battle History {total > 0 && <span className="text-white/15">({total})</span>}
          </h2>

          {battles.length === 0 && !loading ? (
            <div className="dash-empty-state">
              <div className="text-4xl mb-4">🏟️</div>
              <h3 className="text-white/60 text-lg font-serif italic mb-2">No battles yet</h3>
              <p className="text-white/25 text-sm mb-6">Head to the Arena and start your first AI battle!</p>
              <button className="h-10 px-6 rounded-full border border-white/10 text-xs text-white/50 hover:text-white hover:border-white/25 transition-all"
                onClick={() => router.push('/arena')}>
                Go to Arena →
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {battles.map((battle) => {
                const winner = battle.overallWinner;
                const leaderboard = battle.finalLeaderboard || [];
                const topScore = leaderboard[0]?.totalScore || 0;
                const agentCount = leaderboard.length;
                const roundCount = leaderboard[0]?.slotScores?.length || 0;
                const badgeColor = BADGE_COLORS[winner?.badgeTier] || 'rgba(255,255,255,0.2)';

                return (
                  <div key={battle._id} className="dash-battle-card"
                    onClick={() => router.push(`/results/${battle._id}`)}>
                    {/* Left — Winner avatar */}
                    <div className="dash-battle-avatar" style={{ borderColor: badgeColor }}>
                      {getCatIcon(winner?.category)}
                    </div>

                    {/* Center — Info */}
                    <div className="dash-battle-info">
                      <div className="dash-battle-prompt">
                        {battle.userInput?.length > 80
                          ? battle.userInput.substring(0, 80) + '…'
                          : battle.userInput}
                      </div>
                      <div className="dash-battle-meta">
                        <span className="dash-winner-badge" style={{ borderColor: `${badgeColor}40`, color: badgeColor }}>
                          🏆 {winner?.name || 'Unknown'}
                        </span>
                        <span className="dash-meta-dot">·</span>
                        <span>{agentCount} agents</span>
                        <span className="dash-meta-dot">·</span>
                        <span>{roundCount} rounds</span>
                        <span className="dash-meta-dot">·</span>
                        <span>{timeAgo(battle.createdAt)}</span>
                      </div>
                    </div>

                    {/* Right — Score */}
                    <div className="dash-battle-score">
                      <div className="dash-score-value">{Math.round(topScore)}</div>
                      <div className="dash-score-label">pts</div>
                    </div>

                    {/* Arrow */}
                    <div className="dash-battle-arrow">→</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                className="h-8 px-4 rounded-full border border-white/10 text-xs text-white/40 hover:text-white hover:border-white/25 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                disabled={page <= 1}
                onClick={() => loadBattles(page - 1)}>
                ← Prev
              </button>
              <span className="text-white/20 text-xs">
                Page {page} of {totalPages}
              </span>
              <button
                className="h-8 px-4 rounded-full border border-white/10 text-xs text-white/40 hover:text-white hover:border-white/25 transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                disabled={page >= totalPages}
                onClick={() => loadBattles(page + 1)}>
                Next →
              </button>
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-center">
          <p className="text-[10px] text-white/15">
            AgentArena • The Competitive AI Playground
          </p>
        </div>
      </main>
    </div>
  );
}
