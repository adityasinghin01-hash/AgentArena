'use client';
// Screen 9a: Agent Marketplace — "My Agents" + "Explore Marketplace"
// Skills: @ui-ux-pro-max @dark-mode-ui @glassmorphism @design-spells
//         @react-best-practices @frontend-developer @senior-fullstack

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { searchAgents, getMyAgents } from '@/lib/api';
import Navbar from '@/components/Navbar';

const Beams = dynamic(() => import('@/components/Beams'), { ssr: false });

// ── Constants ────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'all', label: 'All', icon: '🌐' },
  { value: 'security', label: 'Security', icon: '🛡️' },
  { value: 'writing', label: 'Writing', icon: '✍️' },
  { value: 'coding', label: 'Coding', icon: '💻' },
  { value: 'data', label: 'Data', icon: '📊' },
  { value: 'business', label: 'Business', icon: '💼' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'marketing', label: 'Marketing', icon: '📣' },
  { value: 'assistant', label: 'Assistant', icon: '🤖' },
  { value: 'health', label: 'Health', icon: '🏥' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'classifier', label: 'Classifier', icon: '🏷️' },
  { value: 'analyzer', label: 'Analyzer', icon: '🔬' },
  { value: 'other', label: 'Other', icon: '🧩' },
];

const SORT_OPTIONS = [
  { value: 'reliability', label: 'Reliability' },
  { value: 'winRate', label: 'Win Rate' },
  { value: 'totalAuditions', label: 'Most Battles' },
  { value: 'newest', label: 'Newest' },
];

const BADGE_COLORS = {
  elite: { bg: 'rgba(255, 215, 0, 0.1)', border: '#ffd700', text: '#ffd700' },
  verified: { bg: 'rgba(34, 211, 238, 0.1)', border: '#22d3ee', text: '#22d3ee' },
  tested: { bg: 'rgba(167, 139, 250, 0.1)', border: '#a78bfa', text: '#a78bfa' },
  unverified: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.3)' },
};

const CAT_ICONS = {
  security: '🛡️', writing: '✍️', coding: '💻', data: '📊', business: '💼',
  education: '📚', marketing: '📣', assistant: '🤖', health: '🏥', travel: '✈️',
  classifier: '🏷️', writer: '✍️', ranker: '📊', analyzer: '🔬',
  linter: '🧹', scanner: '🔍', explainer: '📖', scheduler: '📅',
  researcher: '🔬', other: '🧩',
};

