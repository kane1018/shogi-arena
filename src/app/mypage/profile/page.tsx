"use client";

// プロフィール編集
import { useEffect, useState } from "react";
import { evaluateBadges, getProfile, saveProfile } from "@/lib/store";
import { useMounted } from "@/lib/useStore";
import type { UserProfile } from "@/lib/types";
import { AVATAR_PIECES, Button, Card, Input, Label, Loading, PieceAvatar, Select, Textarea } from "@/components/ui";

const OPENINGS = [
  "", "居飛車", "矢倉", "角換わり", "横歩取り", "相掛かり",
  "四間飛車", "三間飛車", "中飛車", "向かい飛車", "振り飛車", "その他",
];

const RANKS = [
  "", "15級", "10級", "5級", "3級", "1級",
  "初段", "二段", "三段", "四段", "五段", "六段以上",
];

export default function ProfileEditPage() {
  const mounted = useMounted();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (mounted) setProfile(getProfile());
  }, [mounted]);

  if (!mounted || !profile) return <Loading />;

  const update = (patch: Partial<UserProfile>) => {
    setProfile({ ...profile, ...patch });
    setSaved(false);
  };

  const submit = () => {
    if (!profile.displayName.trim()) return;
    saveProfile({ ...profile, displayName: profile.displayName.trim() });
    evaluateBadges(profile.id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <Card className="p-6 sm:p-8 max-w-2xl anim-fade-in-up">
      <div className="space-y-6">
        <div>
          <Label>アイコン(駒から選択)</Label>
          <div className="flex flex-wrap gap-2">
            {AVATAR_PIECES.map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => update({ avatar: a })}
                className={`rounded-xl p-1.5 transition cursor-pointer ${
                  profile.avatar === a ? "ring-2 ring-kogane bg-kogane/10" : "hover:bg-sumi/5"
                }`}
                title={a}
              >
                <PieceAvatar piece={a} size="md" />
              </button>
            ))}
          </div>
          <p className="text-xs text-sumi/45 mt-2">※ 画像アップロードは今後対応予定です。</p>
        </div>

        <div>
          <Label required>表示名</Label>
          <Input
            value={profile.displayName}
            onChange={(e) => update({ displayName: e.target.value })}
            maxLength={20}
            placeholder="例: 山田太郎"
          />
          <p className="text-xs text-sumi/45 mt-1.5">
            大会にこの表示名で参加すると、対局結果が自動的に戦歴へ記録されます。
          </p>
        </div>

        <div>
          <Label>自己紹介</Label>
          <Textarea
            value={profile.bio}
            onChange={(e) => update({ bio: e.target.value })}
            rows={3}
            maxLength={300}
            placeholder="将棋歴、好きな棋士、意気込みなど"
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label>段級位</Label>
            <Select value={profile.rank} onChange={(e) => update({ rank: e.target.value })}>
              {RANKS.map((r) => (
                <option key={r} value={r}>{r || "未設定"}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>得意戦法</Label>
            <Select value={profile.favoriteOpening} onChange={(e) => update({ favoriteOpening: e.target.value })}>
              {OPENINGS.map((o) => (
                <option key={o} value={o}>{o || "未設定"}</option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <Label>所属</Label>
            <Input
              value={profile.affiliation}
              onChange={(e) => update({ affiliation: e.target.value })}
              maxLength={30}
              placeholder="例: ○○将棋教室"
            />
          </div>
          <div>
            <Label>地域</Label>
            <Input
              value={profile.region}
              onChange={(e) => update({ region: e.target.value })}
              maxLength={20}
              placeholder="例: 東京都"
            />
          </div>
        </div>

        <div>
          <Label>プロフィール公開設定</Label>
          <Select
            value={profile.profileVisibility}
            onChange={(e) => update({ profileVisibility: e.target.value as UserProfile["profileVisibility"] })}
          >
            <option value="public">公開</option>
            <option value="private">非公開</option>
          </Select>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button variant="gold" className="px-8" onClick={submit} disabled={!profile.displayName.trim()}>
            保存する
          </Button>
          {saved && <span className="text-sm text-fukamidori anim-fade-in">保存しました ✓</span>}
        </div>
      </div>
    </Card>
  );
}
