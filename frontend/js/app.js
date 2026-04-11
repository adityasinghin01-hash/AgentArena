// ═══════════════════════════════════════════════════════════
// AgentArena — SPA Router & App Init
// Hash-based routing, auth guards, page lifecycle
// ═══════════════════════════════════════════════════════════

const App = {
  routes: {
    '/': () => LandingPage.render(),
    '/login': () => LoginPage.render(),
    '/dashboard': () => DashboardPage.render(),
    '/arena': () => ArenaPage.render(),
    // /results/:id handled dynamically
  },

  init() {
    // Listen for hash changes
    window.addEventListener('hashchange', () => this.handleRoute());

    // Initial route
    this.handleRoute();
  },

  handleRoute() {
    const hash = window.location.hash || '#/';
    const path = hash.replace('#', '');

    // Update navbar
    Navbar.render();

    // Check for /results/:id
    const resultsMatch = path.match(/^\/results\/(.+)$/);
    if (resultsMatch) {
      ResultsPage.render(resultsMatch[1]);
      return;
    }

    // Find matching route
    const handler = this.routes[path];
    if (handler) {
      handler();
    } else {
      // 404 fallback
      document.getElementById('app').innerHTML = `
        <div class="empty-state" style="min-height: 60vh;">
          <div class="empty-icon">🚫</div>
          <div class="empty-title">Page not found</div>
          <p class="text-muted">The page you're looking for doesn't exist</p>
          <a href="#/" class="btn btn-primary mt-4">Go Home</a>
        </div>
      `;
    }
  }
};

// ── Boot ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
