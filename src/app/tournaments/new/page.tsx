"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, TournamentFormat } from "@/lib/types";
import { genAdminKey, genId, saveTournament } from "@/lib/store";
import { Button, Card, Input, Label, Select, Textarea } from "@/components/ui";

const FORMATS: { value: TournamentFormat; label: string; available: boolean }[] = [
  { value: "single_elimination", label: "シングルエリミネーション(勝ち抜き)", available: true },
  { value: "round_robin", label: "総当たり(近日対応)", available: false },
  { value: "swiss", label: "スイス式(近日対応)", available: false },
  { value: "double_elimination", label: "ダブルエリミネーション(近日対応)", available: false },
];

const TIME_PRESETS = [
  { label: "10分切れ負け", main: 600, byo: 0, fischer: 0 },
  { label: "10分+秒読み30秒", main: 600, byo: 30, fischer: 0 },
  { label: "5分+フィッシャー10秒", main: 300, byo: 0, fischer: 10 },
  { label: "30分+秒読み60秒", main: 1800, byo: 60, fischer: 0 },
  { label: "時計なし", main: 0, byo: 0, fischer: 0 },
];

export default function NewTournamentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [format, setFormat] = useState<TournamentFormat>("single_elimination");
  const [maxParticipants, setMaxParticipants] = useState(8);
  const [mainMin, setMainMin] = useState(10);
  const [byoyomiSec, setByoyomiSec] = useState(30);
  const [fischerSec, setFischerSec] = useState(0);
  const [hasThird, setHasThird] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const [adminName, setAdminName] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const applyPreset = (p: (typeof TIME_PRESETS)[number]) => {
    setMainMin(Math.floor(p.main / 60));
    setByoyomiSec(p.byo);
    setFischerSec(p.fischer);
  };

  const submit = () => {
    if (!name.trim()) {
      setError("大会名を入力してください。");
      return;
    }
    setSubmitting(true);
    const now = new Date().toISOString();
    const tournament: Tournament = {
      id: genId(),
      name: name.trim(),
      description: description.trim(),
      date,
      format,
      status: "draft",
      isPublic,
      adminKey: genAdminKey(),
      timeControl: {
        mainSec: Math.max(0, mainMin) * 60,
        byoyomiSec: Math.max(0, byoyomiSec),
        fischerSec: Math.max(0, fischerSec),
      },
      hasThirdPlaceMatch: hasThird,
      maxParticipants,
      adminName: adminName.trim(),
      createdBy: null,
      winnerParticipantId: null,
      runnerUpParticipantId: null,
      thirdPlaceParticipantId: null,
      createdAt: now,
      updatedAt: now,
    };
    saveTournament(tournament);
    router.push(`/tournaments/${tournament.id}/admin?key=${tournament.adminKey}`);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 w-full">
      <h1 className="font-serif-jp text-2xl sm:text-3xl font-bold mb-2">大会を作成</h1>
      <p className="text-sm text-sumi/55 mb-8">
        作成後に参加者を登録し、トーナメント表を生成できます。ログインは不要です。
      </p>

      <Card className="p-6 sm:p-8 space-y-6 anim-fade-in-up">
        <div>
          <Label required>大会名</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例: 第1回 盤聖杯 将棋トーナメント"
            maxLength={60}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label>開催日</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>管理者名</Label>
            <Input
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder="例: 山田太郎"
              maxLength={30}
            />
          </div>
        </div>

        <div>
          <Label>説明文</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="大会の概要、ルール、賞品などを記載できます。"
            rows={3}
            maxLength={500}
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label>トーナメント形式</Label>
            <Select
              value={format}
              onChange={(e) => setFormat(e.target.value as TournamentFormat)}
            >
              {FORMATS.map((f) => (
                <option key={f.value} value={f.value} disabled={!f.available}>
                  {f.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>参加人数(目安)</Label>
            <Select
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(Number(e.target.value))}
            >
              {[4, 8, 16, 32].map((n) => (
                <option key={n} value={n}>{n}人</option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <Label>持ち時間設定</Label>
          <div className="flex flex-wrap gap-2 mb-3">
            {TIME_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyPreset(p)}
                className="text-xs rounded-full border border-sumi/20 px-3 py-1.5 hover:border-kogane hover:text-kogane transition cursor-pointer"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-sumi/55 mb-1">持ち時間(分)</p>
              <Input
                type="number" min={0} max={180}
                value={mainMin}
                onChange={(e) => setMainMin(Number(e.target.value))}
              />
            </div>
            <div>
              <p className="text-xs text-sumi/55 mb-1">秒読み(秒)</p>
              <Input
                type="number" min={0} max={60}
                value={byoyomiSec}
                onChange={(e) => setByoyomiSec(Number(e.target.value))}
              />
            </div>
            <div>
              <p className="text-xs text-sumi/55 mb-1">フィッシャー(秒)</p>
              <Input
                type="number" min={0} max={60}
                value={fischerSec}
                onChange={(e) => setFischerSec(Number(e.target.value))}
              />
            </div>
          </div>
          <p className="text-xs text-sumi/45 mt-2">
            持ち時間0・秒読み0で時計なし。秒読み0なら切れ負けになります。
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <label className="flex items-center gap-3 rounded-xl border border-sumi/15 px-4 py-3 cursor-pointer hover:border-kogane/50 transition">
            <input
              type="checkbox"
              checked={hasThird}
              onChange={(e) => setHasThird(e.target.checked)}
              className="w-4 h-4 accent-[#1f3d2b]"
            />
            <div>
              <p className="text-sm font-medium">3位決定戦を行う</p>
              <p className="text-xs text-sumi/50">準決勝敗者同士で対局</p>
            </div>
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-sumi/15 px-4 py-3 cursor-pointer hover:border-kogane/50 transition">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="w-4 h-4 accent-[#1f3d2b]"
            />
            <div>
              <p className="text-sm font-medium">大会を公開する</p>
              <p className="text-xs text-sumi/50">大会一覧に表示されます</p>
            </div>
          </label>
        </div>

        {error && <p className="text-sm text-shu">{error}</p>}

        <div className="pt-2">
          <Button variant="gold" className="w-full py-3.5 text-base" onClick={submit} disabled={submitting}>
            {submitting ? "作成中…" : "大会を作成して参加者登録へ"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
