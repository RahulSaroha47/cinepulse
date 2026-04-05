'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const GAME_CARDS = [
  { icon: '🎯', name: 'Daily Quiz',   sub: '10 questions today',  badge: 'live', glow: 'rgba(230,57,70,.08)' },
  { icon: '🟨', name: 'Wordle',       sub: "Guess today's movie", badge: 'live', glow: 'rgba(244,196,48,.06)' },
  { icon: '🎳', name: 'Party Mode',   sub: 'Local multiplayer',   badge: 'new',  glow: 'rgba(139,92,246,.06)' },
  { icon: '🤖', name: 'AI Picks',     sub: 'Powered by Claude',   badge: 'new',  glow: 'rgba(34,197,94,.05)'  },
  { icon: '💬', name: 'Who Said It?', sub: 'Iconic dialogues',    badge: 'soon', glow: 'rgba(59,130,246,.05)' },
  { icon: '⭐', name: 'Reviews',      sub: 'AI summaries',        badge: 'soon', glow: 'rgba(244,196,48,.04)' },
];

const WATCHLIST_POSTERS = [
  '/hr9rjR3J0xBBKmlJ4n3gHId9ccx.jpg',
  '/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg',
  '/gmSRHU1Wtiatj8KoyVt8rT9ockx.jpg',
  '/1CoKNi3XVyijPCvy0usDbSWEXAg.jpg',
  '/ulzhLuWrPK07P1YkdWQLZnQh1JL.jpg',
  '/tjpiEnZBUAA8pdNPRKa5vP2Zpqw.jpg',
];

