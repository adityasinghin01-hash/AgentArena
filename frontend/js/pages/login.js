// ═══════════════════════════════════════════════════════════
// AgentArena — Login Page
// ═══════════════════════════════════════════════════════════

const LoginPage = {
  render() {
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="login-page">
        <div class="login-box">
          <h2>Welcome to <span class="text-gradient">AgentArena</span></h2>
          <p class="login-sub">Sign in to access the Arena and manage your pipelines</p>

          <div id="login-error" class="login-error hidden"></div>

          <form class="login-form" onsubmit="LoginPage.handleSubmit(event)">
            <div class="input-group">
              <label for="email">Email</label>
              <input type="email" id="login-email" class="input"
                placeholder="seed@agentarena.dev"
                value="seed@agentarena.dev" required>
            </div>
            <div class="input-group">
              <label for="password">Password</label>
              <input type="password" id="login-password" class="input"
                placeholder="••••••••"
                value="SeedAdmin@123" required>
            </div>
            <button type="submit" class="btn btn-primary btn-lg w-full" id="login-btn">
              Sign In
            </button>
          </form>

          <p class="text-sm text-muted mt-4 text-center">
            Demo credentials are pre-filled for the hackathon prototype
          </p>
        </div>
      </div>
    `;

    // Animate entrance
    AnimePresets.fadeInUp('.login-box', 100);
  },

  async handleSubmit(e) {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');
    const errBox = document.getElementById('login-error');

    // Reset error
    errBox.classList.add('hidden');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      await API.login(email, password);
      Helpers.toast('Welcome to AgentArena!', 'success');
      window.location.hash = '#/dashboard';
    } catch (err) {
      errBox.textContent = err.message || 'Login failed. Check your credentials.';
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Sign In';
    }
  }
};
