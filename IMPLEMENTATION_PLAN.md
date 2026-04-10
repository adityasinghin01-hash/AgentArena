# AgentArena — Implementation Plan

## How To Use This File
- Read this fully before every coding session
- Complete one phase at a time
- Mark each task ✅ when done
- Never skip ahead
- Never touch existing Adv_Backend files unless explicitly stated

---

## 🔵 SECTION 1 — PROTOTYPE
> Goal: Working demo for Vihaan 9.0 hackathon. 3 hardcoded demo outcomes must work flawlessly.
> Deadline: April 10, 2026
> Rule: Only build what is listed here. Nothing extra.

---

### PHASE 1 — Agent Registry

**Goal:** A database of AI agents. Deployers publish agents. Users fetch them by category.

**New files to create:**
- models/Agent.js
- controllers/agentController.js
- routes/v1/agents.routes.js
- scripts/seed-agents.js

**Agent.js schema — exact fields:**
- name (String, required, trim)
- description (String, required)
- category (String, enum: classifier/writer/ranker/analyzer/linter/scanner/explainer/scheduler/researcher/other, required)
- systemPrompt (String, required) — this IS the agent
- inputSchema (Mixed, default: {})
- outputSchema (Mixed, default: {})
- pricing (String, enum: free/paid, default: free)
- reliabilityScore (Number, default: 0, min: 0, max: 100)
- winRate (Number, default: 0, min: 0, max: 100)
- totalAuditions (Number, default: 0)
- badgeTier (String, enum: unverified/tested/verified/elite, default: unverified)
- deployedBy (ObjectId, ref: User, required)
- isActive (Boolean, default: true)
- timestamps: true

**Indexes:**
- category (for filtering)
- deployedBy (for deployer dashboard)
- reliabilityScore (for sorting)
- badgeTier

**Endpoints:**
- POST   /api/v1/agents              — create agent (protected, any logged-in user)
- GET    /api/v1/agents              — list all active agents (public)
- GET    /api/v1/agents/:id          — single agent (public)
- GET    /api/v1/agents/category/:category — filter by category (public)
- PUT    /api/v1/agents/:id          — update own agent (protected, owner only)
- DELETE /api/v1/agents/:id          — delete own agent (protected, owner only)

**Validation rules:**
- name: required, 2-100 chars
- description: required, 10-500 chars
- category: required, must be from enum
- systemPrompt: required, min 10 chars
- pricing: optional, defaults to free

**seed-agents.js — seed exactly 10 agents:**

Demo 1 — "Summarize customer support tickets and flag urgent ones":
1. Ticket Classifier (category: classifier)
2. Support Summarizer (category: writer)
3. Priority Ranker (category: ranker)

Demo 2 — "Write and schedule 7 tweets for my tech startup":
4. Tech Researcher (category: researcher)
5. Tweet Writer (category: writer)
6. Post Scheduler (category: scheduler)

Demo 3 — "Review my code and find security issues":
7. Code Linter (category: linter)
8. Security Scanner (category: scanner)
9. Issue Explainer (category: explainer)

Bonus:
10. General Analyzer (category: analyzer)

Each agent gets a realistic system prompt. Use a hardcoded admin userId from .env as SEED_USER_ID.

**Wire into:** routes/v1/index.js

**Test before moving on:**
- POST /api/v1/agents — create one agent
- GET /api/v1/agents — returns list
- GET /api/v1/agents/category/linter — returns linter agents
- Run seed script — 10 agents appear in DB

---

### PHASE 2 — Claude Service

**Goal:** One service file that handles ALL Claude API calls. Every other module imports from here. Never call Claude API directly from a controller.

**New files to create:**
- services/claudeService.js

**Add to .env:**
- CLAUDE_API_KEY=

**Functions to build:**

1. callClaude(systemPrompt, userMessage)
   - Base function used by all others
   - POST to https://api.anthropic.com/v1/messages
   - Model: claude-opus-4-5
   - Headers: x-api-key, anthropic-version: 2023-06-01, content-type: application/json
   - max_tokens: 2048
   - Returns: response text string
   - Throws structured AppError on failure with status code

2. decomposeOutcome(outcomeText)
   - Calls callClaude with this system prompt:
     "You are a pipeline architect. Break the user's goal into 2-4 specialized AI agent slots.
      Return ONLY valid JSON in this exact format, no markdown, no explanation:
      { slots: [{ name: string, task: string, evaluation_criteria: string }] }
      Keep slot names short (2-3 words). Keep tasks specific and actionable."
   - Parses response as JSON
   - Returns: { slots: [...] }
   - Throws if JSON parse fails

