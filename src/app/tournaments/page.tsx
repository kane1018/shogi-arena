"use client";

import Link from "next/link";
import { getTournaments } from "@/lib/store";
import { useStoreValue, useMounted } from "@/lib/useStore";
import { Button, Card, Chip, EmptyState, Loading } from "@/components/ui";
import type { TournamentStatus } from "@/lib/types";

const STATUS_LABEL: Record<TournamentStatus, { label: string; tone: "gray" | "red" | "gold" }> = {
  draft: { label: "準備中", tone: "gray" },
  ongoing: { label: "開催中", tone: "red" },
  finished: { label: "終了", tone: "gold" },
};

export default function TournamentsPage() {
  const mounted = useMounted();
  const tournaments = useStoreValue(() => getTournaments(), []);

  if (!mounted) return <Loading />;

  const sorted = [...tournaments].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 w-full">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-serif-jp text-2xl sm:text-3xl font-bold">大会一覧</h1>
        <Link href="/tournaments/new">
          <Button variant="gold">大会を作成する</Button>
        </Link>
      </div>

      {sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon="王"
            title="まだ大会がありません"
            description="最初の大会を作成して、トーナメントを始めましょう。"
            action={
              <Link href="/tournaments/new">
                <Button variant="gold">大会を作成する</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4">
          {sorted.map((t, i) => {
            const st = STATUS_LABEL[t.status];
            return (
              <Link key={t.id} href={`/tournaments/${t.id}`}>
                <Card className="p-5 hover:border-kogane transition-colors anim-fade-in-up" >
                  <div className="flex items-center justify-between gap-3" style={{ animationDelay: `${i * 0.05}s` }}>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif-jp text-lg font-bold truncate">{t.name}</h2>
                        <Chip tone={st.tone}>{st.label}</Chip>
                        {!t.isPublic && <Chip tone="gray">非公開</Chip>}
                      </div>
                      <p className="text-sm text-sumi/55 mt-1">
                        {t.date && `開催日: ${t.date}`}
                        {t.adminName && ` ・ 主催: ${t.adminName}`}
                      </p>
                      {t.description && (
                        <p className="text-sm text-sumi/65 mt-1.5 line-clamp-1">{t.description}</p>
                      )}
                    </div>
                    <span className="text-sumi/30 shrink-0">→</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
