'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Fuse from 'fuse.js';

const API = 'http://localhost:8080';
const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const MAX_GUESSES = 6;

interface ClueDto { label: string; value: string; }
interface MovieRevealDto { title: string; posterPath: string; releaseYear: number; }
interface WordleStatus {
  date: string;
  clues: ClueDto[];
  guesses: string[];
  guessCount: number;
  maxGuesses: number;
  solved: boolean;
  failed: boolean;
  backgroundPosterPath: string | null;
  movie: MovieRevealDto | null;
}
interface GuessResponse {
  correct: boolean;
  solved: boolean;
  failed: boolean;
  guessCount: number;
  nextClue: ClueDto | null;
  movie: MovieRevealDto | null;
}
interface MovieTitle { id: number; title: string; }

export default function WordlePage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const guessesEndRef = useRef<HTMLDivElement>(null);

  const [status, setStatus] = useState<WordleStatus | null>(null);
  const [allMovies, setAllMovies] = useState<MovieTitle[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedMovie, setSelectedMovie] = useState<MovieTitle | null>(null);
  const [suggestions, setSuggestions] = useState<MovieTitle[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newClueIndex, setNewClueIndex] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const fuse = useMemo(() => new Fuse(allMovies, {
    keys: ['title'],
    threshold: 0.25,
    minMatchCharLength: 3,
    includeScore: true,
  }), [allMovies]);

  function authHeaders() {
    const token = localStorage.getItem('cp_token');
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) { router.push('/login'); return; }

    fetch(`${API}/api/daily-movie/today`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setStatus(data))
      .catch(() => setError('Failed to load today\'s Wordle.'));

    fetch(`${API}/api/daily-movie/movies`, { headers: authHeaders() })
      .then(r => r.json())
      .then(data => setAllMovies(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    guessesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [status?.guesses]);

  useEffect(() => {
    if (!inputValue.trim() || inputValue.length < 2) {
      setSuggestions([]); setShowDropdown(false); return;
    }
    const q = inputValue.toLowerCase();
    const exact = allMovies.filter(m => m.title.toLowerCase().includes(q));
    const exactIds = new Set(exact.map(m => m.id));
    const fuzzy = fuse.search(inputValue, { limit: 7 }).map(r => r.item).filter(m => !exactIds.has(m.id));
    const merged = [...exact, ...fuzzy].slice(0, 7);
    setSuggestions(merged);
    setShowDropdown(merged.length > 0);
  }, [inputValue, allMovies]);

  function selectSuggestion(movie: MovieTitle) {
    setSelectedMovie(movie);
    setInputValue(movie.title);
    setSuggestions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  async function handleSubmit() {
    const guess = selectedMovie ? selectedMovie.title : inputValue.trim();
    if (!guess) return;
    submitGuess(guess);
  }

  async function submitGuess(guess: string) {
    setIsSubmitting(true);
    setError('');
    try {
      const r = await fetch(`${API}/api/daily-movie/guess`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ guess }),
      });
      if (r.status === 409) { setError('Already completed today\'s game.'); return; }
      if (!r.ok) { setError('Something went wrong. Try again.'); return; }
      const result: GuessResponse = await r.json();
      setStatus(prev => {
        if (!prev) return prev;
        const updatedGuesses = [...prev.guesses, guess];
        const updatedClues = result.nextClue ? [...prev.clues, result.nextClue] : prev.clues;
        if (result.nextClue) {
          setNewClueIndex(updatedClues.length - 1);
          setTimeout(() => setNewClueIndex(null), 1500);
        }
        return { ...prev, guesses: updatedGuesses, guessCount: result.guessCount, clues: updatedClues, solved: result.solved, failed: result.failed, movie: result.movie ?? prev.movie };
      });
      setInputValue('');
      setSelectedMovie(null);
    } catch {
      setError('Network error. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { setSuggestions([]); setShowDropdown(false); handleSubmit(); }
    if (e.key === 'Escape') { setSuggestions([]); setShowDropdown(false); }
  }

  if (!status) {
    return (
      <div className="h-screen bg-cp-bg flex items-center justify-center">
        <div className="font-code text-[11px] tracking-[.15em] uppercase text-cp-muted animate-pulse">
          Loading today's game...
        </div>
      </div>
    );
  }

  const gameOver = status.solved || status.failed;
  const attemptsLeft = MAX_GUESSES - status.guessCount;

  const guessSlots = Array.from({ length: MAX_GUESSES }, (_, i) => {
    const guess = status.guesses[i];
    const isCorrect = status.solved && i === status.guesses.length - 1;
    return { guess, isCorrect, isEmpty: !guess };
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden text-cp-text relative">

      {/* BACKGROUND — blurred poster, much more visible */}
      <div
        className="absolute inset-0 z-0"
        style={{ background: '#08080f' }}
      />
      {status.backgroundPosterPath && (
        <div
          className="absolute inset-0 z-0 pointer-events-none"
          style={{
            backgroundImage: `url('${TMDB_IMG}${status.backgroundPosterPath}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(55px) brightness(0.18) saturate(2)',
            transform: 'scale(1.15)',
          }}
        />
      )}
      {/* Dark vignette on top of blurred poster */}
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(8,8,15,0.3) 0%, rgba(8,8,15,0.75) 100%)' }}
      />

      {/* NAVBAR */}
      <nav
        className="shrink-0 flex items-center gap-6 px-10 border-b border-white/8 z-10 relative"
        style={{ height: 60, background: 'rgba(8,8,15,0.6)', backdropFilter: 'blur(20px)' }}
      >
        <button
          onClick={() => router.push('/dashboard')}
          className="font-code text-[10px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
        >
          ← Back
        </button>
        <div className="font-heading text-[1.3rem] tracking-[.1em]">
          GUESS THE <span className="text-cp-gold">MOVIE</span>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="font-code text-[9px] tracking-[.12em] uppercase text-cp-muted">{status.date}</span>
          {!gameOver && (
            <span
              className="font-code text-[9px] tracking-[.08em] uppercase px-[8px] py-[3px] rounded-[3px]"
              style={{ background: 'rgba(244,196,48,.12)', color: '#f4c430', border: '1px solid rgba(244,196,48,.2)' }}
            >
              {attemptsLeft} / {MAX_GUESSES} left
            </span>
          )}
        </div>
      </nav>

      {/* GAME OVER — full-screen dramatic reveal */}
      {gameOver && status.movie && (
        <div className="flex-1 relative z-10 flex items-center justify-center px-6">

          {/* Large poster */}
          <div className="flex flex-col items-center gap-8 max-w-[500px] w-full">

            {/* Status badge */}
            <div
              className="font-code text-[10px] tracking-[.2em] uppercase px-4 py-2 rounded-full"
              style={{
                background: status.solved ? 'rgba(34,197,94,.15)' : 'rgba(230,57,70,.15)',
                border: `1px solid ${status.solved ? 'rgba(34,197,94,.4)' : 'rgba(230,57,70,.4)'}`,
                color: status.solved ? '#22c55e' : '#e63946',
              }}
            >
              {status.solved ? `✓ Guessed in ${status.guessCount} ${status.guessCount === 1 ? 'try' : 'tries'}` : '✗ Better luck tomorrow'}
            </div>

            {/* Poster + info side by side */}
            <div className="flex gap-6 items-end w-full">
              {status.movie.posterPath && (
                <div className="shrink-0 relative">
                  <img
                    src={`${TMDB_IMG}${status.movie.posterPath}`}
                    alt={status.movie.title}
                    className="rounded-[10px] object-cover"
                    style={{
                      width: 160,
                      height: 240,
                      boxShadow: status.solved
                        ? '0 0 40px rgba(34,197,94,.25), 0 20px 60px rgba(0,0,0,.8)'
                        : '0 0 40px rgba(230,57,70,.2), 0 20px 60px rgba(0,0,0,.8)',
                    }}
                  />
                </div>
              )}
              <div className="flex flex-col justify-end pb-1">
                <div className="font-code text-[9px] tracking-[.15em] uppercase text-cp-muted mb-2">
                  {status.solved ? 'Today\'s movie was' : 'The answer was'}
                </div>
                <h2 className="font-heading text-[2.2rem] leading-none tracking-[.03em] mb-2">
                  {status.movie.title}
                </h2>
                {status.movie.releaseYear && (
                  <div
                    className="font-code text-[11px] px-3 py-1 rounded-[4px] inline-block w-fit mb-4"
                    style={{ background: 'rgba(255,255,255,.08)', color: '#6b7280' }}
                  >
                    {status.movie.releaseYear}
                  </div>
                )}

                {/* Guesses summary */}
                <div className="flex gap-[5px] mb-5">
                  {guessSlots.map((slot, i) => (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-[4px] flex items-center justify-center font-code text-[9px]"
                      style={{
                        background: slot.isEmpty
                          ? 'rgba(255,255,255,.05)'
                          : slot.isCorrect
                            ? 'rgba(34,197,94,.25)'
                            : 'rgba(230,57,70,.2)',
                        border: slot.isEmpty
                          ? '1px solid rgba(255,255,255,.08)'
                          : slot.isCorrect
                            ? '1px solid rgba(34,197,94,.4)'
                            : '1px solid rgba(230,57,70,.3)',
                        color: slot.isEmpty ? '#6b7280' : slot.isCorrect ? '#22c55e' : '#e63946',
                      }}
                    >
                      {slot.isEmpty ? '·' : slot.isCorrect ? '✓' : '✗'}
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => router.push('/dashboard')}
                  className="font-code text-[10px] tracking-[.12em] uppercase px-5 py-[10px] rounded-[6px] transition-all w-fit"
                  style={{ background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.15)', color: '#f1f0fb', backdropFilter: 'blur(8px)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.18)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.1)')}
                >
                  Back to Dashboard →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* GAME IN PROGRESS — two column layout */}
      {!gameOver && (
        <div className="flex flex-1 overflow-hidden relative z-10">

          {/* LEFT — Clues */}
          <div
            className="flex flex-col overflow-y-auto px-8 py-7 border-r"
            style={{ width: '55%', borderColor: 'rgba(255,255,255,.06)', background: 'rgba(8,8,15,.45)', backdropFilter: 'blur(16px)' }}
          >
            <div className="mb-5">
              <h1 className="font-heading text-[1.7rem] tracking-[.04em] mb-1">Guess Today's Movie</h1>
              <p className="font-body text-sm text-cp-muted">Use the clues — {attemptsLeft} {attemptsLeft === 1 ? 'guess' : 'guesses'} remaining</p>
            </div>

            <div className="font-code text-[9px] tracking-[.15em] uppercase text-cp-muted mb-3">
              Clues unlocked · {status.clues.length} / 7
            </div>

            <div className="space-y-2">
              {status.clues.map((clue, i) => (
                <div
                  key={clue.label}
                  className="flex items-start gap-3 rounded-[8px] px-4 py-3 transition-all"
                  style={{
                    background: i === newClueIndex ? 'rgba(244,196,48,.1)' : 'rgba(255,255,255,.05)',
                    border: i === newClueIndex ? '1px solid rgba(244,196,48,.35)' : '1px solid rgba(255,255,255,.08)',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span
                    className="font-code text-[8px] tracking-[.1em] uppercase shrink-0 mt-[3px] px-[7px] py-[3px] rounded-[3px]"
                    style={{ background: 'rgba(230,57,70,.15)', color: '#e63946', border: '1px solid rgba(230,57,70,.2)' }}
                  >
                    {clue.label}
                  </span>
                  <span className="font-body text-[.92rem] font-medium text-cp-text leading-snug">{clue.value}</span>
                </div>
              ))}

              {/* Locked placeholders */}
              {Array.from({ length: Math.max(0, 7 - status.clues.length) }).map((_, i) => (
                <div
                  key={`locked-${i}`}
                  className="flex items-center gap-3 rounded-[8px] px-4 py-3"
                  style={{ border: '1px dashed rgba(255,255,255,.07)', opacity: 0.5 }}
                >
                  <span
                    className="font-code text-[8px] tracking-[.1em] uppercase shrink-0 px-[7px] py-[3px] rounded-[3px]"
                    style={{ background: 'rgba(255,255,255,.04)', color: '#6b7280' }}
                  >
                    locked
                  </span>
                  <span className="font-code text-[9px] text-cp-muted">Make a wrong guess to unlock</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Guesses + Input */}
          <div
            className="flex flex-col overflow-hidden"
            style={{ width: '45%', background: 'rgba(8,8,15,.35)', backdropFilter: 'blur(16px)' }}
          >
            {/* Guess slots */}
            <div className="flex-1 overflow-y-auto px-7 py-7">
              <div className="font-code text-[9px] tracking-[.15em] uppercase text-cp-muted mb-4">
                Guesses · {status.guessCount} / {MAX_GUESSES}
              </div>

              <div className="space-y-[6px]">
                {guessSlots.map((slot, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 px-4 py-[11px] rounded-[7px] font-code text-[11px] transition-all"
                    style={{
                      background: slot.isEmpty
                        ? 'rgba(255,255,255,.03)'
                        : slot.isCorrect
                          ? 'rgba(34,197,94,.1)'
                          : 'rgba(230,57,70,.08)',
                      border: slot.isEmpty
                        ? '1px dashed rgba(255,255,255,.08)'
                        : slot.isCorrect
                          ? '1px solid rgba(34,197,94,.25)'
                          : '1px solid rgba(230,57,70,.2)',
                    }}
                  >
                    <span
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[9px] shrink-0 font-heading"
                      style={{
                        background: slot.isEmpty ? 'rgba(255,255,255,.06)' : slot.isCorrect ? 'rgba(34,197,94,.25)' : 'rgba(230,57,70,.2)',
                        color: slot.isEmpty ? '#6b7280' : slot.isCorrect ? '#22c55e' : '#e63946',
                      }}
                    >
                      {slot.isEmpty ? i + 1 : slot.isCorrect ? '✓' : '✗'}
                    </span>
                    <span className={slot.isEmpty ? 'text-white/15' : slot.isCorrect ? 'text-cp-text' : 'text-cp-muted line-through'}>
                      {slot.isEmpty ? `Guess ${i + 1}` : slot.guess}
                    </span>
                  </div>
                ))}
                <div ref={guessesEndRef} />
              </div>
            </div>

            {/* Input pinned at bottom */}
            <div
              className="shrink-0 px-7 py-5 border-t"
              style={{ borderColor: 'rgba(255,255,255,.06)', background: 'rgba(8,8,15,.6)', backdropFilter: 'blur(20px)' }}
            >
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={e => { setInputValue(e.target.value); setSelectedMovie(null); }}
                  onKeyDown={handleKeyDown}
                  onFocus={e => { if (suggestions.length > 0) setShowDropdown(true); e.currentTarget.style.border = '1px solid rgba(244,196,48,.5)'; }}
                  onBlur={e => { setTimeout(() => setShowDropdown(false), 150); e.currentTarget.style.border = '1px solid rgba(255,255,255,.1)'; }}
                  placeholder="Type a movie name..."
                  className="w-full rounded-[8px] px-4 py-3 font-body text-[.9rem] text-cp-text placeholder:text-cp-muted outline-none transition-all"
                  style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(8px)' }}
                />

                {showDropdown && (
                  <div
                    className="absolute bottom-full left-0 right-0 mb-1 rounded-[8px] overflow-hidden z-20"
                    style={{ background: 'rgba(10,10,20,.95)', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 -12px 40px rgba(0,0,0,.7)', backdropFilter: 'blur(20px)' }}
                  >
                    {suggestions.map(m => (
                      <button
                        key={m.id}
                        onMouseDown={() => selectSuggestion(m)}
                        className="w-full text-left px-4 py-[10px] font-body text-[.88rem] text-cp-text hover:bg-white/6 transition-colors border-b border-white/5 last:border-0"
                      >
                        {m.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {error && <p className="font-code text-[10px] text-cp-red mt-2">{error}</p>}

              <button
                onClick={handleSubmit}
                disabled={isSubmitting || !inputValue.trim()}
                className="w-full mt-3 font-code text-[11px] tracking-[.12em] uppercase py-[11px] rounded-[8px] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #e63946, #c1121f)', color: '#fff', boxShadow: '0 4px 20px rgba(230,57,70,.3)' }}
                onMouseEnter={e => { if (!isSubmitting) e.currentTarget.style.boxShadow = '0 4px 28px rgba(230,57,70,.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(230,57,70,.3)'; }}
              >
                {isSubmitting ? 'Checking...' : 'Submit Guess'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
