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
  components/
    GameLeaderboard.tsx       — reusable leaderboard panel (top 7 + player rank), used on all result screens
  (auth)/
    layout.tsx                — split-screen layout (left: form, right: poster grid)
    PosterGrid.tsx            — 'use client', 17 real TMDB posters in staggered grid
    login/page.tsx            — login form, field-level errors
    signup/page.tsx           — signup form, password strength bar, field-level errors
  dashboard/
    page.tsx                  — full dashboard: navbar, stats (Games/Streak/Rank/Score), hero, games scroll, leaderboard
  quiz/
    page.tsx                  — full quiz flow: intro → 5 questions → result breakdown + leaderboard
  daily-movie/
    page.tsx                  — fixed-height two-column layout: clues (left) + guesses/input (right); game-over shows leaderboard
  jigsaw/
    page.tsx                  — 3×3 drag-drop puzzle, 45s timer, result screen + leaderboard
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
    User (JPA entity)         — id, username, email, passwordHash, streak, lastQuizDate,
                                 wordleStreak, wordleLastPlayed, jigsawStreak, jigsawLastPlayed,
                                 overallStreak, overallLastPlayed, totalScore
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
    QuizController            — GET /api/quiz/today, POST /api/quiz/submit, GET /api/quiz/leaderboard
    QuizService               — lazy daily quiz generation, scoring, streak updates, Redis leaderboard
    dto/                      — QuizQuestionDto, TodayQuizResponse, AnswerSubmission,
                                 QuizSubmitRequest, QuizResultResponse
  wordle/
    DailyWordle (entity)      — wordleDate (unique), movie (ManyToOne)
    WordleAttempt (entity)    — user, wordleDate, guessesJson, solved, score, completedAt
                                 unique constraint: (user_id, wordle_date)
    DailyWordleRepository
    WordleAttemptRepository
    WordleService             — lazy daily game generation, clue logic, guess validation, scoring, streak updates
    WordleController          — GET /api/daily-movie/today, POST /api/daily-movie/guess,
                                 GET /api/daily-movie/movies, GET /api/daily-movie/leaderboard
    dto/                      — ClueDto, WordleStatusResponse, GuessRequest, GuessResponse (includes score),
                                 MovieRevealDto, MovieTitleDto
  party/
    PartyService              — generates N questions on-the-fly (no DB writes), 8 question types,
                                 per-type non-repeating shuffled pools
    PartyController           — GET /api/party/questions?count=N (authenticated)
    dto/                      — PartyQuestionDto (includes correctAnswer — local game, client-side scoring)
  leaderboard/
    LeaderboardService        — Redis sorted sets: per-game daily (lb:{game}:{date}) + overall (lb:overall)
                                 addDailyScore(), updateOverallScore(), getDailyLeaderboard(), getOverallLeaderboard()
    LeaderboardController     — GET /api/leaderboard (overall all-time top 7 + player rank)
    LeaderboardEntry          — record: rank, username, score
    LeaderboardResponse       — record: top7 (List<LeaderboardEntry>), playerRank (LeaderboardEntry)
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

## Scoring System

| Game | Formula | Max |
|---|---|---|
| Daily Quiz | 5 base/question + speed bonus (`timeLeft × 3 / 20`, max 3/question) | ~40 pts |
| Guess the Movie | 12/10/8/6/4/2 for guesses 1–6, failed = 0 | 12 pts |
| Jigsaw | timeRemaining × 1 | 45 pts |

No streak multiplier. Daily max across all games ≈ 97 pts.

## Streak System
- **Quiz streak** (`User.streak` + `User.lastQuizDate`) — increments on quiz submission
- **Wordle streak** (`User.wordleStreak` + `User.wordleLastPlayed`) — increments on game completion (solved or failed)
- **Jigsaw streak** (`User.jigsawStreak` + `User.jigsawLastPlayed`) — increments on puzzle completion
- **Overall streak** (`User.overallStreak` + `User.overallLastPlayed`) — increments when any game is completed for the first time that day. Shown on dashboard.

