// 将棋エンジン: ルールロジック(UI非依存)
// 盤面は board[r][c]、r=0..8(上=後手陣)、c=0..8(左=9筋)。
// 表記座標: file = 9 - c (1-9, 右から)、rank = r + 1 (1-9, 上から)。

import type { Player, MoveRecord } from "@/lib/types";

export type PieceType =
  | "FU" | "KY" | "KE" | "GI" | "KI" | "KA" | "HI" | "OU"
  | "TO" | "NY" | "NK" | "NG" | "UM" | "RY";

export interface Piece {
  type: PieceType;
  owner: Player;
}

export type Square = Piece | null;
export type Board = Square[][];

export type HandPiece = "FU" | "KY" | "KE" | "GI" | "KI" | "KA" | "HI";
export type Hands = Record<Player, Record<HandPiece, number>>;

export interface GameState {
  board: Board;
  hands: Hands;
  turn: Player;
  moveCount: number;
}

export interface Move {
  from: [number, number] | null; // [r, c]、null = 駒打ち
  to: [number, number];
  piece: PieceType;   // 打つ駒 or 移動する駒(移動前)
  promote: boolean;
}

export const PIECE_KANJI: Record<PieceType, string> = {
  FU: "歩", KY: "香", KE: "桂", GI: "銀", KI: "金", KA: "角", HI: "飛", OU: "王",
  TO: "と", NY: "成香", NK: "成桂", NG: "成銀", UM: "馬", RY: "竜",
};

export const PROMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY",
};

export const DEMOTE_MAP: Partial<Record<PieceType, PieceType>> = {
  TO: "FU", NY: "KY", NK: "KE", NG: "GI", UM: "KA", RY: "HI",
};

export const HAND_ORDER: HandPiece[] = ["HI", "KA", "KI", "GI", "KE", "KY", "FU"];

const KANJI_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

export function emptyHands(): Hands {
  const z = (): Record<HandPiece, number> => ({ FU: 0, KY: 0, KE: 0, GI: 0, KI: 0, KA: 0, HI: 0 });
  return { sente: z(), gote: z() };
}

export function initialState(): GameState {
  const board: Board = Array.from({ length: 9 }, () => Array<Square>(9).fill(null));
  const back: PieceType[] = ["KY", "KE", "GI", "KI", "OU", "KI", "GI", "KE", "KY"];
  for (let c = 0; c < 9; c++) {
    board[0][c] = { type: back[c], owner: "gote" };
    board[8][c] = { type: back[c], owner: "sente" };
    board[2][c] = { type: "FU", owner: "gote" };
    board[6][c] = { type: "FU", owner: "sente" };
  }
  board[1][1] = { type: "HI", owner: "gote" };
  board[1][7] = { type: "KA", owner: "gote" };
  board[7][1] = { type: "KA", owner: "sente" };
  board[7][7] = { type: "HI", owner: "sente" };
  return { board, hands: emptyHands(), turn: "sente", moveCount: 0 };
}

export function cloneState(s: GameState): GameState {
  return {
    board: s.board.map((row) => row.map((sq) => (sq ? { ...sq } : null))),
    hands: {
      sente: { ...s.hands.sente },
      gote: { ...s.hands.gote },
    },
    turn: s.turn,
    moveCount: s.moveCount,
  };
}

const inBoard = (r: number, c: number) => r >= 0 && r < 9 && c >= 0 && c < 9;

// 駒の動き定義: dir = 後手なら反転。step=1歩, slide=走り
type MoveDef = { dr: number; dc: number; slide: boolean };

function moveDefs(type: PieceType): MoveDef[] {
  const s = (dr: number, dc: number): MoveDef => ({ dr, dc, slide: false });
  const sl = (dr: number, dc: number): MoveDef => ({ dr, dc, slide: true });
  const GOLD = [s(-1, 0), s(-1, -1), s(-1, 1), s(0, -1), s(0, 1), s(1, 0)];
  switch (type) {
    case "FU": return [s(-1, 0)];
    case "KY": return [sl(-1, 0)];
    case "KE": return [s(-2, -1), s(-2, 1)];
    case "GI": return [s(-1, 0), s(-1, -1), s(-1, 1), s(1, -1), s(1, 1)];
    case "KI": case "TO": case "NY": case "NK": case "NG": return GOLD;
    case "KA": return [sl(-1, -1), sl(-1, 1), sl(1, -1), sl(1, 1)];
    case "HI": return [sl(-1, 0), sl(1, 0), sl(0, -1), sl(0, 1)];
    case "OU": return [s(-1, 0), s(-1, -1), s(-1, 1), s(0, -1), s(0, 1), s(1, 0), s(1, -1), s(1, 1)];
    case "UM": return [sl(-1, -1), sl(-1, 1), sl(1, -1), sl(1, 1), s(-1, 0), s(1, 0), s(0, -1), s(0, 1)];
    case "RY": return [sl(-1, 0), sl(1, 0), sl(0, -1), sl(0, 1), s(-1, -1), s(-1, 1), s(1, -1), s(1, 1)];
  }
}

