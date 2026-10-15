import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingScreen } from "../_components/loading-screen";
import { loadSnapshot } from "../load";
import { ApplyScreen } from "./apply-screen";

export const metadata: Metadata = { title: "곡 신청" };

export default function ApplyPage({ params }: PageProps<"/events/[publicCode]/apply">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Apply params={params} />
    </Suspense>
  );
}

async function Apply({ params }: { params: PageProps<"/events/[publicCode]/apply">["params"] }) {
  const { publicCode } = await params;
  const snapshot = await loadSnapshot(publicCode);
  if (!snapshot) notFound();
  return <ApplyScreen event={snapshot.event} />;
}