## Leaderboard System
- Per-game daily Redis sorted sets: `lb:quiz:{date}`, `lb:wordle:{date}`, `lb:jigsaw:{date}` (TTL 2 days)
- Overall all-time Redis sorted set: `lb:overall` (score = user's cumulative totalScore)
- Per-game leaderboard shown on result screen after playing (top 7 + player's rank highlighted)
- Overall leaderboard on dashboard — wired to `GET /api/leaderboard`; shows top 7 + player rank (highlighted inline if in top 7, below `···` separator if outside)
- `GET /api/quiz/leaderboard`, `GET /api/daily-movie/leaderboard`, `GET /api/jigsaw/leaderboard` — authenticated
- `GET /api/leaderboard` — overall, authenticated

## Quiz System

### Question Types & Scoring
| Type | Base Points | Source data |
|---|---|---|
| POSTER_BLIND | 5 | movies table (poster image) |
| WHO_SAID_IT | 5 | dialogues table |
| DIRECTORS_CUT | 5 | director_entries table |
| RELEASE_YEAR | 5 | movies table |

- Speed bonus: `Math.round(timeLeft × 3 / 20)` per correct answer (max 3 pts when timeLeft = 20)
- No streak multiplier
- Max score per quiz: ~40 pts

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
- Score: 12/10/8/6/4/2 pts for guesses 1–6; failed = 0 pts
- Wordle streak tracked on `User` entity; increments on completion (solved or failed counts)
- Score returned in `GuessResponse.score` and saved to `wordle_attempts.score`

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

### Scoring
- 3×3 grid, 45 second limit
- Score = timeRemaining × 1 (max 45 pts)
- Timer stops when all 9 tiles are in correct positions, or runs out

### API
- `GET /api/jigsaw/today` → `{ posterPath, tileOrder (9 shuffled indices), timeLimit, completed, score, movie }`
- `POST /api/jigsaw/submit` → `{ timeTaken }` → `{ score, timeTaken, timeLimit, movie }`
- `GET /api/jigsaw/leaderboard` → `{ top7, playerRank }` (authenticated)

### Notes
- Tile scrambling is deterministic (date-seeded + offset from wordle seed) — same shuffle for all users
- All drag/drop is client-side (HTML5 drag API); only final solve time submitted to backend
- `tileOrder[slotIndex]` = which tile index is at that slot in the scrambled layout
- Correct solution: `tileOrder[i] === i` for all i

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
| daily_jigsaws | JigsawService on first GET /api/jigsaw/today of the day |
| jigsaw_attempts | POST /api/jigsaw/submit |

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
2. **Guess the Movie** — ✅ done; route `/daily-movie`, API `/api/daily-movie/**`
3. **Party Mode** — ✅ done; 2–6 players, 8 question types, turn-based, scoring = timeLeft × 3
4. **Poster Jigsaw Puzzle** — ✅ done; 3×3 grid, 45s timer, score = timeRemaining × 1, route `/jigsaw`, API `/api/jigsaw/**`
5. **Scoring + Streak + Leaderboard** — ✅ done; per-game streaks, Redis leaderboards, result-screen rankings
6. **Watchlist + Follow/Feed**
7. **Movie Pages** — TMDB API
8. **Reviews** — user-written, no AI
9. ~~AI Movie Recommender~~ — skipped
10. ~~Who Said It? game~~ — removed
11. ~~AI Reviews Summary~~ — skipped

## Build Status
- [x] JWT auth — signup/login backend complete
- [x] Custom exceptions + GlobalExceptionHandler
- [x] Docker — MySQL (3307) + Redis (6379) running
- [x] Frontend auth pages — `/login` + `/signup`, split-screen, real TMDB posters, field-level errors
- [x] Dashboard — navbar, stats (Games/Streak/Rank/Score), hero, games scroll, leaderboard section
- [x] TMDB integration — Bollywood movie seeder (~160 movies) + enrichment (genre, director, cast, tagline)
- [x] Daily Quiz — all 4 question types, scoring (5 base + speed bonus), quiz streak, result breakdown
- [x] Dashboard stats — wired from real DB (`/api/users/me/stats`) — returns overallStreak, gamesPlayed, totalScore, rank
- [x] Guess the Movie — progressive clue reveal, 6 guesses, blurred bg, scoring (12→2 pts), wordle streak
- [x] Party Mode — 2–6 players, 8 question types, 3/5/7 rounds, turn-based, timeLeft × 3 scoring
- [x] Poster Jigsaw Puzzle — 3×3 drag-drop, 45s timer, date-seeded shuffle, score = timeRemaining × 1, jigsaw streak
- [x] Scoring + Streak system — per-game independent streaks + overall streak, all update totalScore
- [x] Leaderboard — Redis sorted sets; per-game daily top 7 on result screens; overall dashboard leaderboard wired to /api/leaderboard
- [ ] Watchlist + Follow/Feed
- [ ] Movie Pages
- [ ] Reviews
