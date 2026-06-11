"use client";

// 対局時計ロジック: 持ち時間 + 秒読み / 切れ負け / フィッシャー対応
import { useCallback, useEffect, useRef, useState } from "react";
import type { Player, TimeControl } from "@/lib/types";

export interface ClockSide {
  mainMs: number;   // 残り持ち時間
  byoMs: number;    // 残り秒読み(秒読み突入後に使用)
  inByoyomi: boolean;
}

export interface ClockState {
  sente: ClockSide;
  gote: ClockSide;
  running: boolean;
  activePlayer: Player;
  timedOut: Player | null;
}

function initSide(tc: TimeControl): ClockSide {
  return {
    mainMs: tc.mainSec * 1000,
    byoMs: tc.byoyomiSec * 1000,
    inByoyomi: tc.mainSec === 0 && tc.byoyomiSec > 0,
  };
}

/** 時計が有効か(すべて0なら時間無制限) */
export function hasClock(tc: TimeControl): boolean {
  return tc.mainSec > 0 || tc.byoyomiSec > 0;
}

export function useGameClock(tc: TimeControl, enabled: boolean) {
  const [clock, setClock] = useState<ClockState>(() => ({
    sente: initSide(tc),
    gote: initSide(tc),
    running: false,
    activePlayer: "sente",
    timedOut: null,
  }));
  const lastTick = useRef<number>(0);

  useEffect(() => {
    if (!enabled || !clock.running || clock.timedOut) return;
    lastTick.current = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      const delta = now - lastTick.current;
      lastTick.current = now;
      setClock((prev) => {
        if (!prev.running || prev.timedOut) return prev;
        const side = { ...prev[prev.activePlayer] };
        let timedOut: Player | null = null;
        if (!side.inByoyomi) {
          side.mainMs -= delta;
          if (side.mainMs <= 0) {
            if (tc.byoyomiSec > 0) {
              side.inByoyomi = true;
              side.byoMs = tc.byoyomiSec * 1000 + side.mainMs; // 残りを繰越
              side.mainMs = 0;
            } else {
              side.mainMs = 0;
              timedOut = prev.activePlayer;
            }
          }
        } else {
          side.byoMs -= delta;
          if (side.byoMs <= 0) {
            side.byoMs = 0;
            timedOut = prev.activePlayer;
          }
        }
        return {
          ...prev,
          [prev.activePlayer]: side,
          timedOut,
          running: timedOut ? false : prev.running,
        };
      });
    }, 100);
    return () => clearInterval(id);
  }, [enabled, clock.running, clock.timedOut, clock.activePlayer, tc.byoyomiSec]);

  /** 着手時に呼ぶ: フィッシャー加算・秒読みリセットし手番交代 */
  const onMove = useCallback((nextPlayer: Player) => {
    setClock((prev) => {
      const mover = prev.activePlayer;
      const side = { ...prev[mover] };
      if (tc.fischerSec > 0) side.mainMs += tc.fischerSec * 1000;
      if (side.inByoyomi) side.byoMs = tc.byoyomiSec * 1000; // 秒読みリセット
      return { ...prev, [mover]: side, activePlayer: nextPlayer };
    });
  }, [tc.fischerSec, tc.byoyomiSec]);

  const start = useCallback(() => setClock((p) => ({ ...p, running: true })), []);
  const pause = useCallback(() => setClock((p) => ({ ...p, running: false })), []);
  const setActive = useCallback((player: Player) => {
    setClock((p) => ({ ...p, activePlayer: player }));
  }, []);

  return { clock, onMove, start, pause, setActive };
}

export function formatClock(side: ClockSide): string {
  if (side.inByoyomi) {
    return `${Math.ceil(side.byoMs / 1000)}`;
  }
  const total = Math.max(0, Math.ceil(side.mainMs / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
