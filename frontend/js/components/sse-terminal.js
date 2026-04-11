// ═══════════════════════════════════════════════════════════
// AgentArena — SSE Terminal Component
// ═══════════════════════════════════════════════════════════

const SSETerminal = {
  render() {
    return `
      <div class="terminal" id="sse-terminal">
        <div class="terminal-header">
          <span class="dot dot-red"></span>
          <span class="dot dot-yellow"></span>
          <span class="dot dot-green"></span>
          <span style="margin-left:auto">Live Audition Feed</span>
        </div>
        <div id="terminal-lines"></div>
      </div>
    `;
  },

  /**
   * Add a line to the terminal
   */
  addLine(eventData) {
    const container = document.getElementById('terminal-lines');
    if (!container) return;

    const line = document.createElement('div');
    const eventType = eventData.event || 'info';
    line.className = `line event-${eventType}`;

    const ts = Helpers.timestamp();

    switch (eventType) {
      case 'started':
        line.innerHTML = `<span class="timestamp">[${ts}]</span> 🚀 Audition started — evaluating agents...`;
        break;
      case 'agent_output':
        line.innerHTML = `<span class="timestamp">[${ts}]</span> 🤖 [${Helpers.escapeHtml(eventData.slot)}] ${Helpers.escapeHtml(eventData.agentName)} responded (${eventData.responseTimeMs}ms)`;
        break;
      case 'agent_scores':
        const scores = eventData.scores;
        line.innerHTML = `<span class="timestamp">[${ts}]</span> 📊 [${Helpers.escapeHtml(eventData.slot)}] Scored: total=${scores.total} (acc=${scores.accuracy} comp=${scores.completeness} fmt=${scores.format} hal=${scores.hallucination})`;
        break;
      case 'slot_winner':
        line.innerHTML = `<span class="timestamp">[${ts}]</span> 🏆 [${Helpers.escapeHtml(eventData.slot)}] Winner: ${Helpers.escapeHtml(eventData.winnerName)}`;
        break;
      case 'complete':
        line.innerHTML = `<span class="timestamp">[${ts}]</span> ✅ Audition complete — ID: ${eventData.auditionId}`;
        break;
      case 'error':
        line.innerHTML = `<span class="timestamp">[${ts}]</span> ❌ Error: ${Helpers.escapeHtml(eventData.message || 'Unknown error')}`;
        break;
      default:
        line.innerHTML = `<span class="timestamp">[${ts}]</span> ${JSON.stringify(eventData)}`;
    }

    container.appendChild(line);

    // Auto-scroll to bottom
    const terminal = document.getElementById('sse-terminal');
    if (terminal) {
      terminal.scrollTop = terminal.scrollHeight;
    }
  },

  /**
   * Clear terminal
   */
  clear() {
    const container = document.getElementById('terminal-lines');
    if (container) container.innerHTML = '';
  }
};
