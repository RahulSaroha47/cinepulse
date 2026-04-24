# CinePulse — Database Schema

Database: PostgreSQL 16
ORM: Hibernate / Spring Data JPA (`ddl-auto: update`)

---

## Table Overview

| Table | Purpose | Written by |
|---|---|---|
| `users` | Registered accounts, streaks, scores | Signup; updated on game completion |
| `movies` | Bollywood film catalog from TMDB | DataSeeder on startup + admin endpoint |
| `dialogues` | Bollywood quotes for WHO_SAID_IT questions | DataSeeder on startup (hardcoded) |
| `director_entries` | Director filmographies for DIRECTORS_CUT questions | DataSeeder on startup (hardcoded) |
| `quiz_questions` | Generated quiz questions | QuizService on first GET /quiz/today |
| `daily_quizzes` | One quiz per day linking 5 questions | QuizService on first GET /quiz/today |
| `daily_quiz_questions` | Join table: daily_quiz ↔ quiz_question | Hibernate (auto) |
| `quiz_attempts` | User quiz submissions | POST /api/quiz/submit |
| `daily_wordles` | One movie per day for Guess the Movie | WordleService on first GET /daily-movie/today |
| `wordle_attempts` | User guesses for Guess the Movie | POST /api/daily-movie/guess |
| `daily_jigsaws` | One puzzle per day for Jigsaw | JigsawService on first GET /api/jigsaw/today |
| `jigsaw_attempts` | User jigsaw completions | POST /api/jigsaw/submit |
| `reviews` | User-written movie reviews | POST /api/movies/{id}/reviews |

Redis sorted sets (not in Postgres):
- `lb:quiz:{date}` — daily quiz scores (TTL 2 days)
- `lb:wordle:{date}` — daily wordle scores (TTL 2 days)
- `lb:jigsaw:{date}` — daily jigsaw scores (TTL 2 days)
- `lb:overall` — all-time cumulative scores

---

## Tables

### `users`
Stores all registered users. Streaks and scores are updated in-place after each game.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `username` | VARCHAR | Unique, not null |
| `email` | VARCHAR | Unique, not null |
| `password_hash` | VARCHAR | BCrypt hashed |
| `total_score` | INT | Cumulative across all games, default 0 |
| `streak` | INT | Quiz streak (days), default 0 |
| `last_quiz_date` | DATE | Last date quiz was completed |
| `wordle_streak` | INT | Guess the Movie streak, default 0 |
| `wordle_last_played` | DATE | Last date wordle was completed |
| `jigsaw_streak` | INT | Jigsaw streak, default 0 |
| `jigsaw_last_played` | DATE | Last date jigsaw was completed |
| `overall_streak` | INT | Any-game daily streak, default 0 |
| `overall_last_played` | DATE | Last date any game was played |

**Used by:** every authenticated endpoint; dashboard stats (`/api/users/me/stats`)

---

### `movies`
The Bollywood film catalog, seeded from TMDB. All game content (quiz, jigsaw, wordle) picks from this table.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `tmdb_id` | BIGINT | Unique — TMDB's movie ID, prevents duplicates on re-seed |
| `title` | VARCHAR | Not null |
| `poster_path` | VARCHAR | TMDB path e.g. `/abc.jpg` — prefix with `https://image.tmdb.org/t/p/w500` |
| `release_year` | INT | Extracted from TMDB release_date |
| `overview` | TEXT | Movie description |
| `genre` | VARCHAR | Top 2 genres joined e.g. `"Action, Drama"` |
| `language` | VARCHAR | e.g. `"Hindi"` |
| `director` | VARCHAR | From TMDB credits crew |
| `movie_cast` | VARCHAR | Top-billed actor from TMDB credits cast |
| `tagline` | TEXT | TMDB tagline |

**Used by:** every game, movie browse page, reviews, top-rated list.

> `genre`, `language`, `director`, `movie_cast`, `tagline` are null until enriched. Wordle only picks movies where all fields are populated.

---

### `dialogues`
Hardcoded Bollywood quotes used for `WHO_SAID_IT` quiz questions and party mode.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `text` | TEXT | The dialogue |
| `movie_title` | VARCHAR | Correct answer |
| `character_name` | VARCHAR | Character who said it |

**Used by:** `QuizService` (WHO_SAID_IT questions), `PartyService`

---

### `director_entries`
Hardcoded director + filmography data used for `DIRECTORS_CUT` questions.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `name` | VARCHAR | Director name |
| `movies_json` | TEXT | JSON array of their films e.g. `["Sholay","Seeta Aur Geeta"]` |

**Used by:** `QuizService` (DIRECTORS_CUT questions), `PartyService`

---

