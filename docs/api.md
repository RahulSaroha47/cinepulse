# CinePulse API Reference

Base URL: `http://localhost:8080`

All authenticated endpoints require:
```
Authorization: Bearer <jwt_token>
```

---

## Auth

### POST /api/auth/signup
Register a new user.

**Public**

**Request**
```json
{ "username": "rahul", "email": "rahul@example.com", "password": "min6chars" }
```

**Response 200**
```json
{ "token": "eyJ...", "username": "rahul", "email": "rahul@example.com" }
```

**Errors**
| Status | Condition |
|---|---|
| 409 | Email already registered |
| 409 | Username already taken |
| 400 | Password shorter than 6 characters |

---

### POST /api/auth/login
Login with email and password.

**Public**

**Request**
```json
{ "email": "rahul@example.com", "password": "mypassword" }
```

**Response 200**
```json
{ "token": "eyJ...", "username": "rahul", "email": "rahul@example.com" }
```

**Errors**
| Status | Message | Meaning |
|---|---|---|
| 401 | "No account found with this email." | Email not registered |
| 401 | "Incorrect password." | Wrong password |

---

## Users

### GET /api/users/me/stats
Get the logged-in user's stats for the dashboard.

**Authenticated**

**Response 200**
```json
{
  "streak": 3,
  "quizStreak": 5,
  "totalScore": 142,
  "rank": 2,
  "gamesPlayed": 12
}
```

---

## Daily Quiz

### GET /api/quiz/today
Get today's quiz. Generates the quiz on first call of the day.

**Authenticated**

**Response 200**
```json
{
  "theme": "Sholay",
  "themePosterPath": "/abc.jpg",
  "alreadyCompleted": false,
  "previousScore": null,
  "questions": [
    {
      "id": 1,
      "type": "RELEASE_YEAR",
      "questionText": "When was \"Dilwale Dulhania Le Jayenge\" released?",
      "posterPath": null,
      "options": ["1993", "1994", "1995", "1996"]
    }
  ]
}
```

Note: `correctAnswer` is NOT returned here.

---

### POST /api/quiz/submit
Submit answers for today's quiz.

**Authenticated**

**Request**
```json
{
  "answers": [
    { "questionId": 1, "selectedAnswer": "1995", "timeLeft": 14 }
  ]
}
```

**Response 200**
```json
{
  "totalScore": 28,
  "baseScore": 25,
  "streakMultiplier": 1.0,
  "newStreak": 2,
  "breakdown": [
    {
      "questionId": 1,
      "questionText": "When was ...",
      "selectedAnswer": "1995",
      "correctAnswer": "1995",
      "correct": true,
      "pointsEarned": 7,
      "timeLeft": 14
    }
  ]
}
```

**Errors**
| Status | Condition |
|---|---|
| 409 | Already submitted today |

---

### GET /api/quiz/leaderboard
Today's quiz leaderboard — top 7 + player's rank.

**Authenticated**

**Response 200**
```json
{
  "top7": [
    { "rank": 1, "username": "rahul", "score": 38 }
  ],
  "playerRank": { "rank": 2, "username": "you", "score": 28 }
}
```

---

## Guess the Movie

### GET /api/daily-movie/today
Get today's game state — clues unlocked so far + guess history.

**Authenticated**

**Response 200**
```json
{
  "clues": [
    { "label": "Genre", "value": "Action, Drama" },
    { "label": "Release Year", "value": "1994" }
  ],
  "guesses": ["Sholay"],
  "solved": false,
  "failed": false,
  "backgroundPosterPath": "/xyz.jpg",
  "movie": null
}
```

---

### POST /api/daily-movie/guess
Submit a guess.

**Authenticated**

**Request**
```json
{ "guess": "Dilwale Dulhania Le Jayenge" }
```

**Response 200**
```json
{
  "correct": true,
  "solved": true,
  "failed": false,
  "guessCount": 3,
  "score": 8,
  "nextClue": null,
  "movie": {
    "title": "Dilwale Dulhania Le Jayenge",
    "posterPath": "/abc.jpg",
    "releaseYear": 1995,
    "director": "Aditya Chopra"
  }
}
```

**Clue unlock sequence**
| Start | After guess 1 | After guess 2 | After guess 3 | After guess 4 | After guess 5 |
|---|---|---|---|---|---|
| Genre + Release Year | Language | Director | Cast | Tagline | First Letter |

**Scoring:** 12 / 10 / 8 / 6 / 4 / 2 pts for guesses 1–6. Failed = 0.

---

### GET /api/daily-movie/movies
All movie titles for autocomplete dropdown.

**Public** (no auth required)

**Response 200**
```json
[
  { "id": 1, "title": "Sholay" },
  { "id": 2, "title": "Dilwale Dulhania Le Jayenge" }
]
```

---

### GET /api/daily-movie/leaderboard
Today's Guess the Movie leaderboard.

**Authenticated** — same shape as quiz leaderboard.

---

## Poster Jigsaw

### GET /api/jigsaw/today
Get today's jigsaw puzzle. Generates on first call of the day.

**Authenticated**

