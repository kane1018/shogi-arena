"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Header() {
  const pathname = usePathname();
  const links = [
    { href: "/tournaments", label: "大会一覧" },
    { href: "/tournaments/new", label: "大会作成" },
    { href: "/mypage", label: "マイページ" },
  ];
  return (
    <header className="sticky top-0 z-40 bg-sumi text-washi border-b border-kogane/30">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="koma w-7 h-8 flex items-end justify-center pb-1 text-[11px] font-serif-jp font-bold text-sumi">
            王
          </span>
          <span className="font-serif-jp text-lg font-bold tracking-wider">
            盤聖
            <span className="text-kogane-light text-xs ml-1.5 tracking-widest">BANSEI</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-2 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm whitespace-nowrap transition-colors ${
                pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href + "/"))
                  ? "text-kogane-light bg-white/5"
                  : "text-washi/75 hover:text-washi hover:bg-white/5"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
