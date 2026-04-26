'use client';

import { useEffect, useRef, useState } from 'react';
import GameLeaderboard from '../components/GameLeaderboard';
import { useRouter } from 'next/navigation';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const TIMER_SECONDS = 20;

type QuestionType = 'POSTER_BLIND' | 'WHO_SAID_IT' | 'DIRECTORS_CUT' | 'RELEASE_YEAR';

interface Question {
  id: number;
  type: QuestionType;
  questionText: string;
  posterPath: string | null;
  options: string[];
  basePoints: number;
}

interface TodayQuiz {
  quizDate: string;
  theme: string;
  alreadyCompleted: boolean;
  previousScore: number | null;
  questions: Question[];
}

interface AnswerRecord {
  questionId: number;
  selectedAnswer: string;
  timeLeft: number;
}

interface QuestionResult {
  questionId: number;
  questionText: string;
  selectedAnswer: string;
  correctAnswer: string;
  correct: boolean;
  pointsEarned: number;
  timeLeft: number;
}

interface QuizResult {
  totalScore: number;
  baseScore: number;
  streakMultiplier: number;
  newStreak: number;
  breakdown: QuestionResult[];
}

type Screen = 'loading' | 'already-done' | 'intro' | 'question' | 'result' | 'error';

// ── Blur levels for Poster Blind ──────────────────────────────────────────────
function blurStyle(revealed: number): string {
  const levels = ['blur(10px)', 'blur(5px)', 'blur(2px)', 'blur(0px)'];
  return levels[Math.min(revealed, 3)];
}

// ── Points cost for revealing ─────────────────────────────────────────────────
const REVEAL_COSTS = [0, 50, 90, 120]; // cumulative points lost per reveal level

