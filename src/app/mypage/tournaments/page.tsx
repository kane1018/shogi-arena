"use client";

// 参加大会履歴
import Link from "next/link";
import { getPersonalRecords, getProfile } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { myTournaments } from "@/lib/stats";
import { Button, Card, Chip, EmptyState, Loading } from "@/components/ui";

export default function MyTournamentsPage() {
  const mounted = useMounted();
  const profile = useStoreValue(() => getProfile(), null);
  const records = useStoreValue(() => (profile ? getPersonalRecords(profile.id) : []), []);
  const entries = useStoreValue(() => (profile ? myTournaments(getPersonalRecords(profile.id)) : []), []);

  if (!mounted || !profile) return <Loading />;

  return (
    <div className="space-y-4">
      {entries.length === 0 ? (
        <Card>
          <EmptyState
            icon="桂"
            title="まだ参加大会がありません"
            description={`「${profile.displayName}」の名前で大会に参加すると、ここに履歴が表示されます。`}
            action={
              <Link href="/tournaments">
                <Button variant="secondary">大会一覧を見る</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        entries.map((e) => (
          <Card key={e.tournament.id} className="p-5">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-serif-jp text-lg font-bold truncate">{e.tournament.name}</h2>
                  {e.placement && (
                    <Chip tone={e.placement === "優勝" ? "gold" : e.placement === "準優勝" ? "blue" : "default"}>
                      {e.placement}
                    </Chip>
                  )}
                  {e.tournament.status !== "finished" && <Chip tone="red">進行中</Chip>}
                </div>
                <p className="text-sm text-sumi/55 mt-1">
                  開催日: {e.tournament.date || "未定"}
                  {(e.wins > 0 || e.losses > 0) && ` ・ 成績: ${e.wins}勝${e.losses}敗(${e.wins + e.losses}局)`}
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Link href={`/tournaments/${e.tournament.id}`}>
                  <Button variant="secondary" className="text-xs px-3 py-2">トーナメント表</Button>
                </Link>
                <Link href={`/mypage/games`}>
                  <Button variant="ghost" className="text-xs px-3 py-2">棋譜</Button>
                </Link>
              </div>
            </div>
          </Card>
        ))
      )}
      {records.length === 0 && entries.length > 0 && (
        <p className="text-xs text-sumi/45">
          ※ 勝敗データは盤面対局を行った大会のみ集計されます。
        </p>
      )}
    </div>
  );
}
