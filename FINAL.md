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

### 3a. User Login/Signup (`/login`)
- **After**: Role selection → "I'm a User"
- **Features**: Email + password login, signup tab/toggle
- **On success**: → Arena page

#### Backend Integration Tasks:

**Sign In button click:**
1. `POST /api/v1/login` with `{ email, password, rememberMe }`
2. On `200` → store `accessToken` + `refreshToken` in `localStorage`
3. Store `user` object (`id`, `email`, `role`, `isVerified`) in `localStorage`
4. Save `accountType` from `sessionStorage.selectedRole` → `PATCH /api/v1/user/role` _(new endpoint needed)_
5. Redirect → `/arena`
6. On `401` → show "Invalid credentials" error
7. On `403` (unverified) → show "Please verify your email" message
8. On `403` (locked) → show "Account temporarily locked" message

**Sign Up button click (top-right):**
1. Navigate → `/signup` (or toggle to signup form)
2. `POST /api/v1/signup` with `{ email, password, source: "web" }`
3. On `201` → show "Account created. Check your email to verify."
4. Store tokens for auto-login after verification
5. On `409` → show "Account already exists" error
6. On `400` → show password validation errors

**Continue with Google:**
1. Trigger Google OAuth popup → get `idToken`
2. `POST /api/v1/google-login` with `{ idToken }`
3. On `200` → store tokens + user → redirect `/arena`
4. On `404` → show "No account found. Please sign up first."

**Forgot password?**
1. Navigate → `/forgot-password` _(future screen)_
2. `POST /api/v1/password/forgot` with `{ email }` (endpoint exists)

**Remember me checkbox:**
- Passed as `rememberMe: true` in login body
- Backend issues longer-lived refresh token

**Token refresh (background):**
- On `401` from any API call → `POST /api/v1/refresh-token` with `{ refreshToken }`
- Rotate both tokens, retry original request
- On reuse detection → wipe all tokens → force re-login

### 4a. Arena (`/arena`)
- **Two modes**: Toggle between ⚡ Automatic and 🎯 Manual
- **Automatic**: Type problem → AI picks best agents → preview shown → battle starts
- **Manual**: Type problem → go to Agent Marketplace → pick 2-4 agents → come back → battle starts
- **Prompt suggestions**: Quick-start buttons ("Review code", "Plan a trip", etc.)
- **Battle Preview**: Before battle starts, shows:
  - Rounds breakdown (from AI decompose)
  - Agent cards with name, category, win rate, badge
  - User confirms → battle begins
- **Future additions**: Estimated time, recent battles sidebar, swap agent button

### 5a. Battle Live (`/battle/:id`)
- **Layout**: Side-by-side agent panels (2-4 columns based on agent count)
- **Each panel**: Looks like a chatbot UI (like GPT/Claude/Gemini interface)
  - Agent name + avatar + badge at top
  - Output streams in with proper markdown rendering (code blocks, lists, bold, etc.)
  - Typing indicator while agent is "thinking"
- **Round-by-round**: One round at a time, all agents answer, then next round
- **Live Leaderboard**: Persistent scoreboard showing cumulative scores, updates after each round
- **After all rounds**: Winner announcement → link to results page

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
