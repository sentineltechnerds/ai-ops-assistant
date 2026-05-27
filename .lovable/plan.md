# Enterprise Workflow Update Plan

Preserving the current design system (glassmorphism, lavender/cream palette, Gemini AI, ticket classification). Only the changes below.

## 1. Database changes (single migration)

- Extend `app_role` enum: add `department_admin` and `super_admin`. Migrate existing `admin` rows → `super_admin`. Keep `employee`.
- `profiles`: add `is_active boolean default true`.
- `tickets`: add `resolved_at timestamptz`. Restrict `department` to `HR | IT | Finance` going forward (CHECK).
- New `notifications` table: `id, user_id, title, message, is_read, created_at` + RLS (user sees own; service_role full).
- New security definer helpers:
  - `is_super_admin(uuid)` 
  - `get_user_department(uuid)` (reads `profiles.department`)
- Rewrite RLS:
  - `tickets SELECT`: owner OR super_admin OR (department_admin AND ticket.department = caller's department).
  - `tickets UPDATE`: super_admin OR (department_admin AND same department). On UPDATE to `resolved`, a trigger inserts a notification for the employee and stamps `resolved_at`.
  - `profiles SELECT/UPDATE`: super_admin can read/write all; users own row.
  - `user_roles`: super_admin manages all.
- Confirm super admin: ensure `dickson.tladi@capaciti.org.za` has role `super_admin` (update existing `admin` row).

## 2. Auth flow

- Remove `/signup` route entirely (delete file). Login page only; keep forgot password (add if missing — minimal).
- `auth-context`: expose `role` ∈ `employee | department_admin | super_admin` plus `department`.

## 3. Routing & permissions

- `_authenticated` layout: role-aware redirects.
  - employee → `/dashboard` (their personal view) with tabs: Submit, History.
  - department_admin → `/queue` (department-scoped).
  - super_admin → `/command-center`.
- Remove `Submit Ticket` and `Analytics` from Command Center nav.

## 4. Operations Command Center (super admin)

Routes under `/command-center/*`:
- **Overview**: cards (Total, HR, IT, Finance, Critical, Resolved, Escalated). Category chart shows only HR/IT/Finance. Priority queue (Critical → Low) with urgency pulse animation.
- **User Management**: list users (search, activate/deactivate), Create User dialog (name, email, department HR/IT/Finance, role employee|department_admin, temp password). Uses a server function with `supabaseAdmin` to create the user and assign role.
- **All Tickets**: cross-department ticket browser.

## 5. Department admin view

- `/queue` shows only tickets where `department = current user's department`. Actions: update status, mark resolved.

## 6. Employee experience

- `/dashboard`: personal summary + recent tickets.
- `/submit`: existing form (departments restricted to HR/IT/Finance).
- `/history`: new page — list of own tickets with animated status badges, timeline (New → In Progress → Awaiting Review/Escalated → Resolved), AI classification details.
- Notification bell in top nav: dropdown, unread count, mark-as-read. Realtime via Supabase channel on `notifications`.

## 7. Server functions

- `createUser.functions.ts` (super_admin only) — uses admin client to create auth user + profile + role.
- `setUserActive`, `updateUserRole` — super_admin only.
- `updateTicketStatus` — checks caller is super_admin or matching department_admin; trigger handles notification on resolve.

## Technical notes

- New enum values + dropping `admin` requires creating new enum, migrating columns, dropping old. Done in one migration.
- All new tables get explicit `GRANT`s for `authenticated` and `service_role`.
- Realtime: `ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications`.
- Keep existing styles.css tokens; reuse `glass`, `bg-gradient-hero`, `shadow-glow`.

## Out of scope (not changing)

- Visual design system, color palette, Gemini classification logic, existing ticket submit form, login styling.

Proceed?
