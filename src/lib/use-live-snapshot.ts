"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchEventSnapshot, type EventSnapshot } from "./event-data";
import { createPublicClient } from "./supabase/public";

// 서버에서 받은 첫 데이터로 그리고, 이후 Realtime 변경이 오면 행사 데이터를 다시 읽는다.
// 변경이 여러 개 몰려도 한 번만 다시 읽도록 잠깐 모았다가 처리한다.
export function useLiveSnapshot(initial: EventSnapshot) {
  const [snapshot, setSnapshot] = useState(initial);
  const client = useMemo(() => createPublicClient(), []);
  const eventId = initial.event.id;
  const publicCode = initial.event.public_code;

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try {
          const next = await fetchEventSnapshot(client, publicCode);
          if (!cancelled && next) setSnapshot(next);
        } catch {
          // 다음 변경 때 다시 시도한다
        }
      }, 200);
    };

    const channel = client
      .channel(`event:${eventId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "events", filter: `id=eq.${eventId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions", filter: `event_id=eq.${eventId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "performance_entries", filter: `event_id=eq.${eventId}` }, refresh)
      .subscribe((status) => {
        // 연결이 끊겼다 다시 붙으면 그 사이 변경을 놓쳤을 수 있다
        if (status === "SUBSCRIBED") refresh();
      });

    // 폰 화면을 껐다 켜면 소켓이 끊겨 있을 수 있어 다시 읽는다
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      client.removeChannel(channel);
    };
  }, [client, eventId, publicCode]);

  return snapshot;
}
