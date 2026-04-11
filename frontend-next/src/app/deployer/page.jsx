'use client';
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getMyAgents, toggleAgentStatus } from '@/lib/api';

// ── Dock-Style Navigation Menu ──────────────────────────────
const DockMenu = ({ isOpen, onClose }) => {
  const router = useRouter();
  const menuRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(-1);

  const menuItems = [
    { label: 'My Agents',      icon: 'smart_toy',     path: '/deployer' },
    { label: 'Publish Agent',   icon: 'add_circle',    path: '/deployer/publish' },
    { label: 'Marketplace',     icon: 'storefront',    path: '/agents' },
  ];

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    };
    if (isOpen) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 10);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen, onClose]);

  // Dock magnification: scale items based on distance from hovered item
  const getScale = (index) => {
    if (hoveredIndex === -1) return 1;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 1.15;
    if (distance === 1) return 1.06;
    return 1;
  };

  const getLeftPad = (index) => {
    if (hoveredIndex === -1) return 0;
    const distance = Math.abs(index - hoveredIndex);
    if (distance === 0) return 12;
    if (distance === 1) return 5;
    return 0;
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="absolute top-14 right-0 z-[80] w-[220px] rounded-2xl border border-white/10 bg-[#0a0a0a]/95 backdrop-blur-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
      style={{ transformOrigin: 'top right' }}
    >
      <div className="p-2 flex flex-col gap-0.5">
        {menuItems.map((item, i) => (
          <button
            key={item.path}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(-1)}
            onClick={() => { router.push(item.path); onClose(); }}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-body text-white/80 hover:text-white transition-all duration-200 ease-out cursor-pointer"
            style={{
              transform: `scale(${getScale(i)})`,
              paddingLeft: `${16 + getLeftPad(i)}px`,
              background: hoveredIndex === i ? 'rgba(255,255,255,0.08)' : 'transparent',
              transformOrigin: 'left center',
            }}
          >
            <span
              className="material-symbols-outlined text-[18px] transition-all duration-200"
              style={{
                color: hoveredIndex === i ? '#a855f7' : 'rgba(255,255,255,0.5)',
                transform: hoveredIndex === i ? 'scale(1.2)' : 'scale(1)',
              }}
            >
              {item.icon}
            </span>
            <span
              className="font-medium tracking-wide transition-all duration-200"
              style={{
                fontWeight: hoveredIndex === i ? 600 : 400,
              }}
            >
              {item.label}
            </span>
            {/* Active indicator dot */}
            {hoveredIndex === i && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-purple-400 animate-in fade-in duration-150" />
            )}
          </button>
        ))}
      </div>
      {/* Bottom accent line */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    </div>
  );
};

