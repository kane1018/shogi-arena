// 大会データ共有API(Vercel Blob使用)
// - GET : 大会バンドル(大会・参加者・対局・棋譜)を取得。管理キーなしの場合はadminKeyを伏せて返す
// - PUT : 大会バンドルを保存。既存データがある場合は x-admin-key の一致が必要
//
// 書き込みは毎回新しいリビジョン(タイムスタンプ付きパス)に保存する。
// BlobのCDNキャッシュ(最短1分)の影響を受けずに常に最新を返すため。

import { list, put, del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BUNDLE_BYTES = 4 * 1024 * 1024; // 4MB

interface Bundle {
  tournament: { id: string; adminKey: string } & Record<string, unknown>;
  participants: unknown[];
  matches: unknown[];
  games: unknown[];
}

const prefix = (id: string) => `tournaments/${encodeURIComponent(id)}/`;

async function latestRevision(id: string) {
  const { blobs } = await list({ prefix: prefix(id), limit: 1000 });
  if (blobs.length === 0) return null;
  // パスにゼロ埋めタイムスタンプを含むため、辞書順の最大が最新
  return blobs.reduce((a, b) => (a.pathname > b.pathname ? a : b));
}

async function latestBundle(id: string): Promise<Bundle | null> {
  const latest = await latestRevision(id);
  if (!latest) return null;
  const res = await fetch(latest.url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as Bundle;
}

function isValidBundle(b: unknown, id: string): b is Bundle {
  if (typeof b !== "object" || b === null) return false;
  const x = b as Bundle;
  return (
    typeof x.tournament === "object" && x.tournament !== null &&
    x.tournament.id === id &&
    typeof x.tournament.adminKey === "string" && x.tournament.adminKey.length >= 8 &&
    Array.isArray(x.participants) && Array.isArray(x.matches) && Array.isArray(x.games)
  );
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const bundle = await latestBundle(id);
  if (!bundle) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  const key = req.headers.get("x-admin-key");
  const isAdmin = key !== null && key === bundle.tournament.adminKey;
  const tournament = isAdmin
    ? bundle.tournament
    : { ...bundle.tournament, adminKey: "" }; // 閲覧者には管理キーを渡さない
  return NextResponse.json(
    { ...bundle, tournament },
    { headers: { "cache-control": "no-store" } }
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const raw = await req.text();
  if (raw.length > MAX_BUNDLE_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isValidBundle(body, id)) {
    return NextResponse.json({ error: "invalid_bundle" }, { status: 400 });
  }

  const key = req.headers.get("x-admin-key");
  if (key !== body.tournament.adminKey) {
    return NextResponse.json({ error: "key_mismatch" }, { status: 403 });
  }
  const existing = await latestBundle(id);
  if (existing && existing.tournament.adminKey !== key) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const revision = String(Date.now()).padStart(16, "0");
  await put(`${prefix(id)}${revision}.json`, JSON.stringify(body), {
    access: "public",
    addRandomSuffix: false,
    contentType: "application/json",
  });

  // 古いリビジョンを掃除(最新3件を残す。失敗しても無視)
  try {
    const { blobs } = await list({ prefix: prefix(id), limit: 1000 });
    const sorted = blobs.sort((a, b) => (a.pathname > b.pathname ? -1 : 1));
    const stale = sorted.slice(3).map((b) => b.url);
    if (stale.length > 0) await del(stale);
  } catch {
    // クリーンアップ失敗は無害
  }

  return NextResponse.json({ ok: true });
}
