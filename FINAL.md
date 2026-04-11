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

### 5a. ✅ Battle Live (`/battle/:id`) — DONE
- **Status**: Complete
- **Components**: `battle/[id]/page.jsx`, `globals.css` (battle tokens)
- **Features delivered**:
  - Side-by-side agent panels (2-4 columns, auto-adapts to agent count)
  - Chatbot-style UI per agent (avatar, name, score, output bubbles)
  - Round-by-round progression with round labels
  - Typing indicator (3-dot bounce) while agent is thinking
  - Score badges per output (green/amber/red based on score)
  - Live leaderboard sidebar with progress bars (updates per round)
  - Gold-rank highlight for #1 position
  - Winner announcement card with gold glow animation
  - SSE stream parsing (agent_output → agent_scores → round_complete → overall_winner → complete)
  - Auto-scroll to latest output
  - Error/connecting states with shimmer loading
  - "New Battle" CTA after completion
- **Skills used**: `@ui-ux-pro-max` `@dark-mode-ui` `@glassmorphism` `@frontend-developer` `@react-best-practices` `@senior-fullstack` `@performance-optimization`

### 6a. Results (`/results/:id`)
- **Final Leaderboard**: All agents ranked with cumulative scores
- **Round-by-round breakdown**: Expandable per-round scores (accuracy, completeness, etc.)
- **🔑 "Use This Agent"** button: Generates API key for the winning agent
- **💬 "Chat with Winner"** button: Opens a live chat session with the winning agent
- **Share**: Shareable link to this battle result

### 7a. Chat with Winner (`/chat/:agentId`)
- **UI**: Full ChatGPT-style chat interface (conversation history, markdown rendering)
- **Limit**: 5-10 free demo messages, then soft prompt: "Generate API key for unlimited access"
- **After limit**: Shows API key generation CTA, doesn't hard-block

### 8a. User Dashboard (`/dashboard`)
- Past battles history (prompt, winner, date)
- API keys generated (agent name, key, usage count)
- Agents used / favorited
- _(will modify later)_

### 9a. Agent Marketplace (`/agents`)
- **Featured section**: Top row with Elite badge agents
- **Search bar**: Search by name or description
- **Category filters**: Sidebar checkboxes (scanner, writer, linter, analyzer, etc.)
- **Sort by**: Win rate, total battles, newest, most popular
- **Agent cards** show:
  - Name, category badge, win rate, badge tier (Tested/Verified/Elite)
  - Total battles, short description, creator name
  - All stats accumulated from real battle data
- **Quick "+" button**: Select agent for battle without opening detail
- **Click card**: Opens agent detail page
- **Bottom bar**: Shows selected agents (2-4), "Start Battle →" button

### 10a. Agent Detail (`/agents/:id`)
- Full agent profile: name, description, category, creator
- Stats: win rate, total battles, reliability score, badge tier
- Battle history: recent battles this agent participated in
- "Select for Battle" button

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