/** (r,c)の駒が動ける先(疑似合法手、王手放置は未考慮) */
export function pseudoMovesFrom(state: GameState, r: number, c: number): [number, number][] {
  const piece = state.board[r][c];
  if (!piece) return [];
  const sign = piece.owner === "sente" ? 1 : -1;
  const result: [number, number][] = [];
  for (const def of moveDefs(piece.type)) {
    let nr = r + def.dr * sign;
    let nc = c + def.dc * sign;
    while (inBoard(nr, nc)) {
      const target = state.board[nr][nc];
      if (target && target.owner === piece.owner) break;
      result.push([nr, nc]);
      if (target || !def.slide) break;
      nr += def.dr * sign;
      nc += def.dc * sign;
    }
  }
  return result;
}

function findKing(board: Board, owner: Player): [number, number] | null {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (board[r][c]?.type === "OU" && board[r][c]?.owner === owner) return [r, c];
  return null;
}

/** playerの王が王手されているか */
export function isInCheck(state: GameState, player: Player): boolean {
  const king = findKing(state.board, player);
  if (!king) return false;
  const opp: Player = player === "sente" ? "gote" : "sente";
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const p = state.board[r][c];
      if (p && p.owner === opp) {
        for (const [tr, tc] of pseudoMovesFrom(state, r, c)) {
          if (tr === king[0] && tc === king[1]) return true;
        }
      }
    }
  }
  return false;
}

/** 成りが可能か(敵陣絡み) */
export function canPromote(piece: Piece, fromR: number, toR: number): boolean {
  if (!PROMOTE_MAP[piece.type]) return false;
  const zone = piece.owner === "sente" ? (r: number) => r <= 2 : (r: number) => r >= 6;
  return zone(fromR) || zone(toR);
}

/** 成りが必須か(行き所のない駒) */
export function mustPromote(piece: Piece, toR: number): boolean {
  const last = piece.owner === "sente" ? 0 : 8;
  const second = piece.owner === "sente" ? 1 : 7;
  if ((piece.type === "FU" || piece.type === "KY") && toR === last) return true;
  if (piece.type === "KE" && (toR === last || toR === second)) return true;
  return false;
}

/** 二歩チェック: ownerの歩がその筋(列c)に既にあるか */
export function hasPawnOnFile(board: Board, owner: Player, c: number): boolean {
  for (let r = 0; r < 9; r++) {
    const p = board[r][c];
    if (p && p.owner === owner && p.type === "FU") return true;
  }
  return false;
}

/** 駒打ち可能なマス(二歩・行き所のない駒は除外、王手放置は applyMove側で除外) */
export function dropTargets(state: GameState, piece: HandPiece, owner: Player): [number, number][] {
  const result: [number, number][] = [];
  const last = owner === "sente" ? 0 : 8;
  const second = owner === "sente" ? 1 : 7;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      if (state.board[r][c]) continue;
      if ((piece === "FU" || piece === "KY") && r === last) continue;
      if (piece === "KE" && (r === last || r === second)) continue;
      if (piece === "FU" && hasPawnOnFile(state.board, owner, c)) continue;
      result.push([r, c]);
    }
  }
  return result;
}

/** 手を適用した新しい状態(合法性チェックなし) */
export function applyMoveRaw(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const me = state.turn;
  if (move.from) {
    const [fr, fc] = move.from;
    const piece = next.board[fr][fc]!;
    const target = next.board[move.to[0]][move.to[1]];
    if (target) {
      const handType = (DEMOTE_MAP[target.type] ?? target.type) as HandPiece;
      if (handType !== ("OU" as string)) next.hands[me][handType]++;
    }
    next.board[fr][fc] = null;
    next.board[move.to[0]][move.to[1]] = {
      type: move.promote ? PROMOTE_MAP[piece.type]! : piece.type,
      owner: me,
    };
  } else {
    next.hands[me][move.piece as HandPiece]--;
    next.board[move.to[0]][move.to[1]] = { type: move.piece, owner: me };
  }
  next.turn = me === "sente" ? "gote" : "sente";
  next.moveCount++;
  return next;
}

