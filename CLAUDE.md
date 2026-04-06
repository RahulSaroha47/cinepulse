# CinePulse — Claude Context

## Project
Movie lover's social platform. Solo project by Rahul Saroha.
**Focus: Bollywood (Hindi movies only)** — quiz, guess-the-movie, party mode, and all game data is Bollywood-only.

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
  daily-movie/
    page.tsx                  — fixed-height two-column layout: clues (left) + guesses/input (right)
  party/
    page.tsx                  — local multiplayer: setup → handoff → question → result → roundboard → endgame
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
    Movie (JPA entity)        — id, tmdbId, title, posterPath, releaseYear, overview,
                                 genre, language, director, cast, tagline
    MovieRepository
  tmdb/
    TmdbService               — seeds Bollywood movies from TMDB on startup (/discover/movie?with_original_language=hi, 8 pages ~160 movies)
                                 enrichMovies() fetches genre/language/director/cast/tagline per movie (runs once)
    TmdbMovieResult           — DTO for TMDB movie list response
    TmdbMovieDetails          — DTO for /movie/{id}?append_to_response=credits (enrichment)
    TmdbPageResponse          — DTO for TMDB paginated response
  quiz/
    QuestionType (enum)       — POSTER_BLIND, WHO_SAID_IT, DIRECTORS_CUT, RELEASE_YEAR,
                                 TAGLINE_GUESS, DIRECTOR_OF_MOVIE, ACTOR_SPOTLIGHT, FILMOGRAPHY_LINK
                                 (first 4 used in daily quiz; all 8 used in party mode)
    QuizQuestion (entity)     — type, questionText, posterPath, optionsJson, correctAnswer
    DailyQuiz (entity)        — quizDate (unique), questions (@ManyToMany), theme, themePosterPath
    QuizAttempt (entity)      — user, quizDate, answersJson, score, completedAt
    Dialogue (entity)         — text, movieTitle, character_name (for WHO_SAID_IT)
    DirectorEntry (entity)    — name, moviesJson (for DIRECTORS_CUT)
    QuizController            — GET /api/quiz/today, POST /api/quiz/submit
    QuizService               — lazy daily quiz generation, scoring, streak updates
    dto/                      — QuizQuestionDto, TodayQuizResponse, AnswerSubmission,
                                 QuizSubmitRequest, QuizResultResponse
  wordle/
    DailyWordle (entity)      — wordleDate (unique), movie (ManyToOne)
    WordleAttempt (entity)    — user, wordleDate, guessesJson, solved, completedAt
                                 unique constraint: (user_id, wordle_date)
    DailyWordleRepository
    WordleAttemptRepository
    WordleService             — lazy daily game generation (date-seeded random), clue logic, guess validation
    WordleController          — GET /api/daily-movie/today, POST /api/daily-movie/guess, GET /api/daily-movie/movies
    dto/                      — ClueDto, WordleStatusResponse, GuessRequest, GuessResponse,
                                 MovieRevealDto, MovieTitleDto
  party/
    PartyService              — generates N questions on-the-fly (no DB writes), 8 question types,
                                 per-type non-repeating shuffled pools
    PartyController           — GET /api/party/questions?count=N (authenticated)
    dto/                      — PartyQuestionDto (includes correctAnswer — local game, client-side scoring)
  exception/
    GlobalExceptionHandler    — @RestControllerAdvice, maps exceptions to HTTP responses
    EmailAlreadyExistsException    — 409 Conflict
    UsernameAlreadyExistsException — 409 Conflict
    InvalidCredentialsException    — 401 Unauthorized (different messages for no-account vs wrong-password)
  DataSeeder                  — ApplicationRunner, seeds movies + enriches + dialogues + directors on startup
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

## Wordle System

### How to Play
- One Bollywood movie per day, same for all users
- 6 guesses max — type freely or pick from autocomplete dropdown
- Each wrong guess unlocks the next clue

### Clue Unlock Sequence
| Shown at start | After guess 1 | After guess 2 | After guess 3 | After guess 4 | After guess 5 |
|---|---|---|---|---|---|
| Genre + Release Year | Language | Director | Cast | Tagline | First Letter |

### Input Behaviour
- Autocomplete dropdown uses **fuse.js** (fuzzy search, threshold 0.25) + exact substring match
- If user selects from dropdown → that exact DB title is submitted
- If user types freely without selecting → raw typed text submitted as-is
- `/api/daily-movie/movies` is **public** (no auth required) — permitted in SecurityConfig

### Guess the Movie Scoring / Streak
⚠️ **TODO — not yet decided.** Scoring and streak logic will be designed separately.

### Guess the Movie API
- `GET /api/daily-movie/today` → clues unlocked so far + guess history + backgroundPosterPath (always set, used for blurred bg)
- `POST /api/daily-movie/guess` → `{ guess: string }` → correct/wrong + nextClue if unlocked + movie reveal on game over
- `GET /api/daily-movie/movies` → all movie titles for autocomplete (public, no auth)