const LEADERBOARD = [
  { rank: '1',  rankClass: 'text-cp-gold',     name: 'CineKing',  streak: 28, score: '9,840', avatar: 'https://i.pravatar.cc/30?img=1' },
  { rank: '2',  rankClass: 'text-gray-400',    name: 'FilmFreak', streak: 15, score: '9,210', avatar: 'https://i.pravatar.cc/30?img=5' },
  { rank: '3',  rankClass: 'text-[#b45309]',   name: 'ReelQueen', streak: 9,  score: '8,990', avatar: 'https://i.pravatar.cc/30?img=8' },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

type UserStats = { streak: number; totalScore: number; rank: number; quizzesCompleted: number };

export default function Dashboard() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [initials, setInitials] = useState('?');
  const [stats, setStats] = useState<UserStats | null>(null);

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
    if (token) {
      fetch('http://localhost:8080/api/users/me/stats', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setStats(data); })
        .catch(() => {});
    }
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

        <div className="flex gap-[2px]">
          {['Home', 'Discover', 'Games', 'Social'].map((link, i) => (
            <a
              key={link}
              href="#"
              className={`font-code text-[10px] tracking-[.1em] uppercase px-[14px] py-[6px] rounded transition-all ${
                i === 0 ? 'text-cp-text' : 'text-cp-muted hover:text-cp-text hover:bg-white/5'
              }`}
            >
              {link}
            </a>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white/4 border border-white/7 rounded-md px-[14px] py-[7px] font-code text-[10px] text-cp-muted w-[200px] cursor-text">
            🔍&nbsp;&nbsp;Search films...
          </div>
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

        {/* GREETING + STATS */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-[1.75rem] tracking-[.04em]">
              {getGreeting()}{username ? `, ${username}` : ''} 👋
            </h1>
            <p className="font-body text-base font-light text-cp-muted mt-1">
              Daily quiz resets in 3h 42m — don't break the streak.
            </p>
          </div>
          <div
            className="flex gap-[1px] rounded-[10px] overflow-hidden"
            style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.07)' }}
          >
            {([
              [stats ? String(stats.quizzesCompleted) : '—', 'Quizzes'],
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

        {/* FEATURED HERO */}
        <div className="relative h-[300px] rounded-[14px] overflow-hidden mb-10 cursor-pointer group">
          <div
            className="absolute inset-0 bg-cover bg-top transition-transform duration-500 group-hover:scale-[1.02]"
            style={{
              backgroundImage: "url('https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg')",
              filter: 'brightness(.45) saturate(.8)',
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
                Christopher Nolan
              </h2>
              <div className="flex items-center gap-4 mt-[.6rem] font-code text-[10px] text-white/40">
                <span>10 Questions</span>
                <span className="text-white/10">·</span>
                <span>All Categories</span>
                <span className="text-white/10">·</span>
                <span className="text-cp-gold">🔥 3h 42m left</span>
              </div>
              <p className="font-body text-base font-light text-white/55 mt-[.6rem] leading-relaxed">
                Test your knowledge on the master of mind-bending cinema. From Memento to Oppenheimer.
              </p>
              <div className="flex gap-3 mt-5">
                <button
                  className="font-code text-[10px] tracking-[.1em] uppercase text-white rounded-[5px] px-[22px] py-[10px] cursor-pointer transition-colors border-0"
                  style={{ background: '#e63946' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#cf2f3b')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#e63946')}
                  onClick={() => router.push('/quiz')}
                >
                  Start Quiz
                </button>
                <button
                  className="font-code text-[10px] tracking-[.1em] uppercase text-cp-text rounded-[5px] px-[22px] py-[10px] cursor-pointer transition-colors"
                  style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.1)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.12)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,.07)')}
                >
                  View Films
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* GAMES & FEATURES */}
        <div className="flex items-baseline justify-between mb-4">
          <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">🎮 Games & Features</span>
        </div>
        <div
          className="flex gap-4 mb-10 overflow-x-auto pb-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,.07) transparent' }}
        >
          {GAME_CARDS.map((card) => (
            <div
              key={card.name}
              onClick={() => {
                if (card.name === 'Daily Quiz') router.push('/quiz');
                else if (card.name === 'Wordle') router.push('/wordle');
              }}
              className="shrink-0 w-[180px] bg-cp-surface border border-cp-border rounded-[10px] p-5 cursor-pointer transition-all hover:border-white/15 hover:-translate-y-0.5 relative overflow-hidden"
            >
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: `linear-gradient(135deg, ${card.glow} 0%, transparent 60%)` }}
              />
              <div className="text-[2rem] mb-[.85rem]">{card.icon}</div>
              <div className="font-heading text-[.95rem] tracking-[.04em] mb-[3px]">{card.name}</div>
              <div className="font-code text-[9px] text-cp-muted">{card.sub}</div>
              <span
                className="inline-block mt-3 font-code text-[8px] tracking-[.08em] uppercase px-[7px] py-[3px] rounded-[3px]"
                style={
                  card.badge === 'live' ? { background: 'rgba(34,197,94,.12)', color: '#22c55e' } :
                  card.badge === 'new'  ? { background: 'rgba(244,196,48,.12)', color: '#f4c430' } :
                                          { background: 'rgba(255,255,255,.06)', color: '#6b7280' }
                }
              >
                {card.badge}
              </span>
            </div>
          ))}
        </div>

        {/* WATCHLIST + LEADERBOARD */}
        <div className="grid grid-cols-[1fr_320px] gap-6">

          {/* WATCHLIST */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">📌 Your Watchlist</span>
              <a href="#" className="font-code text-[9px] tracking-[.1em] uppercase text-cp-red">View all →</a>
            </div>
            <div className="flex gap-[10px] flex-wrap">
              {WATCHLIST_POSTERS.map((path) => (
                <div key={path} className="w-[90px] rounded-md overflow-hidden cursor-pointer group/poster">
                  <img
                    src={`https://image.tmdb.org/t/p/w500${path}`}
                    alt="poster"
                    className="w-full h-[134px] object-cover block transition-all"
                    style={{ filter: 'saturate(.8)' }}
                    onMouseEnter={e => (e.currentTarget.style.filter = 'saturate(1) scale(1.04)')}
                    onMouseLeave={e => (e.currentTarget.style.filter = 'saturate(.8)')}
                  />
                </div>
              ))}
              <div
                className="w-[90px] h-[134px] rounded-md flex items-center justify-center cursor-pointer text-cp-muted text-2xl transition-all"
                style={{ border: '1px dashed rgba(255,255,255,.12)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = '#e63946';
                  e.currentTarget.style.color = '#e63946';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,.12)';
                  e.currentTarget.style.color = '#6b7280';
                }}
              >
                +
              </div>
            </div>
          </div>

          {/* LEADERBOARD */}
          <div>
            <div className="flex items-baseline justify-between mb-4">
              <span className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">🏆 Leaderboard</span>
              <a href="#" className="font-code text-[9px] tracking-[.1em] uppercase text-cp-red">Full board →</a>
            </div>
            <div className="bg-cp-surface border border-cp-border rounded-[10px] p-5">
              {LEADERBOARD.map((row) => (
                <div key={row.name} className="flex items-center gap-3 py-[9px] border-b border-cp-border">
                  <span className={`font-heading text-[.9rem] w-[22px] shrink-0 ${row.rankClass}`}>{row.rank}</span>
                  <img src={row.avatar} alt={row.name} className="w-[30px] h-[30px] rounded-full object-cover shrink-0" />
                  <div className="flex-1">
                    <div className="font-body text-[.9rem] font-medium">{row.name}</div>
                    <div className="font-code text-[9px] text-cp-muted mt-[1px]">🔥 {row.streak} streak</div>
                  </div>
                  <span className="font-code text-[11px] text-cp-gold">{row.score}</span>
                </div>
              ))}
              {/* Current user row */}
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
                  <div className="font-body text-[.9rem] font-medium">You</div>
                  <div className="font-code text-[9px] text-cp-muted mt-[1px]">🔥 {stats ? `${stats.streak} streak` : '—'}</div>
                </div>
                <span className="font-code text-[11px] text-cp-gold">{stats ? stats.totalScore.toLocaleString() : '—'}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
