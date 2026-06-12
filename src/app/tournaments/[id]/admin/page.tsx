"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import type { Match, Participant, ResultType, Tournament } from "@/lib/types";
import {
  deleteMatchesOfTournament, deleteParticipant, genId, getMatches,
  getParticipants, getTournament, saveMatch, saveMatches,
  saveParticipant, saveTournament,
} from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { useAdminSync } from "@/lib/sync";
import {
  applyFinalResults, generateBracket, recomputeBracket,
} from "@/lib/tournament";
import { BracketView, RESULT_LABELS } from "@/components/BracketView";
import { ChampionBanner } from "@/components/ChampionBanner";
import {
  AVATAR_PIECES, Button, Card, CardHeader, Chip, ConfirmDialog,
  EmptyState, Input, Label, Loading, Modal, PieceAvatar, Select,
} from "@/components/ui";

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPageInner />
    </Suspense>
  );
}

function AdminPageInner() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const key = searchParams.get("key") ?? "";
  const mounted = useMounted();
  const tournament = useStoreValue(() => getTournament(id), null);
  const participants = useStoreValue(() => getParticipants(id), []);
  const matches = useStoreValue(() => getMatches(id), []);
  // サーバー同期: 初回復元(別端末対応) + ローカル変更の自動送信
  const syncReady = useAdminSync(id, key, mounted);

  if (!mounted || (!tournament && !syncReady)) return <Loading label="大会データを確認中…" />;
  if (!tournament) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full">
        <Card>
          <EmptyState icon="香" title="大会が見つかりません" />
        </Card>
      </div>
    );
  }
  if (key !== tournament.adminKey) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 w-full">
        <Card>
          <EmptyState
            icon="王"
            title="管理キーが正しくありません"
            description="大会作成時に発行された管理用URLからアクセスしてください。"
            action={
              <Link href={`/tournaments/${id}`}>
                <Button variant="secondary">閲覧ページを開く</Button>
              </Link>
            }
          />
        </Card>
      </div>
    );
  }

  return (
    <AdminContent
      tournament={tournament}
      participants={participants}
      matches={matches}
      adminKey={key}
    />
  );
}

