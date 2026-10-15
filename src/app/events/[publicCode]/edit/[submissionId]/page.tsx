import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LoadingScreen } from "../../_components/loading-screen";
import { loadSnapshot } from "../../load";
import { EditScreen } from "./edit-screen";

export const metadata: Metadata = { title: "신청 수정" };

type Props = PageProps<"/events/[publicCode]/edit/[submissionId]">;

export default function EditPage({ params }: Props) {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Edit params={params} />
    </Suspense>
  );
}

async function Edit({ params }: { params: Props["params"] }) {
  const { publicCode, submissionId } = await params;
  const snapshot = await loadSnapshot(publicCode);
  const submission = snapshot?.submissions.find((s) => s.id === submissionId);
  if (!snapshot || !submission) notFound();

  const entries = snapshot.entries
    .filter((e) => e.submission_id === submission.id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  return <EditScreen event={snapshot.event} submission={submission} entries={entries} />;
}
