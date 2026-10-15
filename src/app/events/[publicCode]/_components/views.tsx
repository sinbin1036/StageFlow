import Link from "next/link";
import type { ReactNode } from "react";
import {
  Chip,
  CutLink,
  Display,
  EventHeading,
  Screen,
  SectionTitle,
  Tag,
  TopBar,
} from "@/components/zine";
import type { EventSnapshot } from "@/lib/event-data";
import { buildView, countSongs, eventMeta, progress, type SlotView, type SubmissionView } from "@/lib/event-view";

type ViewProps = { snapshot: EventSnapshot; view: ReturnType<typeof buildView> };

const base = (snapshot: EventSnapshot) => `/events/${snapshot.event.public_code}`;

// ─── 공통 조각 ───────────────────────────────────────────────

function StatsBand({ left, right }: { left: string; right: string }) {
  return (
    <div className="relative mt-[22px] flex items-center justify-between bg-ink px-5 py-3 text-bg">
      <span className="font-display text-[17px] tracking-[0.04em]">{left}</span>
      <span className="text-xs font-extrabold">{right}</span>
    </div>
  );
}

function SubmissionList({ items, editBase }: { items: SubmissionView[]; editBase?: string }) {
  if (items.length === 0) {
    return <p className="py-6 text-sm font-semibold">아직 신청된 곡이 없어요. 첫 번째로 신청해 보세요!</p>;
  }
  return (
    <ul>
      {items.map((s) => (
        <li key={s.submission.id} className="flex items-start gap-3 border-b border-ink py-3">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className="font-heading text-lg">{s.performers}</span>
              {s.tag && <Tag tone="outline">{s.tag}</Tag>}
              {s.mine && <Tag>MY</Tag>}
            </span>
            {s.entries.map((e) => (
              <span key={e.id} className="text-[13px] font-semibold">
                {e.song_title} — {e.artist}
              </span>
            ))}
          </div>
          {editBase && (
            <Link
              href={`${editBase}/${s.submission.id}`}
              aria-label={`${s.performers} 신청 수정`}
              className="flex min-h-11 shrink-0 items-center border-2 border-ink px-3.5 text-[13px] font-extrabold no-underline"
            >
              수정
            </Link>
          )}
        </li>
      ))}
    </ul>
  );
}

function slotTag(slot: SlotView, nextId: string | null) {
  switch (slot.entry.status) {
    case "PERFORMING":
      return <Tag>NOW</Tag>;
    case "COMPLETED":
      return <Tag tone="plain">DONE</Tag>;
    case "CANCELLED":
      return <Tag tone="plain">CANCEL</Tag>;
  }
  if (slot.mine) return <Tag>MY TURN</Tag>;
  if (slot.entry.id === nextId) return <Tag tone="ink">NEXT</Tag>;
  return null;
}

function SlotList({ slots, nextId = null, action }: { slots: SlotView[]; nextId?: string | null; action?: (s: SlotView) => ReactNode }) {
  return (
    <ul>
      {slots.map((s) => {
        const faded = s.entry.status === "COMPLETED" || s.entry.status === "CANCELLED";
        return (
          <li key={s.entry.id} className={`flex items-center gap-3.5 border-b border-ink py-2.5 ${faded ? "opacity-35" : ""}`}>
            <span className="w-10 font-display text-[30px] leading-none">{s.no}</span>
            <div className="flex min-w-0 flex-1 flex-col gap-px">
              <span className={`truncate font-heading text-lg ${s.entry.status === "CANCELLED" ? "line-through" : ""}`}>
                {s.entry.song_title}
              </span>
              <span className="truncate text-xs font-semibold">
                {s.entry.artist} · {s.performers}
              </span>
            </div>
            {slotTag(s, nextId)}
            {action?.(s)}
          </li>
        );
      })}
    </ul>
  );
}

function InkFooter({ kicker, children }: { kicker: string; children: ReactNode }) {
  return (
    <footer className="relative mt-auto flex flex-col gap-0.5 bg-ink px-5 pb-5 pt-4 text-bg">
      <span className="font-display text-sm tracking-[0.06em] text-accent">{kicker}</span>
      <span className="text-sm font-extrabold leading-normal">{children}</span>
    </footer>
  );
}

// ─── 모집 중 (OPEN) ─────────────────────────────────────────

