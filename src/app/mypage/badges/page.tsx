"use client";

// 実績・バッジ
import { BADGES, getProfile, getUserBadges } from "@/lib/store";
import { useMounted, useStoreValue } from "@/lib/useStore";
import { Card, Loading } from "@/components/ui";

export default function BadgesPage() {
  const mounted = useMounted();
  const profile = useStoreValue(() => getProfile(), null);
  const userBadges = useStoreValue(() => (profile ? getUserBadges(profile.id) : []), []);

  if (!mounted || !profile) return <Loading />;
  const achievedMap = new Map(userBadges.map((ub) => [ub.badgeId, ub]));

  return (
    <div>
      <p className="text-sm text-sumi/55 mb-5">
        獲得済み: {achievedMap.size} / {BADGES.length} 個 — 対局や大会の成績に応じて自動的に付与されます。
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {BADGES.map((b, i) => {
          const achieved = achievedMap.get(b.id);
          return (
            <Card
              key={b.id}
              className={`p-5 anim-fade-in-up ${achieved ? "border-kogane/40" : "opacity-55 grayscale"}`}
            >
              <div className="flex items-start gap-3" style={{ animationDelay: `${i * 0.04}s` }}>
                <span className={`koma w-11 h-12 flex items-end justify-center pb-1.5 text-sm font-serif-jp font-bold shrink-0 ${achieved ? "text-sumi" : "text-sumi/40"}`}>
                  {b.icon}
                </span>
                <div className="min-w-0">
                  <p className="font-serif-jp font-bold">
                    {b.name}
                    {achieved && <span className="text-kogane text-xs ml-1.5">獲得済</span>}
                  </p>
                  <p className="text-xs text-sumi/55 mt-1">{b.description}</p>
                  <p className="text-[11px] text-sumi/40 mt-1.5">
                    {achieved
                      ? `${new Date(achieved.achievedAt).toLocaleDateString("ja-JP")} 獲得`
                      : `条件: ${b.condition}`}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
