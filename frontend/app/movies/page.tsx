'use client';

import { useEffect, useState, useRef } from 'react';
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

const MOVIES_CACHE_KEY = 'cp_movies_v1';
const MOVIES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function readCache(): Movie[] | null {
  try {
    const raw = localStorage.getItem(MOVIES_CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > MOVIES_CACHE_TTL) return null;
    return data;
  } catch { return null; }
}

function writeCache(data: Movie[]) {
  try { localStorage.setItem(MOVIES_CACHE_KEY, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

export default function MoviesPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function fetchMovies(q: string) {
    // Serve from localStorage cache for the default (no search) case
    if (!q) {
      const cached = readCache();
      if (cached) { setMovies(cached); setLoading(false); return; }
    }
    setLoading(true);
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/movies?search=${encodeURIComponent(q)}`;
    fetch(url)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMovies(data); setLoading(false); if (!q) writeCache(data); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { fetchMovies(''); }, []);

  function handleSearch(val: string) {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMovies(val.trim()), 350);
  }

  return (
    <div className="min-h-screen bg-cp-bg text-cp-text">

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-4 md:gap-8 px-4 md:px-10 border-b border-white/7"
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

      <div className="max-w-[1300px] mx-auto px-4 md:px-10 py-6 md:py-8 pb-16">

        {/* ── HEADER ── */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="font-heading text-[1.75rem] tracking-[.04em]">🎬 Bollywood Films</h1>
            <p className="font-code text-[10px] text-cp-muted mt-1">
              {loading ? '—' : search.trim() ? `${movies.length} results` : `${movies.length} films shown · search to filter all`}
            </p>
          </div>
          {/* Search */}
          <input
            type="text"
            placeholder="Search by title or genre..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="w-full md:w-[280px] bg-cp-surface border border-cp-border rounded-[8px] text-cp-text font-code text-[11px] px-4 py-[9px] outline-none"
            style={{ caretColor: '#e63946' }}
          />
        </div>

        {/* ── GRID ── */}
        {loading ? (
          <div className="font-code text-[11px] text-cp-muted py-20 text-center">Loading films...</div>
        ) : movies.length === 0 ? (
          <div className="font-code text-[11px] text-cp-muted py-20 text-center">No films found.</div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-4">
            {movies.map(m => (
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