/** 手が合法か(王手放置チェック込み) */
export function isLegalMove(state: GameState, move: Move): boolean {
  const after = applyMoveRaw(state, move);
  return !isInCheck(after, state.turn);
}

/** 移動可能マス(合法手のみ) */
export function legalMovesFrom(state: GameState, r: number, c: number): [number, number][] {
  const piece = state.board[r][c];
  if (!piece || piece.owner !== state.turn) return [];
  return pseudoMovesFrom(state, r, c).filter(([tr, tc]) => {
    // 成り必須でない通常移動として判定(成り選択は同じ移動先なので合法性は同じ)
    const promote = mustPromote(piece, tr);
    return isLegalMove(state, { from: [r, c], to: [tr, tc], piece: piece.type, promote });
  });
}

/** 駒打ち可能マス(合法手のみ) */
export function legalDropsFor(state: GameState, piece: HandPiece): [number, number][] {
  if (state.hands[state.turn][piece] <= 0) return [];
  return dropTargets(state, piece, state.turn).filter(([r, c]) =>
    isLegalMove(state, { from: null, to: [r, c], piece, promote: false })
  );
}

/** 合法手が一つもないか(詰み or ステイルメイト) */
export function hasNoLegalMoves(state: GameState): boolean {
  for (let r = 0; r < 9; r++)
    for (let c = 0; c < 9; c++)
      if (state.board[r][c]?.owner === state.turn && legalMovesFrom(state, r, c).length > 0)
        return false;
  for (const hp of HAND_ORDER)
    if (legalDropsFor(state, hp).length > 0) return false;
  return true;
}

export function isCheckmate(state: GameState): boolean {
  return isInCheck(state, state.turn) && hasNoLegalMoves(state);
}

// ===== 座標変換・表記 =====
export const toFile = (c: number) => 9 - c;
export const toRank = (r: number) => r + 1;
export const fromFileRank = (file: number, rank: number): [number, number] => [rank - 1, 9 - file];

/** 指し手の日本語表記 例: ▲7六歩、△3四歩、▲2二角成、▲5五角打 */
export function notate(state: GameState, move: Move, prev: MoveRecord | null): string {
  const mark = state.turn === "sente" ? "▲" : "△";
  const file = toFile(move.to[1]);
  const rank = toRank(move.to[0]);
  let pos = `${file}${KANJI_NUM[rank]}`;
  if (prev && prev.to[0] === file && prev.to[1] === rank) pos = "同";
  const name = PIECE_KANJI[move.piece];
  let suffix = "";
  if (move.from === null) suffix = "打";
  else if (move.promote) suffix = "成";
  return `${mark}${pos}${name}${suffix}`;
}

/** UI用: 手を適用しMoveRecordを生成 */
export function makeMove(
  state: GameState,
  move: Move,
  prev: MoveRecord | null,
  timeSente: number | null,
  timeGote: number | null
): { state: GameState; record: MoveRecord } {
  const captured = state.board[move.to[0]][move.to[1]];
  const notation = notate(state, move, prev);
  const next = applyMoveRaw(state, move);
  const record: MoveRecord = {
    moveNumber: state.moveCount + 1,
    player: state.turn,
    from: move.from ? [toFile(move.from[1]), toRank(move.from[0])] : null,
    to: [toFile(move.to[1]), toRank(move.to[0])],
    piece: move.piece,
    capturedPiece: captured ? captured.type : null,
    promoted: move.promote,
    notation,
    timeRemainingSente: timeSente,
    timeRemainingGote: timeGote,
  };
  return { state: next, record };
}

/** 棋譜のリプレイ: moves[0..n) を初期局面から適用した状態を返す */
export function replayTo(moves: MoveRecord[], n: number): GameState {
  let state = initialState();
  for (let i = 0; i < n && i < moves.length; i++) {
    const m = moves[i];
    const move: Move = {
      from: m.from ? fromFileRank(m.from[0], m.from[1]) : null,
      to: fromFileRank(m.to[0], m.to[1]),
      piece: m.piece as PieceType,
      promote: m.promoted,
    };
    state = applyMoveRaw(state, move);
  }
  return state;
}