**Response 200**
```json
{
  "posterPath": "/abc.jpg",
  "tileOrder": [5, 3, 6, 1, 2, 4, 7, 8, 0],
  "timeLimit": 45,
  "completed": false,
  "score": 0,
  "movie": null
}
```

`tileOrder[slotIndex]` = which tile index is in that slot. Correct solution: `tileOrder[i] === i` for all i.

---

### POST /api/jigsaw/submit
Submit solve time.

**Authenticated**

**Request**
```json
{ "timeTaken": 22 }
```

**Response 200**
```json
{
  "score": 23,
  "timeTaken": 22,
  "timeLimit": 45,
  "movie": { "title": "Sholay", "posterPath": "/abc.jpg", "releaseYear": 1975, "director": "Ramesh Sippy" }
}
```

Score = `timeLimit - timeTaken` (max 45 pts).

**Errors**
| Status | Condition |
|---|---|
| 403 | Already submitted today |

---

### GET /api/jigsaw/leaderboard
Today's jigsaw leaderboard.

**Authenticated** — same shape as quiz leaderboard.

---

## Party Mode

### GET /api/party/questions?count=N
Generate N questions for a local multiplayer session. No DB writes — client handles all scoring.

**Authenticated**

**Query param:** `count` — number of questions (e.g. 5, 10, 15)

**Response 200**
```json
[
  {
    "type": "WHO_SAID_IT",
    "questionText": "\"Kitne aadmi the?\"",
    "posterPath": null,
    "options": ["Sholay", "Dilwale", "Kuch Kuch Hota Hai", "Lagaan"],
    "correctAnswer": "Sholay"
  }
]
```

Note: `correctAnswer` IS returned here — scoring is client-side.

**Question types:** `POSTER_BLIND`, `WHO_SAID_IT`, `DIRECTORS_CUT`, `RELEASE_YEAR`, `TAGLINE_GUESS`, `DIRECTOR_OF_MOVIE`, `ACTOR_SPOTLIGHT`, `FILMOGRAPHY_LINK`

---

## Movies & Reviews

### GET /api/movies
All movies with avg rating and review count.

**Public**

**Response 200**
```json
[
  { "id": 1, "title": "Sholay", "posterPath": "/abc.jpg", "releaseYear": 1975, "genre": "Action", "avgRating": 4.5, "reviewCount": 12 }
]
```

---

### GET /api/movies/top-rated
Top 10 movies by avg rating (min 1 review).

**Public**

**Response 200** — same shape as above but also includes `director`, `overview`.

---

### GET /api/movies/posters
All movies as `[{ id, posterPath }]` — used for auth page poster grid.

**Public**

---

### GET /api/movies/{id}
Movie detail with avg rating and `userReviewed` flag.

**Public** (auth optional — `userReviewed` is `false` if not authenticated)

**Response 200**
```json
{
  "id": 1,
  "title": "Sholay",
  "posterPath": "/abc.jpg",
  "releaseYear": 1975,
  "overview": "...",
  "genre": "Action, Adventure",
  "language": "Hindi",
  "director": "Ramesh Sippy",
  "cast": "Amitabh Bachchan",
  "tagline": "...",
  "avgRating": 4.5,
  "reviewCount": 12,
  "userReviewed": true
}
```

**Errors**
| Status | Condition |
|---|---|
| 404 | Movie not found |

---

### GET /api/movies/{id}/reviews
All reviews for a movie, newest first.

**Public**

**Response 200**
```json
[
  { "id": 1, "username": "rahul", "rating": 5, "body": "Classic!", "createdAt": "2026-04-25" }
]
```

---

### POST /api/movies/{id}/reviews
Submit a review. One per user per movie.

**Authenticated**

**Request**
```json
{ "rating": 4, "body": "Great film!" }
```

**Response 200**
```json
{ "id": 1, "username": "rahul", "rating": 4, "body": "Great film!", "createdAt": "2026-04-25" }
```

**Errors**
| Status | Condition |
|---|---|
| 400 | Rating not between 1 and 5 |
| 404 | Movie not found |
| 409 | User already reviewed this movie |

---

## Leaderboard

### GET /api/leaderboard
Overall all-time leaderboard (top 7 + player rank). Shown on dashboard.

**Authenticated**

**Response 200**
```json
{
  "top7": [
    { "rank": 1, "username": "rahul", "score": 340 }
  ],
  "playerRank": { "rank": 1, "username": "rahul", "score": 340 }
}
```

`playerRank` is `null` if the user has no score yet.

---

## Admin

### POST /api/admin/seed-movies?pages=N
Fetch N pages of Bollywood movies from TMDB and append to DB. Skips existing movies. Also triggers enrichment (genre, director, cast, tagline) for new movies.

**Header auth:** `X-Admin-Key: <secret>`

**Query param:** `pages` — 1 to 75

**Response 200**
```json
{ "message": "Done", "newMoviesAdded": 147, "pagesScanned": 20 }
```

**Errors**
| Status | Condition |
|---|---|
| 401 | Missing or wrong X-Admin-Key |
| 400 | pages < 1 or > 75 |