export function OpenView({ snapshot, view }: ViewProps) {
  const songs = countSongs(snapshot, false);
  return (
    <Screen>
      <TopBar chip={<Chip>OPEN</Chip>} />
      <section className="relative px-5 pt-2.5">
        <Display>SONG<br />LIST</Display>
        <EventHeading meta={eventMeta(snapshot.event)} title={snapshot.event.title} />
      </section>
      <section className="relative px-5 pt-5">
        <CutLink href={`${base(snapshot)}/apply`} kicker="솔로 · 듀엣 · 여러 곡 OK" label="곡 신청하기" />
      </section>
      <StatsBand left={`${view.submissions.length} ENTRIES · ${songs} SONGS`} right="모집 중" />
      <section className="relative flex flex-col px-5 pt-3.5">
        <h2 className="border-b-[3px] border-ink pb-1.5 font-heading text-[22px]">신청된 곡</h2>
        <SubmissionList items={view.submissions} editBase={`${base(snapshot)}/edit`} />
      </section>
      <footer className="relative mt-auto px-5 pb-7 pt-6">
        <p className="text-xs font-semibold leading-relaxed">
          내 신청을 고치려면 목록에서 <strong>[수정]</strong> → 신청할 때 정한 PIN 4자리를 입력하세요. 모집이 마감되면 수정할 수 없어요.
        </p>
      </footer>
    </Screen>
  );
}

// ─── 모집 마감 (CLOSED) ─────────────────────────────────────

export function ClosedView({ snapshot, view }: ViewProps) {
  const songs = countSongs(snapshot, false);
  return (
    <Screen>
      <TopBar chip={<Chip tone="ink" tilt={4}>CLOSED</Chip>} />
      <section className="relative px-5 pt-2.5">
        <Display>SONG<br />LIST</Display>
        <EventHeading meta={eventMeta(snapshot.event)} title={snapshot.event.title} />
      </section>
      <section className="relative px-5 pt-5">
        <div role="status" className="cut-edge flex -rotate-2 flex-col gap-1 bg-accent px-[22px] pb-[22px] pt-5">
          <span className="font-display text-[15px] tracking-[0.06em]">SUBMISSION CLOSED</span>
          <span className="font-heading text-[26px] leading-tight">운영진이 순서를 짜는 중이에요</span>
          <span className="text-[13px] font-semibold leading-normal">순서가 공개되면 이 화면이 공연 순서로 바뀌어요.</span>
        </div>
      </section>
      <StatsBand left={`${view.submissions.length} ENTRIES · ${songs} SONGS`} right="모집 마감됨" />
      <section className="relative flex flex-col px-5 pt-3.5">
        <h2 className="border-b-[3px] border-ink pb-1.5 font-heading text-[22px]">신청된 곡</h2>
        <SubmissionList items={view.submissions} />
      </section>
      <footer className="relative mt-auto flex items-center gap-3 px-5 pb-7 pt-6">
        <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square">
          <rect x="5" y="11" width="14" height="10" />
          <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </svg>
        <p className="text-xs font-bold leading-relaxed">이제 직접 수정할 수 없어요. 곡이나 순서를 바꾸고 싶다면 운영진에게 말해 주세요.</p>
      </footer>
    </Screen>
  );
}

// ─── 순서 공개 (PUBLISHED) ──────────────────────────────────

export function PublishedView({ snapshot, view }: ViewProps) {
  const mine = view.mainSlots.filter((s) => s.mine);
  return (
    <Screen>
      <TopBar chip={<Chip>DRAFT SETLIST</Chip>} />
      <section className="relative px-5 pt-2.5">
        <Display size={118}>SETLIST</Display>
        <EventHeading meta={eventMeta(snapshot.event)} title={`${snapshot.event.title} 순서 초안`} />
      </section>
      <section className="relative px-5 pt-3.5">
        <div role="status" className="flex items-center gap-2.5 border-2 border-dashed border-ink px-3 py-2.5">
          <Tag tone="ink">DRAFT</Tag>
          <span className="text-[13px] font-extrabold leading-snug">순서 초안이에요 · 공연 전까지 바뀔 수 있어요</span>
        </div>
      </section>
      {mine.length > 0 && (
        <section className="relative px-6 pt-5">
          <div className="cut-edge flex -rotate-3 items-center justify-between gap-3.5 bg-accent px-[22px] pb-[22px] pt-[18px]">
            <div className="flex flex-col">
              <span className="text-xs font-extrabold">내 순서 · {mine[0].performers}</span>
              <span className="font-heading text-[22px] leading-snug">
                {mine.map((s) => `${Number(s.no)}번째`).join(", ")}
              </span>
            </div>
            <div className="whitespace-nowrap font-display text-[52px] leading-[0.9]">{mine.map((s) => s.no).join(" / ")}</div>
          </div>
        </section>
      )}
      <section className="relative flex flex-col px-5 pt-6">
        <SectionTitle aside={<FindLink snapshot={snapshot} />}>RUNNING ORDER</SectionTitle>
        <SlotList slots={view.mainSlots} />
      </section>
      <div className="h-6" />
      <InkFooter kicker="NEED A CHANGE?">순서나 곡을 바꾸고 싶다면 운영진에게 말해 주세요. 바뀌면 이 화면에 바로 반영돼요.</InkFooter>
    </Screen>
  );
}

