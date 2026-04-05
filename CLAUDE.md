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
- **Shared button classes** in `globals.css`: `.btn-primary`, `.btn-ghost`

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
  globals.css                 — @theme tokens, base styles, .btn-primary, .btn-ghost
  (auth)/
    layout.tsx                — split-screen layout (left: form, right: poster grid)
    PosterGrid.tsx            — 'use client', 17 real TMDB posters in staggered grid
    login/page.tsx            — login form, field-level errors
    signup/page.tsx           — signup form, password strength bar, field-level errors
  dashboard/
    page.tsx                  — full dashboard: navbar, stats, featured hero, games, watchlist, leaderboard
  quiz/
    page.tsx                  — full quiz flow: intro → 5 questions → result breakdown
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
    JwtUtil                   — generate + validate JWT
    JwtFilter                 — reads Authorization header, sets User as principal in SecurityContext
    SecurityConfig            — global CORS (localhost:3000), stateless session, JWT filter chain
  user/
    User (JPA entity)         — id, username, email, passwordHash, streak, lastQuizDate, totalScore
    UserRepository
  movie/
    Movie (JPA entity)        — id, tmdbId, title, posterPath, releaseYear, overview
    MovieRepository
  tmdb/
    TmdbService               — seeds movies from TMDB API on startup (English + Hindi popular)
    TmdbMovieResult           — DTO for TMDB movie response
    TmdbPageResponse          — DTO for TMDB paginated response
  quiz/
    QuestionType (enum)       — POSTER_BLIND, WHO_SAID_IT, DIRECTORS_CUT, RELEASE_YEAR
    QuizQuestion (entity)     — type, questionText, posterPath, optionsJson, correctAnswer
    DailyQuiz (entity)        — quizDate (unique), questions (@ManyToMany), theme, themePosterPath
    QuizAttempt (entity)      — user, quizDate, answersJson, score, completedAt
    Dialogue (entity)         — text, movieTitle, character_name (for WHO_SAID_IT)
    DirectorEntry (entity)    — name, moviesJson (for DIRECTORS_CUT)
    QuizController            — GET /api/quiz/today, POST /api/quiz/submit
    QuizService               — lazy daily quiz generation, scoring, streak updates
    dto/                      — QuizQuestionDto, TodayQuizResponse, AnswerSubmission,
                                 QuizSubmitRequest, QuizResultResponse
  exception/
    GlobalExceptionHandler    — @RestControllerAdvice, maps exceptions to HTTP responses
    EmailAlreadyExistsException    — 409 Conflict
    UsernameAlreadyExistsException — 409 Conflict
    InvalidCredentialsException    — 401 Unauthorized (different messages for no-account vs wrong-password)
  DataSeeder                  — ApplicationRunner, seeds movies + dialogues + directors on startup
```

## CORS
Global config in `SecurityConfig` for all `/api/**` routes → `http://localhost:3000`.
Do NOT use `@CrossOrigin` on individual controllers.

## Auth Flow
- Signup: `POST /api/auth/signup` → `{ username, email, password }` → `{ token, username, email }`
- Login: `POST /api/auth/login` → `{ email, password }` → `{ token, username, email }`
- Frontend stores JWT: `localStorage.setItem("cp_token", token)`
- Frontend stores user: `localStorage.setItem("cp_user", JSON.stringify({ username, email }))`
- After login/signup → redirect to `/dashboard`
- Subsequent API requests: `Authorization: Bearer <token>` header
- `@AuthenticationPrincipal User user` in controllers (principal is our JPA User entity, not UserDetails)

## Error Handling Pattern
Frontend maps HTTP status → field-level errors (red border + message under the field):
- `409` + "email" → error under email field
- `409` + "username" → error under username field
- `401` + "no account" → error under email field ("No account found with this email.")
- `401` + other → error under password field ("Incorrect password.")
- `400` → validation error under relevant field
- network error → general error below form
Errors clear when user starts typing in the affected field.

## Quiz System

### Question Types & Scoring
| Type | Base Points | Source data |
|---|---|---|
| POSTER_BLIND | 150 | movies table (poster image) |
| WHO_SAID_IT | 100 | dialogues table |
| DIRECTORS_CUT | 100 | director_entries table |
| RELEASE_YEAR | 100 | movies table |

- Speed bonus: `timeLeft × 2` added to base (timer = 20s per question)
- Streak multiplier applied to total: 1–6 days=1.0×, 7–13=1.1×, 14–29=1.25×, 30+=1.5×
- Max score per quiz: 800 pts

### Daily Quiz Composition
5 questions per day, shuffled randomly:
- 2× POSTER_BLIND
- 1× WHO_SAID_IT
- 1× DIRECTORS_CUT
- 1× RELEASE_YEAR

### Quiz API
- `GET /api/quiz/today` → returns questions without `correctAnswer` field
- `POST /api/quiz/submit` → `{ answers: [{questionId, selectedAnswer, timeLeft}] }` → score breakdown

### Quiz Generation (lazy)
Generated on first `GET /api/quiz/today` of the day. Race condition handled with `DataIntegrityViolationException` catch → re-fetch. One `DailyQuiz` row per day, same quiz for all users.

### Replay Prevention
`quiz_attempts` has unique constraint on `(user_id, quizDate)`. Submit endpoint rejects if attempt already exists.

### Dev: Reset today's quiz
```sql
DELETE FROM quiz_attempts;
DELETE FROM daily_quiz_questions;
DELETE FROM daily_quizzes;
```

## Database Tables
| Table | Written by |
|---|---|
| users | POST /api/auth/signup; updated by POST /api/quiz/submit |
| movies | DataSeeder on startup (TMDB API) |
| dialogues | DataSeeder on startup (hardcoded) |
| director_entries | DataSeeder on startup (hardcoded) |
| quiz_questions | QuizService on first GET /quiz/today of the day |
| daily_quizzes | QuizService on first GET /quiz/today of the day |
| daily_quiz_questions | Hibernate join table for DailyQuiz ↔ QuizQuestion |
| quiz_attempts | POST /api/quiz/submit |

## TMDB Integration
- API key stored in `application.yml` as `${TMDB_API_KEY:583e5a836c79f2603f42122b3a8e2a61}` (env var with dev fallback)
- Base URL: `https://api.themoviedb.org/3`
- Poster CDN: `https://image.tmdb.org/t/p/w500{posterPath}`
- Seeder fetches: English popular pages 1–4, Hindi popular pages 1–2

## Feature Roadmap
1. **Daily Quiz** — ✅ done
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
- [x] Custom exceptions + GlobalExceptionHandler
- [x] Docker — MySQL (3307) + Redis (6379) running
- [x] Frontend auth pages — `/login` + `/signup`, split-screen, real TMDB posters, field-level errors
- [x] Dashboard — navbar, stats bar, featured hero, games scroll, watchlist, leaderboard (static data)
- [x] TMDB integration — movie seeder, ~120 movies on startup
- [x] Daily Quiz — all 4 question types, scoring, streak tracking, result breakdown
- [ ] **Next: Wire dashboard stats from real DB data (streak, score, rank)**