3. evaluateOutput(task, output, rubric)
   - Calls callClaude with this system prompt:
     "You are a strict AI output evaluator. Score the output on these dimensions.
      Return ONLY valid JSON, no markdown, no explanation:
      { accuracy: number, completeness: number, format: number, hallucination: number, total: number }
      All scores 0-100. hallucination score means: 100 = no hallucination, 0 = severe hallucination.
      total = weighted average: accuracy 35% + completeness 30% + format 15% + hallucination 20%"
   - Returns parsed scores object
   - Throws if JSON parse fails

4. runAgent(systemPrompt, userInput)
   - Calls callClaude with provided systemPrompt and userInput
   - Returns: raw text string (agent's response)

**Test before moving on:**
- Call decomposeOutcome("Review my code and find security issues") — should return 3 slots
- Call runAgent with a simple system prompt — should return text

---

### PHASE 3 — Outcome Engine + Pipeline Create

**Goal:** User submits outcome text → Claude decomposes it → slots saved as a Pipeline in DB with agents assigned.

**New files to create:**
- models/Pipeline.js
- controllers/outcomeController.js
- controllers/pipelineController.js
- routes/v1/outcome.routes.js
- routes/v1/pipeline.routes.js

**Pipeline.js schema — exact fields:**
- userId (ObjectId, ref: User, required)
- outcomeText (String, required)
- slots: [{
    name: String,
    task: String,
    evaluationCriteria: String,
    assignedAgents: [{ type: ObjectId, ref: Agent }]
  }]
- status (String, enum: draft/ready/running/complete, default: draft)
- deployedApiKey (ObjectId, ref: ApiKey, default: null)
- timestamps: true

**Indexes:**
- userId
- status

**Endpoints:**

POST /api/v1/outcome/decompose (protected)
- Body: { outcomeText: string }
- Validates outcomeText exists, min 10 chars
- Calls claudeService.decomposeOutcome(outcomeText)
- Does NOT save to DB — just returns slots to frontend
- Returns: { success: true, data: { outcomeText, slots: [...] } }

POST /api/v1/pipeline/create (protected)
- Body: { outcomeText, slots: [{ name, task, evaluationCriteria, assignedAgents: [agentId] }] }
- If assignedAgents not provided for a slot: auto-fetch top 3 agents by matching category from DB
- Category matching logic: slot name keywords → best matching category
- Saves Pipeline with status: ready
- Returns: { success: true, data: { pipelineId, pipeline } }

GET /api/v1/pipeline/:id (protected)
- Returns pipeline with agents populated
- Only owner can fetch

GET /api/v1/pipeline/user/mine (protected)
- Returns all pipelines for req.user._id
- Sorted by createdAt desc

**Wire into:** routes/v1/index.js

**Test before moving on:**
- POST /api/v1/outcome/decompose with "Review my code" — returns 3 slots
- POST /api/v1/pipeline/create with those slots — saves to DB, returns pipelineId
- GET /api/v1/pipeline/:id — returns pipeline with agents populated

---

### PHASE 4 — Pipeline Executor + SSE Streaming

**Goal:** The main feature. Send pipeline ID + user input → all agents run in parallel → results stream live via SSE → scores calculated → winner picked per slot.

**New files to create:**
- models/Audition.js
- services/auditionService.js
- controllers/auditionController.js
- routes/v1/audition.routes.js

**Audition.js schema — exact fields:**
- pipelineId (ObjectId, ref: Pipeline, required)
- userId (ObjectId, ref: User, required)
- userInput (String, required)
- results: [{
    slotName: String,
    agentId (ObjectId, ref: Agent),
    agentName: String,
    output: String,
    scores: {
      accuracy: Number,
      completeness: Number,
      format: Number,
      hallucination: Number,
      total: Number
    },
    responseTimeMs: Number,
    winner: Boolean (default: false)
  }]
- status (String, enum: running/complete/failed, default: running)
- timestamps: true

**Indexes:**
- pipelineId
- userId
- status

**auditionService.js — runAudition(pipeline, userInput, sseCallback):**

Logic:
1. For each slot in pipeline.slots:
   a. Run ALL assignedAgents in PARALLEL using Promise.allSettled
   b. For each agent: record start time → call claudeService.runAgent → record end time
   c. sseCallback({ event: 'agent_output', slot: slotName, agentId, agentName, output, responseTimeMs })
   d. After all agents in slot complete: call claudeService.evaluateOutput for each agent output
   e. sseCallback({ event: 'agent_scores', slot: slotName, agentId, scores })
   f. Pick winner = agent with highest scores.total
   g. sseCallback({ event: 'slot_winner', slot: slotName, winnerId: agentId, winnerName })
2. Save complete Audition to DB
3. Update each agent's reliability:
   - Increment totalAuditions
   - Recalculate reliabilityScore as rolling average of scores.total
   - Recalculate winRate as (wins / totalAuditions) * 100
   - Update badgeTier:
     - unverified: 0 auditions
     - tested: 1-9 auditions
     - verified: 10+ auditions AND reliabilityScore >= 70
     - elite: 50+ auditions AND reliabilityScore >= 85
4. sseCallback({ event: 'complete', auditionId })
5. Return saved audition

**CRITICAL:** Use Promise.allSettled not Promise.all — one agent failing must not kill the whole audition. If an agent fails, mark its output as "Agent failed to respond" and scores as all zeros.

**auditionController.js — runAudition(req, res):**
- Set headers: Content-Type: text/event-stream, Cache-Control: no-cache, Connection: keep-alive
- Fetch pipeline by id, verify req.user._id matches pipeline.userId
- sseCallback = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`)
- Call auditionService.runAudition(pipeline, userInput, sseCallback)
- On complete: res.end()
- Handle disconnect: req.on('close', () => { /* cleanup */ })

**SSE event types (frontend will listen for these):**
- agent_output: { event, slot, agentId, agentName, output, responseTimeMs }
- agent_scores: { event, slot, agentId, scores }
- slot_winner: { event, slot, winnerId, winnerName }
- complete: { event, auditionId }
- error: { event, message }

**Other endpoints:**
- GET /api/v1/audition/:id (protected) — fetch audition with populated agents
- GET /api/v1/audition/pipeline/:pipelineId (protected) — all auditions for a pipeline

**Wire into:** routes/v1/index.js

**Test before moving on:**
- POST /api/v1/audition/run/:pipelineId — open in browser or Postman SSE mode
- Watch events stream in real time
- Check Audition saved in DB after stream ends
- Check agent reliabilityScore + winRate updated

---

### PHASE 5 — Auto Evaluator Endpoint + Reliability Updater

**Goal:** Standalone evaluate endpoint usable from anywhere. Agent reliability auto-updates after every audition.

**New files to create:**
- controllers/evaluatorController.js
- routes/v1/evaluate.routes.js

**Endpoint:**
POST /api/v1/evaluate (protected)
- Body: { task: string, output: string, rubric: string }
- Validates all three fields present
- Calls claudeService.evaluateOutput(task, output, rubric)
- Returns: { success: true, data: { accuracy, completeness, format, hallucination, total } }

**Wire into:** routes/v1/index.js

**Note:** Agent reliability update logic lives in auditionService.js (built in Phase 4) — this endpoint is for standalone use only.

**Test before moving on:**
- POST /api/v1/evaluate with sample task + output — returns scores object
- Scores are numbers 0-100

---

### PHASE 6 — Seed Script + Health Check Update

**Goal:** Pre-load all 10 demo agents. Update health endpoint to show AgentArena status.

**Tasks:**

1. Complete and run scripts/seed-agents.js:
   - Check if agents already exist before seeding (idempotent)
   - Seed all 10 agents with real system prompts from Teammate 2
   - Log count of agents seeded
   - Add npm script: "seed:agents": "node scripts/seed-agents.js"

2. Update /api/health endpoint to also return:
   - agentsCount: total active agents in DB
   - pipelinesCount: total pipelines in DB
   - claudeApiStatus: try a minimal Claude ping, return "ok" or "error"
   - version: "AgentArena v1.0.0"

**Test before moving on:**
- Run npm run seed:agents — 10 agents in DB
- GET /api/health — returns agentsCount: 10, claudeApiStatus: ok

---

### PROTOTYPE COMPLETE CHECKLIST

Before calling prototype done — verify ALL of these:

[ ] GET /api/health returns claudeApiStatus: ok
[ ] 10 agents seeded in DB
[ ] POST /api/v1/agents — can create an agent
[ ] GET /api/v1/agents/category/linter — returns linter agents
[ ] POST /api/v1/outcome/decompose — returns slots for all 3 demo outcomes
[ ] POST /api/v1/pipeline/create — saves pipeline, returns pipelineId
[ ] GET /api/v1/pipeline/:id — returns pipeline with agents populated
[ ] SSE stream works — events come through in order
[ ] Audition saves to DB after stream ends
[ ] Agent reliabilityScore updates after audition
[ ] POST /api/v1/evaluate — returns scores object
[ ] No .env values hardcoded in any file
[ ] No secrets pushed to GitHub

---

---

## 🟢 SECTION 2 — FINAL PRODUCT
> Goal: Production-grade SaaS after hackathon.
> Rule: Do NOT build any of this during the hackathon. This is post-launch scope.

---

### PHASE A — Auth Hardening
- Re-enable email verification (already in codebase — just unwire the skip)
- Re-enable password reset flow
- Re-enable reCAPTCHA on signup
- Tighten rate limits per role: user vs deployer vs admin separate buckets

---

### PHASE B — Agent Registry v2
- Agent versioning: deployers publish v1, v2 without breaking existing pipelines
- Schema compatibility checker: validate input/output schema before pipeline assembly
- Agent review queue: agents go to pending status on publish, admin approves before going live
- Semantic search: POST /api/v1/agents/search?q=outcome — embeddings-based matching
- Auto-categorization on publish using Claude
- Paid agent support: per-use billing, price per call

New endpoints:
- POST /api/v1/agents/:id/versions
- POST /api/v1/agents/search
- POST /api/v1/agents/:id/submit-review
- PUT  /api/v1/admin/agents/:id/approve

---

### PHASE C — Subscription + Billing
- Free / Pro / Enterprise plans
- Auditions per month limit per plan
- Agent deployments limit per plan
- Revenue share calculation for deployers (platform takes 20%)
- Usage tracking per user per billing cycle

New endpoints:
- POST /api/v1/subscriptions/upgrade
- GET  /api/v1/subscriptions/usage
- GET  /api/v1/deployer/revenue

---

### PHASE D — Pipeline Executor v2
- Replace direct async calls with BullMQ job queue
- Retry logic per agent: 3 retries with exponential backoff
- Hard timeout per agent: 30 seconds
- Async run mode: fire pipeline → poll for result (not just SSE)
- Multi-model support: GPT-4o + Gemini + Claude selectable per agent
- Full pipeline run history with replay

New endpoints:
- POST /api/v1/pipeline/:id/run/async
- GET  /api/v1/pipeline/:id/status
- GET  /api/v1/pipeline/:id/history

---

### PHASE E — Self-Improving Matching Engine
- Store full outcome-agent-result triplets after every audition
- Matching weights updated after each audition result
- GET /api/v1/recommendations?outcome=text — suggest best agents per slot
- POST /api/v1/feedback — user override feeds back into weights
- Cold start covered by seed data

---

### PHASE F — Deployer Analytics Dashboard
- Win rate per agent over time (weekly/monthly)
- Revenue earned per agent
- Audition selection count per agent
- User feedback + override signal tracking
- Badge tier progression history

New endpoints:
- GET /api/v1/deployer/analytics
- GET /api/v1/deployer/agents/:id/analytics
- GET /api/v1/deployer/revenue/breakdown

---

### PHASE G — Outcome Progress Dashboard
- User sets success metric when deploying pipeline
- Backend polls pipeline outputs periodically
- Progress calculation toward stated goal using Claude scoring
- Alert if pipeline performance drops below threshold
- Email alert via Brevo when pipeline degrades

New endpoints:
- POST /api/v1/pipeline/:id/goal
- GET  /api/v1/pipeline/:id/progress
- POST /api/v1/pipeline/:id/alert-config

---

### PHASE H — Webhook System v2
- Extend existing Adv_Backend webhook system
- New AgentArena webhook events:
  - agent.audition.complete
  - agent.won.audition
  - pipeline.deployed
  - pipeline.degraded
  - agent.badge.upgraded

---

### PHASE I — Admin Dashboard Backend
- Moderation queue: approve/reject agents
- Platform analytics: total auditions, DAU, revenue
- Fraud detection: abuse of free tier
- User management: ban, suspend, downgrade plan
- Agent certification: human review pipeline for Elite badge

New endpoints:
- GET  /api/v1/admin/moderation/queue
- PUT  /api/v1/admin/agents/:id/approve
- PUT  /api/v1/admin/agents/:id/reject
- GET  /api/v1/admin/analytics
- PUT  /api/v1/admin/users/:id/ban

---

### FINAL PRODUCT ENV VARS (add after hackathon)
- OPENAI_API_KEY — GPT-4o support
- GEMINI_API_KEY — Gemini support
- REDIS_URL — BullMQ queue
- EMBEDDING_API_KEY — semantic search

---

## New .env Variables For Prototype Only
CLAUDE_API_KEY=sk-ant-...
SEED_USER_ID=<mongodb objectid of your admin user>

---

## Folder Structure After Prototype Complete
```
models/
  Agent.js ← NEW
  Pipeline.js ← NEW
  Audition.js ← NEW
  [all existing Adv_Backend models untouched]

controllers/
  agentController.js ← NEW
  outcomeController.js ← NEW
  pipelineController.js ← NEW
  auditionController.js ← NEW
  evaluatorController.js ← NEW
  [all existing controllers untouched]

routes/v1/
  agents.routes.js ← NEW
  outcome.routes.js ← NEW
  pipeline.routes.js ← NEW
  audition.routes.js ← NEW
  evaluate.routes.js ← NEW
  index.js ← MODIFY ONLY to add new routes
  [all other route files untouched]

services/
  claudeService.js ← NEW
  auditionService.js ← NEW
  [all existing services untouched]

scripts/
  seed-agents.js ← NEW
```
