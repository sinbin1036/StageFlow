"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { BackLink, Chip, Display, Screen, Tag, TopBar, primaryButton } from "@/components/zine";
import type { EntryRow, EventRow, SubmissionRow } from "@/lib/event-data";
import { groupTag, pad2, performersLabel } from "@/lib/event-view";
import { addMySubmission, removeMySubmission } from "@/lib/my-submissions";
import { deleteSubmission, updateSubmission, verifyPin } from "../../actions";
import { SubmissionForm } from "../../_components/submission-form";

type Props = { event: EventRow; submission: SubmissionRow; entries: EntryRow[] };

function Alert({ message }: { message: string }) {
  return (
    <p role="alert" className="flex items-center gap-2 text-[13px] font-extrabold">
      <span className="inline-flex h-5 w-5 items-center justify-center bg-ink font-display text-[13px] text-bg">!</span>
      {message}
    </p>
  );
}

export function EditScreen({ event, submission, entries }: Props) {
  const router = useRouter();
  const base = `/events/${event.public_code}`;
  const encore = submission.is_encore;
  const editable = encore
    ? event.status === "ENCORE" && entries.every((e) => e.status === "SCHEDULED")
    : event.status === "OPEN";

  const [pin, setPin] = useState("");
  const [verifiedPin, setVerifiedPin] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const backLabel = encore ? "앵콜 순서" : "신청된 곡";

  const check = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await verifyPin(submission.id, pin);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      // PIN을 맞혔으면 이 신청의 주인이니 내 신청으로 표시한다
      addMySubmission(event.public_code, submission.id);
      setVerifiedPin(pin);
    });
  };

  const remove = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    startTransition(async () => {
      const result = await deleteSubmission(submission.id, verifiedPin ?? pin);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      removeMySubmission(event.public_code, submission.id);
      router.push(base);
    });
  };

  const card = (
    <div className="flex -rotate-1 items-center gap-3.5 border-2 border-ink bg-bg px-4 py-3.5">
      {encore && entries[0]?.order_index && <span className="font-display text-[40px] leading-none">{pad2(entries[0].order_index)}</span>}
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center gap-2">
          <span className="text-xs font-extrabold tracking-[0.08em]">{encore ? "선택한 앵콜 곡 · 순서 고정" : "선택한 신청"}</span>
          {groupTag(submission.performer_names) && <Tag tone="outline">{groupTag(submission.performer_names)}</Tag>}
        </span>
        <span className="font-heading text-2xl leading-tight">{performersLabel(submission.performer_names)}</span>
        {entries.map((e) => (
          <span key={e.id} className="text-[13px] font-semibold">
            {e.song_title} — {e.artist}
          </span>
        ))}
      </span>
    </div>
  );

  if (!editable) {
    return (
      <Screen>
        <TopBar left={<BackLink href={base}>{backLabel}</BackLink>} chip={<Chip tone="ink">LOCKED</Chip>} />
        <section className="relative px-5 pt-1">
          <Display size={150}>EDIT</Display>
          <h1 className="mt-1 font-heading text-[26px] leading-tight">지금은 수정할 수 없어요</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed">
            {encore ? "이 앵콜 곡은 이미 차례가 시작됐거나 앵콜이 끝났어요." : "곡 모집이 마감됐어요."} 변경이 필요하면 운영진에게 말해 주세요.
          </p>
        </section>
        <section className="relative px-5 pt-5">{card}</section>
      </Screen>
    );
  }

  if (verifiedPin) {
    return (
      <Screen>
        <TopBar left={<BackLink href={base}>{backLabel}</BackLink>} chip={<Chip>{encore ? "ENCORE" : "EDIT"}</Chip>} />
        <section className="relative px-5 pt-1">
          <Display size={110}>EDIT</Display>
          <h1 className="mt-1 font-heading text-[26px] leading-tight">{encore ? "앵콜 곡 수정" : "내 신청 수정"}</h1>
          {encore && <p className="mt-1 text-[13px] font-semibold">순서는 그대로 {pad2(entries[0]?.order_index ?? 0)}번이에요.</p>}
        </section>
        <SubmissionForm
          mode={encore ? "encore" : "main"}
          fixedPin={verifiedPin}
          initial={{
            performers: submission.performer_names,
            songs: entries.map((e) => ({ artist: e.artist, title: e.song_title })),
          }}
          submitLabel={() => "수정 완료"}
          onSubmit={async (input) => {
            const result = await updateSubmission(submission.id, input);
            if (!result.ok) return result;
            router.push(base);
            return { ok: true };
          }}
        />
        <footer className="relative mt-auto flex flex-col items-center gap-2.5 px-5 pb-7">
          {message && <Alert message={message} />}
          <button type="button" onClick={remove} disabled={pending} className="min-h-11 px-3 text-sm font-extrabold underline underline-offset-4">
            {confirmDelete ? "정말 삭제할까요? 한 번 더 누르면 삭제돼요" : encore ? "앵콜 신청 취소하기" : "신청 전체 삭제하기"}
          </button>
        </footer>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar left={<BackLink href={base}>{backLabel}</BackLink>} chip={encore ? <Chip>ENCORE</Chip> : undefined} />
      <section className="relative px-5 pt-1">
        <Display size={150}>EDIT</Display>
        <h1 className="mt-1 font-heading text-[26px] leading-tight">{encore ? "앵콜 곡 수정" : "내 신청 수정"}</h1>
      </section>
      <section className="relative px-5 pt-4">{card}</section>
      <form onSubmit={check} className="relative flex flex-col gap-3 px-5 pt-[22px]" noValidate>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-extrabold">신청할 때 정한 PIN 4자리</span>
          <input
            className="h-[72px] w-full rounded-none border-2 border-ink bg-accent px-3.5 text-center font-display text-4xl tracking-[0.7em] text-ink outline-none"
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 4))}
            placeholder="0000"
            autoFocus
          />
        </label>
        {message && <Alert message={message} />}
        <button type="submit" disabled={pending || pin.length !== 4} className={`${primaryButton} mt-1`}>
          {pending ? "확인하는 중…" : "확인하고 수정하기"}
        </button>
      </form>
      <footer className="relative mt-auto px-5 pb-7 pt-8 text-center text-xs font-semibold leading-normal">
        {encore ? "내 차례가 시작되면 수정할 수 없어요. " : ""}PIN이 기억나지 않으면 운영진에게 말해 주세요.
        <div className="mt-2">
          <Link href={base} className="font-extrabold underline underline-offset-4">
            돌아가기
          </Link>
        </div>
      </footer>
    </Screen>
  );
}
