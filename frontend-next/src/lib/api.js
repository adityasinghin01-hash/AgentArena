// lib/api.js — Centralized API client with auto token refresh on 401.
// Replicated from Test_website, adapted for AgentArena backend (/api/v1).

import { getAccessToken, getRefreshToken, saveTokens, clearAuth } from '@/lib/auth';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api/v1';

// ── Basic request (no auth) ─────────────────────────────────
async function request(endpoint, options) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || 'Something went wrong.');
  }
  return data;
}

// ── Authenticated request with auto-refresh on 401 ──────────
export async function requestWithAuth(endpoint, options) {
  const accessToken = getAccessToken();

  const makeRequest = (token) =>
    fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...options,
    });

  let res = await makeRequest(accessToken);

  // If 401, try to refresh the token and retry once
  if (res.status === 401) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearAuth();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }

    try {
      const refreshData = await request('/refresh-token', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });
      saveTokens(refreshData.accessToken, refreshData.refreshToken);
      res = await makeRequest(refreshData.accessToken);
    } catch {
      clearAuth();
      if (typeof window !== 'undefined') window.location.href = '/login';
      throw new Error('Session expired. Please log in again.');
    }
  }

  const data = await res.json();
  if (!res.ok) {
    // Handle both AppError format ({message}) and validation format ({errors: [{message}]})
    const msg = data.message || (data.errors && data.errors[0]?.message) || 'Something went wrong.';
    throw new Error(msg);
  }
  return data;
}

// ── Auth endpoints ──────────────────────────────────────────

export async function loginUser(payload) {
  // payload: { email, password, rememberMe }
  return request('/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function signupUser(payload) {
  // payload: { name, email, password, recaptchaToken }
  return request('/signup', {
    method: 'POST',
    body: JSON.stringify({ ...payload, source: 'web' }),
  });
}

export async function googleLogin(idToken) {
  return request('/google-login', {
    method: 'POST',
    body: JSON.stringify({ idToken }),
  });
}

export async function logoutUser(refreshToken) {
  return request('/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function forgotPassword(payload) {
  // payload: { email }
  return request('/password/forgot', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function refreshAccessToken(refreshToken) {
  return request('/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

export async function checkVerificationStatus(email) {
  return request(`/check-verification-status?email=${encodeURIComponent(email)}`);
}

export async function updateRole(role) {
  return requestWithAuth('/role', {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

// ── Arena endpoints ── @rest-api-design ─────────────────────

export async function decomposeOutcome(outcomeText) {
  return requestWithAuth('/outcome/decompose', {
    method: 'POST',
    body: JSON.stringify({ outcomeText }),
  });
}

export async function createPipeline(payload) {
  // payload: { outcomeText, slots: [{ name, task, evaluationCriteria, assignedAgents }] }
  return requestWithAuth('/pipeline/create', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchAgents(params = {}) {
  const query = new URLSearchParams(params).toString();
  return requestWithAuth(`/agents${query ? `?${query}` : ''}`);
}

export async function getAgentById(id) {
  return requestWithAuth(`/agents/${id}`);
}

// SSE stream — returns EventSource-like object
export function startAudition(pipelineId, userInput) {
  const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api/v1';
  const { getAccessToken } = require('@/lib/auth');
  const token = getAccessToken();

  // Use fetch for SSE since EventSource can't send POST body
  return fetch(`${BASE}/audition/run/${pipelineId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ userInput }),
  });
}

// ── Results endpoints ── @rest-api-design ───────────────────

export async function getAudition(auditionId) {
  return requestWithAuth(`/audition/${auditionId}`);
}

// ── Dashboard endpoints ── @rest-api-design ─────────────────

export async function getMyBattles(page = 1) {
  return requestWithAuth(`/audition/my?page=${page}&limit=20`);
}

// ── Marketplace endpoints (public) ── @rest-api-design ──────

export async function searchAgents(query = '', category = 'all', sort = 'reliability', page = 1) {
  const params = new URLSearchParams({ page, limit: 50, sort });
  if (query) params.set('q', query);
  if (category && category !== 'all') params.set('category', category);
  return request(`/agents/search?${params.toString()}`);
}

export async function getAgentDetail(agentId) {
  return request(`/agents/${agentId}`);
}

export async function getAgentBattles(agentId) {
  return request(`/audition/agent/${agentId}?limit=5`);
}

// ── API Keys ── @senior-fullstack @api-patterns ──────────────
export async function generateApiKey(name, scopes = ['api:read']) {
  return requestWithAuth('/apikeys', {
    method: 'POST',
    body: JSON.stringify({ name, scopes }),
  });
}

export async function listApiKeys() {
  return requestWithAuth('/apikeys');
}

export async function revokeApiKey(keyId) {
  return requestWithAuth(`/apikeys/${keyId}`, { method: 'DELETE' });
}

// ── Deployer Agent Management ── @backend-architect @senior-fullstack ──
export async function getMyAgents() {
  return requestWithAuth('/agents/mine');
}

export async function createAgent(data) {
  return requestWithAuth('/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAgent(agentId, data) {
  return requestWithAuth(`/agents/${agentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteAgent(agentId) {
  return requestWithAuth(`/agents/${agentId}`, { method: 'DELETE' });
}

export async function toggleAgentStatus(agentId) {
  return requestWithAuth(`/agents/${agentId}/toggle`, { method: 'PATCH' });
}

// Owner-view: no isActive filter, so paused agents still load
export async function getMyAgentDetail(agentId) {
  return requestWithAuth(`/agents/mine/${agentId}`);
}
