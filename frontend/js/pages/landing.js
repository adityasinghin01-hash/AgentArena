// ═══════════════════════════════════════════════════════════
// AgentArena — Landing Page
// ═══════════════════════════════════════════════════════════

const LandingPage = {
  async render() {
    const app = document.getElementById('app');

    // Fetch health data for stats
    let health = { agentsCount: '—', pipelinesCount: '—' };
    try {
      health = await API.getHealth();
    } catch { /* fallback values */ }

    app.innerHTML = `
      <section class="landing-hero">
        <div class="hero-badge">⚡ Vihaan 9.0 Hackathon Project</div>
        <h1>The Arena Where<br><span class="text-gradient">AI Agents Compete</span></h1>
        <p class="hero-sub">
          Describe your desired outcome. Watch AI agents battle in real-time auditions.
          Pick the winners. Build your perfect AI pipeline.
        </p>
        <div class="hero-cta">
          <a href="#/arena" class="btn btn-primary btn-lg">Enter the Arena ⚔️</a>
          <a href="#/login" class="btn btn-secondary btn-lg">Login</a>
        </div>
      </section>

      <section class="how-it-works container">
        <h2 class="text-center">How It <span class="text-gradient">Works</span></h2>
        <div class="steps-grid">
          <div class="step-card card-flat">
            <div class="step-num">1</div>
            <h4>Describe</h4>
            <p>Tell us what you want AI to do — in plain English</p>
          </div>
          <div class="step-card card-flat">
            <div class="step-num">2</div>
            <h4>Decompose</h4>
            <p>AI breaks your goal into specialized agent slots</p>
          </div>
          <div class="step-card card-flat">
            <div class="step-num">3</div>
            <h4>Compete</h4>
            <p>Agents audition live — scored on accuracy, completeness & more</p>
          </div>
          <div class="step-card card-flat">
            <div class="step-num">4</div>
            <h4>Win</h4>
            <p>The best agent wins each slot — you get the winning pipeline</p>
          </div>
        </div>
      </section>

      <section class="demo-outcomes container">
        <h2 class="text-center">Try a <span class="text-gradient">Demo</span></h2>
        <p class="text-center text-muted mt-2">Click a demo to jump straight to the Arena</p>
        <div class="outcomes-grid">
          <div class="card demo-card" onclick="LandingPage.tryDemo(0)">
            <div class="demo-icon">🎫</div>
            <h4>Support Tickets</h4>
            <p>Summarize customer support tickets and flag urgent ones</p>
            <div class="demo-agents">
              ${Helpers.categoryBadge('classifier')}
              ${Helpers.categoryBadge('writer')}
              ${Helpers.categoryBadge('ranker')}
            </div>
          </div>
          <div class="card demo-card" onclick="LandingPage.tryDemo(1)">
            <div class="demo-icon">🐦</div>
            <h4>Tweet Campaign</h4>
            <p>Write and schedule 7 tweets for my tech startup</p>
            <div class="demo-agents">
              ${Helpers.categoryBadge('researcher')}
              ${Helpers.categoryBadge('writer')}
              ${Helpers.categoryBadge('scheduler')}
            </div>
          </div>
          <div class="card demo-card" onclick="LandingPage.tryDemo(2)">
            <div class="demo-icon">🔒</div>
            <h4>Code Review</h4>
            <p>Review my code and find security issues</p>
            <div class="demo-agents">
              ${Helpers.categoryBadge('linter')}
              ${Helpers.categoryBadge('scanner')}
              ${Helpers.categoryBadge('explainer')}
            </div>
          </div>
        </div>
      </section>

      <section class="container">
        <div class="stats-bar">
          <div class="stat">
            <div class="stat-value" id="stat-agents">${health.agentsCount}</div>
            <div class="stat-label">AI Agents</div>
          </div>
          <div class="stat">
            <div class="stat-value">SSE</div>
            <div class="stat-label">Real-time Streaming</div>
          </div>
          <div class="stat">
            <div class="stat-value">3</div>
            <div class="stat-label">Demo Outcomes</div>
          </div>
          <div class="stat">
            <div class="stat-value" id="stat-version">${health.version || 'v1.0.0'}</div>
            <div class="stat-label">Version</div>
          </div>
        </div>
      </section>
    `;

    // Animate entrance
    AnimePresets.fadeInUp('.hero-badge', 100);
    AnimePresets.fadeInUp('.landing-hero h1', 200);
    AnimePresets.fadeInUp('.hero-sub', 350);
    AnimePresets.fadeInUp('.hero-cta', 500);
    AnimePresets.entranceStagger('.step-card', 800);
    AnimePresets.entranceStagger('.demo-card', 1000);
  },

  demos: [
    'Summarize customer support tickets and flag urgent ones',
    'Write and schedule 7 tweets for my tech startup',
    'Review my code and find security issues',
  ],

  tryDemo(index) {
    // Store demo text and navigate to arena
    sessionStorage.setItem('aa_demo', this.demos[index]);
    window.location.hash = '#/arena';
  }
};
