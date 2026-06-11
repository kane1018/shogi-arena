"use client";

// トーナメント表(横スクロール対応)
import type { Match, Participant, ResultType } from "@/lib/types";
import { roundName } from "@/lib/tournament";
import { Chip } from "./ui";

export const RESULT_LABELS: Record<ResultType, string> = {
  checkmate: "終了",
  resign: "投了",
  timeout: "時間切れ",
  foul: "反則",
  withdrawal: "棄権",
  bye: "不戦勝",
  sennichite: "千日手",
  jishogi: "持将棋",
};

export function matchStatusChip(m: Match) {
  if (m.status === "bye") return <Chip tone="gray">不戦勝</Chip>;
  if (m.status === "playing") return <Chip tone="red" className="anim-glow">対局中</Chip>;
  if (m.status === "finished")
    return <Chip tone="green">{m.resultType ? RESULT_LABELS[m.resultType] : "終了"}</Chip>;
  return <Chip tone="gray">未開始</Chip>;
}

export function BracketView({
  matches,
  participants,
  onMatchClick,
  highlightMatchId,
}: {
  matches: Match[];
  participants: Participant[];
  onMatchClick?: (m: Match) => void;
  highlightMatchId?: string | null;
}) {
  const main = matches.filter((m) => !m.isThirdPlace);
  const third = matches.find((m) => m.isThirdPlace) ?? null;
  if (main.length === 0) return null;
  const maxRound = Math.max(...main.map((m) => m.round));
  const rounds = Array.from({ length: maxRound }, (_, i) =>
    main.filter((m) => m.round === i + 1).sort((a, b) => a.matchNumber - b.matchNumber)
  );
  const pmap = new Map(participants.map((p) => [p.id, p]));
  const name = (id: string | null) => (id ? pmap.get(id)?.displayName ?? "?" : null);

  return (
    <div className="bracket-scroll overflow-x-auto pb-3">
      <div className="flex gap-6 sm:gap-10 min-w-max px-1 items-stretch">
        {rounds.map((roundMatches, ri) => (
          <div key={ri} className="flex flex-col w-44 sm:w-52">
            <div className="text-center text-xs font-bold text-sumi/55 mb-3 font-serif-jp tracking-widest">
              {roundName(ri + 1, maxRound)}
            </div>
            <div className="flex flex-col justify-around flex-1 gap-3">
              {roundMatches.map((m) => (
                <MatchCard
                  key={m.id}
                  match={m}
                  senteName={name(m.senteParticipantId)}
                  goteName={name(m.goteParticipantId)}
                  onClick={onMatchClick ? () => onMatchClick(m) : undefined}
                  highlight={m.id === highlightMatchId}
                />
              ))}
            </div>
          </div>
        ))}
        {third && (
          <div className="flex flex-col w-44 sm:w-52">
            <div className="text-center text-xs font-bold text-sumi/55 mb-3 font-serif-jp tracking-widest">
              3位決定戦
            </div>
            <div className="flex flex-col justify-end flex-1">
              <MatchCard
                match={third}
                senteName={name(third.senteParticipantId)}
                goteName={name(third.goteParticipantId)}
                onClick={onMatchClick ? () => onMatchClick(third) : undefined}
                highlight={third.id === highlightMatchId}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({
  match,
  senteName,
  goteName,
  onClick,
  highlight,
}: {
  match: Match;
  senteName: string | null;
  goteName: string | null;
  onClick?: () => void;
  highlight?: boolean;
}) {
  const Row = ({ pname, isWinner, mark }: { pname: string | null; isWinner: boolean; mark: string }) => (
    <div
      className={[
        "flex items-center gap-1.5 px-3 py-2 text-sm transition-colors duration-500",
        isWinner ? "bg-kogane/15 font-bold text-sumi" : "text-sumi/75",
        !pname ? "text-sumi/30 italic" : "",
      ].join(" ")}
    >
      <span className="text-xs text-sumi/40 shrink-0">{mark}</span>
      <span className="truncate">{pname ?? "(未定)"}</span>
      {isWinner && <span className="ml-auto text-kogane text-xs anim-pop-in shrink-0">勝</span>}
    </div>
  );
  const wid = match.winnerParticipantId;
  return (
    <div
      onClick={onClick}
      className={[
        "bg-white rounded-xl border overflow-hidden shadow-washi transition-all",
        onClick ? "cursor-pointer hover:border-kogane hover:shadow-md" : "",
        highlight ? "border-kogane ring-2 ring-kogane/30" : "border-sumi/12",
        match.status === "playing" ? "border-shu/40" : "",
      ].join(" ")}
    >
      <Row
        pname={senteName}
        isWinner={wid !== null && wid === match.senteParticipantId}
        mark="☗"
      />
      <div className="border-t border-sumi/8" />
      <Row
        pname={goteName}
        isWinner={wid !== null && wid === match.goteParticipantId}
        mark="☖"
      />
      <div className="px-3 py-1.5 bg-washi-dark/50 flex items-center justify-between">
        {matchStatusChip(match)}
        {onClick && <span className="text-[10px] text-sumi/40">詳細 →</span>}
      </div>
    </div>
  );
}
