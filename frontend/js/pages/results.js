// ═══════════════════════════════════════════════════════════
// AgentArena — Results Page
// Audition results with winner showcase and score breakdowns
// ═══════════════════════════════════════════════════════════

const ResultsPage = {
  async render(auditionId) {
    const app = document.getElementById('app');

    if (!API.isLoggedIn()) {
      window.location.hash = '#/login';
      return;
    }

    app.innerHTML = `
      <div class="results-page container">
        <div class="results-header">
          <h2>Audition <span class="text-gradient">Results</span></h2>
          <p class="text-muted mt-2">Detailed breakdown of agent performance</p>
        </div>
        <div id="results-content">
          <div class="skeleton skeleton-card mb-4" style="height:200px"></div>
          <div class="skeleton skeleton-card" style="height:300px"></div>
        </div>
      </div>
    `;

    try {
      const data = await API.getAudition(auditionId);
      const audition = data.data?.audition || data.data || data;
      this.renderResults(audition);
    } catch (err) {
      document.getElementById('results-content').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load results</div>
          <p class="text-muted">${Helpers.escapeHtml(err.message)}</p>
          <a href="#/dashboard" class="btn btn-secondary mt-4">← Dashboard</a>
        </div>
      `;
    }
  },

  renderResults(audition) {
    const container = document.getElementById('results-content');
    const results = audition.results || [];

    // Group results by slot
    const slotMap = {};
    results.forEach(r => {
      const slot = r.slotName || 'Unknown';
      if (!slotMap[slot]) slotMap[slot] = [];
      slotMap[slot].push(r);
    });

    // Find winners
    const winners = results.filter(r => r.winner);

    container.innerHTML = `
      <!-- Winner Showcase -->
      <div class="winner-showcase">
        ${winners.map(w => `
          <div class="card winner-card">
            <div class="crown">👑</div>
            <div class="winner-slot">${Helpers.escapeHtml(w.slotName)}</div>
            <div class="winner-name">${Helpers.escapeHtml(w.agentName)}</div>
            ${ScoreGauge.render(w.scores?.total || 0, 90)}
            <div class="mt-4 text-xs text-muted mono">
              ${Helpers.formatMs(w.responseTimeMs || 0)} response time
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Detailed Breakdown -->
      <div class="score-breakdown">
        <h3 class="mb-6">Detailed <span class="text-gradient">Breakdown</span></h3>

        ${Object.entries(slotMap).map(([slotName, agents]) => `
          <div class="breakdown-slot">
            <div class="slot-title">${Helpers.escapeHtml(slotName)}</div>
            <div class="breakdown-agents">
              ${agents.map(agent => `
                <div class="card-flat breakdown-agent-card ${agent.winner ? 'winner' : ''}">
                  <div class="flex justify-between items-center">
                    <span class="text-lg" style="font-weight:600">${Helpers.escapeHtml(agent.agentName)}</span>
                    ${agent.winner ? '<span class="badge badge-elite">👑 WINNER</span>' : ''}
                  </div>
                  <div class="text-xs text-muted mono mt-1">${Helpers.formatMs(agent.responseTimeMs || 0)}</div>

                  <div class="scores-grid">
                    <div class="score-bar">
                      <span>Accuracy</span>
                      <div class="bar-track"><div class="bar-fill ${Helpers.scoreClass(agent.scores?.accuracy || 0)}" style="width:${agent.scores?.accuracy || 0}%"></div></div>
                      <span class="mono">${agent.scores?.accuracy || 0}</span>
                    </div>
                    <div class="score-bar">
                      <span>Complete</span>
                      <div class="bar-track"><div class="bar-fill ${Helpers.scoreClass(agent.scores?.completeness || 0)}" style="width:${agent.scores?.completeness || 0}%"></div></div>
                      <span class="mono">${agent.scores?.completeness || 0}</span>
                    </div>
                    <div class="score-bar">
                      <span>Format</span>
                      <div class="bar-track"><div class="bar-fill ${Helpers.scoreClass(agent.scores?.format || 0)}" style="width:${agent.scores?.format || 0}%"></div></div>
                      <span class="mono">${agent.scores?.format || 0}</span>
                    </div>
                    <div class="score-bar">
                      <span>No Halluc.</span>
                      <div class="bar-track"><div class="bar-fill ${Helpers.scoreClass(agent.scores?.hallucination || 0)}" style="width:${agent.scores?.hallucination || 0}%"></div></div>
                      <span class="mono">${agent.scores?.hallucination || 0}</span>
                    </div>
                  </div>

                  <details class="mt-4">
                    <summary class="text-sm text-muted" style="cursor:pointer">View full output</summary>
                    <pre class="terminal mt-2" style="max-height:200px;padding:var(--space-3);font-size:var(--text-xs);white-space:pre-wrap">${Helpers.escapeHtml(agent.output || 'No output')}</pre>
                  </details>
                </div>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Actions -->
      <div class="flex justify-center gap-4 mt-8">
        <a href="#/arena" class="btn btn-primary">Run Another Audition ⚔️</a>
        <a href="#/dashboard" class="btn btn-secondary">← Dashboard</a>
      </div>
    `;

    // Animate score gauges and elements
    AnimePresets.entranceStagger('.winner-card', 100);
    setTimeout(() => ScoreGauge.animateAll(container), 400);
    AnimePresets.entranceStagger('.breakdown-agent-card', 600);
  }
};
