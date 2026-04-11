// ═══════════════════════════════════════════════════════════
// AgentArena — Agent Card Component
// ═══════════════════════════════════════════════════════════

const AgentCard = {
  render(agent, opts = {}) {
    const { compact = false, showStats = true, isWinner = false } = opts;
    const winnerClass = isWinner ? 'winner' : '';

    return `
      <div class="agent-card ${winnerClass}" data-agent-id="${agent._id}">
        <div class="agent-header">
          <span class="agent-name">${Helpers.escapeHtml(agent.name)}</span>
          <span>${Helpers.categoryBadge(agent.category)}</span>
        </div>
        ${!compact ? `<p class="agent-desc">${Helpers.escapeHtml(Helpers.truncate(agent.description, 120))}</p>` : ''}
        ${showStats ? `
          <div class="agent-stats">
            <span>Score: <span class="stat-value">${agent.reliabilityScore || 0}</span></span>
            <span>Win: <span class="stat-value">${agent.winRate || 0}%</span></span>
            <span>Runs: <span class="stat-value">${agent.totalAuditions || 0}</span></span>
            <span>${Helpers.tierBadge(agent.badgeTier || 'unverified')}</span>
          </div>
        ` : ''}
      </div>
    `;
  }
};
