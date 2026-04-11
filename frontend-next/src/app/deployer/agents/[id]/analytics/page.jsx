'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getMyAgentDetail } from '@/lib/api';

const AgentAnalyticsPage = () => {
  const router = useRouter();
  const params = useParams();
  const agentId = params.id;
  
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [agent, setAgent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch the specific agent data
  const fetchAgent = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await getMyAgentDetail(agentId);
      const a = res.data?.agent;
      if (a) {
        setAgent({
          ...a,
          id: a._id || a.id,
          status: a.isActive ? 'active' : 'paused',
          badge: a.badgeTier || 'tested',
          totalBattles: a.totalAuditions || 0,
          totalRuns: a.totalRuns || a.totalAuditions || 0,
          avgScore: a.avgScore || a.reliabilityScore || 0,
        });
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

  // Generate chart data from agent stats (seeded from agent ID for consistency)
  const generateChartData = (agent) => {
    if (!agent) return [];
    const seed = parseInt(String(agent.id).slice(-4), 16) || 1;
    const baseWinRate = agent.winRate || 50;
    const points = [];
    for (let i = 0; i < 30; i++) {
      const x = i * 10;
      const noise = Math.sin(seed * 13 + i * 7) * 15 + Math.cos(seed * 5 + i * 3) * 8;
      const winRate = Math.max(5, Math.min(95, baseWinRate + noise - (i * 0.3)));
      const y = 100 - winRate;
      points.push([x, Math.round(y), Math.round(winRate)]);
    }
    return points;
  };

  const chartData = generateChartData(agent);
  const polyPoints = chartData.map(([x, y]) => `${x},${y}`).join(' ');

  // Derive badge config
  const getBadgeConfig = (badge) => {
    const configs = {
      tested:     { label: 'Tested',     className: 'border-white/20 bg-white/5 text-white/70' },
      verified:   { label: 'Verified',   className: 'border-[#22c55e]/20 bg-[#22c55e]/10 text-[#4ade80]', icon: 'verified' },
      elite:      { label: 'Elite',      className: 'border-amber-400/20 bg-amber-400/10 text-amber-400', icon: 'star' },
      unverified: { label: 'Unverified', className: 'border-white/10 bg-white/5 text-white/50' },
    };
    return configs[badge] || configs.tested;
  };

  if (isLoading) {
    return (
      <div className="w-full max-w-[1000px] mx-auto flex items-center justify-center min-h-[60vh]">
        <span className="font-body text-sm text-on-surface-variant animate-pulse">Loading analytics...</span>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="w-full max-w-[1000px] mx-auto flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30">error</span>
        <p className="font-body text-sm text-on-surface-variant">Agent not found.</p>
        <button onClick={() => router.push('/deployer')} className="font-body text-sm text-purple-400 hover:text-purple-300 transition-colors">
          ← Go back
        </button>
      </div>
    );
  }

  const badgeCfg = getBadgeConfig(agent.badge);

  return (
    <div className="w-full max-w-[1000px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 flex flex-col min-h-screen pt-8 pb-16 px-6 relative">
       
       {/* Top Section */}
       <div className="grid grid-cols-3 items-center w-full mb-12 border-b border-white/10 pb-8">
         {/* Left */}
         <button 
           onClick={() => router.push('/deployer')}
           className="flex items-center gap-2 text-on-surface-variant hover:text-white transition-colors justify-self-start font-body text-sm font-medium"
         >
           <span className="material-symbols-outlined text-[20px]">arrow_back</span>
           My Agents
         </button>
         
         {/* Center */}
         <div className="flex flex-col items-center justify-center justify-self-center">
           <h1 className="font-headline text-[28px] font-bold tracking-tight text-white mb-2">
             {agent.name}
           </h1>
           <div className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${badgeCfg.className}`}>
              {badgeCfg.icon && <span className="material-symbols-outlined text-[13px]">{badgeCfg.icon}</span>}
              {badgeCfg.label}
           </div>
         </div>

         {/* Right */}
         <button 
           onClick={() => router.push(`/deployer/agents/${agent.id}/settings`)}
           className="rounded-[28px] bg-white px-6 py-2.5 font-headline text-sm font-semibold tracking-wide text-black transition-opacity hover:opacity-90 active:scale-[0.98] justify-self-end"
         >
           Edit Agent
         </button>
       </div>

       {/* Stats Row */}
       <div className="grid grid-cols-4 gap-4 w-full mb-10">
          <StatCard label="Win Rate" value={`${agent.winRate || 0}%`} />
          <StatCard label="Total Runs" value={String(agent.totalRuns || agent.totalBattles || 0)} />
          <StatCard label="Avg Score" value={`${agent.avgScore || '—'}/100`} />
          <StatCard label="Revenue" value={agent.revenue ? `Rs. ${agent.revenue}` : 'Free'} />
       </div>

       {/* Chart Section */}
       <div className="flex flex-col w-full mb-10 gap-4">
          <h2 className="font-headline text-lg font-bold text-white px-2">Win Rate Over Time</h2>
          <div className="relative w-full h-[240px] border border-white/10 rounded-2xl bg-white/[0.02] overflow-hidden flex flex-col justify-between">
            {/* Grid Lines */}
            <div className="absolute inset-x-0 inset-y-6 flex flex-col justify-between pointer-events-none px-6">
              <div className="border-b border-white/5 w-full h-0"></div>
              <div className="border-b border-white/5 w-full h-0"></div>
              <div className="border-b border-white/5 w-full h-0"></div>
              <div className="border-b border-white/5 w-full h-0"></div>
              <div className="border-b border-white/5 w-full h-0"></div>
            </div>
            {/* SVG Statistical Line Chart */}
            <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 290 100">
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(168,85,247,0.15)" />
                    <stop offset="100%" stopColor="rgba(168,85,247,0.01)" />
                  </linearGradient>
                </defs>
                {/* Area fill */}
                <polygon
                  points={`${polyPoints} 290,100 0,100`}
                  fill="url(#chart-gradient)"
                />
                {/* Line */}
                <polyline
                  points={polyPoints}
                  fill="none"
                  stroke="rgba(168,85,247,0.9)"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data point dots + invisible hover rects */}
                {chartData.map(([cx, cy, wr], i) => (
                  <g key={i}>
                    <circle 
                      cx={cx} cy={cy} r={hoveredPoint === i ? 5 : 3} 
                      fill="#a855f7" 
                      opacity={hoveredPoint === i ? 1 : 0.7} 
                      vectorEffect="non-scaling-stroke"
                      className="transition-all duration-150"
                    />
                    <rect
                      x={cx - 5} y={0} width={10} height={100}
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint(i)}
                      onMouseLeave={() => setHoveredPoint(null)}
                      style={{ cursor: 'crosshair' }}
                    />
                  </g>
                ))}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPoint !== null && (
              <div 
                className="absolute z-20 pointer-events-none animate-in fade-in duration-100"
                style={{
                  left: `${(chartData[hoveredPoint][0] / 290) * 100}%`,
                  top: `${(chartData[hoveredPoint][1] / 100) * 100 - 14}%`,
                  transform: 'translate(-50%, -100%)'
                }}
              >
                <div className="rounded-lg border border-white/10 bg-[#111]/95 backdrop-blur-md px-3 py-1.5 shadow-xl">
                  <span className="font-mono text-xs font-bold text-purple-400">{chartData[hoveredPoint][2]}%</span>
                  <span className="font-body text-[10px] text-on-surface-variant ml-1">Day {hoveredPoint + 1}</span>
                </div>
              </div>
            )}

            {/* Vertical hover line */}
            {hoveredPoint !== null && (
              <div 
                className="absolute top-0 bottom-0 w-px bg-white/10 pointer-events-none"
                style={{ left: `${(chartData[hoveredPoint][0] / 290) * 100}%` }}
              />
            )}
            {/* Y-axis labels */}
            <div className="absolute left-3 inset-y-4 flex flex-col justify-between pointer-events-none">
              <span className="font-mono text-[10px] text-on-surface-variant/50">80%</span>
              <span className="font-mono text-[10px] text-on-surface-variant/50">60%</span>
              <span className="font-mono text-[10px] text-on-surface-variant/50">40%</span>
              <span className="font-mono text-[10px] text-on-surface-variant/50">20%</span>
            </div>
          </div>
       </div>

       {/* Dual Section Grid */}
       <div className="grid grid-cols-2 gap-8 w-full">
         
         {/* Score Breakdown Column */}
         <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.01] p-6">
           <h2 className="font-headline text-lg font-bold text-white">Evaluation Breakdown</h2>
           <div className="flex flex-col gap-5">
             <ProgressBar label="Accuracy" value={agent.avgScore || 75} />
             <ProgressBar label="Completeness" value={Math.max(40, (agent.avgScore || 75) - 5)} />
             <ProgressBar label="Format Quality" value={Math.max(50, (agent.avgScore || 75) - 1)} />
             <ProgressBar label="Hallucination Rate" value={Math.max(2, Math.round(100 - (agent.avgScore || 75)) / 2)} />
           </div>
         </div>

         {/* Agent Details Column */}
         <div className="flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.01] p-6">
           <h2 className="font-headline text-lg font-bold text-white">Agent Details</h2>
           <div className="flex flex-col gap-3">
             <DetailRow label="Category" value={agent.category} />
             <DetailRow label="Status" value={agent.status} />
             <DetailRow label="Pricing" value={agent.price > 0 ? `Rs. ${agent.price} / run` : 'Free'} />
             <DetailRow label="Total Battles" value={String(agent.totalBattles)} />
             <DetailRow label="Created" value={agent.createdAt ? new Date(agent.createdAt).toLocaleDateString() : '—'} />
           </div>
         </div>

       </div>

    </div>
  );
};

// Subcomponents

const StatCard = ({ label, value }) => (
  <div className="flex flex-col p-6 rounded-2xl border border-white/10 bg-white/[0.03] justify-center text-center sm:text-left shadow-lg">
    <span className="font-body text-xs text-on-surface-variant uppercase tracking-widest font-semibold mb-2">{label}</span>
    <span className="font-headline text-3xl font-bold text-white">{value}</span>
  </div>
);

const ProgressBar = ({ label, value }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between font-body text-sm">
        <span className="text-on-surface-variant font-medium">{label}</span>
        <span className="text-white font-semibold">{value}%</span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/[0.05]">
        <div 
          className="h-full rounded-full bg-purple-500 transition-all duration-1000 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
};

const DetailRow = ({ label, value }) => (
  <div className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-black/20 hover:bg-white/[0.02] transition-colors">
    <span className="font-body text-sm font-medium text-on-surface-variant">{label}</span>
    <span className="font-body text-sm font-semibold text-white capitalize">{value}</span>
  </div>
);

export default AgentAnalyticsPage;
