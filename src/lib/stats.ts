"use client";

// 戦歴集計ロジック
import type { PersonalRecord, Tournament } from "./types";
import { getParticipants, getTournaments, getProfile } from "./store";

export interface CareerStats {
  total: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;        // 0-100
  currentStreak: number;
  maxStreak: number;
  senteGames: number;
  senteWins: number;
  goteGames: number;
  goteWins: number;
  championships: number;
  runnerUps: number;
  best4: number;
}

export function computeStats(records: PersonalRecord[]): CareerStats {
  const sorted = [...records].sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );
  let wins = 0, losses = 0, draws = 0;
  let streak = 0, maxStreak = 0;
  let senteGames = 0, senteWins = 0, goteGames = 0, goteWins = 0;
  for (const r of sorted) {
    if (r.result === "win") { wins++; streak++; maxStreak = Math.max(maxStreak, streak); }
    else if (r.result === "lose") { losses++; streak = 0; }
    else { draws++; }
    if (r.isSente) { senteGames++; if (r.result === "win") senteWins++; }
    else { goteGames++; if (r.result === "win") goteWins++; }
  }
  const decisive = wins + losses;
  const { championships, runnerUps, best4 } = computeTitles();
  return {
    total: sorted.length,
    wins, losses, draws,
    winRate: decisive > 0 ? Math.round((wins / decisive) * 100) : 0,
    currentStreak: streak,
    maxStreak,
    senteGames, senteWins, goteGames, goteWins,
    championships, runnerUps, best4,
  };
}

/** 優勝・準優勝・ベスト4回数(表示名一致で判定) */
function computeTitles(): { championships: number; runnerUps: number; best4: number } {
  const profile = getProfile();
  let championships = 0, runnerUps = 0, best4 = 0;
  for (const t of getTournaments()) {
    if (t.status !== "finished") continue;
    const ps = getParticipants(t.id);
    const isMe = (pid: string | null) =>
      pid !== null && ps.find((p) => p.id === pid)?.displayName === profile.displayName;
    if (isMe(t.winnerParticipantId)) championships++;
    else if (isMe(t.runnerUpParticipantId)) runnerUps++;
    else if (isMe(t.thirdPlaceParticipantId)) best4++;
  }
  return { championships, runnerUps, best4 };
}

export interface OpponentStats {
  name: string;
  games: number;
  wins: number;
  losses: number;
}

export function computeOpponentStats(records: PersonalRecord[]): OpponentStats[] {
  const map = new Map<string, OpponentStats>();
  for (const r of records) {
    const s = map.get(r.opponentName) ?? { name: r.opponentName, games: 0, wins: 0, losses: 0 };
    s.games++;
    if (r.result === "win") s.wins++;
    else if (r.result === "lose") s.losses++;
    map.set(r.opponentName, s);
  }
  return [...map.values()].sort((a, b) => b.games - a.games);
}

export interface TournamentStats {
  tournamentId: string;
  name: string;
  games: number;
  wins: number;
  losses: number;
}

export function computeTournamentStats(records: PersonalRecord[]): TournamentStats[] {
  const map = new Map<string, TournamentStats>();
  for (const r of records) {
    const s = map.get(r.tournamentId) ?? {
      tournamentId: r.tournamentId, name: r.tournamentName, games: 0, wins: 0, losses: 0,
    };
    s.games++;
    if (r.result === "win") s.wins++;
    else if (r.result === "lose") s.losses++;
    map.set(r.tournamentId, s);
  }
  return [...map.values()];
}

export interface MyTournamentEntry {
  tournament: Tournament;
  placement: string | null; // "優勝" 等
  wins: number;
  losses: number;
}

/** 自分が参加した大会一覧(表示名一致で判定) */
export function myTournaments(records: PersonalRecord[]): MyTournamentEntry[] {
  const profile = getProfile();
  const byId = new Map(computeTournamentStats(records).map((s) => [s.tournamentId, s]));
  const result: MyTournamentEntry[] = [];
  for (const t of getTournaments()) {
    const ps = getParticipants(t.id);
    const me = ps.find((p) => p.displayName === profile.displayName);
    if (!me && !byId.has(t.id)) continue;
    let placement: string | null = null;
    if (me && t.status === "finished") {
      if (t.winnerParticipantId === me.id) placement = "優勝";
      else if (t.runnerUpParticipantId === me.id) placement = "準優勝";
      else if (t.thirdPlaceParticipantId === me.id) placement = "第3位";
      else placement = "出場";
    }
    const stats = byId.get(t.id);
    result.push({
      tournament: t,
      placement,
      wins: stats?.wins ?? 0,
      losses: stats?.losses ?? 0,
    });
  }
  return result.sort(
    (a, b) => new Date(b.tournament.createdAt).getTime() - new Date(a.tournament.createdAt).getTime()
  );
}