// ===== 管理画面本体 =====
function AdminContent({
  tournament,
  participants,
  matches,
  adminKey,
}: {
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  adminKey: string;
}) {
  const router = useRouter();
  const [editTarget, setEditTarget] = useState<Participant | "new" | null>(null);
  const [resultTarget, setResultTarget] = useState<Match | null>(null);
  const [confirmGenerate, setConfirmGenerate] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState<"view" | "admin" | null>(null);

  const active = participants.filter((p) => p.status === "active");
  const finished = matches.filter((m) => m.status === "finished" || m.status === "bye").length;
  const playable = matches.filter((m) => m.status !== "bye").length;

  const copyUrl = async (type: "view" | "admin") => {
    const base = `${location.origin}/tournaments/${tournament.id}`;
    const url = type === "admin" ? `${base}/admin?key=${adminKey}` : base;
    await navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 1600);
  };

  const generate = () => {
    deleteMatchesOfTournament(tournament.id);
    const bracket = generateBracket(tournament, participants);
    saveMatches(bracket);
    saveTournament({
      ...tournament,
      status: "ongoing",
      winnerParticipantId: null,
      runnerUpParticipantId: null,
      thirdPlaceParticipantId: null,
    });
    setConfirmGenerate(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-10 w-full space-y-6">
      {/* ヘッダー */}
      <div className="anim-fade-in-up">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-serif-jp text-2xl sm:text-3xl font-bold">{tournament.name}</h1>
          <Chip tone="gold">管理モード</Chip>
        </div>
        <p className="text-sm text-sumi/55 mt-2">
          開催日: {tournament.date || "未定"} ・ 参加者: {active.length}名
          {matches.length > 0 && ` ・ 進行: ${finished}/${playable + (matches.length - playable)}局終了`}
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Button variant="secondary" onClick={() => copyUrl("view")}>
            {copied === "view" ? "コピーしました ✓" : "閲覧用URLをコピー"}
          </Button>
          <Button variant="secondary" onClick={() => copyUrl("admin")}>
            {copied === "admin" ? "コピーしました ✓" : "管理用URLをコピー"}
          </Button>
          <Button variant="ghost" onClick={() => setSettingsOpen(true)}>大会設定</Button>
          <Link href={`/tournaments/${tournament.id}`}>
            <Button variant="ghost">閲覧ページを見る</Button>
          </Link>
        </div>
      </div>

      <ChampionBanner tournament={tournament} participants={participants} />

      {/* トーナメント表 */}
      <Card className="p-5">
        <CardHeader
          title="トーナメント表"
          action={
            <Button
              variant={matches.length === 0 ? "gold" : "secondary"}
              onClick={() => (matches.length === 0 ? generate() : setConfirmGenerate(true))}
              disabled={active.length < 2}
            >
              {matches.length === 0 ? "トーナメント表を生成" : "組み合わせを再生成"}
            </Button>
          }
        />
        {active.length < 2 && matches.length === 0 ? (
          <EmptyState
            icon="桂"
            title="参加者が2名以上必要です"
            description="下の参加者管理から参加者を追加してください。"
          />
        ) : matches.length === 0 ? (
          <EmptyState
            icon="桂"
            title="まだトーナメント表がありません"
            description="「トーナメント表を生成」を押すと組み合わせが決まります。"
          />
        ) : (
          <div className="px-1 pb-2">
            <BracketView
              matches={matches}
              participants={participants}
              onMatchClick={(m) => setResultTarget(m)}
            />
            <p className="text-xs text-sumi/45 mt-2">
              対局をタップすると、対局開始・勝敗入力・修正ができます。
            </p>
          </div>
        )}
      </Card>

      {/* 参加者管理 */}
      <Card className="p-5">
        <CardHeader
          title={`参加者管理(${participants.length}名)`}
          action={<Button variant="primary" onClick={() => setEditTarget("new")}>参加者を追加</Button>}
        />
        {participants.length === 0 ? (
          <EmptyState
            icon="歩"
            title="参加者を追加しましょう"
            description="名前だけでゲスト参加できます。"
            action={<Button variant="gold" onClick={() => setEditTarget("new")}>最初の参加者を追加</Button>}
          />
        ) : (
          <div className="space-y-2 px-1 pb-2">
            {participants.map((p, i) => (
              <ParticipantRow
                key={p.id}
                p={p}
                isFirst={i === 0}
                isLast={i === participants.length - 1}
                onEdit={() => setEditTarget(p)}
                neighbors={participants}
              />
            ))}
            {matches.length > 0 && (
              <p className="text-xs text-sumi/45 pt-1">
                ※ 並び替え・シード変更後は「組み合わせを再生成」で反映されます(結果はリセットされます)。
              </p>
            )}
          </div>
        )}
      </Card>

      {/* モーダル群 */}
      <ParticipantEditModal
        target={editTarget}
        tournament={tournament}
        participantCount={participants.length}
        onClose={() => setEditTarget(null)}
      />
      <MatchResultModal
        match={resultTarget}
        tournament={tournament}
        participants={participants}
        matches={matches}
        adminKey={adminKey}
        onClose={() => setResultTarget(null)}
      />
      <SettingsModal
        open={settingsOpen}
        tournament={tournament}
        onClose={() => setSettingsOpen(false)}
      />
      <ConfirmDialog
        open={confirmGenerate}
        title="組み合わせを再生成しますか?"
        message="現在のトーナメント表と入力済みの勝敗はすべてリセットされます。この操作は元に戻せません。"
        confirmLabel="再生成する"
        danger
        onConfirm={generate}
        onCancel={() => setConfirmGenerate(false)}
      />
    </div>
  );
}

// ===== 参加者行 =====
function ParticipantRow({
  p, isFirst, isLast, onEdit, neighbors,
}: {
  p: Participant;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  neighbors: Participant[];
}) {
  const swap = (dir: -1 | 1) => {
    const idx = neighbors.findIndex((x) => x.id === p.id);
    const other = neighbors[idx + dir];
    if (!other) return;
    saveParticipant({ ...p, order: other.order });
    saveParticipant({ ...other, order: p.order });
  };
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border border-sumi/10 bg-white px-3 sm:px-4 py-2.5 ${
        p.status === "withdrawn" ? "opacity-55" : ""
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <button onClick={() => swap(-1)} disabled={isFirst}
          className="text-sumi/40 hover:text-kogane disabled:opacity-20 text-xs cursor-pointer leading-none p-0.5">▲</button>
        <button onClick={() => swap(1)} disabled={isLast}
          className="text-sumi/40 hover:text-kogane disabled:opacity-20 text-xs cursor-pointer leading-none p-0.5">▼</button>
      </div>
      <PieceAvatar piece={p.avatar} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-sm truncate">
          {p.displayName}
          {p.seed !== null && <Chip tone="gold" className="ml-1.5">シード{p.seed}</Chip>}
          {p.status === "withdrawn" && <Chip tone="gray" className="ml-1.5">欠場</Chip>}
        </p>
        <p className="text-xs text-sumi/50 truncate">
          {[p.rank, p.affiliation, `R${p.rating}`].filter(Boolean).join(" ・ ")}
        </p>
      </div>
      <Button variant="ghost" className="shrink-0 px-3 py-1.5" onClick={onEdit}>編集</Button>
    </div>
  );
}

