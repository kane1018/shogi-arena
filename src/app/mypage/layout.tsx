import { MyPageTabs } from "@/components/MyPageTabs";

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8 w-full">
      <h1 className="font-serif-jp text-2xl sm:text-3xl font-bold mb-6">マイページ</h1>
      <MyPageTabs />
      {children}
    </div>
  );
}
