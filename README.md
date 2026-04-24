# CinePulse

A Bollywood movie lover's social platform — daily quiz, guess the movie, poster jigsaw, party mode, and movie reviews.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 |
| Backend | Spring Boot 3.5 (Java 17) |
| Database | PostgreSQL 16 |
| Cache / Leaderboard | Redis 7 |
| Movie Data | TMDB API |

---

## Prerequisites

- Java 17+
- Node.js 18+
- Docker (for PostgreSQL + Redis)
- Maven (included via `./mvnw` wrapper)

---

## Local Setup

### 1. Clone the repo

```bash
git clone https://github.com/RahulSaroha47/cinepulse.git
cd cinepulse
```

### 2. Start PostgreSQL and Redis via Docker

```bash
# PostgreSQL on port 5432
docker run -d \
  --name cinepulse-postgres \
  -e POSTGRES_DB=cinepulse \
  -e POSTGRES_USER=cinepulse \
  -e POSTGRES_PASSWORD=cinepulse \
  -p 5432:5432 \
  postgres:16

# Redis on port 6380
docker run -d \
  --name cinepulse-redis \
  -p 6380:6379 \
  redis:7
```

### 3. Configure backend secrets

Create `backend/src/main/resources/application-local.yml` (gitignored — never commit this):

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/cinepulse
    username: cinepulse
    password: cinepulse

jwt:
  secret: your-secret-key-must-be-at-least-32-characters-long

tmdb:
  api-key: your_tmdb_api_key

admin:
  secret-key: your-admin-secret
```

> Get a free TMDB API key at https://www.themoviedb.org/settings/api

### 4. Start the backend

```bash
cd backend
./mvnw spring-boot:run
```

On first startup, the backend automatically:
- Creates all database tables (Hibernate DDL)
- Seeds Bollywood movie data from TMDB (~130 movies)
- Seeds dialogues and director entries for quiz questions

Backend runs on **http://localhost:8080**

### 5. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on **http://localhost:3000**

### 6. Seed more movies (optional)

Once the backend is running, call the admin endpoint to add more movies without restarting:

```bash
curl -X POST "http://localhost:8080/api/admin/seed-movies?pages=20" \
  -H "X-Admin-Key: your-admin-secret"
```

Each page adds ~20 Bollywood movies. Max 75 pages (~1500 movies total).

---

## API Documentation

Interactive Swagger UI — test every endpoint live in the browser:

```
http://localhost:8080/swagger-ui.html
```

Click **Authorize** → paste your JWT token → all authenticated endpoints are unlocked.

Full API reference: [`docs/api.md`](docs/api.md)

---

## Project Structure

```
cinepulse/
├── frontend/                  # Next.js app
│   └── app/
│       ├── (auth)/            # Login + Signup pages
│       ├── dashboard/         # Main dashboard
│       ├── quiz/              # Daily Quiz game
│       ├── daily-movie/       # Guess the Movie game
│       ├── jigsaw/            # Poster Jigsaw game
│       ├── party/             # Party Mode (local multiplayer)
│       └── movies/            # Browse + Movie detail + Reviews
│
└── backend/                   # Spring Boot app
    └── src/main/java/com/cinepulse/backend/
        ├── auth/              # Signup + Login
        ├── user/              # User stats
        ├── movie/             # Movie catalog + reviews
        ├── quiz/              # Daily Quiz
        ├── wordle/            # Guess the Movie
        ├── jigsaw/            # Poster Jigsaw
        ├── party/             # Party Mode
        ├── leaderboard/       # Redis leaderboards
        ├── admin/             # Admin endpoints
        ├── config/            # OpenAPI / Swagger config
        ├── security/          # JWT filter + Spring Security
        └── tmdb/              # TMDB API integration
```

---

## Environment Variables

In production, set these instead of `application-local.yml`:

| Variable | Description |
|---|---|
| `DB_URL` | PostgreSQL JDBC URL e.g. `jdbc:postgresql://host:5432/cinepulse` |
| `DB_USERNAME` | Database username |
| `DB_PASSWORD` | Database password |
| `JWT_SECRET` | JWT signing key (min 32 characters) |
| `TMDB_API_KEY` | TMDB API key |
| `ADMIN_SECRET_KEY` | Secret for `/api/admin/seed-movies` |

---

## Scoring System

| Game | Formula | Max Points |
|---|---|---|
| Daily Quiz | 5 base + speed bonus per question | ~40 pts |
| Guess the Movie | 12 / 10 / 8 / 6 / 4 / 2 for guesses 1–6 | 12 pts |
| Poster Jigsaw | `timeLimit - timeTaken` | 45 pts |
| Party Mode | `timeLeft × 3` per question (client-side) | — |

---

## Database Schema

Full schema with all tables and relationships: [`docs/schema.md`](docs/schema.md)

---

## Dev Tips

**Reset today's quiz:**
```sql
DELETE FROM quiz_attempts;
DELETE FROM daily_quiz_questions;
DELETE FROM daily_quizzes;
```

**Reset today's Guess the Movie:**
```sql
DELETE FROM wordle_attempts;
DELETE FROM daily_wordles;
```

**Reset today's Jigsaw:**
```sql
DELETE FROM jigsaw_attempts;
DELETE FROM daily_jigsaws;
```

**Full DB reset** (everything re-seeds on next startup):
```sql
DELETE FROM reviews;
DELETE FROM jigsaw_attempts; DELETE FROM daily_jigsaws;
DELETE FROM wordle_attempts; DELETE FROM daily_wordles;
DELETE FROM quiz_attempts; DELETE FROM daily_quiz_questions;
DELETE FROM daily_quizzes; DELETE FROM quiz_questions;
DELETE FROM dialogues; DELETE FROM director_entries;
DELETE FROM movies;
```
