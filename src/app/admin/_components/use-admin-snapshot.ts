"use client";

import type { EventSnapshot } from "@/lib/event-data";
import { createAdminBrowserClient } from "@/lib/supabase/browser";
import { useLiveSnapshot } from "@/lib/use-live-snapshot";

// 관리자 화면도 참가자 화면과 같은 방식으로 실시간 갱신한다. 로그인 세션으로 읽으므로 DRAFT 행사도 보인다.
export const useAdminSnapshot = (initial: EventSnapshot) => useLiveSnapshot(initial, createAdminBrowserClient);
