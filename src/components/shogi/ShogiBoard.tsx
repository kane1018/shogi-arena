"use client";

// 美しい将棋盤コンポーネント(表示と入力のみ。ルールはlib/shogi/engineに分離)
import type { GameState, HandPiece, PieceType } from "@/lib/shogi/engine";
import { HAND_ORDER, PIECE_KANJI } from "@/lib/shogi/engine";
import type { Player } from "@/lib/types";

const PROMOTED: PieceType[] = ["TO", "NY", "NK", "NG", "UM", "RY"];
const FILE_LABELS = ["9", "8", "7", "6", "5", "4", "3", "2", "1"];
const RANK_LABELS = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

export interface BoardSelection {
  type: "board";
  r: number;
  c: number;
}
export interface HandSelection {
  type: "hand";
  piece: HandPiece;
  owner: Player;
}
export type Selection = BoardSelection | HandSelection | null;

export function ShogiBoard({
  state,
  selection,
  legalTargets,
  lastMoveTo,
  onCellClick,
  interactive = true,
}: {
  state: GameState;
  selection: Selection;
  legalTargets: [number, number][];
  lastMoveTo: [number, number] | null;
  onCellClick?: (r: number, c: number) => void;
  interactive?: boolean;
}) {
  const isTarget = (r: number, c: number) =>
    legalTargets.some(([tr, tc]) => tr === r && tc === c);
  const isSelected = (r: number, c: number) =>
    selection?.type === "board" && selection.r === r && selection.c === c;
  const isLast = (r: number, c: number) =>
    lastMoveTo !== null && lastMoveTo[0] === r && lastMoveTo[1] === c;

  return (
    <div className="board-frame rounded-lg p-1.5 sm:p-2.5 shadow-board select-none w-full">
      {/* 筋ラベル */}
      <div className="grid grid-cols-9 px-1 sm:px-2 pb-0.5">
        {FILE_LABELS.map((f) => (
          <div key={f} className="text-center text-[9px] sm:text-[11px] text-washi/80 font-medium">
            {f}
          </div>
        ))}
      </div>
      <div className="flex">
        <div className="board-wood rounded-sm border-2 border-sumi/80 grid grid-cols-9 grid-rows-9 flex-1 aspect-square">
          {state.board.map((row, r) =>
            row.map((sq, c) => {
              const target = isTarget(r, c);
              const selected = isSelected(r, c);
              const last = isLast(r, c);
              return (
                <button
                  key={`${r}-${c}`}
                  onClick={() => interactive && onCellClick?.(r, c)}
                  disabled={!interactive}
                  className={[
                    "koma-cell relative border-[0.5px] border-sumi/60 flex items-center justify-center p-[4%]",
                    interactive ? "cursor-pointer" : "cursor-default",
                    selected ? "bg-kogane/45" : "",
                    !selected && target ? "bg-fukamidori/25" : "",
                    !selected && !target && last ? "bg-shu/20" : "",
                  ].join(" ")}
                >
                  {/* 星(目印の点) */}
                  {((r === 2 || r === 5) && (c === 2 || c === 5)) && (
                    <span className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rounded-full bg-sumi/70 z-10" />
                  )}
                  {target && !sq && (
                    <span className="absolute w-[30%] h-[30%] rounded-full bg-fukamidori/40 anim-fade-in" />
                  )}
                  {sq && (
                    <KomaPiece
                      type={sq.type}
                      owner={sq.owner}
                      highlight={target}
                    />
                  )}
                </button>
              );
            })
          )}
        </div>
        {/* 段ラベル */}
        <div className="grid grid-rows-9 pl-0.5 sm:pl-1.5 w-3 sm:w-4">
          {RANK_LABELS.map((rk) => (
            <div key={rk} className="flex items-center justify-center text-[8px] sm:text-[10px] text-washi/80">
              {rk}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function KomaPiece({
  type,
  owner,
  highlight,
  small,
}: {
  type: PieceType;
  owner: Player;
  highlight?: boolean;
  small?: boolean;
}) {
  const kanji = PIECE_KANJI[type];
  const isPromoted = PROMOTED.includes(type);
  const isTwoChar = kanji.length === 2;
  return (
    <span
      className={[
        "koma koma-piece flex items-center justify-center font-serif-jp font-bold w-full h-full",
        owner === "gote" ? "koma-gote" : "",
        isPromoted ? "koma-promoted" : "text-sumi",
        highlight ? "ring-2 ring-shu/70" : "",
        small ? (isTwoChar ? "text-[8px]" : "text-[13px]") : "",
      ].join(" ")}
      style={
        small
          ? undefined
          : { fontSize: isTwoChar ? "min(3.2vw, 16px)" : "min(5.4vw, 30px)", lineHeight: 1 }
      }
    >
      <span className={isTwoChar ? "scale-y-90 tracking-tighter" : "mt-[14%]"}>
        {kanji}
      </span>
    </span>
  );
}

/** 駒台 */
export function Komadai({
  state,
  owner,
  label,
  selection,
  onPieceClick,
  interactive = true,
  horizontal = false,
}: {
  state: GameState;
  owner: Player;
  label?: string;
  selection: Selection;
  onPieceClick?: (piece: HandPiece) => void;
  interactive?: boolean;
  horizontal?: boolean;
}) {
  const hand = state.hands[owner];
  const pieces = HAND_ORDER.filter((p) => hand[p] > 0);
  return (
    <div
      className={[
        "komadai-wood rounded-lg border border-sumi/30 shadow-md p-2",
        horizontal ? "flex items-center gap-1.5 min-h-[3.25rem]" : "w-16 sm:w-20 min-h-36 flex flex-col gap-1.5",
      ].join(" ")}
    >
      {label && (
        <div className={`text-[10px] font-bold text-sumi/60 ${horizontal ? "writing-mode-horizontal mr-1" : "text-center"}`}>
          {label}
        </div>
      )}
      {pieces.length === 0 && (
        <div className={`text-[10px] text-sumi/35 ${horizontal ? "" : "text-center mt-2"}`}>
          なし
        </div>
      )}
      <div className={horizontal ? "flex gap-1.5 flex-wrap" : "grid grid-cols-2 gap-1 sm:gap-1.5"}>
        {pieces.map((p) => {
          const selected =
            selection?.type === "hand" && selection.piece === p && selection.owner === owner;
          return (
            <button
              key={p}
              onClick={() => interactive && onPieceClick?.(p)}
              disabled={!interactive}
              className={[
                "relative w-7 h-8 sm:w-8 sm:h-9 flex items-center justify-center",
                interactive ? "cursor-pointer" : "cursor-default",
                selected ? "drop-shadow-[0_0_5px_rgba(176,58,46,0.8)]" : "",
              ].join(" ")}
            >
              <KomaPiece type={p} owner={owner} small />
              {hand[p] > 1 && (
                <span className="absolute -top-1 -right-1 bg-sumi text-washi text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold z-10">
                  {hand[p]}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
