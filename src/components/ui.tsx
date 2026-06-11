"use client";

// 共通UIプリミティブ
import { type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes,
  type TextareaHTMLAttributes, type SelectHTMLAttributes, useEffect } from "react";
import type { AvatarPiece } from "@/lib/types";

function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

// ===== ボタン =====
type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "gold";

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const styles: Record<ButtonVariant, string> = {
    primary:
      "bg-fukamidori text-washi hover:bg-fukamidori-light active:scale-[0.98]",
    secondary:
      "bg-white text-sumi border border-sumi/20 hover:border-kogane hover:text-kogane-light active:scale-[0.98]",
    ghost: "text-sumi/70 hover:bg-sumi/5 hover:text-sumi",
    danger: "bg-shu text-washi hover:opacity-90 active:scale-[0.98]",
    gold:
      "bg-gradient-to-b from-kogane-light to-kogane text-sumi font-bold shadow-sm hover:brightness-105 active:scale-[0.98]",
  };
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none cursor-pointer",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}

// ===== カード =====
export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("bg-white/80 backdrop-blur rounded-2xl border border-sumi/10 shadow-washi", className)}>
      {children}
    </div>
  );
}

export function CardHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-5 pb-3">
      <h2 className="font-serif-jp text-lg font-bold text-sumi">{title}</h2>
      {action}
    </div>
  );
}

// ===== フォーム =====
export function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-sumi/80 mb-1.5">
      {children}
      {required && <span className="text-shu ml-1">*</span>}
    </label>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        "w-full rounded-xl border border-sumi/20 bg-white px-3.5 py-2.5 text-sm text-sumi placeholder:text-sumi/35 focus:outline-none focus:ring-2 focus:ring-kogane/50 focus:border-kogane transition",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        "w-full rounded-xl border border-sumi/20 bg-white px-3.5 py-2.5 text-sm text-sumi placeholder:text-sumi/35 focus:outline-none focus:ring-2 focus:ring-kogane/50 focus:border-kogane transition",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        "w-full rounded-xl border border-sumi/20 bg-white px-3.5 py-2.5 text-sm text-sumi focus:outline-none focus:ring-2 focus:ring-kogane/50 focus:border-kogane transition",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ===== モーダル =====
export function Modal({
  open,
  onClose,
  children,
  title,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-sumi/55 anim-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-washi rounded-2xl shadow-xl max-w-md w-full max-h-[85dvh] overflow-y-auto anim-pop-in"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="px-6 pt-5 pb-2 font-serif-jp text-lg font-bold border-b border-sumi/10">
            {title}
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

/** 確認ダイアログ */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "確定する",
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <div className="text-sm text-sumi/80 mb-6">{message}</div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel}>キャンセル</Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

// ===== 駒アイコンアバター =====
export function PieceAvatar({
  piece,
  size = "md",
  className,
}: {
  piece: AvatarPiece;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  // パディングは%指定だと親幅基準になるため、サイズごとに固定値で指定する
  const sizes = {
    sm: "w-8 h-9 text-xs pb-1",
    md: "w-12 h-[3.25rem] text-lg pb-1.5",
    lg: "w-20 h-[5.5rem] text-3xl pb-2.5",
  };
  const short: Record<AvatarPiece, string> = {
    王将: "王", 飛車: "飛", 角行: "角", 金将: "金", 銀将: "銀",
    桂馬: "桂", 香車: "香", 歩兵: "歩", と金: "と",
  };
  return (
    <div
      className={cx(
        "koma flex items-end justify-center font-serif-jp font-bold text-sumi shrink-0",
        sizes[size],
        piece === "と金" && "koma-promoted",
        className
      )}
    >
      {short[piece]}
    </div>
  );
}

export const AVATAR_PIECES: AvatarPiece[] = [
  "王将", "飛車", "角行", "金将", "銀将", "桂馬", "香車", "歩兵", "と金",
];

// ===== 状態表示 =====
export function EmptyState({ icon = "歩", title, description, action }: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <div className="koma w-14 h-[3.75rem] flex items-end justify-center pb-2 font-serif-jp text-xl font-bold text-sumi/60 mb-4 opacity-60">
        {icon}
      </div>
      <p className="font-serif-jp font-bold text-sumi/70">{title}</p>
      {description && <p className="text-sm text-sumi/50 mt-1.5">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Loading({ label = "読み込み中…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-kogane/30 border-t-kogane animate-spin" />
      <p className="text-sm text-sumi/50">{label}</p>
    </div>
  );
}

// ===== タグ・チップ =====
export function Chip({ children, tone = "default", className }: {
  children: ReactNode;
  tone?: "default" | "gold" | "green" | "red" | "blue" | "gray";
  className?: string;
}) {
  const tones = {
    default: "bg-sumi/8 text-sumi/70",
    gold: "bg-kogane/15 text-kogane border border-kogane/30",
    green: "bg-fukamidori/10 text-fukamidori",
    red: "bg-shu/10 text-shu",
    blue: "bg-aisumi/10 text-aisumi",
    gray: "bg-sumi/5 text-sumi/45",
  };
  return (
    <span className={cx("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone], className)}>
      {children}
    </span>
  );
}
