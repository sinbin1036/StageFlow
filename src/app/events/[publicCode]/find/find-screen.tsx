"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Display, Logo, Screen, TopBar, inputClass, primaryButton } from "@/components/zine";
import type { EventSnapshot } from "@/lib/event-data";
import { buildView, pad2 } from "@/lib/event-view";
import { replaceMyMainSubmissions, useMySubmissions } from "@/lib/my-submissions";

// PIN 없이 내 신청을 고른다. 이 브라우저의 표시만 바뀌고 데이터는 바뀌지 않는다.
export function FindScreen({ snapshot }: { snapshot: EventSnapshot }) {
  const router = useRouter();
  const code = snapshot.event.public_code;
  const base = `/events/${code}`;
  const myIds = useMySubmissions(code);
  const { submissions } = buildView(snapshot, myIds);
  const [query, setQuery] = useState("");
  // null = 아직 안 건드림(이미 내 것으로 표시된 신청을 그대로 보여줌)
  const [picked, setPicked] = useState<string[] | null>(null);

  const current = submissions.filter((s) => s.mine).map((s) => s.submission.id);
  const selected = picked ?? current;
  const selectedSongs = submissions.filter((s) => selected.includes(s.submission.id)).reduce((n, s) => n + s.entries.length, 0);
  const q = query.trim().toLowerCase();
  // 공연 순서 화면처럼 곡 하나를 한 줄로, 순번 순서대로 보여준다(순번이 없는 곡은 뒤로).
  // 검색해야 목록이 뜨고, 검색 전에는 이미 고른 곡만 보여서 확인하거나 취소할 수 있다.
  const items = submissions
    .flatMap((s) => s.entries.map((entry) => ({ s, entry })))
    .filter(({ s, entry }) =>
      q
        ? s.performers.toLowerCase().includes(q) ||
          entry.song_title.toLowerCase().includes(q) ||
          entry.artist.toLowerCase().includes(q)
        : selected.includes(s.submission.id),
    )
    .sort((a, b) => (a.entry.order_index ?? Infinity) - (b.entry.order_index ?? Infinity));

  // 솔로 · 듀엣처럼 신청이 여러 개일 수 있어 여러 개를 고를 수 있고, 한 번 더 누르면 선택이 풀린다
  const toggle = (id: string) => setPicked(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);

  const confirm = () => {
    replaceMyMainSubmissions(code, selected, submissions.map((s) => s.submission.id));
    router.push(base);
  };

  return (
    <Screen>
      <TopBar left={<BackLink href={base}>공연 순서</BackLink>} chip={<Logo size={36} />} />
      <section className="relative px-5 pt-1">
        <Display size={112}>FIND ME</Display>
        <h1 className="mt-1.5 font-heading text-[26px] leading-tight">내 신청 찾기</h1>
        <p className="mt-1.5 text-[13px] font-semibold leading-normal">PIN 없이 골라도 돼요. 이 폰에서 내 순서 표시만 바뀌어요. 여러 개 고를 수 있고, 한 번 더 누르면 취소돼요.</p>
      </section>
      <section className="relative px-5 pt-4">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-extrabold">이름 또는 곡 제목</span>
          <input className={inputClass} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="예) 신승빈, 연인" />
        </label>
      </section>
      <section className="relative flex flex-col px-5 pt-3.5">
        {items.length === 0 && (
          <p className="py-6 text-sm font-semibold">{q ? "찾는 신청이 없어요." : "이름이나 곡 제목을 검색하면 여기에 나와요."}</p>
        )}
        {items.map(({ s, entry }) => {
          // 고르는 단위는 신청이라, 같은 신청의 곡은 함께 선택된다
          const on = selected.includes(s.submission.id);
          return (
            <button
              key={entry.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.submission.id)}
              className={`flex min-h-16 items-center gap-3 border-b border-ink px-3 py-2.5 text-left ${on ? "bg-accent" : ""}`}
            >
              <span className="w-10 shrink-0 font-display text-[26px] leading-none">
                {entry.order_index ? pad2(entry.order_index) : "—"}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="font-heading text-[17px]">{s.performers}</span>
                <span className={`truncate text-xs font-semibold ${entry.status === "CANCELLED" ? "line-through" : ""}`}>
                  {entry.song_title} — {entry.artist}
                </span>
              </span>
              {on && <span className="shrink-0 font-display text-xs tracking-[0.06em]">ME ✓</span>}
            </button>
          );
        })}
      </section>
      <footer className="relative mt-auto p-5">
        <button type="button" onClick={confirm} disabled={selected.length === 0 && current.length === 0} className={primaryButton}>
          {selected.length > 0 ? `이게 나예요 · ${selectedSongs}곡 MY TURN 표시` : "내 표시 지우기"}
        </button>
      </footer>
    </Screen>
  );
}
