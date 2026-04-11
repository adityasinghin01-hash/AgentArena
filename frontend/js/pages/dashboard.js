// ═══════════════════════════════════════════════════════════
// AgentArena — Dashboard Page
// ═══════════════════════════════════════════════════════════

const DashboardPage = {
  async render() {
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="dashboard-page container">
        <div class="flex justify-between items-center mb-6">
          <div>
            <h2>Your <span class="text-gradient">Pipelines</span></h2>
            <p class="text-muted mt-2">Manage your AI agent pipelines and view audition results</p>
          </div>
          <a href="#/arena" class="btn btn-primary">New Pipeline ⚔️</a>
        </div>

        <div class="pipeline-list" id="pipeline-list">
          <div class="skeleton skeleton-card"></div>
          <div class="skeleton skeleton-card"></div>
        </div>
      </div>
    `;

    // Fetch pipelines
    try {
      const data = await API.getMyPipelines();
      const pipelines = data.data?.pipelines || data.data || [];
      this.renderPipelines(pipelines);
    } catch (err) {
      document.getElementById('pipeline-list').innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <div class="empty-title">Failed to load pipelines</div>
          <p class="text-muted">${Helpers.escapeHtml(err.message)}</p>
          <button class="btn btn-secondary mt-4" onclick="DashboardPage.render()">Retry</button>
        </div>
      `;
    }
  },

  renderPipelines(pipelines) {
    const container = document.getElementById('pipeline-list');

    if (!pipelines.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🏟️</div>
          <div class="empty-title">No pipelines yet</div>
          <p class="text-muted">Head to the Arena to create your first AI pipeline!</p>
          <a href="#/arena" class="btn btn-primary mt-4">Enter the Arena ⚔️</a>
        </div>
      `;
      return;
    }

    container.innerHTML = pipelines.map(p => `
      <div class="card pipeline-item" onclick="window.location.hash='#/arena?pipeline=${p._id}'">
        <div class="pipeline-info">
          <div class="pipeline-outcome">${Helpers.escapeHtml(Helpers.truncate(p.outcomeText, 80))}</div>
          <div class="pipeline-meta">
            ${p.slots?.length || 0} slots · ${Helpers.formatDate(p.createdAt)} · ${Helpers.statusBadge(p.status)}
          </div>
        </div>
        <span class="text-muted">→</span>
      </div>
    `).join('');

    // Animate
    AnimePresets.entranceStagger('.pipeline-item', 100);
  }
};
