import type { Metadata } from "next";
import { Suspense } from "react";
import { BackLink, Display } from "@/components/zine";
import { requireAdmin } from "@/lib/admin";
import { AdminScreen } from "../../_components/admin-ui";
import { NewEventForm } from "./new-event-form";

export const metadata: Metadata = { title: "새 행사 만들기" };

export default function NewEventPage() {
  return (
    <AdminScreen>
      <div aria-hidden className="halftone pointer-events-none absolute inset-x-0 top-0 h-[360px]" />
      <header className="relative flex min-h-[58px] items-center justify-between px-5 pt-3.5">
        <BackLink href="/admin">행사 목록</BackLink>
        <span className="rotate-[4deg] bg-ink px-2.5 py-1 font-display text-[15px] tracking-[0.06em] text-bg">ADMIN</span>
      </header>
      <section className="relative px-5 pt-1">
        <Display size={112}>NEW<br />SHOW</Display>
        <h1 className="mt-2.5 font-heading text-[26px] leading-tight">새 행사 만들기</h1>
      </section>
      <Suspense>
        <Guard />
      </Suspense>
    </AdminScreen>
  );
}

async function Guard() {
  await requireAdmin();
  return <NewEventForm />;
}
