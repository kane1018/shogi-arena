// データ層: MVPではlocalStorageに保存する。
// 将来Supabase等に差し替える場合は、この公開関数群を非同期版に置き換える。
"use client";

import type {
  Badge, GameRecord, Match, Participant, PersonalRecord,
  Tournament, UserBadge, UserProfile,
} from "./types";

const PREFIX = "shogi-arena:";
const CHANGE_EVENT = "shogi-arena-store-change";

export function genId(): string {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
}

export function genAdminKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let key = "";
  const arr = new Uint8Array(24);
  if (typeof crypto !== "undefined") crypto.getRandomValues(arr);
  for (let i = 0; i < 24; i++) key += chars[(arr[i] ?? Math.floor(Math.random() * 36)) % chars.length];
  return key;
}

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// ===== プロフィール(MVPは端末ローカルの単一ユーザー) =====
export function getProfile(): UserProfile {
  const existing = read<UserProfile | null>("profile", null);
  if (existing) return existing;
  const now = new Date().toISOString();
  const profile: UserProfile = {
    id: genId(),
    displayName: "名無しの棋士",
    avatar: "王将",
    bio: "",
    rank: "",
    favoriteOpening: "",
    rating: 1500,
    affiliation: "",
    region: "",
    profileVisibility: "public",
    createdAt: now,
    updatedAt: now,
  };
  if (typeof window !== "undefined") write("profile", profile);
  return profile;
}

export function saveProfile(profile: UserProfile) {
  write("profile", { ...profile, updatedAt: new Date().toISOString() });
}

// ===== 大会 =====
export function getTournaments(): Tournament[] {
  return read<Tournament[]>("tournaments", []);
}

export function getTournament(id: string): Tournament | null {
  return getTournaments().find((t) => t.id === id) ?? null;
}

export function saveTournament(t: Tournament) {
  const list = getTournaments();
  const i = list.findIndex((x) => x.id === t.id);
  const updated = { ...t, updatedAt: new Date().toISOString() };
  if (i >= 0) list[i] = updated;
  else list.push(updated);
  write("tournaments", list);
}

// ===== 参加者 =====
export function getParticipants(tournamentId: string): Participant[] {
  return read<Participant[]>("participants", [])
    .filter((p) => p.tournamentId === tournamentId)
    .sort((a, b) => a.order - b.order);
}

export function getParticipant(id: string): Participant | null {
  return read<Participant[]>("participants", []).find((p) => p.id === id) ?? null;
}

export function saveParticipant(p: Participant) {
  const list = read<Participant[]>("participants", []);
  const i = list.findIndex((x) => x.id === p.id);
  if (i >= 0) list[i] = p;
  else list.push(p);
  write("participants", list);
}

export function deleteParticipant(id: string) {
  write("participants", read<Participant[]>("participants", []).filter((p) => p.id !== id));
}

// ===== 対局 =====
export function getMatches(tournamentId: string): Match[] {
  return read<Match[]>("matches", []).filter((m) => m.tournamentId === tournamentId);
}

export function getMatch(id: string): Match | null {
  return read<Match[]>("matches", []).find((m) => m.id === id) ?? null;
}

export function saveMatch(m: Match) {
  const list = read<Match[]>("matches", []);
  const i = list.findIndex((x) => x.id === m.id);
  const updated = { ...m, updatedAt: new Date().toISOString() };
  if (i >= 0) list[i] = updated;
  else list.push(updated);
  write("matches", list);
}

export function saveMatches(matches: Match[]) {
  const list = read<Match[]>("matches", []);
  for (const m of matches) {
    const i = list.findIndex((x) => x.id === m.id);
    if (i >= 0) list[i] = m;
    else list.push(m);
  }
  write("matches", list);
}

export function deleteMatchesOfTournament(tournamentId: string) {
  write("matches", read<Match[]>("matches", []).filter((m) => m.tournamentId !== tournamentId));
}

// ===== 棋譜 =====
export function getGameRecords(): GameRecord[] {
  return read<GameRecord[]>("games", []);
}

export function getGameRecordByMatch(matchId: string): GameRecord | null {
  return getGameRecords().find((g) => g.matchId === matchId) ?? null;
}

export function saveGameRecord(g: GameRecord) {
  const list = getGameRecords();
  const i = list.findIndex((x) => x.id === g.id || x.matchId === g.matchId);
  if (i >= 0) list[i] = g;
  else list.push(g);
  write("games", list);
}

// ===== サーバー同期用: 大会データ一括取得・一括反映 =====
export interface TournamentBundle {
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  games: GameRecord[];
}

export function collectTournamentBundle(tournamentId: string): TournamentBundle | null {
  const tournament = getTournament(tournamentId);
  if (!tournament) return null;
  return {
    tournament,
    participants: getParticipants(tournamentId),
    matches: getMatches(tournamentId),
    games: getGameRecords().filter((g) => g.tournamentId === tournamentId),
  };
}

/**
 * サーバーから取得したバンドルをlocalStorageへ反映する。
 * - 大会単位で置き換え(削除も反映される)
 * - adminKeyが空で渡された場合(閲覧者向けレスポンス)はローカルの値を保持
 * - 棋譜のお気に入りフラグは端末ローカルの値を保持
 * - 変更がなければ書き込まない(ポーリング時の無駄な再レンダー防止)
 */
