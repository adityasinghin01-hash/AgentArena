// ═══════════════════════════════════════════════════════════
// AgentArena — Navbar Component
// ═══════════════════════════════════════════════════════════

const Navbar = {
  render() {
    const nav = document.getElementById('navbar');
    const loggedIn = API.isLoggedIn();
    const user = API.getUser();

    nav.innerHTML = `
      <a href="#/" class="logo">
        <span class="logo-icon">⚔️</span>
        <span>Agent<span class="text-gradient">Arena</span></span>
      </a>

      <ul class="nav-links hide-mobile">
        <li><a href="#/" data-route="/">Home</a></li>
        ${loggedIn ? `
          <li><a href="#/dashboard" data-route="/dashboard">Dashboard</a></li>
          <li><a href="#/arena" data-route="/arena">Arena</a></li>
        ` : ''}
      </ul>

      <div class="nav-auth">
        ${loggedIn ? `
          <span class="text-sm text-muted hide-mobile">${Helpers.escapeHtml(user?.email || '')}</span>
          <button class="btn btn-sm btn-secondary" onclick="API.logout()">Logout</button>
        ` : `
          <a href="#/login" class="btn btn-sm btn-primary">Login</a>
        `}
      </div>
    `;

    // Mark active link
    const hash = window.location.hash || '#/';
    const route = hash.replace('#', '');
    nav.querySelectorAll('[data-route]').forEach(link => {
      if (link.dataset.route === route) {
        link.classList.add('active');
      }
    });
  }
};
