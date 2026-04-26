'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';

const TMDB_IMG = 'https://image.tmdb.org/t/p/w500';

type MovieDetail = {
  id: number;
  title: string;
  posterPath: string;
  releaseYear: number;
  overview: string;
  genre: string;
  language: string;
  director: string;
  cast: string;
  tagline: string;
  avgRating: number;
  reviewCount: number;
  userReviewed: boolean;
  inWatchlist: boolean;
};

type Review = {
  id: number;
  username: string;
  rating: number;
  body: string;
  createdAt: string;
};

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ color: '#f4c430', fontSize: size, letterSpacing: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ opacity: i <= Math.round(rating) ? 1 : 0.2 }}>★</span>
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          onClick={() => onChange(i)}
          onMouseEnter={() => setHover(i)}
          onMouseLeave={() => setHover(0)}
          style={{
            fontSize: 22, cursor: 'pointer', color: '#f4c430',
            opacity: i <= (hover || value) ? 1 : 0.2,
            transition: 'opacity .1s',
          }}
        >★</span>
      ))}
    </div>
  );
}

function Avatar({ name, bg }: { name: string; bg?: string }) {
  return (
    <div style={{
      width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
      background: bg ?? 'linear-gradient(135deg, #e63946, #8b1c24)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--font-anton)', fontSize: 12, color: '#fff',
    }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

const AVATAR_COLORS = [
  'linear-gradient(135deg,#7c3aed,#4c1d95)',
  'linear-gradient(135deg,#059669,#065f46)',
  'linear-gradient(135deg,#d97706,#92400e)',
  'linear-gradient(135deg,#0284c7,#0c4a6e)',
  'linear-gradient(135deg,#db2777,#831843)',
];

function avatarColor(username: string) {
  let n = 0;
  for (const c of username) n += c.charCodeAt(0);
  return AVATAR_COLORS[n % AVATAR_COLORS.length];
}

export default function MoviePage() {
  const router = useRouter();
  const params = useParams();
  const movieId = params.id as string;

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  const token = typeof window !== 'undefined' ? localStorage.getItem('cp_token') : null;
  const currentUser = typeof window !== 'undefined' ? (() => {
    try { return JSON.parse(localStorage.getItem('cp_user') ?? '{}').username ?? ''; } catch { return ''; }
  })() : '';

  useEffect(() => {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${movieId}`, { headers }).then(r => r.ok ? r.json() : null),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${movieId}/reviews`).then(r => r.ok ? r.json() : []),
    ]).then(([detail, revs]) => {
      if (detail) setMovie(detail);
      setReviews(revs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [movieId]);

  async function toggleWatchlist() {
    if (!token) { router.push('/login'); return; }
    if (!movie) return;
    setWatchlistLoading(true);
    const method = movie.inWatchlist ? 'DELETE' : 'POST';
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/watchlist/${movie.id}`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      setMovie(prev => prev ? { ...prev, inWatchlist: data.inWatchlist } : prev);
    }
    setWatchlistLoading(false);
  }

  async function submitReview() {
    if (!token) { router.push('/login'); return; }
    if (rating === 0) { setSubmitError('Please select a rating.'); return; }
    if (!body.trim()) { setSubmitError('Please write something about this film.'); return; }

    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/movies/${movieId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating, body }),
      });
      if (res.ok) {
        const newReview: Review = await res.json();
        setReviews(prev => [newReview, ...prev]);
        setMovie(prev => prev ? {
          ...prev,
          reviewCount: prev.reviewCount + 1,
          avgRating: parseFloat(((prev.avgRating * prev.reviewCount + rating) / (prev.reviewCount + 1)).toFixed(1)),
          userReviewed: true,
        } : prev);
        setRating(0);
        setBody('');
      } else {
        const err = await res.json();
        setSubmitError(err.message ?? 'Failed to submit review.');
      }
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cp-bg flex items-center justify-center font-code text-[11px] text-cp-muted">
        Loading...
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-cp-bg flex items-center justify-center font-code text-[11px] text-cp-muted">
        Film not found.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cp-bg text-cp-text" style={{ position: 'relative' }}>

      {/* ── BLURRED BG ── */}
      {movie.posterPath && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundImage: `url(${TMDB_IMG}${movie.posterPath})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'blur(80px) brightness(.12) saturate(.5)',
          }}
        />
      )}

      {/* ── NAVBAR ── */}
      <nav
        className="sticky top-0 z-50 flex items-center gap-4 px-10 border-b border-white/7"
        style={{ height: 60, background: 'rgba(8,8,15,0.95)', backdropFilter: 'blur(12px)' }}
      >
        <div
          className="font-heading text-[1.3rem] tracking-[.1em] shrink-0 cursor-pointer"
          onClick={() => router.push('/dashboard')}
        >
          CINE<span className="text-cp-red">PULSE</span>
        </div>
        <span className="font-code text-[10px] text-cp-muted">/ Films /</span>
        <span className="font-heading text-[13px] tracking-[.04em] truncate max-w-[300px]">{movie.title}</span>
        <button
          onClick={() => router.push('/movies')}
          className="ml-auto font-code text-[10px] tracking-[.1em] uppercase text-cp-muted hover:text-cp-text transition-colors"
        >
          ← All Films
        </button>
      </nav>

      {/* ── MAIN ── */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-10 py-10 pb-20">
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 48 }}>

          {/* ── LEFT — poster + metadata ── */}
          <div>
            <div style={{
              borderRadius: 10, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,.7)',
              border: '1px solid var(--cp-border)',
            }}>
              {movie.posterPath ? (
                <img src={`${TMDB_IMG}${movie.posterPath}`} alt={movie.title} style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{
                  width: '100%', height: 380, background: 'var(--cp-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-anton)', fontSize: 12, color: 'var(--cp-muted)',
                }}>NO POSTER</div>
              )}
            </div>

            {/* Meta */}
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                ['Director', movie.director],
                ['Genre', movie.genre],
                ['Year', movie.releaseYear?.toString()],
                ['Language', movie.language],
                ['Cast', movie.cast],
              ].filter(([, v]) => v).map(([label, val], i, arr) => (
                <div key={label}>
                  <div style={{ padding: '10px 0' }}>
                    <div className="font-code" style={{ fontSize: 8, textTransform: 'uppercase', letterSpacing: '.14em', color: 'var(--cp-muted)', marginBottom: 3 }}>{label}</div>
                    <div className="font-body" style={{ fontSize: 14, color: 'var(--cp-text)', lineHeight: 1.5 }}>{val}</div>
                  </div>
                  {i < arr.length - 1 && <div style={{ height: 1, background: 'var(--cp-border)' }} />}
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT — info + reviews ── */}
          <div>
            {/* Title + tagline */}
            <h1 className="font-heading" style={{ fontSize: '2.4rem', letterSpacing: '.04em', lineHeight: 1 }}>
              {movie.title}
            </h1>
            {movie.tagline && (
              <p className="font-body" style={{ fontStyle: 'italic', fontSize: '1.1rem', color: 'var(--cp-muted)', marginTop: 6 }}>
                "{movie.tagline}"
              </p>
            )}

            {/* Rating bar */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 16, marginTop: 20,
              padding: '16px 20px', background: 'var(--cp-surface)',
              border: '1px solid var(--cp-border)', borderRadius: 10,
            }}>
              <div className="font-heading" style={{ fontSize: '2.6rem', color: '#f4c430', lineHeight: 1 }}>
                {movie.avgRating > 0 ? movie.avgRating.toFixed(1) : '—'}
              </div>
              <div>
                {movie.avgRating > 0 && <Stars rating={movie.avgRating} />}
                <div className="font-code" style={{ fontSize: 9, color: 'var(--cp-muted)', marginTop: 3 }}>
                  {movie.reviewCount > 0 ? `${movie.reviewCount} review${movie.reviewCount === 1 ? '' : 's'}` : 'No reviews yet'}
                </div>
              </div>
            </div>

            {/* Watchlist button */}
            <button
              onClick={toggleWatchlist}
              disabled={watchlistLoading}
              style={{
                marginTop: 12, display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 18px', borderRadius: 8, cursor: watchlistLoading ? 'default' : 'pointer',
                fontFamily: 'var(--font-space-mono)', fontSize: 10, letterSpacing: '.1em',
                textTransform: 'uppercase', transition: 'all .15s',
                background: movie.inWatchlist ? 'rgba(244,196,48,.1)' : 'transparent',
                border: movie.inWatchlist ? '1px solid rgba(244,196,48,.4)' : '1px solid var(--cp-border)',
                color: movie.inWatchlist ? '#f4c430' : 'var(--cp-muted)',
              }}
            >
              <span style={{ fontSize: 14 }}>{movie.inWatchlist ? '🔖' : '＋'}</span>
              {watchlistLoading ? '...' : movie.inWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
            </button>

            {/* Overview */}
            {movie.overview && (
              <p className="font-body" style={{ fontSize: 15, color: 'rgba(241,240,251,.6)', marginTop: 18, lineHeight: 1.75 }}>
                {movie.overview}
              </p>
            )}

            {/* ── WRITE REVIEW ── */}
            <div style={{ marginTop: 32 }}>
              <div className="font-code" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--cp-muted)', marginBottom: 14 }}>
                ✍ Write a Review
              </div>

              {!token ? (
                <div style={{
                  padding: '16px 20px', background: 'var(--cp-surface)',
                  border: '1px solid var(--cp-border)', borderRadius: 10,
                  fontFamily: 'var(--font-space-mono)', fontSize: 11, color: 'var(--cp-muted)',
                }}>
                  <span
                    onClick={() => router.push('/login')}
                    style={{ color: 'var(--cp-red)', cursor: 'pointer' }}
                  >Sign in</span> to write a review.
                </div>
              ) : movie.userReviewed ? (
                <div style={{
                  padding: '16px 20px', background: 'rgba(34,197,94,.07)',
                  border: '1px solid rgba(34,197,94,.2)', borderRadius: 10,
                  fontFamily: 'var(--font-space-mono)', fontSize: 11, color: '#22c55e',
                }}>
                  ✓ You've reviewed this film.
                </div>
              ) : (
                <div style={{
                  padding: '18px 20px', background: 'var(--cp-surface)',
                  border: '1px solid var(--cp-border)', borderRadius: 10,
                }}>
                  <StarPicker value={rating} onChange={setRating} />
                  <textarea
                    rows={3}
                    placeholder="What did you think of this film?"
                    value={body}
                    onChange={e => { setBody(e.target.value); setSubmitError(''); }}
                    style={{
                      width: '100%', background: 'rgba(255,255,255,.04)',
                      border: '1px solid var(--cp-border)', borderRadius: 6,
                      color: 'var(--cp-text)', fontFamily: 'var(--font-cormorant)', fontSize: 15,
                      padding: '10px 12px', resize: 'none', outline: 'none',
                    }}
                  />
                  {submitError && (
                    <div className="font-code" style={{ fontSize: 10, color: 'var(--cp-red)', marginTop: 6 }}>{submitError}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                    <button
                      onClick={submitReview}
                      disabled={submitting}
                      className="font-code"
                      style={{
                        fontSize: 10, textTransform: 'uppercase', letterSpacing: '.1em',
                        color: '#fff', background: submitting ? '#6b7280' : '#e63946',
                        border: 'none', padding: '9px 22px', borderRadius: 5,
                        cursor: submitting ? 'default' : 'pointer',
                      }}
                    >
                      {submitting ? 'Posting...' : 'Post Review'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── REVIEWS LIST ── */}
            <div style={{ marginTop: 32 }}>
              <div className="font-code" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '.15em', color: 'var(--cp-muted)', marginBottom: 14 }}>
                💬 Community Reviews
              </div>

              {reviews.length === 0 ? (
                <div className="font-code" style={{ fontSize: 11, color: 'var(--cp-muted)', padding: '20px 0' }}>
                  No reviews yet. Be the first!
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {reviews.map(r => (
                    <div
                      key={r.id}
                      style={{
                        background: r.username === currentUser ? 'rgba(230,57,70,.05)' : 'var(--cp-surface)',
                        border: `1px solid ${r.username === currentUser ? 'rgba(230,57,70,.2)' : 'var(--cp-border)'}`,
                        borderRadius: 10, padding: '16px 18px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <Avatar name={r.username} bg={r.username === currentUser ? undefined : avatarColor(r.username)} />
                        <div>
                          <div className="font-body" style={{ fontSize: 15, fontWeight: 600 }}>{r.username}</div>
                          <Stars rating={r.rating} size={11} />
                        </div>
                        <div className="font-code" style={{ marginLeft: 'auto', fontSize: 9, color: 'var(--cp-muted)' }}>
                          {r.createdAt}
                        </div>
                      </div>
                      <p className="font-body" style={{ fontSize: 15, color: 'rgba(241,240,251,.75)', lineHeight: 1.65 }}>
                        {r.body}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
