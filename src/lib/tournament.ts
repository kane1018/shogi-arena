// トーナメント表生成・勝ち上がりロジック(シングルエリミネーション)
// 将来 round_robin / swiss / double_elimination を追加する場合は
// generateBracket / advanceWinner を形式ごとに分岐させる。

import type { Match, Participant, Tournament } from "./types";
import { genId } from "./store";

/** 2のべき乗に切り上げ */
export function bracketSize(n: number): number {
  let size = 1;
  while (size < n) size *= 2;
  return Math.max(size, 2);
}

/**
 * 標準シード配置順を生成。
 * 例 size=8 → [1,8,4,5,2,7,3,6](スロット順にどのシード番号が入るか)
 */
function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next: number[] = [];
    const len = order.length * 2;
    for (const s of order) {
      next.push(s);
      next.push(len + 1 - s);
    }
    order = next;
  }
  return order;
}

/**
 * 参加者をスロットに配置。
 * シード指定された参加者を上位シードとして優先し、残りは登録順。
 * 空きスロットは null(不戦勝)。
 */
export function assignSlots(participants: Participant[]): (Participant | null)[] {
  const active = participants.filter((p) => p.status === "active");
  const size = bracketSize(active.length);
  const seeded = active
    .filter((p) => p.seed !== null)
    .sort((a, b) => (a.seed! - b.seed!));
  const unseeded = active.filter((p) => p.seed === null);
  const ordered = [...seeded, ...unseeded]; // シード順位 = この配列のインデックス+1
  const order = seedOrder(size);
  const slots: (Participant | null)[] = Array(size).fill(null);
  order.forEach((seedNum, slotIdx) => {
    slots[slotIdx] = ordered[seedNum - 1] ?? null;
  });
  return slots;
}

