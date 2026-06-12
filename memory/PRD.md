# TechnoKick 2026 — PRD

## Original Problem Statement
"Go through the document I shared and implement all those, and the design should be more fun with pictures of the World Cup. It should be unique and user-friendly and all the users should enjoy using the app."

In-house engagement platform for Technopark employees during the FIFA World Cup 2026.

## User Clarifications
- PS5 tournament is **individual (1v1)** — NOT teams. Committee draws players into groups, FIFA World Cup style (group round-robin → knockouts).
- Users login via Phone + Name (frictionless, auto-creates account). Admin via Email + Password.
- Design: Retro football-poster vibe (1970/1982 aesthetic) — see /app/design_guidelines.json.

## Architecture
- **Backend**: FastAPI (/app/backend/server.py), MongoDB (motor), PyJWT bearer auth, pandas/openpyxl for Excel export. All routes under `/api`.
- **Frontend**: React + Tailwind (custom retro theme), react-router-dom, axios (token in localStorage `tk_token`), sonner toasts.
- **Tests**: /app/backend/tests/backend_test.py (33 pytest cases, idempotent, run vs preview URL).

## Implemented (as of 2026-06-12) ✅
- Auth: phone+name user login (auto-create), admin email/password login, JWT, route guards (RequireUser/RequireAdmin).
- Home: retro hero, announcements marquee, countdowns, PS5 + Predictions module cards, tournament wall chart, group standings toggle, live-match banner, next-up ticket.
- PS5 tournament (individual): T&C page (/ps5/terms, editable rulebook), solo registration (/ps5/register) with ticket UI (payment status stamp, assigned group, edit/withdraw), group standings per group (top-2 highlight), bracket page (/bracket) with Group Stage / Knockouts tabs + draw-pot of unassigned players.
- Daily predictions (/predict): 4 question types (dropdown, radio, exact scoreline, multi-select), fixture banners, 10AM–8PM IST window (frontend disable + backend 403 enforcement), editable until close, scored results display.
- Dashboard (/dashboard): stat cards (points, predictions, group, payment), my PS5 matches, prediction history table.
- Leaderboard (/leaderboard): top-10 with podium.
- FAQ (/faq): accordion with scoring rules.
- Admin panel (/admin), 7 tabs: Overview stats · Registrations (payment toggle, manual group assign A–H, 🎲 auto-assign draw with group size, Excel export) · Matches (create with player datalist, score/status/MOTM update, delete) · Fixtures CRUD · Questions (create, declare result → auto-scores all submissions) · Announcements CRUD (feeds marquee) · Settings (T&C rulebook editor).
- Seeded: admin, 8 demo players in Groups A/B, 7 PS5 matches, 3 WC fixtures, 4 daily questions, 3 announcements. Migration auto-wipes legacy team-based data + refreshes stale T&C.

## Scoring Rules
- Outcome questions: 10 pts · Exact scoreline: +15 bonus · Multi-select scorers: 5 pts each · Yes/No: 5 pts.

## Testing Status
- Iteration 1 (2026-06-12): backend 33/33, frontend 18/18 flows PASS. Minor issues found (stale T&C, window not enforced, optional payload, option hydration warning) — all fixed and re-verified.

## Update 2026-06-12 (round 2) ✅
- Admin login "401" investigated: API verified working with admin@technokick.com/admin123 — added clear hint + better error on /admin/login (full email required).
- 🎲 Run the Draw now ALSO auto-generates the full round-robin group schedule (wipes old group-stage matches, schedules from next day 7PM IST, 45-min slots, alternating Stations 1/2). Verified via curl: 8 players → 2 groups → 12 matches. Regression 33/33 pass.
- MAVS Innovation branding: logo (/public/mavs-logo.png) + "Presented by MAVS Innovation" in footer, "BY MAVS INNOVATION" in header tagline, committee note on admin login.
- Games Help Desk hr@mav-s.com added: footer mailto, FAQ entry, PS5 payment instructions, T&C rule #10 (DB refreshed).
- Hero: spinning ball removed → World Cup trophy polaroid ("THE CUP · 2026" + WIN IT stamp).

## Update 2026-06-12 (round 3) — Web Push Notifications ✅
- Standard Web Push (VAPID, no third-party accounts): pywebpush backend, self-generated VAPID keys in backend/.env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT=mailto:hr@mav-s.com).
- Endpoints: GET /api/push/vapid-public-key, POST /api/push/subscribe (upsert by endpoint in db.push_subscriptions), POST /api/push/unsubscribe.
- Publishing an announcement (POST /api/admin/announcements) broadcasts a push to ALL subscribers via BackgroundTasks; dead subscriptions (404/410) auto-pruned. Verified via curl: broadcast fired, fake sub pruned.
- Frontend: /public/sw.js service worker (push + notificationclick→open app), src/lib/push.js (subscribe flow), PushPrompt banner ("🔔 Never miss a kickoff! / Turn On Alerts / Not now" with localStorage dismiss) on Home + Dashboard. Hidden when permission denied or already subscribed.
- Note: real push delivery can't run in headless browsers; verified banner UI, dismiss persistence, sw serving, and full backend pipeline. Regression 33/33 pass.

## Backlog
- P1: Profile avatars / customization for users.
- P2: Tie-breaker logic for prediction leaderboard ties.
- P2: Refactor server.py monolith into routers/ + models.py (noted by code review; ~880 lines).

## Credentials
See /app/memory/test_credentials.md (admin@technokick.com / admin123; users via any phone+name).
