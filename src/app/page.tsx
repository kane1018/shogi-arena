import Link from "next/link";

const DEMO_PIECES: { kanji: string; pos: string; rot?: boolean; promoted?: boolean }[] = [
  { kanji: "玉", pos: "top-[8%] left-[42%]", rot: true },
  { kanji: "金", pos: "top-[20%] left-[58%]", rot: true },
  { kanji: "歩", pos: "top-[34%] left-[30%]", rot: true },
  { kanji: "銀", pos: "top-[46%] left-[64%]" },
  { kanji: "角", pos: "top-[60%] left-[18%]" },
  { kanji: "飛", pos: "top-[66%] left-[48%]" },
  { kanji: "王", pos: "top-[80%] left-[38%]" },
];

export default function Home() {
  return (
    <div className="flex-1">
      {/* ヒーロー */}
      <section className="relative overflow-hidden bg-sumi text-washi">
        <div className="absolute inset-0 opacity-[0.07] board-wood" />
        <div className="absolute -right-24 -top-24 w-96 h-96 rounded-full bg-kogane/10 blur-3xl" />
        <div className="absolute -left-32 bottom-0 w-80 h-80 rounded-full bg-fukamidori/30 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-4 py-16 sm:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div className="anim-fade-in-up">
            <p className="text-kogane-light tracking-[0.35em] text-xs sm:text-sm mb-4 font-serif-jp">
              将棋大会プラットフォーム
            </p>
            <h1 className="font-serif-jp text-5xl sm:text-6xl font-bold leading-tight">
              盤聖
              <span className="block text-lg sm:text-xl mt-3 text-washi/80 font-medium tracking-wide">
                一局一局を、タイトル戦のように。
              </span>
            </h1>
            <p className="mt-6 text-sm sm:text-base text-washi/65 leading-relaxed max-w-md">
              美しい将棋盤での対局、迷わない大会運営、残り続ける棋譜と戦歴。
              将棋教室から友人同士の大会まで、すべての対局を特別な一局に。
            </p>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link
                href="/tournaments/new"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-kogane-light to-kogane text-sumi font-bold px-7 py-3.5 text-sm shadow-lg hover:brightness-105 transition active:scale-[0.98]"
              >
                大会を作成する
              </Link>
              <Link
                href="/tournaments"
                className="inline-flex items-center gap-2 rounded-xl border border-washi/30 text-washi px-7 py-3.5 text-sm hover:bg-white/5 transition"
              >
                大会を見る
              </Link>
            </div>
            <Link
              href="/mypage"
              className="inline-block mt-6 text-xs text-washi/50 hover:text-kogane-light transition underline underline-offset-4"
            >
              マイページ(棋譜・戦歴)はこちら →
            </Link>
          </div>

          {/* 盤面イメージ */}
          <div className="relative hidden md:block anim-fade-in" style={{ animationDelay: "0.15s" }}>
            <div className="board-frame rounded-xl p-3 shadow-board rotate-2 hover:rotate-0 transition-transform duration-700 max-w-sm mx-auto">
              <div className="board-wood rounded-md border-2 border-sumi/70 aspect-square relative">
                {/* 罫線 */}
                <div className="absolute inset-0 grid grid-cols-9 grid-rows-9">
                  {Array.from({ length: 81 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-sumi/50" />
                  ))}
                </div>
                {DEMO_PIECES.map((p, i) => (
                  <span
                    key={i}
                    className={`koma absolute w-[9.5%] h-[10.5%] flex items-center justify-center font-serif-jp font-bold text-[16px] text-sumi ${p.pos} ${p.rot ? "koma-gote" : ""} ${p.promoted ? "koma-promoted" : ""}`}
                  >
                    {p.kanji}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 特徴 */}
      <section className="max-w-6xl mx-auto px-4 py-16 sm:py-20">
        <h2 className="font-serif-jp text-2xl sm:text-3xl font-bold text-center">
          大会のすべてが、ここに残る。
        </h2>
        <div className="mt-12 grid sm:grid-cols-3 gap-6">
          {[
            {
              icon: "盤",
              title: "美しい将棋盤",
              desc: "本榧風の盤と読みやすい駒。スマホでもタブレットでも、心地よく指せる対局画面。時計・秒読み・フィッシャーにも対応。",
            },
            {
              icon: "戦",
              title: "迷わない大会運営",
              desc: "参加者を登録するだけでトーナメント表を自動生成。シード・不戦勝・3位決定戦に対応し、勝敗入力で自動的に勝ち上がり。",
            },
            {
              icon: "譜",
              title: "棋譜と戦歴が残る",
              desc: "一手一手を自動保存し、いつでも再生。KIF / CSA形式で書き出し可能。マイページには戦歴・参加大会・バッジが蓄積。",
            },
          ].map((f, i) => (
            <div
              key={f.title}
              className="bg-white/80 rounded-2xl border border-sumi/10 shadow-washi p-7 anim-fade-in-up"
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="koma w-12 h-[3.25rem] flex items-end justify-center pb-1.5 font-serif-jp text-lg font-bold text-sumi mb-5">
                {f.icon}
              </div>
              <h3 className="font-serif-jp text-lg font-bold">{f.title}</h3>
              <p className="mt-3 text-sm text-sumi/65 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 使い方 */}
      <section className="bg-fukamidori text-washi">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h2 className="font-serif-jp text-2xl font-bold text-center">大会開催は、3ステップ。</h2>
          <div className="mt-10 grid sm:grid-cols-3 gap-8">
            {[
              ["壱", "大会を作成", "大会名・持ち時間・形式を決めるだけ。ログイン不要で今すぐ始められます。"],
              ["弐", "参加者を登録", "名前を入れるだけでゲスト参加OK。シードや欠場もワンタップで設定。"],
              ["参", "対局・観戦", "管理URLで運営、閲覧URLを共有すればみんなで観戦。結果は自動で勝ち上がり。"],
            ].map(([num, title, desc]) => (
              <div key={num} className="text-center">
                <div className="w-12 h-12 mx-auto rounded-full border border-kogane/60 text-kogane-light flex items-center justify-center font-serif-jp text-lg font-bold">
                  {num}
                </div>
                <h3 className="mt-4 font-serif-jp font-bold">{title}</h3>
                <p className="mt-2 text-sm text-washi/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link
              href="/tournaments/new"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-b from-kogane-light to-kogane text-sumi font-bold px-8 py-3.5 text-sm shadow-lg hover:brightness-105 transition active:scale-[0.98]"
            >
              いますぐ大会を作成する
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
