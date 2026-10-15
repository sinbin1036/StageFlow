import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { eventMeta } from "@/lib/event-view";
import { LoadingScreen } from "./_components/loading-screen";
import { EventApp } from "./_components/event-app";
import { loadSnapshot } from "./load";

export async function generateMetadata({ params }: PageProps<"/events/[publicCode]">): Promise<Metadata> {
  const { publicCode } = await params;
  const snapshot = await loadSnapshot(publicCode);
  if (!snapshot) return { title: "행사를 찾을 수 없어요" };

  const { event } = snapshot;
  const description = `${eventMeta(event)} · 참가곡 신청과 공연 순서`;
  return {
    title: event.title,
    description,
    openGraph: { title: event.title, description, images: ["/brand/hid-logo.jpg"] },
  };
}

export default function EventPage({ params }: PageProps<"/events/[publicCode]">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <EventMain params={params} />
    </Suspense>
  );
}

async function EventMain({ params }: { params: PageProps<"/events/[publicCode]">["params"] }) {
  const { publicCode } = await params;
  const snapshot = await loadSnapshot(publicCode);
  if (!snapshot) notFound();
  return <EventApp initial={snapshot} />;
}
