import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { loadAdminSnapshot } from "@/lib/admin";
import { AdminScreen } from "../../../_components/admin-ui";
import { SubmissionsView } from "./submissions-view";

export const metadata: Metadata = { title: "신청 관리" };

type Props = PageProps<"/admin/events/[eventId]/submissions">;

export default function SubmissionsPage({ params }: Props) {
  return (
    <AdminScreen>
      <Suspense fallback={<p className="p-5 text-sm font-semibold">불러오는 중…</p>}>
        <Load params={params} />
      </Suspense>
    </AdminScreen>
  );
}

async function Load({ params }: { params: Props["params"] }) {
  const { eventId } = await params;
  const { snapshot } = await loadAdminSnapshot(eventId);
  if (!snapshot) notFound();
  return <SubmissionsView initial={snapshot} />;
}
