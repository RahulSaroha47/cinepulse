'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';
const API = process.env.NEXT_PUBLIC_API_URL!;

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

export default function WatchlistPage() {
  const router = useRouter();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('cp_token');
    if (!token) { router.push('/login'); return; }
    fetch(`${API}/api/watchlist`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => { setMovies(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function remove(movieId: number) {
    setRemoving(movieId);
    const token = localStorage.getItem('cp_token');
    await fetch(`${API}/api/watchlist/${movieId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setMovies(prev => prev.filter(m => m.id !== movieId));
    setRemoving(null);
  }

  return (
    <div className="min-h-screen bg-cp-bg text-cp-text">

      {/* NAVBAR */}
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
          / Watchlist
        </div>
        <button
          onClick={() => router.push('/dashboard')}
          className="ml-auto font-code text-[10px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
        >
          ← Dashboard
        </button>
      </nav>

      <div className="max-w-[1300px] mx-auto px-10 py-8 pb-16">

        <div className="mb-6">
          <h1 className="font-heading text-[1.75rem] tracking-[.04em]">🔖 My Watchlist</h1>
          <p className="font-code text-[10px] text-cp-muted mt-1">
            {loading ? '—' : `${movies.length} saved film${movies.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {loading ? (
          <div className="font-code text-[11px] text-cp-muted py-20 text-center">Loading...</div>
        ) : movies.length === 0 ? (
          <div className="flex flex-col items-center py-24 gap-4">
            <div className="text-4xl">🎞️</div>
            <p className="font-code text-[12px] text-cp-muted">No films saved yet.</p>
            <button
              onClick={() => router.push('/movies')}
              className="btn-primary mt-2 font-code text-[11px] px-6 py-2"
            >
              Browse Films
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-7 gap-4">
            {movies.map(m => (
              <div key={m.id} className="group relative">
                {/* Remove button */}
                <button
                  onClick={() => remove(m.id)}
                  disabled={removing === m.id}
                  className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-black/70 flex items-center justify-center text-cp-muted hover:text-cp-red hover:bg-black/90 transition-all opacity-0 group-hover:opacity-100"
                  title="Remove from watchlist"
                >
                  <span style={{ fontSize: 12, lineHeight: 1 }}>×</span>
                </button>

                <div
                  onClick={() => router.push(`/movies/${m.id}`)}
                  className="cursor-pointer"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