// ═══════════════════════════════════════════════════════════════
export default function MarketplacePage() {
  const router = useRouter();
  const [allAgents, setAllAgents] = useState([]);
  const [myAgents, setMyAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('reliability');
  const [selected, setSelected] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const debounceRef = useRef(null);

  // Detect deployer role — deployers view agents, not battle them
  const isDeployer = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const role = sessionStorage.getItem('selectedRole');
    return role === 'deployer';
  }, []);

  // ── Load all marketplace agents ─────────────────────────────
  const loadAll = useCallback(async (q, cat, s) => {
    try {
      setLoading(true);
      const res = await searchAgents(q, cat, s, 1);
      setAllAgents(res.data?.agents || []);
      setTotal(res.data?.total || 0);
    } catch {
      setAllAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Load my agents (authenticated) ──────────────────────────
  const loadMine = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      if (!token) { setIsLoggedIn(false); return; }
      setIsLoggedIn(true);
      const res = await getMyAgents();
      const active = (res.data?.agents || []).filter(a => a.isActive);
      setMyAgents(active);
    } catch {
      setMyAgents([]);
    }
  }, []);

  useEffect(() => {
    loadAll('', 'all', 'reliability');
    loadMine();
  }, [loadAll, loadMine]);

  // ── Debounced search ───────────────────────────────────────
  const handleSearch = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => loadAll(val, category, sort), 300);
  };

  const handleCategory = (cat) => { setCategory(cat); loadAll(query, cat, sort); };
  const handleSort = (s) => { setSort(s); loadAll(query, category, s); };

  // ── Selection ──────────────────────────────────────────────
  const toggleSelect = (agent) => {
    setSelected((prev) => {
      const exists = prev.find(a => a._id === agent._id);
      if (exists) return prev.filter(a => a._id !== agent._id);
      if (prev.length >= 4) return prev;
      return [...prev, agent];
    });
  };

  const isSelected = (id) => selected.some(a => a._id === id);

  const startBattle = () => {
    const ids = selected.map(a => a._id).join(',');
    router.push(`/arena?agents=${ids}`);
  };

  // ── Separate "explore" agents (exclude mine) ───────────────
  const myAgentIds = new Set(myAgents.map(a => a._id));
  const exploreAgents = allAgents.filter(a => !myAgentIds.has(a._id));

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-surface">
      <div className="fixed inset-0 z-0" style={{ opacity: 0.2 }}>
        <Beams beamWidth={3} beamHeight={30} beamNumber={4} lightColor="#ffffff" speed={2} noiseIntensity={1.75} scale={0.2} rotation={30} />
      </div>
      <div className="noise-overlay" />
      <Navbar />

      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-[80px] pb-32">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="font-serif italic text-3xl text-white mb-1">🏪 Agent Marketplace</h1>
          <p className="text-white/30 text-sm">
            {isDeployer ? 'Browse AI agents, manage yours, and explore the marketplace' : 'Browse AI agents and build your battle squad'}
          </p>
        </div>

        {/* ── Search + Filters ── */}
        <div className="mkt-filter-bar">
          <div className="mkt-search-wrap">
            <span className="mkt-search-icon">🔍</span>
            <input
              type="text"
              className="mkt-search-input"
              placeholder="Search agents..."
              value={query}
              onChange={(e) => handleSearch(e.target.value)}
            />
            {query && (
              <button className="mkt-search-clear" onClick={() => { setQuery(''); loadAll('', category, sort); }}>✕</button>
            )}
          </div>
          <select className="mkt-select" value={category} onChange={(e) => handleCategory(e.target.value)}>
            {CATEGORIES.map(c => (
              <option key={c.value} value={c.value}>{c.icon} {c.label}</option>
            ))}
          </select>
          <select className="mkt-select" value={sort} onChange={(e) => handleSort(e.target.value)}>
            {SORT_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* ── Loading Skeleton ── */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="shimmer" style={{ height: 240, borderRadius: 16 }} />
            ))}
          </div>
        ) : isDeployer ? (
          /* ═══════════════ DEPLOYER VIEW: My Agents + Explore split ═══════════════ */
          <>
            {isLoggedIn && myAgents.length > 0 && !query && category === 'all' && (
              <div className="mb-12">
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-[10px] font-bold tracking-[0.2em] text-purple-400/60 uppercase">
                    🚀 My Agents
                  </h2>
                  <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-400 uppercase tracking-widest">
                    {myAgents.length} Active
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myAgents.map(agent => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      isOwned={true}
                      isSelected={false}
                      onEdit={() => router.push(`/deployer/agents/${agent._id}/analytics`)}
                      onView={() => router.push(`/agents/${agent._id}`)}
                      maxReached={false}
                      isDeployer={true}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase">
                  🌐 Explore Marketplace
                </h2>
                {total > 0 && (
                  <span className="text-white/15 text-[10px] font-bold tracking-[0.2em] uppercase">
                    ({exploreAgents.length})
                  </span>
                )}
              </div>
              {exploreAgents.length === 0 ? (
                <div className="dash-empty-state">
                  <div className="text-4xl mb-4">🤖</div>
                  <h3 className="text-white/60 text-lg font-serif italic mb-2">No agents found</h3>
                  <p className="text-white/25 text-sm">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {exploreAgents.map(agent => (
                    <AgentCard
                      key={agent._id}
                      agent={agent}
                      isOwned={false}
                      isSelected={false}
                      onView={() => router.push(`/agents/${agent._id}`)}
                      maxReached={false}
                      isDeployer={true}
                    />
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          /* ═══════════════ USER VIEW: Single flat grid of ALL agents ═══════════════ */
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-[10px] font-bold tracking-[0.2em] text-white/25 uppercase">
                🌐 All Agents
              </h2>
              {total > 0 && (
                <span className="text-white/15 text-[10px] font-bold tracking-[0.2em] uppercase">
                  ({allAgents.length})
                </span>
              )}
            </div>
            {allAgents.length === 0 ? (
              <div className="dash-empty-state">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-white/60 text-lg font-serif italic mb-2">No agents found</h3>
                <p className="text-white/25 text-sm">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {allAgents.map(agent => (
                  <AgentCard
                    key={agent._id}
                    agent={agent}
                    isOwned={false}
                    isSelected={isSelected(agent._id)}
                    onToggle={() => toggleSelect(agent)}
                    maxReached={selected.length >= 4}
                    isDeployer={false}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Sticky Selection Bar ── */}
      {/* Selection bar — only for users, not deployers */}
      {!isDeployer && selected.length > 0 && (
        <div className="mkt-selection-bar">
          <div className="mkt-selection-inner">
            <div className="mkt-selection-agents">
              {selected.map(a => (
                <div key={a._id} className="mkt-selection-chip">
                  <span>{CAT_ICONS[a.category] || '🤖'}</span>
                  <span className="mkt-selection-name">{a.name}</span>
                  <button className="mkt-selection-remove" onClick={() => toggleSelect(a)}>✕</button>
                </div>
              ))}
              <span className="text-white/20 text-xs">{selected.length}/4 selected</span>
            </div>
            <button className="glow-button group h-10 transition-transform active:scale-95" style={{ borderRadius: 999 }}
              onClick={startBattle}>
              <div className="glow-button-track" style={{ borderRadius: 999 }} />
              <div className="glow-button-inner px-6" style={{ borderRadius: 999 }}>
                <span className="font-headline text-xs font-bold tracking-widest text-black uppercase group-hover:text-white">⚔️ Start Battle →</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// AGENT CARD COMPONENT — with owner edit icon
// ═══════════════════════════════════════════════════════════════
function AgentCard({ agent, featured, isOwned, isSelected, onToggle, onEdit, onView, maxReached, isDeployer }) {
  const badge = BADGE_COLORS[agent.badgeTier] || BADGE_COLORS.unverified;
  const icon = CAT_ICONS[agent.category] || '🤖';
  const wr = Math.round(agent.winRate || 0);

  return (
    <div className={`mkt-card ${featured ? 'mkt-card-featured' : ''} ${isSelected ? 'mkt-card-selected' : ''} ${isOwned ? 'ring-1 ring-purple-500/20' : ''}`}
      style={featured ? { borderColor: badge.border } : undefined}>

      {/* Header */}
      <div className="mkt-card-header">
        <div className="mkt-card-avatar" style={{ borderColor: isOwned ? '#a855f7' : badge.border }}>
          {icon}
        </div>
        <div className="mkt-card-title-area" style={{ flex: 1 }}>
          <Link href={`/agents/${agent._id}`} className="mkt-card-name">{agent.name}</Link>
          <div className="flex items-center gap-2">
            <span className="mkt-card-category">{agent.category}</span>
            <span className="mkt-card-badge" style={{ background: badge.bg, color: badge.text, borderColor: badge.border }}>
              {agent.badgeTier === 'elite' ? '⭐' : agent.badgeTier === 'verified' ? '✓' : '•'} {agent.badgeTier}
            </span>
          </div>
        </div>

        {/* Owner edit icon */}
        {isOwned && onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 transition-all duration-200 shrink-0 ml-2 group/edit"
            title="View Analytics & Edit"
          >
            <span className="material-symbols-outlined text-[16px] text-purple-400 group-hover/edit:text-purple-300 transition-colors">edit</span>
          </button>
        )}
      </div>

      {/* Description */}
      <p className="mkt-card-desc">{agent.description}</p>

      {/* Stats */}
      <div className="mkt-card-stats">
        <div className="mkt-card-stat">
          <div className="mkt-stat-bar-track">
            <div className="mkt-stat-bar-fill" style={{ width: `${wr}%`, background: wr > 60 ? '#22d3ee' : wr > 30 ? '#a78bfa' : 'rgba(255,255,255,0.2)' }} />
          </div>
          <span className="mkt-stat-label">Win {wr}%</span>
        </div>
        <span className="mkt-stat-divider">·</span>
        <span className="mkt-stat-label">{agent.totalAuditions || 0} battles</span>
        {agent.deployedBy?.name && (
          <>
            <span className="mkt-stat-divider">·</span>
            <span className="mkt-stat-label">by {agent.deployedBy.name}</span>
          </>
        )}
      </div>

      {/* Action Button — deployers get "View", users get "+ Select" */}
      {isDeployer ? (
        <button
          className="mkt-card-select"
          onClick={(e) => { e.stopPropagation(); onView?.(); }}
        >
          View Agent →
        </button>
      ) : (
        <button
          className={`mkt-card-select ${isSelected ? 'mkt-card-select-active' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
          disabled={!isSelected && maxReached}>
          {isSelected ? '✓ Selected' : '+ Select'}
        </button>
      )}
    </div>
  );
}
