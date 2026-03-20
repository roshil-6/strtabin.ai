# Social + Team Workspace System (Phase 2)

Production-ready collaborative execution platform built on your existing Node/Express + React stack.

---

## 1. Folder Structure

```
strategy box/
├── db/
│   ├── index.js          # SQLite init & connection
│   ├── schema.sql         # Full schema (users, profiles, workspaces, projects, etc.)
│   └── models.js          # All DB operations
├── routes/
│   └── workspaces.js      # Workspace, project, feed, profile, notifications API
├── data/                  # Created at runtime — SQLite DB file
│   └── strategybox.db
├── src/
│   ├── components/
│   │   ├── CreateWorkspaceModal.tsx   # Workspace type selection (Individual/Team)
│   │   ├── WorkspacePage.tsx          # Workspace detail: projects, members, activity
│   │   ├── ProfilePage.tsx            # Public user profile
│   │   └── FeedPage.tsx               # Public feed
│   └── services/
│       └── workspaceService.ts        # API client
├── server.js              # Express server (includes workspace routes)
└── package.json
```

---

## 2. Database Schema

- **users** — Synced from Clerk (clerk_user_id, username, email)
- **profiles** — Bio, avatar
- **workspaces** — name, type (individual/team), owner_id, visibility (private/public)
- **workspace_members** — workspace_id, user_id, role (admin/member)
- **invitations** — workspace_id, inviter_id, invitee_email/user_id, status
- **projects** — workspace_id, title, description, status (idea/planning/executing/completed)
- **activity_logs** — user_id, workspace_id, project_id, action
- **execution_logs** — For streaks and progress scoring
- **notifications** — user_id, type, title, body, read_at

---

## 3. API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /api/workspaces | ✓ | Create workspace |
| GET | /api/workspaces | ✓ | List user's workspaces |
| GET | /api/workspaces/:id | ✓ | Get workspace + members + projects + activity |
| PATCH | /api/workspaces/:id | ✓ (admin) | Update workspace |
| POST | /api/workspaces/:id/invite | ✓ (admin) | Invite member (email or username) |
| POST | /api/workspaces/:id/projects | ✓ | Create project |
| PATCH | /api/projects/:id | ✓ | Update project |
| GET | /api/invitations | ✓ | List pending invitations |
| POST | /api/invitations/:id/accept | ✓ | Accept invitation |
| POST | /api/invitations/:id/reject | ✓ | Reject invitation |
| GET | /api/feed | — | Public feed (workspaces, projects, activity) |
| GET | /api/profile/:username | — | Public profile |
| GET | /api/me | ✓ | Current user + streak + progress |
| PATCH | /api/me/profile | ✓ | Update bio |
| POST | /api/execution | ✓ | Log execution (streaks) |
| GET | /api/notifications | ✓ | List notifications |
| POST | /api/notifications/:id/read | ✓ | Mark as read |

---

## 4. Step-by-Step Run Instructions

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
cd "c:\Users\Abhinand Antony\Desktop\strategy box"
npm install
```

### 2. Environment variables

Create `.env` in the project root (if not exists):

```
CLERK_SECRET_KEY=sk_...           # Required for auth
ANTHROPIC_API_KEY=sk-ant-...      # For AI features
```

### 3. Start the server

```bash
npm run start
```

Server runs on `http://localhost:3001`. Database is created at `data/strategybox.db` on first run.

### 4. Start the frontend (dev)

```bash
npm run dev
```

Frontend runs on `http://localhost:5173`.

### 5. Use the app

1. Sign in via Clerk (or use existing auth flow).
2. Open dashboard → sidebar shows **Team Workspaces**.
3. Click **+** next to "Team Workspaces" → **Create Workspace**.
4. Choose **Individual** or **Team**.
5. Enter name; for Team, set visibility (Private/Public).
6. Create project inside workspace.
7. For Team: invite members via email or username.
8. Accept invitations from the banner on the dashboard.
9. Profile: `/profile/<username>` or `/profile/me`.
10. Feed: `/feed` — public workspaces and projects.

---

## 5. Execution Tracking (Streaks & Progress)

- **Streak**: Consecutive days with at least one logged execution (score > 0).
- **Progress score**: Sum of execution scores over last 30 days.

Execution is logged when:

- Creating a project (score: 5)
- Updating project status (idea: 0, planning: 2, executing: 5, completed: 10)
- Manual log via `POST /api/execution`

---

## 6. PostgreSQL Migration (Future)

Schema uses standard SQL. For PostgreSQL:

- Replace `INTEGER PRIMARY KEY AUTOINCREMENT` with `SERIAL PRIMARY KEY`
- Replace `TEXT` with `VARCHAR` where appropriate
- Use `datetime('now')` → `NOW()` or `CURRENT_TIMESTAMP`
- Use `better-sqlite3` → `pg` or `node-postgres`

---

## 7. Security

- All workspace/project routes require valid Clerk JWT.
- Access checks: `hasWorkspaceAccess` and `canManageMembers`.
- Input sanitization on all string inputs.
- Rate limiting applied (existing global + AI limiters).
