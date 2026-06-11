"use client";

// 優勝者・準優勝・3位の表彰バナー
import type { Participant, Tournament } from "@/lib/types";
import { PieceAvatar } from "./ui";

export function ChampionBanner({
  tournament,
  participants,
}: {
  tournament: Tournament;
  participants: Participant[];
}) {
  if (!tournament.winnerParticipantId) return null;
  const find = (id: string | null) => participants.find((p) => p.id === id) ?? null;
  const champion = find(tournament.winnerParticipantId);
  const runnerUp = find(tournament.runnerUpParticipantId);
  const third = find(tournament.thirdPlaceParticipantId);
  if (!champion) return null;

  return (
    <div className="champion-banner rounded-2xl p-[2px] shadow-lg anim-pop-in">
      <div className="bg-sumi rounded-2xl px-6 py-7 text-center text-washi relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 board-wood" />
        <p className="relative font-serif-jp text-kogane-light tracking-[0.4em] text-xs">優勝</p>
        <div className="relative flex items-center justify-center gap-4 mt-3">
          <PieceAvatar piece={champion.avatar} size="md" />
          <div className="text-left">
            <p className="font-serif-jp text-2xl sm:text-3xl font-bold">{champion.displayName}</p>
            {champion.rank && <p className="text-sm text-washi/60 mt-0.5">{champion.rank}</p>}
          </div>
        </div>
        {(runnerUp || third) && (
          <div className="relative flex justify-center gap-8 mt-5 pt-4 border-t border-washi/15 text-sm">
            {runnerUp && (
              <p>
                <span className="text-washi/50 text-xs mr-2">準優勝</span>
                <span className="font-serif-jp font-bold">{runnerUp.displayName}</span>
              </p>
            )}
            {third && (
              <p>
                <span className="text-washi/50 text-xs mr-2">第3位</span>
                <span className="font-serif-jp font-bold">{third.displayName}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
