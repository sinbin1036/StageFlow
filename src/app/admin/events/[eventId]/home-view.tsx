"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useSyncExternalStore } from "react";
import { ArrowIcon } from "@/components/zine";
import type { EventSnapshot, EventStatus } from "@/lib/event-data";
import { eventMeta } from "@/lib/event-view";
import { changeStatus } from "../../actions";
import { AdminTabs, ConfirmDialog, EventHeader, StageChip, useAdminAction } from "../../_components/admin-ui";
import { STAGE_NAME, STAGE_ORDER, STAGE_SHORT, confirmFor } from "../../_components/stages";
import { useAdminSnapshot } from "../../_components/use-admin-snapshot";

type Card = { desc: string; action?: { label: string; to?: EventStatus; href?: string }; note: string };

function cardFor(status: EventStatus, base: string): Card {
  switch (status) {
    case "DRAFT":
      return { desc: "아직 참가자에게 보이지 않아요. 링크로 들어와도 \"행사를 찾을 수 없어요\"가 나와요.", action: { label: "모집 시작하기", to: "OPEN" }, note: "누르면 확인 창이 한 번 더 떠요." };
    case "OPEN":
      return { desc: "참가자가 곡을 신청하고, PIN으로 직접 수정 · 삭제할 수 있어요.", action: { label: "모집 마감하기", to: "CLOSED" }, note: "누르면 확인 창이 한 번 더 떠요." };
    case "CLOSED":
      return { desc: "참가자는 신청 목록을 보기만 해요. 순서를 짜고 공개하세요.", action: { label: "순서 편성하러 가기", href: `${base}/order` }, note: "순서 편성 화면에서 [순서 초안 공개하기]를 누르면 참가자에게 공개돼요." };
    case "PUBLISHED":
      return { desc: "참가자가 순서 초안을 보고 있어요. 변경 요청은 순서 편성에서 고치고, 공연 당일 시작할 때 누르세요.", action: { label: "공연 시작하기", to: "LIVE" }, note: "누르면 확인 창이 한 번 더 떠요." };
    case "LIVE":
      return { desc: "참가자 화면에 지금 공연 중인 곡과 다음 곡이 실시간으로 보여요.", action: { label: "공연 진행 화면 열기", href: `${base}/live` }, note: "앵콜은 공연 진행 화면에서 본 공연이 끝나면 열 수 있어요." };
    case "ENCORE":
      return { desc: "참가자가 앵콜 곡을 신청하고 있어요. 신청한 순서대로 번호가 붙어요.", action: { label: "앵콜 관리 열기", href: `${base}/live` }, note: "공연 종료는 앵콜 관리 화면에서 할 수 있어요." };
    case "ENDED":
      return { desc: "참가자 화면에 최종 셋리스트가 보여요. 더 바꿀 것이 없어요.", note: "다음 행사는 행사 목록에서 새로 만드세요." };
  }
}

const subscribeNoop = () => () => {};

