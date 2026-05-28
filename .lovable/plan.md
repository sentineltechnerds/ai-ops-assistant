## Workflow & Permission Updates

Scope: surgical updates to existing app. No redesign, no architecture changes.

### 1. Employee submit form — remove priority selector
File: `src/routes/_authenticated/submit.tsx`
- Remove the priority dropdown/field entirely.
- Default the submitted priority to `"medium"` server-side; AI fills `ai_suggested_priority`.
- Show AI-determined priority on the post-submit confirmation screen.

### 2. AI engine — make priority authoritative
File: `src/lib/tickets.functions.ts`
- In `submitTicket`, write the AI priority into BOTH `priority` and `ai_suggested_priority` (so queues sort by AI urgency).
- Drop the incoming `priority` field from the input validator.
- Keep existing keyword + Gemini classifier; tighten critical/high keyword lists slightly (server down, payroll, breach, outage → critical).

### 3. Department queue — AI-priority ordering + visuals
File: `src/routes/_authenticated/queue.tsx`
- Sort: `critical → high → medium → low`, then by `created_at` asc.
- Critical row: pulsing red glow ring, animated alert dot, "ESCALATE" badge.
- Confirm RLS already isolates by department (it does — `tickets_select_scoped` uses `get_user_department`). No DB changes needed for isolation.
- Add department-specific counters (Critical / High / Open / Resolved today) at top.

### 4. Strict department isolation — verify & lock down UI
- `queue.tsx` and `tickets.tsx` for department_admin: filter client-side as a backstop (RLS is primary).
- Hide cross-department analytics / global counts from department_admin nav.
- `_authenticated.tsx` sidebar: department admins see only Queue + History + Notifications (no Users, no Command Center, no global Tickets).

### 5. Super Admin Command Center — oversight only
Files: `src/routes/_authenticated/dashboard.tsx` (super_admin view), `src/routes/_authenticated/users.tsx`
- Confirm super admin sees all tickets, per-department counters (IT/HR/Finance), critical alerts, resolution rates.
- Super admin does NOT get queue action buttons (resolve/in_progress) — read-only monitoring on ticket lists. Updates stay scoped to department_admins.

### 6. Auto-generated passwords for user creation
File: `src/lib/admin.functions.ts` + `src/routes/_authenticated/users.tsx`
- Remove the temp-password input from the Create User dialog.
- Server generates a 12-char password: upper+lower+digit+symbol guaranteed, rest random from full set.
- Return the generated password ONCE in the createUser response.
- UI: show credentials in a "Copy credentials" modal after creation (email + generated password, one-time view with copy buttons and a warning).

### 7. Department whitelist enforcement
- Create User form: department options restricted to `HR | IT | Finance` only (already enforced in DB CHECK + handle_new_user trigger). Verify the Select options match.

### 8. AI priority badge component
- Small reusable badge with color + icon per level; pulse animation on `critical`.
- Used in: queue rows, history timeline, super admin dashboard, post-submit confirmation.

### Out of scope (untouched)
- Design system, color palette, glassmorphism
- Gemini classification model/prompt structure
- Auth flow, login page, routing tree
- Database schema, RLS policies, triggers (current schema already supports everything above)
- Notifications system (already wired)

### Technical notes
- No migrations required — `ticket_priority` enum already has all 4 levels, RLS already isolates by department, `resolved_at` trigger already exists.
- All changes are frontend + 2 server functions (`submitTicket`, `createUser`).
