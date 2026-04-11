// ═══════════════════════════════════════════════════════════
// AgentArena — API Client
// Fetch wrapper, JWT management, SSE handler
// ═══════════════════════════════════════════════════════════

const API = (() => {
  const BASE = 'https://agentarena-5od2.onrender.com';

  // ── Token Management ──────────────────────────────────────
  function getToken() {
    return localStorage.getItem('aa_token');
  }

  function setToken(token) {
    localStorage.setItem('aa_token', token);
  }

  function clearToken() {
    localStorage.removeItem('aa_token');
    localStorage.removeItem('aa_user');
  }

  function getUser() {
    try {
      return JSON.parse(localStorage.getItem('aa_user'));
    } catch {
      return null;
    }
  }

  function setUser(user) {
    localStorage.setItem('aa_user', JSON.stringify(user));
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // ── Fetch Wrapper ─────────────────────────────────────────
  async function request(method, path, body = null) {
    const headers = { 'Content-Type': 'application/json' };
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const opts = { method, headers };
    if (body && method !== 'GET') {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(`${BASE}${path}`, opts);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || `Request failed (${res.status})`);
    }

    return data;
  }

  // ── Auth ──────────────────────────────────────────────────
  async function login(email, password) {
    const data = await request('POST', '/api/v1/login', { email, password });
    if (data.accessToken) {
      setToken(data.accessToken);
      // Decode JWT payload to get user info
      try {
        const payload = JSON.parse(atob(data.accessToken.split('.')[1]));
        setUser({ id: payload.id, email: payload.email, role: payload.role });
      } catch {
        setUser({ email });
      }
    }
    return data;
  }

  function logout() {
    clearToken();
    window.location.hash = '#/';
  }

  // ── Agents ────────────────────────────────────────────────
  async function getAgents() {
    return request('GET', '/api/v1/agents');
  }

  async function getAgentsByCategory(category) {
    return request('GET', `/api/v1/agents/category/${category}`);
  }

  // ── Outcome ───────────────────────────────────────────────
  async function decompose(outcomeText) {
    return request('POST', '/api/v1/outcome/decompose', { outcomeText });
  }

  // ── Pipeline ──────────────────────────────────────────────
  async function createPipeline(outcomeText, slots) {
    return request('POST', '/api/v1/pipeline/create', { outcomeText, slots });
  }

  async function getPipeline(id) {
    return request('GET', `/api/v1/pipeline/${id}`);
  }

  async function getMyPipelines() {
    return request('GET', '/api/v1/pipeline/user/mine');
  }

  // ── Audition (SSE) ────────────────────────────────────────
  function runAudition(pipelineId, userInput, onEvent, onComplete, onError) {
    const token = getToken();

    // Use fetch with ReadableStream for SSE POST request
    fetch(`${BASE}/api/v1/audition/run/${pipelineId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ userInput }),
    }).then(async (response) => {
      if (!response.ok) {
        const err = await response.json();
        onError(err.message || 'Audition failed');
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              onEvent(eventData);
              if (eventData.event === 'complete') {
                onComplete(eventData);
              }
            } catch {
              // Ignore unparseable lines
            }
          }
        }
      }
    }).catch((err) => {
      onError(err.message || 'Connection failed');
    });
  }

  // ── Audition Results ──────────────────────────────────────
  async function getAudition(id) {
    return request('GET', `/api/v1/audition/${id}`);
  }

  // ── Health ────────────────────────────────────────────────
  async function getHealth() {
    const res = await fetch(`${BASE}/api/health`);
    return res.json();
  }

  // ── Public API ────────────────────────────────────────────
  return {
    login, logout, isLoggedIn, getUser, getToken,
    getAgents, getAgentsByCategory,
    decompose,
    createPipeline, getPipeline, getMyPipelines,
    runAudition, getAudition,
    getHealth,
  };
})();
