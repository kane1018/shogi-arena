"use client";

import { useParams, useRouter } from "next/navigation";
import {
  getGameRecordByMatch, getMatches, getParticipants, getTournament,
} from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { BracketView } from "@/components/BracketView";
import { ChampionBanner } from "@/components/ChampionBanner";
import { Card, CardHeader, Chip, EmptyState, Loading, PieceAvatar } from "@/components/ui";
import type { Match } from "@/lib/types";

export default function TournamentViewPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const mounted = useMounted();
  const tournament = useStoreValue(() => getTournament(id), null);
  const participants = useStoreValue(() => getParticipants(id), []);
  const matches = useStoreValue(() => getMatches(id), []);

  if (!mounted) return <Loading />;
  if (!tournament) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full">
        <Card>
          <EmptyState
            icon="香"
            title="大会が見つかりません"
            description="URLが正しいかご確認ください。この端末で作成された大会のみ表示できます。"
          />
        </Card>
      </div>
    );
  }

  const onMatchClick = (m: Match) => {
    const game = getGameRecordByMatch(m.id);
    if (game && game.moves.length > 0) {
      router.push(`/tournaments/${id}/matches/${m.id}/review`);
    }
  };

  const statusChip =
    tournament.status === "finished" ? (
      <Chip tone="gold">終了</Chip>
    ) : tournament.status === "ongoing" ? (
      <Chip tone="red">開催中</Chip>
    ) : (
      <Chip tone="gray">準備中</Chip>
    );

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full space-y-6">
      {/* 大会情報 */}
      <div className="anim-fade-in-up">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-serif-jp text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
          {statusChip}
        </div>
        <p className="text-sm text-sumi/55 mt-2">
          開催日: {tournament.date || "未定"}
          {tournament.adminName && ` ・ 主催: ${tournament.adminName}`}
          {` ・ 参加者: ${participants.filter((p) => p.status === "active").length}名`}
        </p>
        {tournament.description && (
          <p className="text-sm text-sumi/70 mt-3 max-w-2xl whitespace-pre-wrap">{tournament.description}</p>
        )}
      </div>

      <ChampionBanner tournament={tournament} participants={participants} />

      {/* トーナメント表 */}
      <Card className="p-5">
        <CardHeader title="トーナメント表" />
        {matches.length === 0 ? (
          <EmptyState
            icon="桂"
            title="組み合わせはまだ発表されていません"
            description="主催者がトーナメント表を生成するとここに表示されます。"
          />
        ) : (
          <div className="px-1 pb-2">
            <BracketView
              matches={matches}
              participants={participants}
              onMatchClick={onMatchClick}
            />
            <p className="text-xs text-sumi/45 mt-2">
              終了した対局をタップすると棋譜を再生できます。
            </p>
          </div>
        )}
      </Card>

      {/* 参加者 */}
      <Card className="p-5">
        <CardHeader title="参加者" />
        {participants.length === 0 ? (
          <EmptyState icon="歩" title="参加者はまだ登録されていません" />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 px-1 pb-2">
            {participants.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-xl border border-sumi/10 bg-white px-4 py-3 ${
                  p.status === "withdrawn" ? "opacity-50" : ""
                }`}
              >
                <PieceAvatar piece={p.avatar} size="sm" />
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {p.displayName}
                    {p.seed !== null && <Chip tone="gold" className="ml-1.5">シード{p.seed}</Chip>}
                    {p.status === "withdrawn" && <Chip tone="gray" className="ml-1.5">欠場</Chip>}
                  </p>
                  <p className="text-xs text-sumi/50 truncate">
                    {[p.rank, p.affiliation, p.favoriteOpening].filter(Boolean).join(" ・ ") || "—"}
                  </p>
                </div>
                <span className="ml-auto text-xs text-sumi/40 shrink-0">R{p.rating}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
