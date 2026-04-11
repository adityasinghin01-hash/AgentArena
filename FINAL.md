# AgentArena — Final App Plan

> Screen-by-screen blueprint for the complete product.
> Each section is filled after user input.

---

## Screens

### 1. ✅ Landing Page (`/`) — DONE
- **Status**: Complete
- **Components**: `page.jsx`, `LandingScreen.jsx`, `Beams.jsx`, `globals.css`
- **Features delivered**:
  - Hero title "AgentArena" with text-glow effect
  - Italic serif subtitle "The Competitive AI Playground"
  - Tagline with line break for desktop
  - "Get Started" CTA → `/get-started`
  - "Already have an account? Sign in" → `/login`
  - Glow buttons with conic-gradient spinning border animation
  - WebGL 3D Beams background (Three.js + R3F)
  - Noise/grain texture overlay
  - Ghost border viewport polish
  - Fade-in + slide-up entrance animation
- **Purpose**: First impression, explains what AgentArena does, CTA → signup/login

---

### 2. ✅ Role Selection (`/get-started`) — DONE
- **Status**: Complete
- **Components**: `get-started/page.jsx`, `RoleSelection.jsx`, `ChromaGrid.jsx`, `ChromaGrid.css`
- **Features delivered**:
  - "Who are you here as?" headline with text-glow
  - Two chromatic cards: "Agent User" (pink) / "Agent Deployer" (cyan)
  - Mouse-tracking radial glow effect
  - Selected state with conic-gradient spinning ring + check icon
  - "Continue" CTA (disabled until selection) → stores role in `sessionStorage` → `/login`
  - Same Beams + noise + ghost border background as landing
  - Responsive: stacks to single column on mobile
- **Branching**: Two completely different paths after this
  - **User path** → Screen 3a, 4a, 5a...
  - **Developer path** → Screen 3b, 4b, 5b...

---

_(remaining screens to be filled)_

---

## USER PATH

### 3a. ✅ User Login/Signup (`/login`, `/signup`, `/forgot-password`, `/reset-password`) — DONE
- **Status**: Complete
- **Components**: `SignIn.jsx`, `signup/page.jsx`, `forgot-password/page.jsx`, `reset-password/page.jsx`
- **Features delivered**:
  - Email + password login with reCAPTCHA
  - Signup with email verification (Brevo)
  - Google OAuth one-tap sign-in
  - Forgot password → email with reset link (Brevo)
  - Reset password page (token validation + new password)
  - Role persistence (`PATCH /api/v1/user/role` — user/deployer)
  - Role-based redirect (user → `/arena`, deployer → `/deployer`)
  - JWT access + refresh tokens stored in localStorage
  - Token refresh on 401 with retry
  - reCAPTCHA on both login and signup
  - CI test bypass with shared `TEST_RECAPTCHA_TOKEN` constant