export default function QuizPage() {
  const router = useRouter();
  const [screen, setScreen] = useState<Screen>('loading');
  const [quiz, setQuiz] = useState<TodayQuiz | null>(null);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [revealed, setRevealed] = useState(0); // for POSTER_BLIND
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedResultRef = useRef<QuizResult | null>(null);

  // ── Load today's quiz ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) { router.replace('/login'); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/today`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then((data: TodayQuiz) => {
        setQuiz(data);
        setScreen(data.alreadyCompleted ? 'already-done' : 'intro');
      })
      .catch(() => {
        setError('Failed to load quiz. Is the backend running?');
        setScreen('error');
      });
  }, [router]);

  // ── Per-question timer ────────────────────────────────────────────────────
  useEffect(() => {
    if (screen !== 'question' || confirmed) return;
    setTimeLeft(TIMER_SECONDS);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, current, confirmed]);

  function handleTimeout() {
    if (!quiz || confirmed) return;
    const q = quiz.questions[current];
    recordAnswer(q, '', 0);
  }

  function handleSelect(option: string) {
    if (confirmed) return;
    setSelected(option);
  }

  function handleConfirm() {
    if (!quiz || !selected || confirmed) return;
    clearInterval(timerRef.current!);
    setConfirmed(true);
    const q = quiz.questions[current];
    recordAnswer(q, selected, timeLeft);
  }

  function recordAnswer(q: Question, ans: string, tLeft: number) {
    setAnswers(prev => [...prev, { questionId: q.id, selectedAnswer: ans, timeLeft: tLeft }]);
    setConfirmed(true);
  }

  function handleNext() {
    if (!quiz) return;
    if (current + 1 >= quiz.questions.length) {
      submitQuiz([...answers]);
    } else {
      setCurrent(c => c + 1);
      setSelected(null);
      setConfirmed(false);
      setRevealed(0);
    }
  }

  async function submitQuiz(finalAnswers: AnswerRecord[]) {
    const token = localStorage.getItem('cp_token');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/quiz/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      if (res.status === 409) {
        // Already submitted — show saved result if replaying, else already-done screen
        if (savedResultRef.current) { setResult(savedResultRef.current); setScreen('result'); }
        else { setScreen('already-done'); }
        return;
      }
      if (!res.ok) { setError('Failed to submit quiz.'); setScreen('error'); return; }
      const data: QuizResult = await res.json();
      savedResultRef.current = data;
      setResult(data);
      setScreen('result');
    } catch {
      setError('Failed to submit quiz.');
      setScreen('error');
    }
  }

  function handlePlayAgain() {
    setCurrent(0);
    setAnswers([]);
    setSelected(null);
    setConfirmed(false);
    setRevealed(0);
    setResult(null);
    setScreen('intro');
  }

  // ── Reveal handler (Poster Blind) ─────────────────────────────────────────
  function handleReveal() {
    if (revealed < 3) setRevealed(r => r + 1);
  }

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────

  if (screen === 'loading') return <PageShell><Spinner /></PageShell>;

  if (screen === 'error') return (
    <PageShell>
      <p className="font-body text-lg text-cp-red">{error}</p>
      <button onClick={() => router.push('/dashboard')} className="mt-4 btn-ghost">← Back</button>
    </PageShell>
  );

  if (screen === 'already-done' && quiz) return (
    <PageShell>
      <div className="text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="font-heading text-3xl tracking-widest mb-2">QUIZ DONE</h2>
        <p className="font-body text-cp-muted mb-1">You already completed today's quiz.</p>
        <p className="font-code text-2xl text-cp-gold mt-4">{quiz.previousScore} pts</p>
        <div className="flex flex-col gap-3 mt-6">
          <button onClick={handlePlayAgain} className="btn-primary">Play Again ↺</button>
          <button onClick={() => router.push('/dashboard')} className="btn-ghost">← Dashboard</button>
        </div>
      </div>
    </PageShell>
  );

  if (screen === 'intro' && quiz) return (
    <PageShell>
      <div className="text-center max-w-md">
        <div className="font-code text-[12px] tracking-[.18em] uppercase text-cp-red mb-3 flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-cp-red animate-pulse" />
          DAILY QUIZ
        </div>
        <h1 className="font-heading text-4xl tracking-widest mb-3">TODAY'S THEME</h1>
        <p className="font-body text-xl text-cp-gold mb-6">{quiz.theme}</p>
        <div className="font-code text-[13px] text-cp-muted mb-8 space-y-1">
          <p>5 questions · 20 seconds each</p>
          <p>Streak bonus unlocks at 7 days</p>
          <p>Max score: 800 pts</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setCurrent(0); setScreen('question'); }}
        >
          Start Quiz →
        </button>
      </div>
    </PageShell>
  );

  if (screen === 'question' && quiz) {
    const q = quiz.questions[current];
    if (!q) return <PageShell><Spinner /></PageShell>;
    const isPosterBlind = q.type === 'POSTER_BLIND';

    return (
      <div className="min-h-screen bg-cp-bg text-cp-text flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-cp-border">
          <button onClick={() => router.push('/dashboard')} className="font-code text-[13px] text-cp-muted hover:text-cp-text tracking-widest uppercase">
            ✕ Exit
          </button>
          <div className="flex items-center gap-3">
            {quiz.questions.map((_, i) => (
              <div key={`dot-${i}`} className={`w-2 h-2 rounded-full ${i < current ? 'bg-cp-gold' : i === current ? 'bg-cp-red' : 'bg-cp-border'}`} />
            ))}
          </div>
          <TimerBar timeLeft={timeLeft} total={TIMER_SECONDS} />
        </div>

        {/* Question body */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6 max-w-xl mx-auto w-full">

          {/* Type badge */}
          <span className="font-code text-[11px] tracking-[.15em] uppercase px-2 py-1 rounded-sm mb-5"
            style={{
              background: isPosterBlind ? 'rgba(230,57,70,.12)' : q.type === 'WHO_SAID_IT' ? 'rgba(244,196,48,.12)' : 'rgba(139,92,246,.12)',
              color: isPosterBlind ? '#e63946' : q.type === 'WHO_SAID_IT' ? '#f4c430' : '#a78bfa',
            }}>
            {q.type.replace(/_/g, ' ')}
          </span>

          {/* Poster (POSTER_BLIND + RELEASE_YEAR) */}
          {q.posterPath && (
            <div className="relative mb-6 rounded-lg overflow-hidden w-[260px] h-[390px] shrink-0">
              <img
                src={`${TMDB_IMG}${q.posterPath}`}
                alt="movie poster"
                className="w-full h-full object-cover transition-all duration-700"
                style={{ filter: isPosterBlind ? blurStyle(revealed) : 'none' }}
              />
              {isPosterBlind && revealed < 3 && !confirmed && (
                <button
                  onClick={handleReveal}
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 font-code text-[11px] tracking-widest uppercase px-3 py-1 rounded bg-black/70 text-cp-muted hover:text-cp-text border border-white/10"
                >
                  Reveal (−{REVEAL_COSTS[revealed + 1] - REVEAL_COSTS[revealed]} pts)
                </button>
              )}
            </div>
          )}

          {/* Question text */}
          <p className={`text-center mb-6 ${q.type === 'WHO_SAID_IT' ? 'font-body text-2xl italic font-light leading-relaxed' : 'font-body text-xl font-medium'}`}>
            {q.questionText}
          </p>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3 w-full">
            {q.options.map((opt, optIdx) => {
              const isSelected = selected === opt;
              const isCorrect = confirmed && opt === /* we don't know correctAnswer client-side */ null;
              let style = 'border-cp-border bg-cp-surface text-cp-text hover:border-white/20';
              if (isSelected && !confirmed) style = 'border-cp-red bg-cp-red/10 text-cp-text';
              if (confirmed && isSelected) style = 'border-cp-gold bg-cp-gold/10 text-cp-gold';

              return (
                <button
                  key={`opt-${optIdx}`}
                  onClick={() => handleSelect(opt)}
                  disabled={confirmed}
                  className={`font-body text-lg font-medium border rounded-lg px-5 py-4 text-left transition-all ${style}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Confirm / Next */}
          <div className="mt-6 flex gap-3">
            {!confirmed ? (
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Lock In →
              </button>
            ) : (
              <button onClick={handleNext} className="btn-primary">
                {current + 1 < quiz.questions.length ? 'Next Question →' : 'See Results →'}
              </button>
            )}
          </div>

          {/* Points reminder */}
          <p className="font-code text-[12px] text-cp-muted mt-4 tracking-widest">
            {q.basePoints} BASE PTS + UP TO {TIMER_SECONDS * 2} SPEED BONUS
          </p>
        </div>
      </div>
    );
  }

  if (screen === 'result' && result) return (
    <div className="min-h-screen bg-cp-bg text-cp-text">
      <div className="max-w-xl mx-auto px-8 py-12">
        {/* Score header */}
        <div className="text-center mb-10">
          <div className="font-code text-[12px] tracking-[.18em] uppercase text-cp-muted mb-2">QUIZ COMPLETE</div>
          <div className="font-heading text-6xl text-cp-gold leading-none">{result.totalScore}</div>
          <div className="font-code text-[13px] text-cp-muted mt-1">POINTS</div>
          {result.streakMultiplier > 1 && (
            <div className="mt-3 font-code text-[13px] text-cp-gold">
              🔥 {result.streakMultiplier}× streak multiplier applied
            </div>
          )}
          <div className="mt-2 font-code text-[13px] text-cp-muted">
            Streak: {result.newStreak} day{result.newStreak !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-3 mb-10">
          {result.breakdown.map((item, i) => (
            <div key={`result-${i}`}
              className="border border-cp-border rounded-lg p-4 bg-cp-surface"
              style={{ borderColor: item.correct ? 'rgba(34,197,94,.3)' : 'rgba(230,57,70,.3)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-body text-base font-medium line-clamp-2">{item.questionText}</p>
                  <p className="font-code text-[12px] text-cp-muted mt-1">
                    Your answer: <span className={item.correct ? 'text-green-400' : 'text-cp-red'}>{item.selectedAnswer || '(no answer)'}</span>
                    {!item.correct && <> · Correct: <span className="text-cp-gold">{item.correctAnswer}</span></>}
                  </p>
                </div>
                <span className={`font-code text-base shrink-0 ${item.correct ? 'text-green-400' : 'text-cp-muted'}`}>
                  +{item.pointsEarned}
                </span>
              </div>
            </div>
          ))}
        </div>

        <GameLeaderboard endpoint="/api/quiz/leaderboard" />

        <div className="flex flex-col gap-3 mt-2">
          <button onClick={handlePlayAgain} className="btn-primary w-full text-center">
            Play Again ↺
          </button>
          <button onClick={() => router.push('/dashboard')} className="btn-ghost w-full text-center">
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );

  return null;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cp-bg text-cp-text flex items-center justify-center px-6">
      {children}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-cp-border border-t-cp-red animate-spin" />
      <p className="font-code text-[13px] text-cp-muted tracking-widest uppercase">Loading quiz...</p>
    </div>
  );
}

function TimerBar({ timeLeft, total }: { timeLeft: number; total: number }) {
  const pct = (timeLeft / total) * 100;
  const color = timeLeft <= 5 ? '#e63946' : timeLeft <= 10 ? '#f4c430' : '#22c55e';
  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-cp-border overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="font-code text-[13px] w-6 text-right" style={{ color }}>{timeLeft}s</span>
    </div>
  );
}