// ===== 参加者編集モーダル =====
function ParticipantEditModal({
  target, tournament, participantCount, onClose,
}: {
  target: Participant | "new" | null;
  tournament: Tournament;
  participantCount: number;
  onClose: () => void;
}) {
  const isNew = target === "new";
  const p = isNew || target === null ? null : target;
  const [confirmDelete, setConfirmDelete] = useState(false);

  // モーダルを開くたびに初期化するため、keyで再マウント
  if (target === null) return null;
  return (
    <ParticipantForm
      key={isNew ? "new" : p!.id}
      p={p}
      isNew={isNew}
      tournament={tournament}
      participantCount={participantCount}
      onClose={onClose}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
    />
  );
}

function ParticipantForm({
  p, isNew, tournament, participantCount, onClose, confirmDelete, setConfirmDelete,
}: {
  p: Participant | null;
  isNew: boolean;
  tournament: Tournament;
  participantCount: number;
  onClose: () => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
}) {
  const [name, setName] = useState(p?.displayName ?? "");
  const [avatar, setAvatar] = useState(p?.avatar ?? AVATAR_PIECES[7]);
  const [rank, setRank] = useState(p?.rank ?? "");
  const [affiliation, setAffiliation] = useState(p?.affiliation ?? "");
  const [rating, setRating] = useState(p?.rating ?? 1500);
  const [opening, setOpening] = useState(p?.favoriteOpening ?? "");
  const [seed, setSeed] = useState<string>(p?.seed?.toString() ?? "");
  const [withdrawn, setWithdrawn] = useState(p?.status === "withdrawn");
  const [error, setError] = useState("");

  const submit = () => {
    if (!name.trim()) {
      setError("表示名を入力してください。");
      return;
    }
    const participant: Participant = {
      id: p?.id ?? genId(),
      tournamentId: tournament.id,
      userId: p?.userId ?? null,
      guestName: name.trim(),
      displayName: name.trim(),
      avatar,
      rank: rank.trim(),
      affiliation: affiliation.trim(),
      rating,
      favoriteOpening: opening.trim(),
      seed: seed === "" ? null : Number(seed),
      status: withdrawn ? "withdrawn" : "active",
      order: p?.order ?? participantCount,
      createdAt: p?.createdAt ?? new Date().toISOString(),
    };
    saveParticipant(participant);
    onClose();
  };

  return (
    <>
      <Modal open onClose={onClose} title={isNew ? "参加者を追加" : "参加者を編集"}>
        <div className="space-y-4">
          <div>
            <Label required>表示名</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="例: 佐藤花子" maxLength={20} autoFocus />
          </div>
          <div>
            <Label>アイコン(駒)</Label>
            <div className="flex flex-wrap gap-2">
              {AVATAR_PIECES.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAvatar(a)}
                  className={`rounded-lg p-1 transition cursor-pointer ${avatar === a ? "ring-2 ring-kogane bg-kogane/10" : "hover:bg-sumi/5"}`}
                >
                  <PieceAvatar piece={a} size="sm" />
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>段級位</Label>
              <Input value={rank} onChange={(e) => setRank(e.target.value)} placeholder="例: 初段" maxLength={10} />
            </div>
            <div>
              <Label>レーティング</Label>
              <Input type="number" value={rating} min={0} max={4000} onChange={(e) => setRating(Number(e.target.value))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>所属</Label>
              <Input value={affiliation} onChange={(e) => setAffiliation(e.target.value)} placeholder="例: ○○将棋教室" maxLength={20} />
            </div>
            <div>
              <Label>得意戦法</Label>
              <Input value={opening} onChange={(e) => setOpening(e.target.value)} placeholder="例: 四間飛車" maxLength={20} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>シード順位</Label>
              <Select value={seed} onChange={(e) => setSeed(e.target.value)}>
                <option value="">シードなし</option>
                {Array.from({ length: 8 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>第{i + 1}シード</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm">
                <input type="checkbox" checked={withdrawn} onChange={(e) => setWithdrawn(e.target.checked)} className="w-4 h-4 accent-[#b03a2e]" />
                欠場にする
              </label>
            </div>
          </div>
          {error && <p className="text-sm text-shu">{error}</p>}
          <div className="flex justify-between pt-2">
            {!isNew ? (
              <Button variant="ghost" className="text-shu" onClick={() => setConfirmDelete(true)}>削除</Button>
            ) : <span />}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>キャンセル</Button>
              <Button variant="primary" onClick={submit}>{isNew ? "追加する" : "保存する"}</Button>
            </div>
          </div>
        </div>
      </Modal>
      <ConfirmDialog
        open={confirmDelete}
        title="参加者を削除しますか?"
        message={`「${p?.displayName}」を削除します。トーナメント表生成後の場合は再生成が必要です。`}
        confirmLabel="削除する"
        danger
        onConfirm={() => {
          if (p) deleteParticipant(p.id);
          setConfirmDelete(false);
          onClose();
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}

// ===== 勝敗入力モーダル =====
function MatchResultModal({
  match, tournament, participants, matches, adminKey, onClose,
}: {
  match: Match | null;
  tournament: Tournament;
  participants: Participant[];
  matches: Match[];
  adminKey: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pendingResult, setPendingResult] = useState<{ winnerId: string | null; resultType: ResultType } | null>(null);

  if (!match) return null;
  const current = matches.find((m) => m.id === match.id) ?? match;
  const sente = participants.find((p) => p.id === current.senteParticipantId);
  const gote = participants.find((p) => p.id === current.goteParticipantId);
  const ready = sente && gote;

  const startMatch = () => {
    saveMatch({ ...current, status: "playing", startedAt: current.startedAt ?? new Date().toISOString() });
    router.push(`/tournaments/${tournament.id}/matches/${current.id}?key=${adminKey}`);
  };

  const confirmResult = () => {
    if (!pendingResult) return;
    const updated: Match = {
      ...current,
      winnerParticipantId: pendingResult.winnerId,
      status: "finished",
      resultType: pendingResult.resultType,
      endedAt: new Date().toISOString(),
    };
    let all = matches.map((m) => (m.id === updated.id ? updated : m));
    all = recomputeBracket(all);
    saveMatches(all);
    const t = applyFinalResults(tournament, all);
    saveTournament(t);
    setPendingResult(null);
    onClose();
  };

  const resultOptions: { type: ResultType; label: string }[] = [
    { type: "resign", label: "投了" },
    { type: "checkmate", label: "詰み" },
    { type: "timeout", label: "時間切れ" },
    { type: "foul", label: "反則" },
    { type: "withdrawal", label: "棄権" },
  ];

  return (
    <>
      <Modal open onClose={onClose} title="対局の管理">
        <div className="space-y-5">
          <div className="text-center">
            <p className="font-serif-jp text-lg font-bold">
              ☗{sente?.displayName ?? "未定"} <span className="text-sumi/40 mx-1">対</span> ☖{gote?.displayName ?? "未定"}
            </p>
            <p className="text-xs text-sumi/50 mt-1">
              現在: {current.status === "pending" ? "未開始" : current.status === "playing" ? "対局中" : current.status === "bye" ? "不戦勝" : `終了(${current.resultType ? RESULT_LABELS[current.resultType] : ""})`}
            </p>
          </div>

          {!ready ? (
            <p className="text-sm text-sumi/55 text-center py-3">
              対戦相手がまだ決まっていません。前のラウンドの結果待ちです。
            </p>
          ) : (
            <>
              {current.status !== "finished" && (
                <Button variant="gold" className="w-full py-3" onClick={startMatch}>
                  {current.status === "playing" ? "対局画面を開く" : "盤面で対局を開始する"}
                </Button>
              )}

              <div>
                <p className="text-sm font-medium text-sumi/70 mb-2">
                  {current.status === "finished" ? "勝敗を修正する" : "勝敗を直接入力する"}
                </p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { id: current.senteParticipantId!, label: `☗ ${sente!.displayName} の勝ち` },
                    { id: current.goteParticipantId!, label: `☖ ${gote!.displayName} の勝ち` },
                  ].map((opt) => (
                    <ResultButtons
                      key={opt.id}
                      label={opt.label}
                      options={resultOptions}
                      onPick={(rt) => setPendingResult({ winnerId: opt.id, resultType: rt })}
                    />
                  ))}
                </div>
              </div>
              {getReviewAvailable(current.id) && (
                <Link href={`/tournaments/${tournament.id}/matches/${current.id}/review`} className="block">
                  <Button variant="secondary" className="w-full">棋譜を再生する</Button>
                </Link>
              )}
            </>
          )}
        </div>
      </Modal>
      <ConfirmDialog
        open={pendingResult !== null}
        title="勝敗を確定しますか?"
        message={
          pendingResult && (
            <>
              <span className="font-bold">
                {participants.find((p) => p.id === pendingResult.winnerId)?.displayName}
              </span>
              の勝ち({RESULT_LABELS[pendingResult.resultType]})として確定します。
              勝者は自動的に次のラウンドへ進みます。
            </>
          )
        }
        confirmLabel="確定する"
        onConfirm={confirmResult}
        onCancel={() => setPendingResult(null)}
      />
    </>
  );
}

function getReviewAvailable(matchId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const games = JSON.parse(localStorage.getItem("shogi-arena:games") ?? "[]") as { matchId: string; moves: unknown[] }[];
    return games.some((g) => g.matchId === matchId && g.moves.length > 0);
  } catch {
    return false;
  }
}

function ResultButtons({
  label, options, onPick,
}: {
  label: string;
  options: { type: ResultType; label: string }[];
  onPick: (rt: ResultType) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="secondary" className="w-full text-xs px-2" onClick={() => setOpen(!open)}>
        {label}
      </Button>
      {open && (
        <div className="absolute z-10 top-full mt-1 left-0 right-0 bg-white rounded-xl border border-sumi/15 shadow-lg overflow-hidden anim-fade-in">
          {options.map((o) => (
            <button
              key={o.type}
              className="block w-full text-left px-3 py-2 text-xs hover:bg-kogane/10 cursor-pointer"
              onClick={() => {
                setOpen(false);
                onPick(o.type);
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ===== 大会設定モーダル =====
function SettingsModal({
  open, tournament, onClose,
}: {
  open: boolean;
  tournament: Tournament;
  onClose: () => void;
}) {
  const [name, setName] = useState(tournament.name);
  const [date, setDate] = useState(tournament.date);
  const [description, setDescription] = useState(tournament.description);
  const [isPublic, setIsPublic] = useState(tournament.isPublic);
  const [mainMin, setMainMin] = useState(Math.floor(tournament.timeControl.mainSec / 60));
  const [byoyomiSec, setByoyomiSec] = useState(tournament.timeControl.byoyomiSec);
  const [fischerSec, setFischerSec] = useState(tournament.timeControl.fischerSec);

  const submit = () => {
    saveTournament({
      ...tournament,
      name: name.trim() || tournament.name,
      date,
      description,
      isPublic,
      timeControl: {
        mainSec: Math.max(0, mainMin) * 60,
        byoyomiSec: Math.max(0, byoyomiSec),
        fischerSec: Math.max(0, fischerSec),
      },
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="大会設定の変更">
      <div className="space-y-4">
        <div>
          <Label>大会名</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </div>
        <div>
          <Label>開催日</Label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <Label>説明文</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>持ち時間(分)</Label>
            <Input type="number" min={0} value={mainMin} onChange={(e) => setMainMin(Number(e.target.value))} />
          </div>
          <div>
            <Label>秒読み(秒)</Label>
            <Input type="number" min={0} value={byoyomiSec} onChange={(e) => setByoyomiSec(Number(e.target.value))} />
          </div>
          <div>
            <Label>フィッシャー</Label>
            <Input type="number" min={0} value={fischerSec} onChange={(e) => setFischerSec(Number(e.target.value))} />
          </div>
        </div>
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="w-4 h-4 accent-[#1f3d2b]" />
          大会を公開する
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>キャンセル</Button>
          <Button variant="primary" onClick={submit}>保存する</Button>
        </div>
      </div>
    </Modal>
  );
}