function FindLink({ snapshot }: { snapshot: EventSnapshot }) {
  return (
    <Link href={`${base(snapshot)}/find`} className="flex min-h-11 items-center text-xs font-extrabold underline-offset-[3px]">
      내 신청 찾기
    </Link>
  );
}

// ─── 공연 중 (LIVE) ─────────────────────────────────────────

function NowCard({ slot, fallback }: { slot: SlotView | null; fallback: string }) {
  return (
    <section className="relative mt-2 h-[290px]">
      <div aria-hidden className="absolute left-3 top-[-6px] font-display text-[180px] leading-none tracking-[-0.01em]">NOW</div>
      <div className="cut-edge absolute left-[30px] right-5 top-[112px] flex -rotate-3 items-center gap-4 bg-accent px-[22px] pb-6 pt-[22px]">
        {slot ? (
          <>
            <div className="font-display text-[72px] leading-[0.9]">{slot.no}</div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <div className="truncate font-heading text-[34px] leading-tight">{slot.entry.song_title}</div>
              <div className="truncate text-sm font-extrabold">
                {slot.entry.artist} · {slot.performers}
              </div>
            </div>
          </>
        ) : (
          <div className="font-heading text-[28px] leading-tight">{fallback}</div>
        )}
      </div>
    </section>
  );
}

function NextBand({ slot }: { slot: SlotView | null }) {
  if (!slot) return null;
  return (
    <div className="relative flex items-center gap-3 bg-ink px-5 py-3.5 text-bg">
      <span className="font-display text-lg tracking-[0.06em] text-accent">NEXT</span>
      <span className="font-display text-lg">{slot.no}</span>
      <span className="min-w-0 flex-1 truncate font-heading text-[17px]">{slot.entry.song_title}</span>
      <span className="text-[13px] font-semibold">{slot.performers}</span>
    </div>
  );
}

function MyTurnFooter({ snapshot, view, slots }: ViewProps & { slots: SlotView[] }) {
  const { myNext, teamsBeforeMine } = progress(slots);
  return (
    <footer className="relative mt-auto flex items-end justify-between gap-3 bg-accent px-5 pb-[22px] pt-[18px]">
      {view.hasMine ? (
        <>
          <div className="flex flex-col">
            {myNext ? (
              <>
                <span className="text-xs font-extrabold">내 다음 순서({myNext.no})까지</span>
                <span className="font-heading text-[40px] leading-none">
                  {teamsBeforeMine === 0 ? "곧 내 차례!" : `${teamsBeforeMine}팀 남음`}
                </span>
              </>
            ) : (
              <span className="font-heading text-[28px] leading-tight">내 순서가 끝났어요</span>
            )}
          </div>
          <span className="text-right text-xs font-bold leading-normal">
            변경은
            <br />
            운영진에게
          </span>
        </>
      ) : (
        <>
          <div className="flex flex-col">
            <span className="text-xs font-extrabold">내 순서가 안 보이나요?</span>
            <span className="font-heading text-[30px] leading-tight">목록에서 골라주세요</span>
          </div>
          <Link
            href={`${base(snapshot)}/find`}
            className="flex min-h-[52px] items-center whitespace-nowrap bg-ink px-4 text-sm font-extrabold text-bg no-underline"
          >
            내 신청 찾기
          </Link>
        </>
      )}
    </footer>
  );
}