export function HomeView({ initial }: { initial: EventSnapshot }) {
  const router = useRouter();
  const [snapshot, reload] = useAdminSnapshot(initial);
  const { event } = snapshot;
  const base = `/admin/events/${event.id}`;
  const card = cardFor(event.status, base);
  const now = STAGE_ORDER.indexOf(event.status);
  const [confirmTo, setConfirmTo] = useState<EventStatus | null>(null);
  const [copied, setCopied] = useState(false);
  const action = useAdminAction(reload);

  // 링크 주소는 브라우저에서만 알 수 있다 (배포 주소 그대로 쓰기 위해)
  const origin = useSyncExternalStore(subscribeNoop, () => window.location.origin, () => "");
  const link = `${origin}/events/${event.public_code}`;

  const mainSubs = snapshot.submissions.filter((s) => !s.is_encore);
  const groups = mainSubs.filter((s) => s.performer_names.length > 1).length;
  const songs = snapshot.entries.filter((e) => !e.is_encore).length;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <>
      <div aria-hidden className="halftone pointer-events-none absolute inset-x-0 top-0 h-[340px]" />
      <div className="relative">
        <EventHeader event={event} />
      </div>
      <section className="relative px-5 pt-1.5">
        <div className="text-xs font-extrabold tracking-[0.1em]">{eventMeta(event)}</div>
        <h1 className="mt-1 font-heading text-[28px] leading-tight">{event.title}</h1>
      </section>

      <section className="relative px-5 pt-[18px]">
        <ol aria-label="행사 진행 단계" className="grid grid-cols-7 gap-[3px]">
          {STAGE_ORDER.map((s, i) => (
            <li key={s} aria-current={i === now ? "step" : undefined} className="flex flex-col items-center gap-1.5">
              <span className={`h-2 w-full border-[1.5px] border-ink ${i < now ? "bg-ink" : i === now ? "bg-accent" : ""}`} />
              <span className={`text-[11px] ${i === now ? "font-extrabold" : "font-semibold"} ${i > now ? "opacity-45" : ""}`}>{STAGE_SHORT[s]}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="relative px-5 pt-[18px]">
        <div className="flex flex-col border-[3px] border-ink bg-bg">
          <div className="flex flex-col gap-1 px-4 pb-3.5 pt-4">
            <span className="flex items-center justify-between">
              <span className="text-xs font-extrabold tracking-[0.08em]">지금 단계</span>
              <StageChip status={event.status} />
            </span>
            <span className="font-heading text-[30px] leading-tight">{STAGE_NAME[event.status]}</span>
            <span className="text-[13px] font-semibold leading-normal">{card.desc}</span>
          </div>
          {card.action?.to && (
            <button
              type="button"
              onClick={() => {
                action.setMessage(null);
                setConfirmTo(card.action!.to!);
              }}
              className="flex h-16 items-center justify-between border-t-[3px] border-ink bg-ink px-4 font-heading text-[22px] text-bg"
            >
              {card.action.label}
              <ArrowIcon />
            </button>
          )}
          {card.action?.href && (
            <Link href={card.action.href} className="flex h-16 items-center justify-between border-t-[3px] border-ink px-4 font-heading text-[22px] no-underline">
              {card.action.label}
              <ArrowIcon />
            </Link>
          )}
        </div>
        <p className="mt-2 text-xs font-semibold leading-normal">{card.note}</p>
      </section>

      {event.status !== "DRAFT" && (
        <section className="relative px-5 pt-[22px]">
          <h2 className="mb-2 font-display text-[22px] tracking-[0.02em]">SHARE LINK</h2>
          <div className="flex items-stretch border-2 border-ink">
            <span className="flex min-w-0 flex-1 items-center truncate px-3 text-sm font-extrabold">{link.replace(/^https?:\/\//, "")}</span>
            <button type="button" onClick={copy} className="min-h-12 border-l-2 border-ink bg-accent px-3.5 text-[13px] font-extrabold">
              {copied ? "복사됨!" : "링크 복사"}
            </button>
          </div>
          <p className="mt-1.5 text-xs font-semibold">단톡방에 이 링크 하나만 올리면 돼요. 단계가 바뀌어도 링크는 그대로예요.</p>
        </section>
      )}

      <section className="relative px-5 pb-6 pt-[22px]">
        <div className="grid grid-cols-3 border-2 border-ink">
          {[
            { value: mainSubs.length, label: "신청" },
            { value: songs, label: "곡" },
            { value: groups, label: "듀엣 · 팀" },
          ].map((t, i) => (
            <div key={t.label} className={`flex flex-col gap-0.5 px-2.5 py-3 ${i ? "border-l-2 border-ink" : ""}`}>
              <span className="font-display text-[34px] leading-none">{t.value}</span>
              <span className="text-xs font-extrabold">{t.label}</span>
            </div>
          ))}
        </div>
        <Link href={`${base}/submissions`} className="mt-2.5 flex min-h-12 items-center justify-center border-2 border-ink text-sm font-extrabold no-underline">
          신청 관리 · 현장 추가
        </Link>
      </section>

      <AdminTabs eventId={event.id} />

      {confirmTo && (
        <ConfirmDialog
          spec={confirmFor(confirmTo, snapshot)}
          pending={action.pending}
          message={action.message}
          onClose={() => setConfirmTo(null)}
          onConfirm={() =>
            action.run(
              () => changeStatus(event.id, confirmTo),
              () => {
                setConfirmTo(null);
                if (confirmTo === "LIVE") router.push(`${base}/live`);
              },
            )
          }
        />
      )}
    </>
  );
}
