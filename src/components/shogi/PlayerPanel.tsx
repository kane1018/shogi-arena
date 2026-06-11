"use client";

// 対局者情報 + 時計表示パネル
import type { Player, TimeControl } from "@/lib/types";
import type { ClockSide } from "./clock";
import { formatClock, hasClock } from "./clock";

export function PlayerPanel({
  player,
  name,
  rank,
  clockSide,
  isTurn,
  tc,
  compact = false,
}: {
  player: Player;
  name: string;
  rank?: string;
  clockSide: ClockSide | null;
  isTurn: boolean;
  tc: TimeControl;
  compact?: boolean;
}) {
  const mark = player === "sente" ? "☗" : "☖";
  const label = player === "sente" ? "先手" : "後手";
  return (
    <div
      className={[
        "rounded-xl border transition-all duration-300",
        compact ? "px-3 py-2 flex items-center justify-between gap-2" : "p-4",
        isTurn
          ? "bg-fukamidori text-washi border-kogane/60 anim-glow"
          : "bg-white/70 text-sumi border-sumi/15",
      ].join(" ")}
    >
      <div className={compact ? "flex items-center gap-2 min-w-0" : ""}>
        <div className={`flex items-center gap-1.5 text-xs ${isTurn ? "text-kogane-light" : "text-sumi/50"}`}>
          <span className="text-base leading-none">{mark}</span>
          <span>{label}</span>
          {isTurn && <span className="text-[10px] border border-current rounded px-1">手番</span>}
        </div>
        <div className={`font-serif-jp font-bold truncate ${compact ? "text-sm" : "text-lg mt-1"}`}>
          {name}
          {rank && (
            <span className={`text-xs font-normal ml-1.5 ${isTurn ? "text-washi/60" : "text-sumi/45"}`}>
              {rank}
            </span>
          )}
        </div>
      </div>
      {clockSide && hasClock(tc) && (
        <div className={compact ? "text-right shrink-0" : "mt-2"}>
          <div
            className={[
              "font-mono font-bold tabular-nums leading-none",
              compact ? "text-xl" : "text-3xl",
              clockSide.inByoyomi ? "text-shu" : "",
              clockSide.inByoyomi && isTurn ? "text-[#ff8a7a]" : "",
            ].join(" ")}
          >
            {formatClock(clockSide)}
          </div>
          <div className={`text-[10px] mt-1 ${isTurn ? "text-washi/55" : "text-sumi/45"}`}>
            {clockSide.inByoyomi
              ? `秒読み ${tc.byoyomiSec}秒`
              : tc.fischerSec > 0
                ? `+${tc.fischerSec}秒/手`
                : tc.byoyomiSec > 0
                  ? `持ち時間(秒読み${tc.byoyomiSec}秒)`
                  : "切れ負け"}
          </div>
        </div>
      )}
    </div>
  );
}
