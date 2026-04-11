// ═══════════════════════════════════════════════════════════
// AgentArena — Arena Page (Core Feature)
// 3-step wizard: Outcome → Pipeline → LIVE CHATBOT RACE
// Real chat UI with markdown rendering + typewriter streaming
// ═══════════════════════════════════════════════════════════

const ArenaPage = {
  state: {
    step: 1,
    outcomeText: '',
    slots: [],
    pipelineId: null,
    pipeline: null,
    auditionId: null,
    agents: [],
  },

  // Agent avatar emojis
  avatars: {
    classifier: '🏷️', writer: '✍️', ranker: '📊',
    researcher: '🔬', scheduler: '📅', linter: '🔎',
    scanner: '🛡️', explainer: '💡', analyzer: '📈',
    summarizer: '📝', reviewer: '🧐', coder: '💻',
    other: '🤖'
  },

  async render() {
    const app = document.getElementById('app');

    if (!API.isLoggedIn()) {
      Helpers.toast('Please login to use the Arena', 'info');
      window.location.hash = '#/login';
      return;
    }

    this.state = { step: 1, outcomeText: '', slots: [], pipelineId: null, pipeline: null, auditionId: null, agents: [] };

    const demo = sessionStorage.getItem('aa_demo');
    if (demo) {
      this.state.outcomeText = demo;
      sessionStorage.removeItem('aa_demo');
    }

    try {
      const agentData = await API.getAgents();
      this.state.agents = agentData.data?.agents || agentData.data || [];
    } catch { /* */ }

    this.renderCurrentStep();
  },

  renderCurrentStep() {
    const app = document.getElementById('app');

    app.innerHTML = `
      <div class="arena-page container">
        ${this.renderWizardSteps()}
        <div id="arena-content"></div>
      </div>
    `;

    const content = document.getElementById('arena-content');
    switch (this.state.step) {
      case 1: this.renderStep1(content); break;
      case 2: this.renderStep2(content); break;
      case 3: this.renderStep3(content); break;
    }
  },

  renderWizardSteps() {
    const steps = [
      { num: 1, label: 'Describe' },
      { num: 2, label: 'Assemble' },
      { num: 3, label: 'Compete' },
    ];

    return `
      <div class="wizard-steps">
        ${steps.map((s, i) => {
          const cls = s.num < this.state.step ? 'done' : s.num === this.state.step ? 'active' : '';
          return `
            <div class="wizard-step ${cls}">
              <span class="step-num">${s.num < this.state.step ? '✓' : s.num}</span>
              <span class="hide-mobile">${s.label}</span>
            </div>
            ${i < steps.length - 1 ? `<div class="wizard-connector ${s.num < this.state.step ? 'done' : ''}"></div>` : ''}
          `;
        }).join('')}
      </div>
    `;
  },

  // ── Step 1: Outcome Input ─────────────────────────────────
  renderStep1(container) {
    const demos = [
      'Summarize customer support tickets and flag urgent ones',
      'Write and schedule 7 tweets for my tech startup',
      'Review my code and find security issues',
    ];

    container.innerHTML = `
      <div class="arena-input-section">
        <h2>Describe Your <span class="text-gradient">Outcome</span></h2>
        <p class="arena-sub">Tell us what you want AI agents to accomplish — we'll decompose it into specialized slots</p>

        <textarea class="textarea" id="outcome-input"
          placeholder="e.g. Review my code and find security issues"
          rows="4">${Helpers.escapeHtml(this.state.outcomeText)}</textarea>

        <div class="quick-demos mt-4">
          ${demos.map((d, i) => `
            <button class="quick-demo-btn" onclick="ArenaPage.fillDemo(${i})">${Helpers.truncate(d, 40)}</button>
          `).join('')}
        </div>

        <button class="btn btn-primary btn-lg mt-6" id="decompose-btn" onclick="ArenaPage.decompose()">
          Decompose with AI 🧠
        </button>
      </div>
    `;

    AnimePresets.fadeInUp('.arena-input-section', 100);
  },

  fillDemo(index) {
    const demos = [
      'Summarize customer support tickets and flag urgent ones',
      'Write and schedule 7 tweets for my tech startup',
      'Review my code and find security issues',
    ];
    document.getElementById('outcome-input').value = demos[index];
  },

  async decompose() {
    const input = document.getElementById('outcome-input');
    const btn = document.getElementById('decompose-btn');
    const text = input.value.trim();

    if (text.length < 10) {
      Helpers.toast('Please describe your outcome in at least 10 characters', 'error');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Decomposing...';

    try {
      const data = await API.decompose(text);
      this.state.outcomeText = text;
      this.state.slots = data.data.slots || [];
      this.state.step = 2;
      this.renderCurrentStep();
    } catch (err) {
      Helpers.toast(err.message || 'Decompose failed', 'error');
      btn.disabled = false;
      btn.textContent = 'Decompose with AI 🧠';
    }
  },

  // ── Step 2: Pipeline Assembly ─────────────────────────────
  renderStep2(container) {
    const slotsWithAgents = this.state.slots.map(slot => {
      if (!slot.assignedAgents || !slot.assignedAgents.length) {
        const matching = this.state.agents.filter(a => {
          const slotWords = (slot.name + ' ' + slot.task).toLowerCase();
          return slotWords.includes(a.category) || slotWords.includes(a.name.toLowerCase());
        });
        slot.assignedAgents = matching.length > 0 ? matching : [this.state.agents[0]].filter(Boolean);
      }
      return slot;
    });

    container.innerHTML = `
      <div class="pipeline-section">
        <div class="text-center mb-6">
          <h2>Pipeline <span class="text-gradient">Assembly</span></h2>
          <p class="text-muted mt-2">AI decomposed your outcome into ${slotsWithAgents.length} specialized slots</p>
        </div>

        <div class="card-flat mb-4" style="padding: var(--space-4)">
          <span class="text-sm text-muted">Outcome: </span>
          <span class="text-sm">${Helpers.escapeHtml(this.state.outcomeText)}</span>
        </div>

        <div class="pipeline-slots">
          ${slotsWithAgents.map(slot => SlotCard.render(slot, this.state.agents, 'ready')).join('')}
        </div>

        <div class="text-center mt-8">
          <button class="btn btn-secondary" onclick="ArenaPage.state.step=1; ArenaPage.renderCurrentStep()">
            ← Back
          </button>
          <button class="btn btn-cyan btn-lg" id="run-btn" onclick="ArenaPage.createAndRun()" style="margin-left: var(--space-4)">
            Create Pipeline & Run Audition ⚔️
          </button>
        </div>
      </div>
    `;

    AnimePresets.entranceStagger('.slot-card', 100);
  },

  async createAndRun() {
    const btn = document.getElementById('run-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating pipeline...';

    try {
      const slotsPayload = this.state.slots.map(slot => ({
        name: slot.name,
        task: slot.task,
        evaluationCriteria: slot.evaluationCriteria || slot.evaluation_criteria || 'Quality and accuracy',
        // Don't send assignedAgents — let backend auto-assign top 3 per slot
        // so all 3 agents compete side-by-side
      }));

      const pipelineData = await API.createPipeline(this.state.outcomeText, slotsPayload);
      const pipeline = pipelineData.data?.pipeline || pipelineData.data;
      this.state.pipelineId = pipeline?._id || pipelineData.data?.pipelineId;
      this.state.pipeline = pipeline;

      if (!this.state.pipelineId) throw new Error('No pipeline ID returned');

      this.state.step = 3;
      this.renderCurrentStep();
    } catch (err) {
      Helpers.toast(err.message || 'Failed to create pipeline', 'error');
      btn.disabled = false;
      btn.textContent = 'Create Pipeline & Run Audition ⚔️';
    }
  },

  // ════════════════════════════════════════════════════════════
  // Step 3: LIVE CHATBOT RACE — ChatGPT/Claude-style
  // Each agent has a chat window with user Q + streaming AI answer
  // ════════════════════════════════════════════════════════════
  renderStep3(container) {
    const pipeline = this.state.pipeline;
    const slots = pipeline?.slots || this.state.slots;

    const agentMap = {};
    this.state.agents.forEach(a => { agentMap[a._id] = a; });

    container.innerHTML = `
      <div class="text-center mb-8">
        <h2>⚔️ Live <span class="text-gradient">Agent Battle</span></h2>
        <p class="text-muted mt-2">Agents competing simultaneously — real-time AI responses streaming in</p>
      </div>

      <div class="audition-live" id="race-container">
        ${slots.map((slot, si) => {
          const agents = (slot.assignedAgents || []).map(a => {
            if (typeof a === 'object' && a.name) return a;
            return agentMap[a] || agentMap[a?._id] || { _id: a, name: 'Agent', category: 'other' };
          });

          return `
            <div class="race-slot" data-slot-index="${si}" data-slot-name="${Helpers.escapeHtml(slot.name)}">
              <div class="race-slot-header">
                <h3>${Helpers.escapeHtml(slot.name)}</h3>
                <span class="slot-task-label">— ${Helpers.escapeHtml(Helpers.truncate(slot.task, 60))}</span>
              </div>
              <div class="race-lanes">
                ${agents.map(agent => {
                  const emoji = this.avatars[agent.category] || '🤖';
                  return `
                  <div class="race-lane lane-running" id="lane-${agent._id}" data-agent-id="${agent._id}" style="position:relative">

                    <!-- Lane Header -->
                    <div class="lane-header">
                      <div class="lane-agent-info">
                        <div class="lane-avatar">${emoji}</div>
                        <div>
                          <div class="lane-agent-name">${Helpers.escapeHtml(agent.name)}</div>
                          <div class="lane-agent-category">${agent.category}</div>
                        </div>
                      </div>
                      <span class="lane-status status-running" id="status-${agent._id}">⟳ thinking...</span>
                    </div>

                    <!-- Chat Body -->
                    <div class="lane-body" id="body-${agent._id}">

                      <!-- User message bubble -->
                      <div class="chat-msg-user">
                        <div class="chat-bubble">${Helpers.escapeHtml(this.state.outcomeText)}</div>
                      </div>

                      <!-- Agent response (starts with typing indicator) -->
                      <div class="chat-msg-agent" id="response-${agent._id}">
                        <div class="chat-avatar">${emoji}</div>
                        <div class="chat-bubble">
                          <div class="typing-indicator">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div id="audition-complete" class="hidden text-center mt-8">
        <div class="mb-4" style="font-size: 48px">🏆</div>
        <h3>Battle Complete!</h3>
        <p class="text-muted mt-2 mb-6">Winners have been crowned for each slot</p>
        <button class="btn btn-primary btn-lg" id="view-results-btn">
          View Full Results 📊
        </button>
      </div>

      <details class="terminal-toggle">
        <summary>📟 Show raw event log</summary>
        <div class="mt-3">${SSETerminal.render()}</div>
      </details>
    `;

    // Start the audition
    this.startAudition();
  },

  startAudition() {
    const userInput = this.state.outcomeText;
    SSETerminal.addLine({ event: 'started' });

    API.runAudition(
      this.state.pipelineId,
      userInput,
      (eventData) => {
        SSETerminal.addLine(eventData);

        switch (eventData.event) {
          case 'agent_output':
            this.handleAgentOutput(eventData);
            break;
          case 'agent_scores':
            this.handleAgentScores(eventData);
            break;
          case 'slot_winner':
            this.handleSlotWinner(eventData);
            break;
        }
      },
      (eventData) => {
        this.state.auditionId = eventData.auditionId;
        const completeDiv = document.getElementById('audition-complete');
        if (completeDiv) {
          completeDiv.classList.remove('hidden');
          AnimePresets.popIn('#audition-complete');

          document.getElementById('view-results-btn').onclick = () => {
            window.location.hash = `#/results/${eventData.auditionId}`;
          };
        }
        Helpers.toast('Battle complete! 🏆', 'success');
      },
      (errMsg) => {
        SSETerminal.addLine({ event: 'error', message: errMsg });
        Helpers.toast('Battle error: ' + errMsg, 'error');
      }
    );
  },

  // ── agent_output → Stream text like ChatGPT into the chat bubble ──
  handleAgentOutput(data) {
    const responseEl = document.getElementById(`response-${data.agentId}`);
    const statusEl = document.getElementById(`status-${data.agentId}`);
    const laneEl = document.getElementById(`lane-${data.agentId}`);
    const bodyEl = document.getElementById(`body-${data.agentId}`);

    if (!responseEl) return;

    // Find the chat bubble inside the agent response
    const bubble = responseEl.querySelector('.chat-bubble');
    if (!bubble) return;

    // Replace typing indicator with streaming container
    bubble.innerHTML = `<div class="stream-raw" id="stream-${data.agentId}"></div>`;
    const streamEl = document.getElementById(`stream-${data.agentId}`);

    // Update status
    if (statusEl) {
      statusEl.className = 'lane-status status-running';
      statusEl.textContent = '⟳ streaming...';
    }

    // Stream the text word-by-word like ChatGPT
    Helpers.streamText(streamEl, data.output || 'No output', 20).then(() => {
      // After streaming completes, render the full markdown
      bubble.innerHTML = `
        <div class="md-content">${Helpers.renderMarkdown(data.output || 'No output')}</div>
        <span class="response-time">⚡ ${Helpers.formatMs(data.responseTimeMs || 0)}</span>
      `;

      // Highlight any code blocks
      bubble.querySelectorAll('pre code').forEach(block => {
        if (typeof hljs !== 'undefined') hljs.highlightElement(block);
      });

      // Update status to done
      if (statusEl) {
        statusEl.className = 'lane-status status-scored';
        statusEl.textContent = '✓ responded';
      }

      if (laneEl) {
        laneEl.classList.remove('lane-running');
        laneEl.classList.add('lane-scored');
      }
    });

    // Auto-scroll
    if (bodyEl) bodyEl.scrollTop = bodyEl.scrollHeight;
  },

  // ── agent_scores → Add score footer to the lane ──
  handleAgentScores(data) {
    const lane = document.getElementById(`lane-${data.agentId}`);
    const scores = data.scores;

    if (lane && scores) {
      const footer = document.createElement('div');
      footer.className = 'lane-footer';
      footer.innerHTML = `
        <div class="lane-scores">
          <div class="score-item">
            <span class="score-label">ACC</span>
            <span class="score-num ${Helpers.scoreClass(scores.accuracy)}">${scores.accuracy}</span>
          </div>
          <div class="score-item">
            <span class="score-label">COMP</span>
            <span class="score-num ${Helpers.scoreClass(scores.completeness)}">${scores.completeness}</span>
          </div>
          <div class="score-item">
            <span class="score-label">FMT</span>
            <span class="score-num ${Helpers.scoreClass(scores.format)}">${scores.format}</span>
          </div>
          <div class="score-item">
            <span class="score-label">HAL</span>
            <span class="score-num ${Helpers.scoreClass(scores.hallucination)}">${scores.hallucination}</span>
          </div>
          <div class="score-item">
            <span class="score-label">TOTAL</span>
            <span class="score-num ${Helpers.scoreClass(scores.total)}" style="font-size:var(--text-base)">${scores.total}</span>
          </div>
        </div>
      `;
      lane.appendChild(footer);
      AnimePresets.fadeInUp(footer, 0);
    }
  },

  // ── slot_winner → Crown the winner, dim the losers ──
  handleSlotWinner(data) {
    const slot = data.slot;
    const winnerId = data.winnerId;

    const slotEl = document.querySelector(`[data-slot-name="${slot}"]`);
    if (!slotEl) return;

    const lanes = slotEl.querySelectorAll('.race-lane');
    lanes.forEach(lane => {
      const agentId = lane.dataset.agentId;

      if (agentId === winnerId) {
        lane.classList.remove('lane-scored');
        lane.classList.add('lane-winner');

        const crown = document.createElement('div');
        crown.className = 'lane-crown';
        crown.textContent = '👑';
        lane.appendChild(crown);

        const status = lane.querySelector('.lane-status');
        if (status) {
          status.className = 'lane-status status-winner';
          status.textContent = '🏆 WINNER';
        }

        AnimePresets.winnerBurst(lane);
      } else {
        lane.classList.remove('lane-scored');
        lane.classList.add('lane-loser');

        const status = lane.querySelector('.lane-status');
        if (status) {
          status.className = 'lane-status status-waiting';
          status.textContent = '—';
        }
      }
    });
  }
};