export function LiveView({ snapshot, view }: ViewProps) {
  const { current, next } = progress(view.mainSlots);
  return (
    <Screen>
      <TopBar chip={<Chip tone="outline" tilt={4}>ON AIR</Chip>} />
      <section className="relative px-5 pt-3.5">
        <div className="text-xs font-extrabold tracking-[0.1em]">{eventMeta(snapshot.event)}</div>
        <h1 className="mt-1 font-heading text-[30px] leading-tight">{snapshot.event.title}</h1>
      </section>
      <NowCard slot={current} fallback="곧 공연이 시작돼요" />
      <NextBand slot={next} />
      <section className="relative flex flex-col px-5 pb-6 pt-[18px]">
        <SectionTitle aside={<FindLink snapshot={snapshot} />}>SETLIST</SectionTitle>
        <SlotList slots={view.mainSlots} nextId={next?.entry.id ?? null} />
      </section>
      <MyTurnFooter snapshot={snapshot} view={view} slots={view.mainSlots} />
    </Screen>
  );
}

// ─── 앵콜 (ENCORE) ──────────────────────────────────────────
// 앵콜은 본 공연이 5곡 이하로 남았을 때 열린다. 남은 본 공연을 먼저 마치고, 앵콜 곡은 신청한 순서대로 그 뒤에 부른다.

function NowBand({ slot }: { slot: SlotView }) {
  return (
    <div className="relative flex items-center gap-3 border-y-[3px] border-ink bg-accent px-5 py-3.5">
      <span className="font-display text-lg tracking-[0.06em]">NOW</span>
      <span className="font-display text-[28px] leading-none">{slot.no}</span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-heading text-xl leading-tight">{slot.entry.song_title}</span>
        <span className="truncate text-xs font-extrabold">
          {slot.entry.is_encore ? "앵콜 · " : ""}
          {slot.entry.artist} · {slot.performers}
        </span>
      </span>
    </div>
  );
}

export function EncoreView({ snapshot, view }: ViewProps) {
  const play = [...view.mainSlots, ...view.encoreSlots];
  const { current, next } = progress(play);
  const isWaiting = (s: SlotView) => s.entry.status === "SCHEDULED" || s.entry.status === "CANCELLED";
  const mainWaiting = view.mainSlots.filter(isWaiting);
  const mainLeft = mainWaiting.filter((s) => s.entry.status === "SCHEDULED").length;
  const done = view.mainSlots.filter((s) => s.entry.status === "COMPLETED").length;
  const cancelled = view.mainSlots.filter((s) => s.entry.status === "CANCELLED").length;
  const nextId = next?.entry.id ?? null;
  return (
    <Screen>
      <TopBar chip={<Chip tilt={4}>ENCORE</Chip>} />
      <section className="relative px-5 pt-3.5">
        <div className="text-xs font-extrabold tracking-[0.1em]">{eventMeta(snapshot.event)}</div>
        <h1 className="mt-1 font-heading text-[30px] leading-tight">{snapshot.event.title}</h1>
      </section>
      <section className="relative mt-1 h-[250px]">
        <div aria-hidden className="absolute left-2.5 top-[-4px] font-display text-[128px] leading-none tracking-[-0.01em]">ENCORE</div>
        <div className="absolute left-[30px] right-5 top-[106px]">
          <CutLink href={`${base(snapshot)}/apply`} kicker="한 번에 한 곡 · 솔로 · 듀엣 OK" label="앵콜 신청하기" />
        </div>
      </section>

      {current && <NowBand slot={current} />}
      {current && <NextBand slot={next} />}

      {mainLeft > 0 && (
        <section className="relative flex flex-col px-5 pt-5">
          <SectionTitle aside={<span className="text-xs font-extrabold">남은 {mainLeft}곡 · 이어서 진행</span>}>MAIN SET</SectionTitle>
          <SlotList slots={mainWaiting} nextId={nextId} />
        </section>
      )}

      <section className="relative flex flex-col px-5 pt-5">
        <SectionTitle aside={<span className="text-xs font-extrabold">신청 순 · {view.encoreSlots.length}곡</span>}>ENCORE QUEUE</SectionTitle>
        {mainLeft > 0 && <p className="pt-2 text-xs font-semibold">본 공연 남은 곡이 끝나면 01번부터 불러요.</p>}
        {view.encoreSlots.length === 0 ? (
          <p className="py-6 text-sm font-semibold">아직 앵콜 신청이 없어요. 먼저 신청하면 먼저 불러요!</p>
        ) : (
          <SlotList
            slots={view.encoreSlots}
            nextId={nextId}
            action={(s) =>
              s.entry.status === "SCHEDULED" ? (
                <Link
                  href={`${base(snapshot)}/edit/${s.entry.submission_id}`}
                  aria-label={`${s.entry.song_title} 수정`}
                  className="flex min-h-11 shrink-0 items-center border-2 border-ink px-2.5 text-xs font-extrabold no-underline"
                >
                  수정
                </Link>
              ) : null
            }
          />
        )}
      </section>

      {mainLeft === 0 && (
        <section className="relative px-5 pb-6 pt-[18px]">
          <div className="flex items-center justify-between border-2 border-ink px-4 py-3.5 opacity-55">
            <span className="flex flex-col">
              <span className="font-display text-lg tracking-[0.02em]">MAIN SET</span>
              <span className="text-xs font-semibold">
                본 공연 {done}곡 완료{cancelled ? ` · ${cancelled}곡 취소` : ""}
              </span>
            </span>
            <svg aria-hidden width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
              <path d="M5 12l5 5 9-10" />
            </svg>
          </div>
        </section>
      )}
      <div className="h-6" />
      <InkFooter kicker="FIRST COME, FIRST SING">
        먼저 신청한 순서대로 공연해요. 곡은 내 차례 전까지 PIN으로 직접 바꿀 수 있고, 순서를 미루고 싶다면 운영진에게 말해 주세요.
      </InkFooter>
    </Screen>
  );
}

