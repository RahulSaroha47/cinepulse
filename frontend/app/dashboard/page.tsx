'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

const GAME_CARDS = [
  { icon: '🎯', name: 'Daily Quiz',      sub: '5 questions today',     badge: 'live', glow: 'rgba(230,57,70,.08)',  route: '/quiz' },
  { icon: '🟨', name: 'Guess the Movie', sub: "Guess today's film",    badge: 'live', glow: 'rgba(244,196,48,.06)', route: '/daily-movie' },
  { icon: '🧩', name: 'Poster Jigsaw',   sub: 'Reassemble the poster', badge: 'live', glow: 'rgba(99,102,241,.06)', route: '/jigsaw' },
  { icon: '🎳', name: 'Party Mode',      sub: 'Local multiplayer',     badge: 'live', glow: 'rgba(139,92,246,.06)', route: '/party' },
  { icon: '⭐', name: 'Reviews',         sub: 'Rate & review films',   badge: 'soon', glow: 'rgba(244,196,48,.04)', route: null },
];


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type UserStats = { streak: number; quizStreak: number; totalScore: number; rank: number; gamesPlayed: number };

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [initials, setInitials] = useState('?');
  const [stats, setStats] = useState<UserStats | null>(null);
  type QuizHero = { theme: string; themePosterPath: string; alreadyCompleted: boolean; previousScore: number | null };
  const [quizHero, setQuizHero] = useState<QuizHero | null>(null);
  type JigsawStatus = { completed: boolean; score: number };
  type WordleStatus = { solved: boolean; failed: boolean };
  type LbEntry = { rank: number; username: string; score: number };
  type Leaderboard = { top7: LbEntry[]; playerRank: LbEntry | null };
  const [jigsawStatus, setJigsawStatus] = useState<JigsawStatus | null>(null);
  const [wordleStatus, setWordleStatus] = useState<WordleStatus | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leaderboard | null>(null);
  const [posters, setPosters] = useState<string[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem('cp_user');
    if (raw) {
      try {
        const user = JSON.parse(raw);
        const name: string = user.username || user.email?.split('@')[0] || '';
        if (name) {
          setUsername(name.charAt(0).toUpperCase() + name.slice(1));
          setInitials(name.slice(0, 2).toUpperCase());
        }
      } catch {}
    }

    const token = localStorage.getItem('cp_token');
    if (!token) { router.push('/login'); return; }

    const headers = { Authorization: `Bearer ${token}` };

    fetch('http://localhost:8080/api/users/me/stats', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {});

    fetch('http://localhost:8080/api/quiz/today', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.theme) setQuizHero(data); })
      .catch(() => {});

    fetch('http://localhost:8080/api/jigsaw/today', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setJigsawStatus(data); })
      .catch(() => {});

    fetch('http://localhost:8080/api/daily-movie/today', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setWordleStatus(data); })
      .catch(() => {});

    fetch('http://localhost:8080/api/movies/posters')
      .then(r => r.ok ? r.json() : [])
      .then(data => setPosters(data))
      .catch(() => {});

    fetch('http://localhost:8080/api/leaderboard', { headers })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setLeaderboard(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-cp-bg text-cp-text">

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-8 px-10 border-b border-white/7"
        style={{ height: 60, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div className="font-heading text-[1.3rem] tracking-[.1em] shrink-0">
          CINE<span className="text-cp-red">PULSE</span>
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div
            className="flex items-center gap-[6px] rounded-full px-[14px] py-[5px] font-code text-[11px] text-cp-gold whitespace-nowrap"
            style={{ background: 'rgba(244,196,48,.08)', border: '1px solid rgba(244,196,48,.2)' }}
          >
            🔥 {stats ? `${stats.streak} day streak` : '— streak'}
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-heading text-[13px] cursor-pointer shrink-0"
            style={{ background: 'linear-gradient(135deg, #e63946, #8b1c24)' }}
          >
            {initials}
          </div>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div className="max-w-[1300px] mx-auto px-10 py-8 pb-16">

        {/* ── GREETING + STATS ── */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-[1.75rem] tracking-[.04em]">
              {getGreeting()}{username ? `, ${username}` : ''} 👋
            </h1>
          </div>
          <div
            className="flex gap-[1px] rounded-[10px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.07)' }}
          >
            {([
              [stats ? String(stats.gamesPlayed ?? 0) : '—', 'Games'],
              [stats ? String(stats.streak) : '—', 'Streak'],
              [stats ? `#${stats.rank}` : '—', 'Rank'],
              [stats ? stats.totalScore.toLocaleString() : '—', 'Score'],
            ] as [string, string][]).map(([val, label]) => (
              <div key={label} className="px-6 py-3 bg-cp-surface text-center">
                <div className="font-heading text-2xl text-cp-gold leading-none">{val}</div>
                <div className="font-code text-[9px] tracking-[.12em] uppercase text-cp-muted mt-[3px]">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── HERO — today's quiz ── */}
        <div className="relative h-[300px] rounded-[14px] overflow-hidden mb-10 cursor-pointer group" onClick={() => router.push('/quiz')}>
          <div
            className="absolute inset-0 bg-cover bg-top transition-transform duration-500 group-hover:scale-[1.02]"
            style={{
              backgroundImage: `url(${TMDB_IMG}${quizHero?.themePosterPath ?? '/qJ2tW6WMUDux911r6m7haRef0WH.jpg'})`,
              filter: 'brightness(.65) saturate(.9)',
            }}
          />
          <div
            className="absolute inset-0 flex items-end p-10"
            style={{ background: 'linear-gradient(to right, rgba(8,8,15,.95) 35%, rgba(8,8,15,.3) 100%)' }}
          >
            <div className="max-w-[520px]">
              <div className="font-code text-[9px] tracking-[.18em] uppercase text-cp-red mb-[.6rem] flex items-center gap-[6px]">
                <span className="w-[5px] h-[5px] bg-cp-red rounded-full animate-pulse" />
                TODAY'S QUIZ THEME
              </div>
              <h2 className="font-heading text-[2.5rem] leading-none tracking-[.04em]">
                {quizHero ? quizHero.theme : '—'}
              </h2>
              <div className="flex items-center gap-4 mt-[.6rem] font-code text-[10px] text-white/40">
                <span>5 Questions</span>
                <span className="text-white/10">·</span>
                <span>All Categories</span>
                {quizHero?.alreadyCompleted && quizHero.previousScore != null && (
                  <>
                    <span className="text-white/10">·</span>
                    <span className="text-cp-gold">✓ Completed · {quizHero.previousScore} pts</span>
                  </>
                )}
              </div>
              <p className="font-body text-base font-light text-white/55 mt-[.6rem] leading-relaxed">
                Test your Bollywood knowledge — posters, dialogues, directors and release years.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  className="font-code text-[10px] tracking-[.1em] uppercase text-white rounded-[5px] px-[22px] py-[10px] cursor-pointer transition-colors border-0"
                  style={{ background: '#e63946' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#cf2f3b')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#e63946')}
                  onClick={e => { e.stopPropagation(); router.push('/quiz'); }}
                >
                  {quizHero?.alreadyCompleted ? 'Play Again' : 'Start Quiz'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── GAMES ── */}
        <div className="flex items-baseline justify-between mb-4">
          <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">🎮 Games</span>
        </div>
        <div
          className="flex gap-4 mb-10 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.07) transparent' }}
        >
          {GAME_CARDS.map((card) => {
            const isDone =
              card.name === 'Daily Quiz'      ? (quizHero?.alreadyCompleted ?? false) :
              card.name === 'Guess the Movie' ? (wordleStatus?.solved ?? false) :
              card.name === 'Poster Jigsaw'   ? (jigsawStatus?.completed ?? false) :
              false;
            return (
              <div
                key={card.name}
                onClick={() => card.route && router.push(card.route)}
                className={`shrink-0 w-[180px] bg-cp-surface border rounded-[10px] p-5 relative overflow-hidden transition-all ${card.route ? 'cursor-pointer hover:-translate-y-0.5' : 'opacity-50 cursor-default'} ${isDone ? 'border-green-900/60' : 'border-cp-border hover:border-white/15'}`}
              >
                <div className="absolute inset-0 pointer-events-none" style={{ background: `linear-gradient(135deg, ${card.glow} 0%, transparent 60%)` }} />
                {isDone && (
                  <span className="absolute top-3 right-3 font-code text-[10px] tracking-[.06em] uppercase px-[8px] py-[3px] rounded-[4px] flex items-center gap-1"
                    style={{ background: 'rgba(34,197,94,.18)', color: '#22c55e' }}>✓ done</span>
                )}
                <div className="text-[2rem] mb-[.85rem]">{card.icon}</div>
                <div className="font-heading text-[.95rem] tracking-[.04em] mb-[3px]">{card.name}</div>
                <div className="font-code text-[9px] text-cp-muted">{card.sub}</div>
                <span
                  className="inline-block mt-3 font-code text-[8px] tracking-[.08em] uppercase px-[7px] py-[3px] rounded-[3px]"
                  style={
                    card.badge === 'live' ? { background: 'rgba(34,197,94,.12)', color: '#22c55e' } :
                                            { background: 'rgba(255,255,255,.06)', color: '#6b7280' }
                  }
                >
                  {card.badge}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── LEADERBOARD + POSTER GRID ── */}
        <div className="grid grid-cols-[380px_1fr] gap-6">

          {/* LEADERBOARD */}
          <div>
            <div className="mb-4">
              <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">🏆 Leaderboard</span>
            </div>
            <div className="bg-cp-surface border border-cp-border rounded-[10px] p-5">
              {leaderboard && leaderboard.top7.length > 0 ? (
                <>
                  {leaderboard.top7.map((row) => {
                    const rankColor = row.rank === 1 ? 'text-cp-gold' : row.rank === 2 ? 'text-gray-400' : row.rank === 3 ? 'text-[#b45309]' : 'text-cp-muted';
                    const isPlayer = row.username === username.toLowerCase() || row.username === username;
                    return (
                      <div key={row.rank} className={`flex items-center gap-3 py-[9px] border-b border-cp-border ${isPlayer ? 'rounded-md -mx-1 px-1' : ''}`}
                        style={isPlayer ? { background: 'rgba(230,57,70,.06)' } : {}}>
                        <span className={`font-heading text-[.9rem] w-[22px] shrink-0 ${isPlayer ? 'text-cp-red' : rankColor}`}>#{row.rank}</span>
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-heading text-[11px] shrink-0"
                          style={{ background: isPlayer ? 'linear-gradient(135deg, #e63946, #8b1c24)' : 'rgba(255,255,255,.08)' }}
                        >
                          {row.username.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="font-body text-[.9rem] font-medium">{row.username}</div>
                        </div>
                        <span className="font-code text-[11px] text-cp-gold">{row.score.toLocaleString()}</span>
                      </div>
                    );
                  })}
                  {leaderboard.playerRank && !leaderboard.top7.some(r => r.username === username.toLowerCase() || r.username === username) && (
                    <>
                      <div className="py-[6px] text-center font-code text-[9px] text-cp-muted tracking-widest">···</div>
                      <div
                        className="flex items-center gap-3 py-[9px] rounded-md -mx-1 px-1"
                        style={{ background: 'rgba(230,57,70,.06)' }}
                      >
                        <span className="font-heading text-[.9rem] w-[22px] shrink-0 text-cp-red">#{leaderboard.playerRank.rank}</span>
                        <div
                          className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-heading text-[11px] shrink-0"
                          style={{ background: 'linear-gradient(135deg, #e63946, #8b1c24)' }}
                        >
                          {initials}
                        </div>
                        <div className="flex-1">
                          <div className="font-body text-[.9rem] font-medium">{username || 'You'}</div>
                        </div>
                        <span className="font-code text-[11px] text-cp-gold">{leaderboard.playerRank.score.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="py-4 text-center font-code text-[11px] text-cp-muted">No scores yet — play a game!</div>
                  {stats && stats.totalScore > 0 && (
                    <div
                      className="flex items-center gap-3 py-[9px] rounded-md -mx-1 px-1"
                      style={{ background: 'rgba(230,57,70,.06)' }}
                    >
                      <span className="font-heading text-[.9rem] w-[22px] shrink-0 text-cp-red">{stats ? `#${stats.rank}` : '—'}</span>
                      <div
                        className="w-[30px] h-[30px] rounded-full flex items-center justify-center font-heading text-[11px] shrink-0"
                        style={{ background: 'linear-gradient(135deg, #e63946, #8b1c24)' }}
                      >
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="font-body text-[.9rem] font-medium">{username || 'You'}</div>
                      </div>
                      <span className="font-code text-[11px] text-cp-gold">{stats ? stats.totalScore.toLocaleString() : '—'}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* BOLLYWOOD POSTER GRID */}
          <div>
            <div className="mb-4">
              <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">🎬 Bollywood Cinema</span>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {posters.slice(0, 10).map((path, i) => (
                <div key={i} className="rounded-[8px] overflow-hidden border border-cp-border group/p">
                  <img
                    src={`${TMDB_IMG}${path}`}
                    alt="poster"
                    className="w-full h-[130px] object-cover block transition-all duration-300 group-hover/p:scale-105 group-hover/p:brightness-110"
                    style={{ filter: 'saturate(.85)' }}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
