'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

type Movie = {
  id: number;
  title: string;
  posterPath: string;
  releaseYear: number;
  genre: string;
  avgRating: number;
  reviewCount: number;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span style={{ color: '#f4c430', fontSize: 11, letterSpacing: 1 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

export default function MoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8080/api/movies')
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMovies(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return movies;
    const q = search.toLowerCase();
    return movies.filter(m =>
      m.title.toLowerCase().includes(q) ||
      (m.genre ?? '').toLowerCase().includes(q)
    );
  }, [movies, search]);

  return (
    <div className="min-h-screen bg-cp-bg text-cp-text">

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-8 px-10 border-b border-white/7"
        style={{ height: 60, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div
          className="font-heading text-[1.3rem] tracking-[.1em] shrink-0 cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          CINE<span className="text-cp-red">PULSE</span>
        </div>
        <div className="font-code text-[10px] tracking-[.15em] uppercase text-cp-muted">
          / Bollywood Films
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="ml-auto font-code text-[10px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
        >
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-[1300px] mx-auto px-10 py-8 pb-16">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-[1.75rem] tracking-[.04em]">🎬 Bollywood Films</h1>
            <p className="font-code text-[10px] text-cp-muted mt-1">
              {loading ? '—' : `${movies.length} films · click to read reviews`}
            </p>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by title or genre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-[280px] bg-cp-surface border border-cp-border rounded-[8px] text-cp-text font-code text-[11px] px-4 py-[9px] outline-none"
            style={{ caretColor: '#e63946' }}
          />
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="font-code text-[11px] text-cp-muted py-20 text-center">Loading films...</div>
        ) : filtered.length === 0 ? (
          <div className="font-code text-[11px] text-cp-muted py-20 text-center">No films found.</div>
        ) : (
          <div className="grid grid-cols-7 gap-4">
            {filtered.map(m => (
              <div
                key={m.id}
                onClick={() => router.push(`/movies/${m.id}`)}
                className="cursor-pointer group"
              >
                <div className="rounded-[8px] overflow-hidden border border-cp-border mb-2 transition-all duration-200 group-hover:border-white/20 group-hover:-translate-y-0.5">
                  {m.posterPath ? (
                    <img
                      src={`${TMDB_IMG}${m.posterPath}`}
                      alt={m.title}
                      className="w-full h-[160px] object-cover block transition-all duration-300 group-hover:brightness-110"
                      style={{ filter: 'saturate(.85)' }}
                    />
                  ) : (
                    <div
                      className="w-full h-[160px] flex items-center justify-center font-heading text-[11px] text-cp-muted"
                      style={{ background: 'var(--cp-surface)' }}
                    >
                      NO POSTER
                    </div>
                  )}
                </div>
                <div className="font-heading text-[11px] tracking-[.04em] leading-tight truncate">{m.title}</div>
                <div className="flex items-center gap-2 mt-[3px]">
                  {m.avgRating > 0 ? (
                    <Stars rating={m.avgRating} />
                  ) : (
                    <span className="font-code text-[9px] text-cp-muted">No reviews</span>
                  )}
                  {m.reviewCount > 0 && (
                    <span className="font-code text-[9px] text-cp-muted">{m.reviewCount}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