// ── Main Dashboard ──────────────────────────────────────────
const DeployerDashboard = () => {
  const router = useRouter();
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    setIsLoading(true);
    try {
      const res = await getMyAgents();
      const mapped = (res.data?.agents || []).map(a => ({
        ...a,
        id: a._id || a.id,
        status: a.isActive !== undefined ? (a.isActive ? 'active' : 'paused') : (a.status || 'active'),
        badge: a.badgeTier || a.badge || 'tested',
        totalBattles: a.totalAuditions || a.totalBattles || 0,
        totalRuns: a.totalRuns || a.totalAuditions || 0,
      }));
      setAgents(mapped);
    } catch (err) {
      console.error('Failed to fetch deployed agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Stats: Published = only active agents, rest computed from all
  const currentStats = useMemo(() => {
    let totalRuns = 0;
    let sumWinRate = 0;
    let totalRevenue = 0;
    let activeCount = 0;
    let pausedCount = 0;

    agents.forEach(agent => {
      totalRuns += (agent.totalRuns || agent.totalBattles || 0);
      sumWinRate += (agent.winRate || 0);
      totalRevenue += (agent.revenue || 0);
      if (agent.status === 'active') {
        activeCount += 1;
      } else {
        pausedCount += 1;
      }
    });

    const avgWinRate = agents.length > 0 ? Math.round(sumWinRate / agents.length) : 0;

    return {
      cards: [
        { label: 'Active on Marketplace', value: String(activeCount), accent: activeCount > 0 },
        { label: 'Paused',                value: String(pausedCount) },
        { label: 'Total Runs',            value: totalRuns.toLocaleString() },
        { label: 'Avg Win Rate',          value: `${avgWinRate}%` },
        { label: 'Revenue',               value: `Rs. ${totalRevenue.toLocaleString()}` },
      ],
      activeCount,
      pausedCount,
      total: agents.length,
    };
  }, [agents]);

  const handleToggleStatus = async (id) => {
    try {
      // Optimistic update
      setAgents(prev =>
        prev.map(a =>
          a.id === id
            ? { ...a, status: a.status === 'active' ? 'paused' : 'active' }
            : a
        )
      );
      await toggleAgentStatus(id);
    } catch (err) {
      console.error('Failed to toggle status:', err);
      fetchAgents(); // revert
    }
  };

  // Separate active and paused for display
  const activeAgents = agents.filter(a => a.status === 'active');
  const pausedAgents = agents.filter(a => a.status !== 'active');

  return (
    <div className="w-full max-w-[1080px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col min-h-screen pt-8 pb-6 px-4 relative">

      {/* ── Top Header ─────────────────────────────────────── */}
      <div className="flex w-full items-center justify-between mb-8 relative">
        {/* Back arrow */}
        <button
          onClick={() => router.push('/arena')}
          className="text-on-surface-variant hover:text-white transition-colors mr-4"
        >
          <span className="material-symbols-outlined text-[22px]">arrow_back</span>
        </button>

        <h1 className="font-headline text-3xl font-bold tracking-tight text-white flex-1">
          Welcome back, Deployer.
        </h1>

        {/* Action buttons */}
        <div className="flex items-center gap-3 relative">
          <button
            onClick={() => router.push('/deployer/publish')}
            className="glow-button group transition-transform active:scale-[0.98]"
          >
            <div className="glow-button-track"></div>
            <div className="glow-button-inner px-6 py-3">
              <span className="font-headline flex items-center gap-2 text-sm font-semibold tracking-wide text-black transition-colors group-hover:text-white">
                Publish New Agent
                <span className="material-symbols-outlined text-sm">north_east</span>
              </span>
            </div>
          </button>

          {/* Hamburger / 3-line menu */}
          <button
            onClick={() => setMenuOpen(prev => !prev)}
            className="relative flex flex-col items-center justify-center w-10 h-10 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08] transition-all duration-200 group"
          >
            <span className={`block w-[18px] h-[2px] bg-white/70 rounded-full transition-all duration-300 group-hover:bg-white ${menuOpen ? 'rotate-45 translate-y-[5px]' : ''}`} />
            <span className={`block w-[18px] h-[2px] bg-white/70 rounded-full transition-all duration-300 group-hover:bg-white mt-[4px] ${menuOpen ? 'opacity-0 scale-0' : ''}`} />
            <span className={`block w-[18px] h-[2px] bg-white/70 rounded-full transition-all duration-300 group-hover:bg-white mt-[4px] ${menuOpen ? '-rotate-45 -translate-y-[5px]' : ''}`} />
          </button>

          {/* Dock-style dropdown menu */}
          <DockMenu isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
        </div>
      </div>

      {/* ── Stats Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 mb-8">
        {currentStats.cards.map((stat, i) => (
          <div
            key={i}
            className={`flex flex-col justify-center rounded-2xl border p-4 backdrop-blur-md transition-all duration-300 hover:scale-[1.02] ${
              stat.accent
                ? 'border-purple-500/20 bg-purple-500/[0.04] hover:bg-purple-500/[0.08]'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]'
            }`}
          >
            <p className="font-body mb-1.5 text-[11px] text-on-surface-variant uppercase tracking-widest font-semibold">{stat.label}</p>
            <p className={`font-headline text-2xl font-bold ${stat.accent ? 'text-purple-300' : 'text-white'}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* ── Active Agents Section ──────────────────────────── */}
      <div className="mb-8 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-headline text-xl font-bold text-white">Active Agents</h2>
          <span className="rounded-full bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 text-[11px] font-semibold text-green-400 uppercase tracking-widest">
            {currentStats.activeCount} Live
          </span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-on-surface-variant animate-pulse">Loading agents...</div>
        ) : activeAgents.length === 0 ? (
          <div className="p-6 text-center border border-dashed border-white/10 rounded-2xl text-on-surface-variant bg-white/[0.01] text-sm">
            No active agents on the marketplace.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {activeAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggle={handleToggleStatus}
                onClick={() => router.push(`/deployer/agents/${agent.id}/analytics`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Paused Agents Section ──────────────────────────── */}
      {pausedAgents.length > 0 && (
        <div className="mb-8 flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-headline text-lg font-semibold text-on-surface-variant">Paused Agents</h2>
            <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
              {currentStats.pausedCount} Hidden
            </span>
          </div>
          <div className="flex flex-col gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
            {pausedAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onToggle={handleToggleStatus}
                onClick={() => router.push(`/deployer/agents/${agent.id}/analytics`)}
              />
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

// ── Agent Card Component ────────────────────────────────────
const AgentCard = ({ agent, onToggle, onClick }) => {
  const isActive = agent.status === 'active';

  return (
    <div
      onClick={onClick}
      className={`flex items-center justify-between rounded-2xl border p-4 md:p-5 backdrop-blur-md transition-all duration-200 cursor-pointer ${
        isActive
          ? 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
          : 'border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10'
      }`}
    >
      <div className="flex items-center gap-4 min-w-0">
        {/* Agent icon */}
        <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 ${
          isActive ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-white/5 border border-white/10'
        }`}>
          <span className={`material-symbols-outlined text-[20px] ${isActive ? 'text-purple-400' : 'text-white/30'}`}>smart_toy</span>
        </div>

        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className={`font-headline text-base font-semibold truncate ${isActive ? 'text-white' : 'text-white/50'}`}>
              {agent.name}
            </h3>
            {agent.badge === 'verified' && <span className="material-symbols-outlined text-[14px] text-green-400">verified</span>}
            {agent.badge === 'elite' && <span className="material-symbols-outlined text-[14px] text-amber-400">star</span>}
            {agent.winRate >= 80 && (
              <span className="font-headline rounded border border-amber-400/20 bg-amber-400/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                Top Performer
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <p className="font-body text-xs text-on-surface-variant">Win Rate: {agent.winRate || 0}%</p>
            <p className="font-body text-xs text-on-surface-variant">Category: <span className="capitalize">{agent.category}</span></p>
            {!isActive && <p className="font-body text-xs text-red-400/60">Removed from marketplace</p>}
          </div>
        </div>
      </div>

      {/* Status Toggle */}
      <div className="flex items-center gap-3 ml-4 shrink-0" onClick={(e) => e.stopPropagation()}>
        <span className={`font-body text-xs font-medium ${isActive ? 'text-green-400' : 'text-on-surface-variant'}`}>
          {isActive ? 'Active' : 'Paused'}
        </span>
        <div
          onClick={() => onToggle(agent.id)}
          className={`relative h-6 w-10 shrink-0 cursor-pointer rounded-full border transition-all duration-300 ${
            isActive
              ? 'border-green-400/30 bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.35)]'
              : 'border-white/10 bg-white/20 hover:bg-white/30'
          }`}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full transition-all duration-300 ${
              isActive ? 'translate-x-[20px] bg-white' : 'translate-x-[4px] bg-white/70'
            }`}
          />
        </div>
      </div>
    </div>
  );
};

export default DeployerDashboard;
