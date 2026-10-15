import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingScreen } from "../_components/loading-screen";
import { loadSnapshot } from "../load";
import { FindScreen } from "./find-screen";

export const metadata: Metadata = { title: "내 신청 찾기" };

export default function FindPage({ params }: PageProps<"/events/[publicCode]/find">) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Find params={params} />
    </Suspense>
  );
}

async function Find({ params }: { params: PageProps<"/events/[publicCode]/find">["params"] }) {
  const { publicCode } = await params;
  const snapshot = await loadSnapshot(publicCode);
  if (!snapshot) notFound();
  return <FindScreen snapshot={snapshot} />;
}
