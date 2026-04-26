'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL!;

interface LeaderboardEntry { rank: number; username: string; score: number; }
interface LeaderboardData { top7: LeaderboardEntry[]; playerRank: LeaderboardEntry | null; }

function authHeaders() {
  const token = localStorage.getItem('cp_token');
  return { Authorization: `Bearer ${token}` };
}

export default function GameLeaderboard({ endpoint }: { endpoint: string }) {
  const [data, setData] = useState<LeaderboardData | null>(null);

  useEffect(() => {
    fetch(`${API}${endpoint}`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setData(d))
      .catch(() => {});
  }, [endpoint]);

  if (!data) return null;

  const { top7, playerRank } = data;
  const playerInTop7 = playerRank && top7.some(e => e.username === playerRank.username);

  if (top7.length === 0) return null;

  return (
    <div className="w-full mt-8">
      <p className="font-code text-[12px] tracking-[.15em] uppercase text-cp-muted mb-3">
        Today's Leaderboard
      </p>
      <div className="space-y-[5px]">
        {top7.map((entry) => {
          const isPlayer = playerRank?.username === entry.username;
          return (
            <div
              key={entry.rank}
              className="flex items-center gap-3 px-4 py-[10px] rounded-[8px]"
              style={{
                background: isPlayer ? 'rgba(244,196,48,.08)' : 'rgba(255,255,255,.04)',
                border: isPlayer ? '1px solid rgba(244,196,48,.3)' : '1px solid rgba(255,255,255,.07)',
              }}
            >
              <span
                className="font-heading text-base w-5 text-center shrink-0"
                style={{ color: entry.rank === 1 ? '#f4c430' : entry.rank === 2 ? '#9ca3af' : entry.rank === 3 ? '#b87333' : '#4b5563' }}
              >
                {entry.rank}
              </span>
              <span className="flex-1 font-body text-base text-cp-text truncate">{entry.username}</span>
              <span className="font-code text-[13px] text-cp-gold shrink-0">{entry.score} pts</span>
            </div>
          );
        })}

        {/* Player rank if outside top 7 */}
        {!playerInTop7 && playerRank && (
          <>
            <div className="flex items-center justify-center py-1">
              <span className="font-code text-[11px] text-cp-muted">···</span>
            </div>
            <div
              className="flex items-center gap-3 px-4 py-[10px] rounded-[8px]"
              style={{ background: 'rgba(244,196,48,.08)', border: '1px solid rgba(244,196,48,.3)' }}
            >
              <span className="font-heading text-base w-5 text-center shrink-0 text-cp-muted">
                {playerRank.rank}
              </span>
              <span className="flex-1 font-body text-base text-cp-gold truncate">{playerRank.username}</span>
              <span className="font-code text-[13px] text-cp-gold shrink-0">{playerRank.score} pts</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
