// ═══════════════════════════════════════════════════════════
// AgentArena — Slot Card Component
// ═══════════════════════════════════════════════════════════

const SlotCard = {
  render(slot, agents = [], status = 'pending') {
    const agentCards = (slot.assignedAgents || []).map(agent => {
      // Agent might be populated (object) or just an ID
      const agentData = typeof agent === 'object' ? agent : agents.find(a => a._id === agent);
      if (!agentData) return `<div class="text-sm text-muted">Agent loading...</div>`;
      return AgentCard.render(agentData, { compact: true, showStats: false });
    }).join('');

    return `
      <div class="slot-card ${status === 'complete' ? 'slot-complete' : ''}" data-slot="${Helpers.escapeHtml(slot.name)}">
        <div class="slot-header">
          <span class="slot-name">${Helpers.escapeHtml(slot.name)}</span>
          ${Helpers.statusBadge(status)}
        </div>
        <p class="slot-task">${Helpers.escapeHtml(slot.task)}</p>
        <div class="slot-agents">
          ${agentCards || '<span class="text-sm text-dim">No agents assigned</span>'}
        </div>
      </div>
    `;
  }
};