// ─── 종료 (ENDED) ───────────────────────────────────────────

function FinalList({ title, slots }: { title: string; slots: SlotView[] }) {
  if (slots.length === 0) return null;
  return (
    <>
      <h2 className="mt-[22px] border-b-[3px] border-ink pb-1.5 font-display text-[22px] first:mt-0">{title}</h2>
      <ul>
        {slots.map((s) => {
          const cancelled = s.entry.status === "CANCELLED";
          const unplayed = s.entry.status === "SCHEDULED" || s.entry.status === "PERFORMING";
          return (
            <li key={s.entry.id} className={`flex items-baseline gap-3 border-b border-ink py-1.5 ${cancelled || unplayed ? "opacity-35" : ""}`}>
              <span className="w-[30px] font-display text-lg">{s.no}</span>
              <span className={`min-w-0 flex-1 truncate text-sm font-extrabold ${cancelled ? "line-through" : ""}`}>
                {s.entry.song_title} <span className="font-semibold">— {s.performers}</span>
              </span>
              {unplayed && <Tag tone="outline">미공연</Tag>}
              {s.mine && <Tag>MY</Tag>}
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function EndedView({ snapshot, view }: ViewProps) {
  const played = (slots: SlotView[]) => slots.filter((s) => s.entry.status === "COMPLETED").length;
  const mainPlayed = played(view.mainSlots);
  const encorePlayed = played(view.encoreSlots);
  return (
    <Screen>
      <TopBar chip={<Chip tone="ink" tilt={4}>THE END</Chip>} />
      <section className="relative px-5 pt-2">
        <Display size={118}>THANK<br />YOU</Display>
        <EventHeading meta={eventMeta(snapshot.event)} title={`${snapshot.event.title} · 최종 셋리스트`} />
      </section>
      <div className="relative mt-5 flex -rotate-1 items-center justify-between bg-accent px-5 py-3">
        <span className="font-display text-lg tracking-[0.04em]">{mainPlayed + encorePlayed} SONGS PLAYED</span>
        <span className="text-xs font-extrabold">
          본 공연 {mainPlayed} · 앵콜 {encorePlayed}
        </span>
      </div>
      <section className="relative flex flex-col px-5 pt-[18px]">
        <FinalList title="MAIN SET" slots={view.mainSlots} />
        <FinalList title="ENCORE" slots={view.encoreSlots} />
      </section>
      <footer className="relative mt-auto flex flex-col items-center gap-1.5 px-5 pb-7 pt-[26px]">
        <span className="font-heading text-[22px]">다음 버스킹에서 만나요</span>
        <span className="text-xs font-semibold">함께해 준 모든 참가자와 관객분들 고마워요.</span>
      </footer>
    </Screen>
  );
}
