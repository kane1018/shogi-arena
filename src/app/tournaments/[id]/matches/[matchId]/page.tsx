"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { GameRecord, Match, MoveRecord, Participant, Player, ResultType, Tournament } from "@/lib/types";
import {
  genId, getGameRecordByMatch, getMatches, getParticipant, getTournament,
  saveGameRecord, saveMatch, saveMatches, saveTournament, getMatch,
} from "@/lib/store";
import { useMounted } from "@/lib/useStore";
import { applyFinalResults, recomputeBracket } from "@/lib/tournament";
import { recordGameForLocalUser, awardTournamentBadges } from "@/lib/records";
import {
  type GameState, type HandPiece, type Move, type PieceType,
  canPromote, isCheckmate, isInCheck, legalDropsFor,
  legalMovesFrom, makeMove, mustPromote, replayTo, fromFileRank,
} from "@/lib/shogi/engine";
import { ShogiBoard, Komadai, KomaPiece, type Selection } from "@/components/shogi/ShogiBoard";
import { PlayerPanel } from "@/components/shogi/PlayerPanel";
import { useGameClock, hasClock } from "@/components/shogi/clock";
import { Button, Card, ConfirmDialog, EmptyState, Loading, Modal } from "@/components/ui";
import { RESULT_LABELS } from "@/components/BracketView";

export default function MatchPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MatchPageInner />
    </Suspense>
  );
}

function MatchPageInner() {
  const { id, matchId } = useParams<{ id: string; matchId: string }>();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const mounted = useMounted();
  // 対局データは編集中の盤面と競合しないよう、初回読み込みのみ
  const [loaded, setLoaded] = useState<{
    tournament: Tournament;
    match: Match;
    sente: Participant;
    gote: Participant;
    savedMoves: MoveRecord[];
  } | null | "error">(null);

  useEffect(() => {
    if (!mounted) return;
    const tournament = getTournament(id);
    const match = getMatch(matchId);
    if (!tournament || !match || !match.senteParticipantId || !match.goteParticipantId) {
      setLoaded("error");
      return;
    }
    const sente = getParticipant(match.senteParticipantId);
    const gote = getParticipant(match.goteParticipantId);
    if (!sente || !gote) {
      setLoaded("error");
      return;
    }
    const game = getGameRecordByMatch(matchId);
    setLoaded({ tournament, match, sente, gote, savedMoves: game?.moves ?? [] });
  }, [mounted, id, matchId]);

  if (!mounted || loaded === null) return <Loading label="対局室を準備中…" />;
  if (loaded === "error") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full">
        <Card>
          <EmptyState
            icon="香"
            title="対局が見つかりません"
            description="対戦カードが確定していないか、URLが正しくない可能性があります。"
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

  const isAdmin = key === loaded.tournament.adminKey;
  return <GameScreen {...loaded} isAdmin={isAdmin} adminKey={key} />;
}

