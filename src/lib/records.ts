"use client";

// 対局結果 → 戦歴・レーティング・バッジ連携
// MVP: 参加者の表示名がローカルプロフィールの表示名と一致した場合に
// 自分の戦歴として記録する(将来はuserIdによるアカウント紐づけに移行)。

import type { GameRecord, PersonalRecord } from "./types";
import {
  evaluateBadges, genId, getPersonalRecords, getProfile,
  saveProfile, savePersonalRecord, awardBadge,
} from "./store";

/** 簡易Eloレーティング(アプリ内参考レート) */
export function eloDelta(myRating: number, oppRating: number, won: boolean): number {
  const expected = 1 / (1 + Math.pow(10, (oppRating - myRating) / 400));
  return Math.round(32 * ((won ? 1 : 0) - expected));
}

/** 対局終了時に呼ぶ: 自分が対局者なら戦歴を記録しレートを更新 */
export function recordGameForLocalUser(
  game: GameRecord,
  opponentRating: { sente: number; gote: number }
) {
  if (!game.result || game.result === "bye") return;
  const profile = getProfile();
  const isSente = game.senteName === profile.displayName;
  const isGote = game.goteName === profile.displayName;
  if (!isSente && !isGote) return;
  if (isSente && isGote) return; // 自分対自分は記録しない

  // 同じ対局の二重記録を防止
  const existing = getPersonalRecords(profile.id);
  if (existing.some((r) => r.matchId === game.matchId)) return;

  const mySide = isSente ? "sente" : "gote";
  const result: PersonalRecord["result"] =
    game.winner === null ? "draw" : game.winner === mySide ? "win" : "lose";
  const oppRating = isSente ? opponentRating.gote : opponentRating.sente;
  const delta =
    result === "draw" ? 0 : eloDelta(profile.rating, oppRating, result === "win");

  const record: PersonalRecord = {
    id: genId(),
    userId: profile.id,
    matchId: game.matchId,
    tournamentId: game.tournamentId,
    tournamentName: game.tournamentName,
    result,
    opponentName: isSente ? game.goteName : game.senteName,
    isSente,
    opening: profile.favoriteOpening,
    ratingDelta: delta,
    playedAt: game.playedAt,
    createdAt: new Date().toISOString(),
  };
  savePersonalRecord(record);
  saveProfile({ ...profile, rating: profile.rating + delta });
  evaluateBadges(profile.id);
}

/** 大会終了時: 優勝・準優勝バッジ(表示名一致で判定) */
export function awardTournamentBadges(
  championName: string | null,
  runnerUpName: string | null
) {
  const profile = getProfile();
  if (championName && championName === profile.displayName) {
    awardBadge(profile.id, "champion");
  }
  if (runnerUpName && runnerUpName === profile.displayName) {
    awardBadge(profile.id, "runner-up");
  }
}
