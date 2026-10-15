"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { BackLink, Chip, Display, EventHeading, Screen, TopBar, primaryButton } from "@/components/zine";
import type { EventRow } from "@/lib/event-data";
import { eventMeta } from "@/lib/event-view";
import { addMySubmission } from "@/lib/my-submissions";
import { createSubmission } from "../actions";
import { SubmissionForm } from "../_components/submission-form";

export function ApplyScreen({ event }: { event: EventRow }) {
  const router = useRouter();
  const base = `/events/${event.public_code}`;
  const mode = event.status === "OPEN" ? "main" : event.status === "ENCORE" ? "encore" : null;

  if (!mode) {
    return (
      <Screen>
        <TopBar left={<BackLink href={base}>행사 화면</BackLink>} />
        <section className="relative px-5 pt-2.5">
          <Display>CLOSED</Display>
          <h1 className="mt-4 font-heading text-[26px] leading-tight">지금은 신청할 수 없어요</h1>
          <p className="mt-2 text-sm font-semibold leading-relaxed">곡 모집이 끝났어요. 변경이 필요하면 운영진에게 말해 주세요.</p>
          <Link href={base} className={`${primaryButton} mt-8`}>
            행사 화면으로
          </Link>
        </section>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar left={<BackLink href={base}>{mode === "main" ? "신청된 곡" : "공연 순서"}</BackLink>} chip={<Chip>{mode === "main" ? "OPEN" : "ENCORE"}</Chip>} />
      <section className="relative px-5 pt-2.5">
        {mode === "main" ? (
          <>
            <Display size={76}>DROP<br />YOUR SONGS</Display>
            <EventHeading meta={eventMeta(event)} title={`${event.title} 참가곡`} />
          </>
        ) : (
          <>
            <Display size={84}>ONE MORE<br />SONG</Display>
            <h1 className="mt-2.5 font-heading text-2xl leading-tight">앵콜 곡 신청</h1>
            <p className="mt-1 text-[13px] font-semibold leading-normal">신청한 순서대로 공연해요. 한 번에 한 곡, 더 부르고 싶으면 다시 신청하세요.</p>
          </>
        )}
      </section>
      <SubmissionForm
        mode={mode}
        submitLabel={(n) => (mode === "main" ? (n > 0 ? `${n}곡 제출하기` : "제출하기") : "앵콜 신청하기")}
        onSubmit={async (input) => {
          const result = await createSubmission(event.public_code, input);
          if (!result.ok) return result;
          addMySubmission(event.public_code, result.data);
          router.push(`${base}/done/${result.data}`);
          return { ok: true };
        }}
      />
    </Screen>
  );
}
