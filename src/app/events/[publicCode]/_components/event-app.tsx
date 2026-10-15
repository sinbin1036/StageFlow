"use client";

import type { EventSnapshot } from "@/lib/event-data";
import { buildView } from "@/lib/event-view";
import { useMySubmissions } from "@/lib/my-submissions";
import { useLiveSnapshot } from "@/lib/use-live-snapshot";
import { ClosedView, EncoreView, EndedView, LiveView, OpenView, PublishedView } from "./views";

// 행사 메인 화면. 행사 단계(status)에 따라 화면이 바뀌고, 관리자가 바꾸면 실시간으로 따라간다.
export function EventApp({ initial }: { initial: EventSnapshot }) {
  const [snapshot] = useLiveSnapshot(initial);
  const myIds = useMySubmissions(snapshot.event.public_code);
  const view = buildView(snapshot, myIds);
  const props = { snapshot, view };

  switch (snapshot.event.status) {
    case "OPEN":
      return <OpenView {...props} />;
    case "CLOSED":
      return <ClosedView {...props} />;
    case "PUBLISHED":
      return <PublishedView {...props} />;
    case "LIVE":
      return <LiveView {...props} />;
    case "ENCORE":
      return <EncoreView {...props} />;
    case "ENDED":
      return <EndedView {...props} />;
    default:
      // DRAFT는 RLS로 보이지 않지만, 보이는 순간이 있어도 비공개 안내를 보여준다
      return <ClosedView {...props} />;
  }
}
