// ===== 共通 =====
export type ID = string;

// ===== ユーザー =====
export type AvatarPiece =
  | "王将" | "飛車" | "角行" | "金将" | "銀将" | "桂馬" | "香車" | "歩兵" | "と金";

export interface UserProfile {
  id: ID;
  displayName: string;
  avatar: AvatarPiece;
  bio: string;
  rank: string; // 段級位(自由入力: 例 "初段", "3級")
  favoriteOpening: string;
  rating: number;
  affiliation: string;
  region: string;
  profileVisibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

// ===== 大会 =====
export type TournamentFormat =
  | "single_elimination"
  // 将来対応
  | "round_robin"
  | "swiss"
  | "double_elimination";

export type TournamentStatus = "draft" | "ongoing" | "finished";

export interface TimeControl {
  mainSec: number;      // 持ち時間(秒)。0なら持ち時間なし
  byoyomiSec: number;   // 秒読み(秒)。0なら切れ負け
  fischerSec: number;   // フィッシャー加算(秒)
}

export interface Tournament {
  id: ID;
  name: string;
  description: string;
  date: string; // ISO date
  format: TournamentFormat;
  status: TournamentStatus;
  isPublic: boolean;
  adminKey: string;
  timeControl: TimeControl;
  hasThirdPlaceMatch: boolean;
  maxParticipants: number;
  adminName: string;
  createdBy: ID | null;
  winnerParticipantId: ID | null;
  runnerUpParticipantId: ID | null;
  thirdPlaceParticipantId: ID | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 参加者 =====
export type ParticipantStatus = "active" | "withdrawn"; // 出場 / 棄権(欠場)

export interface Participant {
  id: ID;
  tournamentId: ID;
  userId: ID | null; // 後からアカウント紐づけ可能
  guestName: string | null;
  displayName: string;
  avatar: AvatarPiece;
  rank: string;
  affiliation: string;
  rating: number;
  favoriteOpening: string;
  seed: number | null; // null = シードなし
  status: ParticipantStatus;
  order: number; // 並び順
  createdAt: string;
}

// ===== 対局 =====
export type MatchStatus =
  | "pending"     // 未開始
  | "playing"     // 対局中
  | "finished"    // 終了
  | "bye";        // 不戦勝

export type ResultType =
  | "checkmate"     // 通常勝ち(詰み/投了以外含む)
  | "resign"        // 投了
  | "timeout"       // 時間切れ
  | "foul"          // 反則
  | "withdrawal"    // 棄権
  | "bye"           // 不戦勝
  | "sennichite"    // 千日手
  | "jishogi";      // 持将棋

export interface Match {
  id: ID;
  tournamentId: ID;
  round: number;        // 1始まり。3位決定戦は round = -1
  matchNumber: number;  // ラウンド内の番号(0始まり)
  isThirdPlace: boolean;
  senteParticipantId: ID | null;
  goteParticipantId: ID | null;
  winnerParticipantId: ID | null;
  status: MatchStatus;
  resultType: ResultType | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ===== 棋譜 =====
export type Player = "sente" | "gote";

export interface MoveRecord {
  moveNumber: number;        // 1始まり
  player: Player;
  from: [number, number] | null; // null = 駒打ち。[file(1-9), rank(1-9)]
  to: [number, number];
  piece: string;             // 移動前の駒種 (PieceType)
  capturedPiece: string | null;
  promoted: boolean;         // この手で成ったか
  notation: string;          // 例 "▲7六歩"
  timeRemainingSente: number | null;
  timeRemainingGote: number | null;
}

export interface GameRecord {
  id: ID;
  matchId: ID;
  tournamentId: ID;
  tournamentName: string;
  senteName: string;
  goteName: string;
  senteParticipantId: ID | null;
  goteParticipantId: ID | null;
  moves: MoveRecord[];
  result: ResultType | null;
  winner: Player | null;
  favorite: boolean;
  playedAt: string;
  createdAt: string;
}

// ===== 戦歴 =====
export interface PersonalRecord {
  id: ID;
  userId: ID;
  matchId: ID;
  tournamentId: ID;
  tournamentName: string;
  result: "win" | "lose" | "draw";
  opponentName: string;
  isSente: boolean;
  opening: string;
  ratingDelta: number;
  playedAt: string;
  createdAt: string;
}

// ===== バッジ =====
export interface Badge {
  id: ID;
  name: string;
  description: string;
  icon: string; // 絵文字または駒文字
  condition: string;
}

export interface UserBadge {
  id: ID;
  userId: ID;
  badgeId: ID;
  achievedAt: string;
}
