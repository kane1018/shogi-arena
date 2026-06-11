"use client";

// マイページ: 概要タブ
import Link from "next/link";
import { BADGES, getPersonalRecords, getProfile, getUserBadges } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { computeStats, myTournaments } from "@/lib/stats";
import { Button, Card, CardHeader, Chip, EmptyState, Loading, PieceAvatar } from "@/components/ui";

export default function MyPageOverview() {
  const mounted = useMounted();
  const profile = useStoreValue(() => getProfile(), null);
  const records = useStoreValue(() => (profile ? getPersonalRecords(profile.id) : []), []);
  const badges = useStoreValue(() => (profile ? getUserBadges(profile.id) : []), []);

  if (!mounted || !profile) return <Loading />;
  const stats = computeStats(records);
  const recent = [...records]
    .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime())
    .slice(0, 5);
  const tournaments = myTournaments(records).slice(0, 4);
  const badgeDefs = badges
    .map((ub) => BADGES.find((b) => b.id === ub.badgeId))
    .filter((b): b is NonNullable<typeof b> => Boolean(b));

  return (
    <div className="space-y-6">
      {/* プロフィールヘッダー */}
      <Card className="p-6 anim-fade-in-up">
        <div className="flex items-center gap-5 flex-wrap">
          <PieceAvatar piece={profile.avatar} size="lg" />
          <div className="flex-1 min-w-40">
            <h2 className="font-serif-jp text-2xl font-bold">{profile.displayName}</h2>
            <div className="flex gap-2 mt-2 flex-wrap">
              {profile.rank && <Chip tone="gold">{profile.rank}</Chip>}
              {profile.favoriteOpening && <Chip tone="green">{profile.favoriteOpening}</Chip>}
              <Chip tone="blue">参考レート {profile.rating}</Chip>
            </div>
            {profile.bio && <p className="text-sm text-sumi/65 mt-3 max-w-lg">{profile.bio}</p>}
          </div>
          <Link href="/mypage/profile">
            <Button variant="secondary">プロフィール編集</Button>
          </Link>
        </div>
      </Card>

      {/* 成績カード */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {[
          ["通算対局", `${stats.total}局`],
          ["勝利", `${stats.wins}勝`],
          ["敗北", `${stats.losses}敗`],
          ["勝率", `${stats.winRate}%`],
          ["優勝", `${stats.championships}回`],
          ["最多連勝", `${stats.maxStreak}連勝`],
        ].map(([label, value], i) => (
          <Card key={label} className="p-4 text-center anim-fade-in-up" >
            <div style={{ animationDelay: `${i * 0.05}s` }}>
              <p className="text-xs text-sumi/50">{label}</p>
              <p className="font-serif-jp text-xl font-bold mt-1">{value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* 最近の対局 */}
        <Card>
          <CardHeader
            title="最近の対局"
            action={<Link href="/mypage/records" className="text-xs text-kogane hover:underline">すべて見る →</Link>}
          />
          {recent.length === 0 ? (
            <EmptyState
              icon="歩"
              title="まだ対局がありません"
              description="大会で対局すると、自動的にここに戦歴が残ります。プロフィールの表示名と同じ名前で大会に参加してください。"
            />
          ) : (
            <div className="px-5 pb-5 space-y-2">
              {recent.map((r) => (
                <Link key={r.id} href={`/tournaments/${r.tournamentId}/matches/${r.matchId}/review`}
                  className="flex items-center gap-3 rounded-xl border border-sumi/10 bg-white px-4 py-2.5 hover:border-kogane transition">
                  <Chip tone={r.result === "win" ? "gold" : r.result === "lose" ? "gray" : "blue"}>
                    {r.result === "win" ? "勝" : r.result === "lose" ? "負" : "分"}
                  </Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {r.isSente ? "☗" : "☖"} 対 {r.opponentName}
                    </p>
                    <p className="text-xs text-sumi/50 truncate">
                      {new Date(r.playedAt).toLocaleDateString("ja-JP")} ・ {r.tournamentName}
                    </p>
                  </div>
                  <span className="text-xs text-sumi/40 shrink-0">棋譜 →</span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* 参加大会 */}
        <Card>
          <CardHeader
            title="参加大会"
            action={<Link href="/mypage/tournaments" className="text-xs text-kogane hover:underline">すべて見る →</Link>}
          />
          {tournaments.length === 0 ? (
            <EmptyState icon="桂" title="まだ参加大会がありません" />
          ) : (
            <div className="px-5 pb-5 space-y-2">
              {tournaments.map((e) => (
                <Link key={e.tournament.id} href={`/tournaments/${e.tournament.id}`}
                  className="flex items-center gap-3 rounded-xl border border-sumi/10 bg-white px-4 py-2.5 hover:border-kogane transition">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{e.tournament.name}</p>
                    <p className="text-xs text-sumi/50">{e.tournament.date}</p>
                  </div>
                  {e.placement && (
                    <Chip tone={e.placement === "優勝" ? "gold" : "default"}>{e.placement}</Chip>
                  )}
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* バッジ */}
      <Card>
        <CardHeader
          title="獲得バッジ"
          action={<Link href="/mypage/badges" className="text-xs text-kogane hover:underline">すべて見る →</Link>}
        />
        {badgeDefs.length === 0 ? (
          <EmptyState icon="金" title="まだバッジがありません" description="対局や大会で活躍するとバッジを獲得できます。" />
        ) : (
          <div className="px-5 pb-5 flex flex-wrap gap-3">
            {badgeDefs.map((b) => (
              <div key={b.id} className="flex items-center gap-2.5 rounded-xl border border-kogane/30 bg-kogane/8 px-4 py-2.5">
                <span className="koma w-8 h-9 flex items-end justify-center pb-1 text-[11px] font-serif-jp font-bold text-sumi">
                  {b.icon}
                </span>
                <div>
                  <p className="text-sm font-bold">{b.name}</p>
                  <p className="text-[11px] text-sumi/50">{b.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
