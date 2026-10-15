"use client";

import { useState, useTransition, type FormEvent } from "react";
import { inputClass, primaryButton } from "@/components/zine";
import { createEvent } from "../../actions";
import { Alert } from "../../_components/admin-ui";

export function NewEventForm() {
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [venue, setVenue] = useState("");
  const [publicCode, setPublicCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      // 성공하면 서버에서 행사 현황으로 이동시킨다
      const result = await createEvent({ title, eventDate, venue, publicCode });
      if (result && !result.ok) setMessage(result.message);
    });
  };

  return (
    <form onSubmit={submit} className="relative flex flex-col gap-3.5 px-5 pb-8 pt-[22px]" noValidate>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-extrabold">행사 이름</span>
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="하이드 11월 정기 버스킹" maxLength={100} />
      </label>
      <div className="grid grid-cols-2 gap-2.5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold">공연 날짜</span>
          <input className={`${inputClass} px-2.5`} type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold">
            장소 <span className="font-semibold">(선택)</span>
          </span>
          <input className={`${inputClass} px-3`} value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={100} />
        </label>
      </div>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-extrabold">참가자 링크 주소</span>
        <span className="flex items-stretch border-2 border-ink">
          <span className="flex items-center whitespace-nowrap bg-ink px-2.5 text-xs font-extrabold text-bg">…/events/</span>
          <input
            className="h-12 min-w-0 flex-1 bg-bg px-3 text-base font-extrabold outline-none"
            value={publicCode}
            onChange={(e) => setPublicCode(e.target.value.replace(/[^A-Za-z0-9_-]/g, ""))}
            placeholder="hid-1121"
            maxLength={32}
            autoCapitalize="none"
            spellCheck={false}
          />
        </span>
        <span className="text-xs font-semibold leading-normal">영문 · 숫자 · 하이픈만. 비워두면 자동으로 만들어져요.</span>
      </label>
      <div className="mt-1.5 flex items-start gap-2.5 border-2 border-dashed border-ink px-3.5 py-3">
        <span className="text-xs font-bold leading-relaxed">
          만든 행사는 <strong>준비(DRAFT)</strong> 상태라 참가자에게 보이지 않아요. 행사 현황에서 [모집 시작하기]를 누르면 공개돼요.
        </span>
      </div>
      {message && <Alert message={message} />}
      <button type="submit" disabled={pending} className={`${primaryButton} mt-2.5`}>
        {pending ? "만드는 중…" : "행사 만들기"}
      </button>
    </form>
  );
}