### 4a. ✅ Arena (`/arena`) — DONE
- **Status**: Complete
- **Components**: `arena/page.jsx`, `Navbar.jsx`, `globals.css` (arena tokens)
- **Features delivered**:
  - Glassmorphism Navbar with user dropdown, active page glow
  - Mode toggle: ⚡ Automatic / 🎯 Manual pill switch
  - Large prompt textarea with focus glow + character count
  - 6 prompt suggestion chips with hover effects
  - AI decompose flow → shimmer loading → BattlePreview
  - Round cards showing name + task from AI decomposition
  - Agent grid with badge tiers, win rate bars, selection state
  - Auto-select top agents in Auto mode
  - Pipeline creation → redirect to `/battle/:id`
  - State machine reducer (idle → decomposing → preview → launching)
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@frontend-developer` `@nextjs-patterns` `@react-best-practices` `@senior-fullstack` `@rest-api-design`
- **API endpoints wired**: `POST /outcome/decompose`, `POST /pipeline/create`, `GET /agents`

### 5a. ⏳ Battle Live (`/battle/:id`) — PENDING (Rate Limit Fix)
- **Status**: UI Complete, Backend rate-limited (Groq 429). Needs paid API key or fresh Gemini key.
- **Components**: `battle/[id]/page.jsx`, `globals.css` (battle tokens)
- **Features delivered**:
  - ChatGPT/Claude/Gemini-style chatbot UI per agent (avatar, name, markdown-rendered output)
  - Side-by-side agent panels (2-4 columns, auto-adapts to agent count)
  - Proper markdown rendering (code blocks, bold, lists, headers, links)
  - Error state styling for failed agents (⚠️ warning cards)
  - Round-by-round progression with round dividers
  - Typing indicator (3-dot bounce) while agent is thinking
  - Score badges per output (green/amber/red based on score)
  - Live leaderboard sidebar with progress bars (updates per round)
  - Gold-rank highlight for #1 position
  - Winner announcement card with bouncing trophy + gold glow animation
  - "New Battle", "View Results", "Chat with Winner" CTAs
  - SSE stream parsing (agent_output → agent_scores → round_complete → overall_winner → complete)
  - Auto-scroll to latest output
  - Error/connecting states with shimmer loading
  - 3x retry with exponential backoff for 429s
  - Sequential agent runs with stagger delays
- **Blocker**: Groq free tier 30 req/min can't handle 24 calls/battle. Fix: paid key ($5) or fresh Gemini key.
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@design-spells` `@frontend-developer` `@react-best-practices` `@senior-fullstack` `@systematic-debugging` `@performance-optimization`

### 6a. ⏳ Results (`/results/:id`) — PENDING (Needs Battle Live)
- **Status**: Complete
- **Components**: `results/[id]/page.jsx`, `globals.css` (results tokens)
- **Features delivered**:
  - Stats row: Rounds, Agents, Avg Score with glassmorphism cards
  - Winner announcement banner with trophy + gold glow
  - Final leaderboard with medal emojis, colored avatars, progress bars, per-round chips
  - Gold highlight for #1 position
  - Round-by-round expandable breakdown cards (click to expand)
  - Per-agent score bars (Accuracy, Completeness, Format, Hallucination)
  - Response time display per agent per round
  - Failed agent detection with "⚠ Failed" badge
  - Battle metadata footer (timestamp + ID)
  - "New Battle" CTA
  - Backend: `GET /api/v1/audition/:id` with populated agent refs
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@design-spells` `@react-best-practices` `@frontend-developer` `@senior-fullstack` `@rest-api-design`

### 7a. ❌ Chat with Winner — REMOVED
- Removed due to env configuration complexity with Render deployment.
- Can be re-added later when deployment pipeline is unified.

### 8a. ✅ User Dashboard (`/dashboard`) — DONE
- **Status**: Complete
- **Components**: `dashboard/page.jsx`, `globals.css` (dash tokens), `auditionController.js` (getUserAuditions)
- **Features delivered**:
  - Stats row: Total Battles, Unique Winners, Avg Top Score with glassmorphism cards
  - Battle history list with winner avatar, prompt preview, agent count, round count, time ago
  - Winner badge with tier-colored border (Elite=gold, Verified=cyan, Tested=purple)
  - Click any battle → navigates to `/results/:id`
  - Top score display per battle
  - Empty state with call-to-action for first-time users
  - Pagination (prev/next) for large history
  - "New Battle" quick-action CTA
  - Shimmer loading skeleton
  - Backend: `GET /api/v1/audition/my` (paginated user battles with populated winner)
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@design-spells` `@react-best-practices` `@frontend-developer` `@senior-fullstack` `@rest-api-design`