/** トーナメント表(全ラウンドの対局)を生成 */
export function generateBracket(tournament: Tournament, participants: Participant[]): Match[] {
  const slots = assignSlots(participants);
  const size = slots.length;
  const rounds = Math.log2(size);
  const now = new Date().toISOString();
  const matches: Match[] = [];

  // 1回戦
  for (let i = 0; i < size / 2; i++) {
    const sente = slots[i * 2];
    const gote = slots[i * 2 + 1];
    const isBye = (sente === null) !== (gote === null);
    matches.push({
      id: genId(),
      tournamentId: tournament.id,
      round: 1,
      matchNumber: i,
      isThirdPlace: false,
      senteParticipantId: sente?.id ?? null,
      goteParticipantId: gote?.id ?? null,
      winnerParticipantId: isBye ? (sente?.id ?? gote?.id ?? null) : null,
      status: isBye ? "bye" : "pending",
      resultType: isBye ? "bye" : null,
      startedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 2回戦以降(空の枠)
  for (let r = 2; r <= rounds; r++) {
    const count = size / Math.pow(2, r);
    for (let i = 0; i < count; i++) {
      matches.push({
        id: genId(),
        tournamentId: tournament.id,
        round: r,
        matchNumber: i,
        isThirdPlace: false,
        senteParticipantId: null,
        goteParticipantId: null,
        winnerParticipantId: null,
        status: "pending",
        resultType: null,
        startedAt: null,
        endedAt: null,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // 3位決定戦
  if (tournament.hasThirdPlaceMatch && rounds >= 2) {
    matches.push({
      id: genId(),
      tournamentId: tournament.id,
      round: -1,
      matchNumber: 0,
      isThirdPlace: true,
      senteParticipantId: null,
      goteParticipantId: null,
      winnerParticipantId: null,
      status: "pending",
      resultType: null,
      startedAt: null,
      endedAt: null,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 不戦勝の勝者を2回戦に反映
  let result = matches;
  for (const m of matches.filter((m) => m.status === "bye")) {
    result = propagateWinner(result, m);
  }
  return result;
}

/** 勝者を次のラウンドへ反映した新しいmatches配列を返す */
export function propagateWinner(matches: Match[], finished: Match): Match[] {
  if (finished.isThirdPlace || !finished.winnerParticipantId) return matches;
  const maxRound = Math.max(...matches.filter((m) => !m.isThirdPlace).map((m) => m.round));
  const updated = matches.map((m) => ({ ...m }));

  if (finished.round < maxRound) {
    const next = updated.find(
      (m) => !m.isThirdPlace && m.round === finished.round + 1 &&
        m.matchNumber === Math.floor(finished.matchNumber / 2)
    );
    if (next) {
      if (finished.matchNumber % 2 === 0) next.senteParticipantId = finished.winnerParticipantId;
      else next.goteParticipantId = finished.winnerParticipantId;
      next.updatedAt = new Date().toISOString();
    }
  }

  // 準決勝の敗者を3位決定戦へ
  if (finished.round === maxRound - 1 && finished.status !== "bye") {
    const loser =
      finished.senteParticipantId === finished.winnerParticipantId
        ? finished.goteParticipantId
        : finished.senteParticipantId;
    const third = updated.find((m) => m.isThirdPlace);
    if (third && loser) {
      if (finished.matchNumber === 0) third.senteParticipantId = loser;
      else third.goteParticipantId = loser;
      third.updatedAt = new Date().toISOString();
    }
  }

  return updated;
}

/**
 * 全ラウンドの勝ち上がりを1回戦から再計算する。
 * 勝敗修正時に使用: 上流の結果変更で下流の対戦カードが変わった場合、
 * 矛盾する下流の結果(対局者でない勝者など)はリセットする。
 */
export function recomputeBracket(matches: Match[]): Match[] {
  let updated = matches.map((m) => ({ ...m }));
  const maxRound = Math.max(...updated.filter((m) => !m.isThirdPlace).map((m) => m.round));

  // 2回戦以降と3位決定戦の対戦カードをいったんクリア
  for (const m of updated) {
    if (m.isThirdPlace || m.round > 1) {
      m.senteParticipantId = null;
      m.goteParticipantId = null;
    }
  }

  // ラウンド順に勝者を反映
  // (propagateWinnerが配列を作り直すため、idで毎回引き直す)
  for (let r = 1; r <= maxRound; r++) {
    const ids = updated
      .filter((x) => !x.isThirdPlace && x.round === r)
      .map((x) => x.id);
    for (const id of ids) {
      const m = updated.find((x) => x.id === id)!;
      // 勝者が対局者でなくなっていたら結果をリセット
      if (
        m.winnerParticipantId &&
        m.winnerParticipantId !== m.senteParticipantId &&
        m.winnerParticipantId !== m.goteParticipantId
      ) {
        m.winnerParticipantId = null;
        m.status = "pending";
        m.resultType = null;
        m.startedAt = null;
        m.endedAt = null;
      }
      if (m.winnerParticipantId) {
        updated = propagateWinner(updated, m);
      }
    }
  }

  // 3位決定戦の整合性チェック
  const third = updated.find((m) => m.isThirdPlace);
  if (
    third?.winnerParticipantId &&
    third.winnerParticipantId !== third.senteParticipantId &&
    third.winnerParticipantId !== third.goteParticipantId
  ) {
    third.winnerParticipantId = null;
    third.status = "pending";
    third.resultType = null;
  }

  return updated;
}

/** 決勝・3位決定戦の結果からトーナメントの順位を更新 */
export function applyFinalResults(tournament: Tournament, matches: Match[]): Tournament {
  const maxRound = Math.max(...matches.filter((m) => !m.isThirdPlace).map((m) => m.round));
  const final = matches.find((m) => !m.isThirdPlace && m.round === maxRound);
  const third = matches.find((m) => m.isThirdPlace);
  const t = { ...tournament };
  if (final?.winnerParticipantId) {
    t.winnerParticipantId = final.winnerParticipantId;
    t.runnerUpParticipantId =
      final.senteParticipantId === final.winnerParticipantId
        ? final.goteParticipantId
        : final.senteParticipantId;
    t.status = "finished";
  }
  if (third?.winnerParticipantId) {
    t.thirdPlaceParticipantId = third.winnerParticipantId;
  }
  return t;
}

/** ラウンド名("1回戦", "準決勝", "決勝" など) */
export function roundName(round: number, maxRound: number): string {
  if (round === -1) return "3位決定戦";
  if (round === maxRound) return "決勝";
  if (round === maxRound - 1) return "準決勝";
  if (round === maxRound - 2) return "準々決勝";
  return `${round}回戦`;
}