// ===== 対局画面本体 =====
function GameScreen({
  tournament, match, sente, gote, savedMoves, isAdmin, adminKey,
}: {
  tournament: Tournament;
  match: Match;
  sente: Participant;
  gote: Participant;
  savedMoves: MoveRecord[];
  isAdmin: boolean;
  adminKey: string;
}) {
  const router = useRouter();
  const tc = tournament.timeControl;
  const [moves, setMoves] = useState<MoveRecord[]>(savedMoves);
  const [state, setState] = useState<GameState>(() => replayTo(savedMoves, savedMoves.length));
  const [selection, setSelection] = useState<Selection>(null);
  const [legalTargets, setLegalTargets] = useState<[number, number][]>([]);
  const [promotionMove, setPromotionMove] = useState<Move | null>(null);
  const [started, setStarted] = useState(match.status === "playing" && savedMoves.length > 0);
  const [finished, setFinished] = useState(match.status === "finished");
  const [resultInfo, setResultInfo] = useState<{ winner: Player; resultType: ResultType } | null>(null);
  const [confirmResign, setConfirmResign] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState<{ winner: Player; resultType: ResultType } | null>(null);
  const { clock, onMove: clockMove, start: clockStart, pause: clockPause, setActive } = useGameClock(tc, started && !finished);
  const interactive = isAdmin && started && !finished;
  const finalizedRef = useRef(finished);

  const lastMoveTo: [number, number] | null =
    moves.length > 0 ? fromFileRank(moves[moves.length - 1].to[0], moves[moves.length - 1].to[1]) : null;

  const inCheck = isInCheck(state, state.turn);

  // ===== 終局処理 =====
  const finalize = useCallback((winner: Player, resultType: ResultType, finalMoves: MoveRecord[]) => {
    if (finalizedRef.current) return;
    finalizedRef.current = true;
    clockPause();
    const winnerId = winner === "sente" ? sente.id : gote.id;
    const game: GameRecord = {
      id: getGameRecordByMatch(match.id)?.id ?? genId(),
      matchId: match.id,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      senteName: sente.displayName,
      goteName: gote.displayName,
      senteParticipantId: sente.id,
      goteParticipantId: gote.id,
      moves: finalMoves,
      result: resultType,
      winner,
      favorite: false,
      playedAt: match.startedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    saveGameRecord(game);

    const updatedMatch: Match = {
      ...match,
      winnerParticipantId: winnerId,
      status: "finished",
      resultType,
      endedAt: new Date().toISOString(),
    };
    let all = getMatches(tournament.id).map((m) => (m.id === updatedMatch.id ? updatedMatch : m));
    all = recomputeBracket(all);
    saveMatches(all);
    const t = applyFinalResults(getTournament(tournament.id) ?? tournament, all);
    saveTournament(t);

    recordGameForLocalUser(game, { sente: sente.rating, gote: gote.rating });
    if (t.winnerParticipantId) {
      const champ = t.winnerParticipantId === sente.id ? sente.displayName
        : t.winnerParticipantId === gote.id ? gote.displayName : null;
      const runner = t.runnerUpParticipantId === sente.id ? sente.displayName
        : t.runnerUpParticipantId === gote.id ? gote.displayName : null;
      awardTournamentBadges(champ, runner);
    }

    setFinished(true);
    setResultInfo({ winner, resultType });
    setSelection(null);
    setLegalTargets([]);
  }, [match, tournament, sente, gote, clockPause]);

  // 時間切れ検知
  useEffect(() => {
    if (clock.timedOut && !finished) {
      const winner: Player = clock.timedOut === "sente" ? "gote" : "sente";
      setConfirmFinish({ winner, resultType: "timeout" });
    }
  }, [clock.timedOut, finished]);

  // ===== 着手処理 =====
  const playMove = useCallback((move: Move) => {
    const prev = moves.length > 0 ? moves[moves.length - 1] : null;
    const tS = hasClock(tc) ? Math.round(clock.sente.mainMs / 1000) : null;
    const tG = hasClock(tc) ? Math.round(clock.gote.mainMs / 1000) : null;
    const { state: next, record } = makeMove(state, move, prev, tS, tG);
    const nextMoves = [...moves, record];
    setState(next);
    setMoves(nextMoves);
    setSelection(null);
    setLegalTargets([]);
    clockMove(next.turn);

    // 途中経過を自動保存
    saveGameRecord({
      id: getGameRecordByMatch(match.id)?.id ?? genId(),
      matchId: match.id,
      tournamentId: tournament.id,
      tournamentName: tournament.name,
      senteName: sente.displayName,
      goteName: gote.displayName,
      senteParticipantId: sente.id,
      goteParticipantId: gote.id,
      moves: nextMoves,
      result: null,
      winner: null,
      favorite: false,
      playedAt: match.startedAt ?? new Date().toISOString(),
      createdAt: new Date().toISOString(),
    });

    // 詰みチェック
    if (isCheckmate(next)) {
      const winner: Player = next.turn === "sente" ? "gote" : "sente";
      setConfirmFinish({ winner, resultType: "checkmate" });
    }
  }, [moves, state, clock, tc, clockMove, match, tournament, sente, gote]);

  const onCellClick = useCallback((r: number, c: number) => {
    if (!interactive) return;
    const piece = state.board[r][c];

    // 持ち駒を打つ
    if (selection?.type === "hand") {
      if (legalTargets.some(([tr, tc2]) => tr === r && tc2 === c)) {
        playMove({ from: null, to: [r, c], piece: selection.piece, promote: false });
        return;
      }
      setSelection(null);
      setLegalTargets([]);
      return;
    }

    // 盤上の駒を動かす
    if (selection?.type === "board") {
      if (legalTargets.some(([tr, tc2]) => tr === r && tc2 === c)) {
        const moving = state.board[selection.r][selection.c]!;
        const move: Move = { from: [selection.r, selection.c], to: [r, c], piece: moving.type, promote: false };
        if (mustPromote(moving, r)) {
          playMove({ ...move, promote: true });
        } else if (canPromote(moving, selection.r, r)) {
          setPromotionMove(move); // 成り選択モーダル
        } else {
          playMove(move);
        }
        return;
      }
      // 別の自駒を選び直し
      if (piece && piece.owner === state.turn) {
        setSelection({ type: "board", r, c });
        setLegalTargets(legalMovesFrom(state, r, c));
        return;
      }
      setSelection(null);
      setLegalTargets([]);
      return;
    }

    // 新規選択
    if (piece && piece.owner === state.turn) {
      setSelection({ type: "board", r, c });
      setLegalTargets(legalMovesFrom(state, r, c));
    }
  }, [interactive, selection, legalTargets, state, playMove]);

  const onHandClick = useCallback((owner: Player) => (piece: HandPiece) => {
    if (!interactive || owner !== state.turn) return;
    if (selection?.type === "hand" && selection.piece === piece && selection.owner === owner) {
      setSelection(null);
      setLegalTargets([]);
      return;
    }
    setSelection({ type: "hand", piece, owner });
    setLegalTargets(legalDropsFor(state, piece));
  }, [interactive, selection, state]);

  // 一手戻す
  const undo = useCallback(() => {
    if (moves.length === 0) return;
    const nextMoves = moves.slice(0, -1);
    const next = replayTo(nextMoves, nextMoves.length);
    setMoves(nextMoves);
    setState(next);
    setSelection(null);
    setLegalTargets([]);
    setActive(next.turn);
  }, [moves, setActive]);

  const startGame = () => {
    saveMatch({ ...match, status: "playing", startedAt: match.startedAt ?? new Date().toISOString() });
    setStarted(true);
    if (hasClock(tc)) clockStart();
  };

  const turnName = state.turn === "sente" ? sente.displayName : gote.displayName;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 w-full">
      {/* 上部バー */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <div className="min-w-0">
          <Link href={isAdmin ? `/tournaments/${tournament.id}/admin?key=${adminKey}` : `/tournaments/${tournament.id}`}
            className="text-xs text-sumi/50 hover:text-kogane transition">
            ← {tournament.name}
          </Link>
          <h1 className="font-serif-jp font-bold text-base sm:text-lg truncate">
            ☗{sente.displayName} 対 ☖{gote.displayName}
          </h1>
        </div>
        {!finished && started && (
          <div className="text-xs sm:text-sm bg-fukamidori text-washi rounded-full px-3 py-1.5 shrink-0">
            {inCheck && <span className="text-[#ffb3a7] font-bold mr-1.5">王手!</span>}
            {turnName} の手番
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-[230px_minmax(0,1fr)_260px] gap-4 items-start">
        {/* 左: 対局者・時計(PC) / 上部(モバイル) */}
        <div className="order-1 lg:order-1 grid grid-cols-2 lg:grid-cols-1 gap-2 lg:gap-3">
          <PlayerPanel
            player="gote" name={gote.displayName} rank={gote.rank}
            clockSide={hasClock(tc) ? clock.gote : null}
            isTurn={!finished && started && state.turn === "gote"} tc={tc} compact
          />
          <PlayerPanel
            player="sente" name={sente.displayName} rank={sente.rank}
            clockSide={hasClock(tc) ? clock.sente : null}
            isTurn={!finished && started && state.turn === "sente"} tc={tc} compact
          />
          {isAdmin && !finished && (
            <div className="col-span-2 lg:col-span-1 flex lg:flex-col gap-2">
              {!started ? (
                <Button variant="gold" className="flex-1" onClick={startGame}>対局開始</Button>
              ) : (
                <>
                  {hasClock(tc) && (
                    <Button variant="secondary" className="flex-1"
                      onClick={() => (clock.running ? clockPause() : clockStart())}>
                      {clock.running ? "時計を一時停止" : "時計を再開"}
                    </Button>
                  )}
                  <Button variant="danger" className="flex-1" onClick={() => setConfirmResign(true)}>
                    投了({state.turn === "sente" ? "先手" : "後手"})
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* 中央: 盤面 */}
        <div className="order-2 lg:order-2 w-full max-w-[640px] mx-auto">
          <div className="flex gap-2 sm:gap-3">
            {/* 後手駒台(左) */}
            <div className="hidden sm:flex flex-col justify-start">
              <Komadai
                state={state} owner="gote" label="☖持駒"
                selection={selection}
                onPieceClick={onHandClick("gote")}
                interactive={interactive && state.turn === "gote"}
              />
            </div>
            <div className="flex-1 min-w-0">
              {/* モバイル: 後手駒台(横) */}
              <div className="sm:hidden mb-2">
                <Komadai
                  state={state} owner="gote" label="☖" horizontal
                  selection={selection}
                  onPieceClick={onHandClick("gote")}
                  interactive={interactive && state.turn === "gote"}
                />
              </div>
              <ShogiBoard
                state={state}
                selection={selection}
                legalTargets={legalTargets}
                lastMoveTo={lastMoveTo}
                onCellClick={onCellClick}
                interactive={interactive}
              />
              <div className="sm:hidden mt-2">
                <Komadai
                  state={state} owner="sente" label="☗" horizontal
                  selection={selection}
                  onPieceClick={onHandClick("sente")}
                  interactive={interactive && state.turn === "sente"}
                />
              </div>
            </div>
            {/* 先手駒台(右) */}
            <div className="hidden sm:flex flex-col justify-end">
              <Komadai
                state={state} owner="sente" label="☗持駒"
                selection={selection}
                onPieceClick={onHandClick("sente")}
                interactive={interactive && state.turn === "sente"}
              />
            </div>
          </div>
          {!started && !finished && (
            <p className="text-center text-sm text-sumi/55 mt-4">
              {isAdmin ? "「対局開始」を押すと盤面操作と時計が有効になります。" : "対局はまだ開始されていません。"}
            </p>
          )}
        </div>

        {/* 右: 棋譜 */}
        <div className="order-3">
          <Card className="p-4">
            <h2 className="font-serif-jp font-bold text-sm mb-3">棋譜({moves.length}手)</h2>
            <div className="max-h-56 lg:max-h-[26rem] overflow-y-auto space-y-0.5 text-sm font-mono">
              {moves.length === 0 && <p className="text-xs text-sumi/40 py-2">まだ指し手がありません</p>}
              {moves.map((m) => (
                <div key={m.moveNumber} className="flex gap-2 px-2 py-0.5 rounded hover:bg-sumi/4">
                  <span className="text-sumi/40 w-7 text-right shrink-0">{m.moveNumber}</span>
                  <span>{m.notation}</span>
                </div>
              ))}
            </div>
            {interactive && (
              <div className="mt-3 pt-3 border-t border-sumi/10 grid gap-2">
                <Button variant="secondary" onClick={undo} disabled={moves.length === 0}>
                  一手戻す
                </Button>
              </div>
            )}
            {finished && (
              <div className="mt-3 pt-3 border-t border-sumi/10 grid gap-2">
                <Link href={`/tournaments/${tournament.id}/matches/${match.id}/review`}>
                  <Button variant="secondary" className="w-full">棋譜を再生する</Button>
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 成り選択モーダル */}
      <Modal open={promotionMove !== null} onClose={() => setPromotionMove(null)} title="成りますか?">
        {promotionMove && (
          <div className="flex justify-center gap-6 py-2">
            <button
              className="flex flex-col items-center gap-3 cursor-pointer group"
              onClick={() => { playMove({ ...promotionMove, promote: true }); setPromotionMove(null); }}
            >
              <span className="w-16 h-[4.5rem] block group-hover:scale-110 transition-transform">
                <KomaPiece type={promotionTypeOf(promotionMove.piece)} owner={state.turn} />
              </span>
              <span className="text-sm font-bold text-shu">成る</span>
            </button>
            <button
              className="flex flex-col items-center gap-3 cursor-pointer group"
              onClick={() => { playMove({ ...promotionMove, promote: false }); setPromotionMove(null); }}
            >
              <span className="w-16 h-[4.5rem] block group-hover:scale-110 transition-transform">
                <KomaPiece type={promotionMove.piece} owner={state.turn} />
              </span>
              <span className="text-sm font-bold text-sumi/70">成らない</span>
            </button>
          </div>
        )}
      </Modal>

      {/* 投了確認 */}
      <ConfirmDialog
        open={confirmResign}
        title="投了しますか?"
        message={`${turnName}(手番側)の投了として、${state.turn === "sente" ? gote.displayName : sente.displayName}の勝ちが確定します。`}
        confirmLabel="投了する"
        danger
        onConfirm={() => {
          setConfirmResign(false);
          finalize(state.turn === "sente" ? "gote" : "sente", "resign", moves);
        }}
        onCancel={() => setConfirmResign(false)}
      />

      {/* 終局確認(詰み・時間切れ) */}
      <ConfirmDialog
        open={confirmFinish !== null}
        title={confirmFinish?.resultType === "timeout" ? "時間切れです" : "詰みです"}
        message={
          confirmFinish && (
            <>
              <span className="font-bold">
                {confirmFinish.winner === "sente" ? sente.displayName : gote.displayName}
              </span>
              の勝ち({RESULT_LABELS[confirmFinish.resultType]})で確定しますか?
              確定すると勝者が次のラウンドに進みます。
            </>
          )
        }
        confirmLabel="勝敗を確定する"
        onConfirm={() => {
          if (confirmFinish) finalize(confirmFinish.winner, confirmFinish.resultType, moves);
          setConfirmFinish(null);
        }}
        onCancel={() => setConfirmFinish(null)}
      />

      {/* 終局演出 */}
      <Modal open={resultInfo !== null} onClose={() => setResultInfo(null)}>
        {resultInfo && (
          <div className="text-center py-4">
            <p className="font-serif-jp text-xs tracking-[0.4em] text-kogane">対局終了</p>
            <div className="champion-banner rounded-xl p-[2px] mt-4 mx-auto max-w-xs">
              <div className="bg-sumi text-washi rounded-xl py-5 px-6">
                <p className="font-serif-jp text-2xl font-bold anim-pop-in">
                  {resultInfo.winner === "sente" ? `☗ ${sente.displayName}` : `☖ ${gote.displayName}`}
                </p>
                <p className="text-sm text-washi/70 mt-1">
                  {RESULT_LABELS[resultInfo.resultType]}により勝利({moves.length}手)
                </p>
              </div>
            </div>
            <div className="grid gap-2 mt-6">
              <Link href={`/tournaments/${tournament.id}/matches/${match.id}/review`}>
                <Button variant="secondary" className="w-full">棋譜を再生する</Button>
              </Link>
              <Button variant="primary" onClick={() =>
                router.push(isAdmin ? `/tournaments/${tournament.id}/admin?key=${adminKey}` : `/tournaments/${tournament.id}`)
              }>
                トーナメント表へ戻る
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function promotionTypeOf(piece: PieceType): PieceType {
  const map: Partial<Record<PieceType, PieceType>> = {
    FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY",
  };
  return map[piece] ?? piece;
}
