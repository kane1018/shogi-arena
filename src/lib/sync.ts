"use client";

// サーバー同期レイヤー
// 管理者端末: ローカル変更を /api/tournaments/[id] へ自動送信(デバウンス)
// 閲覧者端末: 定期的にサーバーから取得してlocalStorageへ反映
//
// localStorageを「キャッシュ + 楽観的UI」、サーバーを「共有元」として扱う。

import { useEffect, useState } from "react";
import {
  applyTournamentBundle, collectTournamentBundle, subscribe,
  type TournamentBundle,
} from "./store";

/** サーバーから大会データを取得してローカルへ反映。成功時true */
export async function pullTournament(id: string, adminKey?: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}`, {
      cache: "no-store",
      headers: adminKey ? { "x-admin-key": adminKey } : {},
    });
    if (!res.ok) return false;
    const bundle = (await res.json()) as TournamentBundle;
    // 未送信のローカル変更があるときは適用しない(古いサーバー状態での巻き戻り防止)
    if (!hasPendingPublish(id)) {
      applyTournamentBundle(bundle);
    }
    return true;
  } catch {
    return false; // オフライン等は無視(ローカルデータで動作継続)
  }
}

const inflightPublishes = new Set<string>();

/** ローカルの大会データをサーバーへ保存。成功時true */
export async function publishTournament(id: string): Promise<boolean> {
  const bundle = collectTournamentBundle(id);
  if (!bundle || !bundle.tournament.adminKey) return false;
  inflightPublishes.add(id);
  try {
    const res = await fetch(`/api/tournaments/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        "x-admin-key": bundle.tournament.adminKey,
      },
      body: JSON.stringify(bundle),
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    inflightPublishes.delete(id);
  }
}

const publishTimers = new Map<string, ReturnType<typeof setTimeout>>();

/** 送信待ち・送信中のローカル変更があるか */
function hasPendingPublish(id: string): boolean {
  return publishTimers.has(id) || inflightPublishes.has(id);
}

/** デバウンス付きpublish(連続編集を1回の送信にまとめる) */
export function schedulePublish(id: string, delayMs = 1200) {
  const existing = publishTimers.get(id);
  if (existing) clearTimeout(existing);
  publishTimers.set(
    id,
    setTimeout(() => {
      publishTimers.delete(id);
      void publishTournament(id);
    }, delayMs)
  );
}

/**
 * 管理者用フック: マウント時にサーバーから復元を試み、
 * 以降はローカル変更を自動的にサーバーへ送信する。
 * 戻り値: 初回のサーバー確認が完了したか(ローディング表示の判定用)
 */
export function useAdminSync(tournamentId: string, adminKey: string, enabled: boolean): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || !tournamentId || !adminKey) {
      setReady(true);
      return;
    }
    let publishing = false;
    let cancelled = false;
    // 初回: サーバーに既存データがあれば取り込み、なければ現在のローカルを公開
    void (async () => {
      const found = await pullTournament(tournamentId, adminKey);
      if (!found) void publishTournament(tournamentId);
      publishing = true;
      if (!cancelled) setReady(true);
    })();
    const unsubscribe = subscribe(() => {
      if (publishing) schedulePublish(tournamentId);
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [tournamentId, adminKey, enabled]);
  return ready;
}

/**
 * 閲覧者用フック: マウント時+一定間隔でサーバーから取得する。
 * 戻り値: 初回取得が完了したか(ローディング表示の判定用)
 */
export function useViewerSync(tournamentId: string, intervalMs = 5000, enabled = true): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!enabled || !tournamentId) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void pullTournament(tournamentId).finally(() => {
      if (!cancelled) setReady(true);
    });
    const timer = setInterval(() => void pullTournament(tournamentId), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [tournamentId, intervalMs, enabled]);
  return ready;
}