### Daily Game Generation (lazy)
Generated on first `GET /api/daily-movie/today` of the day. Date used as random seed — deterministic, same movie for all users/servers. Picks only from movies with all enrichment fields populated.

### Replay Prevention
`wordle_attempts` has unique constraint on `(user_id, wordle_date)`.

### Dev: Reset today's game
```sql
DELETE FROM wordle_attempts;
DELETE FROM daily_wordles;
```

### Dev: Reset everything (full re-seed)
```sql
DELETE FROM wordle_attempts;
DELETE FROM daily_wordles;
DELETE FROM quiz_attempts;
DELETE FROM daily_quiz_questions;
DELETE FROM daily_quizzes;
DELETE FROM quiz_questions;
DELETE FROM dialogues;
DELETE FROM director_entries;
DELETE FROM movies;
```

## Poster Jigsaw Puzzle System

### Concept
A scrambled movie poster puzzle — tiles are shuffled and the user drags them back into correct positions within a time limit. One Bollywood movie per day, same for all users.

### How to Play
- Poster is divided into a grid of tiles (e.g. 3×3 or 4×4)
- Tiles are randomly shuffled at game start
- User drags and drops tiles into the correct positions
- Timer counts down — faster solve = more points
- Game ends when all tiles are correctly placed or time runs out

### Scoring (TBD)
- Base: time remaining × multiplier
- Difficulty tiers: 3×3 easy, 4×4 hard

### API (planned)
- `GET /api/jigsaw/today` → movie posterPath + tile order for today
- `POST /api/jigsaw/submit` → time taken → score

### Notes
- Tile scrambling must be deterministic (date-seeded) so all users get the same shuffle
- No backend needed for tile movement — all drag/drop is client-side
- Only submit final solve time to backend

## Database Tables
| Table | Written by |
|---|---|
| users | POST /api/auth/signup; updated by POST /api/quiz/submit |
| movies | DataSeeder on startup (TMDB API — Bollywood only) |
| dialogues | DataSeeder on startup (Bollywood hardcoded) |
| director_entries | DataSeeder on startup (Bollywood hardcoded) |
| quiz_questions | QuizService on first GET /quiz/today of the day |
| daily_quizzes | QuizService on first GET /quiz/today of the day |
| daily_quiz_questions | Hibernate join table for DailyQuiz ↔ QuizQuestion |
| quiz_attempts | POST /api/quiz/submit |
| daily_wordles | WordleService on first GET /daily-movie/today of the day |
| wordle_attempts | POST /api/daily-movie/guess |

## TMDB Integration
- API key stored in `application.yml` as `${TMDB_API_KEY:583e5a836c79f2603f42122b3a8e2a61}` (env var with dev fallback)
- Base URL: `https://api.themoviedb.org/3`
- Poster CDN: `https://image.tmdb.org/t/p/w500{posterPath}`
- Seeder fetches: **Bollywood only** — `/discover/movie?with_original_language=hi`, 8 pages (~160 movies)
- Enrichment: `/movie/{tmdbId}?append_to_response=credits` — fetches genre, language, tagline, director, cast
- Enrichment runs once on startup (skipped if all movies already have genre populated)
- To expand movie data later: increase pages in `TmdbService.seedMovies()` (max ~75 pages for all Hindi films)

## Feature Roadmap
1. **Daily Quiz** — ✅ done
2. **Guess the Movie** — ✅ done (scoring/streak TBD); frontend route `/daily-movie`, API `/api/daily-movie/**`
3. **Party Mode** — ✅ done; 2–6 players, 8 question types, turn-based, scoring = timeLeft × 3
4. **Poster Jigsaw Puzzle** — scrambled movie poster tiles, reassemble in limited time; standalone game
5. **AI Movie Recommender** — Claude API
6. **Reviews + AI Summary** — Claude API
7. **Leaderboard** — Redis sorted sets
8. **Watchlist + Follow/Feed**
9. **Movie Pages** — TMDB API

## Build Status
- [x] JWT auth — signup/login backend complete
- [x] Custom exceptions + GlobalExceptionHandler
- [x] Docker — MySQL (3307) + Redis (6379) running
- [x] Frontend auth pages — `/login` + `/signup`, split-screen, real TMDB posters, field-level errors
- [x] Dashboard — navbar, stats bar, featured hero, games scroll, watchlist, leaderboard
- [x] TMDB integration — Bollywood movie seeder (~160 movies) + enrichment (genre, director, cast, tagline)
- [x] Daily Quiz — all 4 question types, scoring, streak tracking, result breakdown
- [x] Dashboard stats — wired from real DB (`/api/users/me/stats`)
- [x] Guess the Movie — progressive clue reveal, 6 guesses, blurred bg, game over reveal (route: /daily-movie)
- [x] Party Mode — 2–6 players, 8 question types, 3/5/7 rounds, turn-based, timeLeft × 3 scoring
- [ ] Guess the Movie scoring + streak — **TODO, to be decided**
- [ ] Poster Jigsaw Puzzle — **next up**
- [ ] Leaderboard — Redis sorted sets
