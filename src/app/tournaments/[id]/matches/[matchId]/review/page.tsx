"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getGameRecordByMatch } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { useViewerSync } from "@/lib/sync";
import { replayTo, fromFileRank } from "@/lib/shogi/engine";
import { ShogiBoard, Komadai } from "@/components/shogi/ShogiBoard";
import { toCSA, toKIF, downloadText } from "@/lib/shogi/export";
import { Button, Card, Chip, EmptyState, Loading } from "@/components/ui";
import { RESULT_LABELS } from "@/components/BracketView";

export default function ReviewPage() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();
  const mounted = useMounted();
  const game = useStoreValue(() => getGameRecordByMatch(matchId), null);
  const [ply, setPly] = useState(-1); // -1 = 最終手まで表示
  // 別端末から開いた場合に備えてサーバーから取得(再生中の追従は10秒間隔)
  const syncReady = useViewerSync(id, 10000, mounted);

  const moves = game?.moves ?? [];
  const shownPly = ply === -1 ? moves.length : ply;
  const state = useMemo(() => replayTo(moves, shownPly), [moves, shownPly]);

  if (!mounted || (!game && !syncReady)) return <Loading label="棋譜を読み込み中…" />;
  if (!game || moves.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full">
        <Card>
          <EmptyState
            icon="香"
            title="棋譜が見つかりません"
            description="この対局の棋譜はまだ保存されていません。"
            action={
              <Link href={`/tournaments/${id}`}>
                <Button variant="secondary">大会ページへ戻る</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  const lastMoveTo: [number, number] | null =
    shownPly > 0 ? fromFileRank(moves[shownPly - 1].to[0], moves[shownPly - 1].to[1]) : null;

  const playedDate = new Date(game.playedAt);
  const dateLabel = `${playedDate.getFullYear()}/${playedDate.getMonth() + 1}/${playedDate.getDate()} ${String(playedDate.getHours()).padStart(2, "0")}:${String(playedDate.getMinutes()).padStart(2, "0")}`;

  const fileBase = `${game.senteName}_vs_${game.goteName}`.replace(/[\\/:*?"<>|\s]/g, "_");

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-6 w-full">
      {/* ヘッダー */}
      <div className="mb-5 anim-fade-in-up">
        <Link href={`/tournaments/${id}`} className="text-xs text-sumi/50 hover:text-kogane transition">
          ← {game.tournamentName || "大会ページ"}
        </Link>
        <div className="flex items-center gap-3 flex-wrap mt-1">
          <h1 className="font-serif-jp text-xl sm:text-2xl font-bold">
            ☗{game.senteName} 対 ☖{game.goteName}
          </h1>
          {game.result && (
            <Chip tone="gold">
              {game.winner === "sente" ? `先手勝ち` : game.winner === "gote" ? `後手勝ち` : "引き分け"}
              ・{RESULT_LABELS[game.result]}
            </Chip>
          )}
        </div>
        <p className="text-xs text-sumi/50 mt-1">
          {dateLabel} ・ 全{moves.length}手 ・ {game.tournamentName}
        </p>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-5 items-start">
        {/* 盤面 */}
        <div className="w-full max-w-[640px] mx-auto">
          <div className="flex gap-2 sm:gap-3">
            <div className="hidden sm:flex flex-col justify-start">
              <Komadai state={state} owner="gote" label="☖持駒" selection={null} interactive={false} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="sm:hidden mb-2">
                <Komadai state={state} owner="gote" label="☖" horizontal selection={null} interactive={false} />
              </div>
              <ShogiBoard
                state={state}
                selection={null}
                legalTargets={[]}
                lastMoveTo={lastMoveTo}
                interactive={false}
              />
              <div className="sm:hidden mt-2">
                <Komadai state={state} owner="sente" label="☗" horizontal selection={null} interactive={false} />
              </div>
            </div>
            <div className="hidden sm:flex flex-col justify-end">
              <Komadai state={state} owner="sente" label="☗持駒" selection={null} interactive={false} />
            </div>
          </div>

          {/* 再生コントロール */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button variant="secondary" onClick={() => setPly(0)} disabled={shownPly === 0}>⏮ 最初</Button>
            <Button variant="secondary" onClick={() => setPly(Math.max(0, shownPly - 1))} disabled={shownPly === 0}>◀ 戻る</Button>
            <span className="text-sm font-mono tabular-nums w-20 text-center">
              {shownPly} / {moves.length}
            </span>
            <Button variant="secondary" onClick={() => setPly(Math.min(moves.length, shownPly + 1))} disabled={shownPly === moves.length}>進む ▶</Button>
            <Button variant="secondary" onClick={() => setPly(-1)} disabled={shownPly === moves.length}>最後 ⏭</Button>
          </div>
        </div>

        {/* 棋譜リスト・エクスポート */}
        <Card className="p-4">
          <h2 className="font-serif-jp font-bold text-sm mb-3">棋譜</h2>
          <div className="max-h-72 lg:max-h-[25rem] overflow-y-auto space-y-0.5 text-sm font-mono">
            {moves.map((m, i) => (
              <button
                key={m.moveNumber}
                onClick={() => setPly(i + 1)}
                className={`flex gap-2 px-2 py-0.5 rounded w-full text-left cursor-pointer transition-colors ${
                  shownPly === i + 1 ? "bg-kogane/20 font-bold" : "hover:bg-sumi/4"
                }`}
              >
                <span className="text-sumi/40 w-7 text-right shrink-0">{m.moveNumber}</span>
                <span>{m.notation}</span>
              </button>
            ))}
            {game.result && (
              <p className="px-2 py-1 text-xs text-sumi/50">
                まで{moves.length}手 — {RESULT_LABELS[game.result]}
              </p>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-sumi/10 grid gap-2">
            <Button variant="secondary" onClick={() => downloadText(`${fileBase}.kif`, toKIF(game))}>
              KIF形式で保存
            </Button>
            <Button variant="secondary" onClick={() => downloadText(`${fileBase}.csa`, toCSA(game))}>
              CSA形式で保存
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
