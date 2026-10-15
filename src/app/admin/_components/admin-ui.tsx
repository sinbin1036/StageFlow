"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { BackLink } from "@/components/zine";
import type { EventRow, EventStatus } from "@/lib/event-data";
import type { AdminResult } from "../actions";
import type { ConfirmSpec } from "./stages";

export function AdminScreen({ children }: { children: ReactNode }) {
  return <main className="relative mx-auto flex min-h-dvh w-full max-w-[480px] flex-col bg-bg text-ink">{children}</main>;
}

export function StageChip({ status }: { status: EventStatus }) {
  const tone =
    status === "ENDED" || status === "CLOSED"
      ? "bg-ink text-bg"
      : status === "DRAFT"
        ? "border-[1.5px] border-ink"
        : "bg-accent border-[1.5px] border-ink";
  return <span className={`px-2 py-0.5 font-display text-sm tracking-[0.06em] ${tone}`}>{status}</span>;
}

export function EventHeader({ event, back = "/admin", backLabel = "행사 목록" }: { event: EventRow; back?: string; backLabel?: string }) {
  return (
    <header className="flex min-h-[58px] items-center justify-between px-5 pt-3.5">
      <BackLink href={back}>{backLabel}</BackLink>
      <StageChip status={event.status} />
    </header>
  );
}

export function AdminTabs({ eventId }: { eventId: string }) {
  const pathname = usePathname();
  const base = `/admin/events/${eventId}`;
  const tabs = [
    { label: "현황", href: base },
    { label: "신청", href: `${base}/submissions` },
    { label: "순서", href: `${base}/order` },
    { label: "진행", href: `${base}/live` },
  ];
  return (
    <nav aria-label="관리 메뉴" className="sticky bottom-0 mt-auto grid grid-cols-4 border-t-[3px] border-ink bg-bg">
      {tabs.map((t) => {
        const on = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex h-16 items-center justify-center text-sm font-extrabold no-underline ${on ? "bg-ink text-bg" : ""}`}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-[13px] font-extrabold">
      <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center bg-ink font-display text-[13px] text-bg">!</span>
      {message}
    </p>
  );
}

// 서버 액션 실행 + 진행 중 표시 + 실패 문구 + 성공 후 다시 읽기
export function useAdminAction(onDone?: () => void) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (action: () => Promise<AdminResult<unknown>>, after?: () => void) => {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      after?.();
      onDone?.();
    });
  };
  return { pending, message, setMessage, run };
}

function Overlay({ children, onClose, align }: { children: ReactNode; onClose: () => void; align: "center" | "bottom" }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className={`fixed inset-0 z-50 flex justify-center bg-ink/80 ${align === "center" ? "items-center p-5" : "items-end"}`} onClick={onClose}>
      <div className="w-full max-w-[480px]" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// 단계를 바꾸기 전에 한 번 더 묻는 창
export function ConfirmDialog({
  spec,
  pending,
  message,
  onConfirm,
  onClose,
}: {
  spec: ConfirmSpec;
  pending: boolean;
  message: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => confirmRef.current?.focus(), []);
  return (
    <Overlay onClose={onClose} align="center">
      <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="border-[3px] border-ink bg-bg">
        <div className="flex flex-col gap-2.5 px-[18px] pb-[18px] pt-5">
          <span className="self-start bg-ink px-2 py-0.5 font-display text-[13px] tracking-[0.06em] text-bg">
            {spec.from} → {spec.to}
          </span>
          <h2 id="confirm-title" className="font-heading text-[28px] leading-tight">
            {spec.question}
          </h2>
          <ul className="flex flex-col gap-2">
            {spec.items.map((t, i) => (
              <li key={t} className="flex gap-2 text-sm font-bold leading-normal">
                <span aria-hidden className="font-display">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
          {message && <Alert message={message} />}
        </div>
        <div className="grid grid-cols-2 border-t-[3px] border-ink">
          <button type="button" onClick={onClose} className="h-[60px] border-r-[3px] border-ink text-base font-extrabold">
            취소
          </button>
          <button ref={confirmRef} type="button" onClick={onConfirm} disabled={pending} className="h-[60px] bg-ink font-heading text-xl text-bg disabled:opacity-50">
            {pending ? "처리 중…" : spec.confirmLabel}
          </button>
        </div>
      </section>
    </Overlay>
  );
}

export function Sheet({ title, onClose, children }: { title: ReactNode; onClose: () => void; children: ReactNode }) {
  return (
    <Overlay onClose={onClose} align="bottom">
      <section role="dialog" aria-modal="true" className="max-h-[88dvh] overflow-y-auto border-t-[3px] border-ink bg-bg px-5 pb-6 pt-2.5">
        <span aria-hidden className="mx-auto mb-3.5 block h-[5px] w-12 bg-ink opacity-40" />
        <div className="flex items-center gap-3 border-b-[3px] border-ink pb-3.5">
          <div className="min-w-0 flex-1">{title}</div>
          <button type="button" aria-label="닫기" onClick={onClose} className="inline-flex h-11 w-11 items-center justify-center border-2 border-ink">
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </section>
    </Overlay>
  );
}

export const adminPrimary =
  "flex h-16 w-full items-center justify-between bg-ink px-4 font-heading text-[22px] text-bg no-underline disabled:opacity-45";
export const adminOutline =
  "flex min-h-12 w-full items-center justify-center border-2 border-ink text-sm font-extrabold no-underline disabled:opacity-45";
