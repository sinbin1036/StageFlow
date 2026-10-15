"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Display, Logo, Screen, TopBar, inputClass, primaryButton } from "@/components/zine";
import type { EventSnapshot } from "@/lib/event-data";
import { buildView, pad2 } from "@/lib/event-view";
import { replaceMyMainSubmission, useMySubmissions } from "@/lib/my-submissions";

// PIN 없이 내 신청을 고른다. 이 브라우저의 표시만 바뀌고 데이터는 바뀌지 않는다.
export function FindScreen({ snapshot }: { snapshot: EventSnapshot }) {
  const router = useRouter();
  const code = snapshot.event.public_code;
  const base = `/events/${code}`;
  const myIds = useMySubmissions(code);
  const { submissions } = buildView(snapshot, myIds);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string | null>(null);

  const selected = picked ?? submissions.find((s) => s.mine)?.submission.id ?? null;
  const q = query.trim().toLowerCase();
  const items = submissions.filter(
    (s) =>
      !q ||
      s.performers.toLowerCase().includes(q) ||
      s.entries.some((e) => e.song_title.toLowerCase().includes(q) || e.artist.toLowerCase().includes(q)),
  );

  const confirm = () => {
    if (!selected) return;
    replaceMyMainSubmission(code, selected, submissions.map((s) => s.submission.id));
    router.push(base);
  };

  return (
    <Screen>
      <TopBar left={<BackLink href={base}>공연 순서</BackLink>} chip={<Logo size={36} />} />
      <section className="relative px-5 pt-1">
        <Display size={112}>FIND ME</Display>
        <h1 className="mt-1.5 font-heading text-[26px] leading-tight">내 신청 찾기</h1>
        <p className="mt-1.5 text-[13px] font-semibold leading-normal">PIN 없이 골라도 돼요. 이 폰에서 내 순서 표시만 바뀌어요.</p>
      </section>
      <section className="relative px-5 pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold">이름 또는 곡 제목</span>
          <input className={inputClass} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 신승빈, 연인" />
        </label>
      </section>
      <section className="relative flex flex-col px-5 pt-3.5">
        {items.length === 0 && <p className="py-6 text-sm font-semibold">찾는 신청이 없어요.</p>}
        {items.map((s) => {
          const on = s.submission.id === selected;
          const slots = s.entries
            .filter((e) => e.order_index !== null)
            .sort((a, b) => a.order_index! - b.order_index!)
            .map((e) => pad2(e.order_index!));
          return (
            <button
              key={s.submission.id}
              type="button"
              aria-pressed={on}
              onClick={() => setPicked(s.submission.id)}
              className={`flex min-h-16 items-center gap-3 border-b border-ink px-3 py-2.5 text-left ${on ? "bg-accent" : ""}`}
            >
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-heading text-[17px]">{s.performers}</span>
                <span className="truncate text-xs font-semibold">{s.entries.map((e) => e.song_title).join(" · ")}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className="font-display text-lg leading-none">{slots.join(" · ")}</span>
                {on && <span className="font-display text-xs tracking-[0.06em]">ME ✓</span>}
              </span>
            </button>
          );
        })}
      </section>
      <footer className="relative mt-auto p-5">
        <button type="button" onClick={confirm} disabled={!selected} className={primaryButton}>
          이게 나예요 · MY TURN 표시
        </button>
      </footer>
    </Screen>
  );
}