### `quiz_questions`
Reusable question objects generated daily by `QuizService`.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `type` | VARCHAR | Enum: `POSTER_BLIND`, `WHO_SAID_IT`, `DIRECTORS_CUT`, `RELEASE_YEAR` |
| `question_text` | TEXT | Displayed to user |
| `poster_path` | VARCHAR | Set for POSTER_BLIND questions |
| `options_json` | TEXT | JSON array of 4 options |
| `correct_answer` | VARCHAR | Not sent to client on GET /quiz/today |

**Used by:** `DailyQuiz` (many-to-many via `daily_quiz_questions`)

---

### `daily_quizzes`
One row per day. Ties together 5 questions for that day's quiz.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `quiz_date` | DATE | Unique — one quiz per day |
| `theme` | VARCHAR | Movie name used as today's theme |
| `theme_poster_path` | VARCHAR | Poster for the dashboard hero card |

**Used by:** `QuizService` — generated lazily on first request of the day. Race condition handled via `DataIntegrityViolationException` catch.

---

### `daily_quiz_questions` (join table)
Links `daily_quizzes` ↔ `quiz_questions`. Managed by Hibernate automatically.

| Column | Type |
|---|---|
| `daily_quiz_id` | BIGINT FK → daily_quizzes.id |
| `question_id` | BIGINT FK → quiz_questions.id |

---

### `quiz_attempts`
One row per user per day — records what the user answered and their score.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `user_id` | BIGINT FK → users.id | Not null |
| `quiz_date` | DATE | Not null |
| `answers_json` | TEXT | JSON of submitted answers |
| `score` | INT | Final score for this attempt |
| `completed_at` | TIMESTAMP | When submitted |

**Unique constraint:** `(user_id, quiz_date)` — prevents replay.

---

### `daily_wordles`
One row per day — the movie for that day's Guess the Movie game.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `wordle_date` | DATE | Unique — one per day |
| `movie_id` | BIGINT FK → movies.id | The answer movie |

**Generated lazily** on first `GET /api/daily-movie/today`. Date used as random seed — deterministic, same movie for all users.

---

### `wordle_attempts`
One row per user per day — stores all guesses and final result.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `user_id` | BIGINT FK → users.id | Not null |
| `wordle_date` | DATE | Not null |
| `guesses_json` | TEXT | JSON array of guess strings |
| `solved` | BOOLEAN | True if user guessed correctly |
| `score` | INT | 12/10/8/6/4/2 or 0 |
| `completed_at` | TIMESTAMP | When game ended |

**Unique constraint:** `(user_id, wordle_date)` — one attempt per user per day.

---

### `daily_jigsaws`
One row per day — the movie poster used for that day's jigsaw puzzle.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `jigsaw_date` | DATE | Unique — one per day |
| `movie_id` | BIGINT FK → movies.id | The movie whose poster is used |
| `tile_order_json` | TEXT | JSON array of 9 shuffled tile indices |

**Tile shuffle** is deterministic (date-seeded + offset from wordle seed) — same for all users.

---

### `jigsaw_attempts`
One row per user per day — records solve time and score.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `user_id` | BIGINT FK → users.id | Not null |
| `jigsaw_date` | DATE | Not null |
| `score` | INT | `timeLimit - timeTaken` (max 45) |
| `completed` | BOOLEAN | True if solved before time ran out |
| `completed_at` | TIMESTAMP | When submitted |

**Unique constraint:** `(user_id, jigsaw_date)` — one attempt per user per day.

---

### `reviews`
User-written movie reviews. One per user per movie.

| Column | Type | Notes |
|---|---|---|
| `id` | BIGINT PK | Auto-generated |
| `user_id` | BIGINT FK → users.id | Not null |
| `movie_id` | BIGINT FK → movies.id | Not null |
| `rating` | INT | 1–5 stars |
| `body` | TEXT | Review text |
| `created_at` | TIMESTAMP | When submitted |

**Unique constraint:** `(user_id, movie_id)` — one review per user per movie.

---

## Entity Relationships

```
users ──────────────┬──── quiz_attempts (user_id)
                    ├──── wordle_attempts (user_id)
                    ├──── jigsaw_attempts (user_id)
                    └──── reviews (user_id)

movies ─────────────┬──── daily_wordles (movie_id)
                    ├──── daily_jigsaws (movie_id)
                    └──── reviews (movie_id)

daily_quizzes ──────┴──── daily_quiz_questions ──── quiz_questions

dialogues           (standalone — used by QuizService/PartyService at query time)
director_entries    (standalone — used by QuizService/PartyService at query time)
```

---

## How a Daily Game Is Generated

All three daily games follow the same lazy-generation pattern:

1. User calls `GET /api/{game}/today`
2. Service checks if a row exists in `daily_{game}s` for today's date
3. If not → generate (pick random movie / build questions), insert row
4. Race condition (two users hit simultaneously) → caught via `DataIntegrityViolationException` → re-fetch the row inserted by the other request
5. Return game state to user

This ensures exactly one game per day, same for all users, with no cron job required.
