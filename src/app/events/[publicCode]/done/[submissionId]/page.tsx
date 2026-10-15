import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Screen, Tag, TopBar, primaryButton, secondaryButton } from "@/components/zine";
import { formatEventDate, groupTag, pad2, performersLabel } from "@/lib/event-view";
import { LoadingScreen } from "../../_components/loading-screen";
import { loadSnapshot } from "../../load";

export const metadata: Metadata = { title: "신청 완료" };

type Props = PageProps<"/events/[publicCode]/done/[submissionId]">;

export default function DonePage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Done params={params} />
    </Suspense>
  );
}

async function Done({ params }: { params: Props["params"] }) {
  const { publicCode, submissionId } = await params;
  const snapshot = await loadSnapshot(publicCode);
  const submission = snapshot?.submissions.find((s) => s.id === submissionId);
  if (!snapshot || !submission) notFound();

  const base = `/events/${publicCode}`;
  const entries = snapshot.entries.filter((e) => e.submission_id === submission.id);
  const tag = groupTag(submission.performer_names);
  const encore = submission.is_encore;

  const tips = encore
    ? [
        { title: `앵콜 ${entries[0]?.order_index ? pad2(entries[0].order_index) : ""}번으로 접수됐어요`, body: "먼저 신청한 순서대로 불러요. 순서를 미루고 싶다면 운영진에게 말해 주세요." },
        { title: "PIN 4자리는 꼭 기억하기", body: "내 차례가 오기 전까지 곡을 바꾸거나 취소할 때 필요해요." },
      ]
    : [
        { title: "공연 당일에도 이 단톡방 링크로", body: "같은 링크로 들어오면 내 순서가 바로 표시돼요." },
        { title: "PIN 4자리는 꼭 기억하기", body: "모집이 마감되기 전까지 곡을 바꾸거나 신청을 취소할 때 필요해요." },
      ];

  return (
    <Screen>
      <TopBar chip={<span className="text-xs font-extrabold tracking-[0.1em]">{formatEventDate(snapshot.event.event_date)}</span>} />
      <section className="relative px-5 pt-1.5">
        <h1 aria-label="신청 완료" className="font-display text-[150px] leading-[0.95] tracking-[-0.01em]">DONE!</h1>
      </section>
      <section className="relative -mt-8 px-[22px]">
        <div className="cut-edge flex -rotate-3 flex-col gap-1.5 bg-accent px-6 pb-[26px] pt-[22px]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold tracking-[0.08em]">{encore ? "내 앵콜 곡" : "내 신청"}</span>
            <Tag tone="outline">{[tag ?? "SOLO", `${entries.length}곡`].join(" · ")}</Tag>
          </div>
          <div className="font-heading text-[30px] leading-tight">{performersLabel(submission.performer_names)}</div>
          <div className="flex flex-col gap-px text-sm font-extrabold">
            {entries.map((e, i) => (
              <span key={e.id}>
                {pad2(i + 1)} {e.song_title} — {e.artist}
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="relative flex flex-col px-5 pt-7">
        {tips.map((t, i) => (
          <div key={t.title} className={`flex gap-3.5 py-3.5 ${i === 0 ? "border-t-[3px]" : "border-y"} border-ink`}>
            <span className="w-7 font-display text-[28px] leading-none">{i + 1}</span>
            <div className="flex flex-col gap-0.5">
              <span className="font-heading text-lg">{t.title}</span>
              <span className="text-[13px] font-semibold leading-normal">{t.body}</span>
            </div>
          </div>
        ))}
      </section>
      <footer className="relative mt-auto flex flex-col gap-2.5 p-5">
        <Link href={base} className={primaryButton}>
          {encore ? "공연 순서 보기" : "신청된 곡 목록 보기"}
        </Link>
        <Link href={`${base}/edit/${submission.id}`} className={secondaryButton}>
          {encore ? "앵콜 곡 수정하기" : "신청 수정하기"}
        </Link>
      </footer>
    </Screen>
  );
}
