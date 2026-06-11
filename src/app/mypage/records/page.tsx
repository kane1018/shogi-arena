"use client";

// 戦歴一覧
import Link from "next/link";
import { getPersonalRecords, getProfile } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { computeOpponentStats, computeStats, computeTournamentStats } from "@/lib/stats";
import { Card, CardHeader, Chip, EmptyState, Loading } from "@/components/ui";

export default function RecordsPage() {
  const mounted = useMounted();
  const profile = useStoreValue(() => getProfile(), null);
  const records = useStoreValue(() => (profile ? getPersonalRecords(profile.id) : []), []);

  if (!mounted || !profile) return <Loading />;
  const stats = computeStats(records);
  const opponents = computeOpponentStats(records);
  const tournaments = computeTournamentStats(records);
  const sorted = [...records].sort(
    (a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime()
  );

  const pct = (w: number, g: number) => (g > 0 ? `${Math.round((w / g) * 100)}%` : "—");

  return (
    <div className="space-y-6">
      {/* 詳細統計 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          ["通算", `${stats.total}局`],
          ["勝敗", `${stats.wins}勝${stats.losses}敗`],
          ["勝率", `${stats.winRate}%`],
          ["連勝中", `${stats.currentStreak}`],
          ["最多連勝", `${stats.maxStreak}`],
          ["先手勝率", pct(stats.senteWins, stats.senteGames)],
          ["後手勝率", pct(stats.goteWins, stats.goteGames)],
          ["優勝/準優勝", `${stats.championships}/${stats.runnerUps}回`],
        ].map(([label, value]) => (
          <Card key={label} className="p-3 text-center">
            <p className="text-[11px] text-sumi/50">{label}</p>
            <p className="font-serif-jp text-lg font-bold mt-0.5">{value}</p>
          </Card>
        ))}
      </div>

      {records.length === 0 ? (
        <Card>
          <EmptyState
            icon="歩"
            title="まだ戦歴がありません"
            description={`大会に「${profile.displayName}」の名前で参加して対局すると、自動的に戦歴が記録されます。`}
          />
        </Card>
      ) : (
        <>
          {/* 対局履歴 */}
          <Card>
            <CardHeader title={`対局履歴(${records.length}局)`} />
            <div className="px-5 pb-5 space-y-2">
              {sorted.map((r) => (
                <Link
                  key={r.id}
                  href={`/tournaments/${r.tournamentId}/matches/${r.matchId}/review`}
                  className="flex items-center gap-3 rounded-xl border border-sumi/10 bg-white px-4 py-2.5 hover:border-kogane transition"
                >
                  <Chip tone={r.result === "win" ? "gold" : r.result === "lose" ? "gray" : "blue"}>
                    {r.result === "win" ? "勝ち" : r.result === "lose" ? "負け" : "引分"}
                  </Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.isSente ? "☗先手" : "☖後手"} 対 {r.opponentName}
                    </p>
                    <p className="text-xs text-sumi/50 truncate">
                      {new Date(r.playedAt).toLocaleDateString("ja-JP")} ・ {r.tournamentName}
                    </p>
                  </div>
                  {r.ratingDelta !== 0 && (
                    <span className={`text-xs font-mono shrink-0 ${r.ratingDelta > 0 ? "text-fukamidori" : "text-shu"}`}>
                      {r.ratingDelta > 0 ? "+" : ""}{r.ratingDelta}
                    </span>
                  )}
                  <span className="text-xs text-sumi/40 shrink-0">棋譜 →</span>
                </Link>
              ))}
            </div>
          </Card>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* 対戦相手別 */}
            <Card>
              <CardHeader title="対戦相手別成績" />
              <div className="px-5 pb-5 space-y-1.5">
                {opponents.map((o) => (
                  <div key={o.name} className="flex items-center justify-between rounded-lg bg-white border border-sumi/8 px-3.5 py-2 text-sm">
                    <span className="font-medium truncate">{o.name}</span>
                    <span className="text-sumi/60 shrink-0 font-mono text-xs">
                      {o.wins}勝{o.losses}敗({pct(o.wins, o.wins + o.losses)})
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* 大会別 */}
            <Card>
              <CardHeader title="大会別成績" />
              <div className="px-5 pb-5 space-y-1.5">
                {tournaments.map((t) => (
                  <Link key={t.tournamentId} href={`/tournaments/${t.tournamentId}`}
                    className="flex items-center justify-between rounded-lg bg-white border border-sumi/8 px-3.5 py-2 text-sm hover:border-kogane transition">
                    <span className="font-medium truncate">{t.name}</span>
                    <span className="text-sumi/60 shrink-0 font-mono text-xs">
                      {t.wins}勝{t.losses}敗
                    </span>
                  </Link>
                ))}
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
