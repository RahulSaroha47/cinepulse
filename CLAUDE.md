# CinePulse — Claude Context

## Project
Movie lover's social platform. Solo project by Rahul Saroha.

## Stack
- **Frontend:** Next.js 16.2.2 (App Router) + Tailwind CSS v4 — `/frontend`
- **Backend:** Spring Boot Java — `/backend`
- **DB:** MySQL on port 3307 (Docker)
- **Cache:** Redis on port 6379 (Docker)

## Running Services
| Service | Port | Start command |
|---|---|---|
| Next.js | 3000 | `cd frontend && npm run dev` |
| Spring Boot | 8080 | `./mvnw spring-boot:run` in `/backend` |
| MySQL | 3307 | Docker (already running) |
| Redis | 6379 | Docker (already running) |

API base URL from frontend: `http://localhost:8080`

## Design System
- **Theme:** Dark cinematic — deep midnight `#08080f` with blue-purple tint, red glow accents
- **Fonts** (Google Fonts via `next/font/google`):
  - `Anton` (400) → CSS var `--font-anton` → Tailwind `font-heading` — display headings, titles
  - `Cormorant_Garamond` (300–600, normal+italic) → `--font-cormorant` → `font-body` — body, quotes, elegant text
  - `Space_Mono` (400, 700) → `--font-space-mono` → `font-code` — labels, scores, chips, game UI
- **Colors** (defined in `globals.css` `@theme` block, use as `bg-cp-red`, `text-cp-gold` etc):
  - `--color-cp-bg: #08080f` — page background
  - `--color-cp-surface: #0f0f1a` — cards, panels
  - `--color-cp-border: #1e1e2e` — borders
  - `--color-cp-red: #e63946` — primary accent (cinema red)
  - `--color-cp-gold: #f4c430` — secondary accent (links, highlights)
  - `--color-cp-text: #f1f0fb` — primary text
  - `--color-cp-muted: #6b7280` — muted text

## Next.js 16 Conventions (breaking changes — read before writing code)
- App Router only. Pages/layouts are Server Components by default.
- Add `'use client'` for state, event handlers, browser APIs.
- Fonts: use `variable` prop → apply CSS vars via Tailwind.
- `params` in dynamic routes is a `Promise` — must `await` it.
- Tailwind v4: CSS-first config via `@theme {}` in `globals.css`, no `tailwind.config.js`.
- Use `bg-linear-to-br` not `bg-gradient-to-br`, `from-white/8` not `from-white/[0.08]`.
- `React.FormEvent` is deprecated in React 19 — use `React.FormEvent<HTMLFormElement>`.
- Full docs: `frontend/node_modules/next/dist/docs/` — check before writing unfamiliar APIs.

## Frontend File Structure
```
app/
  layout.tsx                  — root layout, fonts, global styles
  page.tsx                    — redirects to /login
  globals.css                 — @theme tokens, base styles, autofill fix
  (auth)/
    layout.tsx                — split-screen layout (left: form, right: poster grid)
    PosterGrid.tsx            — 'use client', 17 real TMDB posters in staggered grid
    login/page.tsx            — login form, field-level errors
    signup/page.tsx           — signup form, password strength bar, field-level errors
  dashboard/
    page.tsx                  — placeholder, next to build
```

## Backend Structure
```
com.cinepulse.backend/
  auth/
    AuthController            — POST /api/auth/signup, POST /api/auth/login
    AuthService               — business logic, throws custom exceptions
    AuthRequest               — { username?, email (required), password (required, min 6) }
    AuthResponse              — { token, username, email }
  security/
    JwtUtil, JwtFilter, SecurityConfig
  user/
    User (JPA entity), UserRepository
  exception/
    GlobalExceptionHandler    — @RestControllerAdvice, maps exceptions to HTTP responses
    EmailAlreadyExistsException    — 409 Conflict
    UsernameAlreadyExistsException — 409 Conflict
    InvalidCredentialsException    — 401 Unauthorized
```
CORS: backend allows `http://localhost:3000`

## Auth Flow
- Signup: `POST /api/auth/signup` → `{ username, email, password }` → `{ token, username, email }`
- Login: `POST /api/auth/login` → `{ email, password }` → `{ token, username, email }`
- Frontend stores JWT: `localStorage.setItem("cp_token", token)`
- Frontend stores user: `localStorage.setItem("cp_user", JSON.stringify({ username, email }))`
- After login/signup → redirect to `/dashboard`
- Subsequent API requests: `Authorization: Bearer <token>` header

## Error Handling Pattern
Frontend maps HTTP status → field-level errors (red border + message under the field):
- `409` + "email" → error under email field
- `409` + "username" → error under username field
- `401` → error under password field
- `400` → validation error under relevant field
- network error → general error below form
Errors clear when user starts typing in the affected field.

## TMDB Poster Paths (used in PosterGrid)
Base URL: `https://image.tmdb.org/t/p/w500`
Animal, Dark Knight, 3 Idiots, Inception, RRR, Avengers Endgame, Kabir Singh,
Interstellar, PK, Avatar, Dangal, Forrest Gump, Sanju, Dhurandhar, Chhichhore,
Munna Bhai MBBS, Swades — all verified 200 OK.

## Feature Roadmap
1. **Daily Quiz** — streaks, Redis cache
2. **CinePulse Wordle** — one movie/day
3. **Party Mode** — local multiplayer, turn-based bowling style, speed scoring
4. **AI Movie Recommender** — Claude API
5. **Reviews + AI Summary** — Claude API
6. **Leaderboard** — Redis sorted sets
7. **Watchlist + Follow/Feed**
8. **Who Said It?** — dialogue guessing game
9. **Movie Pages** — TMDB API

Movie categories: Hollywood, Bollywood, Korean, Anime, Web Series, World Cinema

## Build Status
- [x] JWT auth — signup/login backend complete
- [x] Custom exceptions — `EmailAlreadyExistsException`, `UsernameAlreadyExistsException`, `InvalidCredentialsException`
- [x] GlobalExceptionHandler — proper HTTP status codes (409, 401, 400)
- [x] Docker — MySQL (3307) + Redis (6379) running
- [x] Frontend auth pages — `/login` + `/signup`, split-screen, real TMDB posters, field-level errors
- [ ] **Next: Dashboard / home page**
