"use client";

import { useState } from "react";
import { Tag, inputClass } from "@/components/zine";
import type { EventSnapshot, SubmissionRow } from "@/lib/event-data";
import { groupTag, performersLabel } from "@/lib/event-view";
import { addSubmission, deleteSubmission, updateSubmission } from "../../../actions";
import { AdminSubmissionForm } from "../../../_components/admin-submission-form";
import { AdminTabs, EventHeader, Sheet, useAdminAction } from "../../../_components/admin-ui";
import { useAdminSnapshot } from "../../../_components/use-admin-snapshot";

const time = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}.${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function SubmissionsView({ initial }: { initial: EventSnapshot }) {
  const [snapshot, reload] = useAdminSnapshot(initial);
  const { event } = snapshot;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<SubmissionRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const form = useAdminAction(reload);
  const del = useAdminAction(reload);

  const entriesOf = (id: string) =>
    snapshot.entries.filter((e) => e.submission_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));

  const q = query.trim().toLowerCase();
  const matches = (s: SubmissionRow) =>
    !q ||
    s.performer_names.some((n) => n.toLowerCase().includes(q)) ||
    entriesOf(s.id).some((e) => e.song_title.toLowerCase().includes(q) || e.artist.toLowerCase().includes(q));

  const sections = [
    { title: "본 공연", items: snapshot.submissions.filter((s) => !s.is_encore) },
    { title: "앵콜", items: snapshot.submissions.filter((s) => s.is_encore) },
  ].filter((sec) => sec.items.length > 0 || sec.title === "본 공연");

  const songCount = snapshot.entries.filter((e) => !e.is_encore).length;
  const editingSub = editing && editing !== "new" ? editing : null;

  return (
    <>
      <EventHeader event={event} back={`/admin/events/${event.id}`} backLabel={event.title} />
      <section className="flex items-end justify-between gap-3 px-5 pt-2">
        <div>
          <div aria-hidden className="font-display text-[64px] leading-[0.92]">ENTRIES</div>
          <h1 className="mt-1.5 font-heading text-2xl leading-tight">신청 관리</h1>
        </div>
        <span className="pb-1 text-xs font-extrabold">
          {sections[0].items.length}건 · {songCount}곡
        </span>
      </section>

      <section className="flex gap-2 px-5 pt-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">이름 또는 곡 검색</span>
          <input className={`${inputClass} h-12 px-3`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 · 곡 검색" />
        </label>
        <button
          type="button"
          onClick={() => {
            form.setMessage(null);
            setEditing("new");
          }}
          disabled={event.status === "ENDED"}
          className="h-12 whitespace-nowrap bg-accent px-3.5 text-sm font-extrabold disabled:opacity-40"
        >
          + 현장 추가
        </button>
      </section>

      {sections.map((sec) => (
        <section key={sec.title} className="flex flex-col px-5 pt-4">
          {sections.length > 1 && <h2 className="border-b-[3px] border-ink pb-1 font-heading text-lg">{sec.title}</h2>}
          {sec.items.length === 0 && <p className="py-6 text-sm font-semibold">아직 신청이 없어요.</p>}
          {sec.items.filter(matches).map((s) => {
            const entries = entriesOf(s.id);
            const tag = groupTag(s.performer_names);
            return (
              <div key={s.id} className="flex flex-col gap-2 border-b border-ink py-3">
                <div className="flex items-start gap-2.5">
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-heading text-lg">{performersLabel(s.performer_names)}</span>
                      {tag && <Tag tone="outline">{tag}</Tag>}
                    </span>
                    {entries.map((e) => (
                      <span key={e.id} className={`text-[13px] font-semibold ${e.status === "CANCELLED" ? "line-through opacity-50" : ""}`}>
                        {e.song_title} — {e.artist}
                      </span>
                    ))}
                    <span className="text-[11px] font-semibold opacity-60">{time(s.created_at)}</span>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <button
                      type="button"
                      aria-label={`${performersLabel(s.performer_names)} 신청 수정`}
                      onClick={() => {
                        form.setMessage(null);
                        setEditing(s);
                      }}
                      className="min-h-11 border-2 border-ink px-3 text-[13px] font-extrabold"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      aria-label={`${performersLabel(s.performer_names)} 신청 삭제`}
                      onClick={() => {
                        del.setMessage(null);
                        setDeleting(s.id);
                      }}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center border-2 border-ink"
                    >
                      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
                      </svg>
                    </button>
                  </div>
                </div>
                {deleting === s.id && (
                  <div role="alert" className="flex flex-col gap-2 bg-ink px-3 py-2.5 text-bg">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-extrabold">이 신청과 곡 {entries.length}개를 삭제할까요?</span>
                      <span className="flex gap-1.5">
                        <button
                          type="button"
                          disabled={del.pending}
                          onClick={() => del.run(() => deleteSubmission(s.id), () => setDeleting(null))}
                          className="min-h-10 bg-accent px-3 text-[13px] font-extrabold text-ink"
                        >
                          삭제
                        </button>
                        <button type="button" onClick={() => setDeleting(null)} className="min-h-10 border-2 border-bg px-3 text-[13px] font-extrabold">
                          취소
                        </button>
                      </span>
                    </div>
                    {del.message && <span className="text-xs font-bold">{del.message}</span>}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      ))}

      <div className="h-6" />
      <AdminTabs eventId={event.id} />

      {editing && (
        <Sheet
          onClose={() => setEditing(null)}
          title={
            <span className="flex flex-col">
              <span className="font-heading text-2xl leading-tight">{editingSub ? "신청 수정" : "현장 추가"}</span>
              <span className="text-xs font-bold">
                {editingSub
                  ? "곡을 지우면 순서에서도 빠지고, 새로 넣은 곡은 순서 맨 뒤로 들어가요."
                  : event.status === "ENCORE"
                    ? "앵콜 순서 맨 뒤에 들어가요. PIN 없이 운영진만 고칠 수 있어요."
                    : ["PUBLISHED", "LIVE"].includes(event.status)
                      ? "공연 순서 맨 뒤에 들어가요. PIN 없이 운영진만 고칠 수 있어요."
                      : "순서 미배치로 들어가요. PIN 없이 운영진만 고칠 수 있어요."}
              </span>
            </span>
          }
        >
          <AdminSubmissionForm
            key={editingSub?.id ?? "new"}
            initial={
              editingSub
                ? {
                    performers: editingSub.performer_names,
                    songs: entriesOf(editingSub.id).map((e) => ({ id: e.id, artist: e.artist, title: e.song_title })),
                  }
                : undefined
            }
            submitLabel={editingSub ? "수정 완료" : "추가하기"}
            pending={form.pending}
            message={form.message}
            onSubmit={(performers, songs) =>
              form.run(
                () => (editingSub ? updateSubmission(editingSub.id, performers, songs) : addSubmission(event.id, performers, songs)),
                () => setEditing(null),
              )
            }
          />
        </Sheet>
      )}
    </>
  );
}