### 9a. ✅ Agent Marketplace (`/agents`) — DONE
- **Status**: Complete
- **Components**: `agents/page.jsx`, `globals.css` (mkt tokens), `agentController.js` (searchAgents)
- **Features delivered**:
  - Grid card layout (App Store style) with hover lift animations
  - Featured section for Elite/Verified agents with gold/cyan border glow
  - Live debounced search (300ms) on name + description
  - Category dropdown filter (9 categories + All)
  - Sort selector (Reliability, Win Rate, Most Battles, Newest)
  - Agent cards: avatar, name, category badge, badge tier, description, win rate bar, total battles, deployer
  - Card "+" select button with purple highlight when selected
  - Sticky bottom selection bar (1-4 agents) with agent chips, remove buttons
  - "Start Battle →" CTA → redirects to `/arena?agents=id1,id2,...`
  - Empty state for no results
  - Shimmer loading skeleton
  - Public (no auth needed to browse)
  - Backend: `GET /api/v1/agents/search?q=&category=&sort=&page=` (regex search + filter + sort)
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@design-spells` `@react-best-practices` `@frontend-developer` `@senior-fullstack` `@rest-api-design` `@backend-architect`

### 10a. ✅ Agent Detail (`/agents/:id`) — DONE
- **Status**: Complete
- **Components**: `agents/[id]/page.jsx`, `globals.css` (agent-detail tokens), `auditionController.js` (getAgentBattleHistory)
- **Features delivered**:
  - Full agent profile: name, description, category, badge tier, deployer
  - Hero card with avatar, badge-colored border + glow shadow
  - 4-column stats row: Win Rate, Total Battles, Reliability Score, Badge Tier
  - "Select for Battle" CTA → `/arena?agents=<id>`
  - Recent battles section with prompt preview, time ago, win/loss indicator
  - Back to Marketplace link
  - Public (no auth needed to view)
  - Backend: `GET /api/v1/audition/agent/:agentId` (public agent battle history)
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@design-spells` `@react-best-practices` `@frontend-developer` `@senior-fullstack` `@rest-api-design`

---

## DEVELOPER PATH

_(to be filled later after User path + Auth are done)_

---

## SHARED UI

### Navbar (all pages except landing + role selection)
- **Logo**: AgentArena (links to /arena)
- **Nav links**: Arena | Marketplace | Dashboard
- **User menu**: Avatar dropdown → Settings, API Keys, Logout
- **Battle counter**: "3 battles today" badge

### Footer
- Minimal: © AgentArena 2026 | GitHub | About

---

## BACKEND CHANGES NEEDED

| Feature | Endpoint | Status |
|---------|----------|--------|
| Role selection | Save role on user model | 🔧 New field on User |
| Manual agent pick | Already supported (assignedAgents) | ✅ Exists |
| Dedicated battle page | SSE already works, just new route | ✅ Exists |
| Chat with winner | `POST /api/v1/chat/:agentId` | 🔧 New endpoint |
| API key for agent | `POST /api/v1/deploy/:agentId` | 🔧 New endpoint |
| Run agent via API key | `POST /api/v1/run` | 🔧 New endpoint |
| Agent marketplace | `GET /api/v1/agents` with search/filter/sort | 🔧 Enhance existing |
| User dashboard | `GET /api/v1/dashboard/history` | 🔧 New endpoint |

---

## USER FLOW SUMMARY

```
Landing (/) → Role Selection (/get-started)
                    ↓
              "I'm a User"
                    ↓
            Login/Signup (/login)
                    ↓
              Arena (/arena)
              ┌─────────────────┐
              │ ⚡ Auto  🎯 Manual │
              └────┬────────┬───┘
                   │        │
                   │    Marketplace (/agents)
                   │    Pick 2-4 agents
                   │        │
                   ↓        ↓
            Battle Preview (confirm agents + rounds)
                    ↓
            Battle Live (/battle/:id)
            [3 chatbot panels side by side]
                    ↓
            Results (/results/:id)
            ┌───────────┬──────────┐
            │ 🔑 Use    │ 💬 Chat  │
            │ Agent     │ Winner   │
            └─────┬─────┴────┬─────┘
                  ↓           ↓
        API Key Generated   Chat (/chat/:agentId)
                             5-10 free msgs → CTA
                    ↓
            Dashboard (/dashboard)
            History, API keys, favorites
```

---
