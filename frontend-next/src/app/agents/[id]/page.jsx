'use client';
// Screen 10a: Agent Detail — full profile, stats, battle history
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @design-spells
//         @react-best-practices @frontend-developer @senior-fullstack

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { getAgentDetail, getAgentBattles } from '@/lib/api';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

const BADGE_COLORS = {
  elite: { bg: 'rgba(255,215,0,0.08)', border: '#ffd700', text: '#ffd700', glow: '0 0 30px rgba(255,215,0,0.15)' },
  verified: { bg: 'rgba(34,211,238,0.08)', border: '#22d3ee', text: '#22d3ee', glow: '0 0 30px rgba(34,211,238,0.12)' },
  tested: { bg: 'rgba(167,139,250,0.08)', border: '#a78bfa', text: '#a78bfa', glow: 'none' },
  unverified: { bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.08)', text: 'rgba(255,255,255,0.3)', glow: 'none' },
};

const CAT_ICONS = {
  classifier: '🏷️', writer: '✍️', ranker: '📊', analyzer: '🔬',
  linter: '🧹', scanner: '🔍', explainer: '📖', scheduler: '📅',
  researcher: '🔬', other: '🤖',
};

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

export default function AgentDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [agent, setAgent] = useState(null);
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Detect deployer role
  const isDeployer = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return sessionStorage.getItem('selectedRole') === 'deployer';
  }, []);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const [agentRes, battleRes] = await Promise.all([
          getAgentDetail(id),
          getAgentBattles(id).catch(() => ({ data: [] })),
        ]);
        setAgent(agentRes.data?.agent || agentRes.data);
        setBattles(battleRes.data || []);
      } catch (err) {
        setError(err.message || 'Agent not found');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="relative min-h-screen w-full bg-surface">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="shimmer" style={{ width: 400, height: 200, borderRadius: 16 }} />
            <div className="shimmer" style={{ width: 300, height: 60, borderRadius: 12 }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="relative min-h-screen w-full bg-surface">
        <Navbar />
        <div className="flex items-center justify-center min-h-screen">
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.05] p-8 text-center max-w-md">
            <p className="text-red-400 text-sm mb-4">{error || 'Agent not found'}</p>
            <Link href="/agents" className="text-white/40 text-xs hover:text-white transition-colors">
              ← Back to Marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const badge = BADGE_COLORS[agent.badgeTier] || BADGE_COLORS.unverified;
  const icon = CAT_ICONS[agent.category] || '🤖';
  const wr = Math.round(agent.winRate || 0);
  const rs = Math.round(agent.reliabilityScore || 0);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0" style={{ opacity: 0.2 }}>
        <Beams beamWidth={3} beamHeight={30} beamNumber={3} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay" />
      <Navbar />

      <main className="relative z-10 max-w-3xl mx-auto px-6 pt-[80px] pb-16">
        {/* ── Back link ── */}
        <Link href="/agents" className="text-white/25 text-xs hover:text-white/50 transition-colors mb-6 inline-block">
          ← Back to Marketplace
        </Link>

        {/* ── Agent Hero Card ── */}
        <div className="agent-detail-hero" style={{ borderColor: badge.border, boxShadow: badge.glow }}>
          <div className="agent-detail-avatar" style={{ borderColor: badge.border }}>
            {icon}
          </div>
          <div className="agent-detail-info">
            <h1 className="font-serif italic text-2xl text-white mb-1">{agent.name}</h1>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <span className="mkt-card-category">{agent.category}</span>
              <span className="mkt-card-badge" style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}>
                {agent.badgeTier === 'elite' ? '⭐' : agent.badgeTier === 'verified' ? '✓' : '•'} {agent.badgeTier}
              </span>
              {agent.deployedBy?.name && (
                <span className="text-white/20 text-xs">Deployed by {agent.deployedBy.name}</span>
              )}
            </div>
            <p className="text-white/50 text-sm leading-relaxed">{agent.description}</p>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-4 gap-3 my-8">
          {[
            { label: 'Win Rate', value: `${wr}%`, icon: '🎯', color: '#22d3ee' },
            { label: 'Total Battles', value: agent.totalAuditions || 0, icon: '⚔️', color: '#a78bfa' },
            { label: 'Reliability', value: `${rs}/100`, icon: '🛡️', color: '#34d399' },
            { label: 'Badge Tier', value: agent.badgeTier, icon: '🏅', color: badge.text },
          ].map(s => (
            <div key={s.label} className="dash-stat-card" style={{ flexDirection: 'column', textAlign: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>{s.icon}</span>
              <div className="dash-stat-value" style={{ color: s.color, fontSize: 18 }}>{s.value}</div>
              <div className="dash-stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── CTA — deployers get "Back to Marketplace", users get battle button ── */}
        <div className="flex gap-3 mb-10">
          {isDeployer ? (
            <button
              className="rounded-full border border-white/10 bg-white/[0.03] px-8 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.06] hover:text-white transition-all active:scale-95"
              onClick={() => router.push('/agents')}
            >
              ← Back to Marketplace
            </button>
          ) : (
            <button className="glow-button group h-12 transition-transform active:scale-95" style={{ borderRadius: 999 }}
              onClick={() => router.push(`/arena?agents=${agent._id}`)}>
              <div className="glow-button-track" style={{ borderRadius: 999 }} />
              <div className="glow-button-inner px-8" style={{ borderRadius: 999 }}>
                <span className="font-headline text-sm font-bold tracking-widest text-black uppercase group-hover:text-white">⚔️ Select for Battle</span>
              </div>
            </button>
          )}
        </div>

        {/* ── Battle History ── */}
        <div className="mb-8">
          <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase mb-4">
            Recent Battles {battles.length > 0 && <span className="text-white/15">({battles.length})</span>}
          </h2>

          {battles.length === 0 ? (
            <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-8 text-center">
              <p className="text-white/20 text-sm">No battle history yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {battles.map(b => {
                const won = b.overallWinner?._id === id || b.overallWinner === id;
                const topScore = b.finalLeaderboard?.[0]?.totalScore || 0;
                return (
                  <div key={b._id} className="agent-battle-card">
                    <div className="flex-1 min-w-0">
                      <div className="text-white/60 text-sm mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {b.userInput?.length > 70 ? b.userInput.substring(0, 70) + '…' : b.userInput}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-white/20">
                        <span>{timeAgo(b.createdAt)}</span>
                        <span>·</span>
                        <span>Top: {Math.round(topScore)} pts</span>
                      </div>
                    </div>
                    <div className={`agent-battle-result ${won ? 'agent-battle-won' : 'agent-battle-loss'}`}>
                      {won ? '🏆 Won' : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="rounded-xl border border-white/[0.04] bg-white/[0.01] p-4 text-center">
          <p className="text-[10px] text-white/15">AgentArena • The Competitive AI Playground</p>
        </div>
      </main>
    </div>
  );
}
