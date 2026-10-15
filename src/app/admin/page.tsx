import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowIcon, Display, Logo } from "@/components/zine";
import { loginIdOf, requireAdmin } from "@/lib/admin";
import { formatEventDate } from "@/lib/event-view";
import { signOut } from "./actions";
import { AdminScreen, StageChip } from "./_components/admin-ui";
import { STAGE_NAME } from "./_components/stages";

export const metadata: Metadata = { title: "행사 목록" };

export default function AdminHome() {
  return (
    <AdminScreen>
      <Suspense fallback={<p className="p-5 text-sm font-semibold">불러오는 중…</p>}>
        <Events />
      </Suspense>
    </AdminScreen>
  );
}

async function Events() {
  const { supabase, user } = await requireAdmin();
  const { data: events } = await supabase
    .from("events")
    .select("id, title, event_date, venue, status, submissions(count), performance_entries(count)")
    .order("event_date", { ascending: false });

  return (
    <>
      <div aria-hidden className="halftone pointer-events-none absolute inset-x-0 top-0 h-[380px]" />
      <header className="relative flex min-h-[62px] items-center justify-between px-5 pt-4">
        <Logo />
        <form action={signOut} className="flex items-center gap-2.5">
          <span className="text-xs font-extrabold">{loginIdOf(user.email)}</span>
          <button type="submit" className="min-h-11 border-2 border-ink px-2.5 text-xs font-extrabold">
            로그아웃
          </button>
        </form>
      </header>
      <section className="relative px-5 pt-2.5">
        <Display>EVENTS</Display>
        <h1 className="mt-2.5 font-heading text-[26px] leading-tight">버스킹 행사</h1>
      </section>
      <section className="relative px-5 pt-5">
        <Link href="/admin/events/new" className="cut-edge flex -rotate-2 items-center justify-between bg-accent px-[22px] py-[18px] no-underline">
          <span className="font-heading text-[26px] leading-tight">+ 새 행사 만들기</span>
          <ArrowIcon />
        </Link>
      </section>
      <section className="relative flex flex-col gap-3 px-5 pb-7 pt-[26px]">
        {(events ?? []).length === 0 && <p className="text-sm font-semibold">아직 만든 행사가 없어요.</p>}
        {(events ?? []).map((e) => {
          const subs = (e.submissions as unknown as { count: number }[])[0]?.count ?? 0;
          const songs = (e.performance_entries as unknown as { count: number }[])[0]?.count ?? 0;
          return (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              className={`flex flex-col gap-2 border-2 border-ink bg-bg p-4 no-underline ${e.status === "ENDED" ? "opacity-55" : ""}`}
            >
              <span className="flex items-center justify-between gap-2.5">
                <span className="text-xs font-extrabold tracking-[0.08em]">{formatEventDate(e.event_date)}</span>
                <span className="flex items-center gap-1.5">
                  <StageChip status={e.status} />
                  <span className="text-xs font-extrabold">{STAGE_NAME[e.status]}</span>
                </span>
              </span>
              <span className="font-heading text-[22px] leading-tight">{e.title}</span>
              <span className="text-xs font-semibold">
                {e.venue ? `${e.venue} · ` : ""}신청 {subs}건 · {songs}곡
              </span>
            </Link>
          );
        })}
      </section>
    </>
  );
}