export function applyTournamentBundle(bundle: TournamentBundle): boolean {
  const id = bundle.tournament.id;
  let changed = false;

  const localT = getTournament(id);
  const incomingT: Tournament = {
    ...bundle.tournament,
    adminKey: bundle.tournament.adminKey || localT?.adminKey || "",
  };
  if (JSON.stringify(localT) !== JSON.stringify(incomingT)) {
    const listT = getTournaments();
    const i = listT.findIndex((t) => t.id === id);
    if (i >= 0) listT[i] = incomingT;
    else listT.push(incomingT);
    write("tournaments", listT);
    changed = true;
  }

  const allP = read<Participant[]>("participants", []);
  const nextP = [...allP.filter((p) => p.tournamentId !== id), ...bundle.participants];
  if (JSON.stringify(allP) !== JSON.stringify(nextP)) {
    write("participants", nextP);
    changed = true;
  }

  const allM = read<Match[]>("matches", []);
  const nextM = [...allM.filter((m) => m.tournamentId !== id), ...bundle.matches];
  if (JSON.stringify(allM) !== JSON.stringify(nextM)) {
    write("matches", nextM);
    changed = true;
  }

  const allG = getGameRecords();
  const favorites = new Map(allG.map((g) => [g.matchId, g.favorite]));
  const incomingG = bundle.games.map((g) => ({
    ...g,
    favorite: favorites.get(g.matchId) ?? g.favorite,
  }));
  const nextG = [...allG.filter((g) => g.tournamentId !== id), ...incomingG];
  if (JSON.stringify(allG) !== JSON.stringify(nextG)) {
    write("games", nextG);
    changed = true;
  }

  return changed;
}

// ===== 戦歴 =====
export function getPersonalRecords(userId: string): PersonalRecord[] {
  return read<PersonalRecord[]>("records", []).filter((r) => r.userId === userId);
}

export function savePersonalRecord(r: PersonalRecord) {
  const list = read<PersonalRecord[]>("records", []);
  const i = list.findIndex((x) => x.id === r.id);
  if (i >= 0) list[i] = r;
  else list.push(r);
  write("records", list);
}

// ===== バッジ =====
export const BADGES: Badge[] = [
  { id: "first-win", name: "初勝利", description: "初めての勝利を挙げた", icon: "歩", condition: "1勝する" },
  { id: "streak-3", name: "3連勝", description: "3連勝を達成した", icon: "銀", condition: "3連勝する" },
  { id: "streak-5", name: "5連勝", description: "5連勝を達成した", icon: "金", condition: "5連勝する" },
  { id: "champion", name: "大会優勝者", description: "大会で優勝した", icon: "王", condition: "大会で優勝する" },
  { id: "runner-up", name: "準優勝者", description: "大会で準優勝した", icon: "飛", condition: "大会で準優勝する" },
  { id: "best-4", name: "ベスト4", description: "大会でベスト4に入った", icon: "角", condition: "大会でベスト4に入る" },
  { id: "furibisha", name: "振り飛車党", description: "振り飛車を得意戦法に設定", icon: "飛", condition: "得意戦法に振り飛車系を設定" },
  { id: "ibisha", name: "居飛車党", description: "居飛車を得意戦法に設定", icon: "角", condition: "得意戦法に居飛車系を設定" },
  { id: "craftsman", name: "対局職人", description: "30局以上対局した", icon: "桂", condition: "30局対局する" },
  { id: "games-100", name: "100局達成", description: "100局以上対局した", icon: "竜", condition: "100局対局する" },
];

export function getUserBadges(userId: string): UserBadge[] {
  return read<UserBadge[]>("userBadges", []).filter((b) => b.userId === userId);
}

export function awardBadge(userId: string, badgeId: string) {
  const list = read<UserBadge[]>("userBadges", []);
  if (list.some((b) => b.userId === userId && b.badgeId === badgeId)) return;
  list.push({ id: genId(), userId, badgeId, achievedAt: new Date().toISOString() });
  write("userBadges", list);
}

/** 戦歴からバッジを自動判定して付与 */
export function evaluateBadges(userId: string) {
  const records = getPersonalRecords(userId).sort(
    (a, b) => new Date(a.playedAt).getTime() - new Date(b.playedAt).getTime()
  );
  const wins = records.filter((r) => r.result === "win").length;
  if (wins >= 1) awardBadge(userId, "first-win");
  let streak = 0, maxStreak = 0;
  for (const r of records) {
    streak = r.result === "win" ? streak + 1 : 0;
    maxStreak = Math.max(maxStreak, streak);
  }
  if (maxStreak >= 3) awardBadge(userId, "streak-3");
  if (maxStreak >= 5) awardBadge(userId, "streak-5");
  if (records.length >= 30) awardBadge(userId, "craftsman");
  if (records.length >= 100) awardBadge(userId, "games-100");
  const profile = getProfile();
  if (/振り飛車|四間|三間|中飛車|向かい飛車/.test(profile.favoriteOpening)) awardBadge(userId, "furibisha");
  if (/居飛車|矢倉|角換わり|横歩|相掛かり/.test(profile.favoriteOpening)) awardBadge(userId, "ibisha");
}
