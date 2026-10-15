"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowIcon } from "@/components/zine";
import type { EventSnapshot, EventStatus } from "@/lib/event-data";
import { buildView, progress, type SlotView } from "@/lib/event-view";
import { addSubmission, advance, changeStatus, moveEntry, setEntryCancelled, undoAdvance, updateSubmission, type MoveMode } from "../../../actions";
import { AdminSubmissionForm } from "../../../_components/admin-submission-form";
import { AdminTabs, Alert, ConfirmDialog, EventHeader, Sheet, useAdminAction } from "../../../_components/admin-ui";
import { confirmFor } from "../../../_components/stages";
import { useAdminSnapshot } from "../../../_components/use-admin-snapshot";

const DotsIcon = () => (
  <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export function LiveView({ initial }: { initial: EventSnapshot }) {
  const [snapshot, reload] = useAdminSnapshot(initial);
  const { event } = snapshot;
  const status = event.status;
  const encore = status === "ENCORE";
  const view = buildView(snapshot, []);
  // 앵콜은 본 공연이 5곡 이하로 남았을 때 열린다. 앵콜 중에도 남은 본 공연을 먼저 마치고 앵콜로 넘어간다.
  const play = encore ? [...view.mainSlots, ...view.encoreSlots] : view.mainSlots;
  const { current, next } = progress(play);
  const isWaiting = (s: SlotView) => s.entry.status === "SCHEDULED" || s.entry.status === "CANCELLED";
  const groups = [
    { key: "main", title: encore ? "남은 본 공연" : "UP NEXT", items: view.mainSlots.filter(isWaiting), show: !encore || view.mainSlots.some(isWaiting) },
    { key: "encore", title: "ENCORE QUEUE", items: view.encoreSlots.filter(isWaiting), show: encore },
  ].filter((g) => g.show);
  const done = play.filter((s) => s.entry.status === "COMPLETED");
  const remaining = play.filter((s) => s.entry.status === "SCHEDULED").length;
  const mainLeft = view.mainSlots.filter((s) => s.entry.status === "SCHEDULED" || s.entry.status === "PERFORMING").length;
  const ENCORE_OPENS_AT = 5;

  const [menuFor, setMenuFor] = useState<SlotView | null>(null);
  const [editFor, setEditFor] = useState<SlotView | null>(null);
  const [adding, setAdding] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [confirmTo, setConfirmTo] = useState<EventStatus | null>(null);

  const step = useAdminAction(reload);
  const menu = useAdminAction(reload);
  const form = useAdminAction(reload);
  const stage = useAdminAction(reload);

  const openConfirm = (to: EventStatus) => {
    stage.setMessage(null);
    setConfirmTo(to);
  };

  // 공연 전 · 종료 후에는 진행할 것이 없다
  if (status !== "LIVE" && status !== "ENCORE") {
    return (
      <>
        <EventHeader event={event} back={`/admin/events/${event.id}`} backLabel={event.title} />
        <section className="px-5 pt-4">
          <div aria-hidden className="font-display text-[88px] leading-[0.92]">{status === "ENDED" ? "THE END" : "STAND BY"}</div>
          <h1 className="mt-2 font-heading text-2xl leading-tight">{status === "ENDED" ? "공연이 끝났어요" : "아직 공연 전이에요"}</h1>
          <p className="mt-1.5 text-[13px] font-semibold leading-normal">
            {status === "ENDED"
              ? "참가자 화면에 최종 셋리스트가 보이고 있어요."
              : status === "PUBLISHED"
                ? "공연 당일, 무대 준비가 끝나면 시작하세요. 01번부터 공연 중으로 표시돼요."
                : "순서 초안을 공개한 뒤에 공연을 시작할 수 있어요."}
          </p>
        </section>
        <section className="flex flex-col gap-2.5 px-5 pt-6">
          {status === "PUBLISHED" && (
            <button type="button" onClick={() => openConfirm("LIVE")} className="flex h-16 items-center justify-between bg-ink px-4 font-heading text-[22px] text-bg">
              공연 시작하기
              <ArrowIcon />
            </button>
          )}
          {status !== "PUBLISHED" && status !== "ENDED" && (
            <Link href={`/admin/events/${event.id}/order`} className="flex min-h-12 items-center justify-center border-2 border-ink text-sm font-extrabold no-underline">
              순서 편성으로
            </Link>
          )}
          <Link href={`/events/${event.public_code}`} className="flex min-h-12 items-center justify-center border-2 border-ink text-sm font-extrabold no-underline">
            참가자 화면 보기
          </Link>
        </section>
        <AdminTabs eventId={event.id} />
        {confirmTo && (
          <ConfirmDialog
            spec={confirmFor(confirmTo, snapshot)}
            pending={stage.pending}
            message={stage.message}
            onClose={() => setConfirmTo(null)}
            onConfirm={() => stage.run(() => changeStatus(event.id, confirmTo), () => setConfirmTo(null))}
          />
        )}
      </>
    );
  }

  const runMove = (mode: MoveMode) => menuFor && menu.run(() => moveEntry(menuFor.entry.id, mode), () => setMenuFor(null));
  const editSub = editFor ? snapshot.submissions.find((s) => s.id === editFor.entry.submission_id) : undefined;

  return (
    <>
      <header className="flex min-h-[58px] items-center justify-between px-5 pt-3.5">
        <Link href={`/admin/events/${event.id}`} className="flex min-h-11 items-center gap-1.5 text-sm font-extrabold no-underline">
          ← {event.title}
        </Link>
        <span className="inline-flex items-center gap-1.5 border-2 border-ink px-2 py-0.5 font-display text-sm tracking-[0.06em]">
          <span className="h-2 w-2 rounded-full border-[1.5px] border-ink bg-accent" />
          {encore ? "ENCORE" : "ON AIR"}
        </span>
      </header>

      {/* 지금 곡 + 가장 큰 버튼. 본 공연이 끝나면 같은 자리에 앵콜 열기가 나온다 */}
      <section className="px-5 pt-3.5">
        {current || next ? (
          <div className="flex flex-col border-[3px] border-ink bg-accent">
            <div className="flex items-center gap-3.5 px-4 pb-4 pt-3.5">
              <span className="font-display text-[64px] leading-[0.9]">{(current ?? next)!.no}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-display text-[13px] tracking-[0.08em]">{current ? (current.entry.is_encore ? "ENCORE NOW" : "NOW ON STAGE") : "READY"}</span>
                <span className="truncate font-heading text-[30px] leading-tight">{(current ?? next)!.entry.song_title}</span>
                <span className="truncate text-sm font-extrabold">
                  {(current ?? next)!.entry.artist} · {(current ?? next)!.performers}
                </span>
              </span>
            </div>
            <button
              type="button"
              disabled={step.pending}
              onClick={() => step.run(() => advance(event.id))}
              className="flex h-[76px] items-center justify-between border-t-[3px] border-ink bg-ink px-[18px] font-heading text-2xl text-bg disabled:opacity-60"
            >
              {step.pending ? "넘기는 중…" : current ? (next ? "공연 완료 · 다음 곡" : "공연 완료") : `${next!.no}번 시작`}
              <ArrowIcon />
            </button>
          </div>
        ) : (
          <div className="flex flex-col border-[3px] border-ink">
            <div className="flex flex-col gap-1 px-4 pb-4 pt-3.5">
              <span className="font-display text-[13px] tracking-[0.08em]">{encore ? (view.encoreSlots.length ? "ENCORE DONE" : "ENCORE OPEN") : "MAIN SET DONE"}</span>
              <span className="font-heading text-[26px] leading-tight">
                {encore ? (view.encoreSlots.length ? "앵콜 순서가 모두 끝났어요" : "아직 앵콜 신청이 없어요") : "본 공연이 모두 끝났어요"}
              </span>
              <span className="text-[13px] font-semibold">
                {encore
                  ? view.encoreSlots.length
                    ? "새 앵콜 신청을 기다리거나 공연을 종료하세요."
                    : "참가자 화면에 [앵콜 신청하기]가 열려 있어요. 신청이 들어오면 여기에 바로 보여요."
                  : "앵콜을 열거나 바로 공연을 종료할 수 있어요."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => openConfirm(encore ? "ENDED" : "ENCORE")}
              className="flex h-[76px] items-center justify-between border-t-[3px] border-ink bg-ink px-[18px] font-heading text-2xl text-bg"
            >
              {encore ? "공연 종료하기" : "앵콜 열기"}
              <ArrowIcon />
            </button>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs font-semibold">
            {current && next ? `누르면 ${next.no}번이 바로 공연 중으로 바뀌어요.` : ""}
          </span>
          {done.length > 0 && (
            <button type="button" disabled={step.pending} onClick={() => step.run(() => undoAdvance(event.id))} className="min-h-10 shrink-0 border-2 border-ink px-2.5 text-xs font-extrabold">
              되돌리기
            </button>
          )}
        </div>
        {step.message && <Alert message={step.message} />}
      </section>

      {current && next && (
        <section className="px-5 pt-4">
          <div className="flex items-center gap-3 bg-ink px-3.5 py-3 text-bg">
            <span className="font-display text-base tracking-[0.06em] text-accent">NEXT</span>
            <span className="font-display text-lg">{next.no}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-heading text-[17px]">{next.entry.song_title}</span>
              <span className="truncate text-xs font-semibold">
                {next.entry.artist} · {next.performers}
              </span>
            </span>
          </div>
        </section>
      )}

      <section className="flex flex-col px-5 pt-[18px]">
        {groups.map((g, gi) => (
          <div key={g.key} className={`flex flex-col ${gi ? "pt-5" : ""}`}>
            <div className="flex items-baseline justify-between border-b-[3px] border-ink pb-1.5">
              <h2 className={g.key === "main" && encore ? "font-heading text-lg" : "font-display text-[22px]"}>{g.title}</h2>
              <span className="text-xs font-extrabold">
                {g.key === "encore" ? `신청 순 · ${g.items.filter((s) => s.entry.status === "SCHEDULED").length}곡 대기` : `남은 ${g.items.filter((s) => s.entry.status === "SCHEDULED").length}곡 · 완료 ${done.length}`}
              </span>
            </div>
            {g.items.length === 0 && <p className="py-5 text-sm font-semibold">{g.key === "encore" ? "아직 앵콜 신청이 없어요." : "남은 곡이 없어요."}</p>}
            {g.items.map((s) => {
              const cancelled = s.entry.status === "CANCELLED";
              return (
                <div key={s.entry.id} className={`flex items-center gap-2.5 border-b border-ink py-2 ${cancelled ? "opacity-40" : ""}`}>
                  <span className="w-9 font-display text-[26px] leading-none">{s.no}</span>
                  <span className="flex min-w-0 flex-1 flex-col gap-px">
                    <span className={`truncate font-heading text-base ${cancelled ? "line-through" : ""}`}>{s.entry.song_title}</span>
                    <span className="truncate text-xs font-semibold">
                      {s.entry.artist} · {s.performers}
                    </span>
                  </span>
                  <span className="font-display text-xs tracking-[0.06em]">{cancelled ? "CANCEL" : s.entry.id === next?.entry.id ? "NEXT" : ""}</span>
                  <button
                    type="button"
                    aria-label={`${s.entry.song_title} 메뉴`}
                    onClick={() => {
                      menu.setMessage(null);
                      setMenuFor(s);
                    }}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center border-2 border-ink"
                  >
                    <DotsIcon />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        <button
          type="button"
          onClick={() => {
            form.setMessage(null);
            setAdding(true);
          }}
          className="mt-3 h-[52px] border-2 border-dashed border-ink text-[15px] font-extrabold"
        >
          {encore ? "+ 앵콜 직접 추가" : "+ 현장 참가 추가"}
        </button>
        {done.length > 0 && (
          <button type="button" onClick={() => setShowDone((v) => !v)} className="mt-1 min-h-10 text-xs font-extrabold underline underline-offset-[3px]">
            {showDone ? "완료된 곡 숨기기" : `완료된 곡 ${done.length}개 보기`}
          </button>
        )}
        {showDone &&
          done.map((s) => (
            <div key={s.entry.id} className="flex items-center gap-2.5 border-b border-ink py-1.5 opacity-50">
              <span className="w-9 font-display text-xl">{s.no}</span>
              <span className="min-w-0 flex-1 truncate text-sm font-extrabold">
                {s.entry.song_title} <span className="font-semibold">— {s.performers}</span>
              </span>
              <span className="font-display text-xs">DONE</span>
            </div>
          ))}
      </section>

      <section className="px-5 pb-6 pt-4">
        {encore ? (
          <button type="button" onClick={() => openConfirm("ENDED")} className="h-[60px] w-full border-[3px] border-ink font-heading text-[22px]">
            공연 종료하기
          </button>
        ) : (
          <>
            <button
              type="button"
              disabled={mainLeft > ENCORE_OPENS_AT}
              onClick={() => openConfirm("ENCORE")}
              className="h-14 w-full border-2 border-ink font-heading text-xl disabled:opacity-45"
            >
              앵콜 열기
            </button>
            <p className="mt-1.5 text-center text-xs font-semibold">
              {mainLeft > ENCORE_OPENS_AT
                ? `본 공연이 ${ENCORE_OPENS_AT}곡 남으면 열 수 있어요 · 지금 ${mainLeft}곡 남음`
                : mainLeft > 0
                  ? `남은 ${mainLeft}곡은 그대로 이어서 하고, 앵콜은 그 뒤에 불러요 · 누르면 확인 창이 떠요`
                  : "누르면 확인 창이 떠요"}
            </p>
            {!current && remaining === 0 && (
              <button type="button" onClick={() => openConfirm("ENDED")} className="mt-2 min-h-10 w-full text-xs font-extrabold underline underline-offset-[3px]">
                앵콜 없이 공연 종료
              </button>
            )}
          </>
        )}
      </section>

      <AdminTabs eventId={event.id} />

      {menuFor && (
        <Sheet
          onClose={() => setMenuFor(null)}
          title={
            <span className="flex items-center gap-3">
              <span className="font-display text-[44px] leading-none">{menuFor.no}</span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-heading text-2xl leading-tight">{menuFor.entry.song_title}</span>
                <span className="truncate text-[13px] font-bold">
                  {menuFor.entry.artist} · {menuFor.performers}
                </span>
              </span>
            </span>
          }
        >
          {menuFor.entry.status === "CANCELLED" ? (
            <div className="flex flex-col gap-2 pt-4">
              <button type="button" disabled={menu.pending} onClick={() => menu.run(() => setEntryCancelled(menuFor.entry.id, false), () => setMenuFor(null))} className="h-14 bg-accent text-base font-extrabold">
                취소 되살리기
              </button>
            </div>
          ) : (
            <>
              <h3 className="mb-2 mt-4 text-xs font-extrabold tracking-[0.08em]">순서 옮기기</h3>
              <div className="flex flex-col gap-2">
                <button type="button" disabled={menu.pending} onClick={() => runMove("next")} className="flex h-14 items-center justify-between bg-accent px-4 text-base font-extrabold">
                  바로 다음 순서로
                  {current && <span className="text-xs font-bold">{current.no} {current.entry.song_title} 다음</span>}
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" disabled={menu.pending} onClick={() => runMove("up")} className="h-[52px] border-2 border-ink text-[15px] font-extrabold">
                    ▲ 한 칸 위로
                  </button>
                  <button type="button" disabled={menu.pending} onClick={() => runMove("down")} className="h-[52px] border-2 border-ink text-[15px] font-extrabold">
                    ▼ 한 칸 아래로
                  </button>
                </div>
                <button type="button" disabled={menu.pending} onClick={() => runMove("last")} className="h-[52px] border-2 border-ink text-[15px] font-extrabold">
                  맨 뒤로 보내기 (지각 등)
                </button>
              </div>
              <h3 className="mb-2 mt-[18px] text-xs font-extrabold tracking-[0.08em]">곡 · 참가</h3>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    form.setMessage(null);
                    setEditFor(menuFor);
                    setMenuFor(null);
                  }}
                  className="h-[52px] border-2 border-ink text-[15px] font-extrabold"
                >
                  곡 · 공연자 수정
                </button>
                <button type="button" disabled={menu.pending} onClick={() => menu.run(() => setEntryCancelled(menuFor.entry.id, true), () => setMenuFor(null))} className="h-14 bg-ink text-base font-extrabold text-bg">
                  참가 취소
                </button>
                <p className="text-xs font-semibold leading-normal">취소한 곡은 순서에서 빠지지 않고 취소선으로 남아요. 메뉴에서 다시 되살릴 수 있어요.</p>
              </div>
            </>
          )}
          {menu.message && (
            <div className="pt-3">
              <Alert message={menu.message} />
            </div>
          )}
        </Sheet>
      )}

      {(adding || (editFor && editSub)) && (
        <Sheet
          onClose={() => {
            setAdding(false);
            setEditFor(null);
          }}
          title={
            <span className="flex flex-col">
              <span className="font-heading text-2xl leading-tight">{adding ? (encore ? "앵콜 직접 추가" : "현장 참가 추가") : "곡 · 공연자 수정"}</span>
              <span className="text-xs font-bold">{adding ? "순서 맨 뒤에 들어가요." : "순서는 그대로 유지돼요."}</span>
            </span>
          }
        >
          <AdminSubmissionForm
            key={editSub?.id ?? "new"}
            initial={
              editSub
                ? {
                    performers: editSub.performer_names,
                    songs: snapshot.entries
                      .filter((e) => e.submission_id === editSub.id)
                      .sort((a, b) => a.created_at.localeCompare(b.created_at))
                      .map((e) => ({ id: e.id, artist: e.artist, title: e.song_title })),
                  }
                : undefined
            }
            submitLabel={adding ? "추가하기" : "수정 완료"}
            pending={form.pending}
            message={form.message}
            onSubmit={(performers, songs) =>
              form.run(
                () => (editSub && !adding ? updateSubmission(editSub.id, performers, songs) : addSubmission(event.id, performers, songs)),
                () => {
                  setAdding(false);
                  setEditFor(null);
                },
              )
            }
          />
        </Sheet>
      )}

      {confirmTo && (
        <ConfirmDialog
          spec={confirmFor(confirmTo, snapshot)}
          pending={stage.pending}
          message={stage.message}
          onClose={() => setConfirmTo(null)}
          onConfirm={() => stage.run(() => changeStatus(event.id, confirmTo), () => setConfirmTo(null))}
        />
      )}
    </>
  );
}
