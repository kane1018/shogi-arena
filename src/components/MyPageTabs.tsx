"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/mypage", label: "概要" },
  { href: "/mypage/records", label: "戦歴" },
  { href: "/mypage/games", label: "棋譜" },
  { href: "/mypage/tournaments", label: "大会" },
  { href: "/mypage/badges", label: "実績" },
  { href: "/mypage/profile", label: "設定" },
];

export function MyPageTabs() {
  const pathname = usePathname();
  return (
    <div className="border-b border-sumi/12 mb-6 overflow-x-auto">
      <nav className="flex gap-1 min-w-max">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                active
                  ? "border-kogane text-kogane font-bold"
                  : "border-transparent text-sumi/55 hover:text-sumi hover:border-sumi/20"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
