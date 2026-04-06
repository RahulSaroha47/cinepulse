'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const API = 'http://localhost:8080';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const GRID = 4;
const TILE_COUNT = GRID * GRID;

interface MovieReveal { title: string; posterPath: string; releaseYear: number; }
interface JigsawStatus {
  date: string;
  posterPath: string;
  tileOrder: number[];
  timeLimit: number;
  completed: boolean;
  score: number;
  timeTaken: number;
  movie: MovieReveal | null;
}
interface SubmitResponse {
  score: number;
  timeTaken: number;
  timeLimit: number;
  movie: MovieReveal;
}
interface GameEnd {
  reason: 'solved' | 'timeout';
  timeTaken: number;
  score: number;
  movie: MovieReveal | null;
}

function authHeaders() {
  const token = localStorage.getItem('cp_token');
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

function tileStyle(tileIndex: number, posterUrl: string): React.CSSProperties {
  const col = tileIndex % GRID;
  const row = Math.floor(tileIndex / GRID);
  return {
    backgroundImage: `url(${posterUrl})`,
    backgroundSize: `${GRID * 100}% ${GRID * 100}%`,
    backgroundPosition: `${(col / (GRID - 1)) * 100}% ${(row / (GRID - 1)) * 100}%`,
    backgroundRepeat: 'no-repeat',
  };
}

export default function JigsawPage() {
  const router = useRouter();

  const [status, setStatus] = useState<JigsawStatus | null>(null);
  const [tiles, setTiles] = useState<number[]>([]);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [gameEnd, setGameEnd] = useState<GameEnd | null>(null);
  const [showResult, setShowResult] = useState(false); // delayed for solved celebration
  const [loadError, setLoadError] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const celebrationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeElapsedRef = useRef(0);
  // Ref guard — prevents double submission (React Strict Mode calls updaters twice)
  const gameOverRef = useRef(false);

  function resetGame() {
    clearInterval(timerRef.current!);
    clearTimeout(celebrationRef.current!);
    gameOverRef.current = false;
    setTiles(status!.tileOrder);
    setTimeLeft(status!.timeLimit);
    setGameEnd(null);
    setShowResult(false);
    setStarted(false);
  }

  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) { router.push('/login'); return; }

    fetch(`${API}/api/jigsaw/today`, { headers: authHeaders() })
      .then(r => r.json())
      .then((data: JigsawStatus) => {
        setStatus(data);
        setTiles(data.tileOrder);
        setTimeLeft(data.timeLimit);
        if (data.completed) {
          setGameEnd({ reason: 'solved', timeTaken: data.timeTaken, score: data.score, movie: data.movie });
          setShowResult(true);
        }
      })
      .catch(() => setLoadError('Failed to load today\'s puzzle.'));
  }, []);

  function startGame() {
    gameOverRef.current = false;
    timeElapsedRef.current = 0;
    setStarted(true);

    timerRef.current = setInterval(() => {
      timeElapsedRef.current += 1;
      setTimeLeft(prev => {
        const next = prev - 1;
        if (next <= 0) {
          clearInterval(timerRef.current!);
          // Schedule timeout handling outside the updater to avoid React Strict Mode double-invoke
          setTimeout(() => endGame(timeElapsedRef.current, false), 0);
        }
        return Math.max(0, next);
      });
    }, 1000);
  }

  function endGame(timeTaken: number, wasSolved: boolean) {
    if (gameOverRef.current) return; // guard against double calls
    gameOverRef.current = true;
    clearInterval(timerRef.current!);

    const timeRemaining = Math.max(0, (status?.timeLimit ?? 120) - timeTaken);
    const localScore = wasSolved ? timeRemaining * 10 : 0;

    setGameEnd({ reason: wasSolved ? 'solved' : 'timeout', timeTaken, score: localScore, movie: null });

    if (wasSolved) {
      // Show "Solved!" celebration for 1.5s, then always transition to result
      // regardless of whether backend has responded yet
      celebrationRef.current = setTimeout(() => setShowResult(true), 1500);
    } else {
      setShowResult(true);
    }

    // Submit in background — movie data fills in when ready
    fetch(`${API}/api/jigsaw/submit`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ timeTaken }),
    })
      .then(async r => {
        if (r.ok) {
          const data: SubmitResponse = await r.json();
          setGameEnd(prev => prev ? { ...prev, score: data.score, movie: data.movie } : prev);
        } else if (r.status === 409) {
          const s = await fetch(`${API}/api/jigsaw/today`, { headers: authHeaders() });
          const data: JigsawStatus = await s.json();
          setGameEnd(prev => prev ? { ...prev, score: data.score, movie: data.movie } : prev);
        }
        // Any other backend error: result screen shows with local score, no movie reveal
      })
      .catch(() => {});
  }

  function handleDragStart(slotIndex: number) {
    setDragFrom(slotIndex);
  }

  function handleDragOver(e: React.DragEvent, slotIndex: number) {
    e.preventDefault();
    setDragOver(slotIndex);
  }

  function handleDrop(slotIndex: number) {
    if (dragFrom === null || dragFrom === slotIndex) {
      setDragFrom(null);
      setDragOver(null);
      return;
    }
    const next = [...tiles];
    [next[dragFrom], next[slotIndex]] = [next[slotIndex], next[dragFrom]];
    setTiles(next);
    setDragFrom(null);
    setDragOver(null);

    if (next.every((t, i) => t === i)) {
      endGame(timeElapsedRef.current, true);
    }
  }

  // ── LOADING ───────────────────────────────────────────────────────
  if (!status && !loadError) {
    return (
      <div className="min-h-screen bg-cp-bg flex items-center justify-center">
        <p className="font-code text-[11px] tracking-[.15em] uppercase text-cp-muted animate-pulse">
          Loading puzzle…
        </p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-cp-bg flex items-center justify-center">
        <p className="font-code text-[11px] tracking-[.15em] uppercase text-cp-red">{loadError}</p>
      </div>
    );
  }

  const posterUrl = `${TMDB_IMG}${status!.posterPath}`;

  // ── RESULT SCREEN ────────────────────────────────────────────────
  if (gameEnd && showResult) {
    const timeRemaining = Math.max(0, (status?.timeLimit ?? 120) - gameEnd.timeTaken);
    return (
      <div className="min-h-screen bg-cp-bg flex flex-col items-center justify-center px-4 py-12">
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `url(${gameEnd.movie ? TMDB_IMG + gameEnd.movie.posterPath : posterUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.15)',
        }} />
        <div className="relative z-10 flex flex-col items-center gap-6 max-w-md w-full">
          <div className="text-center">
            <p className="font-code text-[10px] tracking-[.2em] uppercase text-cp-muted mb-1">
              {gameEnd.reason === 'timeout' ? "Time's Up!" : 'Puzzle Solved!'}
            </p>
            <h1 className="font-heading text-4xl text-cp-text">{gameEnd.score} pts</h1>
            {gameEnd.reason === 'solved' && (
              <p className="font-code text-[11px] text-cp-muted mt-1">
                {timeRemaining}s remaining × 10 pts/s
              </p>
            )}
          </div>

          {gameEnd.movie ? (
            <>
              <div className="w-48 rounded-[10px] overflow-hidden border border-white/10 shadow-2xl">
                <img src={`${TMDB_IMG}${gameEnd.movie.posterPath}`} alt={gameEnd.movie.title} className="w-full" />
              </div>
              <div className="text-center">
                <h2 className="font-heading text-2xl text-cp-gold">{gameEnd.movie.title}</h2>
                <p className="font-code text-[11px] text-cp-muted mt-1">{gameEnd.movie.releaseYear}</p>
              </div>
            </>
          ) : gameEnd.reason === 'solved' ? (
            <p className="font-code text-[11px] text-cp-muted animate-pulse">Loading reveal…</p>
          ) : null}

          <div className="flex gap-3 w-full">
            <button onClick={() => router.push('/dashboard')} className="flex-1 btn-ghost font-code text-[11px] tracking-[.15em] uppercase py-3">
              ← Dashboard
            </button>
            <button
              onClick={resetGame}
              className="flex-1 py-3 rounded-[10px] font-code text-[11px] tracking-[.15em] uppercase transition-all"
              style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff' }}
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── INTRO SCREEN ─────────────────────────────────────────────────
  if (!started) {
    return (
      <div className="min-h-screen bg-cp-bg flex flex-col items-center justify-center px-4 py-12">
        <div className="fixed inset-0 pointer-events-none" style={{
          backgroundImage: `url(${posterUrl})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          filter: 'blur(60px) brightness(0.12)',
        }} />
        <div className="relative z-10 flex flex-col items-center gap-8 max-w-sm w-full text-center">
          <div
            className="grid gap-[2px] rounded-[8px] overflow-hidden"
            style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, width: 200, height: 200 }}
          >
            {tiles.map((tileIdx, slot) => (
              <div key={slot} style={{ ...tileStyle(tileIdx, posterUrl), width: '100%', height: '100%' }} />
            ))}
          </div>

          <div>
            <h1 className="font-heading text-4xl text-cp-text">Poster Jigsaw</h1>
            <p className="font-body text-base text-cp-muted mt-2">
              Rearrange the 16 tiles to reveal today's Bollywood movie poster.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-left w-full bg-cp-surface border border-cp-border rounded-[10px] p-5">
            <p className="font-code text-[11px] tracking-[.15em] uppercase text-cp-muted mb-1">Rules</p>
            <p className="font-body text-base text-cp-text">⏱ 90 seconds to solve</p>
            <p className="font-body text-base text-cp-text">🖱 Drag tiles to swap them</p>
            <p className="font-body text-base text-cp-text">🏆 Score = time remaining × 10 pts</p>
            <p className="font-body text-base text-cp-text">🎯 Max score: 900 pts</p>
          </div>

          <button
            onClick={startGame}
            className="w-full py-4 rounded-[10px] font-code text-[14px] tracking-[.15em] uppercase transition-all"
            style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff' }}
          >
            Start Puzzle →
          </button>

          <button
            onClick={() => router.push('/dashboard')}
            className="font-code text-[11px] tracking-[.15em] uppercase text-cp-muted hover:text-cp-text transition-colors"
          >
            ← Back
          </button>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──────────────────────────────────────────────────
  const timeLimit = status!.timeLimit;
  const timerPercent = (timeLeft / timeLimit) * 100;
  const timerColor = timerPercent > 50 ? '#e63946' : timerPercent > 25 ? '#f4c430' : '#ef4444';

  return (
    <div className="min-h-screen bg-cp-bg flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { clearInterval(timerRef.current!); router.push('/dashboard'); }}
            className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted hover:text-cp-text transition-colors"
          >
            ← Exit
          </button>
          <p className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">Poster Jigsaw</p>
          <div className="font-code text-[14px] font-bold" style={{ color: timerColor }}>
            {timeLeft}s
          </div>
        </div>
        <div className="h-[3px] bg-cp-border rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${timerPercent}%`, background: timerColor }}
          />
        </div>
      </div>

      <div
        className="grid gap-[3px] rounded-[10px] overflow-hidden select-none"
        style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)`, width: '100%', maxWidth: 480, aspectRatio: '2/3' }}
      >
        {tiles.map((tileIdx, slot) => {
          const isCorrect = tileIdx === slot;
          const isDragTarget = dragOver === slot;
          return (
            <div
              key={slot}
              draggable
              onDragStart={() => handleDragStart(slot)}
              onDragOver={e => handleDragOver(e, slot)}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(slot)}
              style={{
                ...tileStyle(tileIdx, posterUrl),
                width: '100%',
                paddingBottom: `${(3 / 2 / GRID) * 100}%`,
                position: 'relative',
                cursor: 'grab',
                outline: isDragTarget
                  ? '2px solid rgba(244,196,48,0.8)'
                  : isCorrect
                  ? '2px solid rgba(34,197,94,0.4)'
                  : 'none',
                transition: 'outline 0.1s',
                filter: dragFrom === slot ? 'brightness(0.7)' : 'none',
              }}
            />
          );
        })}
      </div>

      {/* Solved overlay — shown during 1.5s celebration before result screen */}
      {gameEnd?.reason === 'solved' && !showResult && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center"
          style={{ background: 'rgba(8,8,15,0.85)', backdropFilter: 'blur(4px)' }}>
          <p className="font-heading text-5xl text-cp-gold mb-3">Solved!</p>
          <p className="font-code text-[11px] tracking-[.2em] uppercase text-cp-muted animate-pulse">
            Loading result…
          </p>
        </div>
      )}

      <p className="font-code text-[10px] tracking-[.1em] uppercase text-cp-muted mt-5">
        Drag tiles to swap — green border = correct position
      </p>
    </div>
  );
}
