'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL!;
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TIMER_SECONDS = 15;
const MAX_PLAYERS = 6;
const ROUND_OPTIONS = [3, 5, 7] as const;

type QuestionType = 'POSTER_BLIND' | 'WHO_SAID_IT' | 'DIRECTORS_CUT' | 'RELEASE_YEAR'
                 | 'TAGLINE_GUESS' | 'DIRECTOR_OF_MOVIE' | 'ACTOR_SPOTLIGHT' | 'FILMOGRAPHY_LINK';
type Screen = 'setup' | 'loading' | 'handoff' | 'question' | 'result' | 'roundboard' | 'endgame';

interface PartyQuestion {
  index: number;
  type: QuestionType;
  questionText: string;
  posterPath: string | null;
  options: string[];
  correctAnswer: string;
}

interface PlayerScore {
  name: string;
  scores: number[];   // one entry per question answered
  total: number;
}

export default function PartyPage() {
  const router = useRouter();

  // ── Setup state ────────────────────────────────────────────────────────────
  const [playerNames, setPlayerNames] = useState<string[]>(['', '']);
  const [rounds, setRounds] = useState<number>(5);

  // ── Game state ─────────────────────────────────────────────────────────────
  const [screen, setScreen] = useState<Screen>('setup');
  const [questions, setQuestions] = useState<PartyQuestion[]>([]);
  const [players, setPlayers] = useState<PlayerScore[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0); // global index into questions[]
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(10);

  // ── Per-turn state ─────────────────────────────────────────────────────────
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [earnedPoints, setEarnedPoints] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerValueRef = useRef(TIMER_SECONDS);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function authHeaders() {
    const token = localStorage.getItem('cp_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  function clearTimer() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  const handleTimeout = useCallback(() => {
    clearTimer();
    setAnswered(true);
    setTimedOut(true);
    setEarnedPoints(0);
    // Add 0 to current player's score
    setPlayers(prev => {
      const next = [...prev];
      next[currentPlayerIndex] = {
        ...next[currentPlayerIndex],
        scores: [...next[currentPlayerIndex].scores, 0],
      };
      return next;
    });
    setScreen('result');
  }, [currentPlayerIndex]);

  function startTimer() {
    clearTimer();
    timerValueRef.current = TIMER_SECONDS;
    setTimeLeft(TIMER_SECONDS);
    timerRef.current = setInterval(() => {
      timerValueRef.current -= 1;
      setTimeLeft(timerValueRef.current);
      if (timerValueRef.current <= 0) {
        handleTimeout();
      }
    }, 1000);
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) router.push('/login');
  }, [router]);

  // ── Cleanup timer on unmount ───────────────────────────────────────────────
  useEffect(() => () => clearTimer(), []);

  // ── Setup handlers ─────────────────────────────────────────────────────────
  function addPlayer() {
    if (playerNames.length < MAX_PLAYERS) setPlayerNames(p => [...p, '']);
  }

  function removePlayer(i: number) {
    if (playerNames.length <= 2) return;
    setPlayerNames(p => p.filter((_, idx) => idx !== i));
  }

  function updateName(i: number, val: string) {
    setPlayerNames(p => { const n = [...p]; n[i] = val; return n; });
  }

  async function startGame() {
    const names = playerNames.map(n => n.trim());
    if (names.some(n => !n) || names.length < 2) return;

    setScreen('loading');
    const count = names.length * rounds;

    try {
      const res = await fetch(`${API}/api/party/questions?count=${count}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to fetch questions');
      const data: PartyQuestion[] = await res.json();

      const initialPlayers: PlayerScore[] = names.map(name => ({ name, scores: [], total: 0 }));
      setPlayers(initialPlayers);
      setQuestions(data);
      setQuestionIndex(0);
      setCurrentPlayerIndex(0);
      setCurrentRound(1);
      setTotalRounds(rounds);
      setScreen('handoff');
    } catch {
      setScreen('setup');
      alert('Failed to load questions. Make sure you are logged in and the backend is running.');
    }
  }

  // ── Turn flow ──────────────────────────────────────────────────────────────
  function beginTurn() {
    setSelectedAnswer(null);
    setAnswered(false);
    setTimedOut(false);
    setEarnedPoints(0);
    setScreen('question');
    startTimer();
  }

  function handleAnswer(option: string) {
    if (answered) return;
    clearTimer();

    const q = questions[questionIndex];
    const correct = option === q.correctAnswer;
    const tl = timerValueRef.current;
    const points = correct ? tl * 3 : 0;

    setSelectedAnswer(option);
    setAnswered(true);
    setEarnedPoints(points);
    setTimedOut(false);

    setPlayers(prev => {
      const next = [...prev];
      next[currentPlayerIndex] = {
        ...next[currentPlayerIndex],
        scores: [...next[currentPlayerIndex].scores, points],
        total: next[currentPlayerIndex].total + points,
      };
      return next;
    });

    setScreen('result');
  }

  function advanceTurn() {
    const nextQIndex = questionIndex + 1;
    const nextPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const isEndOfRound = nextPlayerIndex === 0;
    const isEndOfGame = nextQIndex >= questions.length;

    if (isEndOfGame) {
      setScreen('endgame');
      return;
    }

    setQuestionIndex(nextQIndex);
    setCurrentPlayerIndex(nextPlayerIndex);

    if (isEndOfRound) {
      const nextRound = currentRound + 1;
      setCurrentRound(nextRound);
      setScreen('roundboard');
    } else {
      setScreen('handoff');
    }
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const currentQuestion = questions[questionIndex] ?? null;
  const currentPlayer = players[currentPlayerIndex] ?? null;
  const nextPlayer = players[(currentPlayerIndex + 1) % players.length] ?? null;
  const sortedPlayers = [...players].sort((a, b) => b.total - a.total);
  const timerPct = (timeLeft / TIMER_SECONDS) * 100;

  // ── RENDER ─────────────────────────────────────────────────────────────────

  // SETUP
  if (screen === 'setup') {
    return (
      <div className="min-h-screen bg-cp-bg flex flex-col text-cp-text">
        <nav
          className="flex items-center gap-4 px-10 border-b border-white/8"
          style={{ height: 60, background: 'rgba(8,8,15,0.8)', backdropFilter: 'blur(20px)' }}
        >
          <button
            onClick={() => router.push('/dashboard')}
            className="font-code text-[13px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
          >
            ← Back
          </button>
          <div className="font-heading text-[1.3rem] tracking-[.1em]">
            CINE<span className="text-cp-red">PARTY</span>
          </div>
        </nav>

        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">
            <h1 className="font-heading text-[2.8rem] leading-none tracking-[.04em] mb-2">
              Party Mode
            </h1>
            <p className="font-body text-cp-muted mb-10">
              Take turns — each player gets a unique Bollywood question. Fastest answers win.
            </p>

            {/* Players */}
            <div className="mb-8">
              <div className="font-code text-[14px] tracking-[.18em] uppercase text-cp-muted mb-3">
                Players ({playerNames.length} / {MAX_PLAYERS})
              </div>
              <div className="space-y-2">
                {playerNames.map((name, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div
                      className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-heading text-[.75rem]"
                      style={{ background: playerColor(i, 0.2), border: `1px solid ${playerColor(i, 0.5)}`, color: playerColor(i, 1) }}
                    >
                      {i + 1}
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={e => updateName(i, e.target.value)}
                      placeholder={`Player ${i + 1}`}
                      maxLength={20}
                      className="flex-1 rounded-[8px] px-4 py-[10px] font-body text-[.9rem] text-cp-text placeholder:text-cp-muted outline-none transition-all"
                      style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}
                      onFocus={e => (e.currentTarget.style.border = '1px solid rgba(230,57,70,.5)')}
                      onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,.1)')}
                    />
                    {playerNames.length > 2 && (
                      <button
                        onClick={() => removePlayer(i)}
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-code text-[13px] text-cp-muted hover:text-cp-red transition-colors"
                        style={{ background: 'rgba(255,255,255,.05)' }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {playerNames.length < MAX_PLAYERS && (
                <button
                  onClick={addPlayer}
                  className="mt-3 font-code text-[13px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
                >
                  + Add player
                </button>
              )}
            </div>

            {/* Rounds */}
            <div className="mb-10">
              <div className="font-code text-[14px] tracking-[.18em] uppercase text-cp-muted mb-3">
                Rounds
              </div>
              <div className="flex gap-3">
                {ROUND_OPTIONS.map(r => (
                  <button
                    key={r}
                    onClick={() => setRounds(r)}
                    className="flex-1 py-3 rounded-[8px] font-code text-[14px] tracking-[.08em] transition-all"
                    style={{
                      background: rounds === r ? 'rgba(230,57,70,.15)' : 'rgba(255,255,255,.05)',
                      border: rounds === r ? '1px solid rgba(230,57,70,.5)' : '1px solid rgba(255,255,255,.1)',
                      color: rounds === r ? '#e63946' : '#6b7280',
                    }}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="font-code text-[14px] text-cp-muted mt-2">
                {playerNames.filter(Boolean).length} players × {rounds} rounds = {playerNames.filter(Boolean).length * rounds} questions total
              </p>
            </div>

            <button
              onClick={startGame}
              disabled={playerNames.some(n => !n.trim()) || playerNames.length < 2}
              className="w-full py-4 rounded-[10px] font-code text-[14px] tracking-[.15em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff', boxShadow: '0 4px 24px rgba(230,57,70,.35)' }}
            >
              Start Game →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // LOADING
  if (screen === 'loading') {
    return (
      <div className="h-screen bg-cp-bg flex items-center justify-center">
        <div className="font-code text-[13px] tracking-[.15em] uppercase text-cp-muted animate-pulse">
          Loading questions...
        </div>
      </div>
    );
  }

  // HANDOFF — cover screen before player sees their question
  if (screen === 'handoff' && currentPlayer) {
    return (
      <div className="h-screen bg-cp-bg flex flex-col items-center justify-center text-cp-text px-6">
        <div className="font-code text-[14px] tracking-[.2em] uppercase text-cp-muted mb-4">
          Round {currentRound} / {totalRounds}
        </div>

        <div
          className="w-24 h-24 rounded-full flex items-center justify-center font-heading text-[2.5rem] mb-6"
          style={{
            background: playerColor(currentPlayerIndex, 0.15),
            border: `2px solid ${playerColor(currentPlayerIndex, 0.6)}`,
            color: playerColor(currentPlayerIndex, 1),
          }}
        >
          {currentPlayerIndex + 1}
        </div>

        <h2 className="font-heading text-[2.4rem] tracking-[.03em] mb-2">
          {currentPlayer.name}
        </h2>
        <p className="font-body text-cp-muted mb-10">It's your turn!</p>

        <div className="font-code text-[14px] tracking-[.12em] uppercase text-cp-muted mb-3">
          Current scores
        </div>
        <div className="flex gap-3 mb-10">
          {players.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-center gap-1 px-4 py-3 rounded-[8px]"
              style={{
                background: i === currentPlayerIndex ? playerColor(i, 0.12) : 'rgba(255,255,255,.04)',
                border: i === currentPlayerIndex ? `1px solid ${playerColor(i, 0.4)}` : '1px solid rgba(255,255,255,.08)',
              }}
            >
              <span className="font-code text-[14px] text-cp-muted truncate max-w-[70px]">{p.name}</span>
              <span
                className="font-heading text-[1.1rem]"
                style={{ color: i === currentPlayerIndex ? playerColor(i, 1) : '#f1f0fb' }}
              >
                {p.total}
              </span>
            </div>
          ))}
        </div>

        <button
          onClick={beginTurn}
          className="px-10 py-4 rounded-[10px] font-code text-[14px] tracking-[.15em] uppercase transition-all"
          style={{ background: playerColor(currentPlayerIndex, 0.9), color: '#fff', boxShadow: `0 4px 24px ${playerColor(currentPlayerIndex, 0.4)}` }}
        >
          I'm Ready →
        </button>
      </div>
    );
  }

  // QUESTION
  if (screen === 'question' && currentQuestion && currentPlayer) {
    const isPoster = currentQuestion.type === 'POSTER_BLIND';
    const hasImage = !!currentQuestion.posterPath;

    return (
      <div className="h-screen bg-cp-bg flex flex-col text-cp-text relative overflow-hidden">

        {/* Blurred bg for poster questions */}
        {hasImage && (
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              backgroundImage: `url('${TMDB_IMG}${currentQuestion.posterPath}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: isPoster ? 'blur(80px) brightness(0.12) saturate(2)' : 'blur(55px) brightness(0.15) saturate(2)',
              transform: 'scale(1.15)',
            }}
          />
        )}
        <div className="absolute inset-0 z-0" style={{ background: 'rgba(8,8,15,0.55)' }} />

        {/* HEADER */}
        <div
          className="shrink-0 flex items-center justify-between px-8 z-10 relative border-b border-white/8"
          style={{ height: 56, background: 'rgba(8,8,15,0.7)', backdropFilter: 'blur(20px)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center font-heading text-[.7rem] shrink-0"
              style={{ background: playerColor(currentPlayerIndex, 0.25), border: `1px solid ${playerColor(currentPlayerIndex, 0.6)}`, color: playerColor(currentPlayerIndex, 1) }}
            >
              {currentPlayerIndex + 1}
            </div>
            <span className="font-code text-[13px] tracking-[.06em]">{currentPlayer.name}</span>
          </div>
          <div className="font-code text-[14px] tracking-[.12em] uppercase text-cp-muted">
            Round {currentRound} / {totalRounds}
          </div>
          <div className="flex items-center gap-2">
            <div
              className="font-heading text-[1.4rem] tabular-nums"
              style={{ color: timeLeft <= 5 ? '#e63946' : '#f4c430' }}
            >
              {timeLeft}
            </div>
            <span className="font-code text-[14px] text-cp-muted">s</span>
          </div>
        </div>

        {/* Timer bar */}
        <div className="shrink-0 h-[3px] z-10 relative" style={{ background: 'rgba(255,255,255,.08)' }}>
          <div
            className="h-full transition-all"
            style={{
              width: `${timerPct}%`,
              background: timeLeft <= 5 ? '#e63946' : '#f4c430',
              boxShadow: timeLeft <= 5 ? '0 0 8px rgba(230,57,70,.8)' : '0 0 8px rgba(244,196,48,.6)',
            }}
          />
        </div>

        {/* CONTENT */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 z-10 relative py-6">

          {/* Poster (blurred for POSTER_BLIND) */}
          {isPoster && currentQuestion.posterPath && (
            <div className="mb-6 relative">
              <img
                src={`${TMDB_IMG}${currentQuestion.posterPath}`}
                alt="Movie poster"
                className="rounded-[10px] object-cover"
                style={{
                  width: 120,
                  height: 180,
                  filter: 'blur(5px) brightness(0.85)',
                  boxShadow: '0 8px 32px rgba(0,0,0,.8)',
                }}
              />
              <div
                className="absolute inset-0 rounded-[10px] flex items-center justify-center font-code text-[14px] tracking-[.15em] uppercase text-white/40"
              >
                Identify this film
              </div>
            </div>
          )}

          {/* Question */}
          <div className="max-w-lg w-full text-center mb-8">
            <div
              className="font-code text-[14px] tracking-[.15em] uppercase mb-3 px-3 py-1 rounded-full inline-block"
              style={{ background: 'rgba(230,57,70,.1)', color: '#e63946', border: '1px solid rgba(230,57,70,.25)' }}
            >
              {questionTypeLabel(currentQuestion.type)}
            </div>
            <p className="font-body text-[1.1rem] leading-snug text-cp-text">
              {currentQuestion.questionText}
            </p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
            {currentQuestion.options.map((opt, i) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                disabled={answered}
                className="py-4 px-5 rounded-[10px] font-body text-[.92rem] text-left transition-all disabled:cursor-not-allowed"
                style={{
                  background: 'rgba(255,255,255,.07)',
                  border: '1px solid rgba(255,255,255,.12)',
                  backdropFilter: 'blur(12px)',
                  color: '#f1f0fb',
                }}
                onMouseEnter={e => { if (!answered) e.currentTarget.style.background = 'rgba(255,255,255,.13)'; }}
                onMouseLeave={e => { if (!answered) e.currentTarget.style.background = 'rgba(255,255,255,.07)'; }}
              >
                <span
                  className="font-code text-[14px] mr-2 px-[6px] py-[2px] rounded-[3px]"
                  style={{ background: 'rgba(255,255,255,.1)', color: '#6b7280' }}
                >
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // RESULT
  if (screen === 'result' && currentQuestion && currentPlayer) {
    const correct = !timedOut && selectedAnswer === currentQuestion.correctAnswer;

    return (
      <div className="h-screen bg-cp-bg flex flex-col items-center justify-center text-cp-text px-6">

        {/* Result badge */}
        <div
          className="font-code text-[13px] tracking-[.2em] uppercase px-5 py-2 rounded-full mb-6"
          style={{
            background: correct ? 'rgba(34,197,94,.12)' : 'rgba(230,57,70,.12)',
            border: `1px solid ${correct ? 'rgba(34,197,94,.4)' : 'rgba(230,57,70,.4)'}`,
            color: correct ? '#22c55e' : '#e63946',
          }}
        >
          {timedOut ? '⏱ Time\'s Up' : correct ? '✓ Correct' : '✗ Wrong'}
        </div>

        {/* Points earned */}
        <div
          className="font-heading text-[5rem] leading-none mb-2"
          style={{ color: correct ? '#22c55e' : '#6b7280' }}
        >
          +{earnedPoints}
        </div>
        <div className="font-code text-[14px] tracking-[.15em] uppercase text-cp-muted mb-8">
          {correct ? `${timeLeft}s left × 3` : 'no points'}
        </div>

        {/* Correct answer (shown on wrong/timeout) */}
        {!correct && (
          <div className="mb-8 text-center">
            <div className="font-code text-[14px] tracking-[.12em] uppercase text-cp-muted mb-1">The answer was</div>
            <div className="font-body text-[1.1rem] text-cp-gold">{currentQuestion.correctAnswer}</div>
          </div>
        )}

        {/* Player total */}
        <div
          className="flex items-center gap-3 px-6 py-4 rounded-[10px] mb-10"
          style={{ background: playerColor(currentPlayerIndex, 0.1), border: `1px solid ${playerColor(currentPlayerIndex, 0.3)}` }}
        >
          <span className="font-code text-[13px] tracking-[.08em] text-cp-muted">{currentPlayer.name}'s total</span>
          <span className="font-heading text-[1.8rem]" style={{ color: playerColor(currentPlayerIndex, 1) }}>
            {players[currentPlayerIndex]?.total ?? 0}
          </span>
        </div>

        {/* Next */}
        <button
          onClick={advanceTurn}
          className="px-10 py-4 rounded-[10px] font-code text-[14px] tracking-[.15em] uppercase transition-all"
          style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#f1f0fb' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
        >
          {questionIndex + 1 >= questions.length
            ? 'See Final Results →'
            : currentPlayerIndex + 1 >= players.length
              ? `Round ${currentRound} Complete →`
              : `Pass to ${nextPlayer?.name} →`}
        </button>
      </div>
    );
  }

  // ROUNDBOARD — shown after every complete round
  if (screen === 'roundboard') {
    return (
      <div className="h-screen bg-cp-bg flex flex-col items-center justify-center text-cp-text px-6">
        <div className="font-code text-[14px] tracking-[.2em] uppercase text-cp-muted mb-2">
          After round {currentRound - 1}
        </div>
        <h2 className="font-heading text-[2.4rem] tracking-[.04em] mb-8">Scoreboard</h2>

        <div className="w-full max-w-sm space-y-2 mb-10">
          {sortedPlayers.map((p, rank) => {
            const origIdx = players.findIndex(pl => pl.name === p.name);
            return (
              <div
                key={p.name}
                className="flex items-center gap-4 px-5 py-4 rounded-[10px]"
                style={{
                  background: rank === 0 ? 'rgba(244,196,48,.08)' : 'rgba(255,255,255,.04)',
                  border: rank === 0 ? '1px solid rgba(244,196,48,.3)' : '1px solid rgba(255,255,255,.08)',
                }}
              >
                <span
                  className="font-heading text-[1.1rem] w-6 text-center shrink-0"
                  style={{ color: rank === 0 ? '#f4c430' : '#6b7280' }}
                >
                  {rank + 1}
                </span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center font-heading text-[.7rem] shrink-0"
                  style={{ background: playerColor(origIdx, 0.2), border: `1px solid ${playerColor(origIdx, 0.5)}`, color: playerColor(origIdx, 1) }}
                >
                  {origIdx + 1}
                </div>
                <span className="flex-1 font-body text-[.95rem]">{p.name}</span>
                <span className="font-heading text-[1.4rem]">{p.total}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setScreen('handoff')}
          className="px-10 py-4 rounded-[10px] font-code text-[14px] tracking-[.15em] uppercase"
          style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff', boxShadow: '0 4px 24px rgba(230,57,70,.35)' }}
        >
          Round {currentRound} →
        </button>
      </div>
    );
  }

  // ENDGAME
  if (screen === 'endgame') {
    const winner = sortedPlayers[0];
    const winnerOrigIdx = players.findIndex(p => p.name === winner?.name);

    return (
      <div className="h-screen bg-cp-bg flex flex-col items-center justify-center text-cp-text px-6">
        <div className="font-code text-[14px] tracking-[.2em] uppercase text-cp-muted mb-4">Game Over</div>

        {/* Winner spotlight */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center font-heading text-[2rem] mb-4"
          style={{
            background: playerColor(winnerOrigIdx, 0.2),
            border: `2px solid ${playerColor(winnerOrigIdx, 0.7)}`,
            color: playerColor(winnerOrigIdx, 1),
            boxShadow: `0 0 40px ${playerColor(winnerOrigIdx, 0.3)}`,
          }}
        >
          {winnerOrigIdx + 1}
        </div>
        <div className="font-code text-[14px] tracking-[.18em] uppercase text-cp-gold mb-1">Winner</div>
        <h2 className="font-heading text-[3rem] tracking-[.03em] mb-1">{winner?.name}</h2>
        <div className="font-heading text-[2rem] text-cp-gold mb-12">{winner?.total} pts</div>

        {/* Full leaderboard */}
        <div className="w-full max-w-sm space-y-2 mb-10">
          {sortedPlayers.map((p, rank) => {
            const origIdx = players.findIndex(pl => pl.name === p.name);
            if (rank === 0) return null; // winner already shown above
            return (
              <div
                key={p.name}
                className="flex items-center gap-4 px-5 py-3 rounded-[10px]"
                style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)' }}
              >
                <span className="font-heading text-[1rem] w-5 text-center text-cp-muted shrink-0">{rank + 1}</span>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-heading text-[.65rem] shrink-0"
                  style={{ background: playerColor(origIdx, 0.2), border: `1px solid ${playerColor(origIdx, 0.5)}`, color: playerColor(origIdx, 1) }}
                >
                  {origIdx + 1}
                </div>
                <span className="flex-1 font-body text-[.92rem]">{p.name}</span>
                <span className="font-heading text-[1.2rem]">{p.total}</span>
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { setScreen('setup'); setPlayerNames(['', '']); setRounds(10); }}
            className="px-7 py-3 rounded-[8px] font-code text-[13px] tracking-[.12em] uppercase"
            style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', color: '#f1f0fb' }}
          >
            Play Again
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-7 py-3 rounded-[8px] font-code text-[13px] tracking-[.12em] uppercase"
            style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff', boxShadow: '0 4px 20px rgba(230,57,70,.3)' }}
          >
            Dashboard →
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ── Utils ────────────────────────────────────────────────────────────────────

const PLAYER_COLORS = [
  '#e63946', // red
  '#f4c430', // gold
  '#4ade80', // green
  '#60a5fa', // blue
  '#f97316', // orange
  '#c084fc', // purple
];

function playerColor(index: number, alpha: number): string {
  const hex = PLAYER_COLORS[index % PLAYER_COLORS.length];
  // Convert hex to rgba
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function questionTypeLabel(type: QuestionType): string {
  switch (type) {
    case 'POSTER_BLIND':      return 'Poster Blind';
    case 'WHO_SAID_IT':       return 'Who Said It?';
    case 'DIRECTORS_CUT':     return 'Director\'s Cut';
    case 'RELEASE_YEAR':      return 'Release Year';
    case 'TAGLINE_GUESS':     return 'Tagline Guess';
    case 'DIRECTOR_OF_MOVIE': return 'Who Directed It?';
    case 'ACTOR_SPOTLIGHT':   return 'Actor Spotlight';
    case 'FILMOGRAPHY_LINK':  return 'Filmography Link';
  }
}
