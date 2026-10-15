"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { EntryRow, EventSnapshot, EventStatus } from "@/lib/event-data";
import { pad2, performersLabel } from "@/lib/event-view";
import { changeStatus, reorder } from "../../../actions";
import { AdminTabs, Alert, ConfirmDialog, EventHeader, useAdminAction } from "../../../_components/admin-ui";
import { confirmFor } from "../../../_components/stages";
import { useAdminSnapshot } from "../../../_components/use-admin-snapshot";

const HandleIcon = () => (
  <svg aria-hidden width="14" height="22" viewBox="0 0 14 22" fill="currentColor">
    {[4, 11, 18].flatMap((y) => [3.5, 10.5].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />))}
  </svg>
);

type Row = { entry: EntryRow; performers: string; warn: boolean };

function SortableRow({ row, index, editable }: { row: Row; index: number; editable: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: row.entry.id,
    disabled: !editable,
  });
  const cancelled = row.entry.status === "CANCELLED";
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-2 border-b border-ink py-1.5 pr-2.5 ${isDragging ? "z-10 -rotate-1 bg-accent" : "bg-bg"} ${cancelled ? "opacity-40" : ""}`}
    >
      {editable ? (
        <button
          ref={setActivatorNodeRef}
          type="button"
          aria-label={`${row.entry.song_title} 순서 옮기기 (꾹 눌러 끌기)`}
          className="inline-flex h-[52px] w-11 shrink-0 cursor-grab touch-none items-center justify-center"
          {...attributes}
          {...listeners}
        >
          <HandleIcon />
        </button>
      ) : (
        <span className="w-3" />
      )}
      <span className="w-[34px] font-display text-[26px] leading-none">{pad2(index + 1)}</span>
      <span className="flex min-w-0 flex-1 flex-col gap-px">
        <span className={`truncate font-heading text-base ${cancelled ? "line-through" : ""}`}>{row.entry.song_title}</span>
        <span className="truncate text-xs font-semibold">
          {row.entry.artist} · {row.performers}
        </span>
        {row.warn && <span className="mt-0.5 self-start border-[1.5px] border-ink px-1.5 py-px text-[11px] font-extrabold">같은 공연자 연속</span>}
      </span>
    </li>
  );
}

export function OrderView({ initial }: { initial: EventSnapshot }) {
  const router = useRouter();
  const [snapshot, reload] = useAdminSnapshot(initial);
  const { event } = snapshot;
  const status = event.status;
  const editable = status === "CLOSED" || status === "PUBLISHED";
  const [pendingOrder, setPendingOrder] = useState<string[] | null>(null);
  const [confirmTo, setConfirmTo] = useState<EventStatus | null>(null);
  const save = useAdminAction(() => {
    reload();
    setPendingOrder(null);
  });
  const stage = useAdminAction(reload);

  const performersOf = new Map(snapshot.submissions.map((s) => [s.id, performersLabel(s.performer_names)]));
  const main = snapshot.entries.filter((e) => !e.is_encore);
  const byId = new Map(main.map((e) => [e.id, e]));
  const serverOrder = main
    .filter((e) => e.order_index !== null)
    .sort((a, b) => a.order_index! - b.order_index!)
    .map((e) => e.id);
  const order = (pendingOrder ?? serverOrder).filter((id) => byId.has(id));
  const unplaced = main.filter((e) => e.order_index === null && e.status !== "CANCELLED" && !order.includes(e.id));

  const rows: Row[] = order.map((id, i) => {
    const entry = byId.get(id)!;
    const performers = performersOf.get(entry.submission_id) ?? "";
    const prev = i > 0 ? byId.get(order[i - 1]) : undefined;
    return { entry, performers, warn: !!prev && performersOf.get(prev.submission_id) === performers };
  });

  // 끌어 놓은 순서를 바로 보여주고 저장한다. 저장에 실패하면 서버 순서로 되돌린다.
  const commit = (ids: string[]) => {
    setPendingOrder(ids);
    save.run(async () => {
      const result = await reorder(event.id, false, ids);
      if (!result.ok) setPendingOrder(null);
      return result;
    });
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    commit(arrayMove(order, order.indexOf(String(active.id)), order.indexOf(String(over.id))));
  };

  const autoArrange = () => {
    const all = [...order.map((id) => byId.get(id)!), ...unplaced];
    commit(all.sort((a, b) => a.created_at.localeCompare(b.created_at)).map((e) => e.id));
  };

  return (
    <>
      <EventHeader event={event} back={`/admin/events/${event.id}`} backLabel={event.title} />
      <section className="px-5 pt-2">
        <div aria-hidden className="font-display text-[64px] leading-[0.92]">RUNNING ORDER</div>
        <h1 className="mt-1.5 font-heading text-2xl leading-tight">순서 편성</h1>
        {editable && <p className="mt-1 text-[13px] font-semibold leading-normal">왼쪽 손잡이(⠿)를 꾹 누른 채 끌어서 옮기세요.</p>}
      </section>

      {(status === "DRAFT" || status === "OPEN") && (
        <p className="mx-5 mt-4 border-2 border-dashed border-ink px-3.5 py-3 text-[13px] font-bold leading-normal">
          모집을 마감한 뒤에 순서를 짤 수 있어요. 모집 중에는 참가자가 곡을 계속 바꿀 수 있기 때문이에요.
        </p>
      )}
      {status === "PUBLISHED" && (
        <div role="status" className="mx-5 mt-4 flex flex-col gap-0.5 border-2 border-ink bg-accent px-3.5 py-3">
          <span className="font-heading text-[17px]">순서 초안 공개 중 · 참가자가 보고 있어요</span>
          <span className="text-xs font-bold leading-normal">순서 · 곡 변경 요청이 오면 여기서 고치세요. 고치면 참가자 화면에 바로 반영돼요.</span>
        </div>
      )}
      {(status === "LIVE" || status === "ENCORE" || status === "ENDED") && (
        <p className="mx-5 mt-4 border-2 border-dashed border-ink px-3.5 py-3 text-[13px] font-bold leading-normal">
          공연이 시작된 뒤에는 <Link href={`/admin/events/${event.id}/live`} className="font-extrabold underline">진행 화면</Link>의 곡 메뉴에서 순서를 옮겨요.
        </p>
      )}

      {editable && unplaced.length > 0 && (
        <section className="px-5 pt-4">
          <div className="flex flex-col gap-2.5 border-2 border-dashed border-ink p-3">
            <span className="flex items-baseline justify-between">
              <span className="text-[13px] font-extrabold">순서 미배치 · {unplaced.length}곡</span>
              <button type="button" onClick={() => commit([...order, ...unplaced.map((e) => e.id)])} className="min-h-9 px-2.5 text-xs font-extrabold underline underline-offset-[3px]">
                전부 끝에 넣기
              </button>
            </span>
            {unplaced.map((e) => (
              <div key={e.id} className="flex items-center gap-2.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-heading text-[17px]">{e.song_title}</span>
                  <span className="truncate text-xs font-semibold">
                    {e.artist} · {performersOf.get(e.submission_id)}
                  </span>
                </span>
                <button type="button" onClick={() => commit([...order, e.id])} className="min-h-11 shrink-0 bg-accent px-3 text-[13px] font-extrabold">
                  + 순서에 넣기
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col px-5 pt-[18px]">
        <div className="flex items-baseline justify-between border-b-[3px] border-ink pb-1.5">
          <h2 className="font-display text-[22px]">SETLIST · {order.length}</h2>
          {editable && (
            <button type="button" onClick={autoArrange} className="min-h-10 px-1 text-xs font-extrabold underline underline-offset-[3px]">
              신청 순으로 자동 편성
            </button>
          )}
        </div>
        {order.length === 0 && <p className="py-6 text-sm font-semibold">{editable ? "위에서 곡을 순서에 넣어 주세요." : "아직 순서가 없어요."}</p>}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ol>
              {rows.map((row, i) => (
                <SortableRow key={row.entry.id} row={row} index={i} editable={editable} />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
        {save.message && (
          <div className="pt-3">
            <Alert message={save.message} />
          </div>
        )}
      </section>

      {(status === "CLOSED" || status === "PUBLISHED") && (
        <section className="flex flex-col gap-2 px-5 pb-6 pt-[22px]">
          <button
            type="button"
            disabled={order.length === 0 || save.pending}
            onClick={() => {
              stage.setMessage(null);
              setConfirmTo(status === "CLOSED" ? "PUBLISHED" : "LIVE");
            }}
            className="flex h-16 -rotate-1 items-center justify-center bg-ink font-heading text-[22px] text-bg disabled:opacity-45"
          >
            {status === "CLOSED" ? "순서 초안 공개하기" : "공연 시작하기"}
          </button>
          <p className="text-xs font-semibold leading-normal">
            {status === "CLOSED"
              ? "공개하면 참가자 화면에 순서 초안이 보여요. 공개 뒤에도 계속 고칠 수 있어요."
              : "공연 당일, 무대 준비가 끝나면 누르세요. 확인하면 01번부터 공연이 시작돼요."}
          </p>
        </section>
      )}
      <div className="h-4" />
      <AdminTabs eventId={event.id} />

      {confirmTo && (
        <ConfirmDialog
          spec={confirmFor(confirmTo, snapshot)}
          pending={stage.pending}
          message={stage.message}
          onClose={() => setConfirmTo(null)}
          onConfirm={() =>
            stage.run(
              () => changeStatus(event.id, confirmTo),
              () => {
                setConfirmTo(null);
                if (confirmTo === "LIVE") router.push(`/admin/events/${event.id}/live`);
              },
            )
          }
        />
      )}
    </>
  );
}
