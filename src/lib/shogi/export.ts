// KIF / CSA 形式エクスポート
import type { GameRecord, MoveRecord, ResultType } from "@/lib/types";
import type { PieceType } from "./engine";
import { PIECE_KANJI } from "./engine";

const KANJI_NUM = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
const ZEN_NUM = ["", "１", "２", "３", "４", "５", "６", "７", "８", "９"];

const CSA_PIECE: Record<string, string> = {
  FU: "FU", KY: "KY", KE: "KE", GI: "GI", KI: "KI", KA: "KA", HI: "HI", OU: "OU",
  TO: "TO", NY: "NY", NK: "NK", NG: "NG", UM: "UM", RY: "RY",
};

function kifResultLine(result: ResultType | null): string {
  switch (result) {
    case "resign": return "投了";
    case "timeout": return "切れ負け";
    case "checkmate": return "詰み";
    case "foul": return "反則負け";
    case "sennichite": return "千日手";
    case "jishogi": return "持将棋";
    case "withdrawal": return "中断";
    default: return "中断";
  }
}

/** KIF形式テキストを生成 */
export function toKIF(game: GameRecord): string {
  const lines: string[] = [];
  const date = new Date(game.playedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  lines.push(`開始日時：${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`);
  if (game.tournamentName) lines.push(`棋戦：${game.tournamentName}`);
  lines.push(`先手：${game.senteName}`);
  lines.push(`後手：${game.goteName}`);
  lines.push(`手数----指手---------消費時間--`);
  game.moves.forEach((m, i) => {
    lines.push(`${String(i + 1).padStart(4, " ")} ${kifMoveText(m, i > 0 ? game.moves[i - 1] : null)}`);
  });
  lines.push(`${String(game.moves.length + 1).padStart(4, " ")} ${kifResultLine(game.result)}`);
  return lines.join("\n") + "\n";
}

function kifMoveText(m: MoveRecord, prev: MoveRecord | null): string {
  const same = prev && prev.to[0] === m.to[0] && prev.to[1] === m.to[1];
  const pos = same ? "同　" : `${ZEN_NUM[m.to[0]]}${KANJI_NUM[m.to[1]]}`;
  const name = PIECE_KANJI[m.piece as PieceType] ?? m.piece;
  let suffix = "";
  if (m.from === null) suffix = "打";
  else if (m.promoted) suffix = "成";
  const fromPart = m.from ? `(${m.from[0]}${m.from[1]})` : "";
  return `${pos}${name}${suffix}${fromPart}`;
}

/** CSA形式テキストを生成 */
export function toCSA(game: GameRecord): string {
  const lines: string[] = [];
  lines.push("V2.2");
  lines.push(`N+${game.senteName}`);
  lines.push(`N-${game.goteName}`);
  if (game.tournamentName) lines.push(`$EVENT:${game.tournamentName}`);
  const d = new Date(game.playedAt);
  const pad = (n: number) => String(n).padStart(2, "0");
  lines.push(`$START_TIME:${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`);
  lines.push("PI"); // 平手初期局面
  lines.push("+"); // 先手番開始
  for (const m of game.moves) {
    const sign = m.player === "sente" ? "+" : "-";
    const from = m.from ? `${m.from[0]}${m.from[1]}` : "00";
    const to = `${m.to[0]}${m.to[1]}`;
    // CSAは移動後の駒種を書く
    const PROMOTE: Record<string, string> = { FU: "TO", KY: "NY", KE: "NK", GI: "NG", KA: "UM", HI: "RY" };
    const pieceAfter = m.promoted ? (PROMOTE[m.piece] ?? m.piece) : m.piece;
    lines.push(`${sign}${from}${to}${CSA_PIECE[pieceAfter] ?? pieceAfter}`);
  }
  switch (game.result) {
    case "resign": lines.push("%TORYO"); break;
    case "timeout": lines.push("%TIME_UP"); break;
    case "checkmate": lines.push("%TSUMI"); break;
    case "foul": lines.push("%ILLEGAL_MOVE"); break;
    case "sennichite": lines.push("%SENNICHITE"); break;
    case "jishogi": lines.push("%JISHOGI"); break;
    default: lines.push("%CHUDAN"); break;
  }
  return lines.join("\n") + "\n";
}

/** テキストをファイルとしてダウンロード */
export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
