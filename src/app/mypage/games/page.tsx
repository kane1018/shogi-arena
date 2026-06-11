"use client";

// 棋譜ライブラリ
import { useMemo, useState } from "react";
import Link from "next/link";
import { getGameRecords, getProfile, saveGameRecord } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { toCSA, toKIF, downloadText } from "@/lib/shogi/export";
import { Button, Card, Chip, EmptyState, Input, Loading, Select } from "@/components/ui";
import { RESULT_LABELS } from "@/components/BracketView";

type Filter = "all" | "win" | "lose" | "favorite";

export default function GamesPage() {
  const mounted = useMounted();
  const profile = useStoreValue(() => getProfile(), null);
  const allGames = useStoreValue(() => getGameRecords(), []);
  const [filter, setFilter] = useState<Filter>("all");
  const [tournamentFilter, setTournamentFilter] = useState("");
  const [search, setSearch] = useState("");

  const myGames = useMemo(() => {
    if (!profile) return [];
    return allGames
      .filter((g) => g.moves.length > 0)
      .filter((g) => g.senteName === profile.displayName || g.goteName === profile.displayName)
      .sort((a, b) => new Date(b.playedAt).getTime() - new Date(a.playedAt).getTime());
  }, [allGames, profile]);

  const tournaments = useMemo(
    () => [...new Map(myGames.map((g) => [g.tournamentId, g.tournamentName])).entries()],
    [myGames]
  );

  if (!mounted || !profile) return <Loading />;

  const filtered = myGames.filter((g) => {
    const mySide = g.senteName === profile.displayName ? "sente" : "gote";
    const opponent = mySide === "sente" ? g.goteName : g.senteName;
    if (filter === "win" && g.winner !== mySide) return false;
    if (filter === "lose" && (g.winner === mySide || g.winner === null)) return false;
    if (filter === "favorite" && !g.favorite) return false;
    if (tournamentFilter && g.tournamentId !== tournamentFilter) return false;
    if (search && !opponent.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="space-y-5">
      {/* フィルタ */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex gap-1.5">
            {([
              ["all", "すべて"],
              ["win", "勝ち"],
              ["lose", "負け"],
              ["favorite", "★お気に入り"],
            ] as [Filter, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer ${
                  filter === f ? "bg-fukamidori text-washi" : "bg-sumi/6 text-sumi/65 hover:bg-sumi/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <Select
            className="w-auto min-w-36 text-xs py-2"
            value={tournamentFilter}
            onChange={(e) => setTournamentFilter(e.target.value)}
          >
            <option value="">全大会</option>
            {tournaments.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </Select>
          <Input
            className="w-auto flex-1 min-w-36 text-xs py-2"
            placeholder="相手名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <EmptyState
            icon="譜"
            title={myGames.length === 0 ? "まだ棋譜がありません" : "条件に合う棋譜がありません"}
            description={
              myGames.length === 0
                ? `「${profile.displayName}」の名前で大会の対局を行うと棋譜が保存されます。`
                : "フィルタ条件を変更してみてください。"
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((g) => {
            const mySide = g.senteName === profile.displayName ? "sente" : "gote";
            const opponent = mySide === "sente" ? g.goteName : g.senteName;
            const won = g.winner === mySide;
            const fileBase = `${g.senteName}_vs_${g.goteName}`.replace(/[\\/:*?"<>|\s]/g, "_");
            return (
              <Card key={g.id} className="p-4">
                <div className="flex items-center gap-3 flex-wrap">
                  <button
                    onClick={() => saveGameRecord({ ...g, favorite: !g.favorite })}
                    className={`text-xl cursor-pointer transition ${g.favorite ? "text-kogane" : "text-sumi/20 hover:text-kogane/60"}`}
                    title="お気に入り"
                  >
                    ★
                  </button>
                  <Chip tone={won ? "gold" : g.winner === null ? "blue" : "gray"}>
                    {won ? "勝ち" : g.winner === null ? "対局中/引分" : "負け"}
                  </Chip>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {mySide === "sente" ? "☗先手" : "☖後手"} 対 {opponent}
                      <span className="text-xs text-sumi/45 ml-2">{g.moves.length}手</span>
                      {g.result && <span className="text-xs text-sumi/45 ml-1">({RESULT_LABELS[g.result]})</span>}
                    </p>
                    <p className="text-xs text-sumi/50 truncate">
                      {new Date(g.playedAt).toLocaleDateString("ja-JP")} ・ {g.tournamentName}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Link href={`/tournaments/${g.tournamentId}/matches/${g.matchId}/review`}>
                      <Button variant="secondary" className="px-3 py-1.5 text-xs">再生</Button>
                    </Link>
                    <Button variant="ghost" className="px-2.5 py-1.5 text-xs"
                      onClick={() => downloadText(`${fileBase}.kif`, toKIF(g))}>KIF</Button>
                    <Button variant="ghost" className="px-2.5 py-1.5 text-xs"
                      onClick={() => downloadText(`${fileBase}.csa`, toCSA(g))}>CSA</Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
